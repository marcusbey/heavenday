/**
 * Database Integration Tests
 * Tests Prisma ORM across all applications, transactions, concurrent access, and data consistency
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';

// Test configuration
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test_user:test_password@localhost:5433/heaven_dolls_integration_test';
const TEST_TIMEOUT = 30000;

interface TestProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  categoryId: string;
  brandId?: string;
}

interface TestCategory {
  id: string;
  name: string;
  slug: string;
}

interface TestUser {
  id: string;
  email: string;
  username: string;
}

interface TestOrder {
  id: string;
  userId: string;
  total: number;
  status: string;
}

describe('Database Integration Tests', () => {
  let prisma: PrismaClient;
  let prismaWeb: PrismaClient;
  let prismaCms: PrismaClient;
  let prismaTracking: PrismaClient;
  let testData: {
    categories: TestCategory[];
    brands: any[];
    products: TestProduct[];
    users: TestUser[];
    orders: TestOrder[];
  };

  beforeAll(async () => {
    // Initialize Prisma clients for different applications
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: DATABASE_URL,
        },
      },
    });

    // Simulate different app connections
    prismaWeb = new PrismaClient({
      datasources: {
        db: {
          url: DATABASE_URL,
        },
      },
    });

    prismaCms = new PrismaClient({
      datasources: {
        db: {
          url: DATABASE_URL,
        },
      },
    });

    prismaTracking = new PrismaClient({
      datasources: {
        db: {
          url: DATABASE_URL,
        },
      },
    });

    // Reset database state
    await resetDatabase();

    // Initialize test data structure
    testData = {
      categories: [],
      brands: [],
      products: [],
      users: [],
      orders: [],
    };

    // Setup test schema and data
    await setupTestData();
  }, 60000);

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();

    // Disconnect all clients
    await prisma.$disconnect();
    await prismaWeb.$disconnect();
    await prismaCms.$disconnect();
    await prismaTracking.$disconnect();
  });

  beforeEach(async () => {
    // Begin test transaction if needed
  });

  afterEach(async () => {
    // Rollback test transaction if needed
  });

  describe('Prisma ORM Cross-Application Access', () => {
    it('should allow multiple applications to read the same data', async () => {
      const category = testData.categories[0];

      // Read from different Prisma clients simultaneously
      const [webCategory, cmsCategory, trackingCategory] = await Promise.all([
        prismaWeb.category.findUnique({ where: { id: category.id } }),
        prismaCms.category.findUnique({ where: { id: category.id } }),
        prismaTracking.category.findUnique({ where: { id: category.id } }),
      ]);

      // All should return the same data
      expect(webCategory).toEqual(cmsCategory);
      expect(cmsCategory).toEqual(trackingCategory);
      expect(webCategory?.name).toBe(category.name);
    });

    it('should handle concurrent writes from different applications', async () => {
      const testProduct = testData.products[0];

      // Concurrent updates from different apps
      const updates = [
        prismaWeb.product.update({
          where: { id: testProduct.id },
          data: { viewCount: { increment: 1 } },
        }),
        prismaCms.product.update({
          where: { id: testProduct.id },
          data: { lastModified: new Date() },
        }),
        prismaTracking.product.update({
          where: { id: testProduct.id },
          data: { trackingUpdated: new Date() },
        }),
      ];

      // All updates should succeed
      const results = await Promise.all(updates);
      
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.id).toBe(testProduct.id);
      });

      // Verify final state
      const finalProduct = await prisma.product.findUnique({
        where: { id: testProduct.id },
      });

      expect(finalProduct?.viewCount).toBeGreaterThan(0);
      expect(finalProduct?.lastModified).toBeDefined();
      expect(finalProduct?.trackingUpdated).toBeDefined();
    });

    it('should maintain data consistency across applications', async () => {
      const newProductData = {
        name: 'Cross-App Test Product',
        slug: `cross-app-product-${Date.now()}`,
        description: 'Product created for cross-app testing',
        price: 79.99,
        categoryId: testData.categories[0].id,
        brandId: testData.brands[0].id,
      };

      // Create product from CMS app
      const createdProduct = await prismaCms.product.create({
        data: newProductData,
      });

      testData.products.push(createdProduct);

      // Immediately read from different apps
      const [webProduct, trackingProduct] = await Promise.all([
        prismaWeb.product.findUnique({
          where: { id: createdProduct.id },
          include: { category: true, brand: true },
        }),
        prismaTracking.product.findUnique({
          where: { id: createdProduct.id },
          include: { category: true, brand: true },
        }),
      ]);

      // Data should be immediately available and consistent
      expect(webProduct).toBeDefined();
      expect(trackingProduct).toBeDefined();
      expect(webProduct?.name).toBe(newProductData.name);
      expect(trackingProduct?.name).toBe(newProductData.name);
      expect(webProduct?.category?.name).toBe(testData.categories[0].name);
    });
  });

  describe('Database Transaction Consistency', () => {
    it('should handle successful multi-table transactions', async () => {
      const orderData = {
        userId: testData.users[0].id,
        total: 149.99,
        status: 'pending',
        items: [
          {
            productId: testData.products[0].id,
            quantity: 2,
            price: testData.products[0].price,
          },
          {
            productId: testData.products[1].id,
            quantity: 1,
            price: testData.products[1].price,
          },
        ],
      };

      // Transaction: Create order and update inventory
      const result = await prisma.$transaction(async (tx) => {
        // Create order
        const order = await tx.order.create({
          data: {
            userId: orderData.userId,
            total: orderData.total,
            status: orderData.status,
          },
        });

        // Create order items and update inventory
        const orderItems = await Promise.all(
          orderData.items.map(async (item) => {
            // Create order item
            const orderItem = await tx.orderItem.create({
              data: {
                orderId: order.id,
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
              },
            });

            // Update product inventory
            await tx.product.update({
              where: { id: item.productId },
              data: {
                inventory: { decrement: item.quantity },
                soldCount: { increment: item.quantity },
              },
            });

            return orderItem;
          })
        );

        return { order, orderItems };
      });

      expect(result.order).toBeDefined();
      expect(result.orderItems).toHaveLength(2);
      
      testData.orders.push(result.order);

      // Verify inventory was updated
      for (const item of orderData.items) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });
        
        expect(product?.soldCount).toBeGreaterThan(0);
      }
    });

    it('should rollback failed transactions', async () => {
      const invalidOrderData = {
        userId: testData.users[0].id,
        total: 99.99,
        status: 'pending',
        items: [
          {
            productId: 'non-existent-product-id',
            quantity: 1,
            price: 99.99,
          },
        ],
      };

      // Get initial state
      const initialOrderCount = await prisma.order.count();
      const initialProduct = await prisma.product.findUnique({
        where: { id: testData.products[0].id },
      });

      // Transaction should fail and rollback
      await expect(
        prisma.$transaction(async (tx) => {
          // Create order
          const order = await tx.order.create({
            data: {
              userId: invalidOrderData.userId,
              total: invalidOrderData.total,
              status: invalidOrderData.status,
            },
          });

          // This should fail due to foreign key constraint
          await tx.orderItem.create({
            data: {
              orderId: order.id,
              productId: invalidOrderData.items[0].productId,
              quantity: invalidOrderData.items[0].quantity,
              price: invalidOrderData.items[0].price,
            },
          });

          // Update product (should be rolled back)
          await tx.product.update({
            where: { id: testData.products[0].id },
            data: { soldCount: { increment: 100 } },
          });

          return order;
        })
      ).rejects.toThrow();

      // Verify rollback
      const finalOrderCount = await prisma.order.count();
      const finalProduct = await prisma.product.findUnique({
        where: { id: testData.products[0].id },
      });

      expect(finalOrderCount).toBe(initialOrderCount);
      expect(finalProduct?.soldCount).toBe(initialProduct?.soldCount);
    });

    it('should handle nested transactions correctly', async () => {
      const result = await prisma.$transaction(async (tx) => {
        // Outer transaction: Create user
        const user = await tx.user.create({
          data: {
            email: `nested-tx-user-${Date.now()}@example.com`,
            username: `nested-user-${Date.now()}`,
            passwordHash: 'hashed-password',
          },
        });

        // Nested operation: Create user profile
        const profile = await tx.userProfile.create({
          data: {
            userId: user.id,
            firstName: 'Nested',
            lastName: 'User',
            phone: '+1234567890',
          },
        });

        // Another nested operation: Create user preferences
        const preferences = await tx.userPreference.create({
          data: {
            userId: user.id,
            newsletter: true,
            notifications: true,
            theme: 'light',
          },
        });

        return { user, profile, preferences };
      });

      expect(result.user).toBeDefined();
      expect(result.profile).toBeDefined();
      expect(result.preferences).toBeDefined();
      expect(result.profile.userId).toBe(result.user.id);
      expect(result.preferences.userId).toBe(result.user.id);

      testData.users.push(result.user);
    });
  });

  describe('Concurrent Data Access Patterns', () => {
    it('should handle high concurrent read operations', async () => {
      const concurrentReads = 50;
      const productId = testData.products[0].id;

      // Create many concurrent read operations
      const readOperations = Array.from({ length: concurrentReads }, (_, i) =>
        prisma.product.findUnique({
          where: { id: productId },
          include: {
            category: true,
            brand: true,
            reviews: true,
            variants: true,
          },
        })
      );

      const startTime = Date.now();
      const results = await Promise.all(readOperations);
      const endTime = Date.now();

      // All reads should succeed
      expect(results).toHaveLength(concurrentReads);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result?.id).toBe(productId);
      });

      // Should complete in reasonable time
      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should handle concurrent write operations with proper locking', async () => {
      const productId = testData.products[0].id;
      const concurrentWrites = 20;

      // Get initial view count
      const initialProduct = await prisma.product.findUnique({
        where: { id: productId },
      });
      const initialViewCount = initialProduct?.viewCount || 0;

      // Create concurrent write operations
      const writeOperations = Array.from({ length: concurrentWrites }, () =>
        prisma.product.update({
          where: { id: productId },
          data: { viewCount: { increment: 1 } },
        })
      );

      const results = await Promise.all(writeOperations);

      // All writes should succeed
      expect(results).toHaveLength(concurrentWrites);

      // Final count should be correct
      const finalProduct = await prisma.product.findUnique({
        where: { id: productId },
      });

      expect(finalProduct?.viewCount).toBe(initialViewCount + concurrentWrites);
    });

    it('should handle mixed read/write operations', async () => {
      const productId = testData.products[1].id;
      const operationCount = 30;

      // Mix of read and write operations
      const operations = Array.from({ length: operationCount }, (_, i) => {
        if (i % 3 === 0) {
          // Write operation
          return prisma.product.update({
            where: { id: productId },
            data: { viewCount: { increment: 1 } },
          });
        } else {
          // Read operation
          return prisma.product.findUnique({
            where: { id: productId },
            include: { category: true },
          });
        }
      });

      const results = await Promise.all(operations);

      expect(results).toHaveLength(operationCount);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.id).toBe(productId);
      });
    });
  });

  describe('Data Migration and Schema Updates', () => {
    it('should handle schema migrations without data loss', async () => {
      // Count existing records
      const initialCounts = {
        products: await prisma.product.count(),
        categories: await prisma.category.count(),
        users: await prisma.user.count(),
      };

      // Simulate migration by adding a new field (if not exists)
      try {
        await prisma.$executeRaw`
          ALTER TABLE products 
          ADD COLUMN IF NOT EXISTS migration_test_field VARCHAR(255)
        `;
      } catch (error) {
        // Field might already exist
      }

      // Verify data integrity after migration
      const finalCounts = {
        products: await prisma.product.count(),
        categories: await prisma.category.count(),
        users: await prisma.user.count(),
      };

      expect(finalCounts.products).toBe(initialCounts.products);
      expect(finalCounts.categories).toBe(initialCounts.categories);
      expect(finalCounts.users).toBe(initialCounts.users);

      // Test new field can be used
      const testProduct = testData.products[0];
      await prisma.product.update({
        where: { id: testProduct.id },
        data: { migrationTestField: 'migration-test-value' },
      });

      const updatedProduct = await prisma.product.findUnique({
        where: { id: testProduct.id },
      });

      expect((updatedProduct as any)?.migrationTestField).toBe('migration-test-value');
    });

    it('should maintain referential integrity during migrations', async () => {
      // Test foreign key constraints
      const categoryId = testData.categories[0].id;
      const brandId = testData.brands[0].id;

      // Verify products are properly linked
      const productsInCategory = await prisma.product.findMany({
        where: { categoryId },
        include: { category: true, brand: true },
      });

      expect(productsInCategory.length).toBeGreaterThan(0);
      productsInCategory.forEach(product => {
        expect(product.category).toBeDefined();
        expect(product.category?.id).toBe(categoryId);
      });

      // Test cascade behavior (if configured)
      const testCategory = await prisma.category.create({
        data: {
          name: 'Cascade Test Category',
          slug: `cascade-test-${Date.now()}`,
          description: 'Category for testing cascade behavior',
        },
      });

      const testProductForCascade = await prisma.product.create({
        data: {
          name: 'Cascade Test Product',
          slug: `cascade-product-${Date.now()}`,
          description: 'Product for cascade testing',
          price: 29.99,
          categoryId: testCategory.id,
        },
      });

      // Verify relationship
      const productWithCategory = await prisma.product.findUnique({
        where: { id: testProductForCascade.id },
        include: { category: true },
      });

      expect(productWithCategory?.category?.id).toBe(testCategory.id);

      // Cleanup
      await prisma.product.delete({ where: { id: testProductForCascade.id } });
      await prisma.category.delete({ where: { id: testCategory.id } });
    });
  });

  describe('Connection Pooling and Performance', () => {
    it('should efficiently manage connection pool', async () => {
      // Test multiple simultaneous clients
      const clients = Array.from({ length: 10 }, () => new PrismaClient({
        datasources: {
          db: {
            url: DATABASE_URL,
          },
        },
      }));

      try {
        // Perform operations with all clients
        const operations = clients.map((client, i) =>
          client.product.findMany({
            take: 5,
            skip: i * 5,
            include: { category: true },
          })
        );

        const results = await Promise.all(operations);

        expect(results).toHaveLength(10);
        results.forEach(result => {
          expect(Array.isArray(result)).toBe(true);
        });

      } finally {
        // Disconnect all clients
        await Promise.all(clients.map(client => client.$disconnect()));
      }
    });

    it('should handle connection failures gracefully', async () => {
      // Create client with invalid connection
      const invalidClient = new PrismaClient({
        datasources: {
          db: {
            url: 'postgresql://invalid:invalid@localhost:9999/invalid',
          },
        },
      });

      // Should handle connection error
      await expect(
        invalidClient.product.findFirst()
      ).rejects.toThrow();

      await invalidClient.$disconnect();
    });

    it('should perform complex queries efficiently', async () => {
      const startTime = Date.now();

      // Complex query with multiple joins and filters
      const complexQuery = await prisma.product.findMany({
        where: {
          price: { gte: 20, lte: 100 },
          category: {
            name: { contains: 'Electronics' },
          },
          OR: [
            { name: { contains: 'Test' } },
            { description: { contains: 'Product' } },
          ],
        },
        include: {
          category: true,
          brand: true,
          reviews: {
            include: {
              user: {
                select: {
                  username: true,
                  email: true,
                },
              },
            },
          },
          variants: true,
        },
        orderBy: [
          { price: 'asc' },
          { name: 'asc' },
        ],
        take: 20,
      });

      const endTime = Date.now();

      expect(Array.isArray(complexQuery)).toBe(true);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Backup and Recovery Procedures', () => {
    it('should support data export for backup', async () => {
      // Export data for backup
      const backupData = {
        products: await prisma.product.findMany({
          include: {
            category: true,
            brand: true,
            variants: true,
          },
        }),
        categories: await prisma.category.findMany(),
        brands: await prisma.brand.findMany(),
        users: await prisma.user.findMany({
          select: {
            id: true,
            email: true,
            username: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
      };

      expect(backupData.products.length).toBeGreaterThan(0);
      expect(backupData.categories.length).toBeGreaterThan(0);
      expect(backupData.users.length).toBeGreaterThan(0);

      // Verify data structure
      backupData.products.forEach(product => {
        expect(product.category).toBeDefined();
        expect(typeof product.price).toBe('number');
      });
    });

    it('should support point-in-time recovery simulation', async () => {
      // Create checkpoint
      const checkpoint = new Date();
      
      // Record initial state
      const initialProductCount = await prisma.product.count();
      
      // Make some changes
      const newProduct = await prisma.product.create({
        data: {
          name: 'Recovery Test Product',
          slug: `recovery-test-${Date.now()}`,
          description: 'Product for recovery testing',
          price: 39.99,
          categoryId: testData.categories[0].id,
        },
      });

      // Verify change
      const newProductCount = await prisma.product.count();
      expect(newProductCount).toBe(initialProductCount + 1);

      // Simulate recovery (delete the new product)
      await prisma.product.delete({
        where: { id: newProduct.id },
      });

      // Verify recovery
      const recoveredProductCount = await prisma.product.count();
      expect(recoveredProductCount).toBe(initialProductCount);
    });
  });

  // Helper functions
  async function resetDatabase(): Promise<void> {
    // Clean up test data in correct order due to foreign key constraints
    const tables = [
      'OrderItem',
      'Order',
      'Review',
      'ProductVariant',
      'Product',
      'UserPreference',
      'UserProfile',
      'User',
      'Brand',
      'Category',
    ];

    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
      } catch (error) {
        // Table might not exist or be empty
        console.warn(`Failed to truncate ${table}:`, error.message);
      }
    }
  }

  async function setupTestData(): Promise<void> {
    // Create test categories
    const categories = await Promise.all([
      prisma.category.create({
        data: {
          name: 'Electronics',
          slug: 'electronics',
          description: 'Electronic products for testing',
        },
      }),
      prisma.category.create({
        data: {
          name: 'Home & Garden',
          slug: 'home-garden',
          description: 'Home and garden products',
        },
      }),
    ]);

    testData.categories = categories;

    // Create test brands
    const brands = await Promise.all([
      prisma.brand.create({
        data: {
          name: 'TestBrand Electronics',
          slug: 'testbrand-electronics',
          description: 'Test brand for electronics',
        },
      }),
      prisma.brand.create({
        data: {
          name: 'TestBrand Home',
          slug: 'testbrand-home',
          description: 'Test brand for home products',
        },
      }),
    ]);

    testData.brands = brands;

    // Create test users
    const users = await Promise.all([
      prisma.user.create({
        data: {
          email: 'test1@example.com',
          username: 'testuser1',
          passwordHash: 'hashed-password-1',
        },
      }),
      prisma.user.create({
        data: {
          email: 'test2@example.com',
          username: 'testuser2',
          passwordHash: 'hashed-password-2',
        },
      }),
    ]);

    testData.users = users;

    // Create test products
    const products = await Promise.all([
      prisma.product.create({
        data: {
          name: 'Test Electronics Product 1',
          slug: 'test-electronics-1',
          description: 'First test electronics product',
          price: 49.99,
          inventory: 100,
          categoryId: categories[0].id,
          brandId: brands[0].id,
        },
      }),
      prisma.product.create({
        data: {
          name: 'Test Electronics Product 2',
          slug: 'test-electronics-2',
          description: 'Second test electronics product',
          price: 79.99,
          inventory: 50,
          categoryId: categories[0].id,
          brandId: brands[0].id,
        },
      }),
      prisma.product.create({
        data: {
          name: 'Test Home Product 1',
          slug: 'test-home-1',
          description: 'First test home product',
          price: 29.99,
          inventory: 75,
          categoryId: categories[1].id,
          brandId: brands[1].id,
        },
      }),
    ]);

    testData.products = products;
  }

  async function cleanupTestData(): Promise<void> {
    try {
      // Delete in reverse order of creation
      await prisma.orderItem.deleteMany();
      await prisma.order.deleteMany();
      await prisma.review.deleteMany();
      await prisma.productVariant.deleteMany();
      await prisma.product.deleteMany();
      await prisma.userPreference.deleteMany();
      await prisma.userProfile.deleteMany();
      await prisma.user.deleteMany();
      await prisma.brand.deleteMany();
      await prisma.category.deleteMany();
    } catch (error) {
      console.warn('Cleanup failed:', error.message);
    }
  }
});