/**
 * Ops Service - Announcements & Feedback
 * Handles operational tools for user communication
 */

const { app } = require('electron');
const { isConfigured, rpc } = require('./SupabaseClient');
const { getDeviceId } = require('./DeviceIdService');

// App version
const APP_VERSION = app ? app.getVersion() : '1.4.0';

class OpsService {
    constructor() {
        this.enabled = isConfigured();
        this.cachedAnnouncements = null;
    }

    /**
     * Fetch active announcements from server
     * @returns {Promise<{success: boolean, announcements: Array}>}
     */
    async getAnnouncements() {
        if (!this.enabled) {
            return { success: false, announcements: [] };
        }

        try {
            const result = await rpc('get_announcements', {
                p_version: APP_VERSION
            });

            this.cachedAnnouncements = result.announcements || [];
            return {
                success: true,
                announcements: this.cachedAnnouncements
            };
        } catch (error) {
            console.error('[OpsService] Failed to fetch announcements:', error);
            return { success: false, announcements: [] };
        }
    }

    /**
     * Get cached announcements (for offline use)
     * @returns {Array}
     */
    getCachedAnnouncements() {
        return this.cachedAnnouncements || [];
    }

    /**
     * Submit user feedback
     * @param {object} feedback - { category, content, email? }
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async submitFeedback(feedback) {
        if (!this.enabled) {
            return { success: false, error: 'Service not available' };
        }

        const { category, content, email } = feedback;

        if (!category || !content) {
            return { success: false, error: 'Category and content are required' };
        }

        if (content.length < 10) {
            return { success: false, error: 'Feedback too short (min 10 characters)' };
        }

        if (content.length > 2000) {
            return { success: false, error: 'Feedback too long (max 2000 characters)' };
        }

        try {
            const deviceId = getDeviceId();
            const result = await rpc('submit_feedback', {
                p_device_id: deviceId,
                p_category: category,
                p_content: content,
                p_email: email || null,
                p_app_version: APP_VERSION
            });

            return result;
        } catch (error) {
            console.error('[OpsService] Failed to submit feedback:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Validate feedback category
     * @param {string} category 
     * @returns {boolean}
     */
    isValidCategory(category) {
        return ['bug', 'feature', 'question', 'other'].includes(category);
    }
}

const opsService = new OpsService();

module.exports = {
    OpsService,
    opsService,
    APP_VERSION
};
