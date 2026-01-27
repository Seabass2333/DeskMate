/**
 * REST API Client
 * Adapts the internal RPC interface to the Self-Hosted Node.js API
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://67.215.243.152:3000/api';

// RPC Function Name to API Endpoint Mapping
const RPC_MAP = {
    // Invite
    'verify_invite_code': '/invite/verify',
    'get_user_status': '/invite/status',
    'debug_reset_user': '/invite/debug-reset',

    // Settings
    'save_user_setting': '/settings/save',
    'get_user_settings': '/settings/get',

    // Analytics
    'track_event': '/analytics/track',

    // Ops
    'get_announcements': '/ops/announcements',
    'submit_feedback': '/ops/feedback',

    // Auth (Binding)
    'bind_device_to_user': '/auth/bind-device'
};

class RestApiClient {
    constructor() {
        this.token = this.getStoredToken();
        this.currentUser = null;
    }

    /**
     * Safe storage getter
     */
    getStoredToken() {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                return window.localStorage.getItem('deskmate_auth_token');
            }
        } catch (e) {
            // Ignore errors in restricted environments
        }
        return null;
    }

    /**
     * Set Auth Token
     */
    setToken(token) {
        this.token = token;
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                if (token) {
                    window.localStorage.setItem('deskmate_auth_token', token);
                } else {
                    window.localStorage.removeItem('deskmate_auth_token');
                }
            }
        } catch (e) {
            // Ignore
        }
    }

    /**
     * Generic RPC adapter
     * @param {string} functionName 
     * @param {object} params 
     */
    async rpc(functionName, params) {
        const endpoint = RPC_MAP[functionName];

        if (!endpoint) {
            throw new Error(`Unknown RPC function: ${functionName}`);
        }

        // Map params: remove 'p_' prefix if backend expects clean names?
        // Our backend expects clean names (e.g. { deviceId } vs { p_device_id })
        // We need a parameter mapper.
        const cleanParams = this.mapParams(functionName, params);

        return await this.request(endpoint, cleanParams);
    }

    /**
     * Map RPC params (p_snake_case) to API params (camelCase)
     */
    mapParams(fn, params) {
        const newParams = {};

        // Helper to convert p_snake_case to camelCase
        // Special mappings for our specific API structure
        for (const [key, value] of Object.entries(params)) {
            // specific corrections based on API definition
            if (key === 'p_device_id') newParams.deviceId = value;
            else if (key === 'p_code') newParams.code = value;
            else if (key === 'p_key') newParams.key = value;
            else if (key === 'p_value') newParams.value = value;
            else if (key === 'p_event_type') newParams.eventType = value;
            else if (key === 'p_event_data') newParams.eventData = value;
            else if (key === 'p_version') newParams.version = value;
            else if (key === 'p_category') newParams.category = value;
            else if (key === 'p_content') newParams.content = value;
            else if (key === 'p_email') newParams.email = value;
            else if (key === 'p_app_version') newParams.appVersion = value;
            else newParams[key] = value; // Fallback
        }

        return newParams;
    }

    /**
     * Make HTTP request
     */
    async request(endpoint, body) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                // Try to parse error
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();

            // RPC calls often expect { data, error } format wrapper
            // But our rpc() method in SupabaseClient usually returns { data, error } OR just throws?
            // Let's check SupabaseClient.js rpc implementation:
            // "const { data, error } = await supabase.rpc(...)"
            // It expects an object with data/error structure if calling raw supabase.
            // BUT, our SupabaseClient.js wrapper `rpc` function implementation (lines 63-128)
            // returns `data` directly on success, or throws on error.

            // Backend returns specific shapes often.
            // Invite verify: { valid: true, ... }

            return data;

        } catch (error) {
            console.error(`[RestApiClient] Request failed: ${url}`, error);
            throw error;
        }
    }

    // === Auth Methods (Replacing Supabase Auth) ===

    async signInWithOtp({ email }) {
        return await this.request('/auth/send-otp', { email });
    }

    async verifyOtp({ email, token }) {
        const result = await this.request('/auth/verify-otp', {
            email,
            code: token // API expects 'code'
        });

        if (result.token) {
            this.setToken(result.token);
            this.currentUser = result.user;
        }

        return {
            data: {
                user: result.user,
                session: { access_token: result.token, user: result.user }
            },
            error: null
        };
    }

    async signOut() {
        this.setToken(null);
        this.currentUser = null;
    }

    async getSession() {
        if (this.token) {
            return {
                data: {
                    session: {
                        access_token: this.token,
                        user: this.currentUser || { email: 'user@example.com' }
                    }
                }
            };
        }
        return { data: { session: null } };
    }

    onAuthStateChange(callback) {
        return { data: { subscription: { unsubscribe: () => { } } } };
    }
}

module.exports = new RestApiClient();
