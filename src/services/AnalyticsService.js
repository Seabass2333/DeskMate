/**
 * Analytics Service - Usage tracking for DeskMate v1.2
 */

const { isConfigured, rpc } = require('./SupabaseClient');
const { getDeviceId } = require('./DeviceIdService');

// Event types
const EVENTS = {
    POMODORO_COMPLETE: 'pomodoro_complete',
    REMINDER_TRIGGERED: 'reminder_triggered',
    SKIN_CHANGED: 'skin_changed',
    AI_CHAT_SENT: 'ai_chat_sent',
    VIP_ACTIVATED: 'vip_activated',
    APP_LAUNCHED: 'app_launched'
};

/**
 * Track an analytics event
 * @param {string} eventType - Event type from EVENTS
 * @param {object} eventData - Additional event data
 */
async function trackEvent(eventType, eventData = {}) {
    // Skip if Supabase not configured
    if (!isConfigured()) {
        console.log(`[Analytics] Supabase not configured, skipping: ${eventType}`);
        return;
    }

    try {
        const deviceId = getDeviceId();

        await rpc('track_event', {
            p_device_id: deviceId,
            p_event_type: eventType,
            p_event_data: eventData
        });

        console.log(`[Analytics] Tracked: ${eventType}`);
    } catch (error) {
        // Analytics failures should be silent - don't break the app
        console.warn(`[Analytics] Failed to track ${eventType}:`, error.message);
    }
}

/**
 * Track Pomodoro completion
 */
async function trackPomodoroComplete(durationMinutes) {
    await trackEvent(EVENTS.POMODORO_COMPLETE, { duration: durationMinutes });
}

/**
 * Track reminder triggered
 */
async function trackReminderTriggered(reminderType) {
    await trackEvent(EVENTS.REMINDER_TRIGGERED, { type: reminderType });
}

/**
 * Track skin change
 */
async function trackSkinChanged(skinId) {
    await trackEvent(EVENTS.SKIN_CHANGED, { skin: skinId });
}

/**
 * Track AI chat message
 */
async function trackAiChat() {
    await trackEvent(EVENTS.AI_CHAT_SENT);
}

/**
 * Track VIP activation
 */
async function trackVipActivated(tier) {
    await trackEvent(EVENTS.VIP_ACTIVATED, { tier });
}

/**
 * Track app launch
 */
async function trackAppLaunched() {
    await trackEvent(EVENTS.APP_LAUNCHED);
}

module.exports = {
    EVENTS,
    trackEvent,
    trackPomodoroComplete,
    trackReminderTriggered,
    trackSkinChanged,
    trackAiChat,
    trackVipActivated,
    trackAppLaunched
};
