import { AmazonScraper } from '../../src/scraping/amazon-scraper';
import puppeteer from 'puppeteer';
import { createMockProductData } from '../setup';

jest.mock('puppeteer');
jest.mock('../../src/utils/logger');

describe('AmazonScraper', () => {
  let scraper: AmazonScraper;
  let mockBrowser: any;
  let mockPage: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Puppeteer
    mockPage = {
      goto: jest.fn(),
      waitForSelector: jest.fn(),
      evaluate: jest.fn(),
      $: jest.fn(),
      $$: jest.fn(),
      close: jest.fn(),
      setUserAgent: jest.fn(),
      setViewport: jest.fn(),
      setExtraHTTPHeaders: jest.fn(),
      on: jest.fn(),
    };
    
    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn(),
    };
    
    (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);
    
    scraper = new AmazonScraper();
  });

  afterEach(async () => {
    await scraper.close();
  });

  describe('searchProducts', () => {
    it('successfully searches and scrapes products', async () => {
      const keyword = 'wellness products';
      const mockSearchResults = [
        {
          asin: 'B001234567',
          title: 'Test Wellness Product',
          price: '$29.99',
          rating: '4.5 out of 5 stars',
          reviewCount: '150 customer reviews',
          imageUrl: 'https://m.media-amazon.com/images/test.jpg',
          url: '/dp/B001234567',
        },
      ];

      mockPage.evaluate.mockResolvedValueOnce(mockSearchResults);

      const results = await scraper.searchProducts(keyword);

      expect(mockPage.goto).toHaveBeenCalledWith(
        expect.stringContaining(`k=${encodeURIComponent(keyword)}`),
        { waitUntil: 'networkidle2', timeout: 30000 }
      );
      
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        id: 'B001234567',
        title: 'Test Wellness Product',
        price: 29.99,
        rating: 4.5,
        reviewCount: 150,
        platform: 'amazon',
      });
    });

    it('handles search with no results', async () => {
      mockPage.evaluate.mockResolvedValueOnce([]);

      const results = await scraper.searchProducts('nonexistent product');

      expect(results).toEqual([]);
    });

    it('filters adult products by default', async () => {
      const mockSearchResults = [
        {
          asin: 'B001',
          title: 'Regular Product',
          price: '$29.99',
          rating: '4.5 out of 5 stars',
        },
        {
          asin: 'B002',
          title: 'Adult Product Vibrator',
          price: '$39.99',
          rating: '4.0 out of 5 stars',
        },
      ];

      mockPage.evaluate.mockResolvedValueOnce(mockSearchResults);

      const results = await scraper.searchProducts('products');

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Regular Product');
    });

    it('includes adult products when filter is disabled', async () => {
      const mockSearchResults = [
        {
          asin: 'B001',
          title: 'Adult Product',
          price: '$29.99',
          rating: '4.5 out of 5 stars',
        },
      ];

      mockPage.evaluate.mockResolvedValueOnce(mockSearchResults);

      const results = await scraper.searchProducts('adult products', {
        includeAdult: true,
      });

      expect(results).toHaveLength(1);
    });

    it('retries on navigation failure', async () => {
      mockPage.goto
        .mockRejectedValueOnce(new Error('Navigation timeout'))
        .mockResolvedValueOnce(undefined);
      
      mockPage.evaluate.mockResolvedValueOnce([]);

      const results = await scraper.searchProducts('test');

      expect(mockPage.goto).toHaveBeenCalledTimes(2);
      expect(results).toBeDefined();
    });
  });

  describe('getProductDetails', () => {
    it('scrapes detailed product information', async () => {
      const productUrl = 'https://amazon.com/dp/B001234567';
      const mockProductDetails = {
        title: 'Detailed Product Title',
        price: '$49.99',
        description: 'Product description text',
        features: ['Feature 1', 'Feature 2'],
        specifications: {
          'Brand': 'Test Brand',
          'Model': 'TB-001',
        },
        images: [
          'https://m.media-amazon.com/images/1.jpg',
          'https://m.media-amazon.com/images/2.jpg',
        ],
        availability: 'In Stock',
        seller: 'Test Seller',
      };

      mockPage.evaluate.mockResolvedValueOnce(mockProductDetails);

      const details = await scraper.getProductDetails(productUrl);

      expect(mockPage.goto).toHaveBeenCalledWith(
        productUrl,
        expect.any(Object)
      );
      
      expect(details).toMatchObject({
        title: 'Detailed Product Title',
        price: 49.99,
        description: 'Product description text',
        features: ['Feature 1', 'Feature 2'],
      });
    });

    it('handles missing product details gracefully', async () => {
      mockPage.evaluate.mockResolvedValueOnce({
        title: 'Product',
        // Missing other details
      });

      const details = await scraper.getProductDetails('https://amazon.com/dp/B001');

      expect(details.title).toBe('Product');
      expect(details.price).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('handles page navigation errors', async () => {
      mockPage.goto.mockRejectedValue(new Error('Page load failed'));

      await expect(scraper.searchProducts('test')).rejects.toThrow();
    });

    it('handles evaluation errors', async () => {
      mockPage.evaluate.mockRejectedValue(new Error('Evaluation failed'));

      await expect(scraper.searchProducts('test')).rejects.toThrow();
    });

    it('implements rate limiting', async () => {
      const startTime = Date.now();
      
      await scraper.searchProducts('test1');
      await scraper.searchProducts('test2');
      
      const elapsed = Date.now() - startTime;
      
      // Should have delay between requests
      expect(elapsed).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('Browser Management', () => {
    it('launches browser with correct options', async () => {
      await scraper.searchProducts('test');

      expect(puppeteer.launch).toHaveBeenCalledWith({
        headless: 'new',
        args: expect.arrayContaining([
          '--no-sandbox',
          '--disable-setuid-sandbox',
        ]),
      });
    });

    it('sets user agent to avoid detection', async () => {
      await scraper.searchProducts('test');

      expect(mockPage.setUserAgent).toHaveBeenCalledWith(
        expect.stringContaining('Mozilla')
      );
    });

    it('closes browser on cleanup', async () => {
      await scraper.close();

      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('handles browser crash gracefully', async () => {
      mockBrowser.newPage.mockRejectedValueOnce(new Error('Browser crashed'));
      
      // Should reinitialize browser
      await expect(scraper.searchProducts('test')).rejects.toThrow();
      
      expect(puppeteer.launch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Data Extraction', () => {
    it('parses price correctly', () => {
      const testCases = [
        { input: '$29.99', expected: 29.99 },
        { input: '$1,299.99', expected: 1299.99 },
        { input: '29.99', expected: 29.99 },
        { input: '$29', expected: 29 },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(scraper['parsePrice'](input)).toBe(expected);
      });
    });

    it('parses rating correctly', () => {
      const testCases = [
        { input: '4.5 out of 5 stars', expected: 4.5 },
        { input: '5.0 out of 5 stars', expected: 5 },
        { input: '3 out of 5 stars', expected: 3 },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(scraper['parseRating'](input)).toBe(expected);
      });
    });

    it('parses review count correctly', () => {
      const testCases = [
        { input: '150 customer reviews', expected: 150 },
        { input: '1,500 customer reviews', expected: 1500 },
        { input: '5 ratings', expected: 5 },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(scraper['parseReviewCount'](input)).toBe(expected);
      });
    });
  });
});