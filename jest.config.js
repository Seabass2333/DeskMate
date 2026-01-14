module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    collectCoverageFrom: [
        'src/**/*.js',
        'config.js',
        '!src/renderer.js',  // Skip browser-only code
        '!**/node_modules/**'
    ],
    coverageDirectory: 'coverage',
    verbose: true
};
