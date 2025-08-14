import request from 'supertest';
import { setupStrapi, cleanupStrapi } from '../../helpers/strapi';

describe('Product API Integration Tests', () => {
  let app: any;
  let authToken: string;

  beforeAll(async () => {
    app = await setupStrapi();
    
    // Create test user and get auth token
    const response = await request(app.server)
      .post('/api/auth/local/register')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test123456!',
      });
    
    authToken = response.body.jwt;
  });

  afterAll(async () => {
    await cleanupStrapi(app);
  });

  describe('GET /api/products', () => {
    it('returns products list without authentication', async () => {
      const response = await request(app.server)
        .get('/api/products')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('filters products by category', async () => {
      const response = await request(app.server)
        .get('/api/products?filters[categories][id][$in]=1')
        .expect(200);

      expect(response.body.data).toBeDefined();
      // All products should have category with id 1
      response.body.data.forEach((product: any) => {
        const categoryIds = product.attributes.categories.data.map((c: any) => c.id);
        expect(categoryIds).toContain(1);
      });
    });

    it('filters products by price range', async () => {
      const response = await request(app.server)
        .get('/api/products?filters[price][$gte]=50&filters[price][$lte]=150')
        .expect(200);

      response.body.data.forEach((product: any) => {
        expect(product.attributes.price).toBeGreaterThanOrEqual(50);
        expect(product.attributes.price).toBeLessThanOrEqual(150);
      });
    });

    it('sorts products by price ascending', async () => {
      const response = await request(app.server)
        .get('/api/products?sort=price:asc')
        .expect(200);

      const prices = response.body.data.map((p: any) => p.attributes.price);
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
      }
    });

    it('paginates results correctly', async () => {
      const response = await request(app.server)
        .get('/api/products?pagination[page]=1&pagination[pageSize]=5')
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(5);
      expect(response.body.meta.pagination.pageSize).toBe(5);
      expect(response.body.meta.pagination.page).toBe(1);
    });

    it('searches products by name', async () => {
      const response = await request(app.server)
        .get('/api/products?filters[$or][0][name][$containsi]=wellness')
        .expect(200);

      response.body.data.forEach((product: any) => {
        expect(product.attributes.name.toLowerCase()).toContain('wellness');
      });
    });

    it('populates related data', async () => {
      const response = await request(app.server)
        .get('/api/products?populate=*')
        .expect(200);

      const product = response.body.data[0];
      expect(product.attributes).toHaveProperty('images');
      expect(product.attributes).toHaveProperty('categories');
      expect(product.attributes).toHaveProperty('brand');
      expect(product.attributes).toHaveProperty('reviews');
    });
  });

  describe('GET /api/products/:id', () => {
    it('returns single product by id', async () => {
      const response = await request(app.server)
        .get('/api/products/1?populate=*')
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(1);
      expect(response.body.data.attributes).toHaveProperty('name');
      expect(response.body.data.attributes).toHaveProperty('price');
    });

    it('returns 404 for non-existent product', async () => {
      await request(app.server)
        .get('/api/products/999999')
        .expect(404);
    });

    it('finds product by slug', async () => {
      const response = await request(app.server)
        .get('/api/products/wellness-doll-premium')
        .expect(200);

      expect(response.body.data.attributes.slug).toBe('wellness-doll-premium');
    });
  });

  describe('POST /api/products', () => {
    it('requires authentication to create product', async () => {
      await request(app.server)
        .post('/api/products')
        .send({
          data: {
            name: 'Test Product',
            price: 99.99,
          },
        })
        .expect(403);
    });

    it('creates new product with valid data', async () => {
      const response = await request(app.server)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          data: {
            name: 'New Test Product',
            description: 'A test product description',
            price: 149.99,
            compareAtPrice: 199.99,
            sku: 'TEST-NEW-001',
            inventory: 50,
            status: 'active',
            categories: [1],
          },
        })
        .expect(200);

      expect(response.body.data.attributes.name).toBe('New Test Product');
      expect(response.body.data.attributes.slug).toBe('new-test-product');
      expect(response.body.data.attributes.price).toBe(149.99);
    });

    it('validates required fields', async () => {
      const response = await request(app.server)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          data: {
            description: 'Missing name and price',
          },
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('required');
    });

    it('prevents duplicate SKU', async () => {
      // First create a product
      await request(app.server)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          data: {
            name: 'Product 1',
            price: 99.99,
            sku: 'UNIQUE-SKU-001',
          },
        })
        .expect(200);

      // Try to create another with same SKU
      const response = await request(app.server)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          data: {
            name: 'Product 2',
            price: 99.99,
            sku: 'UNIQUE-SKU-001',
          },
        })
        .expect(400);

      expect(response.body.error.message).toContain('unique');
    });
  });

  describe('PUT /api/products/:id', () => {
    let productId: number;

    beforeEach(async () => {
      // Create a product to update
      const response = await request(app.server)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          data: {
            name: 'Product to Update',
            price: 99.99,
            sku: 'UPDATE-TEST-001',
          },
        });
      
      productId = response.body.data.id;
    });

    it('updates product successfully', async () => {
      const response = await request(app.server)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          data: {
            name: 'Updated Product Name',
            price: 129.99,
          },
        })
        .expect(200);

      expect(response.body.data.attributes.name).toBe('Updated Product Name');
      expect(response.body.data.attributes.price).toBe(129.99);
      expect(response.body.data.attributes.slug).toBe('updated-product-name');
    });

    it('requires authentication to update', async () => {
      await request(app.server)
        .put(`/api/products/${productId}`)
        .send({
          data: {
            price: 149.99,
          },
        })
        .expect(403);
    });

    it('returns 404 for non-existent product', async () => {
      await request(app.server)
        .put('/api/products/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          data: {
            price: 149.99,
          },
        })
        .expect(404);
    });
  });

  describe('DELETE /api/products/:id', () => {
    let productId: number;

    beforeEach(async () => {
      // Create a product to delete
      const response = await request(app.server)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          data: {
            name: 'Product to Delete',
            price: 99.99,
            sku: 'DELETE-TEST-001',
          },
        });
      
      productId = response.body.data.id;
    });

    it('deletes product successfully', async () => {
      await request(app.server)
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify product is deleted
      await request(app.server)
        .get(`/api/products/${productId}`)
        .expect(404);
    });

    it('requires authentication to delete', async () => {
      await request(app.server)
        .delete(`/api/products/${productId}`)
        .expect(403);
    });
  });

  describe('Bulk Operations', () => {
    it('performs bulk update on multiple products', async () => {
      // Create test products
      const productIds = [];
      for (let i = 0; i < 3; i++) {
        const response = await request(app.server)
          .post('/api/products')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            data: {
              name: `Bulk Test Product ${i}`,
              price: 99.99,
              sku: `BULK-TEST-${i}`,
              status: 'active',
            },
          });
        productIds.push(response.body.data.id);
      }

      // Bulk update status
      const response = await request(app.server)
        .post('/api/products/bulk-action')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ids: productIds,
          action: 'update',
          data: {
            status: 'inactive',
          },
        })
        .expect(200);

      expect(response.body.affected).toBe(3);

      // Verify all products are updated
      for (const id of productIds) {
        const product = await request(app.server)
          .get(`/api/products/${id}`)
          .expect(200);
        
        expect(product.body.data.attributes.status).toBe('inactive');
      }
    });
  });

  describe('Performance and Rate Limiting', () => {
    it('handles concurrent requests efficiently', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app.server)
          .get('/api/products?pagination[pageSize]=5')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data).toBeDefined();
      });
    });

    it('respects rate limiting', async () => {
      // Make many requests quickly
      const requests = Array(100).fill(null).map(() =>
        request(app.server).get('/api/products')
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});