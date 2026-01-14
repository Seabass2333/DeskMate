/**
 * Auth Service - Handle user authentication and account binding
 * Uses Supabase Auth with OTP flow (no deep links required)
 */

const { supabase, isConfigured, rpc } = require('./SupabaseClient');
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
     */
    async sendOtp(email) {
        if (!isConfigured()) throw new Error('Supabase not configured');

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                shouldCreateUser: true
            }
        });

        if (error) throw error;
        return true;
    }

    /**
     * Verify OTP code
     * @param {string} email 
     * @param {string} token 
     */
    async verifyOtp(email, token) {
        if (!isConfigured()) throw new Error('Supabase not configured');

        const { data, error } = await supabase.auth.verifyOtp({
            email,
            token,
            type: 'email'
        });

        if (error) throw error;

        // Successful login will trigger onAuthStateChange -> bindDevice
        return data;
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
