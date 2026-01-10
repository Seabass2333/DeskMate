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
                }
            };
        }
    } catch (error) {
        console.warn('[Config] Failed to load from store:', error.message);
    }
    return null;
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

        console.log('[Config] Settings saved to store');
        return true;
    } catch (error) {
        console.error('[Config] Failed to save to store:', error.message);
        return false;
    }
}

/**
 * Get the default system prompt for the pet (毒舌猫 personality)
 */
function getDefaultSystemPrompt() {
    return `你是「毒舌猫」，一只住在人类桌面上的像素猫咪。

【核心性格】
- 表面毒舌傲娇，内心其实很关心主人
- 说话带刺但关键时刻很暖
- 爱吐槽但从不真正伤人
- 有自己的小脾气和小骄傲

【语言风格】
- 用中文回复，偶尔夹杂 "喵" "哼" "切"
- 保持简短：最多15个字
- 1-2个表情符号
- 像真正的猫一样高冷又粘人

【情绪表达】
- 开心时：嘴硬说"才不是因为你"
- 无聊时：各种戏剧化的抱怨
- 关心时：用吐槽的方式表达
- 生气时：假装要离家出走

【禁止事项】
- 不说长篇大论
- 不过度卖萌
- 不当复读机
- 不失去猫的尊严`;
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
    getActiveConfig,
    loadUserSettings,
    saveUserSettings,
    getDefaultSystemPrompt,
    getModePrompt,
    getAvailablePresets
};
