/**
 * DeskMate Configuration
 * 
 * Provider presets for different regions/services
 * Switch between presets by changing activeProvider
 */

// ============================================
// LLM Providers Configuration
// ============================================

// Load providers from external JSON file for easier maintenance
const PROVIDERS = require('./providers.json');

// ============================================
// API Configuration (v1.2 Backend Placeholder)
// ============================================

const API_CONFIG = {
    // Backend API URL - to be configured in v1.2
    baseURL: process.env.API_URL || '',
    // Feature flags
    useRemoteValidation: false,  // Enable in v1.2 for remote invite code validation
    syncEnabled: false           // Enable in future for cloud sync
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
 * Uses InviteCodeService for validation abstraction (local v1.1, remote v1.2)
 */
async function redeemInviteCode(code) {
    const { inviteCodeService } = require('./src/services/InviteCodeService');

    const result = await inviteCodeService.verify(code);

    if (result.valid) {
        try {
            const store = require('./store');
            store.set('vip', {
                enabled: true,
                code: code,
                vipLevel: result.tier || 'pro',
                activatedAt: new Date().toISOString(),
                validUntil: result.valid_until || null
            });
            return { success: true, message: result.message, tier: result.tier || 'pro' };
        } catch (error) {
            return { success: false, message: 'Storage error' };
        }
    }

    return { success: false, message: result.message };
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
 * Sync VIP status with backend (Check for expiration)
 */
async function syncVipStatus() {
    try {
        const { inviteCodeService } = require('./src/services/InviteCodeService');
        if (!inviteCodeService.useRemote) return;

        const remoteStatus = await inviteCodeService.getUserStatus();
        // remoteStatus: { vip_tier, activated_at, valid_until, email }

        const store = require('./store');
        const currentVip = store.get('vip') || { enabled: false };

        // If remote says free but local says enabled -> Expired or Reset
        if (remoteStatus.vip_tier === 'free' && currentVip.enabled) {
            console.log('[Config] VIP expired or reset remotely. Syncing...');
            store.set('vip', { enabled: false, code: '', activatedAt: '' });
            return;
        }

        // If remote is VIP, update local details
        if (remoteStatus.vip_tier !== 'free') {
            store.set('vip', {
                enabled: true,
                code: currentVip.code || 'SYNCED',
                vipLevel: remoteStatus.vip_tier,
                activatedAt: remoteStatus.activated_at,
                validUntil: remoteStatus.valid_until
            });
            console.log('[Config] VIP status synced:', remoteStatus.vip_tier);
        }
    } catch (error) {
        console.error('[Config] Failed to sync VIP status:', error);
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

/**
 * Get quiet mode state
 */
function getQuietMode() {
    try {
        const store = require('./store');
        const value = store.get('quietMode');
        // Default to true if not set
        return value !== undefined ? value : true;
    } catch (error) {
        return true;
    }
}

/**
 * Set quiet mode state
 */
function setQuietMode(enabled) {
    try {
        const store = require('./store');
        store.set('quietMode', enabled);
        return true;
    } catch (error) {
        console.error('[Config] Failed to save quiet mode:', error.message);
        return false;
    }
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
    isUserVip,
    redeemInviteCode,
    getVipStatus,
    syncVipStatus,
    getQuietMode,
    setQuietMode
};
