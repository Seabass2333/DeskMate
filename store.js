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
            model: { type: 'string', default: '' },
            baseURL: { type: 'string', default: '' }
        },
        default: { region: 'global', provider: 'openrouter' }
    },
    pomodoro: {
        type: 'object',
        properties: {
            defaultDuration: { type: 'number', default: 25, minimum: 1, maximum: 120 }
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
            stretch: { type: 'boolean', default: false },
            intervals: {
                type: 'object',
                properties: {
                    water: { type: 'number', default: 30, minimum: 1 },
                    rest: { type: 'number', default: 20, minimum: 1 },
                    stretch: { type: 'number', default: 45, minimum: 1 }
                },
                default: { water: 30, rest: 20, stretch: 45 }
            }
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
    pet: {
        type: 'object',
        properties: {
            energy: { type: 'number', default: 75, minimum: 5, maximum: 100 },
            lastEnergyUpdate: { type: 'string', default: '' },
            mood: { type: 'string', default: 'normal' },
            totalInteractions: { type: 'number', default: 0 },
            streakDays: { type: 'number', default: 0 },
            lastActiveDate: { type: ['string', 'null'], default: '' }
        },
        default: { energy: 75 }
    },
    skin: {
        type: 'string',
        default: 'mochi-v1'
    },
    quietMode: {
        type: 'boolean',
        default: true
    }
};

const store = new Store({
    schema,
    clearInvalidConfig: true  // Automatically clear data that violates schema
});

module.exports = store;

