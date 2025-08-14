import { AmazonScraperService } from '../../src/scraping/amazon-scraper';
import { createMockProductData } from '../setup';

// Mock puppeteer
jest.mock('puppeteer', () => ({
  launch: jest.fn(() => ({
    newPage: jest.fn(() => ({
      setUserAgent: jest.fn(),
      setViewport: jest.fn(),
      goto: jest.fn(),
      waitForSelector: jest.fn(),
      content: jest.fn(),
      close: jest.fn()
    })),
    close: jest.fn()
  }))
}));

// Mock cheerio
jest.mock('cheerio', () => ({
  load: jest.fn(() => ({
    '[data-component-type="s-search-result"]': {
      each: jest.fn()
    }
  }))
}));

import puppeteer from 'puppeteer';
import cheerio from 'cheerio';

describe('AmazonScraperService', () => {
  let service: AmazonScraperService;
  let mockBrowser: any;
  let mockPage: any;

  beforeEach(() => {
    service = new AmazonScraperService({
      headless: true,
      maxProducts: 10,
      delayBetweenRequests: 100 // Faster for tests
    });

    mockPage = {
      setUserAgent: jest.fn(),
      setViewport: jest.fn(),
      goto: jest.fn(),
      waitForSelector: jest.fn(),
      content: jest.fn(),
      close: jest.fn()
    };

    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn()
    };

    (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize browser with correct options', async () => {
      await service.initialize();

      expect(puppeteer.launch).toHaveBeenCalledWith({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-dev-shm-usage'
        ]
      });
    });

    it('should handle initialization errors', async () => {
      (puppeteer.launch as jest.Mock).mockRejectedValue(new Error('Launch failed'));

      await expect(service.initialize()).rejects.toThrow('Launch failed');
    });
  });

  describe('close', () => {
    it('should close browser if it exists', async () => {
      await service.initialize();
      await service.close();

      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle close when browser is null', async () => {
      await expect(service.close()).resolves.not.toThrow();
    });
  });

  describe('searchProducts', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should search products for given keywords', async () => {
      const mockHtml = `
        <div data-component-type="s-search-result">
          <h2><a href="/dp/TEST123"><span>Test Product</span></a></h2>
          <img src="https://example.com/image.jpg" />
          <span class="a-price"><span class="a-offscreen">$29.99</span></span>
          <span class="a-icon-alt">4.5 out of 5 stars</span>
          <a><span aria-label="150 reviews">150</span></a>
        </div>
      `;

      mockPage.content.mockResolvedValue(mockHtml);

      const mockCheerio = {
        '[data-component-type="s-search-result"]': {
          each: jest.fn((callback) => {
            const mockElement = {
              find: jest.fn().mockReturnThis(),
              first: jest.fn().mockReturnThis(),
              text: jest.fn().mockReturnValue('Test Product'),
              attr: jest.fn((attr) => {
                if (attr === 'href') return '/dp/TEST123';
                if (attr === 'src') return 'https://example.com/image.jpg';
                if (attr === 'aria-label') return '150 reviews';
                return '';
              })
            };
            callback(0, mockElement);
          })
        }
      };

      (cheerio.load as jest.Mock).mockReturnValue(mockCheerio);

      const keywords = ['test product'];
      const result = await service.searchProducts(keywords);

      expect(mockBrowser.newPage).toHaveBeenCalled();
      expect(mockPage.goto).toHaveBeenCalledWith(
        expect.stringContaining('amazon.com/s?k=test%20product'),
        { waitUntil: 'networkidle2' }
      );
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle search errors gracefully', async () => {
      mockPage.goto.mockRejectedValue(new Error('Navigation failed'));

      const result = await service.searchProducts(['test']);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should deduplicate products', async () => {
      const mockProducts = [
        createMockProductData(),
        { ...createMockProductData(), title: 'Different Product' },
        createMockProductData() // Duplicate
      ];

      // Mock the private method behavior
      jest.spyOn(service as any, 'searchByKeyword')
        .mockResolvedValue(mockProducts);

      const result = await service.searchProducts(['test']);
      
      // Should deduplicate based on ID
      expect(result.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getBestsellers', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should fetch bestsellers from categories', async () => {
      const mockHtml = `
        <div class="zg-grid-general-faceout">
          <div class="p13n-sc-truncate-desktop-type2">Bestseller Product</div>
          <a href="/dp/BEST123"></a>
          <img src="https://example.com/bestseller.jpg" />
          <div class="zg-bdg-text">#1</div>
        </div>
      `;

      mockPage.content.mockResolvedValue(mockHtml);

      const mockCheerio = {
        '.zg-grid-general-faceout': {
          each: jest.fn((callback) => {
            const mockElement = {
              find: jest.fn().mockReturnThis(),
              first: jest.fn().mockReturnThis(),
              text: jest.fn().mockReturnValue('Bestseller Product'),
              attr: jest.fn(() => '/dp/BEST123')
            };
            callback(0, mockElement);
          })
        }
      };

      (cheerio.load as jest.Mock).mockReturnValue(mockCheerio);

      const result = await service.getBestsellers(['Health & Personal Care']);

      expect(mockPage.goto).toHaveBeenCalledWith(
        expect.stringContaining('gp/bestsellers'),
        { waitUntil: 'networkidle2' }
      );
      expect(result).toBeDefined();
    });
  });

  describe('product validation', () => {
    it('should validate product data structure', () => {
      const validProduct = createMockProductData();
      const result = (service as any).validateProduct(validProduct);
      expect(result).toBe(true);
    });

    it('should reject invalid product data', () => {
      const invalidProduct = {
        ...createMockProductData(),
        price: 'invalid' // Should be number
      };
      const result = (service as any).validateProduct(invalidProduct);
      expect(result).toBe(false);
    });
  });

  describe('trend score calculation', () => {
    it('should calculate trend score correctly', () => {
      const score = (service as any).calculateTrendScore(4.5, 200, 50);
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should calculate bestseller trend score', () => {
      const score1 = (service as any).calculateBestsellerTrendScore(1);
      const score10 = (service as any).calculateBestsellerTrendScore(10);
      
      expect(score1).toBeGreaterThan(score10); // Rank 1 should have higher score than rank 10
    });
  });

  describe('keyword extraction', () => {
    it('should extract keywords from product title', () => {
      const title = 'Premium Wellness Health Care Product for Adults';
      const keywords = (service as any).extractKeywordsFromTitle(title);
      
      expect(keywords).toContain('premium');
      expect(keywords).toContain('wellness');
      expect(keywords).toContain('health');
      expect(keywords).toContain('care');
      expect(keywords).toContain('product');
      expect(keywords).toContain('adults');
      expect(keywords.length).toBeLessThanOrEqual(5);
    });
  });

  describe('rate limiting', () => {
    it('should implement delay between requests', async () => {
      const service = new AmazonScraperService({
        delayBetweenRequests: 500
      });
      await service.initialize();

      const startTime = Date.now();
      
      // Mock empty responses to test timing
      mockPage.content.mockResolvedValue('<div></div>');
      (cheerio.load as jest.Mock).mockReturnValue({
        '[data-component-type="s-search-result"]': { each: jest.fn() }
      });

      await service.searchProducts(['keyword1', 'keyword2']);
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeGreaterThanOrEqual(500); // At least one delay
    });
  });

  afterEach(async () => {
    await service.close();
  });
});