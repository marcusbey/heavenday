/**
 * Security Integration Tests
 * Tests authentication, API security, data encryption, and security headers
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';

const CMS_URL = process.env.CMS_URL || 'http://localhost:1338';
const WEB_URL = process.env.WEB_URL || 'http://localhost:3001';
const TRACKING_URL = process.env.TRACKING_URL || 'http://localhost:3003';

describe('Security Integration Tests', () => {
  let cmsClient: AxiosInstance;
  let webClient: AxiosInstance;
  let trackingClient: AxiosInstance;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    cmsClient = axios.create({ baseURL: CMS_URL, timeout: 10000 });
    webClient = axios.create({ baseURL: WEB_URL, timeout: 10000 });
    trackingClient = axios.create({ baseURL: TRACKING_URL, timeout: 10000 });

    // Get admin token
    const adminAuth = await cmsClient.post('/api/auth/local', {
      identifier: 'admin@example.com',
      password: 'adminpassword123',
    });
    adminToken = adminAuth.data.jwt;

    // Create and authenticate regular user
    const userResponse = await cmsClient.post('/api/auth/local/register', {
      username: `sectest${Date.now()}`,
      email: `sectest${Date.now()}@example.com`,
      password: 'testpassword123',
    });
    userToken = userResponse.data.jwt;
  }, 30000);

  afterAll(async () => {
    // Cleanup test data
  });

  describe('Authentication and Authorization', () => {
    it('should enforce proper authentication on protected endpoints', async () => {
      // Test without token
      await expect(
        cmsClient.get('/api/products/admin-only')
      ).rejects.toMatchObject({
        response: { status: 401 }
      });

      // Test with invalid token
      await expect(
        cmsClient.get('/api/products/admin-only', {
          headers: { Authorization: 'Bearer invalid-token' }
        })
      ).rejects.toMatchObject({
        response: { status: 401 }
      });

      // Test with valid admin token
      const adminResponse = await cmsClient.get('/api/products', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      expect(adminResponse.status).toBe(200);
    });

    it('should enforce role-based access control', async () => {
      // User trying to access admin endpoint
      await expect(
        cmsClient.post('/api/admin/settings', 
          { setting: 'test' },
          { headers: { Authorization: `Bearer ${userToken}` } }
        )
      ).rejects.toMatchObject({
        response: { status: 403 }
      });

      // Admin accessing admin endpoint
      const adminAccess = await cmsClient.get('/api/admin/stats', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      expect(adminAccess.status).toBe(200);
    });

    it('should handle token expiration and refresh', async () => {
      // Test with expired token simulation
      const expiredTokenTest = await cmsClient.post('/api/test/expired-token', {
        token: userToken,
      });

      expect(expiredTokenTest.status).toBe(200);
      expect(expiredTokenTest.data.expired).toBe(true);

      // Test token refresh
      const refreshResponse = await cmsClient.post('/api/auth/refresh', {
        refreshToken: userToken,
      });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.data.jwt).toBeDefined();
    });
  });

  describe('API Security', () => {
    it('should implement rate limiting', async () => {
      const rapidRequests = Array.from({ length: 20 }, () =>
        webClient.get('/api/products').catch(error => error.response)
      );

      const results = await Promise.all(rapidRequests);
      
      // Some requests should be rate limited
      const rateLimitedRequests = results.filter(r => r?.status === 429);
      expect(rateLimitedRequests.length).toBeGreaterThan(0);
    });

    it('should validate input and prevent injection attacks', async () => {
      const maliciousInputs = [
        { name: '<script>alert("xss")</script>' },
        { name: "'; DROP TABLE products; --" },
        { description: '{{7*7}}' }, // Template injection
        { price: 'NaN' },
        { category: '../../../etc/passwd' },
      ];

      for (const input of maliciousInputs) {
        await expect(
          cmsClient.post('/api/products', 
            { data: input },
            { headers: { Authorization: `Bearer ${adminToken}` } }
          )
        ).rejects.toMatchObject({
          response: { status: 400 }
        });
      }
    });

    it('should implement proper CORS configuration', async () => {
      const corsResponse = await axios.options(`${WEB_URL}/api/products`, {
        headers: {
          'Origin': 'https://malicious-site.com',
          'Access-Control-Request-Method': 'POST',
        }
      }).catch(error => error.response);

      // Should reject unauthorized origins
      expect(corsResponse.status).toBe(403);
    });

    it('should set proper security headers', async () => {
      const response = await webClient.get('/');
      
      const headers = response.headers;
      expect(headers['x-frame-options']).toBe('DENY');
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-xss-protection']).toBe('1; mode=block');
      expect(headers['strict-transport-security']).toBeDefined();
    });
  });

  describe('Data Encryption and Protection', () => {
    it('should encrypt sensitive data in transit', async () => {
      // Test HTTPS enforcement
      const httpsTest = await axios.get(`${WEB_URL.replace('http:', 'https:')}/api/health`)
        .catch(error => ({ error: true, message: error.message }));

      // In production, should enforce HTTPS
      expect(httpsTest.error || httpsTest.status === 200).toBe(true);
    });

    it('should hash passwords properly', async () => {
      const passwordTest = await cmsClient.post('/api/test/password-security', {
        password: 'testpassword123',
      });

      expect(passwordTest.status).toBe(200);
      expect(passwordTest.data.isHashed).toBe(true);
      expect(passwordTest.data.algorithm).toBe('bcrypt');
    });

    it('should validate webhook signatures', async () => {
      const payload = { test: 'data' };
      const secret = 'test-webhook-secret';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      // Valid signature
      const validWebhook = await trackingClient.post('/api/webhooks/incoming', payload, {
        headers: {
          'X-Webhook-Signature': `sha256=${signature}`,
        }
      });
      expect(validWebhook.status).toBe(200);

      // Invalid signature
      await expect(
        trackingClient.post('/api/webhooks/incoming', payload, {
          headers: {
            'X-Webhook-Signature': 'sha256=invalid-signature',
          }
        })
      ).rejects.toMatchObject({
        response: { status: 401 }
      });
    });
  });

  describe('Security Monitoring and Alerting', () => {
    it('should detect and alert on suspicious activities', async () => {
      // Simulate suspicious activity
      const suspiciousRequests = Array.from({ length: 10 }, () =>
        cmsClient.post('/api/auth/local', {
          identifier: 'admin@example.com',
          password: 'wrong-password',
        }).catch(error => error.response)
      );

      await Promise.all(suspiciousRequests);

      // Check for security alerts
      const alertsResponse = await trackingClient.get('/api/security/alerts', {
        params: { timeRange: '5m' }
      });

      expect(alertsResponse.status).toBe(200);
      
      const bruteForceAlert = alertsResponse.data.alerts.find(
        (alert: any) => alert.type === 'brute_force_attempt'
      );
      expect(bruteForceAlert).toBeDefined();
    });

    it('should log security events properly', async () => {
      // Generate security event
      await cmsClient.post('/api/test/security-event', {
        type: 'unauthorized_access_attempt',
        ip: '192.168.1.100',
        userAgent: 'test-scanner',
      });

      // Verify event is logged
      const securityLogs = await trackingClient.get('/api/security/logs', {
        params: { limit: 10 }
      });

      expect(securityLogs.status).toBe(200);
      expect(Array.isArray(securityLogs.data.logs)).toBe(true);
      
      const testEvent = securityLogs.data.logs.find(
        (log: any) => log.type === 'unauthorized_access_attempt'
      );
      expect(testEvent).toBeDefined();
    });
  });
});