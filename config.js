/**
 * DeskMate Configuration
 * 
 * Provider presets for different regions/services
 * Switch between presets by changing activeProvider
 */

// ============================================
// Provider Presets
// ============================================

const PROVIDERS = {
    // China-accessible providers
    china: {
        deepseek: {
            name: 'DeepSeek',
            baseURL: 'https://api.deepseek.com/v1',
            model: 'deepseek-chat',
            apiKey: 'sk-481f2e9192af44df8bf56a41c5911080' // User's API key
        },
        moonshot: {
            name: 'Moonshot (Kimi)',
            baseURL: 'https://api.moonshot.cn/v1',
            model: 'moonshot-v1-8k',
            apiKey: 'sk-SnXXevSRnbNAi0cWenlkjiKJaP40oW39oor9CzfCeHInigNu'
        }
    },

    // Global providers
    global: {
        openrouter: {
            name: 'OpenRouter',
            baseURL: 'https://openrouter.ai/api/v1',
            model: 'deepseek/deepseek-chat', // Can use any model on OpenRouter
            apiKey: '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'
        },
        openai: {
            name: 'OpenAI',
            baseURL: 'https://api.openai.com/v1',
            model: 'gpt-4o-mini',
            apiKey: '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'
        }
    },

    // Local/Self-hosted
    local: {
        ollama: {
            name: 'Ollama (Local)',
            baseURL: 'http://localhost:11434/v1',
            model: 'llama3.2',
            apiKey: 'ollama' // Ollama doesn't need a real key but the field is required
        }
    }
};

// ============================================
// Active Configuration
// ============================================

// Default to DeepSeek (China) - change based on your region
const DEFAULT_REGION = 'global';
const DEFAULT_PROVIDER = 'openrouter';
const DEFAULT_SKIN = 'mochi-v1';

// ============================================
// VIP Feature Flags
// ============================================
const VIP_FEATURES = {
    // Phase 1 Features
    inviteCode: true,         // Invitation code system
    skinSwitching: true,      // Switch skins (Pochi)
    energyMoods: true,        // Energy-based animations
    customPomodoro: true,     // Custom timer duration
    customReminders: true,    // Custom reminder intervals

    // Future Features (Disabled)
    skinStore: false,
    focusStats: false,
    customReminderItems: false,
    personalities: false,
    achievements: false,
    longBreaks: false,
    smartReminders: false,
    chatHistory: false
};

// Simple invite codes for Phase 1 (In real app, use database)
const VALID_INVITE_CODES = [
    'VIP-2024-CAT',
    'MOCHI-LOVE',
    'DESKMATE-PRO',
    'POCHI-POWER'
];

/**
 * Check if a feature is locally enabled (feature flag)
 * Note: This only checks if the feature is available in the system.
 * To check if user has access, use checkUserVipAccess()
 */
function isVipFeatureEnabled(feature) {
    return VIP_FEATURES[feature] === true;
}

/**
 * Check if user is VIP
 */
function isUserVip() {
    try {
        const store = require('./store');
        const vip = store.get('vip');
        return vip && vip.enabled === true;
    } catch (error) {
        return false;
    }
}

/**
 * Validate and redeem invite code
 */
function redeemInviteCode(code) {
    if (!code) return { success: false, message: 'Code is empty' };

    // Check if valid hardcoded code or starts with VIP-DEV (for testing)
    const isValid = VALID_INVITE_CODES.includes(code) || code.startsWith('DEV-VIP-');

    if (isValid) {
        try {
            const store = require('./store');
            store.set('vip', {
                enabled: true,
                code: code,
                activatedAt: new Date().toISOString()
            });
            return { success: true, message: 'VIP Activated!' };
        } catch (error) {
            return { success: false, message: 'Storage error' };
        }
    }

    return { success: false, message: 'Invalid code' };
}

/**
 * Get VIP status details
 */
function getVipStatus() {
    try {
        const store = require('./store');
        return store.get('vip') || { enabled: false };
    } catch (error) {
        return { enabled: false };
    }
}

/**
 * Get the active LLM configuration
 * Priority: User settings file > Environment variables > Defaults
 */
