/**
 * Settings Sync Service - Cloud-based settings synchronization
 * Syncs API Key, Skin preference, and Pomodoro settings after email binding
 */

const { isConfigured, rpc } = require('./SupabaseClient');
const { getDeviceId } = require('./DeviceIdService');

// Settings keys that can be synced
const SYNC_KEYS = {
    API_CONFIG: 'api_config',      // { provider, model, apiKey (encrypted) }
    SKIN: 'skin',                   // string: skin ID
    POMODORO: 'pomodoro',           // { duration, breakDuration, ... }
    LANGUAGE: 'language'            // string: language code
};

class SettingsSyncService {
    constructor() {
        this.enabled = isConfigured();
    }

    /**
     * Save a setting to cloud
     * @param {string} key - Setting key from SYNC_KEYS
     * @param {any} value - Value to save (will be JSON serialized)
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async saveSetting(key, value) {
        if (!this.enabled) {
            return { success: false, error: 'Cloud sync not configured' };
        }

        try {
            const deviceId = getDeviceId();
            const result = await rpc('save_user_setting', {
                p_device_id: deviceId,
                p_key: key,
                p_value: JSON.stringify(value)
            });

            return result;
        } catch (error) {
            console.error('[SettingsSyncService] Save failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get all synced settings from cloud
     * @returns {Promise<{success: boolean, settings?: object}>}
     */
    async getSettings() {
        if (!this.enabled) {
            return { success: false, settings: {} };
        }

        try {
            const deviceId = getDeviceId();
            const result = await rpc('get_user_settings', {
                p_device_id: deviceId
            });

            // Parse JSON values back
            const settings = {};
            if (result.settings) {
                for (const [key, value] of Object.entries(result.settings)) {
                    try {
                        settings[key] = typeof value === 'string' ? JSON.parse(value) : value;
                    } catch {
                        settings[key] = value;
                    }
                }
            }

            return { success: true, settings };
        } catch (error) {
            console.error('[SettingsSyncService] Get failed:', error);
            return { success: false, settings: {} };
        }
    }

    /**
     * Sync specific settings to cloud
     * @param {object} localSettings - Object with settings to sync
     */
    async syncToCloud(localSettings) {
        const results = {};

        for (const [key, value] of Object.entries(localSettings)) {
            if (Object.values(SYNC_KEYS).includes(key)) {
                results[key] = await this.saveSetting(key, value);
            }
        }

        return results;
    }

    /**
     * Apply cloud settings to local store
     * @param {object} store - Electron store instance
     */
    async applyFromCloud(store) {
        const { success, settings } = await this.getSettings();

        if (!success || !settings) {
            return { applied: false };
        }

        const applied = [];

        if (settings[SYNC_KEYS.SKIN]) {
            store.set('skin', settings[SYNC_KEYS.SKIN]);
            applied.push('skin');
        }

        if (settings[SYNC_KEYS.POMODORO]) {
            store.set('pomodoro', settings[SYNC_KEYS.POMODORO]);
            applied.push('pomodoro');
        }

        if (settings[SYNC_KEYS.LANGUAGE]) {
            store.set('language', settings[SYNC_KEYS.LANGUAGE]);
            applied.push('language');
        }

        // Note: API config is sensitive, only restore if user explicitly requests
        // if (settings[SYNC_KEYS.API_CONFIG]) { ... }

        console.log('[SettingsSyncService] Applied from cloud:', applied);
        return { applied: true, keys: applied };
    }
}

const settingsSyncService = new SettingsSyncService();

module.exports = {
    SettingsSyncService,
    settingsSyncService,
    SYNC_KEYS
};
