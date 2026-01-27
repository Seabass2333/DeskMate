/**
 * Auth Service - Handle user authentication and account binding
 * Uses Supabase Auth with OTP flow (no deep links required)
 */

const { supabase, isConfigured, rpc, getUserFriendlyError } = require('./SupabaseClient');
const { getDeviceId } = require('./DeviceIdService');

class AuthService {
    constructor() {
        this.user = null;
        this.init();
    }

    async init() {
        if (!isConfigured()) return;

        // Get initial session
        const { data } = await supabase.auth.getSession();
        this.user = data.session?.user || null;

        // Listen for auth changes
        supabase.auth.onAuthStateChange((event, session) => {
            console.log(`[Auth] State change: ${event}`);
            this.user = session?.user || null;

            // If signed in, try to bind device automatically
            if (event === 'SIGNED_IN' && this.user) {
                this.bindDevice();
            }
        });
    }

    /**
     * Send OTP to email
     * @param {string} email 
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async sendOtp(email) {
        if (!isConfigured()) {
            return { success: false, error: '服务未配置' };
        }

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    shouldCreateUser: true
                }
            });

            if (error) {
                return { success: false, error: getUserFriendlyError(error) };
            }
            return { success: true };
        } catch (err) {
            return { success: false, error: getUserFriendlyError(err) };
        }
    }

    /**
     * Verify OTP code
     * @param {string} email 
     * @param {string} token 
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async verifyOtp(email, token) {
        if (!isConfigured()) {
            return { success: false, error: '服务未配置' };
        }

        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email,
                token,
                type: 'email'
            });

            if (error) {
                return { success: false, error: getUserFriendlyError(error) };
            }

            // Trigger state update manually for hybrid client
            if (data.user) {
                this.user = data.user;
                this.bindDevice();
            }

            // Successful login will trigger onAuthStateChange -> bindDevice (for Supabase)
            return { success: true, user: data.user };
        } catch (err) {
            return { success: false, error: getUserFriendlyError(err) };
        }
    }

    /**
     * Sign out
     */
    async signOut() {
        if (!isConfigured()) return;
        await supabase.auth.signOut();
    }

    /**
     * Bind current device to authenticated user
     */
    async bindDevice() {
        if (!this.user) return;

        try {
            const deviceId = getDeviceId();
            console.log(`[Auth] Binding device ${deviceId} to user ${this.user.id}`);

            await rpc('bind_device_to_user', {
                p_device_id: deviceId
            });

            console.log('[Auth] Device bound successfully');
        } catch (error) {
            console.error('[Auth] Failed to bind device:', error);
        }
    }

    /**
     * Get current user
     */
    getUser() {
        return this.user;
    }
}

const authService = new AuthService();
module.exports = { authService };
