/**
 * Integration Test Setup
 * Configures the test environment for integration tests
 */

import { jest } from '@jest/globals';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test_user:test_password@localhost:5433/heaven_dolls_integration_test';
process.env.CMS_URL = process.env.CMS_URL || 'http://localhost:1338';
process.env.WEB_URL = process.env.WEB_URL || 'http://localhost:3001';
process.env.AUTOMATION_URL = process.env.AUTOMATION_URL || 'http://localhost:3002';
process.env.TRACKING_URL = process.env.TRACKING_URL || 'http://localhost:3003';

// Configure Jest globals
jest.setTimeout(120000);

// Global test setup
beforeAll(async () => {
  console.log('🚀 Starting Integration Test Suite');
  console.log('📊 Test Environment Configuration:');
  console.log(`   - Database: ${process.env.DATABASE_URL}`);
  console.log(`   - CMS: ${process.env.CMS_URL}`);
  console.log(`   - Web: ${process.env.WEB_URL}`);
  console.log(`   - Automation: ${process.env.AUTOMATION_URL}`);
  console.log(`   - Tracking: ${process.env.TRACKING_URL}`);
});

afterAll(async () => {
  console.log('✅ Integration Test Suite Completed');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});