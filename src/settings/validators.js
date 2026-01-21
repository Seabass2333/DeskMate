/**
 * DeskMate Settings Validators
 * Reusable validation logic for settings forms
 */

/**
 * Validate API Key format
 * @param {string} key - The API key string
 * @param {string} provider - The provider ID (optional)
 * @returns {boolean} True if valid
 */
function validateApiKey(key, provider = '') {
    if (!key || typeof key !== 'string') return false;
    const trimmed = key.trim();
    if (trimmed.length < 5) return false;

    // Provider specific checks could go here
    if (provider === 'openai' && !trimmed.startsWith('sk-')) return false;

    return true;
}

/**
 * Validate Email format
 * @param {string} email - The email address
 * @returns {boolean} True if valid format
 */
function validateEmail(email) {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate Feedback content
 * @param {string} content - The feedback content
 * @param {number} minLength - Minimum required length (default 10)
 * @returns {boolean} True if valid
 */
function validateFeedback(content, minLength = 10) {
    if (!content || typeof content !== 'string') return false;
    return content.trim().length >= minLength;
}

/**
 * Validate numeric interval input
 * @param {number|string} value - The input value
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {boolean} True if within range
 */
function validateInterval(value, min = 1, max = 120) {
    const num = Number(value);
    if (isNaN(num)) return false;
    return num >= min && num <= max;
}

/**
 * Validate Invite Code format (6 digits)
 * @param {string} code - The invite code
 * @returns {boolean} True if valid format
 */
function validateInviteCode(code) {
    if (!code) return false;
    return /^\d{6}$/.test(code.trim());
}

// Expose for browser environment
if (typeof window !== 'undefined') {
    window.SettingsValidators = {
        validateApiKey,
        validateEmail,
        validateFeedback,
        validateInterval,
        validateInviteCode
    };
}

// Export for CommonJS (Node/Jest/Electron)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateApiKey,
        validateEmail,
        validateFeedback,
        validateInterval,
        validateInviteCode
    };
}
