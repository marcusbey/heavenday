/**
 * Tracking ↔ All Systems Integration Tests
 * Tests tracking service integration with Google Sheets, analytics, and all other systems
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';
import { google } from 'googleapis';
import { EventEmitter } from 'events';

// Test configuration
const TRACKING_URL = process.env.TRACKING_URL || 'http://localhost:3003';
const CMS_URL = process.env.CMS_URL || 'http://localhost:1338';
const WEB_URL = process.env.WEB_URL || 'http://localhost:3001';
const TEST_TIMEOUT = 30000;

interface UserJourneyEvent {
  userId: string;
  sessionId: string;
  event: string;
  page: string;
  timestamp: string;
  metadata: Record<string, any>;
}

interface OrderData {
  orderId: string;
  userId: string;
  products: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  status: string;
  shippingAddress: any;
  billingAddress: any;
  paymentMethod: string;
  timestamp: string;
}

interface AnalyticsData {
  event: string;
  userId?: string;
  sessionId: string;
  timestamp: string;
  properties: Record<string, any>;
}

interface GoogleSheetsTest {
  spreadsheetId: string;
  auth: any;
  sheets: any;
}

describe('Tracking ↔ All Systems Integration Tests', () => {
  let trackingClient: AxiosInstance;
  let cmsClient: AxiosInstance;
  let webClient: AxiosInstance;
  let googleSheetsTest: GoogleSheetsTest;
  let testSpreadsheetId: string;
  let eventEmitter: EventEmitter;
  let testData: {
    users: string[];
    sessions: string[];
    orders: string[];
    events: string[];
  };

  beforeAll(async () => {
    // Initialize clients
    trackingClient = axios.create({
      baseURL: TRACKING_URL,
      timeout: TEST_TIMEOUT,
    });

    cmsClient = axios.create({
      baseURL: CMS_URL,
      timeout: TEST_TIMEOUT,
    });

    webClient = axios.create({
      baseURL: WEB_URL,
      timeout: TEST_TIMEOUT,
    });

    eventEmitter = new EventEmitter();
    testData = {
      users: [],
      sessions: [],
      orders: [],
      events: [],
    };

    // Wait for services to be ready
    await waitForService(TRACKING_URL, '/health');
    await waitForService(CMS_URL, '/_health');
    await waitForService(WEB_URL, '/api/health');

    // Setup Google Sheets test environment
    await setupGoogleSheetsTest();

    // Initialize tracking system
    await initializeTrackingSystem();
  }, 90000);

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
    
    // Delete test spreadsheet
    if (testSpreadsheetId && googleSheetsTest.sheets) {
      try {
        await googleSheetsTest.sheets.spreadsheets.batchUpdate({
          spreadsheetId: testSpreadsheetId,
          requestBody: {
            requests: [{
              deleteSheet: {
                sheetId: 0
              }
            }]
          }
        });
      } catch (error) {
        console.warn('Failed to cleanup test spreadsheet:', error.message);
      }
    }
  });

  beforeEach(async () => {
    // Reset event emitter
    eventEmitter.removeAllListeners();
  });

  afterEach(async () => {
    // Clean up any test-specific data
  });

  describe('Google Sheets Integration', () => {
    it('should sync order data to Google Sheets', async () => {
      const orderData: OrderData = {
        orderId: `test-order-${Date.now()}`,
        userId: `test-user-${Date.now()}`,
        products: [
          {
            productId: 'product-1',
            quantity: 2,
            price: 29.99,
          },
          {
            productId: 'product-2',
            quantity: 1,
            price: 49.99,
          },
        ],
        total: 109.97,
        status: 'confirmed',
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zip: '12345',
          country: 'US',
        },
        billingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zip: '12345',
          country: 'US',
        },
        paymentMethod: 'credit_card',
        timestamp: new Date().toISOString(),
      };

      // Send order to tracking service
      const response = await trackingClient.post('/api/orders/track', orderData);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.sheetRowId).toBeDefined();

      testData.orders.push(orderData.orderId);

      // Wait for Google Sheets sync
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify data was synced to Google Sheets
      const sheetData = await googleSheetsTest.sheets.spreadsheets.values.get({
        spreadsheetId: testSpreadsheetId,
        range: 'Orders!A:Z',
      });

      expect(sheetData.data.values).toBeDefined();
      
      // Find the order row
      const orderRow = sheetData.data.values.find((row: string[]) => 
        row.includes(orderData.orderId)
      );

      expect(orderRow).toBeDefined();
      expect(orderRow).toContain(orderData.userId);
      expect(orderRow).toContain(orderData.total.toString());
      expect(orderRow).toContain(orderData.status);
    });

    it('should sync user journey data to Google Sheets', async () => {
      const journeyEvents: UserJourneyEvent[] = [
        {
          userId: `user-${Date.now()}`,
          sessionId: `session-${Date.now()}`,
          event: 'page_view',
          page: '/',
          timestamp: new Date().toISOString(),
          metadata: {
            referrer: 'https://google.com',
            userAgent: 'test-browser',
          },
        },
        {
          userId: `user-${Date.now()}`,
          sessionId: `session-${Date.now()}`,
          event: 'product_view',
          page: '/products/test-product',
          timestamp: new Date().toISOString(),
          metadata: {
            productId: 'test-product-123',
            category: 'Electronics',
          },
        },
        {
          userId: `user-${Date.now()}`,
          sessionId: `session-${Date.now()}`,
          event: 'add_to_cart',
          page: '/products/test-product',
          timestamp: new Date().toISOString(),
          metadata: {
            productId: 'test-product-123',
            quantity: 2,
            price: 29.99,
          },
        },
      ];

      // Send journey events
      for (const event of journeyEvents) {
        const response = await trackingClient.post('/api/journey/track', event);
        expect(response.status).toBe(200);
        
        testData.users.push(event.userId);
        testData.sessions.push(event.sessionId);
        testData.events.push(event.event);
      }

      // Wait for batch sync
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Verify journey data in Google Sheets
      const sheetData = await googleSheetsTest.sheets.spreadsheets.values.get({
        spreadsheetId: testSpreadsheetId,
        range: 'UserJourney!A:Z',
      });

      expect(sheetData.data.values).toBeDefined();
      expect(sheetData.data.values.length).toBeGreaterThan(journeyEvents.length);

      // Verify each event was recorded
      journeyEvents.forEach(event => {
        const eventRow = sheetData.data.values.find((row: string[]) => 
          row.includes(event.event) && row.includes(event.userId)
        );
        expect(eventRow).toBeDefined();
      });
    });

    it('should handle Google Sheets API rate limits', async () => {
      // Create many events to trigger rate limiting
      const events = Array.from({ length: 50 }, (_, i) => ({
        userId: `rate-limit-user-${i}`,
        sessionId: `rate-limit-session-${i}`,
        event: 'rapid_event',
        page: `/page-${i}`,
        timestamp: new Date().toISOString(),
        metadata: { index: i },
      }));

      // Send all events rapidly
      const responses = await Promise.allSettled(
        events.map(event => trackingClient.post('/api/journey/track', event))
      );

      // All should either succeed or be queued for retry
      responses.forEach(response => {
        if (response.status === 'fulfilled') {
          expect([200, 202]).toContain(response.value.status);
        }
      });

      // Check rate limit handling status
      const statusResponse = await trackingClient.get('/api/status/rate-limits');
      expect(statusResponse.status).toBe(200);
      expect(statusResponse.data.sheetsApi).toBeDefined();
      expect(statusResponse.data.sheetsApi.remaining).toBeDefined();
    });
  });

  describe('Analytics Pipeline and Reporting', () => {
    it('should process analytics events from all systems', async () => {
      const analyticsEvents: AnalyticsData[] = [
        {
          event: 'product_scraped',
          sessionId: `analytics-session-${Date.now()}`,
          timestamp: new Date().toISOString(),
          properties: {
            source: 'automation',
            productId: 'scraped-product-123',
            category: 'Electronics',
            price: 59.99,
          },
        },
        {
          event: 'cms_product_updated',
          sessionId: `analytics-session-${Date.now()}`,
          timestamp: new Date().toISOString(),
          properties: {
            source: 'cms',
            productId: 'updated-product-456',
            changes: ['price', 'description'],
            admin: 'admin@example.com',
          },
        },
        {
          event: 'user_interaction',
          userId: `analytics-user-${Date.now()}`,
          sessionId: `analytics-session-${Date.now()}`,
          timestamp: new Date().toISOString(),
          properties: {
            source: 'web',
            action: 'product_search',
            query: 'wireless headphones',
            results: 15,
          },
        },
      ];

      // Send analytics events
      const responses = await Promise.all(
        analyticsEvents.map(event => 
          trackingClient.post('/api/analytics/track', event)
        )
      );

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.data.processed).toBe(true);
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify analytics aggregation
      const aggregatedData = await trackingClient.get('/api/analytics/summary', {
        params: {
          timeRange: '1h',
          groupBy: ['source', 'event'],
        },
      });

      expect(aggregatedData.status).toBe(200);
      expect(aggregatedData.data.summary).toBeDefined();
      expect(Array.isArray(aggregatedData.data.summary)).toBe(true);

      // Verify each source is represented
      const sources = aggregatedData.data.summary.map((item: any) => item.source);
      expect(sources).toContain('automation');
      expect(sources).toContain('cms');
      expect(sources).toContain('web');
    });

    it('should generate business intelligence reports', async () => {
      // Request various BI reports
      const reports = [
        'product-performance',
        'user-engagement',
        'conversion-funnel',
        'revenue-trends',
      ];

      for (const reportType of reports) {
        const response = await trackingClient.get(`/api/reports/${reportType}`, {
          params: {
            period: '24h',
            format: 'json',
          },
        });

        expect(response.status).toBe(200);
        expect(response.data.report).toBeDefined();
        expect(response.data.report.type).toBe(reportType);
        expect(response.data.report.data).toBeDefined();
        expect(response.data.report.generatedAt).toBeDefined();
      }
    });

    it('should handle cross-system event correlation', async () => {
      const correlationId = `correlation-${Date.now()}`;
      
      // Create correlated events across systems
      const correlatedEvents = [
        {
          system: 'automation',
          event: 'product_scraped',
          correlationId,
          data: { productId: 'corr-product-123' },
        },
        {
          system: 'cms',
          event: 'product_created',
          correlationId,
          data: { productId: 'corr-product-123' },
        },
        {
          system: 'web',
          event: 'product_viewed',
          correlationId,
          data: { productId: 'corr-product-123', userId: 'user-123' },
        },
      ];

      // Send correlated events
      for (const event of correlatedEvents) {
        await trackingClient.post('/api/events/correlated', event);
      }

      // Wait for correlation processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify correlation analysis
      const correlationAnalysis = await trackingClient.get(
        `/api/analysis/correlation/${correlationId}`
      );

      expect(correlationAnalysis.status).toBe(200);
      expect(correlationAnalysis.data.events).toHaveLength(3);
      expect(correlationAnalysis.data.timeline).toBeDefined();
      expect(correlationAnalysis.data.systems).toEqual(['automation', 'cms', 'web']);
    });
  });

  describe('Notification System Integration', () => {
    it('should send notifications for critical events', async () => {
      const criticalEvent = {
        type: 'system_alert',
        severity: 'high',
        source: 'automation',
        message: 'Scraping service failed multiple times',
        details: {
          service: 'amazon-scraper',
          errorCount: 5,
          lastError: 'Connection timeout',
        },
        timestamp: new Date().toISOString(),
      };

      const response = await trackingClient.post('/api/notifications/alert', criticalEvent);

      expect(response.status).toBe(200);
      expect(response.data.notificationSent).toBe(true);
      expect(response.data.channels).toBeDefined();
      expect(Array.isArray(response.data.channels)).toBe(true);

      // Verify notification was processed
      const notificationStatus = await trackingClient.get(
        `/api/notifications/status/${response.data.notificationId}`
      );

      expect(notificationStatus.status).toBe(200);
      expect(notificationStatus.data.status).toBe('sent');
    });

    it('should handle notification delivery failures', async () => {
      const event = {
        type: 'test_notification',
        severity: 'low',
        source: 'test',
        message: 'Test notification with invalid recipient',
        channels: ['email:invalid@invalid-domain.com'],
        timestamp: new Date().toISOString(),
      };

      const response = await trackingClient.post('/api/notifications/alert', event);

      expect(response.status).toBe(200);
      
      // Wait for delivery attempt
      await new Promise(resolve => setTimeout(resolve, 2000));

      const notificationStatus = await trackingClient.get(
        `/api/notifications/status/${response.data.notificationId}`
      );

      expect(notificationStatus.data.status).toMatch(/failed|error/);
      expect(notificationStatus.data.errors).toBeDefined();
    });

    it('should aggregate notifications to prevent spam', async () => {
      const duplicateEvents = Array.from({ length: 10 }, (_, i) => ({
        type: 'repeated_alert',
        severity: 'medium',
        source: 'test',
        message: 'Repeated test alert',
        details: { iteration: i },
        timestamp: new Date().toISOString(),
      }));

      // Send multiple similar notifications
      const responses = await Promise.all(
        duplicateEvents.map(event => 
          trackingClient.post('/api/notifications/alert', event)
        )
      );

      // Should aggregate similar notifications
      const uniqueNotifications = new Set(
        responses.map(r => r.data.notificationId)
      );

      expect(uniqueNotifications.size).toBeLessThan(duplicateEvents.length);

      // Verify aggregation details
      const aggregationInfo = await trackingClient.get('/api/notifications/aggregation/repeated_alert');
      expect(aggregationInfo.status).toBe(200);
      expect(aggregationInfo.data.count).toBeGreaterThanOrEqual(10);
      expect(aggregationInfo.data.aggregated).toBe(true);
    });
  });

  describe('Data Synchronization Accuracy and Timing', () => {
    it('should maintain data consistency across systems', async () => {
      const testEvent = {
        eventId: `consistency-test-${Date.now()}`,
        type: 'order_placed',
        data: {
          orderId: `order-${Date.now()}`,
          userId: `user-${Date.now()}`,
          amount: 99.99,
        },
        timestamp: new Date().toISOString(),
      };

      // Send event to tracking system
      await trackingClient.post('/api/events/track', testEvent);

      // Wait for propagation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify data in different systems
      const systems = ['tracking', 'cms', 'sheets'];
      const consistencyResults = await Promise.all(
        systems.map(async (system) => {
          const response = await trackingClient.get(`/api/sync/verify/${system}`, {
            params: { eventId: testEvent.eventId },
          });
          return { system, consistent: response.data.found, timestamp: response.data.timestamp };
        })
      );

      // All systems should have the event
      consistencyResults.forEach(result => {
        expect(result.consistent).toBe(true);
      });

      // Timestamps should be within acceptable range
      const timestamps = consistencyResults.map(r => new Date(r.timestamp).getTime());
      const maxDiff = Math.max(...timestamps) - Math.min(...timestamps);
      expect(maxDiff).toBeLessThan(5000); // Within 5 seconds
    });

    it('should handle sync conflicts gracefully', async () => {
      const conflictingEvents = [
        {
          eventId: 'conflict-test',
          source: 'system-a',
          data: { value: 'version-a' },
          timestamp: new Date().toISOString(),
        },
        {
          eventId: 'conflict-test',
          source: 'system-b',
          data: { value: 'version-b' },
          timestamp: new Date(Date.now() + 1000).toISOString(),
        },
      ];

      // Send conflicting events
      const responses = await Promise.all(
        conflictingEvents.map(event => 
          trackingClient.post('/api/sync/event', event)
        )
      );

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Check conflict resolution
      const conflictResolution = await trackingClient.get('/api/sync/conflicts/conflict-test');
      
      expect(conflictResolution.status).toBe(200);
      expect(conflictResolution.data.resolved).toBe(true);
      expect(conflictResolution.data.strategy).toBe('last-write-wins');
      expect(conflictResolution.data.finalValue).toBe('version-b');
    });
  });

  describe('Webhook Delivery and Processing', () => {
    it('should deliver webhooks to external systems', async () => {
      const webhookConfig = {
        url: 'http://localhost:3099/test-webhook',
        events: ['order.placed', 'user.registered'],
        secret: 'test-webhook-secret',
      };

      // Register webhook
      const registrationResponse = await trackingClient.post('/api/webhooks/register', webhookConfig);
      expect(registrationResponse.status).toBe(200);

      const webhookId = registrationResponse.data.webhookId;

      // Trigger events that should send webhooks
      const events = [
        {
          type: 'order.placed',
          data: { orderId: 'webhook-test-order', amount: 50.00 },
        },
        {
          type: 'user.registered',
          data: { userId: 'webhook-test-user', email: 'test@example.com' },
        },
      ];

      for (const event of events) {
        await trackingClient.post('/api/events/trigger', event);
      }

      // Wait for webhook delivery
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify webhook delivery status
      const deliveryStatus = await trackingClient.get(`/api/webhooks/${webhookId}/deliveries`);
      
      expect(deliveryStatus.status).toBe(200);
      expect(deliveryStatus.data.deliveries).toHaveLength(2);
      
      deliveryStatus.data.deliveries.forEach((delivery: any) => {
        expect(delivery.status).toBe('success');
        expect(delivery.responseCode).toBe(200);
      });

      // Cleanup
      await trackingClient.delete(`/api/webhooks/${webhookId}`);
    });

    it('should retry failed webhook deliveries', async () => {
      const webhookConfig = {
        url: 'http://localhost:3099/failing-webhook',
        events: ['test.event'],
        retryConfig: {
          maxRetries: 3,
          retryDelay: 1000,
        },
      };

      const registrationResponse = await trackingClient.post('/api/webhooks/register', webhookConfig);
      const webhookId = registrationResponse.data.webhookId;

      // Trigger event
      await trackingClient.post('/api/events/trigger', {
        type: 'test.event',
        data: { test: 'retry-test' },
      });

      // Wait for retry attempts
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Check retry status
      const retryStatus = await trackingClient.get(`/api/webhooks/${webhookId}/deliveries`);
      
      expect(retryStatus.data.deliveries).toHaveLength(1);
      expect(retryStatus.data.deliveries[0].attempts).toBeGreaterThan(1);
      expect(retryStatus.data.deliveries[0].status).toBe('failed');

      // Cleanup
      await trackingClient.delete(`/api/webhooks/${webhookId}`);
    });
  });

  // Helper functions
  async function waitForService(url: string, path: string): Promise<void> {
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        await axios.get(`${url}${path}`, { timeout: 5000 });
        return;
      } catch (error) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    throw new Error(`Service at ${url}${path} not ready after ${maxAttempts} attempts`);
  }

  async function setupGoogleSheetsTest(): Promise<void> {
    try {
      // Setup Google Sheets API client with test credentials
      const auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_SHEETS_KEY_FILE || './test-service-account.json',
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const sheets = google.sheets({ version: 'v4', auth });

      // Create test spreadsheet
      const response = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: `Integration Test - ${Date.now()}`,
          },
          sheets: [
            {
              properties: {
                title: 'Orders',
              },
            },
            {
              properties: {
                title: 'UserJourney',
              },
            },
          ],
        },
      });

      testSpreadsheetId = response.data.spreadsheetId!;
      
      googleSheetsTest = {
        spreadsheetId: testSpreadsheetId,
        auth,
        sheets,
      };

      // Setup headers for test sheets
      await setupSheetHeaders();

    } catch (error) {
      console.warn('Google Sheets setup failed, using mock:', error.message);
      // Use mock implementation for tests when Google Sheets is not available
      googleSheetsTest = {
        spreadsheetId: 'mock-spreadsheet-id',
        auth: null,
        sheets: createMockSheetsClient(),
      };
    }
  }

  async function setupSheetHeaders(): Promise<void> {
    if (!googleSheetsTest.sheets || !testSpreadsheetId) return;

    // Setup Orders sheet headers
    await googleSheetsTest.sheets.spreadsheets.values.update({
      spreadsheetId: testSpreadsheetId,
      range: 'Orders!A1:H1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [['Order ID', 'User ID', 'Total', 'Status', 'Payment Method', 'Timestamp', 'Products', 'Address']],
      },
    });

    // Setup UserJourney sheet headers
    await googleSheetsTest.sheets.spreadsheets.values.update({
      spreadsheetId: testSpreadsheetId,
      range: 'UserJourney!A1:G1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [['User ID', 'Session ID', 'Event', 'Page', 'Timestamp', 'Metadata', 'Source']],
      },
    });
  }

  function createMockSheetsClient() {
    return {
      spreadsheets: {
        create: jest.fn().mockResolvedValue({ data: { spreadsheetId: 'mock-id' } }),
        values: {
          get: jest.fn().mockResolvedValue({ 
            data: { 
              values: [
                ['Header1', 'Header2', 'Header3'],
                ['Value1', 'Value2', 'Value3'],
              ]
            }
          }),
          update: jest.fn().mockResolvedValue({ data: {} }),
        },
        batchUpdate: jest.fn().mockResolvedValue({ data: {} }),
      },
    };
  }

  async function initializeTrackingSystem(): Promise<void> {
    // Initialize tracking system with test configuration
    const initResponse = await trackingClient.post('/api/init', {
      googleSheets: {
        spreadsheetId: testSpreadsheetId,
        enabled: true,
      },
      analytics: {
        enabled: true,
        batchSize: 10,
        flushInterval: 5000,
      },
      notifications: {
        enabled: true,
        channels: ['email', 'webhook'],
      },
    });

    expect(initResponse.status).toBe(200);
    expect(initResponse.data.initialized).toBe(true);
  }

  async function cleanupTestData(): Promise<void> {
    // Cleanup tracking data
    const cleanupTasks = [
      ...testData.users.map(userId => 
        trackingClient.delete(`/api/users/${userId}/data`).catch(() => {})
      ),
      ...testData.sessions.map(sessionId => 
        trackingClient.delete(`/api/sessions/${sessionId}`).catch(() => {})
      ),
      ...testData.orders.map(orderId => 
        trackingClient.delete(`/api/orders/${orderId}`).catch(() => {})
      ),
    ];

    await Promise.allSettled(cleanupTasks);
  }
});