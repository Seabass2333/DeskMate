const {
    validateApiKey,
    validateEmail,
    validateFeedback,
    validateInterval,
    validateInviteCode
} = require('../src/settings/validators');

describe('Settings Validators', () => {

    describe('validateApiKey', () => {
        test('should return false for empty or short keys', () => {
            expect(validateApiKey('')).toBe(false);
            expect(validateApiKey('123')).toBe(false);
            expect(validateApiKey(null)).toBe(false);
        });

        test('should return true for valid keys', () => {
            expect(validateApiKey('sk-1234567890')).toBe(true);
            expect(validateApiKey('valid-api-key')).toBe(true);
        });

        test('should validate OpenAI specific prefix', () => {
            expect(validateApiKey('sk-valid', 'openai')).toBe(true);
            expect(validateApiKey('invalid-prefix', 'openai')).toBe(false);
        });
    });

    describe('validateEmail', () => {
        test('should validate correct email formats', () => {
            expect(validateEmail('test@example.com')).toBe(true);
            expect(validateEmail('user.name@domain.co.uk')).toBe(true);
        });

        test('should reject invalid email formats', () => {
            expect(validateEmail('invalid-email')).toBe(false);
            expect(validateEmail('@domain.com')).toBe(false);
            expect(validateEmail('user@')).toBe(false);
            expect(validateEmail('')).toBe(false);
        });
    });

    describe('validateFeedback', () => {
        test('should validate content length', () => {
            expect(validateFeedback('Short', 10)).toBe(false);
            expect(validateFeedback('This is long enough', 10)).toBe(true);
        });

        test('should use default min length of 10', () => {
            expect(validateFeedback('Too short')).toBe(false); // 9 chars
            expect(validateFeedback('Ten chars.')).toBe(true); // 10 chars
        });
    });

    describe('validateInterval', () => {
        test('should validate numeric ranges', () => {
            expect(validateInterval(30, 1, 60)).toBe(true);
            expect(validateInterval('30', 1, 60)).toBe(true); // string number
        });

        test('should reject out of range values', () => {
            expect(validateInterval(0, 1, 60)).toBe(false);
            expect(validateInterval(61, 1, 60)).toBe(false);
        });

        test('should reject non-numeric values', () => {
            expect(validateInterval('abc')).toBe(false);
        });
    });

    describe('validateInviteCode', () => {
        test('should accept 6 digit codes', () => {
            expect(validateInviteCode('123456')).toBe(true);
            expect(validateInviteCode('000000')).toBe(true);
        });

        test('should reject invalid codes', () => {
            expect(validateInviteCode('12345')).toBe(false); // too short
            expect(validateInviteCode('1234567')).toBe(false); // too long
            expect(validateInviteCode('123abc')).toBe(false); // non-numeric
            expect(validateInviteCode('')).toBe(false);
        });
    });

});
