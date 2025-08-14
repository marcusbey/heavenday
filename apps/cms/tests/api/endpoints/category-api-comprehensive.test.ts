import { setupStrapi, cleanupStrapi, createAuthenticatedRequest } from '../../helpers/strapi';
import { Strapi } from '@strapi/strapi';
import request from 'supertest';

describe('Category API Endpoints - Comprehensive Tests', () => {
  let strapi: Strapi;
  let authenticatedRequest: any;
  let adminRequest: any;
  let testCategories: any[];

  beforeAll(async () => {
    strapi = await setupStrapi();
    authenticatedRequest = createAuthenticatedRequest(strapi);
    adminRequest = await authenticatedRequest.asAdmin();
  });

  afterAll(async () => {
    await cleanupStrapi(strapi);
  });

  beforeEach(async () => {
    // Clean up existing data
    await strapi.db.query('api::category.category').deleteMany({});

    // Create test categories with hierarchical structure
    testCategories = [];
    
    // Root categories
    const electronics = await strapi.entityService.create('api::category.category', {
      data: {
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic products and gadgets',
        level: 0,
        sortOrder: 1,
        isActive: true,
        isFeatured: true,
        showInNavigation: true
      }
    });
    testCategories.push(electronics);

    const clothing = await strapi.entityService.create('api::category.category', {
      data: {
        name: 'Clothing',
        slug: 'clothing',
        description: 'Fashion and apparel',
        level: 0,
        sortOrder: 2,
        isActive: true,
        isFeatured: false,
        showInNavigation: true
      }
    });
    testCategories.push(clothing);

    // Sub-categories under Electronics
    const computers = await strapi.entityService.create('api::category.category', {
      data: {
        name: 'Computers',
        slug: 'computers',
        description: 'Desktop and laptop computers',
        parentCategory: electronics.id,
        level: 1,
        sortOrder: 1,
        isActive: true,
        showInNavigation: true
      }
    });
    testCategories.push(computers);

    const phones = await strapi.entityService.create('api::category.category', {
      data: {
        name: 'Phones',
        slug: 'phones',
        description: 'Mobile phones and smartphones',
        parentCategory: electronics.id,
        level: 1,
        sortOrder: 2,
        isActive: true,
        showInNavigation: true
      }
    });
    testCategories.push(phones);

    // Sub-sub-category under Computers
    const laptops = await strapi.entityService.create('api::category.category', {
      data: {
        name: 'Laptops',
        slug: 'laptops',
        description: 'Portable laptop computers',
        parentCategory: computers.id,
        level: 2,
        sortOrder: 1,
        isActive: true,
        showInNavigation: true
      }
    });
    testCategories.push(laptops);

    // Inactive category
    const inactive = await strapi.entityService.create('api::category.category', {
      data: {
        name: 'Inactive Category',
        slug: 'inactive-category',
        description: 'This category is inactive',
        level: 0,
        isActive: false,
        showInNavigation: false
      }
    });
    testCategories.push(inactive);
  });

  describe('GET /api/categories', () => {
    it('should return all active categories for public access', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/categories')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(5); // All active categories
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.pagination).toBeDefined();
    });

    it('should return all categories including inactive for admin', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/categories')
        .set('Authorization', adminRequest.headers.Authorization)
        .expect(200);

      expect(response.body.data.length).toBe(6); // Including inactive category
    });

    it('should filter categories by active status', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/categories?filters[isActive][$eq]=true')
        .expect(200);

      expect(response.body.data.length).toBe(5);
      expect(response.body.data.every(c => c.attributes.isActive === true)).toBe(true);
    });

    it('should filter categories by featured status', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/categories?filters[isFeatured][$eq]=true')
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].attributes.name).toBe('Electronics');
      expect(response.body.data[0].attributes.isFeatured).toBe(true);
    });

    it('should filter categories by navigation visibility', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/categories?filters[showInNavigation][$eq]=true')
        .expect(200);

      expect(response.body.data.length).toBe(5);
      expect(response.body.data.every(c => c.attributes.showInNavigation === true)).toBe(true);
    });

    it('should filter categories by level (root categories)', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/categories?filters[level][$eq]=0')
        .expect(200);

      expect(response.body.data.length).toBe(2); // Electronics and Clothing (active root categories)
      expect(response.body.data.every(c => c.attributes.level === 0)).toBe(true);
    });

    it('should filter categories by parent category', async () => {
      const electronicsId = testCategories.find(c => c.name === 'Electronics').id;
      const response = await request(strapi.server.httpServer)
        .get(`/api/categories?filters[parentCategory][id][$eq]=${electronicsId}`)
        .expect(200);

      expect(response.body.data.length).toBe(2); // Computers and Phones
      expect(response.body.data.map(c => c.attributes.name)).toContain('Computers');
      expect(response.body.data.map(c => c.attributes.name)).toContain('Phones');
    });

    it('should search categories by name', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/categories?filters[name][$containsi]=comp')
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].attributes.name).toBe('Computers');
    });

    it('should search categories by description', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/categories?filters[description][$containsi]=mobile')
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].attributes.name).toBe('Phones');
    });

    it('should sort categories by sort order', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/categories?sort=sortOrder:asc&filters[level][$eq]=0')
        .expect(200);

      expect(response.body.data[0].attributes.name).toBe('Electronics');
      expect(response.body.data[1].attributes.name).toBe('Clothing');
    });

    it('should sort categories by name alphabetically', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/categories?sort=name:asc')
        .expect(200);

      const names = response.body.data.map(c => c.attributes.name);
      expect(names).toEqual([...names].sort());
    });

    it('should populate parent categories', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/categories?populate[parentCategory]=*')
        .expect(200);

      const computersCategory = response.body.data.find(c => c.attributes.name === 'Computers');
      expect(computersCategory.attributes.parentCategory.data).toBeDefined();
      expect(computersCategory.attributes.parentCategory.data.attributes.name).toBe('Electronics');
    });

    it('should populate child categories', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/categories?populate[childCategories]=*')
        .expect(200);

      const electronicsCategory = response.body.data.find(c => c.attributes.name === 'Electronics');
      expect(electronicsCategory.attributes.childCategories.data).toBeDefined();
      expect(electronicsCategory.attributes.childCategories.data.length).toBe(2);
    });

    it('should handle pagination', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/categories?pagination[page]=1&pagination[pageSize]=3')
        .expect(200);

      expect(response.body.data.length).toBe(3);
      expect(response.body.meta.pagination.page).toBe(1);
      expect(response.body.meta.pagination.pageSize).toBe(3);
    });

    it('should filter by multiple criteria', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/categories?filters[isActive][$eq]=true&filters[level][$eq]=1&filters[showInNavigation][$eq]=true')
        .expect(200);

      expect(response.body.data.length).toBe(2); // Computers and Phones
      expect(response.body.data.every(c => 
        c.attributes.isActive === true && 
        c.attributes.level === 1 && 
        c.attributes.showInNavigation === true
      )).toBe(true);
    });
  });

  describe('GET /api/categories/:id', () => {
    it('should return a specific category by ID', async () => {
      const electronics = testCategories.find(c => c.name === 'Electronics');
      const response = await request(strapi.server.httpServer)
        .get(`/api/categories/${electronics.id}`)
        .expect(200);

      expect(response.body.data.id).toBe(electronics.id);
      expect(response.body.data.attributes.name).toBe('Electronics');
      expect(response.body.data.attributes.slug).toBe('electronics');
    });

    it('should return category with full hierarchy population', async () => {
      const laptops = testCategories.find(c => c.name === 'Laptops');
      const response = await request(strapi.server.httpServer)
        .get(`/api/categories/${laptops.id}?populate[parentCategory][populate][parentCategory]=*`)
        .expect(200);

      expect(response.body.data.attributes.parentCategory.data).toBeDefined();
      expect(response.body.data.attributes.parentCategory.data.attributes.name).toBe('Computers');
      expect(response.body.data.attributes.parentCategory.data.attributes.parentCategory.data.attributes.name).toBe('Electronics');
    });

    it('should return 404 for non-existent category', async () => {
      await request(strapi.server.httpServer)
        .get('/api/categories/99999')
        .expect(404);
    });

    it('should find category by slug', async () => {
      // This would require custom route implementation
      const response = await request(strapi.server.httpServer)
        .get('/api/categories/slug/electronics')
        .expect(200);

      expect(response.body.data.attributes.slug).toBe('electronics');
      expect(response.body.data.attributes.name).toBe('Electronics');
    });
  });

  describe('POST /api/categories', () => {
    it('should create a new root category', async () => {
      const newCategoryData = {
        data: {
          name: 'New Root Category',
          description: 'A brand new root category',
          level: 0,
          sortOrder: 10,
          isActive: true,
          isFeatured: false,
          showInNavigation: true
        }
      };

      const response = await request(strapi.server.httpServer)
        .post('/api/categories')
        .set('Authorization', adminRequest.headers.Authorization)
        .send(newCategoryData)
        .expect(200);

      expect(response.body.data.attributes.name).toBe('New Root Category');
      expect(response.body.data.attributes.slug).toBe('new-root-category');
      expect(response.body.data.attributes.level).toBe(0);
    });

    it('should create a new sub-category', async () => {
      const electronics = testCategories.find(c => c.name === 'Electronics');
      const subCategoryData = {
        data: {
          name: 'New Sub Category',
          description: 'A new sub-category under Electronics',
          parentCategory: electronics.id,
          level: 1,
          sortOrder: 10
        }
      };

      const response = await request(strapi.server.httpServer)
        .post('/api/categories')
        .set('Authorization', adminRequest.headers.Authorization)
        .send(subCategoryData)
        .expect(200);

      expect(response.body.data.attributes.name).toBe('New Sub Category');
      expect(response.body.data.attributes.level).toBe(1);
    });

    it('should fail to create category without authentication', async () => {
      const categoryData = {
        data: {
          name: 'Unauthorized Category',
          description: 'This should fail'
        }
      };

      await request(strapi.server.httpServer)
        .post('/api/categories')
        .send(categoryData)
        .expect(403);
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        data: {
          description: 'Missing required name field'
        }
      };

      const response = await request(strapi.server.httpServer)
        .post('/api/categories')
        .set('Authorization', adminRequest.headers.Authorization)
        .send(incompleteData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should enforce unique slug constraint', async () => {
      const duplicateSlug = {
        data: {
          name: 'Electronics Duplicate',
          slug: 'electronics' // Same as existing category
        }
      };

      const response = await request(strapi.server.httpServer)
        .post('/api/categories')
        .set('Authorization', adminRequest.headers.Authorization)
        .send(duplicateSlug)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should auto-generate slug from name', async () => {
      const categoryData = {
        data: {
          name: 'Auto Generated Slug Category',
          description: 'Testing automatic slug generation'
        }
      };

      const response = await request(strapi.server.httpServer)
        .post('/api/categories')
        .set('Authorization', adminRequest.headers.Authorization)
        .send(categoryData)
        .expect(200);

      expect(response.body.data.attributes.slug).toBe('auto-generated-slug-category');
    });

    it('should set default values for optional fields', async () => {
      const minimalCategory = {
        data: {
          name: 'Minimal Category'
        }
      };

      const response = await request(strapi.server.httpServer)
        .post('/api/categories')
        .set('Authorization', adminRequest.headers.Authorization)
        .send(minimalCategory)
        .expect(200);

      expect(response.body.data.attributes.level).toBe(0);
      expect(response.body.data.attributes.sortOrder).toBe(0);
      expect(response.body.data.attributes.isActive).toBe(true);
      expect(response.body.data.attributes.isFeatured).toBe(false);
      expect(response.body.data.attributes.showInNavigation).toBe(true);
      expect(response.body.data.attributes.productCount).toBe(0);
    });

    it('should handle SEO fields', async () => {
      const seoCategory = {
        data: {
          name: 'SEO Test Category',
          description: 'Category with SEO fields',
          seoTitle: 'Best SEO Category',
          seoDescription: 'This is the best category for SEO testing',
          seoKeywords: 'seo, category, test',
          canonicalUrl: 'https://example.com/categories/seo-test',
          metaRobots: 'index,follow'
        }
      };

      const response = await request(strapi.server.httpServer)
        .post('/api/categories')
        .set('Authorization', adminRequest.headers.Authorization)
        .send(seoCategory)
        .expect(200);

      expect(response.body.data.attributes.seoTitle).toBe('Best SEO Category');
      expect(response.body.data.attributes.seoDescription).toBe('This is the best category for SEO testing');
      expect(response.body.data.attributes.canonicalUrl).toBe('https://example.com/categories/seo-test');
    });

    it('should handle filters component', async () => {
      const categoryWithFilters = {
        data: {
          name: 'Category with Filters',
          description: 'Category that has filter components',
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
              options: ['Brand A', 'Brand B']
            }
          ]
        }
      };

      const response = await request(strapi.server.httpServer)
        .post('/api/categories')
        .set('Authorization', adminRequest.headers.Authorization)
        .send(categoryWithFilters)
        .expect(200);

      expect(response.body.data.attributes.name).toBe('Category with Filters');
      // Note: Component population would need to be tested separately
    });
  });

  describe('PUT /api/categories/:id', () => {
    it('should update an existing category', async () => {
      const electronics = testCategories.find(c => c.name === 'Electronics');
      const updateData = {
        data: {
          name: 'Updated Electronics',
          description: 'Updated description for electronics category',
          isFeatured: false
        }
      };

      const response = await request(strapi.server.httpServer)
        .put(`/api/categories/${electronics.id}`)
        .set('Authorization', adminRequest.headers.Authorization)
        .send(updateData)
        .expect(200);

      expect(response.body.data.attributes.name).toBe('Updated Electronics');
      expect(response.body.data.attributes.description).toBe('Updated description for electronics category');
      expect(response.body.data.attributes.isFeatured).toBe(false);
    });

    it('should update slug when name changes', async () => {
      const clothing = testCategories.find(c => c.name === 'Clothing');
      const updateData = {
        data: {
          name: 'Fashion and Apparel'
        }
      };

      const response = await request(strapi.server.httpServer)
        .put(`/api/categories/${clothing.id}`)
        .set('Authorization', adminRequest.headers.Authorization)
        .send(updateData)
        .expect(200);

      expect(response.body.data.attributes.name).toBe('Fashion and Apparel');
      expect(response.body.data.attributes.slug).toBe('fashion-and-apparel');
    });

    it('should update parent-child relationships', async () => {
      const clothing = testCategories.find(c => c.name === 'Clothing');
      const computers = testCategories.find(c => c.name === 'Computers');
      
      // Move computers under clothing (just for testing)
      const updateData = {
        data: {
          parentCategory: clothing.id,
          level: 1
        }
      };

      const response = await request(strapi.server.httpServer)
        .put(`/api/categories/${computers.id}`)
        .set('Authorization', adminRequest.headers.Authorization)
        .send(updateData)
        .expect(200);

      // Verify the relationship
      const updatedComputers = await request(strapi.server.httpServer)
        .get(`/api/categories/${computers.id}?populate[parentCategory]=*`)
        .expect(200);

      expect(updatedComputers.body.data.attributes.parentCategory.data.id).toBe(clothing.id);
    });

    it('should fail to update non-existent category', async () => {
      const updateData = {
        data: {
          name: 'Non-existent Category'
        }
      };

      await request(strapi.server.httpServer)
        .put('/api/categories/99999')
        .set('Authorization', adminRequest.headers.Authorization)
        .send(updateData)
        .expect(404);
    });

    it('should fail to update without authentication', async () => {
      const electronics = testCategories.find(c => c.name === 'Electronics');
      const updateData = {
        data: {
          name: 'Unauthorized Update'
        }
      };

      await request(strapi.server.httpServer)
        .put(`/api/categories/${electronics.id}`)
        .send(updateData)
        .expect(403);
    });

    it('should update SEO fields', async () => {
      const electronics = testCategories.find(c => c.name === 'Electronics');
      const seoUpdateData = {
        data: {
          seoTitle: 'Electronics - Best Deals',
          seoDescription: 'Find the best electronics deals here',
          seoKeywords: 'electronics, deals, gadgets',
          metaRobots: 'index,follow'
        }
      };

      const response = await request(strapi.server.httpServer)
        .put(`/api/categories/${electronics.id}`)
        .set('Authorization', adminRequest.headers.Authorization)
        .send(seoUpdateData)
        .expect(200);

      expect(response.body.data.attributes.seoTitle).toBe('Electronics - Best Deals');
      expect(response.body.data.attributes.seoDescription).toBe('Find the best electronics deals here');
    });
  });

  describe('DELETE /api/categories/:id', () => {
    it('should delete a leaf category (no children)', async () => {
      const laptops = testCategories.find(c => c.name === 'Laptops');

      const response = await request(strapi.server.httpServer)
        .delete(`/api/categories/${laptops.id}`)
        .set('Authorization', adminRequest.headers.Authorization)
        .expect(200);

      expect(response.body.data.id).toBe(laptops.id);

      // Verify category is deleted
      await request(strapi.server.httpServer)
        .get(`/api/categories/${laptops.id}`)
        .expect(404);
    });

    it('should fail to delete category with children', async () => {
      const electronics = testCategories.find(c => c.name === 'Electronics');

      const response = await request(strapi.server.httpServer)
        .delete(`/api/categories/${electronics.id}`)
        .set('Authorization', adminRequest.headers.Authorization)
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('children');
    });

    it('should fail to delete non-existent category', async () => {
      await request(strapi.server.httpServer)
        .delete('/api/categories/99999')
        .set('Authorization', adminRequest.headers.Authorization)
        .expect(404);
    });

    it('should fail to delete without authentication', async () => {
      const laptops = testCategories.find(c => c.name === 'Laptops');

      await request(strapi.server.httpServer)
        .delete(`/api/categories/${laptops.id}`)
        .expect(403);
    });
  });

  describe('Custom Category Endpoints', () => {
    describe('GET /api/categories/tree', () => {
      it('should return hierarchical category tree', async () => {
        const response = await request(strapi.server.httpServer)
          .get('/api/categories/tree')
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        
        // Should contain root categories with their children
        const electronicsTree = response.body.data.find(c => c.attributes.name === 'Electronics');
        expect(electronicsTree).toBeDefined();
        expect(electronicsTree.attributes.childCategories).toBeDefined();
      });

      it('should return only active categories in tree for public', async () => {
        const response = await request(strapi.server.httpServer)
          .get('/api/categories/tree?filters[isActive][$eq]=true')
          .expect(200);

        const activeCategories = response.body.data.filter(c => c.attributes.isActive === true);
        expect(activeCategories.length).toBe(response.body.data.length);
      });
    });

    describe('GET /api/categories/navigation', () => {
      it('should return categories for navigation menu', async () => {
        const response = await request(strapi.server.httpServer)
          .get('/api/categories/navigation')
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        
        // Should only include categories that show in navigation
        expect(response.body.data.every(c => c.attributes.showInNavigation === true)).toBe(true);
      });

      it('should sort navigation categories by sort order', async () => {
        const response = await request(strapi.server.httpServer)
          .get('/api/categories/navigation')
          .expect(200);

        const rootCategories = response.body.data.filter(c => c.attributes.level === 0);
        for (let i = 1; i < rootCategories.length; i++) {
          expect(rootCategories[i - 1].attributes.sortOrder).toBeLessThanOrEqual(
            rootCategories[i].attributes.sortOrder
          );
        }
      });
    });

    describe('GET /api/categories/featured', () => {
      it('should return featured categories', async () => {
        const response = await request(strapi.server.httpServer)
          .get('/api/categories/featured')
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].attributes.name).toBe('Electronics');
        expect(response.body.data[0].attributes.isFeatured).toBe(true);
      });
    });

    describe('GET /api/categories/:id/products', () => {
      it('should return products in a specific category', async () => {
        const electronics = testCategories.find(c => c.name === 'Electronics');
        
        // Create test products in the category
        await strapi.entityService.create('api::product.product', {
          data: {
            name: 'Test Electronics Product 1',
            description: 'Product in electronics category',
            price: 100.00,
            sku: 'ELEC-001',
            category: electronics.id
          }
        });

        await strapi.entityService.create('api::product.product', {
          data: {
            name: 'Test Electronics Product 2',
            description: 'Another product in electronics category',
            price: 200.00,
            sku: 'ELEC-002',
            category: electronics.id
          }
        });

        const response = await request(strapi.server.httpServer)
          .get(`/api/categories/${electronics.id}/products`)
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBe(2);
        expect(response.body.data.every(p => p.attributes.category?.data?.id === electronics.id)).toBe(true);
      });

      it('should support product filtering within category', async () => {
        const electronics = testCategories.find(c => c.name === 'Electronics');
        
        const response = await request(strapi.server.httpServer)
          .get(`/api/categories/${electronics.id}/products?filters[price][$gte]=150`)
          .expect(200);

        expect(response.body.data.every(p => p.attributes.price >= 150)).toBe(true);
      });
    });

    describe('POST /api/categories/bulk', () => {
      it('should create multiple categories in bulk', async () => {
        const bulkData = {
          data: [
            {
              name: 'Bulk Category 1',
              description: 'First bulk category',
              level: 0,
              sortOrder: 10
            },
            {
              name: 'Bulk Category 2',
              description: 'Second bulk category',
              level: 0,
              sortOrder: 11
            },
            {
              name: 'Bulk Category 3',
              description: 'Third bulk category',
              level: 0,
              sortOrder: 12
            }
          ]
        };

        const response = await request(strapi.server.httpServer)
          .post('/api/categories/bulk')
          .set('Authorization', adminRequest.headers.Authorization)
          .send(bulkData)
          .expect(200);

        expect(response.body.results).toBeDefined();
        expect(response.body.errors).toBeDefined();
        expect(response.body.summary).toBeDefined();
        expect(response.body.summary.total).toBe(3);
        expect(response.body.summary.success).toBe(3);
        expect(response.body.summary.failed).toBe(0);
      });
    });
  });

  describe('Category Hierarchy Validation', () => {
    it('should prevent circular references in parent-child relationships', async () => {
      const electronics = testCategories.find(c => c.name === 'Electronics');
      const computers = testCategories.find(c => c.name === 'Computers');

      // Try to make electronics a child of computers (circular reference)
      const updateData = {
        data: {
          parentCategory: computers.id
        }
      };

      const response = await request(strapi.server.httpServer)
        .put(`/api/categories/${electronics.id}`)
        .set('Authorization', adminRequest.headers.Authorization)
        .send(updateData)
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('circular');
    });

    it('should validate hierarchy depth limits', async () => {
      // Create deep hierarchy to test depth limits
      let parentId = testCategories.find(c => c.name === 'Laptops').id;
      
      // Try to create categories beyond reasonable depth
      for (let i = 3; i < 10; i++) {
        const deepCategory = {
          data: {
            name: `Deep Category Level ${i}`,
            description: `Category at depth ${i}`,
            parentCategory: parentId,
            level: i
          }
        };

        const response = await request(strapi.server.httpServer)
          .post('/api/categories')
          .set('Authorization', adminRequest.headers.Authorization)
          .send(deepCategory);

        if (i > 5) { // Assuming max depth of 5
          expect(response.status).toBe(400);
          expect(response.body.error.message).toContain('depth');
          break;
        } else {
          expect(response.status).toBe(200);
          parentId = response.body.data.id;
        }
      }
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent category requests efficiently', async () => {
      const concurrentRequests = Array(10).fill(null).map(() =>
        request(strapi.server.httpServer)
          .get('/api/categories')
          .expect(200)
      );

      const responses = await Promise.all(concurrentRequests);
      
      responses.forEach(response => {
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    it('should efficiently load category tree with deep hierarchy', async () => {
      const startTime = Date.now();
      
      const response = await request(strapi.server.httpServer)
        .get('/api/categories/tree?populate=*')
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(1000); // Should complete within 1 second
      expect(response.body.data).toBeDefined();
    });
  });
});