import { Strapi } from '@strapi/strapi';
import fs from 'fs';
import path from 'path';

let instance: Strapi;

export async function setupStrapi(): Promise<Strapi> {
  if (!instance) {
    // Set test environment
    process.env.NODE_ENV = 'test';
    
    // Use SQLite for tests
    process.env.DATABASE_CLIENT = 'sqlite';
    process.env.DATABASE_FILENAME = '.tmp/test.db';
    
    // Set required keys
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
    process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'test-admin-jwt-secret';
    process.env.API_TOKEN_SALT = process.env.API_TOKEN_SALT || 'test-api-token-salt';
    process.env.APP_KEYS = process.env.APP_KEYS || 'test-app-key1,test-app-key2';
    process.env.TRANSFER_TOKEN_SALT = process.env.TRANSFER_TOKEN_SALT || 'test-transfer-token-salt';

    // Create temp directory
    const tmpDir = path.join(process.cwd(), '.tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    // Load Strapi
    const Strapi = require('@strapi/strapi');
    instance = Strapi({ distDir: './dist' });
    
    await instance.load();
    instance.server.mount();
    
    // Run migrations
    await instance.db.migrate.latest();
    
    // Seed test data
    await seedTestData(instance);
  }
  
  return instance;
}

export async function cleanupStrapi(strapi: Strapi): Promise<void> {
  // Close database connections
  if (strapi.db) {
    await strapi.db.connection.destroy();
  }
  
  // Stop the server
  await strapi.server.httpServer.close();
  
  // Clean up temp files
  const tmpDir = path.join(process.cwd(), '.tmp');
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  
  // Reset instance
  instance = null;
}

async function seedTestData(strapi: Strapi): Promise<void> {
  // Create test categories
  const categories = [
    { name: 'Wellness', slug: 'wellness', description: 'Wellness products' },
    { name: 'Adult', slug: 'adult', description: 'Adult products' },
    { name: 'Trending', slug: 'trending', description: 'Trending products' },
  ];

  for (const category of categories) {
    await strapi.entityService.create('api::category.category', {
      data: category,
    });
  }

  // Create test brands
  const brands = [
    { name: 'Premium Brand', slug: 'premium-brand' },
    { name: 'Budget Brand', slug: 'budget-brand' },
  ];

  for (const brand of brands) {
    await strapi.entityService.create('api::brand.brand', {
      data: brand,
    });
  }

  // Create test products
  const products = [
    {
      name: 'Wellness Doll Premium',
      slug: 'wellness-doll-premium',
      description: 'Premium wellness doll for adults',
      price: 149.99,
      compareAtPrice: 199.99,
      sku: 'WDP-001',
      inventory: 100,
      status: 'active',
      featured: true,
      trendScore: 95,
      categories: [1],
      brand: 1,
    },
    {
      name: 'Budget Wellness Doll',
      slug: 'budget-wellness-doll',
      description: 'Affordable wellness doll',
      price: 49.99,
      compareAtPrice: 69.99,
      sku: 'BWD-001',
      inventory: 200,
      status: 'active',
      featured: false,
      trendScore: 70,
      categories: [1],
      brand: 2,
    },
    {
      name: 'Trending Adult Doll',
      slug: 'trending-adult-doll',
      description: 'Currently trending adult doll',
      price: 89.99,
      compareAtPrice: 119.99,
      sku: 'TAD-001',
      inventory: 50,
      status: 'active',
      featured: true,
      trendScore: 90,
      categories: [2, 3],
      brand: 1,
    },
  ];

  for (const product of products) {
    await strapi.entityService.create('api::product.product', {
      data: product,
    });
  }

  // Create test user role permissions
  const publicRole = await strapi
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'public' } });

  await strapi
    .query('plugin::users-permissions.permission')
    .updateMany({
      where: {
        role: publicRole.id,
        action: { $in: ['api::product.product.find', 'api::product.product.findOne'] },
      },
      data: {
        enabled: true,
      },
    });

  const authenticatedRole = await strapi
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'authenticated' } });

  await strapi
    .query('plugin::users-permissions.permission')
    .updateMany({
      where: {
        role: authenticatedRole.id,
        action: {
          $in: [
            'api::product.product.find',
            'api::product.product.findOne',
            'api::product.product.create',
            'api::product.product.update',
            'api::product.product.delete',
          ],
        },
      },
      data: {
        enabled: true,
      },
    });
}

// Test utilities
export function createAuthenticatedRequest(strapi: Strapi) {
  // Helper to create authenticated requests
  return {
    async asUser(userData = {}) {
      const user = await strapi.plugins['users-permissions'].services.user.add({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test123456!',
        confirmed: true,
        blocked: false,
        ...userData,
      });

      const jwt = strapi.plugins['users-permissions'].services.jwt.issue({
        id: user.id,
      });

      return {
        user,
        jwt,
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      };
    },
    async asAdmin() {
      const admin = await strapi.admin.services.user.create({
        email: 'admin@example.com',
        password: 'Admin123456!',
        firstname: 'Admin',
        lastname: 'User',
        isActive: true,
      });

      const jwt = strapi.admin.services.token.createJwtToken(admin);

      return {
        admin,
        jwt,
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      };
    },
  };
}