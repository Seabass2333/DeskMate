/**
 * CoPetService - 1v1 双人共养核心业务闭环服务
 *
 * 核心业务闭环设计：
 * 1. 郑重结契（Contract Ceremony）：双方署名 + 共同为小宠取名 + 纪念日生成，不可多重配对（严格 1v1）。
 * 2. 共同养成（Bond Level & EXP）：每次跨屏摸摸、投喂、提醒喝水、完成番茄钟均累积「共养羁绊值」，解锁 Lv.1~Lv.5 羁绊称号。
 * 3. 共养手账（Shared Care Timeline）：自动记录双方照料小宠物的点滴足迹，形成情感记忆闭环。
 * 4. 慎重解契保护（Anti-impulse Unpair Guard）：禁止随手一键取消，必须输入「确认解契」或伙伴配对码二次确认方可解除契约。
 */

const store = require('../../store');
const { isConfigured, rpc } = require('./SupabaseClient');
const { getDeviceId } = require('./DeviceIdService');

const DEMO_CODES = ['PAIR-520', 'LOVE-520', 'CAT-520', 'DESK-1V1'];
const VALID_ACTIONS = ['touch', 'feed', 'water_nudge', 'pomodoro_cheer'];

const BOND_LEVELS = [
    { level: 1, title: '初识之约', minExp: 0, nextExp: 50 },
    { level: 2, title: '朝夕默契', minExp: 50, nextExp: 150 },
    { level: 3, title: '心意相通', minExp: 150, nextExp: 300 },
    { level: 4, title: '温暖羁绊', minExp: 300, nextExp: 600 },
    { level: 5, title: '灵魂伴侣', minExp: 600, nextExp: null }
];

const ACTION_META = {
    touch: { exp: 3, icon: '👋', label: '隔空摸了摸小宠' },
    feed: { exp: 5, icon: '🐟', label: '投喂了美味小鱼干' },
    water_nudge: { exp: 2, icon: '💧', label: '托小宠提醒对方喝水休息' },
    pomodoro_cheer: { exp: 10, icon: '🍅', label: '完成了一次专注并分享元气' }
};

class CoPetService {
    constructor(options = {}) {
        this.useRemote = options.useRemote !== undefined
            ? Boolean(options.useRemote)
            : false;
        this.onRemoteEventCallback = null;
        this.onStatusChangeCallback = null;
        this.simulatedTimers = new Set();
    }

    /**
     * Register callback when a remote/simulated partner event arrives
     */
    onPartnerEvent(callback) {
        this.onRemoteEventCallback = callback;
    }

    /**
     * Register callback when co-pet status/logs/exp changes
     */
    onStatusChange(callback) {
        this.onStatusChangeCallback = callback;
    }

    /**
     * Calculate bond level details from total bondExp
     */
    calculateBondLevel(bondExp = 0) {
        const exp = Math.max(0, Number(bondExp) || 0);
        let currentTier = BOND_LEVELS[0];

        for (const tier of BOND_LEVELS) {
            if (exp >= tier.minExp) {
                currentTier = tier;
            }
        }

        let progressPercent = 100;
        if (currentTier.nextExp !== null) {
            const span = currentTier.nextExp - currentTier.minExp;
            const gained = exp - currentTier.minExp;
            progressPercent = Math.min(100, Math.max(0, Math.round((gained / span) * 100)));
        }

        return {
            level: currentTier.level,
            title: currentTier.title,
            exp,
            minExp: currentTier.minExp,
            nextExp: currentTier.nextExp,
            progressPercent
        };
    }

