/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'automation',
      testMatch: ['<rootDir>/apps/automation/tests/**/*.test.ts'],
      collectCoverageFrom: [
        'apps/automation/src/**/*.ts',
        '!apps/automation/src/**/*.d.ts',
        '!apps/automation/src/**/index.ts',
      ],
      coverageDirectory: 'coverage/automation',
      coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
    },
    {
      displayName: 'web',
      testMatch: ['<rootDir>/apps/web/**/*.test.{ts,tsx}'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/apps/web/tests/setup.ts'],
      collectCoverageFrom: [
        'apps/web/app/**/*.{ts,tsx}',
        'apps/web/components/**/*.{ts,tsx}',
        'apps/web/hooks/**/*.{ts,tsx}',
        'apps/web/lib/**/*.{ts,tsx}',
        'apps/web/providers/**/*.{ts,tsx}',
        '!apps/web/**/*.d.ts',
        '!apps/web/**/*.stories.{ts,tsx}',
      ],
      coverageDirectory: 'coverage/web',
      coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
    },
    {
      displayName: 'cms',
      testMatch: ['<rootDir>/apps/cms/tests/**/*.test.ts'],
      collectCoverageFrom: [
        'apps/cms/src/**/*.ts',
        '!apps/cms/src/**/*.d.ts',
        '!apps/cms/src/**/index.ts',
      ],
      coverageDirectory: 'coverage/cms',
      coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
    },
    {
      displayName: 'tracking',
      testMatch: ['<rootDir>/apps/tracking/src/**/*.test.ts'],
      collectCoverageFrom: [
        'apps/tracking/src/**/*.ts',
        '!apps/tracking/src/**/*.d.ts',
        '!apps/tracking/src/**/index.ts',
      ],
      coverageDirectory: 'coverage/tracking',
      coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
    },
  ],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text-summary', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './apps/automation/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './apps/web/': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
    './apps/cms/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './apps/tracking/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
};