/**
 * Global Teardown for Integration Tests
 * Cleans up test environment and stops services
 */

import { execSync } from 'child_process';

export default async function globalTeardown() {
  console.log('🧹 Cleaning up integration test environment...');

  try {
    // Stop and remove Docker Compose services
    console.log('🛑 Stopping Docker services...');
    execSync('docker-compose -f docker-compose.integration.yml down -v', {
      stdio: 'inherit',
      timeout: 60000, // 1 minute timeout
    });

    // Clean up any remaining containers
    console.log('🗑️ Cleaning up containers...');
    try {
      execSync('docker system prune -f --filter "label=com.docker.compose.project=heaven-dolls-integration"', {
        stdio: 'pipe',
        timeout: 30000,
      });
    } catch (error) {
      // Ignore cleanup errors
      console.warn('⚠️ Container cleanup warning:', error.message);
    }

    console.log('✅ Integration test environment cleaned up');
  } catch (error) {
    console.error('❌ Failed to cleanup integration test environment:', error);
    // Don't throw error to avoid test failure on cleanup issues
  }
}