    /**
     * Generate a 6-character pairing code (e.g. CAT-829) for the current user
     */
    async generateMyCode() {
        const current = store.get('coPet') || {};
        if (current.myCode && current.myCode.length >= 6) {
            return { success: true, code: current.myCode };
        }

        if (this.useRemote && isConfigured()) {
            try {
                const res = await rpc('copet_create_code', {
                    deviceId: getDeviceId()
                });
                if (res && res.pairCode) {
                    this._updateStore({ myCode: res.pairCode });
                    return { success: true, code: res.pairCode };
                }
            } catch (err) {
                console.warn('[CoPetService] Remote code generation failed, using local generator:', err.message);
            }
        }

        const prefixes = ['CAT', 'PAW', 'MEW', 'PET'];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const digits = Math.floor(100 + Math.random() * 900);
        const code = `${prefix}-${digits}`;

        this._updateStore({ myCode: code });
        return { success: true, code };
    }

    /**
     * Sign 1v1 Co-Pet Contract with a partner
     * @param {string} partnerCode
     * @param {string | { partnerNickname?: string, myNickname?: string, petName?: string }} optionsOrNickname
     */
    async bindPartner(partnerCode, optionsOrNickname = {}) {
        if (!partnerCode || typeof partnerCode !== 'string') {
            return { success: false, message: '请输入有效的结契配对码' };
        }

        const cleanCode = partnerCode.trim().toUpperCase();
        if (!/^[A-Z0-9-]{4,12}$/.test(cleanCode)) {
            return { success: false, message: '配对码格式不正确（示例：CAT-829 或 PAIR-520）' };
        }

        const current = store.get('coPet') || {};

        // Strict 1v1 guard: cannot bind if already paired
        if (current.paired) {
            return { success: false, message: '当前已签署 1v1 共养契约，不可同时共养多只或绑定多人' };
        }

        // Prevent self-binding
        if (current.myCode && cleanCode === current.myCode.toUpperCase()) {
            return { success: false, message: '不能使用自己的配对码结契哦~' };
        }

        const opts = typeof optionsOrNickname === 'string'
            ? { partnerNickname: optionsOrNickname }
            : (optionsOrNickname || {});

        const cleanPartnerName = (opts.partnerNickname && opts.partnerNickname.trim())
            ? opts.partnerNickname.trim().slice(0, 16)
            : '远方的 TA';
        const cleanMyName = (opts.myNickname && opts.myNickname.trim())
            ? opts.myNickname.trim().slice(0, 16)
            : (current.myNickname || '我');
        const cleanPetName = (opts.petName && opts.petName.trim())
            ? opts.petName.trim().slice(0, 16)
            : (current.petName || 'Mochi');

        const now = new Date().toISOString();
        const initialLog = {
            id: `log_contract_${Date.now()}`,
            actor: `${cleanMyName} & ${cleanPartnerName}`,
            actionType: 'contract',
            icon: '✍️',
            text: `签署 1v1 共养契约，开始共同照料「${cleanPetName}」`,
            expDelta: 10,
            timestamp: now
        };

        if (this.useRemote && isConfigured() && !DEMO_CODES.includes(cleanCode)) {
            try {
                const res = await rpc('copet_join', {
                    deviceId: getDeviceId(),
                    pairCode: cleanCode,
                    nickname: cleanPartnerName
                });
                if (res && res.success) {
                    const pairedAt = res.pairedAt || now;
                    this._updateStore({
                        paired: true,
                        pairId: res.pairId || `pair_${cleanCode}`,
                        partnerCode: cleanCode,
                        myNickname: cleanMyName,
                        partnerNickname: res.partnerNickname || cleanPartnerName,
                        petName: cleanPetName,
                        pairedAt,
                        bondExp: 10,
                        logs: [initialLog]
                    });
                    return {
                        success: true,
                        message: `💞 契约已成！你与「${res.partnerNickname || cleanPartnerName}」正式开始共同养育「${cleanPetName}」！`,
                        status: this.getStatus()
                    };
                }
            } catch (err) {
                console.warn('[CoPetService] Remote join fallback to local:', err.message);
            }
        }

        this._updateStore({
            paired: true,
            pairId: `pair_${cleanCode}_${Date.now()}`,
            partnerCode: cleanCode,
            myNickname: cleanMyName,
            partnerNickname: cleanPartnerName,
            petName: cleanPetName,
            pairedAt: now,
            bondExp: 10,
            logs: [initialLog]
        });

        this._notifyStatusChange();

        return {
            success: true,
            message: `💞 契约已成！你与「${cleanPartnerName}」正式开始共同养育「${cleanPetName}」！`,
            status: this.getStatus()
        };
    }

