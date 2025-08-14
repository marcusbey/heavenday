import { faker } from '@faker-js/faker';

// Base factory interface
interface FactoryOptions {
  count?: number;
  overrides?: Record<string, any>;
}

// Product factory
export const createProduct = (overrides: Partial<any> = {}) => ({
  id: faker.number.int({ min: 1, max: 10000 }),
  attributes: {
    name: faker.commerce.productName(),
    slug: faker.helpers.slugify(faker.commerce.productName()).toLowerCase(),
    description: faker.commerce.productDescription(),
    price: parseFloat(faker.commerce.price({ min: 10, max: 500 })),
    compareAtPrice: parseFloat(faker.commerce.price({ min: 15, max: 600 })),
    currency: 'USD',
    sku: faker.string.alphanumeric({ length: { min: 6, max: 12 } }).toUpperCase(),
    inventory: faker.number.int({ min: 0, max: 200 }),
    status: faker.helpers.arrayElement(['active', 'inactive', 'draft']),
    featured: faker.datatype.boolean(),
    trendScore: faker.number.int({ min: 0, max: 100 }),
    averageRating: faker.number.float({ min: 1, max: 5, fractionDigits: 1 }),
    reviewCount: faker.number.int({ min: 0, max: 1000 }),
    weight: faker.number.float({ min: 0.1, max: 10, fractionDigits: 2 }),
    dimensions: {
      length: faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      width: faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      height: faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
    },
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    publishedAt: faker.date.past().toISOString(),
    images: {
      data: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => createImage()),
    },
    categories: {
      data: Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => createCategory()),
    },
    brand: {
      data: createBrand(),
    },
    reviews: {
      data: Array.from({ length: faker.number.int({ min: 0, max: 5 }) }, () => createReview()),
    },
    variants: {
      data: Array.from({ length: faker.number.int({ min: 0, max: 3 }) }, () => createProductVariant()),
    },
    tags: {
      data: Array.from({ length: faker.number.int({ min: 0, max: 5 }) }, () => createTag()),
    },
    seo: {
      metaTitle: faker.lorem.sentence(),
      metaDescription: faker.lorem.paragraph(),
      keywords: faker.lorem.words(5),
    },
    ...overrides,
  },
});

// Category factory
export const createCategory = (overrides: Partial<any> = {}) => ({
  id: faker.number.int({ min: 1, max: 100 }),
  attributes: {
    name: faker.commerce.department(),
    slug: faker.helpers.slugify(faker.commerce.department()).toLowerCase(),
    description: faker.lorem.paragraph(),
    parentCategory: null,
    productCount: faker.number.int({ min: 0, max: 500 }),
    featured: faker.datatype.boolean(),
    sortOrder: faker.number.int({ min: 0, max: 100 }),
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    publishedAt: faker.date.past().toISOString(),
    image: {
      data: createImage(),
    },
    seo: {
      metaTitle: faker.lorem.sentence(),
      metaDescription: faker.lorem.paragraph(),
    },
    ...overrides,
  },
});

// Brand factory
export const createBrand = (overrides: Partial<any> = {}) => ({
  id: faker.number.int({ min: 1, max: 100 }),
  attributes: {
    name: faker.company.name(),
    slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
    description: faker.company.catchPhrase(),
    website: faker.internet.url(),
    featured: faker.datatype.boolean(),
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    publishedAt: faker.date.past().toISOString(),
    logo: {
      data: createImage(),
    },
    ...overrides,
  },
});

// Image factory
export const createImage = (overrides: Partial<any> = {}) => ({
  id: faker.number.int({ min: 1, max: 10000 }),
  attributes: {
    name: faker.system.fileName({ extensionCount: 1 }),
    alternativeText: faker.lorem.sentence(),
    caption: faker.lorem.sentence(),
    width: faker.number.int({ min: 100, max: 2000 }),
    height: faker.number.int({ min: 100, max: 2000 }),
    formats: {
      thumbnail: {
        url: faker.image.url({ width: 150, height: 150 }),
        width: 150,
        height: 150,
      },
      small: {
        url: faker.image.url({ width: 300, height: 300 }),
        width: 300,
        height: 300,
      },
      medium: {
        url: faker.image.url({ width: 600, height: 600 }),
        width: 600,
        height: 600,
      },
      large: {
        url: faker.image.url({ width: 1200, height: 1200 }),
        width: 1200,
        height: 1200,
      },
    },
    url: faker.image.url(),
    previewUrl: faker.image.url({ width: 100, height: 100 }),
    provider: 'aws-s3',
    size: faker.number.float({ min: 10, max: 2000, fractionDigits: 2 }),
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    ...overrides,
  },
});

