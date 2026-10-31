/**
 * Configuracion de Jest para las pruebas unitarias del backend (E10).
 */
module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    testMatch: ['**/*.test.ts'],
    transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
    },
    setupFiles: ['<rootDir>/tests/helpers/env.ts'],
    clearMocks: true,
    // Se mide todo el codigo con logica; el informe del E10 se enfoca en los modulos criticos del E2.
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/seeds/**',
        '!src/scripts/**',
        '!src/migrations/**',
        '!src/config/**',
        '!src/entities/**',
        '!src/index.ts',
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'text-summary', 'lcov', 'json-summary'],
};