    /**
     * Update shared pet name or nicknames without breaking the bond
     */
    updateProfile({ petName, myNickname, partnerNickname } = {}) {
        const current = store.get('coPet') || {};
        if (!current.paired) {
            return { success: false, message: '尚未结成共养契约' };
        }

        const updates = {};
        if (petName && petName.trim()) updates.petName = petName.trim().slice(0, 16);
        if (myNickname && myNickname.trim()) updates.myNickname = myNickname.trim().slice(0, 16);
        if (partnerNickname && partnerNickname.trim()) updates.partnerNickname = partnerNickname.trim().slice(0, 16);

        this._updateStore(updates);
        this._notifyStatusChange();
        return {
            success: true,
            message: '✨ 共养档案已更新',
            status: this.getStatus()
        };
    }

    /**
     * Unpair the current 1v1 co-pet relationship
     * Enforces anti-impulse confirmation: confirmToken must match 'UNPAIR', '确认解契', or partnerCode
     * @param {string} confirmToken
     */
    async unpair(confirmToken) {
        const current = store.get('coPet') || {};
        if (!current.paired) {
            return { success: false, message: '当前未处于共养状态' };
        }

        const rawToken = typeof confirmToken === 'string' ? confirmToken.trim() : '';
        const upperToken = rawToken.toUpperCase();
        const validPartnerCode = (current.partnerCode || '').toUpperCase();

        const isConfirmed =
            rawToken === '确认解契' ||
            upperToken === 'UNPAIR' ||
            (validPartnerCode && upperToken === validPartnerCode);

        if (!isConfirmed) {
            return {
                success: false,
                code: 'CONFIRM_REQUIRED',
                message: '共养契约不可随意解除。请在确认框中输入「确认解契」或伙伴配对码以核准解契。'
            };
        }

        this._clearSimulatedTimers();

        if (this.useRemote && isConfigured() && current.pairId) {
            try {
                await rpc('copet_unpair', {
                    deviceId: getDeviceId(),
                    pairId: current.pairId
                });
            } catch (err) {
                console.warn('[CoPetService] Remote unpair error ignored:', err.message);
            }
        }

        this._updateStore({
            paired: false,
            pairId: '',
            partnerCode: '',
            partnerNickname: '远方的 TA',
            pairedAt: '',
            bondExp: 0,
            logs: [],
            lastEventId: ''
        });

        this._notifyStatusChange();

        return {
            success: true,
            message: '已正式解除双人共养契约，羁绊记录已归档清零',
            status: this.getStatus()
        };
    }

    /**
     * Get current 1v1 pairing status including calculated days together, bond level, and care logs
     */
    getStatus() {
        const data = store.get('coPet') || {};
        const paired = Boolean(data.paired);
        let togetherDays = 0;

        if (paired && data.pairedAt) {
            const start = new Date(data.pairedAt).getTime();
            const now = Date.now();
            if (!Number.isNaN(start) && now >= start) {
                togetherDays = Math.max(1, Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1);
            } else {
                togetherDays = 1;
            }
        }

        const bond = this.calculateBondLevel(data.bondExp || 0);

        return {
            paired,
            pairId: data.pairId || '',
            myCode: data.myCode || '',
            partnerCode: data.partnerCode || '',
            myNickname: data.myNickname || '我',
            partnerNickname: data.partnerNickname || '远方的 TA',
            petName: data.petName || 'Mochi',
            pairedAt: data.pairedAt || '',
            togetherDays,
            bond,
            logs: Array.isArray(data.logs) ? data.logs.slice(0, 30) : []
        };
    }

