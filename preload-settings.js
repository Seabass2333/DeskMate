/**
 * Settings Window Preload Script
 * Exposes settings-specific IPC methods
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('settingsAPI', {
    /**
     * Get current settings
     */
    getSettings: () => ipcRenderer.invoke('settings:get'),

    /**
     * Save settings
     */
    saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),

    /**
     * Test connection with given config
     */
    testConnection: (config) => ipcRenderer.invoke('settings:test', config),

    /**
     * Close settings window
     */
    close: () => ipcRenderer.send('settings:close'),

    /**
     * Get current language
     */
    getLanguage: () => ipcRenderer.invoke('i18n:getLanguage'),

    /**
     * Set language
     */
    setLanguage: (lang) => ipcRenderer.invoke('i18n:setLanguage', lang),

    /**
     * Open URL in default browser
     */
    openExternal: (url) => ipcRenderer.send('open-external', url),

    /**
     * VIP: Redeem invite code
     */
    redeemInviteCode: (code) => ipcRenderer.invoke('vip:redeem', code),

    /**
     * VIP: Get status
     */
    getVipStatus: () => ipcRenderer.invoke('vip:getStatus'),

    /**
     * VIP: Reset status (Debug)
     */
    resetVip: () => ipcRenderer.invoke('vip:reset'),

    // Auth
    sendOtp: (email) => ipcRenderer.invoke('auth:sendOtp', email),
    verifyOtp: (email, token) => ipcRenderer.invoke('auth:verifyOtp', { email, token }),
    getAuthStatus: () => ipcRenderer.invoke('auth:getStatus'),
    signOut: () => ipcRenderer.invoke('auth:signOut'),

    // Settings Sync
    syncToCloud: () => ipcRenderer.invoke('settings:syncToCloud'),
    applyFromCloud: () => ipcRenderer.invoke('settings:applyFromCloud'),

    // Ops: Announcements & Feedback
    getAnnouncements: () => ipcRenderer.invoke('ops:getAnnouncements'),
    submitFeedback: (feedback) => ipcRenderer.invoke('ops:submitFeedback', feedback),

    // App Info
    getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
    checkUpdate: () => ipcRenderer.invoke('app:checkUpdate'),
    getLatestUpdateInfo: () => ipcRenderer.invoke('app:getLatestUpdateInfo'),
    onUpdateStatus: (callback) => ipcRenderer.on('app:updateStatus', (_, data) => callback(data)),

    // 1v1 Co-Pet & Pet Hub (小宠档案与双人共养)
    getPetState: () => ipcRenderer.invoke('pet:getState'),
    setSkin: (skinId) => ipcRenderer.invoke('skin:switch', skinId),
    openCoPetWindow: () => ipcRenderer.send('copet:openWindow'),
    closeCoPetWindow: () => ipcRenderer.send('copet:closeWindow'),
    coPetGetStatus: () => ipcRenderer.invoke('copet:getStatus'),
    coPetGenerateCode: () => ipcRenderer.invoke('copet:generateCode'),
    coPetBind: (code, options) => ipcRenderer.invoke('copet:bind', { code, options }),
    coPetUpdateProfile: (profile) => ipcRenderer.invoke('copet:updateProfile', profile),
    coPetUnpair: (confirmToken) => ipcRenderer.invoke('copet:unpair', confirmToken),
    coPetSendAction: (actionType) => ipcRenderer.invoke('copet:sendAction', actionType),
    onCoPetStatusChanged: (callback) => ipcRenderer.on('copet:status-changed', (_, status) => callback(status))
});
