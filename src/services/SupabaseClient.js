/**
 * Supabase Client - v1.3 with Network Resilience
 */

const { createClient } = require('@supabase/supabase-js');
const restClient = require('./RestApiClient');

// Configuration
// Check if Self-Hosted mode is enabled via Env or LocalStorage
const USE_SELF_HOSTED = process.env.USE_SELF_HOSTED === 'true' ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('use_self_hosted') === 'true');

console.log(`[CloudClient] Mode: ${USE_SELF_HOSTED ? 'SELF-HOSTED' : 'SUPABASE'}`);

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://isgmlrcfgunisziinhfb.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZ21scmNmZ3VuaXN6aWluaGZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNTMyNzMsImV4cCI6MjA4MzkyOTI3M30.OM5q2oMR9U6QpbsOCHhnWs6gSz5eaAqkMj2osBHV40Q';

// Resilience Config
const RETRY_CONFIG = {
    maxRetries: 3,
    baseDelayMs: 500,
    timeoutMs: 10000
};

// Create Supabase client (only if needed or for fallback)
const supabase = (SUPABASE_ANON_KEY && !USE_SELF_HOSTED)
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

// Proxy for Auth to allow switching
const authProxy = {
    signInWithOtp: async (params) => {
        if (USE_SELF_HOSTED) return restClient.signInWithOtp(params);
        if (supabase) return supabase.auth.signInWithOtp(params);
        return { error: { message: 'No backend configured' } };
    },
    verifyOtp: async (params) => {
        if (USE_SELF_HOSTED) return restClient.verifyOtp(params);
        if (supabase) return supabase.auth.verifyOtp(params);
        return { error: { message: 'No backend configured' } };
    },
    signOut: async () => {
        if (USE_SELF_HOSTED) return restClient.signOut();
        if (supabase) return supabase.auth.signOut();
    },
    getSession: async () => {
        if (USE_SELF_HOSTED) return restClient.getSession();
        if (supabase) return supabase.auth.getSession();
        return { data: { session: null } };
    },
    onAuthStateChange: (callback) => {
        if (USE_SELF_HOSTED) return restClient.onAuthStateChange(callback);
        if (supabase) return supabase.auth.onAuthStateChange(callback);
    }
};

// Hybrid Supabase Object
const hybridSupabase = {
    auth: authProxy,
    rpc: async (fn, params) => {
        if (USE_SELF_HOSTED) {
            // Wrap in object structure to match Supabase response format used internally?
            // Existing `rpc` function wrapper handles the data structure.
            // But if called directly `supabase.rpc`, it expects { data, error }
            try {
                const data = await restClient.rpc(fn, params);
                return { data, error: null };
            } catch (err) {
                return { data: null, error: err };
            }
        }
        if (supabase) return supabase.rpc(fn, params);
        return { data: null, error: { message: 'No backend configured' } };
    }
};

/**
 * Check if configured
 */
function isConfigured() {
    return USE_SELF_HOSTED || !!supabase;
}

/**
 * Sleep helper
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
 * Call RPC function with retry logic
 */
async function rpc(functionName, params, options = {}) {
    if (!isConfigured()) {
        throw new Error('Backend not configured');
    }

    // Direct path for Self-Hosted
    if (USE_SELF_HOSTED) {
        return await restClient.rpc(functionName, params);
    }

    const maxRetries = options.maxRetries ?? RETRY_CONFIG.maxRetries;
    const baseDelay = options.baseDelayMs ?? RETRY_CONFIG.baseDelayMs;
    const timeout = options.timeoutMs ?? RETRY_CONFIG.timeoutMs;

    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const { data, error } = await supabase.rpc(functionName, params, {
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (error) {
                lastError = error;
                const errorType = classifyError(error);

                if (errorType === 'NETWORK' || errorType === 'TIMEOUT') {
                    console.warn(`[Supabase RPC] ${functionName} attempt ${attempt}/${maxRetries} failed (${errorType}):`, error.message);
                    if (attempt < maxRetries) {
                        await sleep(baseDelay * Math.pow(2, attempt - 1));
                        continue;
                    }
                }
                throw error;
            }

            return data;
        } catch (err) {
            lastError = err;
            if (err.name === 'AbortError') {
                console.warn(`[Supabase RPC] ${functionName} attempt ${attempt}/${maxRetries} timed out`);
                if (attempt < maxRetries) {
                    await sleep(baseDelay * Math.pow(2, attempt - 1));
                    continue;
                }
            }

            if (attempt === maxRetries || classifyError(err) === 'DATABASE') {
                throw err;
            }

            await sleep(baseDelay * Math.pow(2, attempt - 1));
        }
    }

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
    supabase: hybridSupabase, // Export hybrid object instead of raw Supabase
    isConfigured,
    rpc,
    classifyError,
    getUserFriendlyError
};
