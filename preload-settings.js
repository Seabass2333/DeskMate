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
    signOut: () => ipcRenderer.invoke('auth:signOut')
});
