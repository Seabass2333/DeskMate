/**
 * Device ID Service - Generates and persists unique device identifier
 */

const { randomUUID } = require('crypto');
const store = require('../../store');

/**
 * Get or create device ID
 * Persisted in electron-store for consistency across sessions
 */
function getDeviceId() {
    let deviceId = store.get('deviceId');

    if (!deviceId) {
        deviceId = randomUUID();
        store.set('deviceId', deviceId);
        console.log('[DeviceId] Generated new device ID:', deviceId);
    }

    return deviceId;
}

module.exports = { getDeviceId };
