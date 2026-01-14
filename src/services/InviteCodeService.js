/**
 * Invite Code Service - 邀请码验证服务
 * 
 * v1.1: 本地验证
 * v1.2: 切换为 API 验证
 * 
 * 设计原则：抽象验证逻辑，使本地/远程切换无缝
 */

// v1.2: 取消注释启用
// const { apiService } = require('./ApiService');

/**
 * 邀请码验证配置
 */
const CONFIG = {
    // v1.2 时改为 true
    useRemoteValidation: false,

    // 本地有效邀请码（v1.2 移除）
    localCodes: [
        'VIP-2024-CAT',
        'MOCHI-LOVE',
        'DESKMATE-PRO',
        'POCHI-POWER'
    ]
};

class InviteCodeService {
    constructor() {
        this.useRemote = CONFIG.useRemoteValidation;
    }

    /**
     * 验证邀请码
     * @param {string} code 
     * @returns {Promise<{valid: boolean, message: string, vipLevel?: string}>}
     */
    async verify(code) {
        if (!code || typeof code !== 'string') {
            return { valid: false, message: 'Code is empty' };
        }

        const trimmedCode = code.trim().toUpperCase();

        if (this.useRemote) {
            return this.verifyRemote(trimmedCode);
        }
        return this.verifyLocal(trimmedCode);
    }

    /**
     * 本地验证（v1.1）
     */
    verifyLocal(code) {
        // 支持开发测试码
        const isDevCode = code.startsWith('DEV-VIP-');
        const isValidCode = CONFIG.localCodes.includes(code);

        if (isDevCode || isValidCode) {
            return {
                valid: true,
                message: 'VIP Activated!',
                vipLevel: 'pro'
            };
        }

        return { valid: false, message: 'Invalid code' };
    }

    /**
     * 远程验证（v1.2 启用）
     */
    async verifyRemote(code) {
        // v1.2: 取消注释
        // const result = await apiService.post('/api/invite-code/verify', { code });
        // if (result.success && result.data.valid) {
        //     return {
        //         valid: true,
        //         message: result.data.message || 'VIP Activated!',
        //         vipLevel: result.data.vipLevel || 'pro'
        //     };
        // }
        // return { valid: false, message: result.data?.message || 'Invalid code' };

        // v1.1: 远程验证未启用，回退到本地
        console.warn('[InviteCodeService] Remote validation not enabled, falling back to local');
        return this.verifyLocal(code);
    }

    /**
     * 启用/禁用远程验证
     */
    setRemoteValidation(enabled) {
        this.useRemote = enabled;
        console.log(`[InviteCodeService] Remote validation: ${enabled ? 'ON' : 'OFF'}`);
    }
}

// 单例导出
const inviteCodeService = new InviteCodeService();

module.exports = { InviteCodeService, inviteCodeService };