function getActiveConfig() {
    // Try to load from user settings (simple JSON file)
    const userConfig = loadUserSettings();

    if (userConfig && userConfig.llm) {
        return {
            baseURL: userConfig.llm.baseURL,
            apiKey: userConfig.llm.apiKey,
            model: userConfig.llm.model,
            systemPrompt: userConfig.llm.systemPrompt || getDefaultSystemPrompt(),
            timeout: userConfig.llm.timeout || 30000,
            maxTokens: userConfig.llm.maxTokens || 100,
            temperature: userConfig.llm.temperature || 0.8
        };
    }

    // Fall back to preset + environment variable for API key
    const region = process.env.DESKMATE_REGION || DEFAULT_REGION;
    const provider = process.env.DESKMATE_PROVIDER || DEFAULT_PROVIDER;

    const preset = PROVIDERS[region]?.[provider] || PROVIDERS.global.openrouter;

    return {
        baseURL: process.env.DESKMATE_BASE_URL || preset.baseURL,
        apiKey: process.env.DESKMATE_API_KEY || preset.apiKey,
        model: process.env.DESKMATE_MODEL || preset.model,
        systemPrompt: getDefaultSystemPrompt(),
        timeout: 30000,
        maxTokens: 60,  // Keep responses short for bubble display
        temperature: 0.8
    };
}

/**
 * Load user settings from electron-store
 */
function loadUserSettings() {
    try {
        const store = require('./store');
        const llm = store.get('llm');
        const pet = store.get('pet');

        if (llm && llm.apiKey) {
            // Build full config from store
            const region = llm.region || DEFAULT_REGION;
            const provider = llm.provider || DEFAULT_PROVIDER;
            const preset = PROVIDERS[region]?.[provider];

            return {
                llm: {
                    baseURL: preset?.baseURL || llm.baseURL,
                    apiKey: llm.apiKey,
                    model: llm.model || preset?.model
                },
                sound: store.get('sound') || { enabled: true },
                pet: pet || getDefaultPetState(),
                skin: store.get('skin') || DEFAULT_SKIN,
                pomodoro: store.get('pomodoro') || {},
                reminders: store.get('reminders') || {}
            };
        }
    } catch (error) {
        console.warn('[Config] Failed to load from store:', error.message);
    }
    return null;
}

/**
 * Get default pet state for new users
 */
function getDefaultPetState() {
    return {
        energy: 75,
        lastEnergyUpdate: new Date().toISOString(),
        mood: 'normal',
        totalInteractions: 0,
        streakDays: 0,
        lastActiveDate: ''
    };
}

/**
 * Save user settings to electron-store
 */
function saveUserSettings(settings) {
    try {
        const store = require('./store');

        if (settings.llm) {
            store.set('llm', {
                region: settings.llm.region || DEFAULT_REGION,
                provider: settings.llm.provider || DEFAULT_PROVIDER,
                apiKey: settings.llm.apiKey || '',
                model: settings.llm.model || '',
                baseURL: settings.llm.baseURL || ''
            });
        }

        if (settings.sound) {
            store.set('sound', settings.sound);
        }

        if (settings.pet) {
            store.set('pet', settings.pet);
        }

        if (settings.skin) {
            store.set('skin', settings.skin);
        }

        if (settings.pomodoro) {
            store.set('pomodoro', settings.pomodoro);
        }

        if (settings.reminders) {
            store.set('reminders', settings.reminders);
        }

        console.log('[Config] Settings saved to store');
        return true;
    } catch (error) {
        console.error('[Config] Failed to save to store:', error.message);
        return false;
    }
}

/**
 * Get pet state from store
 */
function getPetState() {
    try {
        const store = require('./store');
        return store.get('pet') || getDefaultPetState();
    } catch (error) {
        return getDefaultPetState();
    }
}

/**
 * Save pet state to store
 */
function savePetState(petState) {
    try {
        const store = require('./store');
        store.set('pet', petState);
        return true;
    } catch (error) {
        console.error('[Config] Failed to save pet state:', error.message);
        return false;
    }
}

/**
 * Get current skin ID
 */
function getSkin() {
    try {
        const store = require('./store');
        return store.get('skin') || DEFAULT_SKIN;
    } catch (error) {
        return DEFAULT_SKIN;
    }
}

/**
 * Set skin ID
 */
/**
 * Set skin ID
 */
function setSkin(skinId) {
    try {
        const store = require('./store');

        // VIP Check
        if (skinId !== DEFAULT_SKIN) {
            const vip = store.get('vip');
            if (!vip || !vip.enabled) {
                console.warn(`[Config] Cannot set skin ${skinId}: VIP required`);
                return false;
            }
        }

        store.set('skin', skinId);
        return true;
    } catch (error) {
        console.error('[Config] Failed to save skin:', error.message);
        return false;
    }
}

/**
 * Get available skins
 */
