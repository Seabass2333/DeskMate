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
            enabled: { type: 'boolean', default: true },
            volume: { type: 'number', default: 30, minimum: 0, maximum: 100 }
        },
        default: { enabled: true, volume: 30 }
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
    },
    coPet: {
        type: 'object',
        properties: {
            paired: { type: 'boolean', default: false },
            pairId: { type: 'string', default: '' },
            myCode: { type: 'string', default: '' },
            partnerCode: { type: 'string', default: '' },
            myNickname: { type: 'string', default: '我' },
            partnerNickname: { type: 'string', default: '远方的 TA' },
            petName: { type: 'string', default: 'Mochi' },
            pairedAt: { type: 'string', default: '' },
            bondExp: { type: 'number', default: 0 },
            logs: { type: 'array', default: [] },
            lastEventId: { type: 'string', default: '' }
        },
        default: {
            paired: false,
            pairId: '',
            myCode: '',
            partnerCode: '',
            myNickname: '我',
            partnerNickname: '远方的 TA',
            petName: 'Mochi',
            pairedAt: '',
            bondExp: 0,
            logs: [],
            lastEventId: ''
        }
    }
};

const os = require('os');
const path = require('path');

const isTestEnv = process.env.NODE_ENV === 'test' || Boolean(process.env.JEST_WORKER_ID);

const store = new Store({
    schema,
    clearInvalidConfig: true,  // Automatically clear data that violates schema
    ...(isTestEnv ? { cwd: path.join(os.tmpdir(), 'deskmate-test-store') } : {})
});

module.exports = store;

