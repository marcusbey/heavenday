import dotenv from 'dotenv';
import { logger } from '../src/utils/logger';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

// Mock external services for testing
jest.setTimeout(30000); // 30 second timeout for tests

// Global test setup
beforeAll(async () => {
  logger.info('🧪 Setting up test environment');
});

afterAll(async () => {
  logger.info('🧪 Cleaning up test environment');
});

// Mock external API calls by default
export const mockGoogleTrends = jest.fn();
export const mockInstagramAPI = jest.fn();
export const mockTikTokScraper = jest.fn();
export const mockPuppeteer = jest.fn();

// Test utilities
export const createMockTrendData = () => ({
  timestamp: new Date(),
  keywords: [
    {
      keyword: 'test keyword',
      score: 75,
      geo: 'US',
      timestamp: new Date(),
      relatedQueries: ['related query 1', 'related query 2'],
      category: 'adult-products'
    }
  ],
  geographicTrends: [
    {
      geo: 'US',
      geoName: 'United States',
      score: 80,
      keyword: 'test keyword'
    }
  ],
  summary: {
    totalKeywords: 1,
    averageScore: 75,
    topRegions: [{ geo: 'US', geoName: 'United States', score: 80 }]
  }
});

export const createMockProductData = () => ({
  id: 'test-product-1',
  title: 'Test Wellness Product',
  description: 'A test product for wellness',
  imageUrl: 'https://example.com/image.jpg',
  sourceUrl: 'https://amazon.com/product/test',
  platform: 'amazon' as const,
  price: 29.99,
  rating: 4.5,
  reviewCount: 150,
  trendScore: 85,
  keywords: ['wellness', 'health'],
  scrapedAt: new Date()
});

export const createMockSocialMediaTrend = () => ({
  platform: 'instagram' as const,
  hashtag: '#testwellness',
  postCount: 500,
  engagementRate: 8.5,
  trendScore: 78,
  relatedProducts: ['product1', 'product2'],
  scrapedAt: new Date()
});