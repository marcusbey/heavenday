import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Enhanced Playwright Configuration for Heaven-Dolls E2E Testing
 * 
 * Features:
 * - Cross-browser testing (Chrome, Firefox, Safari, Edge)
 * - Mobile device testing with touch interactions
 * - Performance monitoring with Core Web Vitals
 * - Visual regression testing
 * - Accessibility testing integration
 * - Parallel execution with load balancing
 * - Enhanced reporting and debugging
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 1, // Increased retries for stability
  workers: process.env.CI ? 4 : undefined, // Optimized for CI parallelization
  
  // Enhanced reporting with multiple formats
  reporter: [
    ['html', { 
      open: 'never',
      outputFolder: 'test-results/html-report'
    }],
    ['json', { 
      outputFile: 'test-results/results.json' 
    }],
    ['junit', { 
      outputFile: 'test-results/results.xml' 
    }],
    ['github'], // GitHub Actions integration
    ['list'], // Console output
    // Custom performance reporter
    ['./utils/performance-reporter.ts'],
  ],
  
  // Global test configuration
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure', // Enhanced trace collection
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000, // Increased for stability
    navigationTimeout: 45000, // Increased for slow networks
    
    // Performance and reliability settings
    ignoreHTTPSErrors: true,
    bypassCSP: false,
    
    // Custom context options
    contextOptions: {
      permissions: ['geolocation', 'notifications'],
      geolocation: { longitude: 12.492507, latitude: 41.889938 },
      colorScheme: 'light',
      reducedMotion: 'reduce',
    },
    
    // Enhanced debugging
    launchOptions: {
      slowMo: process.env.CI ? 0 : 100,
      devtools: !process.env.CI,
    },
  },
  
  expect: {
    timeout: 15000, // Increased expect timeout
    toHaveScreenshot: {
      threshold: 0.2,
      mode: 'strict',
    },
  },
  
  timeout: 120000, // Increased global timeout for complex flows

  projects: [
    // Global Setup - Data seeding, authentication, etc.
    {
      name: 'global-setup',
      testMatch: /global\.setup\.ts/,
      teardown: 'global-teardown',
    },
    {
      name: 'global-teardown', 
      testMatch: /global\.teardown\.ts/,
    },
    
    // Authentication setup
    {
      name: 'auth-setup',
      testMatch: /.*\.setup\.ts/,
      dependencies: ['global-setup'],
    },
    
    // Desktop Browsers - Core functionality testing
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
        contextOptions: {
          viewport: { width: 1920, height: 1080 },
        },
      },
      dependencies: ['auth-setup'],
      testMatch: /(?!.*\.(mobile|tablet|api)\.).*\.spec\.ts/,
    },
    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        storageState: 'playwright/.auth/user.json',
        contextOptions: {
          viewport: { width: 1920, height: 1080 },
        },
      },
      dependencies: ['auth-setup'],
      testMatch: /(?!.*\.(mobile|tablet|api)\.).*\.spec\.ts/,
    },
    {
      name: 'webkit-desktop',
      use: { 
        ...devices['Desktop Safari'],
        storageState: 'playwright/.auth/user.json',
        contextOptions: {
          viewport: { width: 1920, height: 1080 },
        },
      },
      dependencies: ['auth-setup'],
      testMatch: /(?!.*\.(mobile|tablet|api)\.).*\.spec\.ts/,
    },
    {
      name: 'edge-desktop',
      use: { 
        ...devices['Desktop Edge'],
        storageState: 'playwright/.auth/user.json',
        contextOptions: {
          viewport: { width: 1920, height: 1080 },
        },
      },
      dependencies: ['auth-setup'],
      testMatch: /(?!.*\.(mobile|tablet|api)\.).*\.spec\.ts/,
    },

    // Tablet Testing
    {
      name: 'tablet-ipad',
      use: { 
        ...devices['iPad Pro'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['auth-setup'],
      testMatch: /.*\.(tablet|mobile)\.spec\.ts/,
    },
    {
      name: 'tablet-android',
      use: { 
        ...devices['Galaxy Tab S4'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['auth-setup'],
      testMatch: /.*\.(tablet|mobile)\.spec\.ts/,
    },

    // Mobile Testing - Touch interactions and responsive
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 7'],
        storageState: 'playwright/.auth/user.json',
        hasTouch: true,
        isMobile: true,
      },
      dependencies: ['auth-setup'],
      testMatch: /.*\.mobile\.spec\.ts/,
    },
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 14 Pro'],
        storageState: 'playwright/.auth/user.json',
        hasTouch: true,
        isMobile: true,
      },
      dependencies: ['auth-setup'],
      testMatch: /.*\.mobile\.spec\.ts/,
    },
    {
      name: 'mobile-samsung',
      use: { 
        ...devices['Galaxy S9+'],
        storageState: 'playwright/.auth/user.json',
        hasTouch: true,
        isMobile: true,
      },
      dependencies: ['auth-setup'],
      testMatch: /.*\.mobile\.spec\.ts/,
    },

    // Performance Testing - Lighthouse integration
    {
      name: 'performance',
      use: {
        ...devices['Desktop Chrome'],
        contextOptions: {
          viewport: { width: 1920, height: 1080 },
        },
      },
      testMatch: /.*\.performance\.spec\.ts/,
      dependencies: ['auth-setup'],
    },

    // Visual Regression Testing
    {
      name: 'visual-regression',
      use: {
        ...devices['Desktop Chrome'],
        contextOptions: {
          viewport: { width: 1920, height: 1080 },
        },
      },
      testMatch: /.*\.visual\.spec\.ts/,
      dependencies: ['auth-setup'],
    },

    // Accessibility Testing
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
        contextOptions: {
          viewport: { width: 1920, height: 1080 },
          reducedMotion: 'reduce',
          forcedColors: 'none',
          colorScheme: 'light',
        },
      },
      testMatch: /.*\.accessibility\.spec\.ts/,
      dependencies: ['auth-setup'],
    },

    // API and Integration Tests
    {
      name: 'api-tests',
      testMatch: /.*\.api\.spec\.ts/,
      use: {
        baseURL: process.env.API_BASE_URL || 'http://localhost:1337/api',
        extraHTTPHeaders: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      },
      dependencies: ['global-setup'],
    },

    // Load Testing
    {
      name: 'load-testing',
      testMatch: /.*\.load\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
      fullyParallel: true,
      workers: 8,
      dependencies: ['auth-setup'],
    },

    // Error Scenario Testing
    {
      name: 'error-scenarios',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      testMatch: /.*\.error\.spec\.ts/,
      dependencies: ['auth-setup'],
    },
  ],

  // Enhanced web server configuration
  webServer: [
    {
      command: 'cd apps/web && npm run build && npm run start',
      url: process.env.BASE_URL || 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 180 * 1000,
      env: {
        NODE_ENV: 'test',
        PORT: '3000',
      },
    },
    {
      command: 'cd apps/cms && npm run build && npm run start',
      url: process.env.API_BASE_URL || 'http://localhost:1337',
      reuseExistingServer: !process.env.CI,
      timeout: 180 * 1000,
      env: {
        NODE_ENV: 'test',
        PORT: '1337',
        DATABASE_URL: process.env.TEST_DATABASE_URL,
      },
    },
  ],
  
  // Global test metadata
  metadata: {
    'testEnvironment': 'Heaven-Dolls E2E Testing Suite',
    'version': process.env.npm_package_version || '1.0.0',
    'baseURL': process.env.BASE_URL || 'http://localhost:3000',
    'browser-coverage': 'Chrome, Firefox, Safari, Edge',
    'mobile-coverage': 'iOS Safari, Android Chrome, Samsung Internet',
    'features': [
      'Cross-browser compatibility',
      'Mobile responsive testing',
      'Performance monitoring',
      'Visual regression testing',
      'Accessibility compliance',
      'Error scenario handling',
    ],
  },
});