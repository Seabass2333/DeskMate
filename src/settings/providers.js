/**
 * DeskMate Provider Definitions
 * Matching config.js structure
 */

const PROVIDERS = {
    china: {
        deepseek: {
            name: 'DeepSeek',
            model: 'deepseek-chat',
            apiKeyUrl: 'https://platform.deepseek.com/api_keys',
            getKeyText: { 'zh-CN': '获取 DeepSeek API Key', 'en': 'Get DeepSeek API Key' }
        },
        moonshot: {
            name: 'Moonshot (Kimi)',
            model: 'moonshot-v1-8k',
            apiKeyUrl: 'https://platform.moonshot.cn/console/api-keys',
            getKeyText: { 'zh-CN': '获取 Moonshot API Key', 'en': 'Get Moonshot API Key' }
        },
        zhipu: {
            name: { 'zh-CN': '智谱 AI (GLM)', 'en': 'Zhipu AI (GLM)' },
            model: 'glm-4-flash',
            apiKeyUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
            getKeyText: { 'zh-CN': '获取智谱 API Key', 'en': 'Get Zhipu API Key' }
        },
        qwen: {
            name: { 'zh-CN': '通义千问 (Qwen)', 'en': 'Qwen (Alibaba)' },
            model: 'qwen-turbo',
            apiKeyUrl: 'https://dashscope.console.aliyun.com/apiKey',
            getKeyText: { 'zh-CN': '获取通义千问 API Key', 'en': 'Get Qwen API Key' }
        },
        baichuan: {
            name: { 'zh-CN': '百川 AI', 'en': 'Baichuan AI' },
            model: 'Baichuan2-Turbo',
            apiKeyUrl: 'https://platform.baichuan-ai.com/console/apikey',
            getKeyText: { 'zh-CN': '获取百川 API Key', 'en': 'Get Baichuan API Key' }
        },
        doubao: {
            name: { 'zh-CN': '豆包 (ByteDance)', 'en': 'Doubao (ByteDance)' },
            model: 'doubao-pro-4k',
            apiKeyUrl: 'https://console.volcengine.com/ark',
            getKeyText: { 'zh-CN': '获取豆包 API Key', 'en': 'Get Doubao API Key' }
        }
    },
    global: {
        openrouter: {
            name: { 'zh-CN': 'OpenRouter (推荐)', 'en': 'OpenRouter (Recommended)' },
            model: 'deepseek/deepseek-chat',
            apiKeyUrl: 'https://openrouter.ai/keys',
            getKeyText: { 'zh-CN': '获取 OpenRouter API Key', 'en': 'Get OpenRouter API Key' }
        },
        openai: {
            name: 'OpenAI',
            model: 'gpt-4o-mini',
            apiKeyUrl: 'https://platform.openai.com/api-keys',
            getKeyText: { 'zh-CN': '获取 OpenAI API Key', 'en': 'Get OpenAI API Key' }
        },
        anthropic: {
            name: 'Anthropic Claude',
            model: 'claude-3-haiku-20240307',
            apiKeyUrl: 'https://console.anthropic.com/settings/keys',
            getKeyText: { 'zh-CN': '获取 Claude API Key', 'en': 'Get Claude API Key' }
        },
        gemini: {
            name: 'Google Gemini',
            model: 'gemini-1.5-flash',
            apiKeyUrl: 'https://aistudio.google.com/app/apikey',
            getKeyText: { 'zh-CN': '获取 Gemini API Key', 'en': 'Get Gemini API Key' }
        },
        groq: {
            name: { 'zh-CN': 'Groq (超快)', 'en': 'Groq (Fast)' },
            model: 'llama-3.1-8b-instant',
            apiKeyUrl: 'https://console.groq.com/keys',
            getKeyText: { 'zh-CN': '获取 Groq API Key', 'en': 'Get Groq API Key' }
        },
        together: {
            name: 'Together AI',
            model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
            apiKeyUrl: 'https://api.together.xyz/settings/api-keys',
            getKeyText: { 'zh-CN': '获取 Together API Key', 'en': 'Get Together API Key' }
        },
        mistral: {
            name: 'Mistral AI',
            model: 'mistral-small-latest',
            apiKeyUrl: 'https://console.mistral.ai/api-keys',
            getKeyText: { 'zh-CN': '获取 Mistral API Key', 'en': 'Get Mistral API Key' }
        },
        custom: {
            name: { 'zh-CN': '自定义 API', 'en': 'Custom API' },
            model: '',
            apiKeyUrl: '',
            getKeyText: { 'zh-CN': '使用任意 OpenAI 兼容 API', 'en': 'Use any OpenAI-compatible API' },
            isCustom: true
        }
    },
    local: {
        ollama: {
            name: { 'zh-CN': 'Ollama (本地)', 'en': 'Ollama (Local)' },
            model: 'llama3.2',
            apiKeyUrl: 'https://ollama.ai/download',
            getKeyText: { 'zh-CN': '下载 Ollama', 'en': 'Download Ollama' }
        },
        lmstudio: {
            name: 'LM Studio',
            model: 'local-model',
            apiKeyUrl: 'https://lmstudio.ai/',
            getKeyText: { 'zh-CN': '下载 LM Studio', 'en': 'Download LM Studio' }
        },
        custom_local: {
            name: '自定义本地 API',
            model: '',
            apiKeyUrl: '',
            getKeyText: { 'zh-CN': '使用自定义本地服务', 'en': 'Use custom local server' },
            isCustom: true
        }
    }
};

// Export for CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PROVIDERS };
}
