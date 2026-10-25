/**
 * Configuracion de Jest para las pruebas unitarias del backend (E10).
 * La cobertura se mide solo sobre los modulos criticos definidos en el E2 (seccion 2.5).
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
    collectCoverageFrom: [
        'src/services/auth.service.ts',
        'src/services/order.service.ts',
        'src/services/admin.service.ts',
        'src/middleware/auth.middleware.ts',
        'src/middleware/rbac.middleware.ts',
        'src/middleware/sessionStore.ts',
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'text-summary', 'lcov', 'json-summary'],
};
