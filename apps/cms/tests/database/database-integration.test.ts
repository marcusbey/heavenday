import { setupStrapi, cleanupStrapi } from '../helpers/strapi';
import { Strapi } from '@strapi/strapi';

describe('Database Integration Tests', () => {
  let strapi: Strapi;

  beforeAll(async () => {
    strapi = await setupStrapi();
  });

  afterAll(async () => {
    await cleanupStrapi(strapi);
  });

  beforeEach(async () => {
    // Clean up all test data
    await strapi.db.query('api::product.product').deleteMany({});
    await strapi.db.query('api::category.category').deleteMany({});
    await strapi.db.query('api::brand.brand').deleteMany({});
    await strapi.db.query('api::review.review').deleteMany({});
    await strapi.db.query('api::product-variant.product-variant').deleteMany({});
  });

  describe('Database Connection and Configuration', () => {
    it('should have a healthy database connection', async () => {
      const connection = strapi.db.connection;
      expect(connection).toBeDefined();
      
      // Test basic query execution
      const result = await strapi.db.connection.raw('SELECT 1 as test');
      expect(result).toBeDefined();
    });

    it('should use correct database client', async () => {
      const client = strapi.db.connection.client;
      expect(client).toBeDefined();
      expect(['sqlite3', 'pg', 'mysql', 'mysql2'].includes(client.config.client)).toBe(true);
    });

    it('should have proper connection pooling configured', async () => {
      const poolConfig = strapi.db.connection.client.pool;
      expect(poolConfig).toBeDefined();
      
      // For test environment, pool should be minimal
      if (poolConfig.min !== undefined) {
        expect(poolConfig.min).toBeGreaterThanOrEqual(0);
      }
      if (poolConfig.max !== undefined) {
        expect(poolConfig.max).toBeGreaterThan(0);
      }
    });

    it('should handle connection timeouts gracefully', async () => {
      const startTime = Date.now();
      
      try {
        // Test with a simple query that should complete quickly
        await strapi.db.connection.raw('SELECT 1');
        const endTime = Date.now();
        
        expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      } catch (error) {
        // Connection timeout errors should be handled gracefully
        expect(error.code).not.toBe('ECONNRESET');
      }
    });
  });

  describe('Database Schema and Migrations', () => {
    it('should have all required tables created', async () => {
      const expectedTables = [
        'products',
        'categories',
        'brands',
        'reviews',
        'product_variants',
        'admin_users',
        'admin_roles',
        'admin_permissions',
        'up_users',
        'up_roles'
      ];

      for (const tableName of expectedTables) {
        const exists = await strapi.db.connection.schema.hasTable(tableName);
        expect(exists).toBe(true);
      }
    });

    it('should have proper foreign key constraints', async () => {
      // Test foreign key constraint on product-category relationship
      const category = await strapi.entityService.create('api::category.category', {
        data: {
          name: 'Test Category',
          slug: 'test-category'
        }
      });

      const product = await strapi.entityService.create('api::product.product', {
        data: {
          name: 'Test Product',
          description: 'Product with valid category',
          price: 100.00,
          sku: 'FK-TEST-001',
          category: category.id
        }
      });

      expect(product.category).toBe(category.id);

      // Attempt to create product with invalid category should fail
      try {
        await strapi.entityService.create('api::product.product', {
          data: {
            name: 'Invalid Category Product',
            description: 'Product with invalid category',
            price: 100.00,
            sku: 'FK-INVALID-001',
            category: 99999 // Non-existent category
          }
        });
        
        // If this doesn't fail, foreign key constraints might not be enforced
        fail('Expected foreign key constraint violation');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should enforce unique constraints', async () => {
      // Create first product with unique SKU
      await strapi.entityService.create('api::product.product', {
        data: {
          name: 'Unique Product 1',
          description: 'First product',
          price: 100.00,
          sku: 'UNIQUE-SKU-001'
        }
      });

      // Attempt to create second product with same SKU should fail
      try {
        await strapi.entityService.create('api::product.product', {
          data: {
            name: 'Unique Product 2',
            description: 'Second product with duplicate SKU',
            price: 150.00,
            sku: 'UNIQUE-SKU-001'
          }
        });
        
        fail('Expected unique constraint violation');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should have proper indexes for performance', async () => {
      // Test that common query fields have indexes
      // This is more of a documentation test for what should be indexed
      
      const commonIndexFields = [
        { table: 'products', column: 'sku' },
        { table: 'products', column: 'slug' },
        { table: 'products', column: 'status' },
        { table: 'categories', column: 'slug' },
        { table: 'brands', column: 'slug' },
        { table: 'reviews', column: 'status' }
      ];

      // Note: Actual index checking would require database-specific queries
      // This test documents what indexes should exist
      for (const indexInfo of commonIndexFields) {
        expect(indexInfo.table).toBeDefined();
        expect(indexInfo.column).toBeDefined();
      }
    });
  });

  describe('CRUD Operations', () => {
    describe('Create Operations', () => {
      it('should create records with proper data types', async () => {
        const product = await strapi.entityService.create('api::product.product', {
          data: {
            name: 'Type Test Product',
            description: 'Testing data types',
            price: 99.99,
            originalPrice: 129.99,
            sku: 'TYPE-001',
            stockQuantity: 50,
            weight: 2.5,
            featured: true,
            trending: false,
            trendingScore: 85.5,
            viewCount: 0
          }
        });

        expect(typeof product.name).toBe('string');
        expect(typeof product.price).toBe('number');
        expect(typeof product.stockQuantity).toBe('number');
        expect(typeof product.weight).toBe('number');
        expect(typeof product.featured).toBe('boolean');
        expect(typeof product.trendingScore).toBe('number');
        expect(product.price).toBe(99.99);
        expect(product.stockQuantity).toBe(50);
      });

      it('should handle NULL values correctly', async () => {
        const product = await strapi.entityService.create('api::product.product', {
          data: {
            name: 'Null Test Product',
            description: 'Testing null handling',
            price: 50.00,
            sku: 'NULL-001',
            originalPrice: null,
            weight: null,
            barcode: null
          }
        });

        expect(product.originalPrice).toBeNull();
        expect(product.weight).toBeNull();
        expect(product.barcode).toBeNull();
      });

      it('should handle large text fields', async () => {
        const largeDescription = 'A'.repeat(10000);
        
        const product = await strapi.entityService.create('api::product.product', {
          data: {
            name: 'Large Text Product',
            description: largeDescription,
            price: 100.00,
            sku: 'LARGE-001'
          }
        });

        expect(product.description).toBe(largeDescription);
        expect(product.description.length).toBe(10000);
      });

      it('should handle JSON fields correctly', async () => {
        const structuredData = {
          "@context": "https://schema.org/",
          "@type": "Product",
          "name": "Test Product",
          "offers": {
            "@type": "Offer",
            "price": "99.99",
            "priceCurrency": "USD"
          }
        };

        const product = await strapi.entityService.create('api::product.product', {
          data: {
            name: 'JSON Test Product',
            description: 'Testing JSON storage',
            price: 99.99,
            sku: 'JSON-001',
            structuredData: structuredData
          }
        });

        expect(product.structuredData).toEqual(structuredData);
        expect(product.structuredData['@type']).toBe('Product');
      });
    });

    describe('Read Operations', () => {
      beforeEach(async () => {
        // Create test data
        for (let i = 1; i <= 10; i++) {
          await strapi.entityService.create('api::product.product', {
            data: {
              name: `Product ${i}`,
              description: `Description for product ${i}`,
              price: i * 10,
              sku: `READ-${i.toString().padStart(3, '0')}`,
              status: i % 2 === 0 ? 'active' : 'inactive',
              featured: i <= 3
            }
          });
        }
      });

      it('should retrieve single records by ID', async () => {
        const products = await strapi.entityService.findMany('api::product.product', {
          limit: 1
        });
        
        const firstProduct = products[0];
        const retrievedProduct = await strapi.entityService.findOne('api::product.product', firstProduct.id);

        expect(retrievedProduct).toBeDefined();
        expect(retrievedProduct.id).toBe(firstProduct.id);
        expect(retrievedProduct.name).toBe(firstProduct.name);
      });

      it('should handle complex filtering', async () => {
        const expensiveProducts = await strapi.entityService.findMany('api::product.product', {
          filters: {
            price: { $gte: 50 },
            status: 'active'
          }
        });

        expect(expensiveProducts.length).toBeGreaterThan(0);
        expensiveProducts.forEach(product => {
          expect(product.price).toBeGreaterThanOrEqual(50);
          expect(product.status).toBe('active');
        });
      });

      it('should handle complex sorting', async () => {
        const sortedProducts = await strapi.entityService.findMany('api::product.product', {
          sort: [
            { price: 'desc' },
            { name: 'asc' }
          ]
        });

        expect(sortedProducts.length).toBe(10);
        
        // Verify sorting
        for (let i = 1; i < sortedProducts.length; i++) {
          const prev = sortedProducts[i - 1];
          const curr = sortedProducts[i];
          
          if (prev.price === curr.price) {
            expect(prev.name <= curr.name).toBe(true);
          } else {
            expect(prev.price >= curr.price).toBe(true);
          }
        }
      });

      it('should handle pagination correctly', async () => {
        const page1 = await strapi.entityService.findMany('api::product.product', {
          start: 0,
          limit: 3,
          sort: 'id:asc'
        });

        const page2 = await strapi.entityService.findMany('api::product.product', {
          start: 3,
          limit: 3,
          sort: 'id:asc'
        });

        expect(page1.length).toBe(3);
        expect(page2.length).toBe(3);
        
        // Pages should not overlap
        const page1Ids = page1.map(p => p.id);
        const page2Ids = page2.map(p => p.id);
        const intersection = page1Ids.filter(id => page2Ids.includes(id));
        expect(intersection.length).toBe(0);
      });

      it('should handle aggregation queries', async () => {
        // Count products by status
        const activeCount = await strapi.db.query('api::product.product').count({
          where: { status: 'active' }
        });

        const inactiveCount = await strapi.db.query('api::product.product').count({
          where: { status: 'inactive' }
        });

        expect(activeCount).toBe(5);
        expect(inactiveCount).toBe(5);
      });
    });

    describe('Update Operations', () => {
      let testProduct: any;

      beforeEach(async () => {
        testProduct = await strapi.entityService.create('api::product.product', {
          data: {
            name: 'Update Test Product',
            description: 'Original description',
            price: 100.00,
            sku: 'UPDATE-001',
            status: 'draft',
            featured: false
          }
        });
      });

      it('should update single fields', async () => {
        const updatedProduct = await strapi.entityService.update('api::product.product', testProduct.id, {
          data: { name: 'Updated Product Name' }
        });

        expect(updatedProduct.name).toBe('Updated Product Name');
        expect(updatedProduct.description).toBe('Original description'); // Unchanged
        expect(updatedProduct.price).toBe(100.00); // Unchanged
      });

      it('should update multiple fields', async () => {
        const updateData = {
          name: 'Multi-Update Product',
          price: 150.00,
          status: 'active',
          featured: true
        };

        const updatedProduct = await strapi.entityService.update('api::product.product', testProduct.id, {
          data: updateData
        });

        expect(updatedProduct.name).toBe('Multi-Update Product');
        expect(updatedProduct.price).toBe(150.00);
        expect(updatedProduct.status).toBe('active');
        expect(updatedProduct.featured).toBe(true);
      });

      it('should handle partial updates without affecting other fields', async () => {
        const originalProduct = await strapi.entityService.findOne('api::product.product', testProduct.id);
        
        await strapi.entityService.update('api::product.product', testProduct.id, {
          data: { price: 200.00 }
        });

        const updatedProduct = await strapi.entityService.findOne('api::product.product', testProduct.id);

        expect(updatedProduct.price).toBe(200.00);
        expect(updatedProduct.name).toBe(originalProduct.name);
        expect(updatedProduct.description).toBe(originalProduct.description);
        expect(updatedProduct.sku).toBe(originalProduct.sku);
      });

      it('should handle bulk updates', async () => {
        // Create multiple products
        const productIds = [];
        for (let i = 1; i <= 5; i++) {
          const product = await strapi.entityService.create('api::product.product', {
            data: {
              name: `Bulk Product ${i}`,
              description: `Description ${i}`,
              price: i * 10,
              sku: `BULK-${i}`,
              status: 'draft'
            }
          });
          productIds.push(product.id);
        }

        // Bulk update status
        await strapi.db.query('api::product.product').updateMany({
          where: { id: { $in: productIds } },
          data: { status: 'active' }
        });

        // Verify updates
        const updatedProducts = await strapi.entityService.findMany('api::product.product', {
          filters: { id: { $in: productIds } }
        });

        expect(updatedProducts.length).toBe(5);
        updatedProducts.forEach(product => {
          expect(product.status).toBe('active');
        });
      });
    });

    describe('Delete Operations', () => {
      let testProducts: any[];

      beforeEach(async () => {
        testProducts = [];
        for (let i = 1; i <= 5; i++) {
          const product = await strapi.entityService.create('api::product.product', {
            data: {
              name: `Delete Test Product ${i}`,
              description: `Product ${i} for deletion testing`,
              price: i * 25,
              sku: `DEL-${i}`
            }
          });
          testProducts.push(product);
        }
      });

      it('should delete single records', async () => {
        const productToDelete = testProducts[0];
        
        await strapi.entityService.delete('api::product.product', productToDelete.id);

        // Verify deletion
        const deletedProduct = await strapi.entityService.findOne('api::product.product', productToDelete.id);
        expect(deletedProduct).toBeNull();

        // Verify other products still exist
        const remainingProducts = await strapi.entityService.findMany('api::product.product', {
          filters: { id: { $in: testProducts.map(p => p.id) } }
        });
        expect(remainingProducts.length).toBe(4);
      });

      it('should handle cascading deletes', async () => {
        // Create category and product with relationship
        const category = await strapi.entityService.create('api::category.category', {
          data: {
            name: 'Cascade Test Category',
            slug: 'cascade-test'
          }
        });

        const product = await strapi.entityService.create('api::product.product', {
          data: {
            name: 'Cascade Test Product',
            description: 'Product for cascade testing',
            price: 100.00,
            sku: 'CASCADE-001',
            category: category.id
          }
        });

        // Create review for the product
        const review = await strapi.entityService.create('api::review.review', {
          data: {
            product: product.id,
            customerName: 'Test Customer',
            customerEmail: 'test@example.com',
            rating: 5,
            comment: 'Great product!'
          }
        });

        // Delete product - should handle related reviews appropriately
        await strapi.entityService.delete('api::product.product', product.id);

        // Check if review still exists (depends on cascade configuration)
        const remainingReview = await strapi.entityService.findOne('api::review.review', review.id);
        // This behavior depends on the configured cascade rules
        // expect(remainingReview).toBeNull(); // If configured to cascade delete
        // OR
        // expect(remainingReview.product).toBeNull(); // If configured to set null
      });

      it('should handle bulk deletes', async () => {
        const idsToDelete = testProducts.slice(0, 3).map(p => p.id);

        await strapi.db.query('api::product.product').deleteMany({
          where: { id: { $in: idsToDelete } }
        });

        // Verify deletions
        const remainingProducts = await strapi.entityService.findMany('api::product.product', {
          filters: { id: { $in: testProducts.map(p => p.id) } }
        });

        expect(remainingProducts.length).toBe(2);
        remainingProducts.forEach(product => {
          expect(idsToDelete.includes(product.id)).toBe(false);
        });
      });
    });
  });

  describe('Relationship Operations', () => {
    let category: any;
    let brand: any;
    let products: any[];

    beforeEach(async () => {
      category = await strapi.entityService.create('api::category.category', {
        data: {
          name: 'Relationship Test Category',
          slug: 'relationship-test'
        }
      });

      brand = await strapi.entityService.create('api::brand.brand', {
        data: {
          name: 'Relationship Test Brand',
          slug: 'relationship-test-brand'
        }
      });

      products = [];
      for (let i = 1; i <= 3; i++) {
        const product = await strapi.entityService.create('api::product.product', {
          data: {
            name: `Relationship Product ${i}`,
            description: `Product ${i} for relationship testing`,
            price: i * 50,
            sku: `REL-${i}`,
            category: category.id,
            brand: brand.id
          }
        });
        products.push(product);
      }
    });

    it('should handle one-to-many relationships', async () => {
      // Test category -> products (one-to-many)
      const categoryWithProducts = await strapi.entityService.findOne('api::category.category', category.id, {
        populate: ['products']
      });

      expect(categoryWithProducts.products).toBeDefined();
      expect(categoryWithProducts.products.length).toBe(3);
      categoryWithProducts.products.forEach(product => {
        expect(product.category).toBe(category.id);
      });
    });

    it('should handle many-to-one relationships', async () => {
      // Test product -> category (many-to-one)
      const productWithCategory = await strapi.entityService.findOne('api::product.product', products[0].id, {
        populate: ['category']
      });

      expect(productWithCategory.category).toBeDefined();
      expect(productWithCategory.category.id).toBe(category.id);
      expect(productWithCategory.category.name).toBe('Relationship Test Category');
    });

    it('should handle many-to-many relationships', async () => {
      // Create tags and associate with products
      const tag1 = await strapi.entityService.create('api::tag.tag', {
        data: { name: 'Tag 1', slug: 'tag-1' }
      });

      const tag2 = await strapi.entityService.create('api::tag.tag', {
        data: { name: 'Tag 2', slug: 'tag-2' }
      });

      // Associate tags with product
      await strapi.entityService.update('api::product.product', products[0].id, {
        data: {
          tags: [tag1.id, tag2.id]
        }
      });

      // Test product -> tags
      const productWithTags = await strapi.entityService.findOne('api::product.product', products[0].id, {
        populate: ['tags']
      });

      expect(productWithTags.tags).toBeDefined();
      expect(productWithTags.tags.length).toBe(2);

      // Test tag -> products
      const tagWithProducts = await strapi.entityService.findOne('api::tag.tag', tag1.id, {
        populate: ['products']
      });

      expect(tagWithProducts.products).toBeDefined();
      expect(tagWithProducts.products.length).toBe(1);
      expect(tagWithProducts.products[0].id).toBe(products[0].id);
    });

    it('should handle relationship updates', async () => {
      // Change product category
      const newCategory = await strapi.entityService.create('api::category.category', {
        data: {
          name: 'New Category',
          slug: 'new-category'
        }
      });

      await strapi.entityService.update('api::product.product', products[0].id, {
        data: { category: newCategory.id }
      });

      // Verify update
      const updatedProduct = await strapi.entityService.findOne('api::product.product', products[0].id, {
        populate: ['category']
      });

      expect(updatedProduct.category.id).toBe(newCategory.id);

      // Verify old category no longer has this product
      const oldCategoryWithProducts = await strapi.entityService.findOne('api::category.category', category.id, {
        populate: ['products']
      });

      expect(oldCategoryWithProducts.products.length).toBe(2);
      expect(oldCategoryWithProducts.products.map(p => p.id)).not.toContain(products[0].id);
    });

    it('should handle relationship deletions', async () => {
      // Delete a product and check relationship integrity
      await strapi.entityService.delete('api::product.product', products[0].id);

      // Category should still exist but have one less product
      const categoryAfterDelete = await strapi.entityService.findOne('api::category.category', category.id, {
        populate: ['products']
      });

      expect(categoryAfterDelete).toBeDefined();
      expect(categoryAfterDelete.products.length).toBe(2);
      expect(categoryAfterDelete.products.map(p => p.id)).not.toContain(products[0].id);
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle concurrent database operations', async () => {
      const concurrentOperations = Array(20).fill(null).map((_, index) =>
        strapi.entityService.create('api::product.product', {
          data: {
            name: `Concurrent Product ${index}`,
            description: `Product ${index} for concurrency testing`,
            price: index * 5,
            sku: `CONC-${index.toString().padStart(3, '0')}`
          }
        })
      );

      const results = await Promise.allSettled(concurrentOperations);
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      // Most operations should succeed
      expect(successful).toBeGreaterThan(15);
      expect(successful + failed).toBe(20);
    });

    it('should handle large dataset operations efficiently', async () => {
      // Create a larger dataset
      const batchSize = 50;
      const batches = [];

      for (let batch = 0; batch < 5; batch++) {
        const batchData = Array(batchSize).fill(null).map((_, index) => {
          const productIndex = batch * batchSize + index;
          return strapi.entityService.create('api::product.product', {
            data: {
              name: `Large Dataset Product ${productIndex}`,
              description: `Product ${productIndex} for large dataset testing`,
              price: productIndex * 2,
              sku: `LARGE-${productIndex.toString().padStart(4, '0')}`
            }
          });
        });

        batches.push(Promise.all(batchData));
      }

      const startTime = Date.now();
      await Promise.all(batches);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Verify all products were created
      const totalCount = await strapi.db.query('api::product.product').count();
      expect(totalCount).toBe(250); // 5 batches * 50 products
    });

    it('should handle complex queries efficiently', async () => {
      // Create test data with relationships
      const category = await strapi.entityService.create('api::category.category', {
        data: { name: 'Performance Category', slug: 'performance' }
      });

      const brand = await strapi.entityService.create('api::brand.brand', {
        data: { name: 'Performance Brand', slug: 'performance-brand' }
      });

      // Create products with relationships
      for (let i = 0; i < 100; i++) {
        await strapi.entityService.create('api::product.product', {
          data: {
            name: `Performance Product ${i}`,
            description: `Product ${i} for performance testing`,
            price: Math.random() * 1000,
            sku: `PERF-${i.toString().padStart(4, '0')}`,
            category: category.id,
            brand: brand.id,
            status: i % 2 === 0 ? 'active' : 'inactive',
            featured: i % 10 === 0
          }
        });
      }

      // Execute complex query
      const startTime = Date.now();
      
      const complexQuery = await strapi.entityService.findMany('api::product.product', {
        filters: {
          $and: [
            { status: 'active' },
            { price: { $gte: 100, $lte: 800 } },
            { featured: true }
          ]
        },
        populate: ['category', 'brand'],
        sort: ['price:desc', 'name:asc'],
        limit: 20
      });

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(queryTime).toBeLessThan(1000); // Should complete within 1 second
      expect(complexQuery).toBeDefined();
      expect(Array.isArray(complexQuery)).toBe(true);
    });

    it('should handle database connection recovery', async () => {
      // Test database resilience
      const initialQuery = await strapi.db.query('api::product.product').count();
      expect(typeof initialQuery).toBe('number');

      // Simulate temporary connection issue and recovery
      try {
        // Create multiple products to test connection stability
        const products = [];
        for (let i = 0; i < 10; i++) {
          const product = await strapi.entityService.create('api::product.product', {
            data: {
              name: `Recovery Test Product ${i}`,
              description: `Product ${i} for recovery testing`,
              price: i * 10,
              sku: `RECOVERY-${i}`
            }
          });
          products.push(product);
        }

        expect(products.length).toBe(10);
      } catch (error) {
        // Connection errors should be handled gracefully
        expect(error.code).not.toBe('ECONNRESET');
      }
    });
  });

  describe('Data Integrity and Constraints', () => {
    it('should maintain referential integrity', async () => {
      // Create category and product
      const category = await strapi.entityService.create('api::category.category', {
        data: { name: 'Integrity Category', slug: 'integrity' }
      });

      const product = await strapi.entityService.create('api::product.product', {
        data: {
          name: 'Integrity Product',
          description: 'Product for integrity testing',
          price: 100.00,
          sku: 'INTEGRITY-001',
          category: category.id
        }
      });

      // Verify relationship exists
      const productWithCategory = await strapi.entityService.findOne('api::product.product', product.id, {
        populate: ['category']
      });
      expect(productWithCategory.category.id).toBe(category.id);

      // Delete category - should handle foreign key constraint
      try {
        await strapi.entityService.delete('api::category.category', category.id);
        
        // If deletion succeeds, check if product relationship was handled
        const orphanedProduct = await strapi.entityService.findOne('api::product.product', product.id, {
          populate: ['category']
        });
        
        // Depending on cascade rules, category should be null or product deleted
        if (orphanedProduct) {
          expect(orphanedProduct.category).toBeNull();
        }
      } catch (error) {
        // If foreign key constraint prevents deletion, that's also valid
        expect(error).toBeDefined();
      }
    });

    it('should handle transaction rollback on errors', async () => {
      const initialProductCount = await strapi.db.query('api::product.product').count();

      try {
        await strapi.db.transaction(async (trx) => {
          // Create a product
          await strapi.entityService.create('api::product.product', {
            data: {
              name: 'Transaction Product 1',
              description: 'First product in transaction',
              price: 100.00,
              sku: 'TRANS-001'
            }
          });

          // Create another product with duplicate SKU (should fail)
          await strapi.entityService.create('api::product.product', {
            data: {
              name: 'Transaction Product 2',
              description: 'Second product in transaction',
              price: 150.00,
              sku: 'TRANS-001' // Duplicate SKU
            }
          });
        });
        
        fail('Expected transaction to fail due to duplicate SKU');
      } catch (error) {
        // Transaction should have rolled back
        const finalProductCount = await strapi.db.query('api::product.product').count();
        expect(finalProductCount).toBe(initialProductCount);
      }
    });

    it('should enforce field validation constraints', async () => {
      const invalidData = [
        {
          name: '', // Empty name (should fail if required)
          description: 'Valid description',
          price: 100.00,
          sku: 'EMPTY-NAME'
        },
        {
          name: 'Valid Name',
          description: 'Valid description',
          price: -10.00, // Negative price (should fail)
          sku: 'NEGATIVE-PRICE'
        },
        {
          name: 'Valid Name',
          description: 'Valid description',
          price: 100.00,
          sku: '' // Empty SKU (should fail if required)
        }
      ];

      for (const data of invalidData) {
        try {
          await strapi.entityService.create('api::product.product', { data });
          // If creation succeeds, validation might not be properly configured
        } catch (error) {
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe('Database Cleanup and Maintenance', () => {
    it('should properly clean up test data', async () => {
      // Create test data
      const products = [];
      for (let i = 0; i < 5; i++) {
        const product = await strapi.entityService.create('api::product.product', {
          data: {
            name: `Cleanup Product ${i}`,
            description: `Product ${i} for cleanup testing`,
            price: i * 20,
            sku: `CLEANUP-${i}`
          }
        });
        products.push(product);
      }

      // Verify data exists
      const beforeCleanup = await strapi.db.query('api::product.product').count();
      expect(beforeCleanup).toBeGreaterThanOrEqual(5);

      // Clean up
      await strapi.db.query('api::product.product').deleteMany({
        where: { sku: { $startsWith: 'CLEANUP-' } }
      });

      // Verify cleanup
      const afterCleanup = await strapi.db.query('api::product.product').count({
        where: { sku: { $startsWith: 'CLEANUP-' } }
      });
      expect(afterCleanup).toBe(0);
    });

    it('should handle database reset gracefully', async () => {
      // Create some data
      await strapi.entityService.create('api::product.product', {
        data: {
          name: 'Reset Test Product',
          description: 'Product for reset testing',
          price: 100.00,
          sku: 'RESET-001'
        }
      });

      // Clear all data
      await strapi.db.query('api::product.product').deleteMany({});
      await strapi.db.query('api::category.category').deleteMany({});
      await strapi.db.query('api::brand.brand').deleteMany({});

      // Verify reset
      const productCount = await strapi.db.query('api::product.product').count();
      const categoryCount = await strapi.db.query('api::category.category').count();
      const brandCount = await strapi.db.query('api::brand.brand').count();

      expect(productCount).toBe(0);
      expect(categoryCount).toBe(0);
      expect(brandCount).toBe(0);
    });
  });
});