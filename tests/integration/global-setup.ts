/**
 * Global Setup for Integration Tests
 * Starts services and prepares test environment
 */

import { execSync } from 'child_process';
import axios from 'axios';

export default async function globalSetup() {
  console.log('🔧 Setting up integration test environment...');

  try {
    // Start Docker Compose services
    console.log('📦 Starting Docker services...');
    execSync('docker-compose -f docker-compose.integration.yml up -d', {
      stdio: 'inherit',
      timeout: 180000, // 3 minutes timeout
    });

    // Wait for services to be ready
    console.log('⏳ Waiting for services to be ready...');
    await waitForServices();

    console.log('✅ Integration test environment ready');
  } catch (error) {
    console.error('❌ Failed to setup integration test environment:', error);
    throw error;
  }
}

async function waitForServices(): Promise<void> {
  const services = [
    { name: 'PostgreSQL', url: 'http://localhost:5433', healthCheck: checkPostgres },
    { name: 'Redis', url: 'http://localhost:6380', healthCheck: checkRedis },
    { name: 'CMS', url: 'http://localhost:1338', path: '/_health' },
    { name: 'Web', url: 'http://localhost:3001', path: '/api/health' },
    { name: 'Tracking', url: 'http://localhost:3003', path: '/health' },
    { name: 'MinIO', url: 'http://localhost:9000', path: '/minio/health/live' },
  ];

  const maxAttempts = 60; // 5 minutes total
  const delay = 5000; // 5 seconds between attempts

  for (const service of services) {
    console.log(`⏳ Waiting for ${service.name}...`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (service.healthCheck) {
          await service.healthCheck();
        } else {
          await axios.get(`${service.url}${service.path}`, { timeout: 5000 });
        }
        
        console.log(`✅ ${service.name} is ready`);
        break;
      } catch (error) {
        if (attempt === maxAttempts) {
          throw new Error(`${service.name} failed to start after ${maxAttempts} attempts`);
        }
        
        if (attempt % 6 === 0) { // Log every 30 seconds
          console.log(`⏳ ${service.name} not ready (attempt ${attempt}/${maxAttempts})`);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

async function checkPostgres(): Promise<void> {
  const { execSync } = require('child_process');
  
  try {
    execSync(
      'docker exec -i heaven-dolls-integration-postgres-integration-1 pg_isready -U test_user -d heaven_dolls_integration_test',
      { stdio: 'pipe', timeout: 5000 }
    );
  } catch (error) {
    throw new Error('PostgreSQL not ready');
  }
}

async function checkRedis(): Promise<void> {
  const { execSync } = require('child_process');
  
  try {
    execSync(
      'docker exec -i heaven-dolls-integration-redis-integration-1 redis-cli ping',
      { stdio: 'pipe', timeout: 5000 }
    );
  } catch (error) {
    throw new Error('Redis not ready');
  }
}