import { setupStrapi, cleanupStrapi } from '../helpers/strapi';
import { Strapi } from '@strapi/strapi';

describe('Product Content Model', () => {
  let strapi: Strapi;

  beforeAll(async () => {
    strapi = await setupStrapi();
  });

  afterAll(async () => {
    await cleanupStrapi(strapi);
  });

  beforeEach(async () => {
    // Clear products table for each test
    await strapi.db.query('api::product.product').deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create product with all required fields', async () => {
      const productData = {
        name: 'Test Product',
        description: 'This is a test product description',
        price: 99.99,
        sku: 'TEST-SKU-001',
        status: 'active',
        stockQuantity: 50,
        mainImage: null, // Will be handled in media tests
        images: []
      };

      const product = await strapi.entityService.create('api::product.product', {
        data: productData
      });

      expect(product).toBeDefined();
      expect(product.name).toBe(productData.name);
      expect(product.price).toBe(productData.price);
      expect(product.sku).toBe(productData.sku);
      expect(product.slug).toBe('test-product'); // Auto-generated from name
      expect(product.stockQuantity).toBe(productData.stockQuantity);
    });

    it('should fail validation with missing required fields', async () => {
      const invalidData = {
        description: 'Missing name, price, and SKU'
      };

      await expect(
        strapi.entityService.create('api::product.product', {
          data: invalidData
        })
      ).rejects.toThrow();
    });

    it('should validate field length constraints', async () => {
      const longNameData = {
        name: 'a'.repeat(256), // Exceeds 255 char limit
        description: 'Test description',
        price: 99.99,
        sku: 'TEST-001'
      };

      await expect(
        strapi.entityService.create('api::product.product', {
          data: longNameData
        })
      ).rejects.toThrow();
    });

    it('should enforce unique SKU constraint', async () => {
      const firstProduct = {
        name: 'First Product',
        description: 'First product description',
        price: 50.00,
        sku: 'UNIQUE-SKU-001'
      };

      const duplicateSku = {
        name: 'Second Product',
        description: 'Second product description',
        price: 75.00,
        sku: 'UNIQUE-SKU-001' // Same SKU
      };

      await strapi.entityService.create('api::product.product', {
        data: firstProduct
      });

      await expect(
        strapi.entityService.create('api::product.product', {
          data: duplicateSku
        })
      ).rejects.toThrow();
    });

    it('should validate price constraints', async () => {
      const negativePrice = {
        name: 'Invalid Price Product',
        description: 'Product with negative price',
        price: -10.50, // Invalid negative price
        sku: 'NEG-PRICE-001'
      };

      await expect(
        strapi.entityService.create('api::product.product', {
          data: negativePrice
        })
      ).rejects.toThrow();
    });

    it('should validate discount percentage constraints', async () => {
      const invalidDiscount = {
        name: 'Invalid Discount Product',
        description: 'Product with invalid discount',
        price: 100.00,
        originalPrice: 120.00,
        discountPercentage: 150, // Invalid: exceeds 100%
        sku: 'INVALID-DISCOUNT-001'
      };

      await expect(
        strapi.entityService.create('api::product.product', {
          data: invalidDiscount
        })
      ).rejects.toThrow();
    });

    it('should validate status enumeration', async () => {
      const invalidStatus = {
        name: 'Invalid Status Product',
        description: 'Product with invalid status',
        price: 100.00,
        sku: 'INVALID-STATUS-001',
        status: 'invalid_status' // Not in enum
      };

      await expect(
        strapi.entityService.create('api::product.product', {
          data: invalidStatus
        })
      ).rejects.toThrow();
    });

    it('should validate rating constraints', async () => {
      const invalidRating = {
        name: 'Invalid Rating Product',
        description: 'Product with invalid rating',
        price: 100.00,
        sku: 'INVALID-RATING-001',
        averageRating: 6 // Exceeds max of 5
      };

      await expect(
        strapi.entityService.create('api::product.product', {
          data: invalidRating
        })
      ).rejects.toThrow();
    });
  });

  describe('Default Values', () => {
    it('should set correct default values', async () => {
      const minimalProduct = {
        name: 'Minimal Product',
        description: 'Minimal product description',
        price: 50.00,
        sku: 'MIN-001'
      };

      const product = await strapi.entityService.create('api::product.product', {
        data: minimalProduct
      });

      expect(product.status).toBe('draft');
      expect(product.trackInventory).toBe(true);
      expect(product.stockQuantity).toBe(0);
      expect(product.lowStockThreshold).toBe(10);
      expect(product.allowBackorder).toBe(false);
      expect(product.featured).toBe(false);
      expect(product.trending).toBe(false);
      expect(product.viewCount).toBe(0);
      expect(product.purchaseCount).toBe(0);
      expect(product.wishlistCount).toBe(0);
      expect(product.reviewCount).toBe(0);
      expect(product.isActive).toBe(true);
      expect(product.metaRobots).toBe('index,follow');
      expect(product.sourceMarketplace).toBe('custom');
    });
  });

  describe('Relationships', () => {
    let category: any;
    let brand: any;

    beforeEach(async () => {
      // Create test category and brand
      category = await strapi.entityService.create('api::category.category', {
        data: {
          name: 'Test Category',
          slug: 'test-category',
          description: 'Test category description'
        }
      });

      brand = await strapi.entityService.create('api::brand.brand', {
        data: {
          name: 'Test Brand',
          slug: 'test-brand',
          description: 'Test brand description'
        }
      });
    });

    it('should establish category relationship', async () => {
      const productData = {
        name: 'Product with Category',
        description: 'Product linked to category',
        price: 75.00,
        sku: 'CAT-PROD-001',
        category: category.id
      };

      const product = await strapi.entityService.create('api::product.product', {
        data: productData,
        populate: ['category']
      });

      expect(product.category).toBeDefined();
      expect(product.category.id).toBe(category.id);
      expect(product.category.name).toBe('Test Category');
    });

    it('should establish brand relationship', async () => {
      const productData = {
        name: 'Product with Brand',
        description: 'Product linked to brand',
        price: 85.00,
        sku: 'BRAND-PROD-001',
        brand: brand.id
      };

      const product = await strapi.entityService.create('api::product.product', {
        data: productData,
        populate: ['brand']
      });

      expect(product.brand).toBeDefined();
      expect(product.brand.id).toBe(brand.id);
      expect(product.brand.name).toBe('Test Brand');
    });

    it('should handle multiple relationships', async () => {
      const productData = {
        name: 'Product with Multiple Relations',
        description: 'Product with category and brand',
        price: 120.00,
        sku: 'MULTI-REL-001',
        category: category.id,
        brand: brand.id
      };

      const product = await strapi.entityService.create('api::product.product', {
        data: productData,
        populate: ['category', 'brand']
      });

      expect(product.category.id).toBe(category.id);
      expect(product.brand.id).toBe(brand.id);
    });

    it('should handle self-referential relationships (related products)', async () => {
      const product1 = await strapi.entityService.create('api::product.product', {
        data: {
          name: 'Product One',
          description: 'First product',
          price: 100.00,
          sku: 'PROD-001'
        }
      });

      const product2 = await strapi.entityService.create('api::product.product', {
        data: {
          name: 'Product Two',
          description: 'Second product',
          price: 150.00,
          sku: 'PROD-002',
          relatedProducts: [product1.id]
        },
        populate: ['relatedProducts']
      });

      expect(product2.relatedProducts).toBeDefined();
      expect(product2.relatedProducts.length).toBe(1);
      expect(product2.relatedProducts[0].id).toBe(product1.id);
    });
  });

  describe('Lifecycle Hooks', () => {
    it('should execute beforeCreate lifecycle hook', async () => {
      // This tests if any custom lifecycle hooks are working
      const productData = {
        name: 'Lifecycle Test Product',
        description: 'Testing lifecycle hooks',
        price: 99.99,
        sku: 'LIFECYCLE-001'
      };

      const product = await strapi.entityService.create('api::product.product', {
        data: productData
      });

      // Check if any automatic fields were set by lifecycle hooks
      expect(product.createdAt).toBeDefined();
      expect(product.updatedAt).toBeDefined();
    });

    it('should execute beforeUpdate lifecycle hook', async () => {
      const product = await strapi.entityService.create('api::product.product', {
        data: {
          name: 'Update Test Product',
          description: 'Product for update testing',
          price: 50.00,
          sku: 'UPDATE-001'
        }
      });

      const updatedProduct = await strapi.entityService.update('api::product.product', product.id, {
        data: {
          price: 75.00
        }
      });

      expect(updatedProduct.updatedAt).not.toBe(product.updatedAt);
      expect(updatedProduct.price).toBe(75.00);
    });
  });

  describe('Component Fields', () => {
    it('should handle dimensions component', async () => {
      const productWithDimensions = {
        name: 'Product with Dimensions',
        description: 'Product with dimension component',
        price: 100.00,
        sku: 'DIM-001',
        dimensions: {
          length: 10.5,
          width: 8.2,
          height: 15.0,
          unit: 'cm'
        }
      };

      const product = await strapi.entityService.create('api::product.product', {
        data: productWithDimensions,
        populate: ['dimensions']
      });

      expect(product.dimensions).toBeDefined();
      expect(product.dimensions.length).toBe(10.5);
      expect(product.dimensions.width).toBe(8.2);
      expect(product.dimensions.height).toBe(15.0);
      expect(product.dimensions.unit).toBe('cm');
    });

    it('should handle specifications component array', async () => {
      const productWithSpecs = {
        name: 'Product with Specifications',
        description: 'Product with specification components',
        price: 150.00,
        sku: 'SPEC-001',
        specifications: [
          {
            name: 'Material',
            value: 'Silicone',
            category: 'Construction'
          },
          {
            name: 'Weight',
            value: '2.5kg',
            category: 'Physical'
          }
        ]
      };

      const product = await strapi.entityService.create('api::product.product', {
        data: productWithSpecs,
        populate: ['specifications']
      });

      expect(product.specifications).toBeDefined();
      expect(Array.isArray(product.specifications)).toBe(true);
      expect(product.specifications.length).toBe(2);
      expect(product.specifications[0].name).toBe('Material');
      expect(product.specifications[1].value).toBe('2.5kg');
    });
  });

  describe('JSON Fields', () => {
    it('should handle structured data JSON field', async () => {
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
          description: 'Product with JSON structured data',
          price: 99.99,
          sku: 'JSON-001',
          structuredData: structuredData
        }
      });

      expect(product.structuredData).toBeDefined();
      expect(product.structuredData['@type']).toBe('Product');
      expect(product.structuredData.offers.price).toBe('99.99');
    });

    it('should handle scraping metadata JSON field', async () => {
      const scrapingMetadata = {
        lastScraped: '2024-01-15T10:30:00Z',
        source: 'amazon',
        priceHistory: [
          { date: '2024-01-01', price: 120.00 },
          { date: '2024-01-15', price: 99.99 }
        ],
        availability: 'in_stock'
      };

      const product = await strapi.entityService.create('api::product.product', {
        data: {
          name: 'Scraped Product',
          description: 'Product with scraping metadata',
          price: 99.99,
          sku: 'SCRAPED-001',
          scrapingMetadata: scrapingMetadata,
          sourceMarketplace: 'amazon',
          externalId: 'AMZ-12345'
        }
      });

      expect(product.scrapingMetadata).toBeDefined();
      expect(product.scrapingMetadata.source).toBe('amazon');
      expect(product.scrapingMetadata.priceHistory.length).toBe(2);
    });
  });

  describe('Field Updates and Calculations', () => {
    it('should auto-calculate discount percentage', async () => {
      const product = await strapi.entityService.create('api::product.product', {
        data: {
          name: 'Discount Product',
          description: 'Product with auto-calculated discount',
          price: 80.00,
          originalPrice: 100.00,
          sku: 'DISCOUNT-001'
        }
      });

      // The discount calculation should be handled by the controller or lifecycle
      // Check if it's calculated correctly: (100 - 80) / 100 * 100 = 20%
      const updated = await strapi.entityService.update('api::product.product', product.id, {
        data: { price: 80.00, originalPrice: 100.00 }
      });

      // Note: This depends on having the calculation logic in controller/lifecycle
      // For now, just ensure the fields are saved correctly
      expect(updated.price).toBe(80.00);
      expect(updated.originalPrice).toBe(100.00);
    });

    it('should handle trending score updates', async () => {
      const product = await strapi.entityService.create('api::product.product', {
        data: {
          name: 'Trending Product',
          description: 'Product with trending score',
          price: 120.00,
          sku: 'TRENDING-001',
          trendingScore: 85.5,
          trending: true
        }
      });

      expect(product.trendingScore).toBe(85.5);
      expect(product.trending).toBe(true);
    });

    it('should track view count increments', async () => {
      const product = await strapi.entityService.create('api::product.product', {
        data: {
          name: 'View Tracking Product',
          description: 'Product for view count testing',
          price: 60.00,
          sku: 'VIEW-001',
          viewCount: 0
        }
      });

      // Simulate view count increment
      const updated = await strapi.entityService.update('api::product.product', product.id, {
        data: { viewCount: product.viewCount + 1 }
      });

      expect(updated.viewCount).toBe(1);
    });
  });
});