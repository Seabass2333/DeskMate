/**
 * LLM Handler - Provider-Agnostic Adapter
 * 
 * Supports any OpenAI-compatible API endpoint:
 * - DeepSeek (China)
 * - Moonshot (China)
 * - OpenRouter (Global)
 * - OpenAI (Global)
 * - Local Ollama
 */

const https = require('https');
const http = require('http');

class LLMHandler {
    /**
     * @param {Object} config - Provider configuration
     * @param {string} config.baseURL - API base URL (e.g., https://api.deepseek.com/v1)
     * @param {string} config.apiKey - API key for authentication
     * @param {string} config.model - Model identifier (e.g., deepseek-chat)
     * @param {string} [config.systemPrompt] - Default system prompt
     * @param {number} [config.timeout] - Request timeout in ms (default: 30000)
     * @param {number} [config.maxTokens] - Max response tokens (default: 150)
     * @param {number} [config.temperature] - Response creativity 0-2 (default: 0.8)
     * @param {number} [config.maxHistoryLength] - Max conversation turns to remember (default: 10)
     */
    constructor(config) {
        this.validateConfig(config);

        this.baseURL = config.baseURL.replace(/\/+$/, ''); // Remove trailing slashes
        this.apiKey = config.apiKey;
        this.model = config.model;
        this.systemPrompt = config.systemPrompt || 'You are a helpful assistant.';
        this.timeout = config.timeout || 30000;
        this.maxTokens = config.maxTokens || 150;
        this.temperature = config.temperature || 0.8;
        this.maxHistoryLength = config.maxHistoryLength || 10;

        // Conversation history for context memory
        this.conversationHistory = [];

        // Parse URL for http/https module selection
        this.urlParts = new URL(this.baseURL);
    }

    /**
     * Validate required config fields
     */
    validateConfig(config) {
        if (!config) {
            throw new Error('LLMHandler: config is required');
        }
        if (!config.baseURL) {
            throw new Error('LLMHandler: baseURL is required');
        }
        if (!config.apiKey) {
            throw new Error('LLMHandler: apiKey is required');
        }
        if (!config.model) {
            throw new Error('LLMHandler: model is required');
        }
    }

