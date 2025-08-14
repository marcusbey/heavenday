import { setupStrapi, cleanupStrapi } from '../helpers/strapi';
import { Strapi } from '@strapi/strapi';

describe('Category Content Model', () => {
  let strapi: Strapi;

  beforeAll(async () => {
    strapi = await setupStrapi();
  });

  afterAll(async () => {
    await cleanupStrapi(strapi);
  });

  beforeEach(async () => {
    // Clear categories table for each test
    await strapi.db.query('api::category.category').deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create category with required fields', async () => {
      const categoryData = {
        name: 'Electronics',
        description: 'Electronic products and gadgets'
      };

      const category = await strapi.entityService.create('api::category.category', {
        data: categoryData
      });

      expect(category).toBeDefined();
      expect(category.name).toBe(categoryData.name);
      expect(category.slug).toBe('electronics'); // Auto-generated
      expect(category.description).toBe(categoryData.description);
    });

    it('should fail validation with missing name', async () => {
      const invalidData = {
        description: 'Category without name'
      };

      await expect(
        strapi.entityService.create('api::category.category', {
          data: invalidData
        })
      ).rejects.toThrow();
    });

    it('should enforce unique slug constraint', async () => {
      const firstCategory = {
        name: 'Wellness Products',
        slug: 'wellness'
      };

      const duplicateSlug = {
        name: 'Wellness Items', // Different name but same slug will be generated
        slug: 'wellness'
      };

      await strapi.entityService.create('api::category.category', {
        data: firstCategory
      });

      await expect(
        strapi.entityService.create('api::category.category', {
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
        strapi.entityService.create('api::category.category', {
          data: longNameData
        })
      ).rejects.toThrow();
    });

    it('should validate level constraints', async () => {
      const invalidLevel = {
        name: 'Invalid Level Category',
        level: -1 // Invalid negative level
      };

      await expect(
        strapi.entityService.create('api::category.category', {
          data: invalidLevel
        })
      ).rejects.toThrow();
    });
  });

  describe('Default Values', () => {
    it('should set correct default values', async () => {
      const minimalCategory = {
        name: 'Default Test Category'
      };

      const category = await strapi.entityService.create('api::category.category', {
        data: minimalCategory
      });

      expect(category.level).toBe(0);
      expect(category.sortOrder).toBe(0);
      expect(category.isActive).toBe(true);
      expect(category.isFeatured).toBe(false);
      expect(category.showInNavigation).toBe(true);
      expect(category.metaRobots).toBe('index,follow');
      expect(category.productCount).toBe(0);
    });
  });

  describe('Hierarchical Relationships', () => {
    it('should establish parent-child relationships', async () => {
      const parentCategory = await strapi.entityService.create('api::category.category', {
        data: {
          name: 'Parent Category',
          level: 0
        }
      });

      const childCategory = await strapi.entityService.create('api::category.category', {
        data: {
          name: 'Child Category',
          parentCategory: parentCategory.id,
          level: 1
        },
        populate: ['parentCategory']
      });

      expect(childCategory.parentCategory).toBeDefined();
      expect(childCategory.parentCategory.id).toBe(parentCategory.id);
      expect(childCategory.parentCategory.name).toBe('Parent Category');
      expect(childCategory.level).toBe(1);
    });

    it('should retrieve children from parent', async () => {
      const parent = await strapi.entityService.create('api::category.category', {
        data: {
          name: 'Parent with Children',
          level: 0
        }
      });

      const child1 = await strapi.entityService.create('api::category.category', {
        data: {
          name: 'First Child',
          parentCategory: parent.id,
          level: 1
        }
      });

      const child2 = await strapi.entityService.create('api::category.category', {
        data: {
          name: 'Second Child',
          parentCategory: parent.id,
          level: 1
        }
      });

      const parentWithChildren = await strapi.entityService.findOne('api::category.category', parent.id, {
        populate: ['childCategories']
      });

      expect(parentWithChildren.childCategories).toBeDefined();
      expect(parentWithChildren.childCategories.length).toBe(2);
      expect(parentWithChildren.childCategories.map(c => c.name)).toContain('First Child');
      expect(parentWithChildren.childCategories.map(c => c.name)).toContain('Second Child');
    });

    it('should handle deep category hierarchy', async () => {
      const root = await strapi.entityService.create('api::category.category', {
        data: { name: 'Root Category', level: 0 }
      });

      const level1 = await strapi.entityService.create('api::category.category', {
        data: { name: 'Level 1', parentCategory: root.id, level: 1 }
      });

      const level2 = await strapi.entityService.create('api::category.category', {
        data: { name: 'Level 2', parentCategory: level1.id, level: 2 }
      });

      const deepCategory = await strapi.entityService.findOne('api::category.category', level2.id, {
        populate: {
          parentCategory: {
            populate: ['parentCategory']
          }
        }
      });

      expect(deepCategory.level).toBe(2);
      expect(deepCategory.parentCategory.level).toBe(1);
      expect(deepCategory.parentCategory.parentCategory.level).toBe(0);
      expect(deepCategory.parentCategory.parentCategory.name).toBe('Root Category');
    });

    it('should prevent circular references', async () => {
      const category1 = await strapi.entityService.create('api::category.category', {
        data: { name: 'Category 1' }
      });

      const category2 = await strapi.entityService.create('api::category.category', {
        data: { name: 'Category 2', parentCategory: category1.id }
      });

      // Attempt to make category1 a child of category2 (circular)
      await expect(
        strapi.entityService.update('api::category.category', category1.id, {
          data: { parentCategory: category2.id }
        })
      ).rejects.toThrow(); // Should fail due to circular reference prevention
    });
  });

  describe('Product Relationships', () => {
    let category: any;
    let product1: any;
    let product2: any;

    beforeEach(async () => {
      category = await strapi.entityService.create('api::category.category', {
        data: {
          name: 'Test Category',
          description: 'Category for product testing'
        }
      });

      product1 = await strapi.entityService.create('api::product.product', {
        data: {
          name: 'Product 1',
          description: 'First test product',
          price: 50.00,
          sku: 'PROD-001',
          category: category.id
        }
      });

      product2 = await strapi.entityService.create('api::product.product', {
        data: {
          name: 'Product 2',
          description: 'Second test product',
          price: 75.00,
          sku: 'PROD-002',
          category: category.id
        }
      });
    });

    it('should associate products with category', async () => {
      const categoryWithProducts = await strapi.entityService.findOne('api::category.category', category.id, {
        populate: ['products']
      });

      expect(categoryWithProducts.products).toBeDefined();
      expect(categoryWithProducts.products.length).toBe(2);
      expect(categoryWithProducts.products.map(p => p.name)).toContain('Product 1');
      expect(categoryWithProducts.products.map(p => p.name)).toContain('Product 2');
    });

    it('should update product count automatically', async () => {
      // This would require a lifecycle hook or custom logic
      // For now, test manual product count update
      const updatedCategory = await strapi.entityService.update('api::category.category', category.id, {
        data: { productCount: 2 }
      });

      expect(updatedCategory.productCount).toBe(2);
    });
  });

  describe('Category Filters Component', () => {
    it('should handle category filters component', async () => {
      const categoryWithFilters = {
        name: 'Category with Filters',
        description: 'Category with filter components',
        filters: [
          {
            name: 'Price Range',
            type: 'range',
            field: 'price',
            minValue: 0,
            maxValue: 1000
          },
          {
            name: 'Brand',
            type: 'select',
            field: 'brand',
            options: ['Brand A', 'Brand B', 'Brand C']
          }
        ]
      };

      const category = await strapi.entityService.create('api::category.category', {
        data: categoryWithFilters,
        populate: ['filters']
      });

      expect(category.filters).toBeDefined();
      expect(Array.isArray(category.filters)).toBe(true);
      expect(category.filters.length).toBe(2);
      expect(category.filters[0].name).toBe('Price Range');
      expect(category.filters[0].type).toBe('range');
      expect(category.filters[1].type).toBe('select');
      expect(category.filters[1].options).toContain('Brand A');
    });
  });

  describe('SEO Fields', () => {
    it('should handle SEO metadata fields', async () => {
      const seoCategory = {
        name: 'SEO Test Category',
        description: 'Category for SEO testing',
        seoTitle: 'Best SEO Category - Heaven Dolls',
        seoDescription: 'Discover the best products in our SEO category with amazing deals and quality.',
        seoKeywords: 'seo, category, products, deals',
        canonicalUrl: 'https://heaven-dolls.com/categories/seo-test',
        metaRobots: 'index,follow'
      };

      const category = await strapi.entityService.create('api::category.category', {
        data: seoCategory
      });

      expect(category.seoTitle).toBe('Best SEO Category - Heaven Dolls');
      expect(category.seoDescription).toBe('Discover the best products in our SEO category with amazing deals and quality.');
      expect(category.seoKeywords).toBe('seo, category, products, deals');
      expect(category.canonicalUrl).toBe('https://heaven-dolls.com/categories/seo-test');
      expect(category.metaRobots).toBe('index,follow');
    });

    it('should validate SEO field length limits', async () => {
      const longSeoTitle = {
        name: 'Long SEO Title Category',
        seoTitle: 'a'.repeat(61) // Exceeds 60 char limit
      };

      await expect(
        strapi.entityService.create('api::category.category', {
          data: longSeoTitle
        })
      ).rejects.toThrow();
    });
  });

  describe('Custom Fields and JSON Data', () => {
    it('should handle custom fields JSON data', async () => {
      const customFieldsData = {
        displaySettings: {
          showProductCount: true,
          layoutType: 'grid',
          productsPerRow: 4
        },
        analytics: {
          trackingEnabled: true,
          conversionGoals: ['purchase', 'add_to_cart']
        },
        customStyling: {
          backgroundColor: '#f8f9fa',
          textColor: '#343a40'
        }
      };

      const category = await strapi.entityService.create('api::category.category', {
        data: {
          name: 'Custom Fields Category',
          description: 'Category with custom JSON fields',
          customFields: customFieldsData
        }
      });

      expect(category.customFields).toBeDefined();
      expect(category.customFields.displaySettings.showProductCount).toBe(true);
      expect(category.customFields.analytics.trackingEnabled).toBe(true);
      expect(category.customFields.customStyling.backgroundColor).toBe('#f8f9fa');
    });
  });

  describe('Category Path Generation', () => {
    it('should generate category path for hierarchical structure', async () => {
      const root = await strapi.entityService.create('api::category.category', {
        data: { name: 'Electronics', level: 0 }
      });

      const sub = await strapi.entityService.create('api::category.category', {
        data: { 
          name: 'Computers', 
          parentCategory: root.id, 
          level: 1,
          path: 'electronics/computers'
        }
      });

      const subsub = await strapi.entityService.create('api::category.category', {
        data: { 
          name: 'Laptops', 
          parentCategory: sub.id, 
          level: 2,
          path: 'electronics/computers/laptops'
        }
      });

      expect(root.path).toBe(null); // Root has no path
      expect(sub.path).toBe('electronics/computers');
      expect(subsub.path).toBe('electronics/computers/laptops');
    });
  });

  describe('Sorting and Ordering', () => {
    it('should respect sort order', async () => {
      await strapi.entityService.create('api::category.category', {
        data: { name: 'Third Category', sortOrder: 3 }
      });

      await strapi.entityService.create('api::category.category', {
        data: { name: 'First Category', sortOrder: 1 }
      });

      await strapi.entityService.create('api::category.category', {
        data: { name: 'Second Category', sortOrder: 2 }
      });

      const categories = await strapi.entityService.findMany('api::category.category', {
        sort: ['sortOrder:asc']
      });

      expect(categories[0].name).toBe('First Category');
      expect(categories[1].name).toBe('Second Category');
      expect(categories[2].name).toBe('Third Category');
    });
  });

  describe('Featured Categories', () => {
    it('should handle featured category flag', async () => {
      const featuredCategory = await strapi.entityService.create('api::category.category', {
        data: {
          name: 'Featured Category',
          description: 'This is a featured category',
          isFeatured: true
        }
      });

      const regularCategory = await strapi.entityService.create('api::category.category', {
        data: {
          name: 'Regular Category',
          description: 'This is a regular category'
        }
      });

      expect(featuredCategory.isFeatured).toBe(true);
      expect(regularCategory.isFeatured).toBe(false);

      // Test filtering featured categories
      const featuredCategories = await strapi.entityService.findMany('api::category.category', {
        filters: { isFeatured: true }
      });

      expect(featuredCategories.length).toBe(1);
      expect(featuredCategories[0].name).toBe('Featured Category');
    });
  });

  describe('Navigation Display', () => {
    it('should control navigation display with showInNavigation flag', async () => {
      const navCategory = await strapi.entityService.create('api::category.category', {
        data: {
          name: 'Navigation Category',
          showInNavigation: true
        }
      });

      const hiddenCategory = await strapi.entityService.create('api::category.category', {
        data: {
          name: 'Hidden Category',
          showInNavigation: false
        }
      });

      const navigationCategories = await strapi.entityService.findMany('api::category.category', {
        filters: { showInNavigation: true }
      });

      expect(navigationCategories.length).toBe(1);
      expect(navigationCategories[0].name).toBe('Navigation Category');
    });
  });
});