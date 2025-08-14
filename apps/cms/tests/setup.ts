import fs from 'fs';
import path from 'path';

// Setup test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_CLIENT = 'sqlite';
process.env.DATABASE_FILENAME = '.tmp/test.db';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.ADMIN_JWT_SECRET = 'test-admin-jwt-secret';
process.env.API_TOKEN_SALT = 'test-api-token-salt';
process.env.APP_KEYS = 'test-app-key1,test-app-key2';

// Mock Strapi instance
const mockStrapi = {
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  config: {
    get: jest.fn((key: string) => {
      const config: any = {
        'server.host': 'localhost',
        'server.port': 1337,
        'api.rest.prefix': '/api',
      };
      return config[key];
    }),
  },
  db: {
    query: jest.fn(),
    transaction: jest.fn(),
  },
  entityService: {
    findMany: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  service: jest.fn((name: string) => {
    const services: any = {
      'api::product.product': {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      'api::category.category': {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    return services[name] || {};
  }),
  plugin: jest.fn((name: string) => ({
    service: jest.fn(),
    controller: jest.fn(),
  })),
};

// Global setup
(global as any).strapi = mockStrapi;

// Clean up test database before each test
beforeEach(async () => {
  const tmpDir = path.join(process.cwd(), '.tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
});

// Clean up after tests
afterAll(async () => {
  const tmpDir = path.join(process.cwd(), '.tmp');
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// Test utilities
export const createMockContext = (overrides = {}) => ({
  state: {
    user: {
      id: 1,
      email: 'test@example.com',
    },
  },
  request: {
    body: {},
    query: {},
    params: {},
    headers: {},
  },
  response: {
    body: null,
    status: 200,
  },
  send: jest.fn((data: any) => {
    return data;
  }),
  badRequest: jest.fn((message: string) => {
    throw new Error(message);
  }),
  notFound: jest.fn((message: string) => {
    throw new Error(message);
  }),
  unauthorized: jest.fn((message: string) => {
    throw new Error(message);
  }),
  ...overrides,
});

export const createTestProduct = (overrides = {}) => ({
  id: 1,
  name: 'Test Product',
  slug: 'test-product',
  description: 'A test product',
  price: 99.99,
  compareAtPrice: 129.99,
  sku: 'TEST001',
  inventory: 100,
  status: 'active',
  featured: false,
  trendScore: 75,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  publishedAt: new Date().toISOString(),
  ...overrides,
});

export const createTestCategory = (overrides = {}) => ({
  id: 1,
  name: 'Test Category',
  slug: 'test-category',
  description: 'A test category',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  publishedAt: new Date().toISOString(),
  ...overrides,
});

export const createTestUser = (overrides = {}) => ({
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  provider: 'local',
  confirmed: true,
  blocked: false,
  role: {
    id: 1,
    name: 'Authenticated',
    type: 'authenticated',
  },
  ...overrides,
});