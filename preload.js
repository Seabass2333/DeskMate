const { contextBridge, ipcRenderer } = require('electron');

/**
 * Exposes a secure API to the renderer process via contextBridge
 * All communication with main process goes through this bridge
 */
contextBridge.exposeInMainWorld('deskmate', {
    // ============================================
    // Mouse Event Control
    // ============================================

    /**
     * Toggle click-through behavior for the window
     * @param {boolean} ignore - true to ignore mouse events (click-through)
     */
    setIgnoreMouseEvents: (ignore) => {
        ipcRenderer.send('set-ignore-mouse', ignore);
    },

    // ============================================
    // Context Menu
    // ============================================

    /**
     * Request the main process to show the context menu
     */
    showContextMenu: () => {
        ipcRenderer.send('request-context-menu');
    },

    // ============================================
    // Window Positioning (for dragging)
    // ============================================

    /**
     * Get the current window position
     * @returns {Promise<[number, number]>} [x, y] coordinates
     */
    getWindowPosition: () => {
        return ipcRenderer.invoke('get-window-position');
    },

    /**
     * Set the window position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    setWindowPosition: (x, y) => {
        ipcRenderer.send('set-window-position', { x, y });
    },

    // ============================================
    // Notifications
    // ============================================

    /**
     * Show a system notification
     * @param {string} title - Notification title
     * @param {string} body - Notification body text
     */
    showNotification: (title, body) => {
        ipcRenderer.send('show-notification', { title, body });
    },

    // ============================================
    // Pomodoro Events
    // ============================================

    /**
     * Listen for pomodoro start event from main process
     * @param {function} callback - Called with minutes when pomodoro starts
     */
    onPomodoroStart: (callback) => {
        ipcRenderer.on('pomodoro-start', (_, minutes) => callback(minutes));
    },

    /**
     * Listen for pomodoro stop event from main process
     * @param {function} callback - Called when pomodoro is stopped
     */
    onPomodoroStop: (callback) => {
        ipcRenderer.on('pomodoro-stop', () => callback());
    },

    /**
     * Notify main process of pomodoro state changes
     * @param {boolean} isActive - Whether pomodoro is currently active
     */
    setPomodoroState: (isActive) => {
        ipcRenderer.send('pomodoro-state-change', isActive);
    },

    /**
     * Listen for "Talk to Pet" event from main process
     * @param {function} callback - Called when user selects "Talk to Pet"
     */
    onTalkToPet: (callback) => {
        ipcRenderer.on('talk-to-pet', () => callback());
    },

    /**
     * Listen for reminder toggle event from main process
     * @param {function} callback - Called with reminder type (water, rest, stretch)
     */
    onReminderToggle: (callback) => {
        ipcRenderer.on('reminder-toggle', (_, type) => callback(type));
    },

    /**
     * Listen for reminder loop mode change event
     * @param {function} callback - Called with boolean (isLoopMode)
     */
    onReminderLoopModeChange: (callback) => {
        ipcRenderer.on('reminder-loop-mode-change', (_, isLoop) => callback(isLoop));
    },

    /**
     * Notify main process that pomodoro has completed
     */
    pomodoroComplete: () => {
        ipcRenderer.send('pomodoro-complete');
    },

    /**
     * Notify main process that a reminder has triggered
     * @param {string} type - Reminder type (water, rest, stretch, test)
     */
    reminderComplete: (type) => {
        ipcRenderer.send('reminder-complete', type);
    },

    // ============================================
    // AI/LLM
    // ============================================

    /**
     * Send a message to the AI and get a response
     * @param {string} message - User's message
     * @returns {Promise<{success: boolean, message: string}>}
     */
    askAI: (message) => {
        return ipcRenderer.invoke('ai:ask', message);
    },

    /**
     * Test the AI connection
     * @returns {Promise<{success: boolean, message: string, latency?: number}>}
     */
    testAI: () => {
        return ipcRenderer.invoke('ai:test');
    },

    /**
     * Clear conversation history
     * @returns {Promise<{success: boolean}>}
     */
    clearAIHistory: () => {
        return ipcRenderer.invoke('ai:clearHistory');
    },

    // ============================================
    // i18n
    // ============================================

    /**
     * Get current language
     */
    getLanguage: () => ipcRenderer.invoke('i18n:getLanguage'),

    /**
     * Set language
     */
    setLanguage: (lang) => ipcRenderer.invoke('i18n:setLanguage', lang),

    /**
     * Get supported languages
     */
    getSupportedLanguages: () => ipcRenderer.invoke('i18n:getSupported'),

    /**
     * Get translation for a key
     */
    t: (key) => ipcRenderer.invoke('i18n:translate', key),

    /**
     * Check if sound is enabled
     */
    isSoundEnabled: () => ipcRenderer.invoke('get-sound-enabled'),

    /**
     * Load skin configuration
     */
    loadSkin: (skinId) => ipcRenderer.invoke('skin:load', skinId),

    /**
     * Listen for language change event
     */

    /**
     * Listen for language change event
     */
    onLanguageChanged: (callback) => {
        ipcRenderer.on('language-changed', (_, lang) => callback(lang));
    },

    // ============================================
    // Pet Energy
    // ============================================

    /**
     * Get pet state (energy, mood, etc.)
     */
    getPetState: () => ipcRenderer.invoke('pet:getState'),

    /**
     * Save pet state
     */
    savePetState: (petState) => ipcRenderer.invoke('pet:saveState', petState),

    /**
     * Modify pet energy by delta amount
     * @param {number} delta - Amount to change energy (+/-)
     * @returns {Promise<object>} Updated pet state
     */
    modifyPetEnergy: (amount, source) => ipcRenderer.send('pet:modifyEnergy', { amount, source }),

    // ============================================
    // VIP API
    // ============================================
    redeemInviteCode: (code) => ipcRenderer.invoke('vip:redeem', code),
    getVipStatus: () => ipcRenderer.invoke('vip:getStatus'),

    // ============================================
    // Quiet Mode
    // ============================================
    getQuietMode: () => ipcRenderer.invoke('quietMode:get'),
    setQuietMode: (enabled) => ipcRenderer.invoke('quietMode:set', enabled),
    onQuietModeChanged: (callback) => {
        ipcRenderer.on('quiet-mode-changed', (_, enabled) => callback(enabled));
    },

    // ============================================
    // Skin
    // ============================================

    /**
     * Listen for skin change event
     */
    onSkinChange: (callback) => {
        ipcRenderer.on('skin-change', (_, skinId) => callback(skinId));
    },

    /**
     * Listen for settings update (real-time sync)
     */
    onSettingsUpdated: (callback) => {
        ipcRenderer.on('settings-updated', (_, settings) => callback(settings));
    },

    /**
     * Get full user settings
     */
    getSettings: () => ipcRenderer.invoke('settings:get')
});
