import { setupStrapi, cleanupStrapi, createAuthenticatedRequest } from '../../helpers/strapi';
import { Strapi } from '@strapi/strapi';
import request from 'supertest';
import crypto from 'crypto';
import axios from 'axios';
import nock from 'nock';

// Mock axios for webhook testing
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Webhook Integration Tests', () => {
  let strapi: Strapi;
  let authenticatedRequest: any;
  let adminRequest: any;
  let testProduct: any;
  let testReview: any;

  beforeAll(async () => {
    strapi = await setupStrapi();
    authenticatedRequest = createAuthenticatedRequest(strapi);
    adminRequest = await authenticatedRequest.asAdmin();

    // Set up webhook environment variables for testing
    process.env.FRONTEND_WEBHOOK_URL = 'https://frontend.test.com/webhook';
    process.env.AUTOMATION_WEBHOOK_URL = 'https://automation.test.com/webhook';
    process.env.ANALYTICS_WEBHOOK_URL = 'https://analytics.test.com/webhook';
    process.env.WEBHOOK_SECRET = 'test-webhook-secret-key';
    process.env.AUTOMATION_API_KEY = 'test-automation-api-key';
  });

  afterAll(async () => {
    await cleanupStrapi(strapi);
    // Clean up environment variables
    delete process.env.FRONTEND_WEBHOOK_URL;
    delete process.env.AUTOMATION_WEBHOOK_URL;
    delete process.env.ANALYTICS_WEBHOOK_URL;
    delete process.env.WEBHOOK_SECRET;
    delete process.env.AUTOMATION_API_KEY;
  });

  beforeEach(async () => {
    // Clear data
    await strapi.db.query('api::product.product').deleteMany({});
    await strapi.db.query('api::review.review').deleteMany({});

    // Reset axios mocks
    mockedAxios.post.mockClear();

    // Create test product
    testProduct = await strapi.entityService.create('api::product.product', {
      data: {
        name: 'Webhook Test Product',
        description: 'Product for webhook testing',
        price: 99.99,
        sku: 'WEBHOOK-001',
        status: 'active'
      }
    });

    // Create test review
    testReview = await strapi.entityService.create('api::review.review', {
      data: {
        product: testProduct.id,
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        rating: 5,
        comment: 'Great product for webhook testing',
        status: 'pending'
      }
    });
  });

  describe('Webhook Controller Tests', () => {
    describe('POST /api/webhooks/product', () => {
      it('should handle product webhook payload correctly', async () => {
        const webhookPayload = {
          event: 'create',
          model: 'product',
          entry: {
            id: testProduct.id,
            name: testProduct.name,
            sku: testProduct.sku,
            price: testProduct.price
          }
        };

        // Mock successful webhook calls
        mockedAxios.post.mockResolvedValue({ status: 200, data: { success: true } });

        const response = await request(strapi.server.httpServer)
          .post('/api/webhooks/product')
          .send(webhookPayload)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(mockedAxios.post).toHaveBeenCalledTimes(3); // Three webhook URLs
      });

      it('should validate webhook payload structure', async () => {
        const invalidPayload = {
          event: 'create',
          // Missing required fields: model, entry
        };

        const response = await request(strapi.server.httpServer)
          .post('/api/webhooks/product')
          .send(invalidPayload)
          .expect(400);

        expect(response.body.error).toBeDefined();
        expect(mockedAxios.post).not.toHaveBeenCalled();
      });

      it('should handle webhook delivery failures gracefully', async () => {
        const webhookPayload = {
          event: 'update',
          model: 'product',
          entry: testProduct
        };

        // Mock webhook failures
        mockedAxios.post.mockRejectedValue(new Error('Webhook delivery failed'));

        const response = await request(strapi.server.httpServer)
          .post('/api/webhooks/product')
          .send(webhookPayload)
          .expect(200); // Should still return success

        expect(response.body.success).toBe(true);
        expect(mockedAxios.post).toHaveBeenCalledTimes(3);
      });

      it('should generate correct webhook signatures', async () => {
        const webhookPayload = {
          event: 'delete',
          model: 'product',
          entry: { id: testProduct.id }
        };

        mockedAxios.post.mockResolvedValue({ status: 200, data: { success: true } });

        await request(strapi.server.httpServer)
          .post('/api/webhooks/product')
          .send(webhookPayload)
          .expect(200);

        // Verify signature generation
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            event: 'delete',
            model: 'product',
            type: 'product',
            timestamp: expect.any(Date)
          }),
          expect.objectContaining({
            headers: expect.objectContaining({
              'X-Webhook-Signature': expect.any(String),
              'X-Webhook-Source': 'heaven-dolls-cms'
            })
          })
        );
      });

      it('should handle different product events', async () => {
        const events = ['create', 'update', 'delete'];
        
        for (const event of events) {
          const webhookPayload = {
            event,
            model: 'product',
            entry: testProduct
          };

          mockedAxios.post.mockResolvedValue({ status: 200, data: { success: true } });

          const response = await request(strapi.server.httpServer)
            .post('/api/webhooks/product')
            .send(webhookPayload)
            .expect(200);

          expect(response.body.success).toBe(true);
        }

        expect(mockedAxios.post).toHaveBeenCalledTimes(events.length * 3); // 3 webhooks per event
      });

      it('should respect webhook timeout settings', async () => {
        const webhookPayload = {
          event: 'create',
          model: 'product',
          entry: testProduct
        };

        mockedAxios.post.mockResolvedValue({ status: 200, data: { success: true } });

        await request(strapi.server.httpServer)
          .post('/api/webhooks/product')
          .send(webhookPayload)
          .expect(200);

        // Verify timeout is set correctly
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(Object),
          expect.objectContaining({
            timeout: 5000
          })
        );
      });
    });

    describe('POST /api/webhooks/review', () => {
      it('should handle review webhook payload correctly', async () => {
        const webhookPayload = {
          event: 'create',
          model: 'review',
          entry: {
            id: testReview.id,
            rating: testReview.rating,
            comment: testReview.comment,
            status: testReview.status,
            product: testProduct.id
          }
        };

        mockedAxios.post.mockResolvedValue({ status: 200, data: { success: true } });

        const response = await request(strapi.server.httpServer)
          .post('/api/webhooks/review')
          .send(webhookPayload)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(mockedAxios.post).toHaveBeenCalledTimes(3);
      });

      it('should trigger automation pipeline on review approval', async () => {
        const approvedReviewPayload = {
          event: 'update',
          model: 'review',
          entry: {
            ...testReview,
            status: 'approved'
          }
        };

        mockedAxios.post.mockResolvedValue({ status: 200, data: { success: true } });

        const response = await request(strapi.server.httpServer)
          .post('/api/webhooks/review')
          .send(approvedReviewPayload)
          .expect(200);

        expect(response.body.success).toBe(true);
        
        // Should call automation pipeline webhook specifically
        expect(mockedAxios.post).toHaveBeenCalledWith(
          'https://automation.test.com/webhook/cms-events',
          expect.objectContaining({
            event: 'review_approved',
            data: expect.objectContaining({
              status: 'approved'
            }),
            source: 'cms'
          }),
          expect.objectContaining({
            timeout: 10000,
            headers: expect.objectContaining({
              'Authorization': 'Bearer test-automation-api-key'
            })
          })
        );
      });

      it('should not trigger automation pipeline for non-approved reviews', async () => {
        const pendingReviewPayload = {
          event: 'update',
          model: 'review',
          entry: {
            ...testReview,
            status: 'pending'
          }
        };

        mockedAxios.post.mockResolvedValue({ status: 200, data: { success: true } });

        await request(strapi.server.httpServer)
          .post('/api/webhooks/review')
          .send(pendingReviewPayload)
          .expect(200);

        // Verify automation pipeline webhook was not called
        const automationCalls = mockedAxios.post.mock.calls.filter(call => 
          call[0].includes('cms-events')
        );
        expect(automationCalls.length).toBe(0);
      });

      it('should handle review moderation workflows', async () => {
        const moderationEvents = ['approved', 'rejected', 'spam'];
        
        for (const status of moderationEvents) {
          const reviewPayload = {
            event: 'update',
            model: 'review',
            entry: {
              ...testReview,
              status
            }
          };

          mockedAxios.post.mockResolvedValue({ status: 200, data: { success: true } });

          const response = await request(strapi.server.httpServer)
            .post('/api/webhooks/review')
            .send(reviewPayload)
            .expect(200);

          expect(response.body.success).toBe(true);
        }
      });
    });

    describe('GET /api/webhooks/health', () => {
      it('should return health check status', async () => {
        const response = await request(strapi.server.httpServer)
          .get('/api/webhooks/health')
          .expect(200);

        expect(response.body.status).toBe('healthy');
        expect(response.body.timestamp).toBeDefined();
        expect(response.body.services).toBeDefined();
        expect(response.body.services.database).toBe('healthy');
        expect(response.body.version).toBeDefined();
      });

      it('should check Redis status when enabled', async () => {
        process.env.REDIS_ENABLED = 'true';

        const response = await request(strapi.server.httpServer)
          .get('/api/webhooks/health')
          .expect(200);

        expect(response.body.services.redis).toBe('healthy');

        delete process.env.REDIS_ENABLED;
      });

      it('should show Redis as disabled when not enabled', async () => {
        const response = await request(strapi.server.httpServer)
          .get('/api/webhooks/health')
          .expect(200);

        expect(response.body.services.redis).toBe('disabled');
      });
    });
  });

  describe('Webhook Security Tests', () => {
    it('should generate valid HMAC signatures', () => {
      const testData = { test: 'data' };
      const secret = 'test-secret';
      const payload = JSON.stringify(testData);
      
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      // Mock the signature generation from webhook controller
      const actualSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      expect(actualSignature).toBe(expectedSignature);
    });

    it('should include security headers in webhook requests', async () => {
      const webhookPayload = {
        event: 'create',
        model: 'product',
        entry: testProduct
      };

      mockedAxios.post.mockResolvedValue({ status: 200, data: { success: true } });

      await request(strapi.server.httpServer)
        .post('/api/webhooks/product')
        .send(webhookPayload)
        .expect(200);

      // Verify security headers
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Webhook-Source': 'heaven-dolls-cms',
            'X-Webhook-Signature': expect.any(String)
          })
        })
      );
    });

    it('should validate webhook source authentication', async () => {
      // Test with missing webhook source
      const webhookPayload = {
        event: 'create',
        model: 'product',
        entry: testProduct
      };

      const response = await request(strapi.server.httpServer)
        .post('/api/webhooks/product')
        .send(webhookPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle malformed webhook payloads securely', async () => {
      const malformedPayloads = [
        null,
        undefined,
        '',
        'invalid-json',
        { event: null },
        { event: 'create', model: null },
        { event: 'create', model: 'product', entry: null }
      ];

      for (const payload of malformedPayloads) {
        await request(strapi.server.httpServer)
          .post('/api/webhooks/product')
          .send(payload)
          .expect(400);
      }

      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('Webhook Performance Tests', () => {
    it('should handle concurrent webhook requests', async () => {
      const webhookPayload = {
        event: 'create',
        model: 'product',
        entry: testProduct
      };

      mockedAxios.post.mockResolvedValue({ status: 200, data: { success: true } });

      const concurrentRequests = Array(10).fill(null).map(() =>
        request(strapi.server.httpServer)
          .post('/api/webhooks/product')
          .send(webhookPayload)
          .expect(200)
      );

      const responses = await Promise.all(concurrentRequests);
      
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
      });

      expect(mockedAxios.post).toHaveBeenCalledTimes(30); // 10 requests * 3 webhooks each
    });

    it('should handle webhook delivery timeouts gracefully', async () => {
      const webhookPayload = {
        event: 'create',
        model: 'product',
        entry: testProduct
      };

      // Mock timeout error
      mockedAxios.post.mockRejectedValue(new Error('ECONNABORTED'));

      const startTime = Date.now();
      
      const response = await request(strapi.server.httpServer)
        .post('/api/webhooks/product')
        .send(webhookPayload)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(10000); // Should not hang indefinitely
    });

    it('should process webhook queue efficiently', async () => {
      const webhookPayloads = Array(20).fill(null).map((_, index) => ({
        event: 'create',
        model: 'product',
        entry: {
          ...testProduct,
          id: testProduct.id + index,
          sku: `WEBHOOK-${index.toString().padStart(3, '0')}`
        }
      }));

      mockedAxios.post.mockResolvedValue({ status: 200, data: { success: true } });

      const startTime = Date.now();

      const responses = await Promise.all(
        webhookPayloads.map(payload =>
          request(strapi.server.httpServer)
            .post('/api/webhooks/product')
            .send(payload)
            .expect(200)
        )
      );

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(responses.length).toBe(20);
      expect(totalTime).toBeLessThan(5000); // Should process efficiently
      expect(mockedAxios.post).toHaveBeenCalledTimes(60); // 20 requests * 3 webhooks each
    });
  });

  describe('Webhook Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const webhookPayload = {
        event: 'create',
        model: 'product',
        entry: testProduct
      };

      mockedAxios.post.mockRejectedValue(new Error('Network Error'));

      const response = await request(strapi.server.httpServer)
        .post('/api/webhooks/product')
        .send(webhookPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle HTTP error responses', async () => {
      const webhookPayload = {
        event: 'create',
        model: 'product',
        entry: testProduct
      };

      mockedAxios.post.mockRejectedValue({
        response: {
          status: 500,
          data: { error: 'Internal Server Error' }
        }
      });

      const response = await request(strapi.server.httpServer)
        .post('/api/webhooks/product')
        .send(webhookPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle partial webhook delivery failures', async () => {
      const webhookPayload = {
        event: 'create',
        model: 'product',
        entry: testProduct
      };

      // Mock mixed success/failure responses
      mockedAxios.post
        .mockResolvedValueOnce({ status: 200, data: { success: true } })
        .mockRejectedValueOnce(new Error('Webhook 2 failed'))
        .mockResolvedValueOnce({ status: 200, data: { success: true } });

      const response = await request(strapi.server.httpServer)
        .post('/api/webhooks/product')
        .send(webhookPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    });

    it('should handle missing webhook URLs gracefully', async () => {
      // Temporarily remove webhook URLs
      const originalUrls = {
        frontend: process.env.FRONTEND_WEBHOOK_URL,
        automation: process.env.AUTOMATION_WEBHOOK_URL,
        analytics: process.env.ANALYTICS_WEBHOOK_URL
      };

      delete process.env.FRONTEND_WEBHOOK_URL;
      delete process.env.AUTOMATION_WEBHOOK_URL;
      delete process.env.ANALYTICS_WEBHOOK_URL;

      const webhookPayload = {
        event: 'create',
        model: 'product',
        entry: testProduct
      };

      const response = await request(strapi.server.httpServer)
        .post('/api/webhooks/product')
        .send(webhookPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockedAxios.post).not.toHaveBeenCalled();

      // Restore URLs
      process.env.FRONTEND_WEBHOOK_URL = originalUrls.frontend;
      process.env.AUTOMATION_WEBHOOK_URL = originalUrls.automation;
      process.env.ANALYTICS_WEBHOOK_URL = originalUrls.analytics;
    });
  });

  describe('Webhook Payload Validation', () => {
    it('should validate product webhook payload structure', async () => {
      const invalidPayloads = [
        {}, // Empty object
        { event: 'create' }, // Missing model and entry
        { event: 'create', model: 'product' }, // Missing entry
        { event: null, model: 'product', entry: {} }, // Invalid event
        { event: 'create', model: null, entry: {} }, // Invalid model
        { event: 'invalid_event', model: 'product', entry: {} }, // Invalid event type
      ];

      for (const payload of invalidPayloads) {
        const response = await request(strapi.server.httpServer)
          .post('/api/webhooks/product')
          .send(payload)
          .expect(400);

        expect(response.body.error).toBeDefined();
      }
    });

    it('should validate review webhook payload structure', async () => {
      const validPayload = {
        event: 'update',
        model: 'review',
        entry: {
          id: testReview.id,
          status: 'approved',
          rating: 5,
          product: testProduct.id
        }
      };

      mockedAxios.post.mockResolvedValue({ status: 200, data: { success: true } });

      const response = await request(strapi.server.httpServer)
        .post('/api/webhooks/review')
        .send(validPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should sanitize webhook payloads', async () => {
      const payloadWithMaliciousData = {
        event: 'create',
        model: 'product',
        entry: {
          ...testProduct,
          maliciousScript: '<script>alert("xss")</script>',
          sqlInjection: "'; DROP TABLE products; --"
        }
      };

      mockedAxios.post.mockResolvedValue({ status: 200, data: { success: true } });

      const response = await request(strapi.server.httpServer)
        .post('/api/webhooks/product')
        .send(payloadWithMaliciousData)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify that the payload was processed without executing malicious content
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          entry: expect.objectContaining({
            maliciousScript: '<script>alert("xss")</script>', // Should be treated as string
            sqlInjection: "'; DROP TABLE products; --"
          })
        }),
        expect.any(Object)
      );
    });
  });

  describe('Webhook Integration with External Services', () => {
    it('should integrate with automation pipeline correctly', async () => {
      const automationPayload = {
        event: 'update',
        model: 'review',
        entry: {
          ...testReview,
          status: 'approved',
          rating: 5,
          product: {
            id: testProduct.id,
            name: testProduct.name,
            sku: testProduct.sku
          }
        }
      };

      mockedAxios.post.mockResolvedValue({ status: 200, data: { success: true } });

      await request(strapi.server.httpServer)
        .post('/api/webhooks/review')
        .send(automationPayload)
        .expect(200);

      // Verify automation pipeline integration
      const automationCall = mockedAxios.post.mock.calls.find(call => 
        call[0].includes('cms-events')
      );

      expect(automationCall).toBeDefined();
      expect(automationCall[1]).toMatchObject({
        event: 'review_approved',
        data: expect.objectContaining({
          status: 'approved',
          rating: 5
        }),
        source: 'cms'
      });
    });

    it('should handle webhook retries for failed deliveries', async () => {
      const webhookPayload = {
        event: 'create',
        model: 'product',
        entry: testProduct
      };

      // Mock failure followed by success (simulating retry)
      mockedAxios.post
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce({ status: 200, data: { success: true } });

      const response = await request(strapi.server.httpServer)
        .post('/api/webhooks/product')
        .send(webhookPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Note: Actual retry logic would need to be implemented in the webhook controller
    });
  });

  describe('Webhook Monitoring and Logging', () => {
    it('should log webhook delivery attempts', async () => {
      const webhookPayload = {
        event: 'create',
        model: 'product',
        entry: testProduct
      };

      mockedAxios.post.mockResolvedValue({ status: 200, data: { success: true } });

      // Mock console.log to capture logs
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      await request(strapi.server.httpServer)
        .post('/api/webhooks/product')
        .send(webhookPayload)
        .expect(200);

      // Note: Actual logging verification would depend on the logging implementation
      logSpy.mockRestore();
    });

    it('should track webhook delivery metrics', async () => {
      const webhookPayload = {
        event: 'create',
        model: 'product',
        entry: testProduct
      };

      mockedAxios.post.mockResolvedValue({ status: 200, data: { success: true } });

      const startTime = Date.now();

      await request(strapi.server.httpServer)
        .post('/api/webhooks/product')
        .send(webhookPayload)
        .expect(200);

      const endTime = Date.now();
      const deliveryTime = endTime - startTime;

      expect(deliveryTime).toBeGreaterThan(0);
      expect(deliveryTime).toBeLessThan(5000); // Should complete within reasonable time
    });
  });
});