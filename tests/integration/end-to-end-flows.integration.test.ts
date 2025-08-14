/**
 * End-to-End Data Flow Integration Tests
 * Tests complete product journey, order lifecycle, inventory management, and customer workflows
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';
import { WebDriver, Builder, By, until, Key } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import { google } from 'googleapis';

// Test configuration
const CMS_URL = process.env.CMS_URL || 'http://localhost:1338';
const WEB_URL = process.env.WEB_URL || 'http://localhost:3001';
const AUTOMATION_URL = process.env.AUTOMATION_URL || 'http://localhost:3002';
const TRACKING_URL = process.env.TRACKING_URL || 'http://localhost:3003';
const TEST_TIMEOUT = 60000;

interface ProductJourney {
  scrapingData: any;
  cmsProduct: any;
  webProduct: any;
  userInteractions: any[];
  orderData: any;
  trackingEvents: any[];
}

interface OrderLifecycle {
  orderId: string;
  userId: string;
  status: string;
  timeline: Array<{
    status: string;
    timestamp: string;
    metadata: any;
  }>;
  fulfillmentData: any;
}

describe('End-to-End Data Flow Integration Tests', () => {
  let cmsClient: AxiosInstance;
  let webClient: AxiosInstance;
  let automationClient: AxiosInstance;
  let trackingClient: AxiosInstance;
  let driver: WebDriver;
  let adminToken: string;
  let testUser: any;
  let testJourneys: ProductJourney[] = [];
  let testOrders: OrderLifecycle[] = [];

  beforeAll(async () => {
    // Initialize API clients
    cmsClient = axios.create({
      baseURL: CMS_URL,
      timeout: TEST_TIMEOUT,
    });

    webClient = axios.create({
      baseURL: WEB_URL,
      timeout: TEST_TIMEOUT,
    });

    automationClient = axios.create({
      baseURL: AUTOMATION_URL,
      timeout: TEST_TIMEOUT,
    });

    trackingClient = axios.create({
      baseURL: TRACKING_URL,
      timeout: TEST_TIMEOUT,
    });

    // Initialize WebDriver
    const options = new chrome.Options();
    options.addArguments('--headless');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--window-size=1920,1080');
    
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    // Wait for all services
    await Promise.all([
      waitForService(CMS_URL, '/_health'),
      waitForService(WEB_URL, '/api/health'),
      waitForService(AUTOMATION_URL, '/health'),
      waitForService(TRACKING_URL, '/health'),
    ]);

    // Setup authentication
    adminToken = await authenticateAdmin();
    testUser = await createTestUser();

    // Initialize tracking
    await initializeTracking();
  }, 120000);

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
    
    // Close WebDriver
    if (driver) {
      await driver.quit();
    }
  });

  beforeEach(async () => {
    // Reset browser state
    await driver.manage().deleteAllCookies();
  });

  afterEach(async () => {
    // Clean up any test-specific data
  });

  describe('Complete Product Journey from Scraping to Display', () => {
    it('should handle full product lifecycle: scraping → CMS → frontend display', async () => {
      const journey: ProductJourney = {
        scrapingData: null,
        cmsProduct: null,
        webProduct: null,
        userInteractions: [],
        orderData: null,
        trackingEvents: [],
      };

      // Step 1: Simulate product scraping
      const scrapedProductData = {
        name: 'Premium Wireless Earbuds E2E Test',
        description: 'High-quality wireless earbuds with active noise cancellation for end-to-end testing',
        price: 129.99,
        originalUrl: 'https://example-store.com/premium-earbuds-e2e',
        images: [
          'https://via.placeholder.com/800x600/4169E1/FFFFFF?text=Earbuds+Front',
          'https://via.placeholder.com/800x600/28A745/FFFFFF?text=Earbuds+Side',
          'https://via.placeholder.com/800x600/DC3545/FFFFFF?text=Earbuds+Case',
        ],
        specifications: {
          brand: 'E2E Test Brand',
          model: 'ETB-E2E-001',
          batteryLife: '8 hours',
          chargingCase: '32 hours total',
          connectivity: 'Bluetooth 5.2',
          features: ['Active Noise Cancellation', 'Wireless Charging', 'IPX7 Waterproof'],
          weight: '5.2g per earbud',
        },
        category: 'Electronics',
        subcategory: 'Audio',
        availability: true,
        seoData: {
          title: 'Premium Wireless Earbuds - Active Noise Cancellation | E2E Test Store',
          description: 'Experience superior sound quality with our premium wireless earbuds featuring active noise cancellation and 32-hour battery life.',
          keywords: ['wireless earbuds', 'bluetooth headphones', 'noise cancellation', 'premium audio'],
        },
        metadata: {
          scrapedAt: new Date().toISOString(),
          source: 'automation-e2e-test',
          confidence: 0.95,
        },
      };

      journey.scrapingData = scrapedProductData;

      // Step 2: Send scraped data to automation service
      const automationResponse = await automationClient.post('/api/products/create-from-scraped', {
        data: scrapedProductData,
        source: 'e2e-test',
        processingOptions: {
          autoPublish: false,
          generateSeo: true,
          optimizeImages: true,
          createVariants: true,
        },
      });

      expect(automationResponse.status).toBe(201);
      expect(automationResponse.data.success).toBe(true);
      expect(automationResponse.data.productId).toBeDefined();

      const productId = automationResponse.data.productId;

      // Step 3: Wait for automation processing and verify in CMS
      await new Promise(resolve => setTimeout(resolve, 5000));

      const cmsProductResponse = await cmsClient.get(`/api/products/${productId}?populate=*`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(cmsProductResponse.status).toBe(200);
      const cmsProduct = cmsProductResponse.data.data;
      journey.cmsProduct = cmsProduct;

      expect(cmsProduct.attributes.name).toBe(scrapedProductData.name);
      expect(cmsProduct.attributes.price).toBe(scrapedProductData.price);
      expect(cmsProduct.attributes.seoTitle).toBe(scrapedProductData.seoData.title);
      expect(cmsProduct.attributes.images).toBeDefined();
      expect(Array.isArray(cmsProduct.attributes.images.data)).toBe(true);

      // Step 4: Publish product in CMS
      await cmsClient.put(
        `/api/products/${productId}`,
        {
          data: {
            publishedAt: new Date().toISOString(),
          },
        },
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      // Step 5: Wait for cache invalidation and verify on frontend
      await new Promise(resolve => setTimeout(resolve, 3000));

      await driver.get(`${WEB_URL}/products/${cmsProduct.attributes.slug}`);
      
      // Wait for product page to load
      await driver.wait(until.elementLocated(By.css('[data-testid="product-name"]')), 10000);

      const productName = await driver.findElement(By.css('[data-testid="product-name"]')).getText();
      const productPrice = await driver.findElement(By.css('[data-testid="product-price"]')).getText();
      const productDescription = await driver.findElement(By.css('[data-testid="product-description"]')).getText();

      expect(productName).toBe(scrapedProductData.name);
      expect(productPrice).toContain('129.99');
      expect(productDescription).toContain(scrapedProductData.description);

      // Verify images are displayed
      const productImages = await driver.findElements(By.css('[data-testid="product-image"]'));
      expect(productImages.length).toBeGreaterThan(0);

      // Step 6: Test user interactions and tracking
      const userId = `e2e-user-${Date.now()}`;
      const sessionId = `e2e-session-${Date.now()}`;

      // Simulate user viewing product
      await trackingClient.post('/api/journey/track', {
        userId,
        sessionId,
        event: 'product_view',
        page: `/products/${cmsProduct.attributes.slug}`,
        timestamp: new Date().toISOString(),
        metadata: {
          productId: productId,
          productName: scrapedProductData.name,
          price: scrapedProductData.price,
          category: scrapedProductData.category,
          source: 'e2e-test',
        },
      });

      journey.userInteractions.push({
        event: 'product_view',
        timestamp: new Date().toISOString(),
        userId,
        sessionId,
      });

      // Step 7: Verify tracking data
      await new Promise(resolve => setTimeout(resolve, 2000));

      const trackingData = await trackingClient.get(`/api/journey/user/${userId}`, {
        params: {
          timeRange: '1h',
        },
      });

      expect(trackingData.status).toBe(200);
      expect(Array.isArray(trackingData.data.events)).toBe(true);
      expect(trackingData.data.events.length).toBeGreaterThan(0);

      const productViewEvent = trackingData.data.events.find((e: any) => e.event === 'product_view');
      expect(productViewEvent).toBeDefined();
      expect(productViewEvent.metadata.productId).toBe(productId);

      journey.trackingEvents = trackingData.data.events;
      testJourneys.push(journey);

      console.log('✅ Complete product journey test passed');
    });

    it('should handle product updates and propagate changes across systems', async () => {
      // Use product from previous test
      const journey = testJourneys[0];
      if (!journey) {
        throw new Error('No product journey found from previous test');
      }

      const productId = journey.cmsProduct.id;
      const originalPrice = journey.cmsProduct.attributes.price;
      const newPrice = originalPrice * 1.15; // 15% price increase

      // Step 1: Update product price in CMS
      await cmsClient.put(
        `/api/products/${productId}`,
        {
          data: {
            price: newPrice,
            lastModified: new Date().toISOString(),
          },
        },
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      // Step 2: Wait for change propagation
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Step 3: Verify price update on frontend
      await driver.get(`${WEB_URL}/products/${journey.cmsProduct.attributes.slug}`);
      await driver.wait(until.elementLocated(By.css('[data-testid="product-price"]')), 10000);

      const updatedPrice = await driver.findElement(By.css('[data-testid="product-price"]')).getText();
      expect(updatedPrice).toContain(newPrice.toFixed(2));

      // Step 4: Verify tracking of price change
      const priceChangeEvent = await trackingClient.post('/api/events/track', {
        event: 'product_price_changed',
        productId: productId,
        data: {
          oldPrice: originalPrice,
          newPrice: newPrice,
          changePercentage: ((newPrice - originalPrice) / originalPrice * 100).toFixed(2),
        },
        timestamp: new Date().toISOString(),
        source: 'cms',
      });

      expect(priceChangeEvent.status).toBe(200);

      console.log('✅ Product update propagation test passed');
    });
  });

  describe('User Order Lifecycle from Cart to Fulfillment Tracking', () => {
    it('should handle complete order flow: cart → checkout → payment → fulfillment', async () => {
      const orderLifecycle: OrderLifecycle = {
        orderId: '',
        userId: testUser.user.id,
        status: 'pending',
        timeline: [],
        fulfillmentData: null,
      };

      // Step 1: Navigate to product and add to cart
      const journey = testJourneys[0];
      if (!journey) {
        throw new Error('No product journey found');
      }

      await driver.get(`${WEB_URL}/products/${journey.cmsProduct.attributes.slug}`);
      await driver.wait(until.elementLocated(By.css('[data-testid="add-to-cart-button"]')), 10000);

      // Add to cart
      await driver.findElement(By.css('[data-testid="add-to-cart-button"]')).click();
      
      // Wait for cart update
      await driver.wait(until.elementLocated(By.css('[data-testid="cart-item-count"]')), 5000);
      
      const cartCount = await driver.findElement(By.css('[data-testid="cart-item-count"]')).getText();
      expect(parseInt(cartCount)).toBeGreaterThan(0);

      // Track add to cart event
      await trackingClient.post('/api/journey/track', {
        userId: orderLifecycle.userId,
        sessionId: `order-session-${Date.now()}`,
        event: 'add_to_cart',
        page: `/products/${journey.cmsProduct.attributes.slug}`,
        timestamp: new Date().toISOString(),
        metadata: {
          productId: journey.cmsProduct.id,
          quantity: 1,
          price: journey.cmsProduct.attributes.price,
        },
      });

      orderLifecycle.timeline.push({
        status: 'cart_updated',
        timestamp: new Date().toISOString(),
        metadata: { productId: journey.cmsProduct.id, quantity: 1 },
      });

      // Step 2: Navigate to cart
      await driver.findElement(By.css('[data-testid="cart-button"]')).click();
      await driver.wait(until.elementLocated(By.css('[data-testid="cart-items"]')), 5000);

      // Verify cart contents
      const cartItems = await driver.findElements(By.css('[data-testid="cart-item"]'));
      expect(cartItems.length).toBeGreaterThan(0);

      // Step 3: Proceed to checkout
      await driver.findElement(By.css('[data-testid="checkout-button"]')).click();
      await driver.wait(until.elementLocated(By.css('[data-testid="checkout-form"]')), 10000);

      // Fill checkout form
      await driver.findElement(By.name('email')).sendKeys(testUser.user.email);
      await driver.findElement(By.name('firstName')).sendKeys('Test');
      await driver.findElement(By.name('lastName')).sendKeys('User');
      await driver.findElement(By.name('address')).sendKeys('123 Test Street');
      await driver.findElement(By.name('city')).sendKeys('Test City');
      await driver.findElement(By.name('state')).sendKeys('TS');
      await driver.findElement(By.name('zipCode')).sendKeys('12345');
      await driver.findElement(By.name('phone')).sendKeys('+1234567890');

      // Track checkout started
      await trackingClient.post('/api/journey/track', {
        userId: orderLifecycle.userId,
        sessionId: `order-session-${Date.now()}`,
        event: 'checkout_started',
        page: '/checkout',
        timestamp: new Date().toISOString(),
        metadata: {
          cartValue: journey.cmsProduct.attributes.price,
          itemCount: 1,
        },
      });

      orderLifecycle.timeline.push({
        status: 'checkout_started',
        timestamp: new Date().toISOString(),
        metadata: { cartValue: journey.cmsProduct.attributes.price },
      });

      // Step 4: Select payment method
      await driver.findElement(By.css('[data-testid="payment-method-card"]')).click();
      
      // Fill payment details (test data)
      await driver.findElement(By.name('cardNumber')).sendKeys('4242424242424242');
      await driver.findElement(By.name('expiryDate')).sendKeys('12/25');
      await driver.findElement(By.name('cvv')).sendKeys('123');
      await driver.findElement(By.name('cardName')).sendKeys('Test User');

      // Step 5: Place order
      await driver.findElement(By.css('[data-testid="place-order-button"]')).click();
      
      // Wait for order confirmation
      await driver.wait(until.elementLocated(By.css('[data-testid="order-confirmation"]')), 15000);

      const orderNumber = await driver.findElement(By.css('[data-testid="order-number"]')).getText();
      expect(orderNumber).toBeTruthy();

      orderLifecycle.orderId = orderNumber;

      // Step 6: Track order creation
      const orderData = {
        orderId: orderNumber,
        userId: orderLifecycle.userId,
        products: [{
          productId: journey.cmsProduct.id,
          quantity: 1,
          price: journey.cmsProduct.attributes.price,
        }],
        total: journey.cmsProduct.attributes.price,
        status: 'confirmed',
        shippingAddress: {
          street: '123 Test Street',
          city: 'Test City',
          state: 'TS',
          zip: '12345',
          country: 'US',
        },
        paymentMethod: 'credit_card',
        timestamp: new Date().toISOString(),
      };

      const orderTrackingResponse = await trackingClient.post('/api/orders/track', orderData);
      expect(orderTrackingResponse.status).toBe(200);

      orderLifecycle.timeline.push({
        status: 'confirmed',
        timestamp: new Date().toISOString(),
        metadata: orderData,
      });

      // Step 7: Simulate order fulfillment stages
      const fulfillmentStages = [
        { status: 'processing', delay: 2000 },
        { status: 'packed', delay: 3000 },
        { status: 'shipped', delay: 2000 },
        { status: 'in_transit', delay: 1000 },
        { status: 'delivered', delay: 1000 },
      ];

      for (const stage of fulfillmentStages) {
        await new Promise(resolve => setTimeout(resolve, stage.delay));

        // Update order status
        const fulfillmentUpdate = await trackingClient.put(`/api/orders/${orderNumber}/status`, {
          status: stage.status,
          timestamp: new Date().toISOString(),
          metadata: {
            updatedBy: 'fulfillment-system',
            location: stage.status === 'shipped' ? 'Warehouse A' : undefined,
            trackingNumber: stage.status === 'shipped' ? `TRK${Date.now()}` : undefined,
          },
        });

        expect(fulfillmentUpdate.status).toBe(200);

        orderLifecycle.timeline.push({
          status: stage.status,
          timestamp: new Date().toISOString(),
          metadata: fulfillmentUpdate.data,
        });
      }

      // Step 8: Verify complete order timeline
      const orderTimeline = await trackingClient.get(`/api/orders/${orderNumber}/timeline`);
      expect(orderTimeline.status).toBe(200);
      expect(Array.isArray(orderTimeline.data.timeline)).toBe(true);
      expect(orderTimeline.data.timeline.length).toBeGreaterThanOrEqual(5);

      // Verify all expected statuses are present
      const statuses = orderTimeline.data.timeline.map((t: any) => t.status);
      const expectedStatuses = ['confirmed', 'processing', 'packed', 'shipped', 'delivered'];
      expectedStatuses.forEach(status => {
        expect(statuses).toContain(status);
      });

      testOrders.push(orderLifecycle);

      console.log('✅ Complete order lifecycle test passed');
    });

    it('should handle order cancellation and refund flow', async () => {
      // Create a new order for cancellation testing
      const cancelOrderData = {
        orderId: `cancel-test-${Date.now()}`,
        userId: testUser.user.id,
        products: [{
          productId: testJourneys[0].cmsProduct.id,
          quantity: 2,
          price: testJourneys[0].cmsProduct.attributes.price,
        }],
        total: testJourneys[0].cmsProduct.attributes.price * 2,
        status: 'confirmed',
        paymentMethod: 'credit_card',
        timestamp: new Date().toISOString(),
      };

      // Create order
      await trackingClient.post('/api/orders/track', cancelOrderData);

      // Wait for order processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Cancel order
      const cancellationResponse = await trackingClient.post(`/api/orders/${cancelOrderData.orderId}/cancel`, {
        reason: 'customer_request',
        timestamp: new Date().toISOString(),
        refundAmount: cancelOrderData.total,
      });

      expect(cancellationResponse.status).toBe(200);
      expect(cancellationResponse.data.cancelled).toBe(true);

      // Verify cancellation in timeline
      const cancelledOrderTimeline = await trackingClient.get(`/api/orders/${cancelOrderData.orderId}/timeline`);
      const cancellationEvent = cancelledOrderTimeline.data.timeline.find((t: any) => t.status === 'cancelled');
      expect(cancellationEvent).toBeDefined();

      console.log('✅ Order cancellation flow test passed');
    });
  });

  describe('Inventory Management Across All Systems', () => {
    it('should synchronize inventory levels across systems', async () => {
      const journey = testJourneys[0];
      const productId = journey.cmsProduct.id;

      // Step 1: Get initial inventory from CMS
      const initialInventory = await cmsClient.get(`/api/products/${productId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const initialStock = initialInventory.data.data.attributes.inventory;

      // Step 2: Simulate inventory reduction from order
      const inventoryUpdate = await cmsClient.put(
        `/api/products/${productId}`,
        {
          data: {
            inventory: initialStock - 5,
            lastInventoryUpdate: new Date().toISOString(),
          },
        },
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      expect(inventoryUpdate.status).toBe(200);

      // Step 3: Wait for propagation to tracking system
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Step 4: Verify inventory tracking
      const inventoryTrackingResponse = await trackingClient.get(`/api/inventory/${productId}`);
      expect(inventoryTrackingResponse.status).toBe(200);
      expect(inventoryTrackingResponse.data.currentStock).toBe(initialStock - 5);

      // Step 5: Verify low stock alert if applicable
      if (initialStock - 5 <= 10) {
        const alerts = await trackingClient.get('/api/alerts/inventory', {
          params: { productId },
        });

        expect(alerts.status).toBe(200);
        const lowStockAlert = alerts.data.alerts.find((a: any) => a.type === 'low_stock');
        expect(lowStockAlert).toBeDefined();
      }

      // Step 6: Test automatic inventory reorder
      if (initialStock - 5 <= 5) {
        const reorderResponse = await automationClient.post('/api/inventory/reorder', {
          productId,
          quantity: 50,
          priority: 'high',
        });

        expect(reorderResponse.status).toBe(200);
        expect(reorderResponse.data.reorderInitiated).toBe(true);
      }

      console.log('✅ Inventory synchronization test passed');
    });

    it('should handle inventory conflicts and resolve them', async () => {
      const journey = testJourneys[0];
      const productId = journey.cmsProduct.id;

      // Create concurrent inventory updates
      const updates = [
        cmsClient.put(
          `/api/products/${productId}`,
          { data: { inventory: 50 } },
          { headers: { Authorization: `Bearer ${adminToken}` } }
        ),
        trackingClient.put(`/api/inventory/${productId}`, {
          stock: 45,
          source: 'warehouse_system',
        }),
        automationClient.put(`/api/products/${productId}/inventory`, {
          quantity: 48,
          source: 'scraping_update',
        }),
      ];

      // Execute concurrent updates
      const results = await Promise.allSettled(updates);

      // At least one should succeed
      const successfulUpdates = results.filter(r => r.status === 'fulfilled');
      expect(successfulUpdates.length).toBeGreaterThan(0);

      // Wait for conflict resolution
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Verify final inventory state
      const finalInventory = await cmsClient.get(`/api/products/${productId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(finalInventory.data.data.attributes.inventory).toBeDefined();
      expect(typeof finalInventory.data.data.attributes.inventory).toBe('number');

      // Check conflict resolution log
      const conflictLog = await trackingClient.get(`/api/conflicts/inventory/${productId}`);
      if (conflictLog.status === 200) {
        expect(conflictLog.data.resolved).toBe(true);
        expect(conflictLog.data.strategy).toBeDefined();
      }

      console.log('✅ Inventory conflict resolution test passed');
    });
  });

  describe('Customer Support Workflow Integration', () => {
    it('should integrate customer support tickets with order and product data', async () => {
      const order = testOrders[0];
      if (!order) {
        throw new Error('No order found for support ticket test');
      }

      // Step 1: Create support ticket
      const supportTicket = {
        orderId: order.orderId,
        userId: order.userId,
        subject: 'Product quality issue',
        description: 'The product received has a manufacturing defect',
        priority: 'medium',
        category: 'product_issue',
        timestamp: new Date().toISOString(),
      };

      const ticketResponse = await trackingClient.post('/api/support/tickets', supportTicket);
      expect(ticketResponse.status).toBe(201);
      expect(ticketResponse.data.ticketId).toBeDefined();

      const ticketId = ticketResponse.data.ticketId;

      // Step 2: Verify support agent can access order and product data
      const ticketDetails = await trackingClient.get(`/api/support/tickets/${ticketId}/details`);
      expect(ticketDetails.status).toBe(200);
      expect(ticketDetails.data.order).toBeDefined();
      expect(ticketDetails.data.products).toBeDefined();
      expect(ticketDetails.data.userHistory).toBeDefined();

      // Step 3: Update ticket status and track resolution
      const statusUpdate = await trackingClient.put(`/api/support/tickets/${ticketId}`, {
        status: 'in_progress',
        assignedTo: 'support-agent-1',
        notes: 'Investigating product quality issue',
        timestamp: new Date().toISOString(),
      });

      expect(statusUpdate.status).toBe(200);

      // Step 4: Resolve ticket with refund
      const resolution = await trackingClient.put(`/api/support/tickets/${ticketId}/resolve`, {
        resolution: 'refund_issued',
        refundAmount: testJourneys[0].cmsProduct.attributes.price,
        notes: 'Refund processed for defective product',
        timestamp: new Date().toISOString(),
      });

      expect(resolution.status).toBe(200);

      // Step 5: Verify resolution is tracked in order history
      const updatedOrderTimeline = await trackingClient.get(`/api/orders/${order.orderId}/timeline`);
      const refundEvent = updatedOrderTimeline.data.timeline.find((t: any) => t.status === 'refunded');
      expect(refundEvent).toBeDefined();

      console.log('✅ Customer support workflow integration test passed');
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

  async function createTestUser(): Promise<any> {
    const userData = {
      username: `e2euser${Date.now()}`,
      email: `e2euser${Date.now()}@example.com`,
      password: 'testpassword123',
    };

    const response = await cmsClient.post('/api/auth/local/register', userData);
    return response.data;
  }

  async function initializeTracking(): Promise<void> {
    const initResponse = await trackingClient.post('/api/init', {
      googleSheets: { enabled: true },
      analytics: { enabled: true },
      notifications: { enabled: true },
    });

    expect(initResponse.status).toBe(200);
  }

  async function cleanupTestData(): Promise<void> {
    // Cleanup orders
    for (const order of testOrders) {
      try {
        await trackingClient.delete(`/api/orders/${order.orderId}`);
      } catch (error) {
        console.warn(`Failed to delete order ${order.orderId}:`, error.message);
      }
    }

    // Cleanup products
    for (const journey of testJourneys) {
      if (journey.cmsProduct) {
        try {
          await cmsClient.delete(`/api/products/${journey.cmsProduct.id}`, {
            headers: { Authorization: `Bearer ${adminToken}` },
          });
        } catch (error) {
          console.warn(`Failed to delete product ${journey.cmsProduct.id}:`, error.message);
        }
      }
    }

    // Cleanup test user
    if (testUser) {
      try {
        await cmsClient.delete(`/api/users/${testUser.user.id}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      } catch (error) {
        console.warn('Failed to delete test user:', error.message);
      }
    }
  }
});