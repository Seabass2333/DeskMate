/**
 * Supabase Client - v1.3 with Network Resilience
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://isgmlrcfgunisziinhfb.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

// Resilience Config
const RETRY_CONFIG = {
    maxRetries: 3,
    baseDelayMs: 500,      // 500ms -> 1000ms -> 2000ms (exponential)
    timeoutMs: 10000       // 10 seconds per request
};

// Validate configuration
if (!SUPABASE_ANON_KEY) {
    console.warn('[SupabaseClient] SUPABASE_ANON_KEY not configured. Remote features disabled.');
}

// Create Supabase client
const supabase = SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

/**
 * Check if Supabase is configured and available
 */
function isConfigured() {
    return !!supabase;
}

/**
 * Sleep helper for exponential backoff
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Error classification
 */
function classifyError(error) {
    if (!error) return 'UNKNOWN';
    const msg = error.message || '';

    if (msg.includes('timeout') || msg.includes('ETIMEDOUT')) return 'TIMEOUT';
    if (msg.includes('network') || msg.includes('ENOTFOUND') || msg.includes('fetch')) return 'NETWORK';
    if (error.code === 'PGRST') return 'DATABASE';
    return 'UNKNOWN';
}

/**
 * Call a Supabase RPC function with retry logic
 * @param {string} functionName 
 * @param {object} params 
 * @param {object} options - Optional overrides for retry config
 * @returns {Promise<any>}
 */
async function rpc(functionName, params, options = {}) {
    if (!supabase) {
        throw new Error('Supabase not configured');
    }

    const maxRetries = options.maxRetries ?? RETRY_CONFIG.maxRetries;
    const baseDelay = options.baseDelayMs ?? RETRY_CONFIG.baseDelayMs;
    const timeout = options.timeoutMs ?? RETRY_CONFIG.timeoutMs;

    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const { data, error } = await supabase.rpc(functionName, params, {
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (error) {
                lastError = error;
                const errorType = classifyError(error);

                // Only retry on network/timeout errors
                if (errorType === 'NETWORK' || errorType === 'TIMEOUT') {
                    console.warn(`[Supabase RPC] ${functionName} attempt ${attempt}/${maxRetries} failed (${errorType}):`, error.message);
                    if (attempt < maxRetries) {
                        await sleep(baseDelay * Math.pow(2, attempt - 1));
                        continue;
                    }
                }

                // Non-retryable error
                throw error;
            }

            return data;
        } catch (err) {
            lastError = err;

            // Check if aborted (timeout)
            if (err.name === 'AbortError') {
                console.warn(`[Supabase RPC] ${functionName} attempt ${attempt}/${maxRetries} timed out`);
                if (attempt < maxRetries) {
                    await sleep(baseDelay * Math.pow(2, attempt - 1));
                    continue;
                }
            }

            // For other errors, rethrow immediately
            if (attempt === maxRetries || classifyError(err) === 'DATABASE') {
                throw err;
            }

            await sleep(baseDelay * Math.pow(2, attempt - 1));
        }
    }

    // All retries exhausted
    console.error(`[Supabase RPC] ${functionName} failed after ${maxRetries} attempts`);
    throw lastError || new Error('RPC failed after retries');
}

/**
 * Get user-friendly error message
 */
function getUserFriendlyError(error) {
    const type = classifyError(error);
    switch (type) {
        case 'TIMEOUT':
            return '请求超时，请检查网络连接后重试';
        case 'NETWORK':
            return '网络连接失败，请稍后重试';
        case 'DATABASE':
            return '服务器处理错误，请稍后重试';
        default:
            return '操作失败，请稍后重试';
    }
}

module.exports = {
    supabase,
    isConfigured,
    rpc,
    classifyError,
    getUserFriendlyError
};
