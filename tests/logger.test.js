const { logger } = require('../src/utils/logger');

describe('Logger Utility', () => {
    let consoleSpy;

    beforeEach(() => {
        // Mock window.deskmate global if checking browser env
        global.window = { deskmate: { isDev: true } };
        consoleSpy = {
            log: jest.spyOn(console, 'log').mockImplementation(),
            warn: jest.spyOn(console, 'warn').mockImplementation(),
            error: jest.spyOn(console, 'error').mockImplementation()
        };
    });

    afterEach(() => {
        jest.restoreAllMocks();
        delete global.window;
    });

    test('should log info in development', () => {
        // Force dev environment logic in test is tricky due to module caching
        // But our logger checks condition at runtime if we mock window
        logger.info('test info');
        expect(consoleSpy.log).toHaveBeenCalledWith('[INFO]', 'test info');
    });

    test('should log warn always', () => {
        logger.warn('test warn');
        expect(consoleSpy.warn).toHaveBeenCalledWith('[WARN]', 'test warn');
    });

    test('should log error always', () => {
        logger.error('test error');
        expect(consoleSpy.error).toHaveBeenCalledWith('[ERROR]', 'test error');
    });
});