// Review factory
export const createReview = (overrides: Partial<any> = {}) => ({
  id: faker.number.int({ min: 1, max: 10000 }),
  attributes: {
    rating: faker.number.int({ min: 1, max: 5 }),
    title: faker.lorem.sentence(),
    comment: faker.lorem.paragraphs(2),
    author: faker.person.fullName(),
    email: faker.internet.email(),
    verified: faker.datatype.boolean(),
    helpful: faker.number.int({ min: 0, max: 50 }),
    reported: faker.datatype.boolean(),
    status: faker.helpers.arrayElement(['published', 'pending', 'rejected']),
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    publishedAt: faker.date.past().toISOString(),
    ...overrides,
  },
});

// Product variant factory
export const createProductVariant = (overrides: Partial<any> = {}) => ({
  id: faker.number.int({ min: 1, max: 10000 }),
  attributes: {
    sku: faker.string.alphanumeric({ length: { min: 8, max: 15 } }).toUpperCase(),
    price: parseFloat(faker.commerce.price({ min: 10, max: 500 })),
    compareAtPrice: parseFloat(faker.commerce.price({ min: 15, max: 600 })),
    inventory: faker.number.int({ min: 0, max: 100 }),
    weight: faker.number.float({ min: 0.1, max: 5, fractionDigits: 2 }),
    status: faker.helpers.arrayElement(['active', 'inactive']),
    attributes: {
      color: faker.color.human(),
      size: faker.helpers.arrayElement(['XS', 'S', 'M', 'L', 'XL', 'XXL']),
      material: faker.helpers.arrayElement(['Cotton', 'Silk', 'Polyester', 'Leather']),
    },
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    images: {
      data: Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => createImage()),
    },
    ...overrides,
  },
});

// Tag factory
export const createTag = (overrides: Partial<any> = {}) => ({
  id: faker.number.int({ min: 1, max: 1000 }),
  attributes: {
    name: faker.lorem.word(),
    slug: faker.helpers.slugify(faker.lorem.word()).toLowerCase(),
    color: faker.color.rgb(),
    productCount: faker.number.int({ min: 0, max: 100 }),
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    ...overrides,
  },
});

// User factory
export const createUser = (overrides: Partial<any> = {}) => ({
  id: faker.number.int({ min: 1, max: 10000 }),
  username: faker.internet.userName(),
  email: faker.internet.email(),
  provider: 'local',
  confirmed: true,
  blocked: false,
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  avatar: faker.image.avatar(),
  dateOfBirth: faker.date.birthdate(),
  phone: faker.phone.number(),
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
  role: {
    id: 1,
    name: 'Authenticated',
    type: 'authenticated',
  },
  profile: {
    bio: faker.lorem.paragraph(),
    preferences: {
      newsletter: faker.datatype.boolean(),
      notifications: faker.datatype.boolean(),
      theme: faker.helpers.arrayElement(['light', 'dark', 'auto']),
    },
  },
  addresses: Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => createAddress()),
  ...overrides,
});

// Address factory
export const createAddress = (overrides: Partial<any> = {}) => ({
  id: faker.number.int({ min: 1, max: 10000 }),
  type: faker.helpers.arrayElement(['billing', 'shipping', 'both']),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  company: faker.company.name(),
  address1: faker.location.streetAddress(),
  address2: faker.location.secondaryAddress(),
  city: faker.location.city(),
  state: faker.location.state(),
  postalCode: faker.location.zipCode(),
  country: faker.location.countryCode(),
  phone: faker.phone.number(),
  isDefault: faker.datatype.boolean(),
  ...overrides,
});

// Order factory
export const createOrder = (overrides: Partial<any> = {}) => ({
  id: faker.number.int({ min: 1, max: 10000 }),
  orderNumber: faker.string.alphanumeric({ length: 8 }).toUpperCase(),
  status: faker.helpers.arrayElement(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
  subtotal: parseFloat(faker.commerce.price({ min: 50, max: 1000 })),
  tax: parseFloat(faker.commerce.price({ min: 5, max: 100 })),
  shipping: parseFloat(faker.commerce.price({ min: 0, max: 50 })),
  discount: parseFloat(faker.commerce.price({ min: 0, max: 100 })),
  total: parseFloat(faker.commerce.price({ min: 55, max: 1100 })),
  currency: 'USD',
  paymentStatus: faker.helpers.arrayElement(['pending', 'paid', 'failed', 'refunded']),
  paymentMethod: faker.helpers.arrayElement(['credit_card', 'paypal', 'stripe', 'apple_pay']),
  shippingMethod: faker.helpers.arrayElement(['standard', 'express', 'overnight']),
  trackingNumber: faker.string.alphanumeric({ length: 12 }).toUpperCase(),
  notes: faker.lorem.paragraph(),
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
  shippingAddress: createAddress(),
  billingAddress: createAddress(),
  items: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => createOrderItem()),
  ...overrides,
});

