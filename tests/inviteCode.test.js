/**
 * Basic tests for InviteCodeService
 */

const { InviteCodeService } = require('../src/services/InviteCodeService');

describe('InviteCodeService', () => {
    let service;

    beforeEach(() => {
        service = new InviteCodeService();
    });

    describe('verify', () => {
        test('should accept valid code "VIP-2024-CAT"', async () => {
            const result = await service.verify('VIP-2024-CAT');
            expect(result.valid).toBe(true);
            expect(result.vipLevel).toBe('pro');
        });

        test('should accept valid code "MOCHI-LOVE"', async () => {
            const result = await service.verify('MOCHI-LOVE');
            expect(result.valid).toBe(true);
        });

        test('should accept valid code "DESKMATE-PRO"', async () => {
            const result = await service.verify('DESKMATE-PRO');
            expect(result.valid).toBe(true);
        });

        test('should reject invalid code', async () => {
            const result = await service.verify('INVALID');
            expect(result.valid).toBe(false);
        });

        test('should be case insensitive', async () => {
            const result = await service.verify('vip-2024-cat');
            expect(result.valid).toBe(true);
        });

        test('should trim whitespace', async () => {
            const result = await service.verify('  VIP-2024-CAT  ');
            expect(result.valid).toBe(true);
        });

        test('should accept DEV-VIP- prefixed codes', async () => {
            const result = await service.verify('DEV-VIP-TEST');
            expect(result.valid).toBe(true);
        });

        test('should handle empty input', async () => {
            const result = await service.verify('');
            expect(result.valid).toBe(false);
        });
    });
});
