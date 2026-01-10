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
    close: () => ipcRenderer.send('settings:close')
});
