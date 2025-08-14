module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/*.integration.test.ts'],
  collectCoverageFrom: [
    '../../apps/*/src/**/*.ts',
    '!../../apps/*/src/**/*.d.ts',
    '!../../apps/*/src/**/__tests__/**',
    '!../../apps/*/src/**/node_modules/**',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/setup.ts'],
  testTimeout: 120000,
  maxWorkers: 1, // Run tests sequentially to avoid conflicts
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  globalSetup: '<rootDir>/global-setup.ts',
  globalTeardown: '<rootDir>/global-teardown.ts',
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/test-results',
        outputName: 'integration-test-results.xml',
      },
    ],
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/test-results',
        filename: 'integration-test-report.html',
        expand: true,
      },
    ],
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../../$1',
  },
};