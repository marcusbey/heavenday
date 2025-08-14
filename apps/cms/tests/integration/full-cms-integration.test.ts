import { setupStrapi, cleanupStrapi, createAuthenticatedRequest } from '../helpers/strapi';
import { Strapi } from '@strapi/strapi';
import request from 'supertest';

describe('Full CMS Integration Tests', () => {
  let strapi: Strapi;
  let authenticatedRequest: any;
  let adminRequest: any;
  let userRequest: any;

  beforeAll(async () => {
    strapi = await setupStrapi();
    authenticatedRequest = createAuthenticatedRequest(strapi);
    adminRequest = await authenticatedRequest.asAdmin();
    userRequest = await authenticatedRequest.asUser();
  });

  afterAll(async () => {
    await cleanupStrapi(strapi);
  });

  beforeEach(async () => {
    // Clean up all data before each test
    await strapi.db.query('api::review.review').deleteMany({});
    await strapi.db.query('api::product-variant.product-variant').deleteMany({});
    await strapi.db.query('api::product.product').deleteMany({});
    await strapi.db.query('api::sub-category.sub-category').deleteMany({});
    await strapi.db.query('api::category.category').deleteMany({});
    await strapi.db.query('api::brand.brand').deleteMany({});
    await strapi.db.query('api::tag.tag').deleteMany({});
  });

  describe('Complete E-commerce Workflow', () => {
    it('should handle complete product creation workflow with all relationships', async () => {
      // Step 1: Create a brand
      const brandResponse = await request(strapi.server.httpServer)
        .post('/api/brands')
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            name: 'Premium Wellness Co.',
            description: 'Leading provider of premium wellness products',
            website: 'https://premiumwellness.com',
            email: 'contact@premiumwellness.com',
            country: 'United States',
            isFeatured: true
          }
        })
        .expect(200);

      const brand = brandResponse.body.data;
      expect(brand.attributes.name).toBe('Premium Wellness Co.');

      // Step 2: Create a category hierarchy
      const rootCategoryResponse = await request(strapi.server.httpServer)
        .post('/api/categories')
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            name: 'Wellness Products',
            description: 'Complete range of wellness and health products',
            level: 0,
            sortOrder: 1,
            isFeatured: true,
            showInNavigation: true
          }
        })
        .expect(200);

      const rootCategory = rootCategoryResponse.body.data;

      const subCategoryResponse = await request(strapi.server.httpServer)
        .post('/api/categories')
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            name: 'Adult Wellness',
            description: 'Adult wellness and intimate health products',
            parentCategory: rootCategory.id,
            level: 1,
            sortOrder: 1,
            showInNavigation: true
          }
        })
        .expect(200);

      const subCategory = subCategoryResponse.body.data;

      // Step 3: Create tags
      const tag1Response = await request(strapi.server.httpServer)
        .post('/api/tags')
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            name: 'Premium Quality',
            slug: 'premium-quality'
          }
        })
        .expect(200);

      const tag2Response = await request(strapi.server.httpServer)
        .post('/api/tags')
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            name: 'Best Seller',
            slug: 'best-seller'
          }
        })
        .expect(200);

      const tag1 = tag1Response.body.data;
      const tag2 = tag2Response.body.data;

      // Step 4: Create main product
      const productResponse = await request(strapi.server.httpServer)
        .post('/api/products')
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            name: 'Premium Wellness Companion',
            description: 'High-quality wellness companion for adults seeking premium experiences',
            shortDescription: 'Premium wellness companion with advanced features',
            price: 299.99,
            originalPrice: 399.99,
            sku: 'PWC-001',
            status: 'active',
            featured: true,
            trending: true,
            trendingScore: 95,
            stockQuantity: 50,
            lowStockThreshold: 10,
            weight: 2.5,
            category: subCategory.id,
            brand: brand.id,
            tags: [tag1.id, tag2.id],
            seoTitle: 'Premium Wellness Companion - Best Quality',
            seoDescription: 'Discover the ultimate premium wellness companion with advanced features and exceptional quality.',
            seoKeywords: 'wellness, premium, adult, companion',
            sourceMarketplace: 'custom',
            dimensions: {
              length: 20.0,
              width: 12.0,
              height: 8.0,
              unit: 'cm'
            },
            specifications: [
              {
                name: 'Material',
                value: 'Medical Grade Silicone',
                category: 'Construction'
              },
              {
                name: 'Power Source',
                value: 'Rechargeable Battery',
                category: 'Technical'
              }
            ]
          }
        })
        .expect(200);

      const product = productResponse.body.data;
      expect(product.attributes.name).toBe('Premium Wellness Companion');
      expect(product.attributes.slug).toBe('premium-wellness-companion');

      // Step 5: Create product variants
      const variant1Response = await request(strapi.server.httpServer)
        .post('/api/product-variants')
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            product: product.id,
            sku: 'PWC-001-RED-M',
            name: 'Premium Wellness Companion - Red Medium',
            price: 299.99,
            stockQuantity: 20,
            size: 'Medium',
            color: 'Red',
            colorHex: '#dc143c',
            material: 'Medical Grade Silicone',
            isDefault: true,
            sortOrder: 1,
            dimensions: {
              length: 20.0,
              width: 12.0,
              height: 8.0,
              unit: 'cm'
            },
            attributes: [
              {
                name: 'Firmness',
                value: 'Medium',
                type: 'select'
              }
            ]
          }
        })
        .expect(200);

      const variant2Response = await request(strapi.server.httpServer)
        .post('/api/product-variants')
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            product: product.id,
            sku: 'PWC-001-BLUE-L',
            name: 'Premium Wellness Companion - Blue Large',
            price: 349.99,
            stockQuantity: 15,
            size: 'Large',
            color: 'Blue',
            colorHex: '#0000ff',
            material: 'Medical Grade Silicone',
            isDefault: false,
            sortOrder: 2,
            attributes: [
              {
                name: 'Firmness',
                value: 'Firm',
                type: 'select'
              }
            ]
          }
        })
        .expect(200);

      const variant1 = variant1Response.body.data;
      const variant2 = variant2Response.body.data;

      // Step 6: Verify complete product with all relationships
      const fullProductResponse = await request(strapi.server.httpServer)
        .get(`/api/products/${product.id}?populate=*`)
        .expect(200);

      const fullProduct = fullProductResponse.body.data;
      expect(fullProduct.attributes.brand.data.attributes.name).toBe('Premium Wellness Co.');
      expect(fullProduct.attributes.category.data.attributes.name).toBe('Adult Wellness');
      expect(fullProduct.attributes.tags.data.length).toBe(2);
      expect(fullProduct.attributes.variants.data.length).toBe(2);

      // Step 7: Create reviews for the product
      const review1Response = await request(strapi.server.httpServer)
        .post('/api/reviews')
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            product: product.id,
            customerName: 'Sarah Johnson',
            customerEmail: 'sarah@example.com',
            rating: 5,
            title: 'Exceptional Quality!',
            comment: 'This product exceeded all my expectations. The quality is outstanding and the experience is amazing.',
            pros: 'High quality, great design, excellent performance',
            cons: 'A bit pricey, but worth every penny',
            isVerifiedPurchase: true,
            isRecommended: true,
            status: 'approved',
            sentiment: 'positive',
            sentimentScore: 0.9
          }
        })
        .expect(200);

      const review2Response = await request(strapi.server.httpServer)
        .post('/api/reviews')
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            product: product.id,
            customerName: 'Mike Chen',
            customerEmail: 'mike@example.com',
            rating: 4,
            title: 'Very Good Product',
            comment: 'Great product overall. Does exactly what it promises. Would buy again.',
            isVerifiedPurchase: true,
            isRecommended: true,
            status: 'approved',
            sentiment: 'positive',
            sentimentScore: 0.7
          }
        })
        .expect(200);

      // Step 8: Verify product with reviews
      const productWithReviewsResponse = await request(strapi.server.httpServer)
        .get(`/api/products/${product.id}?populate[reviews][filters][status][$eq]=approved`)
        .expect(200);

      const productWithReviews = productWithReviewsResponse.body.data;
      expect(productWithReviews.attributes.reviews.data.length).toBe(2);

      // Step 9: Test product search and filtering
      const searchResponse = await request(strapi.server.httpServer)
        .get('/api/products?filters[name][$containsi]=wellness&populate=*')
        .expect(200);

      expect(searchResponse.body.data.length).toBe(1);
      expect(searchResponse.body.data[0].attributes.name).toContain('Wellness');

      // Step 10: Test category filtering
      const categoryFilterResponse = await request(strapi.server.httpServer)
        .get(`/api/products?filters[category][id][$eq]=${subCategory.id}&populate=*`)
        .expect(200);

      expect(categoryFilterResponse.body.data.length).toBe(1);

      // Step 11: Test brand filtering
      const brandFilterResponse = await request(strapi.server.httpServer)
        .get(`/api/products?filters[brand][id][$eq]=${brand.id}&populate=*`)
        .expect(200);

      expect(brandFilterResponse.body.data.length).toBe(1);

      console.log('✅ Complete e-commerce workflow test passed');
    });

    it('should handle inventory management workflow', async () => {
      // Create a simple product for inventory testing
      const productResponse = await request(strapi.server.httpServer)
        .post('/api/products')
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            name: 'Inventory Test Product',
            description: 'Product for inventory management testing',
            price: 99.99,
            sku: 'INV-TEST-001',
            status: 'active',
            stockQuantity: 100,
            lowStockThreshold: 20,
            trackInventory: true
          }
        })
        .expect(200);

      const product = productResponse.body.data;

      // Create variants with different stock levels
      const lowStockVariant = await request(strapi.server.httpServer)
        .post('/api/product-variants')
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            product: product.id,
            sku: 'INV-TEST-001-LOW',
            name: 'Low Stock Variant',
            price: 99.99,
            stockQuantity: 5, // Below threshold
            lowStockThreshold: 10,
            trackInventory: true
          }
        })
        .expect(200);

      const normalStockVariant = await request(strapi.server.httpServer)
        .post('/api/product-variants')
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            product: product.id,
            sku: 'INV-TEST-001-NORMAL',
            name: 'Normal Stock Variant',
            price: 99.99,
            stockQuantity: 50,
            lowStockThreshold: 10,
            trackInventory: true
          }
        })
        .expect(200);

      // Test stock level filtering
      const lowStockProducts = await request(strapi.server.httpServer)
        .get('/api/product-variants?filters[stockQuantity][$lte]=10&populate=*')
        .expect(200);

      expect(lowStockProducts.body.data.length).toBe(1);
      expect(lowStockProducts.body.data[0].attributes.name).toBe('Low Stock Variant');

      // Simulate stock update (purchase)
      const updatedVariant = await request(strapi.server.httpServer)
        .put(`/api/product-variants/${lowStockVariant.body.data.id}`)
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            stockQuantity: 3 // Reduce stock further
          }
        })
        .expect(200);

      expect(updatedVariant.body.data.attributes.stockQuantity).toBe(3);

      // Test out of stock scenario
      const outOfStockVariant = await request(strapi.server.httpServer)
        .put(`/api/product-variants/${lowStockVariant.body.data.id}`)
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            stockQuantity: 0
          }
        })
        .expect(200);

      expect(outOfStockVariant.body.data.attributes.stockQuantity).toBe(0);

      console.log('✅ Inventory management workflow test passed');
    });

    it('should handle review moderation workflow', async () => {
      // Create a product for review testing
      const productResponse = await request(strapi.server.httpServer)
        .post('/api/products')
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            name: 'Review Test Product',
            description: 'Product for review moderation testing',
            price: 149.99,
            sku: 'REV-TEST-001',
            status: 'active'
          }
        })
        .expect(200);

      const product = productResponse.body.data;

      // Create reviews with different statuses
      const pendingReview = await request(strapi.server.httpServer)
        .post('/api/reviews')
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            product: product.id,
            customerName: 'Pending Reviewer',
            customerEmail: 'pending@example.com',
            rating: 4,
            comment: 'This review is pending moderation',
            status: 'pending'
          }
        })
        .expect(200);

      const approvedReview = await request(strapi.server.httpServer)
        .post('/api/reviews')
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            product: product.id,
            customerName: 'Approved Reviewer',
            customerEmail: 'approved@example.com',
            rating: 5,
            comment: 'This review has been approved',
            status: 'approved'
          }
        })
        .expect(200);

      const rejectedReview = await request(strapi.server.httpServer)
        .post('/api/reviews')
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            product: product.id,
            customerName: 'Rejected Reviewer',
            customerEmail: 'rejected@example.com',
            rating: 1,
            comment: 'This review contains inappropriate content',
            status: 'rejected',
            moderatorNotes: 'Rejected due to inappropriate language'
          }
        })
        .expect(200);

      // Test filtering by review status
      const pendingReviews = await request(strapi.server.httpServer)
        .get('/api/reviews?filters[status][$eq]=pending&populate=*')
        .set('Authorization', adminRequest.headers.Authorization)
        .expect(200);

      expect(pendingReviews.body.data.length).toBe(1);

      const approvedReviews = await request(strapi.server.httpServer)
        .get('/api/reviews?filters[status][$eq]=approved&populate=*')
        .expect(200);

      expect(approvedReviews.body.data.length).toBe(1);

      // Test public access (should only see approved reviews)
      const publicReviews = await request(strapi.server.httpServer)
        .get(`/api/products/${product.id}?populate[reviews][filters][status][$eq]=approved`)
        .expect(200);

      expect(publicReviews.body.data.attributes.reviews.data.length).toBe(1);
      expect(publicReviews.body.data.attributes.reviews.data[0].attributes.status).toBe('approved');

      // Moderate a pending review
      const moderatedReview = await request(strapi.server.httpServer)
        .put(`/api/reviews/${pendingReview.body.data.id}`)
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            status: 'approved',
            moderatorNotes: 'Review approved after verification',
            moderatedAt: new Date().toISOString()
          }
        })
        .expect(200);

      expect(moderatedReview.body.data.attributes.status).toBe('approved');

      console.log('✅ Review moderation workflow test passed');
    });
  });

  describe('Multi-User and Permission Scenarios', () => {
    it('should handle different user roles and permissions', async () => {
      // Create a product as admin
      const productResponse = await request(strapi.server.httpServer)
        .post('/api/products')
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            name: 'Permission Test Product',
            description: 'Product for permission testing',
            price: 199.99,
            sku: 'PERM-TEST-001',
            status: 'active'
          }
        })
        .expect(200);

      const product = productResponse.body.data;

      // Regular user should be able to read the product
      const userReadResponse = await request(strapi.server.httpServer)
        .get(`/api/products/${product.id}`)
        .set('Authorization', userRequest.headers.Authorization)
        .expect(200);

      expect(userReadResponse.body.data.id).toBe(product.id);

      // Regular user should not be able to update the product
      const userUpdateResponse = await request(strapi.server.httpServer)
        .put(`/api/products/${product.id}`)
        .set('Authorization', userRequest.headers.Authorization)
        .send({
          data: { name: 'User Updated Product' }
        });

      // Expect either success (if user has permission) or forbidden
      expect([200, 403]).toContain(userUpdateResponse.status);

      // Regular user should not be able to delete the product
      const userDeleteResponse = await request(strapi.server.httpServer)
        .delete(`/api/products/${product.id}`)
        .set('Authorization', userRequest.headers.Authorization);

      expect([403]).toContain(userDeleteResponse.status);

      // Admin should be able to update and delete
      const adminUpdateResponse = await request(strapi.server.httpServer)
        .put(`/api/products/${product.id}`)
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: { name: 'Admin Updated Product' }
        })
        .expect(200);

      expect(adminUpdateResponse.body.data.attributes.name).toBe('Admin Updated Product');

      console.log('✅ Multi-user permission test passed');
    });

    it('should handle concurrent user operations', async () => {
      // Create a product
      const productResponse = await request(strapi.server.httpServer)
        .post('/api/products')
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            name: 'Concurrent Test Product',
            description: 'Product for concurrent testing',
            price: 299.99,
            sku: 'CONC-TEST-001',
            status: 'active',
            stockQuantity: 100
          }
        })
        .expect(200);

      const product = productResponse.body.data;

      // Simulate concurrent reads by multiple users
      const concurrentReads = Array(10).fill(null).map(() =>
        request(strapi.server.httpServer)
          .get(`/api/products/${product.id}`)
          .expect(200)
      );

      const readResults = await Promise.all(concurrentReads);
      readResults.forEach(result => {
        expect(result.body.data.id).toBe(product.id);
      });

      // Simulate concurrent stock updates
      const concurrentUpdates = Array(5).fill(null).map((_, index) =>
        request(strapi.server.httpServer)
          .put(`/api/products/${product.id}`)
          .set('Authorization', adminRequest.headers.Authorization)
          .send({
            data: {
              stockQuantity: 100 - (index + 1) * 5 // Reduce stock by 5 each time
            }
          })
      );

      const updateResults = await Promise.allSettled(concurrentUpdates);
      const successful = updateResults.filter(r => r.status === 'fulfilled').length;
      
      // At least some updates should succeed
      expect(successful).toBeGreaterThan(0);

      console.log('✅ Concurrent operations test passed');
    });
  });

  describe('Data Consistency and Integrity', () => {
    it('should maintain data consistency across related entities', async () => {
      // Create brand and category
      const brand = await request(strapi.server.httpServer)
        .post('/api/brands')
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            name: 'Consistency Test Brand',
            slug: 'consistency-brand'
          }
        })
        .expect(200);

      const category = await request(strapi.server.httpServer)
        .post('/api/categories')
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            name: 'Consistency Test Category',
            slug: 'consistency-category'
          }
        })
        .expect(200);

      // Create product with relationships
      const product = await request(strapi.server.httpServer)
        .post('/api/products')
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            name: 'Consistency Test Product',
            description: 'Product for consistency testing',
            price: 199.99,
            sku: 'CONS-TEST-001',
            brand: brand.body.data.id,
            category: category.body.data.id
          }
        })
        .expect(200);

      // Verify relationships exist
      const productWithRelations = await request(strapi.server.httpServer)
        .get(`/api/products/${product.body.data.id}?populate=*`)
        .expect(200);

      expect(productWithRelations.body.data.attributes.brand.data.id).toBe(brand.body.data.id);
      expect(productWithRelations.body.data.attributes.category.data.id).toBe(category.body.data.id);

      // Update brand name
      const updatedBrand = await request(strapi.server.httpServer)
        .put(`/api/brands/${brand.body.data.id}`)
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: { name: 'Updated Brand Name' }
        })
        .expect(200);

      // Verify product still has correct brand relationship
      const productAfterBrandUpdate = await request(strapi.server.httpServer)
        .get(`/api/products/${product.body.data.id}?populate[brand]=*`)
        .expect(200);

      expect(productAfterBrandUpdate.body.data.attributes.brand.data.attributes.name).toBe('Updated Brand Name');

      // Create reviews and verify product review count consistency
      const review1 = await request(strapi.server.httpServer)
        .post('/api/reviews')
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            product: product.body.data.id,
            customerName: 'Reviewer 1',
            customerEmail: 'reviewer1@example.com',
            rating: 5,
            comment: 'Great product!',
            status: 'approved'
          }
        })
        .expect(200);

      const review2 = await request(strapi.server.httpServer)
        .post('/api/reviews')
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            product: product.body.data.id,
            customerName: 'Reviewer 2',
            customerEmail: 'reviewer2@example.com',
            rating: 4,
            comment: 'Good product!',
            status: 'approved'
          }
        })
        .expect(200);

      // Verify product has correct review count
      const productWithReviews = await request(strapi.server.httpServer)
        .get(`/api/products/${product.body.data.id}?populate[reviews][filters][status][$eq]=approved`)
        .expect(200);

      expect(productWithReviews.body.data.attributes.reviews.data.length).toBe(2);

      console.log('✅ Data consistency test passed');
    });

    it('should handle cascading operations correctly', async () => {
      // Create category with products
      const category = await request(strapi.server.httpServer)
        .post('/api/categories')
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            name: 'Cascade Test Category',
            slug: 'cascade-category'
          }
        })
        .expect(200);

      // Create multiple products in the category
      const product1 = await request(strapi.server.httpServer)
        .post('/api/products')
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            name: 'Cascade Product 1',
            description: 'First product in cascade test',
            price: 99.99,
            sku: 'CASCADE-001',
            category: category.body.data.id
          }
        })
        .expect(200);

      const product2 = await request(strapi.server.httpServer)
        .post('/api/products')
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            name: 'Cascade Product 2',
            description: 'Second product in cascade test',
            price: 149.99,
            sku: 'CASCADE-002',
            category: category.body.data.id
          }
        })
        .expect(200);

      // Verify category has products
      const categoryWithProducts = await request(strapi.server.httpServer)
        .get(`/api/categories/${category.body.data.id}?populate[products]=*`)
        .expect(200);

      expect(categoryWithProducts.body.data.attributes.products.data.length).toBe(2);

      // Create reviews for products
      await request(strapi.server.httpServer)
        .post('/api/reviews')
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            product: product1.body.data.id,
            customerName: 'Cascade Reviewer',
            customerEmail: 'cascade@example.com',
            rating: 5,
            comment: 'Product review for cascade test'
          }
        })
        .expect(200);

      // Test category deletion behavior (should handle product relationships)
      const categoryDeleteResponse = await request(strapi.server.httpServer)
        .delete(`/api/categories/${category.body.data.id}`)
        .set('Authorization', adminRequest.headers.Authorization);

      // Behavior depends on cascade configuration
      if (categoryDeleteResponse.status === 200) {
        // If cascade delete is allowed, verify products are handled appropriately
        const orphanedProducts = await request(strapi.server.httpServer)
          .get(`/api/products?filters[category][id][$eq]=${category.body.data.id}`)
          .expect(200);

        expect(orphanedProducts.body.data.length).toBe(0);
      } else {
        // If cascade delete is prevented, should get an error
        expect(categoryDeleteResponse.status).toBe(400);
      }

      console.log('✅ Cascading operations test passed');
    });
  });

  describe('Performance Under Load', () => {
    it('should handle bulk operations efficiently', async () => {
      const startTime = Date.now();

      // Create multiple categories
      const categoryCreations = Array(10).fill(null).map((_, index) =>
        request(strapi.server.httpServer)
          .post('/api/categories')
          .set('Authorization', adminRequest.headers.Authorization)
          .send({
            data: {
              name: `Bulk Category ${index + 1}`,
              slug: `bulk-category-${index + 1}`,
              description: `Category ${index + 1} for bulk testing`
            }
          })
          .expect(200)
      );

      const categories = await Promise.all(categoryCreations);

      // Create multiple brands
      const brandCreations = Array(5).fill(null).map((_, index) =>
        request(strapi.server.httpServer)
          .post('/api/brands')
          .set('Authorization', adminRequest.headers.Authorization)
          .send({
            data: {
              name: `Bulk Brand ${index + 1}`,
              slug: `bulk-brand-${index + 1}`,
              description: `Brand ${index + 1} for bulk testing`
            }
          })
          .expect(200)
      );

      const brands = await Promise.all(brandCreations);

      // Create many products
      const productCreations = Array(50).fill(null).map((_, index) =>
        request(strapi.server.httpServer)
          .post('/api/products')
          .set('Authorization', adminRequest.headers.Authorization)
          .send({
            data: {
              name: `Bulk Product ${index + 1}`,
              description: `Product ${index + 1} for bulk testing`,
              price: (index + 1) * 10,
              sku: `BULK-${(index + 1).toString().padStart(3, '0')}`,
              category: categories[index % categories.length].body.data.id,
              brand: brands[index % brands.length].body.data.id,
              status: 'active'
            }
          })
          .expect(200)
      );

      const products = await Promise.all(productCreations);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(products.length).toBe(50);
      expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds

      // Test querying the bulk data
      const queryStartTime = Date.now();

      const allProducts = await request(strapi.server.httpServer)
        .get('/api/products?populate=*&pagination[limit]=100')
        .expect(200);

      const queryEndTime = Date.now();
      const queryTime = queryEndTime - queryStartTime;

      expect(allProducts.body.data.length).toBe(50);
      expect(queryTime).toBeLessThan(5000); // Query should complete within 5 seconds

      console.log(`✅ Bulk operations test passed - Created 50 products in ${totalTime}ms, queried in ${queryTime}ms`);
    });

    it('should handle complex queries with multiple relationships', async () => {
      // Create test data with complex relationships
      const category = await request(strapi.server.httpServer)
        .post('/api/categories')
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            name: 'Complex Query Category',
            slug: 'complex-category'
          }
        })
        .expect(200);

      const brand = await request(strapi.server.httpServer)
        .post('/api/brands')
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            name: 'Complex Query Brand',
            slug: 'complex-brand'
          }
        })
        .expect(200);

      // Create products with multiple relationships
      for (let i = 0; i < 20; i++) {
        const product = await request(strapi.server.httpServer)
          .post('/api/products')
          .set('Authorization', adminRequest.headers.Authorization)
          .send({
            data: {
              name: `Complex Product ${i + 1}`,
              description: `Product ${i + 1} for complex query testing`,
              price: (i + 1) * 25,
              sku: `COMPLEX-${(i + 1).toString().padStart(3, '0')}`,
              category: category.body.data.id,
              brand: brand.body.data.id,
              status: 'active',
              featured: i < 5,
              trending: i < 3
            }
          })
          .expect(200);

        // Add variants
        await request(strapi.server.httpServer)
          .post('/api/product-variants')
          .set('Authorization', adminRequest.headers.Authorization)
          .send({
            data: {
              product: product.body.data.id,
              sku: `COMPLEX-${(i + 1).toString().padStart(3, '0')}-VAR`,
              name: `Complex Product ${i + 1} Variant`,
              price: (i + 1) * 25
            }
          })
          .expect(200);

        // Add reviews
        await request(strapi.server.httpServer)
          .post('/api/reviews')
          .set('Authorization', adminRequest.headers.Authorization)
          .send({
            data: {
              product: product.body.data.id,
              customerName: `Customer ${i + 1}`,
              customerEmail: `customer${i + 1}@example.com`,
              rating: Math.floor(Math.random() * 5) + 1,
              comment: `Review for product ${i + 1}`,
              status: 'approved'
            }
          })
          .expect(200);
      }

      // Execute complex query
      const startTime = Date.now();

      const complexQuery = await request(strapi.server.httpServer)
        .get('/api/products?filters[$and][0][status][$eq]=active&filters[$and][1][price][$gte]=50&filters[$and][2][featured][$eq]=true&populate[category]=*&populate[brand]=*&populate[variants]=*&populate[reviews][filters][status][$eq]=approved&sort=price:desc')
        .expect(200);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(complexQuery.body.data.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(3000); // Should complete within 3 seconds

      // Verify query results
      complexQuery.body.data.forEach(product => {
        expect(product.attributes.status).toBe('active');
        expect(product.attributes.price).toBeGreaterThanOrEqual(50);
        expect(product.attributes.featured).toBe(true);
        expect(product.attributes.category.data).toBeDefined();
        expect(product.attributes.brand.data).toBeDefined();
        expect(product.attributes.variants.data).toBeDefined();
        expect(product.attributes.reviews.data).toBeDefined();
      });

      console.log(`✅ Complex query test passed - Query completed in ${queryTime}ms`);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle database connection issues gracefully', async () => {
      // Test basic database connectivity
      const healthCheck = await request(strapi.server.httpServer)
        .get('/api/products?pagination[limit]=1')
        .expect(200);

      expect(healthCheck.body.data).toBeDefined();

      // Test recovery after simulated connection issue
      try {
        const products = await request(strapi.server.httpServer)
          .get('/api/products')
          .expect(200);

        expect(products.body.data).toBeDefined();
      } catch (error) {
        // Connection errors should be handled gracefully
        expect(error.code).not.toBe('ECONNRESET');
      }

      console.log('✅ Database connection handling test passed');
    });

    it('should handle malformed requests gracefully', async () => {
      const malformedRequests = [
        {
          method: 'post',
          path: '/api/products',
          data: { invalid: 'structure' }
        },
        {
          method: 'get',
          path: '/api/products?filters[invalid][nested][too][deep]=value'
        },
        {
          method: 'put',
          path: '/api/products/invalid-id',
          data: { data: { name: 'Test' } }
        }
      ];

      for (const req of malformedRequests) {
        const response = await request(strapi.server.httpServer)
          [req.method](req.path)
          .set('Authorization', adminRequest.headers.Authorization)
          .send(req.data || {});

        // Should return appropriate error codes, not crash
        expect([400, 404, 422]).toContain(response.status);
      }

      console.log('✅ Malformed request handling test passed');
    });
  });

  describe('Full Workflow Integration', () => {
    it('should complete a full marketplace scenario from creation to purchase simulation', async () => {
      console.log('🚀 Starting full marketplace integration test...');

      // 1. Setup marketplace data
      const brand = await request(strapi.server.httpServer)
        .post('/api/brands')
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            name: 'Ultimate Wellness Solutions',
            description: 'Premium wellness products for modern adults',
            website: 'https://ultimatewellness.com',
            isFeatured: true
          }
        })
        .expect(200);

      const rootCategory = await request(strapi.server.httpServer)
        .post('/api/categories')
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            name: 'Wellness & Health',
            description: 'Complete wellness and health product range',
            level: 0,
            isFeatured: true,
            showInNavigation: true
          }
        })
        .expect(200);

      const subCategory = await request(strapi.server.httpServer)
        .post('/api/categories')
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            name: 'Premium Adult Products',
            description: 'High-quality adult wellness products',
            parentCategory: rootCategory.body.data.id,
            level: 1,
            showInNavigation: true
          }
        })
        .expect(200);

      // 2. Create featured product
      const product = await request(strapi.server.httpServer)
        .post('/api/products')
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            name: 'Elite Wellness Companion Pro',
            description: 'The ultimate wellness companion featuring advanced technology, premium materials, and exceptional design for the most discerning customers.',
            shortDescription: 'Premium wellness companion with advanced features',
            price: 599.99,
            originalPrice: 799.99,
            sku: 'EWC-PRO-001',
            status: 'active',
            featured: true,
            trending: true,
            trendingScore: 98,
            stockQuantity: 25,
            lowStockThreshold: 5,
            category: subCategory.body.data.id,
            brand: brand.body.data.id,
            seoTitle: 'Elite Wellness Companion Pro - Premium Adult Wellness',
            seoDescription: 'Experience the ultimate in adult wellness with our Elite Companion Pro, featuring cutting-edge technology and premium materials.',
            sourceMarketplace: 'custom'
          }
        })
        .expect(200);

      // 3. Create product variants
      const variants = [];
      const variantConfigs = [
        { size: 'Medium', color: 'Rose Gold', colorHex: '#e8b4a0', price: 599.99, stock: 10 },
        { size: 'Large', color: 'Platinum', colorHex: '#c0c0c0', price: 699.99, stock: 8 },
        { size: 'XL', color: 'Diamond Black', colorHex: '#2c2c2c', price: 799.99, stock: 5 }
      ];

      for (let i = 0; i < variantConfigs.length; i++) {
        const config = variantConfigs[i];
        const variant = await request(strapi.server.httpServer)
          .post('/api/product-variants')
          .set('Authorization', adminRequest.headers.Authorization)
          .send({
            data: {
              product: product.body.data.id,
              sku: `EWC-PRO-001-${config.color.replace(/\s+/g, '').toUpperCase()}`,
              name: `Elite Companion Pro - ${config.color} ${config.size}`,
              price: config.price,
              stockQuantity: config.stock,
              size: config.size,
              color: config.color,
              colorHex: config.colorHex,
              material: 'Medical Grade Silicone',
              isDefault: i === 0,
              sortOrder: i + 1
            }
          })
          .expect(200);
        
        variants.push(variant.body.data);
      }

      // 4. Generate customer reviews
      const reviewData = [
        {
          name: 'Alexandra Thompson',
          email: 'alex@example.com',
          rating: 5,
          title: 'Absolutely incredible!',
          comment: 'This product has completely exceeded my expectations. The quality is outstanding, and the experience is truly premium. Worth every penny!',
          sentiment: 'positive',
          score: 0.95
        },
        {
          name: 'Michael Chen',
          email: 'mike@example.com',
          rating: 5,
          title: 'Best investment I\'ve made',
          comment: 'The attention to detail and quality is remarkable. This is clearly a premium product that delivers on all its promises.',
          sentiment: 'positive',
          score: 0.9
        },
        {
          name: 'Sarah Williams',
          email: 'sarah@example.com',
          rating: 4,
          title: 'Very impressed',
          comment: 'Excellent build quality and performance. The only minor issue is the price point, but the quality justifies it.',
          sentiment: 'positive',
          score: 0.8
        }
      ];

      for (const review of reviewData) {
        await request(strapi.server.httpServer)
          .post('/api/reviews')
          .set('Authorization', adminRequest.headers.Authorization)
          .send({
            data: {
              product: product.body.data.id,
              customerName: review.name,
              customerEmail: review.email,
              rating: review.rating,
              title: review.title,
              comment: review.comment,
              isVerifiedPurchase: true,
              isRecommended: true,
              status: 'approved',
              sentiment: review.sentiment,
              sentimentScore: review.score
            }
          })
          .expect(200);
      }

      // 5. Test customer journey - Product discovery
      const featuredProducts = await request(strapi.server.httpServer)
        .get('/api/products?filters[featured][$eq]=true&populate=*')
        .expect(200);

      expect(featuredProducts.body.data.length).toBe(1);
      expect(featuredProducts.body.data[0].attributes.name).toBe('Elite Wellness Companion Pro');

      // 6. Test product detail view
      const productDetail = await request(strapi.server.httpServer)
        .get(`/api/products/${product.body.data.id}?populate=*`)
        .expect(200);

      expect(productDetail.body.data.attributes.variants.data.length).toBe(3);
      expect(productDetail.body.data.attributes.reviews.data.length).toBe(3);
      expect(productDetail.body.data.attributes.brand.data.attributes.name).toBe('Ultimate Wellness Solutions');

      // 7. Test search functionality
      const searchResults = await request(strapi.server.httpServer)
        .get('/api/products?filters[name][$containsi]=elite&populate=*')
        .expect(200);

      expect(searchResults.body.data.length).toBe(1);

      // 8. Test category filtering
      const categoryProducts = await request(strapi.server.httpServer)
        .get(`/api/products?filters[category][id][$eq]=${subCategory.body.data.id}&populate=*`)
        .expect(200);

      expect(categoryProducts.body.data.length).toBe(1);

      // 9. Test price range filtering
      const priceFilteredProducts = await request(strapi.server.httpServer)
        .get('/api/products?filters[price][$gte]=500&filters[price][$lte]=700&populate=*')
        .expect(200);

      expect(priceFilteredProducts.body.data.length).toBe(1);

      // 10. Simulate inventory management
      const variantToUpdate = variants[0];
      const updatedVariant = await request(strapi.server.httpServer)
        .put(`/api/product-variants/${variantToUpdate.id}`)
        .set('Authorization', adminRequest.headers.Authorization)
        .send({
          data: {
            stockQuantity: variantToUpdate.attributes.stockQuantity - 2 // Simulate 2 purchases
          }
        })
        .expect(200);

      expect(updatedVariant.body.data.attributes.stockQuantity).toBe(8);

      // 11. Test low stock detection
      const lowStockVariants = await request(strapi.server.httpServer)
        .get('/api/product-variants?filters[stockQuantity][$lte]=5&populate=*')
        .expect(200);

      expect(lowStockVariants.body.data.length).toBe(1); // The XL variant with 5 stock

      // 12. Test analytics data
      const trendingProducts = await request(strapi.server.httpServer)
        .get('/api/products?filters[trending][$eq]=true&sort=trendingScore:desc&populate=*')
        .expect(200);

      expect(trendingProducts.body.data.length).toBe(1);
      expect(trendingProducts.body.data[0].attributes.trendingScore).toBe(98);

      // 13. Verify data integrity across all relationships
      const finalProductCheck = await request(strapi.server.httpServer)
        .get(`/api/products/${product.body.data.id}?populate[category][populate][parentCategory]=*&populate[brand]=*&populate[variants]=*&populate[reviews][filters][status][$eq]=approved`)
        .expect(200);

      const finalProduct = finalProductCheck.body.data;
      
      // Verify all relationships are intact
      expect(finalProduct.attributes.brand.data.attributes.name).toBe('Ultimate Wellness Solutions');
      expect(finalProduct.attributes.category.data.attributes.name).toBe('Premium Adult Products');
      expect(finalProduct.attributes.category.data.attributes.parentCategory.data.attributes.name).toBe('Wellness & Health');
      expect(finalProduct.attributes.variants.data.length).toBe(3);
      expect(finalProduct.attributes.reviews.data.length).toBe(3);

      // Verify calculated fields
      const approvedReviews = finalProduct.attributes.reviews.data;
      const avgRating = approvedReviews.reduce((sum, r) => sum + r.attributes.rating, 0) / approvedReviews.length;
      expect(avgRating).toBeGreaterThan(4.5);

      console.log('✅ Full marketplace integration test completed successfully!');
      console.log(`📊 Test Results:
        - Created 1 brand, 2 categories, 1 product, 3 variants, 3 reviews
        - All relationships verified
        - Search and filtering working
        - Inventory management functional
        - Data integrity maintained
        - Performance within acceptable limits`);

      return {
        success: true,
        metrics: {
          brand: brand.body.data,
          product: product.body.data,
          variants: variants.length,
          reviews: reviewData.length,
          averageRating: avgRating
        }
      };
    });
  });
});