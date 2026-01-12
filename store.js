/**
 * Persistent Storage using electron-store
 * Saves user preferences across app restarts
 */

const Store = require('electron-store');

const schema = {
    llm: {
        type: 'object',
        properties: {
            region: { type: 'string', default: 'global' },
            provider: { type: 'string', default: 'openrouter' },
            apiKey: { type: 'string', default: '' },
            model: { type: 'string', default: '' }
        },
        default: {}
    },
    pomodoro: {
        type: 'object',
        properties: {
            defaultDuration: { type: 'number', default: 25, minimum: 15, maximum: 60 }
        },
        default: { defaultDuration: 25 }
    },
    sound: {
        type: 'object',
        properties: {
            enabled: { type: 'boolean', default: true }
        },
        default: { enabled: true }
    },
    reminders: {
        type: 'object',
        properties: {
            water: { type: 'boolean', default: false },
            rest: { type: 'boolean', default: false },
            stretch: { type: 'boolean', default: false }
        },
        default: {}
    },
    vip: {
        type: 'object',
        properties: {
            enabled: { type: 'boolean', default: false },
            code: { type: 'string', default: '' },
            activatedAt: { type: 'string', default: '' }
        },
        default: { enabled: false }
    },
    skin: {
        type: 'string',
        default: 'mochi-v1'
    }
};

const store = new Store({ schema });

module.exports = store;