    /**
     * Send a chat completion request with conversation history
     * @param {string} userMessage - User's message
     * @param {Object} [options] - Override options
     * @param {string} [options.systemPrompt] - Override system prompt
     * @param {number} [options.maxTokens] - Override max tokens
     * @param {number} [options.temperature] - Override temperature
     * @param {boolean} [options.useHistory] - Include conversation history (default: true)
     * @returns {Promise<{success: boolean, message: string, usage?: Object}>}
     */
    async chat(userMessage, options = {}) {
        if (!userMessage || typeof userMessage !== 'string') {
            return {
                success: false,
                message: "I didn't catch that. Could you try again?"
            };
        }

        const systemPrompt = options.systemPrompt || this.systemPrompt;
        const maxTokens = options.maxTokens || this.maxTokens;
        const temperature = options.temperature || this.temperature;
        const useHistory = options.useHistory !== false; // Default to true

        // Build messages array
        const messages = [
            { role: 'system', content: systemPrompt }
        ];

        // Add conversation history if enabled
        if (useHistory && this.conversationHistory.length > 0) {
            messages.push(...this.conversationHistory);
        }

        // Add current user message
        messages.push({ role: 'user', content: userMessage.trim() });

        const requestBody = {
            model: this.model,
            messages: messages,
            max_tokens: maxTokens,
            temperature: temperature
        };

        try {
            const response = await this.makeRequest('/chat/completions', requestBody);

            if (!response.choices || !response.choices[0]) {
                console.error('[LLMHandler] Invalid response structure:', response);
                return {
                    success: false,
                    message: "I got confused... my brain returned something weird."
                };
            }

            const content = response.choices[0].message?.content?.trim();

            if (!content) {
                return {
                    success: false,
                    message: "I lost my train of thought..."
                };
            }

            // Store this exchange in history
            if (useHistory) {
                this.addToHistory('user', userMessage.trim());
                this.addToHistory('assistant', content);
            }

            return {
                success: true,
                message: content,
                usage: response.usage || null
            };

        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Add a message to conversation history
     * @param {string} role - 'user' or 'assistant'
     * @param {string} content - Message content
     */
    addToHistory(role, content) {
        this.conversationHistory.push({ role, content });

        // Trim history if too long (keep most recent exchanges)
        // Each exchange = 2 messages (user + assistant)
        const maxMessages = this.maxHistoryLength * 2;
        if (this.conversationHistory.length > maxMessages) {
            this.conversationHistory = this.conversationHistory.slice(-maxMessages);
        }
    }

    /**
     * Clear conversation history
     */
    clearHistory() {
        this.conversationHistory = [];
        console.log('[LLMHandler] Conversation history cleared');
    }

    /**
     * Get current conversation history
     * @returns {Array} Conversation history
     */
    getHistory() {
        return [...this.conversationHistory];
    }

    /**
     * Make HTTP request to the API
     * @private
     */
    makeRequest(endpoint, body) {
        return new Promise((resolve, reject) => {
            // Build full URL by concatenating baseURL + endpoint
            // (URL constructor replaces path if endpoint starts with /)
            const fullURL = this.baseURL + endpoint;
            const url = new URL(fullURL);
            const isHttps = url.protocol === 'https:';
            const httpModule = isHttps ? https : http;

            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'User-Agent': 'DeskMate/1.0',
                    // OpenRouter requires these headers
                    'HTTP-Referer': 'https://deskmate.app',
                    'X-Title': 'DeskMate'
                },
                timeout: this.timeout
            };

            const req = httpModule.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);

                        if (res.statusCode >= 400) {
                            const error = new Error(parsed.error?.message || `HTTP ${res.statusCode}`);
                            error.statusCode = res.statusCode;
                            error.response = parsed;
                            reject(error);
                            return;
                        }

                        resolve(parsed);
                    } catch (parseError) {
                        reject(new Error(`Failed to parse response: ${data.substring(0, 100)}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timed out'));
            });

            req.write(JSON.stringify(body));
            req.end();
        });
    }

    /**
     * Convert errors to user-friendly messages
     * @private
     */
    handleError(error) {
        console.error('[LLMHandler] Error:', error.message);

        // Network errors
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ENETUNREACH') {
            return {
                success: false,
                message: "断网了... 检查一下网络吧 🌐",
                errorType: 'network'
            };
        }

        // Timeout
        if (error.message.includes('timed out') || error.code === 'ETIMEDOUT') {
            return {
                success: false,
                message: "服务器太慢了... 等会再试试 ⏰",
                errorType: 'timeout'
            };
        }

        // Auth errors
        if (error.statusCode === 401) {
            return {
                success: false,
                message: "API Key 好像不对哦，去设置里看看？ 🔑",
                errorType: 'auth'
            };
        }

        // Rate limit
        if (error.statusCode === 429) {
            return {
                success: false,
                message: "问太多啦！让我喘口气 😮‍💨",
                errorType: 'rateLimit'
            };
        }

        // Insufficient quota
        if (error.statusCode === 402 || error.message.includes('Insufficient') || error.message.includes('insufficient') || error.message.includes('balance')) {
            return {
                success: false,
                message: "API 余额不足，去充值吧 💰",
                errorType: 'quota'
            };
        }

        // Generic server error
        if (error.statusCode >= 500) {
            return {
                success: false,
                message: "AI 服务器出问题了，稍后再试 🔧",
                errorType: 'server'
            };
        }

        // Fallback
        return {
            success: false,
            message: "出错了... 但我也不知道为啥 🤔",
            errorType: 'unknown'
        };
    }

    /**
     * Test the connection to the API
     * @returns {Promise<{success: boolean, message: string, latency?: number}>}
     */
    async testConnection() {
        const start = Date.now();

        try {
            const result = await this.chat('Say "OK" if you can hear me.', {
                maxTokens: 10,
                temperature: 0
            });

            return {
                success: result.success,
                message: result.success ? 'Connection successful!' : result.message,
                latency: Date.now() - start
            };
        } catch (error) {
            return {
                success: false,
                message: `Connection failed: ${error.message}`,
                latency: Date.now() - start
            };
        }
    }
}

module.exports = LLMHandler;
