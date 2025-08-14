const baseConfig = require('../../jest.config.base');

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  displayName: '@heaven-dolls/cms',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testMatch: [
    '<rootDir>/tests/**/*.test.{js,ts}',
    '<rootDir>/src/**/*.test.{js,ts}'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.tmp/',
    '/dist/',
    '/build/',
    '/.cache/'
  ],
  collectCoverageFrom: [
    'src/api/**/*.{js,ts}',
    'src/extensions/**/*.{js,ts}',
    'src/plugins/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!src/**/index.{js,ts}',
    '!src/**/*.test.{js,ts}'
  ],
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  globals: {
    strapi: true
  }
};