// Order item factory
export const createOrderItem = (overrides: Partial<any> = {}) => ({
  id: faker.number.int({ min: 1, max: 10000 }),
  quantity: faker.number.int({ min: 1, max: 10 }),
  price: parseFloat(faker.commerce.price({ min: 10, max: 500 })),
  total: parseFloat(faker.commerce.price({ min: 10, max: 5000 })),
  product: createProduct(),
  variant: faker.datatype.boolean() ? createProductVariant() : null,
  ...overrides,
});

// API response factory
export const createApiResponse = (data: any, meta: Partial<any> = {}) => ({
  data: Array.isArray(data) ? data : [data],
  meta: {
    pagination: {
      page: 1,
      pageSize: 25,
      pageCount: 1,
      total: Array.isArray(data) ? data.length : 1,
    },
    ...meta,
  },
});

// Trend data factory (for automation pipeline)
export const createTrendData = (overrides: Partial<any> = {}) => ({
  timestamp: faker.date.recent(),
  keywords: Array.from({ length: faker.number.int({ min: 1, max: 10 }) }, () => ({
    keyword: faker.lorem.words(2),
    score: faker.number.int({ min: 1, max: 100 }),
    geo: faker.location.countryCode(),
    timestamp: faker.date.recent(),
    relatedQueries: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => faker.lorem.words(3)),
    category: faker.helpers.arrayElement(['adult-products', 'wellness', 'trending']),
  })),
  geographicTrends: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => ({
    geo: faker.location.countryCode(),
    geoName: faker.location.country(),
    score: faker.number.int({ min: 1, max: 100 }),
    keyword: faker.lorem.words(2),
  })),
  summary: {
    totalKeywords: faker.number.int({ min: 1, max: 100 }),
    averageScore: faker.number.int({ min: 1, max: 100 }),
    topRegions: Array.from({ length: 3 }, () => ({
      geo: faker.location.countryCode(),
      geoName: faker.location.country(),
      score: faker.number.int({ min: 80, max: 100 }),
    })),
  },
  ...overrides,
});

// Scraped product factory (for automation pipeline)
export const createScrapedProduct = (overrides: Partial<any> = {}) => ({
  id: faker.string.alphanumeric({ length: 10 }),
  title: faker.commerce.productName(),
  description: faker.commerce.productDescription(),
  imageUrl: faker.image.url(),
  sourceUrl: faker.internet.url(),
  platform: faker.helpers.arrayElement(['amazon', 'ebay', 'shopify']),
  price: parseFloat(faker.commerce.price({ min: 10, max: 500 })),
  rating: faker.number.float({ min: 1, max: 5, fractionDigits: 1 }),
  reviewCount: faker.number.int({ min: 0, max: 1000 }),
  trendScore: faker.number.int({ min: 1, max: 100 }),
  keywords: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => faker.lorem.word()),
  scrapedAt: faker.date.recent(),
  ...overrides,
});

// Factory helper functions
export const createMany = <T>(factory: () => T, count: number): T[] => {
  return Array.from({ length: count }, factory);
};

export const createBatch = <T>(factory: (overrides?: any) => T, options: FactoryOptions = {}): T[] => {
  const { count = 5, overrides = {} } = options;
  return Array.from({ length: count }, (_, index) => 
    factory({ ...overrides, id: overrides.id || index + 1 })
  );
};

// Seed data for consistent testing
export const seedData = {
  categories: [
    createCategory({ 
      attributes: { 
        name: 'Wellness', 
        slug: 'wellness',
        description: 'Products for wellness and relaxation'
      } 
    }),
    createCategory({ 
      attributes: { 
        name: 'Adult', 
        slug: 'adult',
        description: 'Adult companionship products'
      } 
    }),
    createCategory({ 
      attributes: { 
        name: 'Trending', 
        slug: 'trending',
        description: 'Currently trending products'
      } 
    }),
  ],
  brands: [
    createBrand({ 
      attributes: { 
        name: 'Premium Brand', 
        slug: 'premium-brand' 
      } 
    }),
    createBrand({ 
      attributes: { 
        name: 'Budget Brand', 
        slug: 'budget-brand' 
      } 
    }),
  ],
  products: [
    createProduct({
      attributes: {
        name: 'Premium Wellness Doll',
        slug: 'premium-wellness-doll',
        price: 199.99,
        featured: true,
        trendScore: 95,
      }
    }),
    createProduct({
      attributes: {
        name: 'Budget Therapy Doll',
        slug: 'budget-therapy-doll',
        price: 79.99,
        featured: false,
        trendScore: 70,
      }
    }),
  ],
};