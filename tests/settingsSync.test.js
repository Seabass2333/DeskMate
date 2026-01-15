/**
 * SettingsSyncService Unit Tests
 */

// Mock SupabaseClient
jest.mock('../src/services/SupabaseClient', () => ({
    isConfigured: jest.fn(),
    rpc: jest.fn()
}));

// Mock DeviceIdService
jest.mock('../src/services/DeviceIdService', () => ({
    getDeviceId: jest.fn(() => 'test-device-123')
}));

const { isConfigured, rpc } = require('../src/services/SupabaseClient');
const { SettingsSyncService, SYNC_KEYS } = require('../src/services/SettingsSyncService');

describe('SettingsSyncService', () => {
    let service;

    beforeEach(() => {
        jest.clearAllMocks();
        isConfigured.mockReturnValue(true);
        service = new SettingsSyncService();
    });

    describe('saveSetting', () => {
        test('should save setting successfully', async () => {
            rpc.mockResolvedValue({ success: true });

            const result = await service.saveSetting(SYNC_KEYS.SKIN, 'pochi-v1');

            expect(rpc).toHaveBeenCalledWith('save_user_setting', {
                p_device_id: 'test-device-123',
                p_key: 'skin',
                p_value: '"pochi-v1"'
            });
            expect(result.success).toBe(true);
        });

        test('should return error when not configured', async () => {
            isConfigured.mockReturnValue(false);
            const disabledService = new SettingsSyncService();

            const result = await disabledService.saveSetting(SYNC_KEYS.SKIN, 'pochi-v1');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Cloud sync not configured');
            expect(rpc).not.toHaveBeenCalled();
        });

        test('should handle RPC errors', async () => {
            rpc.mockRejectedValue(new Error('Network error'));

            const result = await service.saveSetting(SYNC_KEYS.SKIN, 'pochi-v1');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Network error');
        });
    });

    describe('getSettings', () => {
        test('should retrieve and parse settings', async () => {
            rpc.mockResolvedValue({
                success: true,
                settings: {
                    skin: '"pochi-v1"',
                    pomodoro: '{"duration":25}'
                }
            });

            const result = await service.getSettings();

            expect(result.success).toBe(true);
            expect(result.settings.skin).toBe('pochi-v1');
            expect(result.settings.pomodoro).toEqual({ duration: 25 });
        });

        test('should return empty settings when not configured', async () => {
            isConfigured.mockReturnValue(false);
            const disabledService = new SettingsSyncService();

            const result = await disabledService.getSettings();

            expect(result.success).toBe(false);
            expect(result.settings).toEqual({});
        });

        test('should handle invalid JSON gracefully', async () => {
            rpc.mockResolvedValue({
                success: true,
                settings: {
                    skin: 'not-json-just-string',
                    language: '"zh-CN"'
                }
            });

            const result = await service.getSettings();

            expect(result.success).toBe(true);
            expect(result.settings.skin).toBe('not-json-just-string');
            expect(result.settings.language).toBe('zh-CN');
        });
    });

    describe('syncToCloud', () => {
        test('should sync multiple settings', async () => {
            rpc.mockResolvedValue({ success: true });

            const results = await service.syncToCloud({
                [SYNC_KEYS.SKIN]: 'mochi-v1',
                [SYNC_KEYS.LANGUAGE]: 'en'
            });

            expect(rpc).toHaveBeenCalledTimes(2);
            expect(results[SYNC_KEYS.SKIN].success).toBe(true);
            expect(results[SYNC_KEYS.LANGUAGE].success).toBe(true);
        });

        test('should ignore unknown keys', async () => {
            rpc.mockResolvedValue({ success: true });

            const results = await service.syncToCloud({
                [SYNC_KEYS.SKIN]: 'mochi-v1',
                unknownKey: 'should-be-ignored'
            });

            expect(rpc).toHaveBeenCalledTimes(1);
            expect(results.unknownKey).toBeUndefined();
        });
    });

    describe('applyFromCloud', () => {
        test('should apply settings to store', async () => {
            rpc.mockResolvedValue({
                success: true,
                settings: {
                    skin: '"pochi-v1"',
                    pomodoro: '{"duration":30}',
                    language: '"ja"'
                }
            });

            const mockStore = {
                set: jest.fn()
            };

            const result = await service.applyFromCloud(mockStore);

            expect(result.applied).toBe(true);
            expect(result.keys).toContain('skin');
            expect(result.keys).toContain('pomodoro');
            expect(result.keys).toContain('language');
            expect(mockStore.set).toHaveBeenCalledWith('skin', 'pochi-v1');
            expect(mockStore.set).toHaveBeenCalledWith('pomodoro', { duration: 30 });
            expect(mockStore.set).toHaveBeenCalledWith('language', 'ja');
        });

        test('should return not applied when fetch fails', async () => {
            rpc.mockRejectedValue(new Error('Network error'));

            const mockStore = { set: jest.fn() };

            const result = await service.applyFromCloud(mockStore);

            expect(result.applied).toBe(false);
            expect(mockStore.set).not.toHaveBeenCalled();
        });
    });
});
