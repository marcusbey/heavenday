/**
 * Performance Integration Tests
 * Tests system performance under load, concurrent operations, and stress conditions
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';
import { performance } from 'perf_hooks';

const CMS_URL = process.env.CMS_URL || 'http://localhost:1338';
const WEB_URL = process.env.WEB_URL || 'http://localhost:3001';
const TRACKING_URL = process.env.TRACKING_URL || 'http://localhost:3003';
const TEST_TIMEOUT = 60000;

describe('Performance Integration Tests', () => {
  let cmsClient: AxiosInstance;
  let webClient: AxiosInstance;
  let trackingClient: AxiosInstance;
  let adminToken: string;

  beforeAll(async () => {
    cmsClient = axios.create({ baseURL: CMS_URL, timeout: TEST_TIMEOUT });
    webClient = axios.create({ baseURL: WEB_URL, timeout: TEST_TIMEOUT });
    trackingClient = axios.create({ baseURL: TRACKING_URL, timeout: TEST_TIMEOUT });

    // Authenticate
    const authResponse = await cmsClient.post('/api/auth/local', {
      identifier: 'admin@example.com',
      password: 'adminpassword123',
    });
    adminToken = authResponse.data.jwt;
  }, 60000);

  afterAll(async () => {
    // Cleanup any test data
  });

  describe('Load Testing', () => {
    it('should handle high concurrent API requests', async () => {
      const concurrentRequests = 100;
      const startTime = performance.now();

      const requests = Array.from({ length: concurrentRequests }, () =>
        webClient.get('/api/products', { params: { limit: 10 } })
      );

      const results = await Promise.allSettled(requests);
      const endTime = performance.now();

      const successfulRequests = results.filter(r => r.status === 'fulfilled').length;
      const averageResponseTime = (endTime - startTime) / concurrentRequests;

      expect(successfulRequests).toBeGreaterThan(concurrentRequests * 0.95); // 95% success rate
      expect(averageResponseTime).toBeLessThan(1000); // Under 1 second average
    });

    it('should maintain database performance under load', async () => {
      const concurrentDbOperations = 50;
      const startTime = performance.now();

      const operations = Array.from({ length: concurrentDbOperations }, (_, i) => {
        if (i % 3 === 0) {
          return cmsClient.get('/api/products?populate=*', {
            headers: { Authorization: `Bearer ${adminToken}` },
          });
        } else if (i % 3 === 1) {
          return cmsClient.get('/api/categories', {
            headers: { Authorization: `Bearer ${adminToken}` },
          });
        } else {
          return trackingClient.get('/api/analytics/summary');
        }
      });

      const results = await Promise.allSettled(operations);
      const endTime = performance.now();

      const successfulOps = results.filter(r => r.status === 'fulfilled').length;
      const totalTime = endTime - startTime;

      expect(successfulOps).toBeGreaterThan(concurrentDbOperations * 0.9);
      expect(totalTime).toBeLessThan(10000); // Under 10 seconds total
    });

    it('should handle memory-intensive operations efficiently', async () => {
      const largeDataRequests = Array.from({ length: 20 }, () =>
        cmsClient.get('/api/products?populate=*&pagination[limit]=100', {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );

      const startTime = performance.now();
      const results = await Promise.all(largeDataRequests);
      const endTime = performance.now();

      results.forEach(result => {
        expect(result.status).toBe(200);
        expect(Array.isArray(result.data.data)).toBe(true);
      });

      expect(endTime - startTime).toBeLessThan(15000); // Under 15 seconds
    });
  });

  describe('Stress Testing', () => {
    it('should handle system stress gracefully', async () => {
      const stressTestDuration = 30000; // 30 seconds
      const requestInterval = 100; // Every 100ms
      const startTime = Date.now();
      const results: any[] = [];

      while (Date.now() - startTime < stressTestDuration) {
        const requestPromise = webClient.get('/api/health')
          .then(response => ({ success: true, status: response.status }))
          .catch(error => ({ success: false, error: error.message }));

        results.push(requestPromise);
        await new Promise(resolve => setTimeout(resolve, requestInterval));
      }

      const resolvedResults = await Promise.all(results);
      const successRate = resolvedResults.filter(r => r.success).length / resolvedResults.length;

      expect(successRate).toBeGreaterThan(0.8); // 80% success rate under stress
      expect(resolvedResults.length).toBeGreaterThan(200); // Processed many requests
    });
  });
});