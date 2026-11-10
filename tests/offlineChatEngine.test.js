/**
 * Tests for OfflineChatEngine
 */

const { getOfflineReply, DIALOGUE_BANKS } = require('../src/services/OfflineChatEngine');

describe('OfflineChatEngine', () => {
    it('should return a non-empty greeting reply on "你好"', () => {
        const res = getOfflineReply('你好呀', 'mochi-v1');
        expect(res.success).toBe(true);
        expect(res.isOffline).toBe(true);
        expect(typeof res.message).toBe('string');
        expect(res.message.length).toBeGreaterThan(0);
    });

    it('should return tired-themed reply when user mentions "好累"', () => {
        const res = getOfflineReply('今天敲代码好累啊', 'mochi-v1');
        expect(res.success).toBe(true);
        expect(DIALOGUE_BANKS['mochi-v1'].tired).toContain(res.message.split('\n')[0]);
    });

    it('should adapt personality based on skinId (husky-v1)', () => {
        const res = getOfflineReply('在干嘛呢', 'husky-v1');
        expect(res.success).toBe(true);
        expect(res.message).toBeDefined();
    });

    it('should handle empty or whitespace inputs gracefully', () => {
        const res = getOfflineReply('', 'mochi-v1');
        expect(res.success).toBe(true);
        expect(res.message.length).toBeGreaterThan(0);
    });

    it('should fallback to mochi-v1 if skinId is unknown', () => {
        const res = getOfflineReply('你好', 'unknown-skin');
        expect(res.success).toBe(true);
        expect(res.message.length).toBeGreaterThan(0);
    });
});
