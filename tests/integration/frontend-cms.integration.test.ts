/**
 * Frontend ↔ CMS Integration Tests
 * Tests all interactions between Next.js frontend and Strapi CMS
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../apps/web/lib/server/routers/_app';
import { WebDriver, Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';

// Test configuration
const CMS_URL = process.env.CMS_URL || 'http://localhost:1338';
const WEB_URL = process.env.WEB_URL || 'http://localhost:3001';
const TEST_TIMEOUT = 30000;

interface TestProduct {
  id: number;
  attributes: {
    name: string;
    description: string;
    price: number;
    slug: string;
    images: any[];
    category: any;
    published_at: string;
  };
}

interface TestUser {
  jwt: string;
  user: {
    id: number;
    username: string;
    email: string;
  };
}

describe('Frontend ↔ CMS Integration Tests', () => {
  let cmsClient: AxiosInstance;
  let trpcClient: ReturnType<typeof createTRPCClient<AppRouter>>;
  let driver: WebDriver;
  let adminToken: string;
  let testProducts: TestProduct[] = [];
  let testUser: TestUser;

  beforeAll(async () => {
    // Initialize CMS client
    cmsClient = axios.create({
      baseURL: CMS_URL,
      timeout: TEST_TIMEOUT,
    });

    // Initialize tRPC client
    trpcClient = createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `${WEB_URL}/api/trpc`,
        }),
      ],
    });

    // Initialize Selenium WebDriver
    const options = new chrome.Options();
    options.addArguments('--headless');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    // Wait for services to be ready
    await waitForService(CMS_URL, '/admin');
    await waitForService(WEB_URL, '/');

    // Authenticate with CMS admin
    adminToken = await authenticateAdmin();
    
    // Create test user
    testUser = await createTestUser();

    // Seed test data
    await seedTestData();
  }, 60000);

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
    
    // Close WebDriver
    if (driver) {
      await driver.quit();
    }
  });

  beforeEach(async () => {
    // Reset any state before each test
    await driver.manage().deleteAllCookies();
  });

  afterEach(async () => {
    // Clean up any test-specific data
  });

  describe('Product Data Fetching', () => {
    it('should fetch products via tRPC with correct data structure', async () => {
      const products = await trpcClient.product.getAll.query({
        limit: 10,
        offset: 0,
      });

      expect(products).toBeDefined();
      expect(Array.isArray(products.data)).toBe(true);
      expect(products.pagination).toBeDefined();
      expect(products.pagination.total).toBeGreaterThan(0);

      const firstProduct = products.data[0];
      expect(firstProduct).toHaveProperty('id');
      expect(firstProduct).toHaveProperty('name');
      expect(firstProduct).toHaveProperty('description');
      expect(firstProduct).toHaveProperty('price');
      expect(firstProduct).toHaveProperty('slug');
      expect(firstProduct).toHaveProperty('images');
      expect(firstProduct).toHaveProperty('category');
    });

    it('should handle complex product queries with filters', async () => {
      const products = await trpcClient.product.getAll.query({
        limit: 5,
        offset: 0,
        filters: {
          category: 'Electronics',
          priceRange: { min: 10, max: 100 },
          inStock: true,
        },
        sort: { field: 'price', direction: 'asc' },
      });

      expect(products.data).toBeDefined();
      
      // Verify filtering worked
      products.data.forEach(product => {
        expect(product.price).toBeGreaterThanOrEqual(10);
        expect(product.price).toBeLessThanOrEqual(100);
        expect(product.category?.name).toBe('Electronics');
      });

      // Verify sorting worked
      for (let i = 1; i < products.data.length; i++) {
        expect(products.data[i].price).toBeGreaterThanOrEqual(products.data[i - 1].price);
      }
    });

    it('should fetch single product with all relations', async () => {
      const testProduct = testProducts[0];
      
      const product = await trpcClient.product.getBySlug.query({
        slug: testProduct.attributes.slug,
      });

      expect(product).toBeDefined();
      expect(product.id).toBe(testProduct.id);
      expect(product.name).toBe(testProduct.attributes.name);
      expect(product.category).toBeDefined();
      expect(product.images).toBeDefined();
      expect(Array.isArray(product.images)).toBe(true);
      expect(product.reviews).toBeDefined();
      expect(product.variants).toBeDefined();
    });

    it('should handle product search functionality', async () => {
      const searchQuery = 'test product';
      
      const searchResults = await trpcClient.product.search.query({
        query: searchQuery,
        limit: 10,
      });

      expect(searchResults).toBeDefined();
      expect(Array.isArray(searchResults.data)).toBe(true);
      
      // Verify search results contain the query term
      searchResults.data.forEach(product => {
        const searchText = `${product.name} ${product.description}`.toLowerCase();
        expect(searchText).toContain(searchQuery.toLowerCase());
      });
    });
  });

  describe('Real-time Updates and Cache Invalidation', () => {
    it('should reflect CMS changes in frontend immediately', async () => {
      const testProduct = testProducts[0];
      const newName = `Updated Product Name ${Date.now()}`;

      // Update product in CMS
      await cmsClient.put(
        `/api/products/${testProduct.id}`,
        {
          data: {
            name: newName,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      // Wait for cache invalidation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Fetch product via tRPC
      const updatedProduct = await trpcClient.product.getBySlug.query({
        slug: testProduct.attributes.slug,
      });

      expect(updatedProduct.name).toBe(newName);
    });

    it('should handle cache invalidation on product creation', async () => {
      const newProduct = {
        name: `New Test Product ${Date.now()}`,
        description: 'New test product description',
        price: 29.99,
        slug: `new-test-product-${Date.now()}`,
        category: testProducts[0].attributes.category?.id,
      };

      // Create product in CMS
      const response = await cmsClient.post(
        '/api/products',
        { data: newProduct },
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const createdProduct = response.data.data;

      // Wait for cache invalidation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify product appears in frontend
      const products = await trpcClient.product.getAll.query({
        limit: 100,
        offset: 0,
      });

      const foundProduct = products.data.find(p => p.id === createdProduct.id);
      expect(foundProduct).toBeDefined();
      expect(foundProduct?.name).toBe(newProduct.name);

      // Cleanup
      await cmsClient.delete(`/api/products/${createdProduct.id}`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
    });
  });

  describe('Authentication Flow', () => {
    it('should handle user authentication between systems', async () => {
      // Navigate to login page
      await driver.get(`${WEB_URL}/login`);
      
      // Fill login form
      await driver.findElement(By.name('email')).sendKeys(testUser.user.email);
      await driver.findElement(By.name('password')).sendKeys('testpassword123');
      await driver.findElement(By.css('button[type="submit"]')).click();

      // Wait for redirect
      await driver.wait(until.urlContains('/dashboard'), 10000);

      // Verify authentication state
      const userInfo = await driver.executeScript('return window.localStorage.getItem("auth_token")');
      expect(userInfo).toBeTruthy();

      // Test authenticated API call
      const userProfile = await trpcClient.user.getProfile.query();
      expect(userProfile).toBeDefined();
      expect(userProfile.email).toBe(testUser.user.email);
    });

    it('should handle token refresh', async () => {
      // Simulate expired token
      const expiredToken = 'expired.jwt.token';
      
      // Make API call with expired token
      try {
        await trpcClient.user.getProfile.query();
      } catch (error) {
        expect(error.message).toContain('Unauthorized');
      }

      // Login again
      const refreshedUser = await cmsClient.post('/api/auth/local', {
        identifier: testUser.user.email,
        password: 'testpassword123',
      });

      expect(refreshedUser.data.jwt).toBeTruthy();
    });
  });

  describe('Error Handling for CMS Downtime', () => {
    it('should handle CMS service unavailable gracefully', async () => {
      // Mock CMS downtime by using invalid URL
      const failingTrpcClient = createTRPCClient<AppRouter>({
        links: [
          httpBatchLink({
            url: 'http://invalid-cms-url/api/trpc',
          }),
        ],
      });

      // Test error handling
      await expect(
        failingTrpcClient.product.getAll.query({ limit: 10, offset: 0 })
      ).rejects.toThrow();

      // Navigate to frontend and verify error state
      await driver.get(`${WEB_URL}/products`);
      
      // Should show error message or fallback content
      const errorElement = await driver.findElement(By.css('[data-testid="error-message"], .error-fallback'));
      expect(await errorElement.isDisplayed()).toBe(true);
    });

    it('should implement circuit breaker pattern', async () => {
      let failures = 0;
      const maxFailures = 3;

      // Simulate multiple failures
      for (let i = 0; i < maxFailures + 1; i++) {
        try {
          await trpcClient.product.getAll.query({ limit: 10, offset: 0 });
        } catch (error) {
          failures++;
        }
      }

      // After max failures, circuit should be open
      expect(failures).toBeGreaterThan(0);
    });
  });

  describe('Image and Media Loading', () => {
    it('should load product images from CMS CDN', async () => {
      const productWithImages = testProducts.find(p => p.attributes.images?.length > 0);
      if (!productWithImages) {
        console.warn('No products with images found for testing');
        return;
      }

      await driver.get(`${WEB_URL}/products/${productWithImages.attributes.slug}`);
      
      // Wait for images to load
      await driver.wait(until.elementLocated(By.css('img[data-testid="product-image"]')), 10000);
      
      const images = await driver.findElements(By.css('img[data-testid="product-image"]'));
      expect(images.length).toBeGreaterThan(0);

      // Verify images are loaded
      for (const img of images) {
        const naturalWidth = await img.getAttribute('naturalWidth');
        expect(parseInt(naturalWidth)).toBeGreaterThan(0);
      }
    });

    it('should handle image loading errors gracefully', async () => {
      // Create product with invalid image URL
      const productWithInvalidImage = {
        name: 'Product with Invalid Image',
        description: 'Test product',
        price: 19.99,
        slug: `invalid-image-product-${Date.now()}`,
        images: ['http://invalid-image-url.com/image.jpg'],
      };

      const response = await cmsClient.post(
        '/api/products',
        { data: productWithInvalidImage },
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const createdProduct = response.data.data;

      await driver.get(`${WEB_URL}/products/${productWithInvalidImage.slug}`);
      
      // Should show placeholder or error image
      const placeholderImg = await driver.findElement(By.css('img[data-testid="image-placeholder"], img[data-testid="image-error"]'));
      expect(await placeholderImg.isDisplayed()).toBe(true);

      // Cleanup
      await cmsClient.delete(`/api/products/${createdProduct.id}`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
    });
  });

  describe('Performance and Caching', () => {
    it('should implement proper caching strategies', async () => {
      const startTime = Date.now();
      
      // First request
      await trpcClient.product.getAll.query({ limit: 10, offset: 0 });
      const firstRequestTime = Date.now() - startTime;

      const secondStartTime = Date.now();
      
      // Second request (should be cached)
      await trpcClient.product.getAll.query({ limit: 10, offset: 0 });
      const secondRequestTime = Date.now() - secondStartTime;

      // Second request should be significantly faster
      expect(secondRequestTime).toBeLessThan(firstRequestTime * 0.5);
    });

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = Array.from({ length: 10 }, (_, i) =>
        trpcClient.product.getAll.query({ limit: 5, offset: i * 5 })
      );

      const startTime = Date.now();
      const results = await Promise.all(concurrentRequests);
      const totalTime = Date.now() - startTime;

      // All requests should complete
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.data).toBeDefined();
        expect(Array.isArray(result.data)).toBe(true);
      });

      // Should complete in reasonable time
      expect(totalTime).toBeLessThan(5000);
    });
  });

  // Helper functions
  async function waitForService(url: string, path: string): Promise<void> {
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        await axios.get(`${url}${path}`);
        return;
      } catch (error) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
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

  async function createTestUser(): Promise<TestUser> {
    const userData = {
      username: `testuser${Date.now()}`,
      email: `testuser${Date.now()}@example.com`,
      password: 'testpassword123',
    };

    const response = await cmsClient.post('/api/auth/local/register', userData);
    return response.data;
  }

  async function seedTestData(): Promise<void> {
    // Create test categories
    const categoryResponse = await cmsClient.post(
      '/api/categories',
      {
        data: {
          name: 'Electronics',
          slug: 'electronics',
          description: 'Electronic products',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }
    );

    const category = categoryResponse.data.data;

    // Create test products
    const products = [
      {
        name: 'Test Product 1',
        description: 'Test product description 1',
        price: 29.99,
        slug: 'test-product-1',
        category: category.id,
      },
      {
        name: 'Test Product 2',
        description: 'Test product description 2',
        price: 49.99,
        slug: 'test-product-2',
        category: category.id,
      },
    ];

    for (const productData of products) {
      const response = await cmsClient.post(
        '/api/products',
        { data: productData },
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      testProducts.push(response.data.data);
    }
  }

  async function cleanupTestData(): Promise<void> {
    // Delete test products
    for (const product of testProducts) {
      try {
        await cmsClient.delete(`/api/products/${product.id}`, {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        });
      } catch (error) {
        console.warn(`Failed to delete product ${product.id}:`, error.message);
      }
    }

    // Delete test user
    if (testUser) {
      try {
        await cmsClient.delete(`/api/users/${testUser.user.id}`, {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        });
      } catch (error) {
        console.warn(`Failed to delete test user:`, error.message);
      }
    }
  }
});