    /**
     * Send a lightweight interaction to the partner's desktop pet and accumulate shared bond EXP
     * @param {'touch' | 'feed' | 'water_nudge' | 'pomodoro_cheer'} actionType
     */
    async sendInteraction(actionType) {
        if (!VALID_ACTIONS.includes(actionType)) {
            return { success: false, message: `Unsupported action: ${actionType}` };
        }

        const status = this.getStatus();
        if (!status.paired) {
            return { success: false, message: '尚未签署共养契约' };
        }

        const meta = ACTION_META[actionType];
        const newExp = (status.bond?.exp || 0) + meta.exp;
        const logEntry = {
            id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            actor: status.myNickname || '我',
            actionType,
            icon: meta.icon,
            text: `${meta.label}`,
            expDelta: meta.exp,
            timestamp: new Date().toISOString()
        };

        const updatedLogs = [logEntry, ...(status.logs || [])].slice(0, 30);
        this._updateStore({
            bondExp: newExp,
            logs: updatedLogs
        });
        this._notifyStatusChange();

        if (this.useRemote && isConfigured()) {
            try {
                await rpc('copet_send_action', {
                    deviceId: getDeviceId(),
                    pairId: status.pairId,
                    actionType
                });
            } catch (err) {
                console.warn('[CoPetService] Remote sendInteraction error:', err.message);
            }
        }

        // In Demo / Local Loopback mode, simulate a warm partner response after 3.5s
        if (!this.useRemote && this.onRemoteEventCallback) {
            const replyActions = ['touch', 'feed', 'water_nudge'];
            const echoAction = replyActions[Math.floor(Math.random() * replyActions.length)];
            const timer = setTimeout(() => {
                this.simulatedTimers.delete(timer);
                const latest = this.getStatus();
                if (latest.paired) {
                    const echoMeta = ACTION_META[echoAction];
                    const partnerLog = {
                        id: `log_echo_${Date.now()}`,
                        actor: latest.partnerNickname,
                        actionType: echoAction,
                        icon: echoMeta.icon,
                        text: `从远方${echoMeta.label}`,
                        expDelta: echoMeta.exp,
                        timestamp: new Date().toISOString()
                    };
                    this._updateStore({
                        bondExp: (latest.bond?.exp || 0) + echoMeta.exp,
                        logs: [partnerLog, ...(latest.logs || [])].slice(0, 30)
                    });
                    this._notifyStatusChange();

                    if (this.onRemoteEventCallback) {
                        this.onRemoteEventCallback({
                            id: partnerLog.id,
                            actionType: echoAction,
                            partnerNickname: latest.partnerNickname,
                            timestamp: partnerLog.timestamp
                        });
                    }
                }
            }, 3500);
            this.simulatedTimers.add(timer);
        }

        const actionLabels = {
            touch: `👋 已向「${status.partnerNickname}」传去隔空摸摸 (羁绊 +${meta.exp})`,
            feed: `🐟 已与「${status.partnerNickname}」共享小鱼干 (羁绊 +${meta.exp})`,
            water_nudge: `💧 已派「${status.petName}」提醒「${status.partnerNickname}」喝水 (羁绊 +${meta.exp})`,
            pomodoro_cheer: `🍅 已向「${status.partnerNickname}」同步专注元气 (羁绊 +${meta.exp})`
        };

        return {
            success: true,
            actionType,
            message: actionLabels[actionType] || '已发送隔空互动~',
            status: this.getStatus()
        };
    }

    _updateStore(partial) {
        const current = store.get('coPet') || {};
        store.set('coPet', {
            ...current,
            ...partial
        });
    }

    _notifyStatusChange() {
        if (typeof this.onStatusChangeCallback === 'function') {
            this.onStatusChangeCallback(this.getStatus());
        }
    }

    _clearSimulatedTimers() {
        for (const t of this.simulatedTimers) {
            clearTimeout(t);
        }
        this.simulatedTimers.clear();
    }
}

const coPetService = new CoPetService();

module.exports = {
    CoPetService,
    coPetService,
    DEMO_CODES,
    VALID_ACTIONS,
    BOND_LEVELS
};
