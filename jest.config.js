/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    // Use ts-jest preset for TypeScript support
    preset: 'ts-jest',

    // Node environment for Electron main process tests
    testEnvironment: 'node',

    // Match both JS and TS test files
    testMatch: [
        '**/tests/**/*.test.js',
        '**/tests/**/*.test.ts',
        '**/__tests__/**/*.test.ts',
        '**/__tests__/**/*.test.js'
    ],

    // Transform TypeScript files
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: 'tsconfig.json',
            // Allow JS files to be processed
            isolatedModules: true
        }]
    },

    // Module file extensions
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

    // Path aliases (match tsconfig)
    moduleNameMapper: {
        '^@/core/(.*)$': '<rootDir>/src/core/$1',
        '^@/audio/(.*)$': '<rootDir>/src/audio/$1',
        '^@/types/(.*)$': '<rootDir>/src/types/$1'
    },

    // Coverage collection
    collectCoverageFrom: [
        'src/**/*.ts',
        'src/**/*.js',
        'config.js',
        '!src/renderer.js',   // Skip browser-only code
        '!src/settings.js',   // Skip browser-only code
        '!**/node_modules/**',
        '!**/__tests__/**'
    ],

    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],

    // Coverage thresholds (incremental - will increase as migration progresses)
    coverageThreshold: {
        global: {
            branches: 0,
            functions: 0,
            lines: 0,
            statements: 0
        },
        // New TypeScript modules must meet high standards
        './src/audio/**/*.ts': {
            branches: 70,
            functions: 80,
            lines: 80,
            statements: 80
        }
    },

    verbose: true,

    // Clear mocks between tests
    clearMocks: true,

    // Ignore patterns
    testPathIgnorePatterns: ['/node_modules/', '/dist/']
};
