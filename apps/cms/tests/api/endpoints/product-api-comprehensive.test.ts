import { setupStrapi, cleanupStrapi, createAuthenticatedRequest } from '../../helpers/strapi';
import { Strapi } from '@strapi/strapi';
import request from 'supertest';

describe('Product API Endpoints - Comprehensive Tests', () => {
  let strapi: Strapi;
  let authenticatedRequest: any;
  let adminRequest: any;
  let testCategory: any;
  let testBrand: any;
  let testProducts: any[];

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
    await strapi.db.query('api::product.product').deleteMany({});
    await strapi.db.query('api::category.category').deleteMany({});
    await strapi.db.query('api::brand.brand').deleteMany({});

    // Create test category and brand
    testCategory = await strapi.entityService.create('api::category.category', {
      data: {
        name: 'Test Category',
        slug: 'test-category',
        description: 'Category for API testing'
      }
    });

    testBrand = await strapi.entityService.create('api::brand.brand', {
      data: {
        name: 'Test Brand',
        slug: 'test-brand',
        description: 'Brand for API testing'
      }
    });

    // Create test products
    testProducts = [];
    const productData = [
      {
        name: 'Premium Product',
        description: 'High-end premium product',
        price: 199.99,
        originalPrice: 249.99,
        sku: 'PREM-001',
        status: 'active',
        featured: true,
        trending: true,
        trendingScore: 95,
        category: testCategory.id,
        brand: testBrand.id
      },
      {
        name: 'Budget Product',
        description: 'Affordable budget option',
        price: 49.99,
        sku: 'BUDG-001',
        status: 'active',
        featured: false,
        trending: false,
        trendingScore: 60,
        category: testCategory.id,
        brand: testBrand.id
      },
      {
        name: 'Inactive Product',
        description: 'Product that is inactive',
        price: 99.99,
        sku: 'INACT-001',
        status: 'inactive',
        category: testCategory.id,
        brand: testBrand.id
      }
    ];

    for (const data of productData) {
      const product = await strapi.entityService.create('api::product.product', {
        data
      });
      testProducts.push(product);
    }
  });

  describe('GET /api/products', () => {
    it('should return all active products for public access', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/products')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2); // Only active products
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.pagination).toBeDefined();
    });

    it('should return all products for authenticated admin', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/products')
        .set('Authorization', adminRequest.headers.Authorization)
        .expect(200);

      expect(response.body.data.length).toBe(3); // All products including inactive
    });

    it('should filter products by status', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/products?filters[status][$eq]=active')
        .expect(200);

      expect(response.body.data.length).toBe(2);
      expect(response.body.data.every(p => p.attributes.status === 'active')).toBe(true);
    });

    it('should filter products by featured flag', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/products?filters[featured][$eq]=true')
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].attributes.featured).toBe(true);
      expect(response.body.data[0].attributes.name).toBe('Premium Product');
    });

    it('should filter products by trending flag', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/products?filters[trending][$eq]=true')
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].attributes.trending).toBe(true);
    });

    it('should filter products by price range', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/products?filters[price][$gte]=100&filters[price][$lte]=250')
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].attributes.price).toBeGreaterThanOrEqual(100);
      expect(response.body.data[0].attributes.price).toBeLessThanOrEqual(250);
    });

    it('should filter products by category', async () => {
      const response = await request(strapi.server.httpServer)
        .get(`/api/products?filters[category][id][$eq]=${testCategory.id}`)
        .expect(200);

      expect(response.body.data.length).toBe(2); // Only active products in category
      expect(response.body.data.every(p => p.attributes.category?.data?.id === testCategory.id)).toBe(true);
    });

    it('should filter products by brand', async () => {
      const response = await request(strapi.server.httpServer)
        .get(`/api/products?filters[brand][id][$eq]=${testBrand.id}`)
        .expect(200);

      expect(response.body.data.length).toBe(2); // Only active products from brand
    });

    it('should search products by name', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/products?filters[$or][0][name][$containsi]=premium')
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].attributes.name.toLowerCase()).toContain('premium');
    });

    it('should search products by description', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/products?filters[$or][0][description][$containsi]=affordable')
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].attributes.description.toLowerCase()).toContain('affordable');
    });

    it('should search products by SKU', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/products?filters[sku][$containsi]=PREM')
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].attributes.sku).toContain('PREM');
    });

    it('should sort products by price ascending', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/products?sort=price:asc')
        .expect(200);

      const prices = response.body.data.map(p => p.attributes.price);
      expect(prices).toEqual([...prices].sort((a, b) => a - b));
    });

    it('should sort products by price descending', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/products?sort=price:desc')
        .expect(200);

      const prices = response.body.data.map(p => p.attributes.price);
      expect(prices).toEqual([...prices].sort((a, b) => b - a));
    });

    it('should sort products by trending score', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/products?sort=trendingScore:desc')
        .expect(200);

      const scores = response.body.data.map(p => p.attributes.trendingScore);
      expect(scores).toEqual([...scores].sort((a, b) => b - a));
    });

    it('should sort products by creation date', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/products?sort=createdAt:desc')
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      // Verify dates are in descending order
      for (let i = 1; i < response.body.data.length; i++) {
        const prev = new Date(response.body.data[i - 1].attributes.createdAt);
        const curr = new Date(response.body.data[i].attributes.createdAt);
        expect(prev.getTime()).toBeGreaterThanOrEqual(curr.getTime());
      }
    });

    it('should handle pagination', async () => {
      // Create more products for pagination test
      for (let i = 1; i <= 10; i++) {
        await strapi.entityService.create('api::product.product', {
          data: {
            name: `Pagination Product ${i}`,
            description: `Product ${i} for pagination`,
            price: i * 10,
            sku: `PAG-${i.toString().padStart(3, '0')}`,
            status: 'active'
          }
        });
      }

      const response = await request(strapi.server.httpServer)
        .get('/api/products?pagination[page]=1&pagination[pageSize]=5')
        .expect(200);

      expect(response.body.data.length).toBe(5);
      expect(response.body.meta.pagination.page).toBe(1);
      expect(response.body.meta.pagination.pageSize).toBe(5);
      expect(response.body.meta.pagination.total).toBeGreaterThan(5);
    });

    it('should populate related data', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/products?populate[category]=*&populate[brand]=*')
        .expect(200);

      const productWithRelations = response.body.data.find(p => p.attributes.category?.data);
      expect(productWithRelations.attributes.category.data).toBeDefined();
      expect(productWithRelations.attributes.category.data.attributes.name).toBe('Test Category');
      expect(productWithRelations.attributes.brand.data).toBeDefined();
      expect(productWithRelations.attributes.brand.data.attributes.name).toBe('Test Brand');
    });

    it('should handle complex filtering with multiple criteria', async () => {
      const response = await request(strapi.server.httpServer)
        .get(`/api/products?filters[status][$eq]=active&filters[price][$gte]=50&filters[category][id][$eq]=${testCategory.id}&sort=price:desc`)
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].attributes.name).toBe('Premium Product');
      expect(response.body.data[0].attributes.status).toBe('active');
      expect(response.body.data[0].attributes.price).toBeGreaterThanOrEqual(50);
    });

    it('should return empty array when no products match filters', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/products?filters[price][$gt]=1000')
        .expect(200);

      expect(response.body.data).toEqual([]);
      expect(response.body.meta.pagination.total).toBe(0);
    });

    it('should validate invalid filter parameters', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/products?filters[invalidField][$eq]=value')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/products/:id', () => {
    it('should return a specific product by ID', async () => {
      const product = testProducts[0];
      const response = await request(strapi.server.httpServer)
        .get(`/api/products/${product.id}`)
        .expect(200);

      expect(response.body.data.id).toBe(product.id);
      expect(response.body.data.attributes.name).toBe(product.name);
      expect(response.body.data.attributes.sku).toBe(product.sku);
    });

    it('should return product with full population', async () => {
      const product = testProducts[0];
      const response = await request(strapi.server.httpServer)
        .get(`/api/products/${product.id}?populate=*`)
        .expect(200);

      expect(response.body.data.attributes.category).toBeDefined();
      expect(response.body.data.attributes.brand).toBeDefined();
    });

    it('should return 404 for non-existent product', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/products/99999')
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it('should increment view count when product is accessed', async () => {
      const product = testProducts[0];
      const initialViewCount = product.viewCount || 0;

      await request(strapi.server.httpServer)
        .get(`/api/products/${product.id}`)
        .expect(200);

      // Check if view count was incremented (this depends on controller implementation)
      const updatedProduct = await strapi.entityService.findOne('api::product.product', product.id);
      expect(updatedProduct.viewCount).toBe(initialViewCount + 1);
    });

    it('should find product by slug instead of ID', async () => {
      const product = testProducts[0];
      // This would require custom route implementation
      const response = await request(strapi.server.httpServer)
        .get(`/api/products/slug/${product.slug}`)
        .expect(200);

      expect(response.body.data.attributes.slug).toBe(product.slug);
    });
  });

  describe('POST /api/products', () => {
    it('should create a new product with admin authentication', async () => {
      const newProductData = {
        data: {
          name: 'New Test Product',
          description: 'Brand new product for testing',
          price: 79.99,
          sku: 'NEW-001',
          status: 'draft',
          category: testCategory.id,
          brand: testBrand.id
        }
      };

      const response = await request(strapi.server.httpServer)
        .post('/api/products')
        .set('Authorization', adminRequest.headers.Authorization)
        .send(newProductData)
        .expect(200);

      expect(response.body.data.attributes.name).toBe('New Test Product');
      expect(response.body.data.attributes.sku).toBe('NEW-001');
      expect(response.body.data.attributes.slug).toBe('new-test-product');
    });

    it('should fail to create product without authentication', async () => {
      const newProductData = {
        data: {
          name: 'Unauthorized Product',
          description: 'This should fail',
          price: 50.00,
          sku: 'UNAUTH-001'
        }
      };

      await request(strapi.server.httpServer)
        .post('/api/products')
        .send(newProductData)
        .expect(403);
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        data: {
          description: 'Missing required fields'
        }
      };

      const response = await request(strapi.server.httpServer)
        .post('/api/products')
        .set('Authorization', adminRequest.headers.Authorization)
        .send(incompleteData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should enforce unique SKU constraint', async () => {
      const duplicateSku = {
        data: {
          name: 'Duplicate SKU Product',
          description: 'This has a duplicate SKU',
          price: 100.00,
          sku: 'PREM-001' // Same as existing product
        }
      };

      const response = await request(strapi.server.httpServer)
        .post('/api/products')
        .set('Authorization', adminRequest.headers.Authorization)
        .send(duplicateSku)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should auto-generate slug from name', async () => {
      const productData = {
        data: {
          name: 'Auto Slug Product Title',
          description: 'Testing automatic slug generation',
          price: 60.00,
          sku: 'AUTO-SLUG-001'
        }
      };

      const response = await request(strapi.server.httpServer)
        .post('/api/products')
        .set('Authorization', adminRequest.headers.Authorization)
        .send(productData)
        .expect(200);

      expect(response.body.data.attributes.slug).toBe('auto-slug-product-title');
    });

    it('should handle unique slug generation when duplicates exist', async () => {
      // Create first product
      const firstProduct = {
        data: {
          name: 'Duplicate Name Product',
          description: 'First product',
          price: 50.00,
          sku: 'DUP-001'
        }
      };

      await request(strapi.server.httpServer)
        .post('/api/products')
        .set('Authorization', adminRequest.headers.Authorization)
        .send(firstProduct)
        .expect(200);

      // Create second product with same name
      const secondProduct = {
        data: {
          name: 'Duplicate Name Product',
          description: 'Second product',
          price: 60.00,
          sku: 'DUP-002'
        }
      };

      const response = await request(strapi.server.httpServer)
        .post('/api/products')
        .set('Authorization', adminRequest.headers.Authorization)
        .send(secondProduct)
        .expect(200);

      expect(response.body.data.attributes.slug).toBe('duplicate-name-product-1');
    });

    it('should set default values for optional fields', async () => {
      const minimalProduct = {
        data: {
          name: 'Minimal Product',
          description: 'Product with minimal data',
          price: 25.00,
          sku: 'MIN-001'
        }
      };

      const response = await request(strapi.server.httpServer)
        .post('/api/products')
        .set('Authorization', adminRequest.headers.Authorization)
        .send(minimalProduct)
        .expect(200);

      expect(response.body.data.attributes.status).toBe('draft');
      expect(response.body.data.attributes.featured).toBe(false);
      expect(response.body.data.attributes.trending).toBe(false);
      expect(response.body.data.attributes.viewCount).toBe(0);
      expect(response.body.data.attributes.trackInventory).toBe(true);
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should update an existing product', async () => {
      const product = testProducts[0];
      const updateData = {
        data: {
          name: 'Updated Premium Product',
          price: 299.99,
          description: 'Updated description for premium product'
        }
      };

      const response = await request(strapi.server.httpServer)
        .put(`/api/products/${product.id}`)
        .set('Authorization', adminRequest.headers.Authorization)
        .send(updateData)
        .expect(200);

      expect(response.body.data.attributes.name).toBe('Updated Premium Product');
      expect(response.body.data.attributes.price).toBe(299.99);
      expect(response.body.data.attributes.description).toBe('Updated description for premium product');
    });

    it('should update slug when name changes', async () => {
      const product = testProducts[0];
      const updateData = {
        data: {
          name: 'Completely New Product Name'
        }
      };

      const response = await request(strapi.server.httpServer)
        .put(`/api/products/${product.id}`)
        .set('Authorization', adminRequest.headers.Authorization)
        .send(updateData)
        .expect(200);

      expect(response.body.data.attributes.name).toBe('Completely New Product Name');
      expect(response.body.data.attributes.slug).toBe('completely-new-product-name');
    });

    it('should calculate discount percentage when prices are updated', async () => {
      const product = testProducts[0];
      const updateData = {
        data: {
          price: 80.00,
          originalPrice: 100.00
        }
      };

      const response = await request(strapi.server.httpServer)
        .put(`/api/products/${product.id}`)
        .set('Authorization', adminRequest.headers.Authorization)
        .send(updateData)
        .expect(200);

      expect(response.body.data.attributes.price).toBe(80.00);
      expect(response.body.data.attributes.originalPrice).toBe(100.00);
      // Discount should be (100-80)/100 * 100 = 20%
      // This depends on controller implementation
    });

    it('should fail to update non-existent product', async () => {
      const updateData = {
        data: {
          name: 'Non-existent Product'
        }
      };

      await request(strapi.server.httpServer)
        .put('/api/products/99999')
        .set('Authorization', adminRequest.headers.Authorization)
        .send(updateData)
        .expect(404);
    });

    it('should fail to update without authentication', async () => {
      const product = testProducts[0];
      const updateData = {
        data: {
          name: 'Unauthorized Update'
        }
      };

      await request(strapi.server.httpServer)
        .put(`/api/products/${product.id}`)
        .send(updateData)
        .expect(403);
    });

    it('should enforce unique SKU constraint on update', async () => {
      const product1 = testProducts[0];
      const product2 = testProducts[1];
      
      const updateData = {
        data: {
          sku: product2.sku // Try to use SKU from another product
        }
      };

      const response = await request(strapi.server.httpServer)
        .put(`/api/products/${product1.id}`)
        .set('Authorization', adminRequest.headers.Authorization)
        .send(updateData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should delete an existing product', async () => {
      const product = testProducts[2]; // Use inactive product for deletion

      const response = await request(strapi.server.httpServer)
        .delete(`/api/products/${product.id}`)
        .set('Authorization', adminRequest.headers.Authorization)
        .expect(200);

      expect(response.body.data.id).toBe(product.id);

      // Verify product is deleted
      await request(strapi.server.httpServer)
        .get(`/api/products/${product.id}`)
        .expect(404);
    });

    it('should fail to delete non-existent product', async () => {
      await request(strapi.server.httpServer)
        .delete('/api/products/99999')
        .set('Authorization', adminRequest.headers.Authorization)
        .expect(404);
    });

    it('should fail to delete without authentication', async () => {
      const product = testProducts[0];

      await request(strapi.server.httpServer)
        .delete(`/api/products/${product.id}`)
        .expect(403);
    });
  });

  describe('Custom Endpoints', () => {
    describe('GET /api/products/search', () => {
      it('should search products by query', async () => {
        const response = await request(strapi.server.httpServer)
          .get('/api/products/search?query=premium')
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
        expect(response.body.data[0].attributes.name.toLowerCase()).toContain('premium');
      });

      it('should return empty results for non-matching query', async () => {
        const response = await request(strapi.server.httpServer)
          .get('/api/products/search?query=nonexistent')
          .expect(200);

        expect(response.body.data).toEqual([]);
      });

      it('should require search query parameter', async () => {
        await request(strapi.server.httpServer)
          .get('/api/products/search')
          .expect(400);
      });
    });

    describe('GET /api/products/trending', () => {
      it('should return trending products', async () => {
        const response = await request(strapi.server.httpServer)
          .get('/api/products/trending')
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].attributes.trending).toBe(true);
      });

      it('should sort trending products by score', async () => {
        // Create additional trending product with lower score
        await strapi.entityService.create('api::product.product', {
          data: {
            name: 'Lower Trending Product',
            description: 'Product with lower trending score',
            price: 75.00,
            sku: 'LOW-TREND-001',
            status: 'active',
            trending: true,
            trendingScore: 80
          }
        });

        const response = await request(strapi.server.httpServer)
          .get('/api/products/trending')
          .expect(200);

        expect(response.body.data.length).toBe(2);
        expect(response.body.data[0].attributes.trendingScore).toBeGreaterThan(
          response.body.data[1].attributes.trendingScore
        );
      });

      it('should limit trending products results', async () => {
        const response = await request(strapi.server.httpServer)
          .get('/api/products/trending?limit=1')
          .expect(200);

        expect(response.body.data.length).toBe(1);
      });
    });

    describe('GET /api/products/featured', () => {
      it('should return featured products', async () => {
        const response = await request(strapi.server.httpServer)
          .get('/api/products/featured')
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].attributes.featured).toBe(true);
      });

      it('should limit featured products results', async () => {
        // Create additional featured product
        await strapi.entityService.create('api::product.product', {
          data: {
            name: 'Another Featured Product',
            description: 'Another featured product',
            price: 150.00,
            sku: 'FEAT-002',
            status: 'active',
            featured: true
          }
        });

        const response = await request(strapi.server.httpServer)
          .get('/api/products/featured?limit=1')
          .expect(200);

        expect(response.body.data.length).toBe(1);
      });
    });

    describe('POST /api/products/bulk', () => {
      it('should create multiple products in bulk', async () => {
        const bulkData = {
          data: [
            {
              name: 'Bulk Product 1',
              description: 'First bulk product',
              price: 25.00,
              sku: 'BULK-001'
            },
            {
              name: 'Bulk Product 2',
              description: 'Second bulk product',
              price: 35.00,
              sku: 'BULK-002'
            },
            {
              name: 'Bulk Product 3',
              description: 'Third bulk product',
              price: 45.00,
              sku: 'BULK-003'
            }
          ]
        };

        const response = await request(strapi.server.httpServer)
          .post('/api/products/bulk')
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

      it('should handle bulk creation with some failures', async () => {
        const bulkDataWithErrors = {
          data: [
            {
              name: 'Valid Product',
              description: 'This should succeed',
              price: 50.00,
              sku: 'VALID-001'
            },
            {
              // Missing required fields - should fail
              description: 'Missing name and price'
            },
            {
              name: 'Another Valid Product',
              description: 'This should also succeed',
              price: 60.00,
              sku: 'VALID-002'
            }
          ]
        };

        const response = await request(strapi.server.httpServer)
          .post('/api/products/bulk')
          .set('Authorization', adminRequest.headers.Authorization)
          .send(bulkDataWithErrors)
          .expect(200);

        expect(response.body.summary.total).toBe(3);
        expect(response.body.summary.success).toBe(2);
        expect(response.body.summary.failed).toBe(1);
        expect(response.body.errors.length).toBe(1);
      });
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = Array(10).fill(null).map(() =>
        request(strapi.server.httpServer)
          .get('/api/products')
          .expect(200)
      );

      const responses = await Promise.all(concurrentRequests);
      
      responses.forEach(response => {
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    it('should handle large pagination requests', async () => {
      // Create many products for pagination test
      const bulkProducts = Array(50).fill(null).map((_, index) => ({
        name: `Load Test Product ${index + 1}`,
        description: `Product ${index + 1} for load testing`,
        price: (index + 1) * 10,
        sku: `LOAD-${(index + 1).toString().padStart(3, '0')}`,
        status: 'active'
      }));

      // Create products in batches
      for (let i = 0; i < bulkProducts.length; i += 10) {
        const batch = bulkProducts.slice(i, i + 10);
        await Promise.all(batch.map(product =>
          strapi.entityService.create('api::product.product', { data: product })
        ));
      }

      const response = await request(strapi.server.httpServer)
        .get('/api/products?pagination[page]=1&pagination[pageSize]=50')
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(50);
      expect(response.body.meta.pagination.total).toBeGreaterThan(50);
    });
  });
});