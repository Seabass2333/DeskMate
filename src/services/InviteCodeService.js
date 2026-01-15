/**
 * Invite Code Service - 邀请码验证服务
 * 
 * v1.1: 本地验证
 * v1.2: Supabase 远程验证
 * 
 * 设计原则：抽象验证逻辑，使本地/远程切换无缝
 */

const { isConfigured, rpc } = require('./SupabaseClient');
const { getDeviceId } = require('./DeviceIdService');

/**
 * 邀请码验证配置
 */
const CONFIG = {
    // v1.2: 启用远程验证（如果 Supabase 已配置）
    useRemoteValidation: true,

    // 本地有效邀请码（降级备用）
    localCodes: [
        'VIP-2024-CAT',
        'MOCHI-LOVE',
        'DESKMATE-PRO',
        'POCHI-POWER'
    ]
};

class InviteCodeService {
    constructor() {
        // 自动检测：如果 Supabase 配置了就用远程，否则本地
        this.useRemote = CONFIG.useRemoteValidation && isConfigured();
        console.log(`[InviteCodeService] Mode: ${this.useRemote ? 'REMOTE' : 'LOCAL'}`);
    }

    /**
     * 验证邀请码
     * @param {string} code 
     * @returns {Promise<{valid: boolean, message: string, tier?: string}>}
     */
    async verify(code) {
        if (!code || typeof code !== 'string') {
            return { valid: false, message: 'Code is empty' };
        }

        const trimmedCode = code.trim().toUpperCase();

        if (this.useRemote) {
            try {
                return await this.verifyRemote(trimmedCode);
            } catch (error) {
                console.error('[InviteCodeService] Remote verification failed, falling back to local:', error);
                // Use friendly message for network errors
                const { getUserFriendlyError } = require('./SupabaseClient');
                console.warn('[InviteCodeService] User message:', getUserFriendlyError(error));
                return this.verifyLocal(trimmedCode);
            }
        }
        return this.verifyLocal(trimmedCode);
    }

    /**
     * 本地验证（降级备用）
     */
    verifyLocal(code) {
        // 支持开发测试码
        const isDevCode = code.startsWith('DEV-VIP-');
        const isValidCode = CONFIG.localCodes.includes(code);

        if (isDevCode || isValidCode) {
            return {
                valid: true,
                message: 'VIP Activated!',
                tier: 'pro'
            };
        }

        return { valid: false, message: 'Invalid code' };
    }

    /**
     * 远程验证（v1.2 Supabase）
     */
    async verifyRemote(code) {
        const deviceId = getDeviceId();

        const result = await rpc('verify_invite_code', {
            p_code: code,
            p_device_id: deviceId
        });

        console.log('[InviteCodeService] Remote result:', result);

        return {
            valid: result.valid,
            message: result.message,
            tier: result.tier || 'free',
            alreadyActivated: result.already_activated || false
        };
    }

    /**
     * 获取当前用户状态
     */
    async getUserStatus() {
        if (!this.useRemote) {
            return { vip_tier: 'free', activated_at: null };
        }

        try {
            const deviceId = getDeviceId();
            const result = await rpc('get_user_status', {
                p_device_id: deviceId
            });
            return result;
        } catch (error) {
            console.error('[InviteCodeService] Failed to get user status:', error);
            return { vip_tier: 'free', activated_at: null };
        }
    }

    /**
     * DEBUG: 重置用户状态
     */
    async debugResetUser() {
        if (!this.useRemote) return { success: true };

        try {
            const deviceId = getDeviceId();
            return await rpc('debug_reset_user', { p_device_id: deviceId });
        } catch (error) {
            console.error('[InviteCodeService] Reset failed:', error);
            return { success: false };
        }
    }

    /**
     * 启用/禁用远程验证
     */
    setRemoteValidation(enabled) {
        this.useRemote = enabled && isConfigured();
        console.log(`[InviteCodeService] Remote validation: ${this.useRemote ? 'ON' : 'OFF'}`);
    }
}

// 单例导出
const inviteCodeService = new InviteCodeService();

module.exports = { InviteCodeService, inviteCodeService };
