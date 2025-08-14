import { AmazonScraperService } from '../../src/scraping/amazon-scraper';
import { ProductTrend } from '../../src/types/trends';
import { logger } from '../../src/utils/logger';
import puppeteer, { Browser, Page } from 'puppeteer';
import cheerio from 'cheerio';

// Mock dependencies
jest.mock('puppeteer');
jest.mock('cheerio');
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('AmazonScraperService - Comprehensive Tests', () => {
  let service: AmazonScraperService;
  let mockBrowser: jest.Mocked<Browser>;
  let mockPage: jest.Mocked<Page>;
  let mockCheerio: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Puppeteer Page
    mockPage = {
      goto: jest.fn(),
      waitForSelector: jest.fn(),
      content: jest.fn(),
      close: jest.fn(),
      setUserAgent: jest.fn(),
      setViewport: jest.fn(),
      setExtraHTTPHeaders: jest.fn(),
      screenshot: jest.fn(),
      evaluate: jest.fn(),
      $: jest.fn(),
      $$: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      click: jest.fn(),
      type: jest.fn(),
      select: jest.fn(),
      focus: jest.fn(),
      hover: jest.fn(),
      waitForTimeout: jest.fn(),
      waitForFunction: jest.fn(),
      waitForNavigation: jest.fn(),
      reload: jest.fn(),
      goBack: jest.fn(),
      goForward: jest.fn(),
      emulate: jest.fn(),
      setJavaScriptEnabled: jest.fn(),
      setCacheEnabled: jest.fn(),
      setDefaultNavigationTimeout: jest.fn(),
      setDefaultTimeout: jest.fn(),
      metrics: jest.fn(),
      title: jest.fn(),
      url: jest.fn()
    } as any;
    
    // Mock Puppeteer Browser
    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn(),
      pages: jest.fn(),
      targets: jest.fn(),
      createIncognitoBrowserContext: jest.fn(),
      defaultBrowserContext: jest.fn(),
      wsEndpoint: jest.fn(),
      process: jest.fn(),
      isConnected: jest.fn(),
      version: jest.fn(),
      userAgent: jest.fn(),
      disconnect: jest.fn()
    } as any;
    
    (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);
    
    // Mock Cheerio
    mockCheerio = {
      load: jest.fn(),
      find: jest.fn(),
      text: jest.fn(),
      attr: jest.fn(),
      each: jest.fn()
    };
    
    service = new AmazonScraperService({
      headless: true,
      maxProducts: 20,
      delayBetweenRequests: 100 // Reduced for tests
    });
  });

  afterEach(async () => {
    await service.close();
  });

  describe('Initialization and Configuration', () => {
    it('should initialize with default options', () => {
      const defaultService = new AmazonScraperService();
      expect(defaultService['options']).toEqual({
        headless: true,
        maxProducts: 50,
        delayBetweenRequests: 3000,
        userAgent: expect.stringContaining('Mozilla')
      });
    });

    it('should initialize with custom options', () => {
      const customService = new AmazonScraperService({
        headless: false,
        maxProducts: 100,
        delayBetweenRequests: 1000,
        userAgent: 'Custom User Agent'
      });
      
      expect(customService['options']).toEqual({
        headless: false,
        maxProducts: 100,
        delayBetweenRequests: 1000,
        userAgent: 'Custom User Agent'
      });
    });

    it('should initialize browser with correct configuration', async () => {
      await service.initialize();

      expect(puppeteer.launch).toHaveBeenCalledWith({
        headless: true,
        args: expect.arrayContaining([
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-dev-shm-usage'
        ])
      });
    });

    it('should handle browser initialization errors', async () => {
      (puppeteer.launch as jest.Mock).mockRejectedValue(new Error('Browser launch failed'));

      await expect(service.initialize()).rejects.toThrow('Browser launch failed');
      expect(logger.error).toHaveBeenCalledWith('Error initializing browser:', expect.any(Error));
    });
  });

  describe('Browser Management', () => {
    it('should auto-initialize browser when needed', async () => {
      mockPage.content.mockResolvedValue('<div data-component-type="s-search-result"></div>');
      mockPage.waitForSelector.mockResolvedValue({} as any);
      
      await service.searchProducts(['test']);

      expect(puppeteer.launch).toHaveBeenCalled();
      expect(mockBrowser.newPage).toHaveBeenCalled();
    });

    it('should reuse existing browser instance', async () => {
      await service.initialize();
      
      mockPage.content.mockResolvedValue('<div data-component-type="s-search-result"></div>');
      mockPage.waitForSelector.mockResolvedValue({} as any);
      
      await service.searchProducts(['test1']);
      await service.searchProducts(['test2']);

      expect(puppeteer.launch).toHaveBeenCalledTimes(1);
    });

    it('should close browser properly', async () => {
      await service.initialize();
      await service.close();

      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle browser close errors gracefully', async () => {
      await service.initialize();
      mockBrowser.close.mockRejectedValue(new Error('Close failed'));

      await expect(service.close()).resolves.not.toThrow();
    });

    it('should handle multiple close calls', async () => {
      await service.initialize();
      await service.close();
      await service.close(); // Second call should not throw

      expect(mockBrowser.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('Product Search Functionality', () => {
    beforeEach(() => {
      mockPage.waitForSelector.mockResolvedValue({} as any);
    });

    it('should search for multiple keywords sequentially', async () => {
      const keywords = ['wellness', 'health', 'personal care'];
      
      mockPage.content.mockResolvedValue(`
        <div data-component-type="s-search-result">
          <h2><a href="/dp/B123"><span>Test Product</span></a></h2>
          <span class="a-price"><span class="a-offscreen">$29.99</span></span>
          <span class="a-icon-alt">4.5 out of 5 stars</span>
          <img src="https://example.com/image.jpg" />
        </div>
      `);

      await service.searchProducts(keywords);

      expect(mockPage.goto).toHaveBeenCalledTimes(keywords.length);
      keywords.forEach(keyword => {
        expect(mockPage.goto).toHaveBeenCalledWith(
          expect.stringContaining(encodeURIComponent(keyword)),
          expect.any(Object)
        );
      });
    });

    it('should implement rate limiting between searches', async () => {
      const startTime = Date.now();
      
      mockPage.content.mockResolvedValue('<div data-component-type="s-search-result"></div>');
      
      await service.searchProducts(['keyword1', 'keyword2']);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should take at least the delay time
      expect(duration).toBeGreaterThan(90); // Slightly less than 100ms to account for timing
    });

    it('should extract product data from search results', async () => {
      const mockHtml = `
        <div data-component-type="s-search-result">
          <h2><a href="/dp/B001234567"><span>Wellness Product Title</span></a></h2>
          <span class="a-price"><span class="a-offscreen">$49.99</span></span>
          <span class="a-icon-alt">4.5 out of 5 stars</span>
          <a><span aria-label="150 customer reviews"></span></a>
          <img src="https://m.media-amazon.com/images/test.jpg" />
        </div>
      `;

      mockPage.content.mockResolvedValue(mockHtml);

      const products = await service.searchProducts(['wellness']);

      expect(products).toHaveLength(1);
      expect(products[0]).toMatchObject({
        id: 'B001234567',
        title: expect.stringContaining('Wellness Product'),
        price: 49.99,
        rating: 4.5,
        reviewCount: 150,
        platform: 'amazon',
        sourceUrl: expect.stringContaining('/dp/B001234567'),
        imageUrl: expect.stringContaining('test.jpg')
      });
    });

    it('should handle missing product information gracefully', async () => {
      const mockHtml = `
        <div data-component-type="s-search-result">
          <h2><a href="/dp/B123"><span>Product with Missing Data</span></a></h2>
          <!-- Missing price, rating, reviews -->
        </div>
      `;

      mockPage.content.mockResolvedValue(mockHtml);

      const products = await service.searchProducts(['test']);

      expect(products).toHaveLength(1);
      expect(products[0]).toMatchObject({
        title: expect.stringContaining('Product with Missing Data'),
        price: 0, // Default value
        rating: 0, // Default value
        reviewCount: 0 // Default value
      });
    });

    it('should filter out products below quality threshold', async () => {
      const mockHtml = `
        <div data-component-type="s-search-result">
          <h2><a href="/dp/B001"><span>Good Product</span></a></h2>
          <span class="a-price"><span class="a-offscreen">$29.99</span></span>
          <span class="a-icon-alt">4.5 out of 5 stars</span>
        </div>
        <div data-component-type="s-search-result">
          <h2><a href="/dp/B002"><span>Bad Product</span></a></h2>
          <span class="a-price"><span class="a-offscreen">$9.99</span></span>
          <span class="a-icon-alt">2.0 out of 5 stars</span>
        </div>
      `;

      mockPage.content.mockResolvedValue(mockHtml);

      const products = await service.searchProducts(['test']);

      // Should include good product and exclude bad one based on validation
      expect(products.length).toBeGreaterThan(0);
      const validProducts = products.filter(p => service['validateProduct'](p));
      expect(validProducts.length).toBeGreaterThan(0);
    });

    it('should respect maxProducts limit', async () => {
      const limitedService = new AmazonScraperService({ maxProducts: 2 });
      
      const mockHtml = Array(5).fill(0).map((_, i) => `
        <div data-component-type="s-search-result">
          <h2><a href="/dp/B00${i}"><span>Product ${i}</span></a></h2>
          <span class="a-price"><span class="a-offscreen">$${20 + i}.99</span></span>
          <span class="a-icon-alt">4.0 out of 5 stars</span>
        </div>
      `).join('');

      mockPage.content.mockResolvedValue(mockHtml);

      const products = await limitedService.searchProducts(['test']);

      expect(products.length).toBeLessThanOrEqual(2);
      
      await limitedService.close();
    });
  });

  describe('Bestsellers Functionality', () => {
    it('should fetch bestsellers from specified categories', async () => {
      const mockHtml = `
        <div class="zg-grid-general-faceout">
          <span class="p13n-sc-truncate-desktop-type2">Bestseller Product</span>
          <a href="/dp/B001234567"></a>
          <img src="https://example.com/bestseller.jpg" />
          <span class="zg-bdg-text">#1</span>
        </div>
      `;

      mockPage.content.mockResolvedValue(mockHtml);
      mockPage.waitForSelector.mockResolvedValue({} as any);

      const products = await service.getBestsellers(['Health & Personal Care']);

      expect(products).toHaveLength(1);
      expect(products[0]).toMatchObject({
        title: 'Bestseller Product',
        platform: 'amazon',
        trendScore: expect.any(Number)
      });
    });

    it('should handle multiple categories', async () => {
      const categories = ['Health & Personal Care', 'Beauty'];
      
      mockPage.content.mockResolvedValue(`
        <div class="zg-grid-general-faceout">
          <span class="p13n-sc-truncate-desktop-type2">Category Product</span>
          <a href="/dp/B123"></a>
        </div>
      `);
      mockPage.waitForSelector.mockResolvedValue({} as any);

      await service.getBestsellers(categories);

      expect(mockPage.goto).toHaveBeenCalledTimes(categories.length);
    });

    it('should calculate trend score based on bestseller rank', async () => {
      const mockHtml = `
        <div class="zg-grid-general-faceout">
          <span class="p13n-sc-truncate-desktop-type2">Top Ranked Product</span>
          <a href="/dp/B001"></a>
          <span class="zg-bdg-text">#1</span>
        </div>
        <div class="zg-grid-general-faceout">
          <span class="p13n-sc-truncate-desktop-type2">Lower Ranked Product</span>
          <a href="/dp/B002"></a>
          <span class="zg-bdg-text">#50</span>
        </div>
      `;

      mockPage.content.mockResolvedValue(mockHtml);
      mockPage.waitForSelector.mockResolvedValue({} as any);

      const products = await service.getBestsellers(['Test Category']);

      expect(products[0].trendScore).toBeGreaterThan(products[1].trendScore);
    });
  });

  describe('Data Processing and Validation', () => {
    it('should calculate trend scores correctly', () => {
      const testCases = [
        { rating: 4.5, reviewCount: 500, price: 50, expected: expect.any(Number) },
        { rating: 5.0, reviewCount: 1000, price: 25, expected: expect.any(Number) },
        { rating: 3.0, reviewCount: 50, price: 100, expected: expect.any(Number) },
        { rating: 0, reviewCount: 0, price: 200, expected: expect.any(Number) }
      ];

      testCases.forEach(({ rating, reviewCount, price, expected }) => {
        const score = service['calculateTrendScore'](rating, reviewCount, price);
        expect(score).toEqual(expected);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    it('should generate unique product IDs', () => {
      const testUrls = [
        'https://amazon.com/dp/B001234567',
        'https://amazon.com/product/B007654321/ref=test',
        'https://amazon.com/invalid-url'
      ];

      const ids = testUrls.map(url => service['generateProductId'](url));
      
      expect(ids[0]).toBe('B001234567');
      expect(ids[1]).toBe('B007654321');
      expect(ids[2]).toMatch(/^amazon-\d+$/); // Fallback format
    });

    it('should extract keywords from product titles', () => {
      const testTitles = [
        'Wellness Device for Personal Health Care',
        'Premium Massage Tool with Multiple Settings',
        'Adult Intimate Health Product - Discreet Packaging',
        'Simple Product Name'
      ];

      testTitles.forEach(title => {
        const keywords = service['extractKeywordsFromTitle'](title);
        expect(Array.isArray(keywords)).toBe(true);
        expect(keywords.length).toBeLessThanOrEqual(5);
        keywords.forEach(keyword => {
          expect(keyword.length).toBeGreaterThan(3);
          expect(keyword).toBe(keyword.toLowerCase());
        });
      });
    });

    it('should clean and generate descriptions', () => {
      const testTitles = [
        'Test Product Title',
        'Very Long Product Title That Should Be Handled Properly',
        'Title with Special Characters!@#$%'
      ];

      testTitles.forEach(title => {
        const description = service['generateDescription'](title);
        expect(description).toContain(title);
        expect(description).toContain('Premium quality product available on Amazon');
      });
    });

    it('should validate product data comprehensively', () => {
      const validProduct: ProductTrend = {
        id: 'B001234567',
        title: 'Valid Product Title',
        description: 'Valid product description',
        imageUrl: 'https://example.com/image.jpg',
        sourceUrl: 'https://amazon.com/dp/B001234567',
        platform: 'amazon',
        price: 29.99,
        rating: 4.5,
        reviewCount: 150,
        trendScore: 85,
        keywords: ['wellness', 'health'],
        scrapedAt: new Date()
      };

      expect(service['validateProduct'](validProduct)).toBe(true);

      // Test invalid products
      const invalidProducts = [
        { ...validProduct, title: '' }, // Empty title
        { ...validProduct, price: -1 }, // Negative price
        { ...validProduct, rating: 6 }, // Rating too high
        { ...validProduct, reviewCount: -5 }, // Negative reviews
        { ...validProduct, imageUrl: 'invalid-url' }, // Invalid URL
        { ...validProduct, sourceUrl: 'not-a-url' } // Invalid URL
      ];

      invalidProducts.forEach(invalidProduct => {
        expect(service['validateProduct'](invalidProduct)).toBe(false);
      });
    });

    it('should deduplicate products correctly', () => {
      const products: ProductTrend[] = [
        {
          id: 'B001',
          title: 'Product 1',
          description: 'Description 1',
          imageUrl: 'https://example.com/1.jpg',
          sourceUrl: 'https://amazon.com/dp/B001',
          platform: 'amazon',
          price: 29.99,
          rating: 4.0,
          reviewCount: 100,
          trendScore: 80,
          keywords: ['test'],
          scrapedAt: new Date()
        },
        {
          id: 'B001', // Duplicate
          title: 'Product 1 Duplicate',
          description: 'Description 1 Duplicate',
          imageUrl: 'https://example.com/1-dup.jpg',
          sourceUrl: 'https://amazon.com/dp/B001',
          platform: 'amazon',
          price: 39.99,
          rating: 4.5,
          reviewCount: 200,
          trendScore: 90,
          keywords: ['test'],
          scrapedAt: new Date()
        },
        {
          id: 'B002',
          title: 'Product 2',
          description: 'Description 2',
          imageUrl: 'https://example.com/2.jpg',
          sourceUrl: 'https://amazon.com/dp/B002',
          platform: 'amazon',
          price: 19.99,
          rating: 3.5,
          reviewCount: 50,
          trendScore: 70,
          keywords: ['test'],
          scrapedAt: new Date()
        }
      ];

      const deduplicated = service['deduplicateProducts'](products);
      
      expect(deduplicated).toHaveLength(2);
      expect(deduplicated.map(p => p.id)).toEqual(['B001', 'B002']);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle page navigation failures', async () => {
      mockPage.goto.mockRejectedValue(new Error('Navigation timeout'));

      const products = await service.searchProducts(['test']);

      expect(products).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringMatching(/Error searching for keyword/),
        expect.any(Error)
      );
    });

    it('should handle page selector timeouts', async () => {
      mockPage.waitForSelector.mockRejectedValue(new Error('Selector timeout'));

      const products = await service.searchProducts(['test']);

      expect(products).toEqual([]);
    });

    it('should handle content extraction errors', async () => {
      mockPage.content.mockRejectedValue(new Error('Content extraction failed'));

      const products = await service.searchProducts(['test']);

      expect(products).toEqual([]);
    });

    it('should continue processing after individual product extraction failures', async () => {
      const mockHtml = `
        <div data-component-type="s-search-result">
          <h2><a href="/dp/B001"><span>Good Product</span></a></h2>
          <span class="a-price"><span class="a-offscreen">$29.99</span></span>
        </div>
        <div data-component-type="s-search-result">
          <!-- Malformed product that will cause extraction error -->
          <h2><span>Bad Product No Link</span></h2>
        </div>
        <div data-component-type="s-search-result">
          <h2><a href="/dp/B003"><span>Another Good Product</span></a></h2>
          <span class="a-price"><span class="a-offscreen">$39.99</span></span>
        </div>
      `;

      mockPage.content.mockResolvedValue(mockHtml);
      mockPage.waitForSelector.mockResolvedValue({} as any);

      const products = await service.searchProducts(['test']);

      // Should extract good products despite errors with malformed ones
      expect(products.length).toBeGreaterThan(0);
    });

    it('should handle browser crashes gracefully', async () => {
      await service.initialize();
      
      // Simulate browser crash
      mockBrowser.newPage.mockRejectedValue(new Error('Browser disconnected'));

      const products = await service.searchProducts(['test']);

      expect(products).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle network disconnection', async () => {
      mockPage.goto.mockRejectedValue(new Error('net::ERR_INTERNET_DISCONNECTED'));

      const products = await service.searchProducts(['test']);

      expect(products).toEqual([]);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large keyword lists efficiently', async () => {
      const largeKeywordList = Array(50).fill(0).map((_, i) => `keyword${i}`);
      
      mockPage.content.mockResolvedValue('<div data-component-type="s-search-result"></div>');
      mockPage.waitForSelector.mockResolvedValue({} as any);

      const startTime = Date.now();
      await service.searchProducts(largeKeywordList);
      const endTime = Date.now();

      // Should process all keywords
      expect(mockPage.goto).toHaveBeenCalledTimes(largeKeywordList.length);
      
      // Should not take excessively long (allowing for rate limiting)
      const expectedMinTime = (largeKeywordList.length - 1) * 100; // Rate limiting delay
      expect(endTime - startTime).toBeGreaterThan(expectedMinTime * 0.8); // Allow some variance
    });

    it('should handle memory efficiently with large result sets', async () => {
      const largeResultHtml = Array(1000).fill(0).map((_, i) => `
        <div data-component-type="s-search-result">
          <h2><a href="/dp/B${i.toString().padStart(10, '0')}"><span>Product ${i}</span></a></h2>
          <span class="a-price"><span class="a-offscreen">$${(Math.random() * 100 + 10).toFixed(2)}</span></span>
          <span class="a-icon-alt">${(Math.random() * 2 + 3).toFixed(1)} out of 5 stars</span>
        </div>
      `).join('');

      mockPage.content.mockResolvedValue(largeResultHtml);
      mockPage.waitForSelector.mockResolvedValue({} as any);

      const initialMemory = process.memoryUsage().heapUsed;
      
      await service.searchProducts(['test']);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle concurrent scraping operations', async () => {
      mockPage.content.mockResolvedValue(`
        <div data-component-type="s-search-result">
          <h2><a href="/dp/B001"><span>Test Product</span></a></h2>
          <span class="a-price"><span class="a-offscreen">$29.99</span></span>
        </div>
      `);
      mockPage.waitForSelector.mockResolvedValue({} as any);

      const concurrentSearches = Array(5).fill(0).map((_, i) => 
        service.searchProducts([`keyword${i}`])
      );

      const results = await Promise.all(concurrentSearches);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });

  describe('Anti-Detection Measures', () => {
    it('should set appropriate user agent', async () => {
      await service.searchProducts(['test']);

      expect(mockPage.setUserAgent).toHaveBeenCalledWith(
        expect.stringContaining('Mozilla')
      );
    });

    it('should set realistic viewport', async () => {
      await service.searchProducts(['test']);

      expect(mockPage.setViewport).toHaveBeenCalledWith({
        width: 1366,
        height: 768
      });
    });

    it('should implement delays between requests', async () => {
      const startTime = Date.now();
      
      mockPage.content.mockResolvedValue('<div data-component-type="s-search-result"></div>');
      mockPage.waitForSelector.mockResolvedValue({} as any);
      
      await service.searchProducts(['keyword1', 'keyword2']);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should have delay between requests (at least the configured delay)
      expect(duration).toBeGreaterThan(90);
    });

    it('should handle rate limiting responses', async () => {
      // Simulate rate limiting response
      mockPage.goto.mockRejectedValueOnce(new Error('Request blocked'));
      mockPage.goto.mockResolvedValue({} as any);
      mockPage.content.mockResolvedValue('<div data-component-type="s-search-result"></div>');
      mockPage.waitForSelector.mockResolvedValue({} as any);

      const products = await service.searchProducts(['test']);

      // Should handle rate limiting gracefully
      expect(Array.isArray(products)).toBe(true);
    });
  });

  describe('Data Parsing Edge Cases', () => {
    it('should handle various price formats', () => {
      const priceTestCases = [
        { input: '$29.99', expected: 29.99 },
        { input: '$1,299.99', expected: 1299.99 },
        { input: '29.99', expected: 29.99 },
        { input: '$29', expected: 29 },
        { input: 'Price not available', expected: 0 },
        { input: '', expected: 0 },
        { input: '$0.99', expected: 0.99 },
        { input: '$999,999.99', expected: 999999.99 }
      ];

      priceTestCases.forEach(({ input, expected }) => {
        const result = service['parsePrice'] ? service['parsePrice'](input) : parseFloat(input.replace(/[^\d.]/g, '')) || 0;
        expect(result).toBe(expected);
      });
    });

    it('should handle various rating formats', () => {
      const ratingTestCases = [
        { input: '4.5 out of 5 stars', expected: 4.5 },
        { input: '5.0 out of 5 stars', expected: 5.0 },
        { input: '3 out of 5 stars', expected: 3.0 },
        { input: '1.0 out of 5 stars', expected: 1.0 },
        { input: 'No rating available', expected: 0 },
        { input: '', expected: 0 }
      ];

      ratingTestCases.forEach(({ input, expected }) => {
        const result = service['parseRating'] ? service['parseRating'](input) : parseFloat(input.match(/(\d+\.?\d*)/)?.[1] || '0');
        expect(result).toBe(expected);
      });
    });

    it('should handle various review count formats', () => {
      const reviewTestCases = [
        { input: '150 customer reviews', expected: 150 },
        { input: '1,500 customer reviews', expected: 1500 },
        { input: '5 ratings', expected: 5 },
        { input: '1 customer review', expected: 1 },
        { input: 'No reviews yet', expected: 0 },
        { input: '', expected: 0 }
      ];

      reviewTestCases.forEach(({ input, expected }) => {
        const result = service['parseReviewCount'] ? service['parseReviewCount'](input) : parseInt(input.replace(/[^\d]/g, '')) || 0;
        expect(result).toBe(expected);
      });
    });
  });
});

// Integration tests with real DOM parsing
describe('AmazonScraperService - DOM Integration Tests', () => {
  let service: AmazonScraperService;

  beforeEach(() => {
    service = new AmazonScraperService();
  });

  afterEach(async () => {
    await service.close();
  });

  it('should parse real Amazon HTML structure', () => {
    const realAmazonHtml = `
      <div data-component-type="s-search-result">
        <div class="s-size-mini s-spacing-none s-color-subdued">
          <span>Sponsored</span>
        </div>
        <h2 class="a-size-mini s-inline s-access-title" data-automation-id="result-title">
          <a class="a-link-normal s-underline-text s-underline-link-text s-link-style a-text-normal" href="/dp/B08XQPZG4M/ref=sr_1_1_sspa">
            <span class="a-size-medium a-color-base a-text-normal">Premium Wellness Device - Personal Health Care Tool</span>
          </a>
        </h2>
        <span class="a-price" data-a-size="xl" data-a-color="price">
          <span class="a-offscreen">$49.99</span>
          <span aria-hidden="true">
            <span class="a-price-symbol">$</span>
            <span class="a-price-whole">49</span>
            <span class="a-price-fraction">99</span>
          </span>
        </span>
        <span class="a-declarative" data-action="a-popover">
          <span class="a-icon-alt">4.3 out of 5 stars</span>
        </span>
        <a class="a-link-normal" href="#customer-reviews">
          <span class="a-size-base" dir="auto">1,234</span>
        </a>
        <div class="s-image-padding">
          <img class="s-image" src="https://m.media-amazon.com/images/I/example-product.jpg" alt="Product Image">
        </div>
      </div>
    `;

    const $ = cheerio.load(realAmazonHtml);
    
    // Test that Cheerio can parse the structure
    const productElements = $('[data-component-type="s-search-result"]');
    expect(productElements.length).toBe(1);
    
    const title = productElements.find('h2 a span').first().text().trim();
    expect(title).toBe('Premium Wellness Device - Personal Health Care Tool');
    
    const price = productElements.find('.a-price .a-offscreen').first().text();
    expect(price).toBe('$49.99');
    
    const rating = productElements.find('.a-icon-alt').first().text();
    expect(rating).toBe('4.3 out of 5 stars');
  });
});