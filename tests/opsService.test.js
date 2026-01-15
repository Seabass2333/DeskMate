/**
 * OpsService Unit Tests
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
const { OpsService } = require('../src/services/OpsService');

describe('OpsService', () => {
    let service;

    beforeEach(() => {
        jest.clearAllMocks();
        isConfigured.mockReturnValue(true);
        service = new OpsService();
    });

    describe('getAnnouncements', () => {
        test('should fetch announcements successfully', async () => {
            const mockAnnouncements = [
                { id: '1', title: 'Update Available', content: 'v1.4 is here!', type: 'update' }
            ];
            rpc.mockResolvedValue({ success: true, announcements: mockAnnouncements });

            const result = await service.getAnnouncements();

            expect(rpc).toHaveBeenCalledWith('get_announcements', { p_version: expect.any(String) });
            expect(result.success).toBe(true);
            expect(result.announcements).toEqual(mockAnnouncements);
        });

        test('should return empty array when not configured', async () => {
            isConfigured.mockReturnValue(false);
            const disabledService = new OpsService();

            const result = await disabledService.getAnnouncements();

            expect(result.success).toBe(false);
            expect(result.announcements).toEqual([]);
            expect(rpc).not.toHaveBeenCalled();
        });

        test('should handle RPC errors gracefully', async () => {
            rpc.mockRejectedValue(new Error('Network error'));

            const result = await service.getAnnouncements();

            expect(result.success).toBe(false);
            expect(result.announcements).toEqual([]);
        });

        test('should cache announcements', async () => {
            const mockAnnouncements = [{ id: '1', title: 'Test' }];
            rpc.mockResolvedValue({ success: true, announcements: mockAnnouncements });

            await service.getAnnouncements();
            const cached = service.getCachedAnnouncements();

            expect(cached).toEqual(mockAnnouncements);
        });
    });

    describe('submitFeedback', () => {
        test('should submit feedback successfully', async () => {
            rpc.mockResolvedValue({ success: true, message: 'Feedback submitted' });

            const result = await service.submitFeedback({
                category: 'bug',
                content: 'This is a detailed bug report with enough characters.',
                email: 'user@example.com'
            });

            expect(rpc).toHaveBeenCalledWith('submit_feedback', {
                p_device_id: 'test-device-123',
                p_category: 'bug',
                p_content: 'This is a detailed bug report with enough characters.',
                p_email: 'user@example.com',
                p_app_version: expect.any(String)
            });
            expect(result.success).toBe(true);
        });

        test('should reject empty category', async () => {
            const result = await service.submitFeedback({
                category: '',
                content: 'Some content here'
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Category and content are required');
            expect(rpc).not.toHaveBeenCalled();
        });

        test('should reject empty content', async () => {
            const result = await service.submitFeedback({
                category: 'bug',
                content: ''
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Category and content are required');
        });

        test('should reject content too short', async () => {
            const result = await service.submitFeedback({
                category: 'bug',
                content: 'Too short'
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Feedback too short (min 10 characters)');
        });

        test('should reject content too long', async () => {
            const longContent = 'x'.repeat(2001);
            const result = await service.submitFeedback({
                category: 'bug',
                content: longContent
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Feedback too long (max 2000 characters)');
        });

        test('should handle RPC errors', async () => {
            rpc.mockRejectedValue(new Error('Server error'));

            const result = await service.submitFeedback({
                category: 'feature',
                content: 'I would like to request a feature for...'
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Server error');
        });
    });

    describe('isValidCategory', () => {
        test('should accept valid categories', () => {
            expect(service.isValidCategory('bug')).toBe(true);
            expect(service.isValidCategory('feature')).toBe(true);
            expect(service.isValidCategory('question')).toBe(true);
            expect(service.isValidCategory('other')).toBe(true);
        });

        test('should reject invalid categories', () => {
            expect(service.isValidCategory('invalid')).toBe(false);
            expect(service.isValidCategory('')).toBe(false);
            expect(service.isValidCategory(null)).toBe(false);
        });
    });
});
