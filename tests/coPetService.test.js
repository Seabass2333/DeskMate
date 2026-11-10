/**
 * CoPetService Unit Tests (Stage 3 - 1v1 Shared Pet Closed-Loop System)
 */

const store = require('../store');
const { CoPetService } = require('../src/services/CoPetService');

describe('CoPetService (1v1 Shared Pet Closed-Loop)', () => {
    let service;

    beforeEach(() => {
        jest.useFakeTimers();
        store.set('coPet', {
            paired: false,
            pairId: '',
            myCode: '',
            partnerCode: '',
            myNickname: '我',
            partnerNickname: '远方的 TA',
            petName: 'Mochi',
            pairedAt: '',
            bondExp: 0,
            logs: [],
            lastEventId: ''
        });
        service = new CoPetService({ useRemote: false });
    });

    afterEach(() => {
        service._clearSimulatedTimers();
        jest.useRealTimers();
    });

    test('should generate and persist a valid 6+ char pairing code', async () => {
        const res = await service.generateMyCode();
        expect(res.success).toBe(true);
        expect(res.code).toMatch(/^[A-Z]{3}-\d{3}$/);

        const res2 = await service.generateMyCode();
        expect(res2.code).toBe(res.code);
    });

    test('should prevent binding to own pairing code', async () => {
        const { code } = await service.generateMyCode();
        const res = await service.bindPartner(code, '我自己');
        expect(res.success).toBe(false);
        expect(res.message).toContain('不能使用自己的配对码');
    });

    test('should sign 1v1 contract with initial bond EXP and log milestone, and block 3rd party', async () => {
        const bindRes = await service.bindPartner('PAIR-520', {
            myNickname: '阿泽',
            partnerNickname: '小鹿',
            petName: '糯米团'
        });

        expect(bindRes.success).toBe(true);
        expect(bindRes.status.paired).toBe(true);
        expect(bindRes.status.myNickname).toBe('阿泽');
        expect(bindRes.status.partnerNickname).toBe('小鹿');
        expect(bindRes.status.petName).toBe('糯米团');
        expect(bindRes.status.togetherDays).toBe(1);
        expect(bindRes.status.bond.exp).toBe(10);
        expect(bindRes.status.bond.level).toBe(1);
        expect(bindRes.status.bond.title).toBe('初识之约');
        expect(bindRes.status.logs.length).toBe(1);
        expect(bindRes.status.logs[0].actionType).toBe('contract');

        // Attempting to bind a second partner while already paired must be rejected
        const secondRes = await service.bindPartner('CAT-999', '第三者');
        expect(secondRes.success).toBe(false);
        expect(secondRes.message).toContain('不可同时共养多只');
    });

    test('should enforce anti-impulse unpair guard (reject casual click, require confirmation token)', async () => {
        await service.bindPartner('PAIR-520', '小鹿');
        expect(service.getStatus().paired).toBe(true);

        // 1. Casual call without token MUST fail
        const casualRes = await service.unpair();
        expect(casualRes.success).toBe(false);
        expect(casualRes.code).toBe('CONFIRM_REQUIRED');
        expect(service.getStatus().paired).toBe(true);

        // 2. Wrong token MUST fail
        const wrongRes = await service.unpair('随便填的');
        expect(wrongRes.success).toBe(false);
        expect(service.getStatus().paired).toBe(true);

        // 3. Explicit confirmation phrase '确认解契' succeeds
        const validRes = await service.unpair('确认解契');
        expect(validRes.success).toBe(true);
        expect(validRes.status.paired).toBe(false);
        expect(validRes.status.bond.exp).toBe(0);
    });

    test('should accumulate bond EXP, record care timeline logs, and level up bond tiers', async () => {
        await service.bindPartner('PAIR-520', {
            myNickname: '阿泽',
            partnerNickname: '小鹿',
            petName: 'Mochi'
        });

        const partnerEvents = [];
        service.onPartnerEvent((evt) => partnerEvents.push(evt));

        // Send feed (+5 EXP -> total 15 EXP)
        const feedRes = await service.sendInteraction('feed');
        expect(feedRes.success).toBe(true);
        expect(feedRes.status.bond.exp).toBe(15);
        expect(feedRes.status.logs[0].actionType).toBe('feed');

        // Advance timer by 3.5s to receive partner echo (+2~5 EXP)
        jest.advanceTimersByTime(3600);
        expect(partnerEvents.length).toBe(1);
        expect(service.getStatus().bond.exp).toBeGreaterThanOrEqual(17);
        expect(service.getStatus().logs.length).toBe(3); // contract + my feed + partner echo

        // Test bond level calculation for higher EXP
        const lv2 = service.calculateBondLevel(60);
        expect(lv2.level).toBe(2);
        expect(lv2.title).toBe('朝夕默契');

        const lv5 = service.calculateBondLevel(650);
        expect(lv5.level).toBe(5);
        expect(lv5.title).toBe('灵魂伴侣');
        expect(lv5.progressPercent).toBe(100);
    });
});
