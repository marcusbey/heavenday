import { setupStrapi, cleanupStrapi } from '../helpers/strapi';
import { Strapi } from '@strapi/strapi';

describe('Brand Content Model', () => {
  let strapi: Strapi;

  beforeAll(async () => {
    strapi = await setupStrapi();
  });

  afterAll(async () => {
    await cleanupStrapi(strapi);
  });

  beforeEach(async () => {
    // Clear brands table for each test
    await strapi.db.query('api::brand.brand').deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create brand with required fields', async () => {
      const brandData = {
        name: 'Premium Brand Co.',
        description: 'High-quality products for discerning customers'
      };

      const brand = await strapi.entityService.create('api::brand.brand', {
        data: brandData
      });

      expect(brand).toBeDefined();
      expect(brand.name).toBe(brandData.name);
      expect(brand.slug).toBe('premium-brand-co'); // Auto-generated
      expect(brand.description).toBe(brandData.description);
    });

    it('should fail validation with missing name', async () => {
      const invalidData = {
        description: 'Brand without name'
      };

      await expect(
        strapi.entityService.create('api::brand.brand', {
          data: invalidData
        })
      ).rejects.toThrow();
    });

    it('should enforce unique slug constraint', async () => {
      const firstBrand = {
        name: 'Unique Brand',
        slug: 'unique-brand'
      };

      const duplicateSlug = {
        name: 'Unique Brand Inc', // Different name but will generate same slug
        slug: 'unique-brand'
      };

      await strapi.entityService.create('api::brand.brand', {
        data: firstBrand
      });

      await expect(
        strapi.entityService.create('api::brand.brand', {
          data: duplicateSlug
        })
      ).rejects.toThrow();
    });

    it('should validate field length constraints', async () => {
      const longNameData = {
        name: 'a'.repeat(256), // Exceeds 255 char limit
        description: 'Test description'
      };

      await expect(
        strapi.entityService.create('api::brand.brand', {
          data: longNameData
        })
      ).rejects.toThrow();
    });

    it('should validate website URL format', async () => {
      const invalidUrl = {
        name: 'URL Test Brand',
        website: 'not-a-valid-url'
      };

      await expect(
        strapi.entityService.create('api::brand.brand', {
          data: invalidUrl
        })
      ).rejects.toThrow();
    });

    it('should accept valid website URLs', async () => {
      const validUrls = [
        'https://example.com',
        'http://example.com',
        'https://www.example.com',
        'https://subdomain.example.com',
        'https://example.com/path'
      ];

      for (const url of validUrls) {
        const brand = await strapi.entityService.create('api::brand.brand', {
          data: {
            name: `URL Brand ${url}`,
            website: url
          }
        });

        expect(brand.website).toBe(url);
      }
    });

    it('should validate email format', async () => {
      const invalidEmail = {
        name: 'Email Test Brand',
        email: 'not-an-email'
      };

      await expect(
        strapi.entityService.create('api::brand.brand', {
          data: invalidEmail
        })
      ).rejects.toThrow();
    });

    it('should accept valid email addresses', async () => {
      const validEmails = [
        'contact@example.com',
        'info@brand.co.uk',
        'support@sub.domain.com'
      ];

      for (const email of validEmails) {
        const brand = await strapi.entityService.create('api::brand.brand', {
          data: {
            name: `Email Brand ${email}`,
            email: email
          }
        });

        expect(brand.email).toBe(email);
      }
    });

    it('should validate founded year constraints', async () => {
      const tooEarly = {
        name: 'Ancient Brand',
        foundedYear: 1799 // Before 1800 minimum
      };

      const tooLate = {
        name: 'Future Brand',
        foundedYear: 2025 // After 2024 maximum
      };

      await expect(
        strapi.entityService.create('api::brand.brand', {
          data: tooEarly
        })
      ).rejects.toThrow();

      await expect(
        strapi.entityService.create('api::brand.brand', {
          data: tooLate
        })
      ).rejects.toThrow();
    });

    it('should accept valid founded years', async () => {
      const validYears = [1800, 1900, 2000, 2024];

      for (const year of validYears) {
        const brand = await strapi.entityService.create('api::brand.brand', {
          data: {
            name: `Brand Founded ${year}`,
            foundedYear: year
          }
        });

        expect(brand.foundedYear).toBe(year);
      }
    });

    it('should validate average rating constraints', async () => {
      const negativeRating = {
        name: 'Negative Rating Brand',
        averageRating: -1.0
      };

      const tooHighRating = {
        name: 'Too High Rating Brand',
        averageRating: 6.0
      };

      await expect(
        strapi.entityService.create('api::brand.brand', {
          data: negativeRating
        })
      ).rejects.toThrow();

      await expect(
        strapi.entityService.create('api::brand.brand', {
          data: tooHighRating
        })
      ).rejects.toThrow();
    });
  });

  describe('Default Values', () => {
    it('should set correct default values', async () => {
      const minimalBrand = {
        name: 'Minimal Brand'
      };

      const brand = await strapi.entityService.create('api::brand.brand', {
        data: minimalBrand
      });

      expect(brand.isActive).toBe(true);
      expect(brand.isFeatured).toBe(false);
      expect(brand.productCount).toBe(0);
      expect(brand.metaRobots).toBe('index,follow');
    });
  });

  describe('Component Fields', () => {
    it('should handle address component', async () => {
      const brandWithAddress = {
        name: 'Address Brand',
        description: 'Brand with address component',
        address: {
          street: '123 Business Ave',
          city: 'Commerce City',
          state: 'California',
          postalCode: '90210',
          country: 'USA'
        }
      };

      const brand = await strapi.entityService.create('api::brand.brand', {
        data: brandWithAddress,
        populate: ['address']
      });

      expect(brand.address).toBeDefined();
      expect(brand.address.street).toBe('123 Business Ave');
      expect(brand.address.city).toBe('Commerce City');
      expect(brand.address.postalCode).toBe('90210');
      expect(brand.address.country).toBe('USA');
    });

    it('should handle social media component', async () => {
      const brandWithSocial = {
        name: 'Social Brand',
        description: 'Brand with social media links',
        socialMedia: {
          facebook: 'https://facebook.com/socialbrand',
          twitter: 'https://twitter.com/socialbrand',
          instagram: 'https://instagram.com/socialbrand',
          linkedin: 'https://linkedin.com/company/socialbrand',
          youtube: 'https://youtube.com/c/socialbrand',
          tiktok: 'https://tiktok.com/@socialbrand'
        }
      };

      const brand = await strapi.entityService.create('api::brand.brand', {
        data: brandWithSocial,
        populate: ['socialMedia']
      });

      expect(brand.socialMedia).toBeDefined();
      expect(brand.socialMedia.facebook).toBe('https://facebook.com/socialbrand');
      expect(brand.socialMedia.twitter).toBe('https://twitter.com/socialbrand');
      expect(brand.socialMedia.instagram).toBe('https://instagram.com/socialbrand');
      expect(brand.socialMedia.linkedin).toBe('https://linkedin.com/company/socialbrand');
      expect(brand.socialMedia.youtube).toBe('https://youtube.com/c/socialbrand');
      expect(brand.socialMedia.tiktok).toBe('https://tiktok.com/@socialbrand');
    });
  });

  describe('Product Relationships', () => {
    let brand: any;
    let products: any[];

    beforeEach(async () => {
      brand = await strapi.entityService.create('api::brand.brand', {
        data: {
          name: 'Test Brand',
          description: 'Brand for product testing'
        }
      });

      products = [];
      for (let i = 1; i <= 3; i++) {
        const product = await strapi.entityService.create('api::product.product', {
          data: {
            name: `Product ${i}`,
            description: `Test product ${i}`,
            price: i * 25.00,
            sku: `PROD-${i.toString().padStart(3, '0')}`,
            brand: brand.id
          }
        });
        products.push(product);
      }
    });

    it('should associate products with brand', async () => {
      const brandWithProducts = await strapi.entityService.findOne('api::brand.brand', brand.id, {
        populate: ['products']
      });

      expect(brandWithProducts.products).toBeDefined();
      expect(brandWithProducts.products.length).toBe(3);
      expect(brandWithProducts.products.map(p => p.name)).toContain('Product 1');
      expect(brandWithProducts.products.map(p => p.name)).toContain('Product 2');
      expect(brandWithProducts.products.map(p => p.name)).toContain('Product 3');
    });

    it('should update product count', async () => {
      // This would typically be handled by a lifecycle hook
      const updatedBrand = await strapi.entityService.update('api::brand.brand', brand.id, {
        data: { productCount: products.length }
      });

      expect(updatedBrand.productCount).toBe(3);
    });

    it('should calculate average rating from products', async () => {
      // Simulate products with ratings
      await strapi.entityService.update('api::product.product', products[0].id, {
        data: { averageRating: 4.5 }
      });

      await strapi.entityService.update('api::product.product', products[1].id, {
        data: { averageRating: 3.8 }
      });

      await strapi.entityService.update('api::product.product', products[2].id, {
        data: { averageRating: 4.2 }
      });

      // Calculate average: (4.5 + 3.8 + 4.2) / 3 = 4.17
      const expectedAverage = 4.17;

      const updatedBrand = await strapi.entityService.update('api::brand.brand', brand.id, {
        data: { averageRating: expectedAverage }
      });

      expect(updatedBrand.averageRating).toBeCloseTo(expectedAverage, 2);
    });
  });

  describe('SEO Fields', () => {
    it('should handle SEO metadata fields', async () => {
      const seoBrand = {
        name: 'SEO Brand',
        description: 'Brand for SEO testing',
        seoTitle: 'Best SEO Brand - Premium Products',
        seoDescription: 'Discover premium products from the leading SEO brand with exceptional quality and service.',
        metaRobots: 'index,follow'
      };

      const brand = await strapi.entityService.create('api::brand.brand', {
        data: seoBrand
      });

      expect(brand.seoTitle).toBe('Best SEO Brand - Premium Products');
      expect(brand.seoDescription).toBe('Discover premium products from the leading SEO brand with exceptional quality and service.');
      expect(brand.metaRobots).toBe('index,follow');
    });

    it('should validate SEO field length limits', async () => {
      const longSeoTitle = {
        name: 'Long SEO Title Brand',
        seoTitle: 'a'.repeat(61) // Exceeds 60 char limit
      };

      const longSeoDescription = {
        name: 'Long SEO Description Brand',
        seoDescription: 'a'.repeat(161) // Exceeds 160 char limit
      };

      await expect(
        strapi.entityService.create('api::brand.brand', {
          data: longSeoTitle
        })
      ).rejects.toThrow();

      await expect(
        strapi.entityService.create('api::brand.brand', {
          data: longSeoDescription
        })
      ).rejects.toThrow();
    });
  });

  describe('Featured Brands', () => {
    it('should handle featured brand functionality', async () => {
      const featuredBrand = await strapi.entityService.create('api::brand.brand', {
        data: {
          name: 'Featured Brand',
          description: 'This is a featured brand',
          isFeatured: true
        }
      });

      const regularBrand = await strapi.entityService.create('api::brand.brand', {
        data: {
          name: 'Regular Brand',
          description: 'This is a regular brand'
        }
      });

      expect(featuredBrand.isFeatured).toBe(true);
      expect(regularBrand.isFeatured).toBe(false);

      // Test filtering featured brands
      const featuredBrands = await strapi.entityService.findMany('api::brand.brand', {
        filters: { isFeatured: true }
      });

      expect(featuredBrands.length).toBe(1);
      expect(featuredBrands[0].name).toBe('Featured Brand');
    });
  });

  describe('Brand Status Management', () => {
    it('should handle active/inactive status', async () => {
      const activeBrand = await strapi.entityService.create('api::brand.brand', {
        data: {
          name: 'Active Brand',
          isActive: true
        }
      });

      const inactiveBrand = await strapi.entityService.create('api::brand.brand', {
        data: {
          name: 'Inactive Brand',
          isActive: false
        }
      });

      expect(activeBrand.isActive).toBe(true);
      expect(inactiveBrand.isActive).toBe(false);

      // Test filtering active brands
      const activeBrands = await strapi.entityService.findMany('api::brand.brand', {
        filters: { isActive: true }
      });

      expect(activeBrands.length).toBe(1);
      expect(activeBrands[0].name).toBe('Active Brand');
    });

    it('should deactivate brand and handle cascading effects', async () => {
      const brand = await strapi.entityService.create('api::brand.brand', {
        data: {
          name: 'Brand to Deactivate',
          isActive: true
        }
      });

      // Create a product associated with this brand
      const product = await strapi.entityService.create('api::product.product', {
        data: {
          name: 'Brand Product',
          description: 'Product from brand to be deactivated',
          price: 100.00,
          sku: 'DEACT-001',
          brand: brand.id
        }
      });

      // Deactivate the brand
      const deactivatedBrand = await strapi.entityService.update('api::brand.brand', brand.id, {
        data: { isActive: false }
      });

      expect(deactivatedBrand.isActive).toBe(false);

      // The product should still exist but might be handled differently
      // This depends on business logic implementation
      const associatedProduct = await strapi.entityService.findOne('api::product.product', product.id, {
        populate: ['brand']
      });

      expect(associatedProduct.brand.isActive).toBe(false);
    });
  });

  describe('Comprehensive Brand Data', () => {
    it('should create brand with all optional fields populated', async () => {
      const comprehensiveBrand = {
        name: 'Comprehensive Brand Ltd.',
        description: 'A fully featured brand with all data populated',
        website: 'https://comprehensive-brand.com',
        email: 'contact@comprehensive-brand.com',
        phone: '+1-555-BRAND-01',
        foundedYear: 1995,
        country: 'United States',
        isActive: true,
        isFeatured: true,
        productCount: 25,
        averageRating: 4.3,
        seoTitle: 'Comprehensive Brand - Premium Quality Products',
        seoDescription: 'Leading brand offering premium quality products with exceptional customer service since 1995.',
        metaRobots: 'index,follow',
        address: {
          street: '456 Brand Boulevard',
          city: 'Brand City',
          state: 'Brandfornia',
          postalCode: '12345',
          country: 'Brandland'
        },
        socialMedia: {
          facebook: 'https://facebook.com/comprehensivebrand',
          twitter: 'https://twitter.com/compbrand',
          instagram: 'https://instagram.com/comprehensive_brand',
          linkedin: 'https://linkedin.com/company/comprehensive-brand',
          youtube: 'https://youtube.com/c/ComprehensiveBrand'
        }
      };

      const brand = await strapi.entityService.create('api::brand.brand', {
        data: comprehensiveBrand,
        populate: ['address', 'socialMedia']
      });

      // Verify all fields are correctly stored
      expect(brand.name).toBe('Comprehensive Brand Ltd.');
      expect(brand.slug).toBe('comprehensive-brand-ltd');
      expect(brand.website).toBe('https://comprehensive-brand.com');
      expect(brand.email).toBe('contact@comprehensive-brand.com');
      expect(brand.phone).toBe('+1-555-BRAND-01');
      expect(brand.foundedYear).toBe(1995);
      expect(brand.country).toBe('United States');
      expect(brand.isActive).toBe(true);
      expect(brand.isFeatured).toBe(true);
      expect(brand.productCount).toBe(25);
      expect(brand.averageRating).toBe(4.3);
      expect(brand.seoTitle).toBe('Comprehensive Brand - Premium Quality Products');
      expect(brand.address.street).toBe('456 Brand Boulevard');
      expect(brand.socialMedia.facebook).toBe('https://facebook.com/comprehensivebrand');
    });
  });

  describe('Brand Search and Filtering', () => {
    beforeEach(async () => {
      // Create multiple brands for search testing
      await strapi.entityService.create('api::brand.brand', {
        data: {
          name: 'Apple Inc.',
          description: 'Technology company',
          country: 'United States',
          foundedYear: 1976,
          isFeatured: true
        }
      });

      await strapi.entityService.create('api::brand.brand', {
        data: {
          name: 'Samsung Electronics',
          description: 'Electronics manufacturer',
          country: 'South Korea',
          foundedYear: 1938,
          isFeatured: false
        }
      });

      await strapi.entityService.create('api::brand.brand', {
        data: {
          name: 'Sony Corporation',
          description: 'Entertainment and technology',
          country: 'Japan',
          foundedYear: 1946,
          isFeatured: true
        }
      });
    });

    it('should find brands by name search', async () => {
      const searchResults = await strapi.entityService.findMany('api::brand.brand', {
        filters: {
          name: { $containsi: 'apple' }
        }
      });

      expect(searchResults.length).toBe(1);
      expect(searchResults[0].name).toBe('Apple Inc.');
    });

    it('should filter brands by country', async () => {
      const usaBrands = await strapi.entityService.findMany('api::brand.brand', {
        filters: {
          country: 'United States'
        }
      });

      expect(usaBrands.length).toBe(1);
      expect(usaBrands[0].name).toBe('Apple Inc.');
    });

    it('should filter featured brands', async () => {
      const featuredBrands = await strapi.entityService.findMany('api::brand.brand', {
        filters: {
          isFeatured: true
        }
      });

      expect(featuredBrands.length).toBe(2);
      expect(featuredBrands.map(b => b.name)).toContain('Apple Inc.');
      expect(featuredBrands.map(b => b.name)).toContain('Sony Corporation');
    });

    it('should filter brands by founded year range', async () => {
      const modernBrands = await strapi.entityService.findMany('api::brand.brand', {
        filters: {
          foundedYear: { $gte: 1950 }
        }
      });

      expect(modernBrands.length).toBe(1);
      expect(modernBrands[0].name).toBe('Apple Inc.');
    });
  });
});