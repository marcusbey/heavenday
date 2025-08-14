/**
 * Automation ↔ CMS Integration Tests
 * Tests all interactions between automation service and Strapi CMS
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';
import { EventEmitter } from 'events';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

// Test configuration
const CMS_URL = process.env.CMS_URL || 'http://localhost:1338';
const AUTOMATION_URL = process.env.AUTOMATION_URL || 'http://localhost:3002';
const TEST_TIMEOUT = 45000;

interface ScrapedProductData {
  name: string;
  description: string;
  price: number;
  originalUrl: string;
  images: string[];
  specifications: Record<string, any>;
  category: string;
  brand?: string;
  availability: boolean;
  seoData: {
    title: string;
    description: string;
    keywords: string[];
  };
}

interface MediaFile {
  id: number;
  url: string;
  name: string;
  mime: string;
  size: number;
}

interface WebhookPayload {
  event: string;
  data: any;
  timestamp: string;
  source: string;
}

describe('Automation ↔ CMS Integration Tests', () => {
  let cmsClient: AxiosInstance;
  let automationClient: AxiosInstance;
  let adminToken: string;
  let webhookEventEmitter: EventEmitter;
  let testWebhookServer: any;
  let createdProducts: number[] = [];
  let uploadedMedia: number[] = [];

  beforeAll(async () => {
    // Initialize clients
    cmsClient = axios.create({
      baseURL: CMS_URL,
      timeout: TEST_TIMEOUT,
    });

    automationClient = axios.create({
      baseURL: AUTOMATION_URL,
      timeout: TEST_TIMEOUT,
    });

    // Setup webhook event emitter
    webhookEventEmitter = new EventEmitter();

    // Wait for services to be ready
    await waitForService(CMS_URL, '/_health');
    await waitForService(AUTOMATION_URL, '/health');

    // Authenticate with CMS
    adminToken = await authenticateAdmin();

    // Setup webhook test server
    await setupWebhookTestServer();

    // Initialize test categories and brands
    await setupTestData();
  }, 90000);

  afterAll(async () => {
    // Cleanup all test data
    await cleanupTestData();
    
    // Close webhook server
    if (testWebhookServer) {
      testWebhookServer.close();
    }
  });

  beforeEach(async () => {
    // Reset webhook events
    webhookEventEmitter.removeAllListeners();
  });

  afterEach(async () => {
    // Clean up any test-specific data
  });

  describe('Automated Product Creation from Scraped Data', () => {
    it('should create product from Amazon scraping data', async () => {
      const scrapedData: ScrapedProductData = {
        name: 'Wireless Bluetooth Headphones',
        description: 'High-quality wireless headphones with noise cancellation',
        price: 89.99,
        originalUrl: 'https://amazon.com/test-product',
        images: [
          'https://example.com/image1.jpg',
          'https://example.com/image2.jpg',
        ],
        specifications: {
          brand: 'TestBrand',
          model: 'TB-001',
          weight: '250g',
          batteryLife: '20 hours',
          connectivity: 'Bluetooth 5.0',
        },
        category: 'Electronics',
        brand: 'TestBrand',
        availability: true,
        seoData: {
          title: 'Wireless Bluetooth Headphones - Premium Quality',
          description: 'Experience premium sound quality with these wireless headphones',
          keywords: ['headphones', 'wireless', 'bluetooth', 'noise cancellation'],
        },
      };

      // Send scraped data to automation service
      const response = await automationClient.post('/api/products/create-from-scraped', {
        data: scrapedData,
        source: 'amazon',
        timestamp: new Date().toISOString(),
      });

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.productId).toBeDefined();

      const productId = response.data.productId;
      createdProducts.push(productId);

      // Verify product was created in CMS
      const cmsProduct = await cmsClient.get(`/api/products/${productId}?populate=*`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(cmsProduct.status).toBe(200);
      const product = cmsProduct.data.data;

      expect(product.attributes.name).toBe(scrapedData.name);
      expect(product.attributes.description).toBe(scrapedData.description);
      expect(product.attributes.price).toBe(scrapedData.price);
      expect(product.attributes.originalUrl).toBe(scrapedData.originalUrl);
      expect(product.attributes.specifications).toEqual(scrapedData.specifications);
      expect(product.attributes.seoTitle).toBe(scrapedData.seoData.title);
      expect(product.attributes.seoDescription).toBe(scrapedData.seoData.description);
      expect(product.attributes.keywords).toEqual(scrapedData.seoData.keywords);
    });

    it('should handle bulk product creation from automation', async () => {
      const bulkData = Array.from({ length: 5 }, (_, i) => ({
        name: `Bulk Product ${i + 1}`,
        description: `Description for bulk product ${i + 1}`,
        price: 19.99 + i * 10,
        originalUrl: `https://example.com/product-${i + 1}`,
        images: [`https://example.com/image-${i + 1}.jpg`],
        specifications: {
          sku: `BULK-${i + 1}`,
          category: 'Test Category',
        },
        category: 'Electronics',
        availability: true,
        seoData: {
          title: `Bulk Product ${i + 1} - Test`,
          description: `SEO description for bulk product ${i + 1}`,
          keywords: [`bulk`, `product-${i + 1}`, 'test'],
        },
      }));

      const response = await automationClient.post('/api/products/bulk-create', {
        products: bulkData,
        source: 'automation',
        batchId: `test-batch-${Date.now()}`,
      });

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.created).toBe(5);
      expect(Array.isArray(response.data.productIds)).toBe(true);
      expect(response.data.productIds).toHaveLength(5);

      // Track for cleanup
      createdProducts.push(...response.data.productIds);

      // Verify all products were created
      for (const productId of response.data.productIds) {
        const cmsProduct = await cmsClient.get(`/api/products/${productId}`, {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        });

        expect(cmsProduct.status).toBe(200);
      }
    });

    it('should validate and reject invalid scraped data', async () => {
      const invalidData = {
        name: '', // Missing required field
        description: 'Test description',
        // Missing price
        originalUrl: 'invalid-url',
        images: [],
        category: 'NonExistentCategory',
      };

      await expect(
        automationClient.post('/api/products/create-from-scraped', {
          data: invalidData,
        })
      ).rejects.toMatchObject({
        response: {
          status: 400,
        },
      });
    });
  });

  describe('Webhook Data Ingestion and Processing', () => {
    it('should process incoming webhooks from external sources', async () => {
      const webhookData: WebhookPayload = {
        event: 'product.updated',
        data: {
          productId: 'external-123',
          changes: {
            price: 79.99,
            availability: false,
          },
        },
        timestamp: new Date().toISOString(),
        source: 'supplier-api',
      };

      // Listen for webhook processing
      const webhookProcessed = new Promise((resolve) => {
        webhookEventEmitter.once('webhook.processed', resolve);
      });

      // Send webhook to automation service
      const response = await automationClient.post('/api/webhooks/incoming', webhookData, {
        headers: {
          'X-Webhook-Signature': generateWebhookSignature(webhookData),
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.received).toBe(true);

      // Wait for processing
      await webhookProcessed;

      // Verify webhook was processed
      const processingResult = await automationClient.get(`/api/webhooks/status/${response.data.processingId}`);
      expect(processingResult.data.status).toBe('completed');
    });

    it('should handle malformed webhook data gracefully', async () => {
      const malformedData = {
        invalid: 'structure',
        missing: 'required fields',
      };

      const response = await automationClient.post('/api/webhooks/incoming', malformedData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(400);
      expect(response.data.error).toBeDefined();
    });

    it('should verify webhook signatures for security', async () => {
      const webhookData = {
        event: 'test.event',
        data: { test: 'data' },
        timestamp: new Date().toISOString(),
        source: 'test',
      };

      // Test with invalid signature
      await expect(
        automationClient.post('/api/webhooks/incoming', webhookData, {
          headers: {
            'X-Webhook-Signature': 'invalid-signature',
            'Content-Type': 'application/json',
          },
        })
      ).rejects.toMatchObject({
        response: {
          status: 401,
        },
      });

      // Test with valid signature
      const validSignature = generateWebhookSignature(webhookData);
      const response = await automationClient.post('/api/webhooks/incoming', webhookData, {
        headers: {
          'X-Webhook-Signature': validSignature,
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Media Upload and Processing Pipeline', () => {
    it('should download and upload images from scraped data', async () => {
      const imageUrls = [
        'https://via.placeholder.com/600x400/FF0000/FFFFFF?text=Test+Image+1',
        'https://via.placeholder.com/600x400/00FF00/FFFFFF?text=Test+Image+2',
      ];

      const response = await automationClient.post('/api/media/process-images', {
        urls: imageUrls,
        productId: 'test-product-123',
        transformations: {
          resize: { width: 800, height: 600 },
          format: 'webp',
          quality: 85,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.processedImages)).toBe(true);
      expect(response.data.processedImages).toHaveLength(2);

      // Track for cleanup
      uploadedMedia.push(...response.data.processedImages.map((img: MediaFile) => img.id));

      // Verify images were uploaded to CMS
      for (const image of response.data.processedImages) {
        const mediaResponse = await cmsClient.get(`/api/upload/files/${image.id}`, {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        });

        expect(mediaResponse.status).toBe(200);
        expect(mediaResponse.data.name).toBeTruthy();
        expect(mediaResponse.data.url).toBeTruthy();
      }
    });

    it('should handle image processing failures gracefully', async () => {
      const invalidImageUrls = [
        'https://invalid-domain-that-does-not-exist.com/image.jpg',
        'https://httpstat.us/404',
      ];

      const response = await automationClient.post('/api/media/process-images', {
        urls: invalidImageUrls,
        productId: 'test-product-failed',
      });

      expect(response.status).toBe(207); // Partial success
      expect(response.data.success).toBe(false);
      expect(response.data.errors).toBeDefined();
      expect(Array.isArray(response.data.errors)).toBe(true);
      expect(response.data.errors.length).toBeGreaterThan(0);
    });

    it('should process and optimize images for different formats', async () => {
      const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');
      
      // Create test image if it doesn't exist
      if (!fs.existsSync(testImagePath)) {
        // Create a simple test image (1x1 pixel)
        const testImageBuffer = Buffer.from([
          0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46,
          0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00,
          0xFF, 0xDB, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06,
          0x05, 0x08, 0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C,
          0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12, 0x13, 0x0F,
          0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
          0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28,
          0x37, 0x29, 0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
          0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF,
          0xD9
        ]);
        
        fs.mkdirSync(path.dirname(testImagePath), { recursive: true });
        fs.writeFileSync(testImagePath, testImageBuffer);
      }

      const formData = new FormData();
      formData.append('image', fs.createReadStream(testImagePath));
      formData.append('transformations', JSON.stringify({
        formats: ['webp', 'avif', 'jpeg'],
        sizes: [
          { width: 300, height: 300, suffix: 'thumb' },
          { width: 800, height: 600, suffix: 'medium' },
          { width: 1200, height: 900, suffix: 'large' },
        ],
      }));

      const response = await automationClient.post('/api/media/upload-and-optimize', formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.variants)).toBe(true);
      
      // Should create multiple variants
      const variants = response.data.variants;
      expect(variants.length).toBeGreaterThan(1);

      // Verify each variant has correct properties
      variants.forEach((variant: any) => {
        expect(variant.id).toBeDefined();
        expect(variant.url).toBeDefined();
        expect(variant.format).toMatch(/^(webp|avif|jpeg)$/);
        expect(variant.width).toBeGreaterThan(0);
        expect(variant.height).toBeGreaterThan(0);
      });

      // Track for cleanup
      uploadedMedia.push(...variants.map((v: any) => v.id));
    });
  });

  describe('SEO Content Generation and Publishing', () => {
    it('should generate SEO content for products', async () => {
      const productData = {
        name: 'Premium Wireless Mouse',
        description: 'Ergonomic wireless mouse with precision tracking',
        category: 'Electronics',
        specifications: {
          dpi: '3200',
          battery: 'Rechargeable Li-ion',
          connectivity: 'Bluetooth 5.0',
        },
        price: 45.99,
      };

      const response = await automationClient.post('/api/seo/generate-content', {
        product: productData,
        targetKeywords: ['wireless mouse', 'ergonomic mouse', 'bluetooth mouse'],
        contentTypes: ['title', 'description', 'keywords', 'structured-data'],
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      const seoContent = response.data.content;
      expect(seoContent.title).toBeDefined();
      expect(seoContent.title.length).toBeLessThanOrEqual(60);
      expect(seoContent.description).toBeDefined();
      expect(seoContent.description.length).toBeLessThanOrEqual(160);
      expect(Array.isArray(seoContent.keywords)).toBe(true);
      expect(seoContent.keywords.length).toBeGreaterThan(0);
      expect(seoContent.structuredData).toBeDefined();
      expect(seoContent.structuredData['@type']).toBe('Product');
    });

    it('should update product SEO data in CMS', async () => {
      // Create a test product first
      const productResponse = await cmsClient.post(
        '/api/products',
        {
          data: {
            name: 'SEO Test Product',
            description: 'Product for SEO testing',
            price: 29.99,
            slug: `seo-test-${Date.now()}`,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const productId = productResponse.data.data.id;
      createdProducts.push(productId);

      // Generate and apply SEO content
      const seoResponse = await automationClient.post('/api/seo/apply-to-product', {
        productId: productId,
        targetKeywords: ['test product', 'seo optimization'],
        autoPublish: false,
      });

      expect(seoResponse.status).toBe(200);
      expect(seoResponse.data.success).toBe(true);

      // Verify SEO content was applied
      const updatedProduct = await cmsClient.get(`/api/products/${productId}`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      const product = updatedProduct.data.data;
      expect(product.attributes.seoTitle).toBeDefined();
      expect(product.attributes.seoDescription).toBeDefined();
      expect(product.attributes.keywords).toBeDefined();
      expect(Array.isArray(product.attributes.keywords)).toBe(true);
    });
  });

  describe('Error Handling for Malformed Automation Data', () => {
    it('should validate automation payloads', async () => {
      const invalidPayloads = [
        {}, // Empty object
        { name: 'Product without required fields' },
        { price: 'invalid-price-type' },
        { images: 'not-an-array' },
        null,
        undefined,
      ];

      for (const payload of invalidPayloads) {
        await expect(
          automationClient.post('/api/products/create-from-scraped', {
            data: payload,
          })
        ).rejects.toMatchObject({
          response: {
            status: 400,
          },
        });
      }
    });

    it('should handle CMS connection failures', async () => {
      // Simulate CMS downtime by using invalid CMS URL in automation config
      const response = await automationClient.post('/api/test/cms-connectivity', {
        cmsUrl: 'http://invalid-cms-url:9999',
        timeout: 5000,
      });

      expect(response.status).toBe(200);
      expect(response.data.connected).toBe(false);
      expect(response.data.error).toBeDefined();
    });

    it('should implement retry mechanisms for failed operations', async () => {
      const retryableOperation = {
        type: 'product-creation',
        data: {
          name: 'Retry Test Product',
          description: 'Product to test retry mechanism',
          price: 19.99,
        },
        retryConfig: {
          maxRetries: 3,
          retryDelay: 1000,
          exponentialBackoff: true,
        },
      };

      const response = await automationClient.post('/api/operations/with-retry', retryableOperation);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.attempts).toBeGreaterThanOrEqual(1);
      expect(response.data.attempts).toBeLessThanOrEqual(4);

      if (response.data.productId) {
        createdProducts.push(response.data.productId);
      }
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

  async function authenticateAdmin(): Promise<string> {
    const response = await cmsClient.post('/api/auth/local', {
      identifier: 'admin@example.com',
      password: 'adminpassword123',
    });

    return response.data.jwt;
  }

  async function setupWebhookTestServer(): Promise<void> {
    const express = require('express');
    const app = express();
    
    app.use(express.json());
    
    app.post('/webhook-test', (req: any, res: any) => {
      webhookEventEmitter.emit('webhook.processed', req.body);
      res.json({ received: true });
    });

    testWebhookServer = app.listen(3099);
  }

  async function setupTestData(): Promise<void> {
    // Create test categories
    try {
      await cmsClient.post(
        '/api/categories',
        {
          data: {
            name: 'Electronics',
            slug: 'electronics',
            description: 'Electronic products for testing',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );
    } catch (error) {
      // Category might already exist
    }

    // Create test brands
    try {
      await cmsClient.post(
        '/api/brands',
        {
          data: {
            name: 'TestBrand',
            slug: 'testbrand',
            description: 'Test brand for automation testing',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );
    } catch (error) {
      // Brand might already exist
    }
  }

  function generateWebhookSignature(payload: any): string {
    const crypto = require('crypto');
    const secret = process.env.WEBHOOK_SECRET || 'test-webhook-secret';
    const payloadString = JSON.stringify(payload);
    
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }

  async function cleanupTestData(): Promise<void> {
    // Delete created products
    for (const productId of createdProducts) {
      try {
        await cmsClient.delete(`/api/products/${productId}`, {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        });
      } catch (error) {
        console.warn(`Failed to delete product ${productId}:`, error.message);
      }
    }

    // Delete uploaded media
    for (const mediaId of uploadedMedia) {
      try {
        await cmsClient.delete(`/api/upload/files/${mediaId}`, {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        });
      } catch (error) {
        console.warn(`Failed to delete media ${mediaId}:`, error.message);
      }
    }
  }
});