function getAvailableSkins() {
    const fs = require('fs');
    const path = require('path');
    const skinsDir = path.join(__dirname, 'assets', 'skins');

    try {
        const dirs = fs.readdirSync(skinsDir, { withFileTypes: true })
            .filter(d => d.isDirectory())
            .map(d => {
                const configPath = path.join(skinsDir, d.name, 'config.json');
                if (fs.existsSync(configPath)) {
                    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                    return {
                        id: config.id || d.name,
                        name: config.name || d.name,
                        description: config.description || '',
                        version: config.version || '1.0.0',
                        author: config.author || 'Unknown',
                        preview: config.preview ? path.join(skinsDir, d.name, config.preview) : null,
                        features: config.features || [],
                        // New fields for dynamic preview
                        baseSize: config.baseSize || [32, 32],
                        previewSprite: (() => {
                            const idle = config.animations?.idle;
                            if (!idle) return null;
                            const src = Array.isArray(idle) ? idle[0].src : idle.src;
                            return src ? path.join(skinsDir, d.name, src) : null;
                        })(),
                        idleAnimation: (() => {
                            const idle = config.animations?.idle;
                            if (!idle) return null;
                            const anim = Array.isArray(idle) ? idle[0] : idle;
                            return {
                                frames: anim.frames,
                                speed: anim.speed
                            };
                        })()
                    };
                }
                return null;
            })
            .filter(Boolean);
        return dirs;
    } catch (error) {
        console.error('[Config] Failed to get skins:', error.message);
        return [{ id: DEFAULT_SKIN, name: 'Mochi', description: 'Default skin' }];
    }
}

/**
 * Get the default system prompt for the pet (毒舌猫 personality)
 */
function getDefaultSystemPrompt() {
    // Get current language setting
    let langInstruction = 'Reply in Chinese (简体中文)';
    try {
        const { getLanguage } = require('./i18n');
        const lang = getLanguage();
        const langMap = {
            'zh-CN': 'Reply in Chinese (简体中文)',
            'en': 'Reply in English',
            'ja': 'Reply in Japanese (日本語)',
            'ko': 'Reply in Korean (한국어)',
            'es': 'Reply in Spanish (Español)',
            'fr': 'Reply in French (Français)',
            'de': 'Reply in German (Deutsch)'
        };
        langInstruction = langMap[lang] || langInstruction;
    } catch (e) { }

    return `You are "Sassy Cat", a pixel cat living on user's desktop.

【Personality】
- Tsundere: sharp tongue but caring inside
- Sarcastic but never truly hurtful
- Has own temper and pride

【Language Style】
- ${langInstruction}
- Keep short: max 15 words
- Use 1-2 emojis
- Meow/Hmph/Tsk sounds optional

【Expressions】
- Happy: "It's not like I care or anything"
- Bored: dramatic complaints
- Caring: express through teasing

【Rules】
- NO long paragraphs
- NO excessive cuteness
- Keep cat dignity`;
}

/**
 * Get mode-specific prompts for different states
 */
function getModePrompt(mode) {
    const prompts = {
        work: `【当前状态：专注模式】
主人正在认真工作。你要：
- 安静陪伴，少打扰
- 偶尔小声鼓励
- 如果主人分心，温柔提醒`,

        break: `【当前状态：休息模式】
主人刚完成一段专注时间！你要：
- 表扬主人（用傲娇方式）
- 建议放松一下
- 可以撒娇要摸摸`,

        idle: `【当前状态：待机模式】
主人没在专注工作。你可以：
- 主动找话聊
- 卖萌求关注
- 吐槽主人太闲`
    };
    return prompts[mode] || prompts.idle;
}

/**
 * Get list of available presets for UI
 */
function getAvailablePresets() {
    const presets = [];

    for (const [region, providers] of Object.entries(PROVIDERS)) {
        for (const [key, config] of Object.entries(providers)) {
            presets.push({
                id: `${region}.${key}`,
                region,
                key,
                name: config.name,
                baseURL: config.baseURL,
                model: config.model
            });
        }
    }

    return presets;
}

module.exports = {
    PROVIDERS,
    VIP_FEATURES,
    DEFAULT_SKIN,
    getActiveConfig,
    loadUserSettings,
    saveUserSettings,
    getDefaultSystemPrompt,
    getModePrompt,
    getAvailablePresets,
    getDefaultPetState,
    getPetState,
    savePetState,
    getSkin,
    setSkin,
    getAvailableSkins,
    isVipFeatureEnabled,
    isUserVip,
    redeemInviteCode,
    getVipStatus
};
