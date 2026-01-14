/**
 * Device ID Service - Generates and persists unique device identifier
 */

const { v4: uuidv4 } = require('uuid');
const store = require('../../store');

/**
 * Get or create device ID
 * Persisted in electron-store for consistency across sessions
 */
function getDeviceId() {
    let deviceId = store.get('deviceId');

    if (!deviceId) {
        deviceId = uuidv4();
        store.set('deviceId', deviceId);
        console.log('[DeviceId] Generated new device ID:', deviceId);
    }

    return deviceId;
}

module.exports = { getDeviceId };
