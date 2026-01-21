/**
 * DeskMate Logger Utility
 * Unified logging with environment-aware output
 */

// Check if running in production (packaged Electron app)
const isProduction = typeof process !== 'undefined' && 
    process.type === 'renderer' ? 
    !window.deskmate?.isDev : 
    (process.env.NODE_ENV === 'production' || 
     (typeof require !== 'undefined' && require('electron')?.app?.isPackaged));

/**
 * Logger with environment-aware output
 * In production: only warn and error are logged
 * In development: all levels are logged
 */
const logger = {
    /**
     * Log informational message (dev only)
     * @param {...any} args - Arguments to log
     */
    info: (...args) => {
        if (!isProduction) {
            console.log('[INFO]', ...args);
        }
    },

    /**
     * Log warning message (always)
     * @param {...any} args - Arguments to log
     */
    warn: (...args) => {
        console.warn('[WARN]', ...args);
    },

    /**
     * Log error message (always)
     * @param {...any} args - Arguments to log
     */
    error: (...args) => {
        console.error('[ERROR]', ...args);
    },

    /**
     * Log debug message (dev only)
     * @param {...any} args - Arguments to log
     */
    debug: (...args) => {
        if (!isProduction) {
            console.log('[DEBUG]', ...args);
        }
    },

    /**
     * Log with custom tag (dev only)
     * @param {string} tag - Custom tag
     * @param {...any} args - Arguments to log
     */
    tag: (tag, ...args) => {
        if (!isProduction) {
            console.log(`[${tag}]`, ...args);
        }
    }
};

// Export for CommonJS (Node.js/Electron main process)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { logger };
}

// Export for browser (renderer process)
if (typeof window !== 'undefined') {
    window.logger = logger;
}
