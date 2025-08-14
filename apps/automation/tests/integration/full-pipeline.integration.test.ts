import { TrendSchedulerService } from '../../src/scheduler/trend-scheduler';
import { GoogleTrendsService } from '../../src/trends/google-trends';
import { AmazonScraperService } from '../../src/scraping/amazon-scraper';
import { SocialMediaTrendsService } from '../../src/scraping/social-media';
import { CMSIntegrationService } from '../../src/pipeline/cms-integration';
import { NotificationService } from '../../src/utils/notifications';
import { logger, performanceLogger } from '../../src/utils/logger';

// Mock external dependencies but allow internal integration
jest.mock('google-trends-api');
jest.mock('puppeteer');
jest.mock('instagram-private-api');
jest.mock('tiktok-scraper');
jest.mock('axios');
jest.mock('sharp');
jest.mock('fs/promises');
jest.mock('node-cron');

// Partial mock for logger to allow real performance logging
jest.mock('../../src/utils/logger', () => {
  const originalModule = jest.requireActual('../../src/utils/logger');
  return {
    ...originalModule,
    logger: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    }
  };
});

import googleTrends from 'google-trends-api';
import puppeteer from 'puppeteer';
import axios from 'axios';

describe('Full Automation Pipeline - Integration Tests', () => {
  let scheduler: TrendSchedulerService;
  let googleTrendsService: GoogleTrendsService;
  let amazonScraper: AmazonScraperService;
  let socialMediaService: SocialMediaTrendsService;
  let cmsService: CMSIntegrationService;
  let notificationService: NotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up test environment
    process.env.MIN_TREND_SCORE = '70';
    process.env.MAX_PRODUCTS_PER_TREND = '10';
    process.env.SCRAPING_DELAY_MS = '10'; // Fast for tests
    process.env.CMS_API_URL = 'https://test-cms.example.com/api';
    process.env.CMS_API_KEY = 'test-key';
    process.env.WEBHOOK_URL = 'https://hooks.slack.com/test';
    process.env.INSTAGRAM_USERNAME = 'test_user';
    process.env.INSTAGRAM_PASSWORD = 'test_pass';

    // Initialize services
    googleTrendsService = new GoogleTrendsService();
    amazonScraper = new AmazonScraperService({ delayBetweenRequests: 10 });
    socialMediaService = new SocialMediaTrendsService();
    cmsService = new CMSIntegrationService();
    notificationService = new NotificationService();
    scheduler = new TrendSchedulerService({ enabled: false }); // Manual control for tests
  });

  afterEach(() => {
    scheduler.stop();
  });

  describe('End-to-End Pipeline Execution', () => {
    it('should execute complete pipeline successfully', async () => {
      // Mock Google Trends API
      (googleTrends.interestOverTime as jest.Mock).mockResolvedValue(
        JSON.stringify({
          default: {
            timelineData: [
              { time: '1640995200', value: [85] },
              { time: '1640995300', value: [90] }
            ]
          }
        })
      );

      (googleTrends.relatedQueries as jest.Mock).mockResolvedValue(
        JSON.stringify({
          default: {
            rankedList: [{
              rankedKeyword: [
                { query: 'wellness product' },
                { query: 'health device' }
              ]
            }]
          }
        })
      );

      (googleTrends.interestByRegion as jest.Mock).mockResolvedValue(
        JSON.stringify({
          default: {
            geoMapData: [
              { geoCode: 'US', geoName: 'United States', value: [85] },
              { geoCode: 'CA', geoName: 'Canada', value: [70] }
            ]
          }
        })
      );

      // Mock Puppeteer for Amazon scraping
      const mockPage = {
        goto: jest.fn(),
        waitForSelector: jest.fn(),
        content: jest.fn().mockResolvedValue(`
          <div data-component-type="s-search-result">
            <h2><a href="/dp/B001234567"><span>Premium Wellness Device for Personal Health Care and Daily Wellness</span></a></h2>
            <span class="a-price"><span class="a-offscreen">$79.99</span></span>
            <span class="a-icon-alt">4.5 out of 5 stars</span>
            <a><span aria-label="234 customer reviews">234</span></a>
            <img src="https://m.media-amazon.com/images/example.jpg" />
          </div>
        `),
        close: jest.fn(),
        setUserAgent: jest.fn(),
        setViewport: jest.fn()
      };

      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn()
      };

      (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

      // Mock Social Media APIs
      const mockIgClient = {
        state: { generateDevice: jest.fn() },
        account: { login: jest.fn().mockResolvedValue({}) },
        feed: {
          tags: jest.fn(() => ({
            items: jest.fn().mockResolvedValue([
              {
                like_count: 150,
                comment_count: 25,
                caption: { text: 'Love this wellness product for my health routine!' }
              }
            ])
          }))
        }
      };

      // Mock TikTok scraper
      const TikTokScraper = require('tiktok-scraper');
      TikTokScraper.hashtag = jest.fn().mockResolvedValue({
        collector: [
          {
            text: 'Review of this amazing wellness device!',
            playCount: 50000,
            diggCount: 2500,
            shareCount: 300
          }
        ]
      });

      // Mock CMS API
      (axios.post as jest.Mock).mockResolvedValue({
        data: { id: 'cms-product-123' }
      });

      (axios.get as jest.Mock).mockResolvedValue({
        data: Buffer.from('mock-image-data')
      });

      // Execute the full pipeline
      const result = await scheduler.runFullPipeline();

      // Verify the result structure
      expect(result).toHaveProperty('googleTrends');
      expect(result).toHaveProperty('socialMediaTrends');
      expect(result).toHaveProperty('productOpportunities');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('generatedAt');

      // Verify Google Trends results
      expect(result.googleTrends.keywords.length).toBeGreaterThan(0);
      expect(result.googleTrends.summary.totalKeywords).toBeGreaterThan(0);

      // Verify Social Media results
      expect(Array.isArray(result.socialMediaTrends)).toBe(true);

      // Verify Product results
      expect(Array.isArray(result.productOpportunities)).toBe(true);

      // Verify Recommendations
      expect(Array.isArray(result.recommendations)).toBe(true);

      // Verify logging occurred
      expect(logger.info).toHaveBeenCalledWith('Starting comprehensive trend analysis');
      expect(logger.info).toHaveBeenCalledWith('🔗 Starting CMS integration...');
      expect(logger.info).toHaveBeenCalledWith('Full automation pipeline completed successfully');
    });

    it('should handle partial service failures gracefully', async () => {
      // Mock Google Trends success
      (googleTrends.interestOverTime as jest.Mock).mockResolvedValue(
        JSON.stringify({
          default: {
            timelineData: [{ time: '1640995200', value: [75] }]
          }
        })
      );
      (googleTrends.relatedQueries as jest.Mock).mockResolvedValue(
        JSON.stringify({ default: { rankedList: [] } })
      );
      (googleTrends.interestByRegion as jest.Mock).mockResolvedValue(
        JSON.stringify({ default: { geoMapData: [] } })
      );

      // Mock Amazon scraper failure
      (puppeteer.launch as jest.Mock).mockRejectedValue(new Error('Browser launch failed'));

      // Mock Social Media failure
      const TikTokScraper = require('tiktok-scraper');
      TikTokScraper.hashtag = jest.fn().mockRejectedValue(new Error('TikTok API unavailable'));

      // Mock CMS success
      (axios.post as jest.Mock).mockResolvedValue({
        data: { id: 'cms-product-123' }
      });

      const result = await scheduler.runFullPipeline();

      // Should still complete with partial results
      expect(result.googleTrends.keywords.length).toBeGreaterThan(0);
      expect(result.socialMediaTrends).toEqual([]);
      expect(result.productOpportunities).toEqual([]);
      
      // Should generate recommendations based on available data
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should measure and log performance metrics', async () => {
      // Mock successful responses with realistic delays
      (googleTrends.interestOverTime as jest.Mock).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => 
          resolve(JSON.stringify({
            default: { timelineData: [{ time: '1640995200', value: [80] }] }
          })), 50))
      );

      (googleTrends.relatedQueries as jest.Mock).mockResolvedValue(
        JSON.stringify({ default: { rankedList: [] } })
      );
      (googleTrends.interestByRegion as jest.Mock).mockResolvedValue(
        JSON.stringify({ default: { geoMapData: [] } })
      );

      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue({
          goto: jest.fn(),
          waitForSelector: jest.fn(),
          content: jest.fn().mockResolvedValue('<div></div>'),
          close: jest.fn(),
          setUserAgent: jest.fn(),
          setViewport: jest.fn()
        }),
        close: jest.fn()
      };
      (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

      const TikTokScraper = require('tiktok-scraper');
      TikTokScraper.hashtag = jest.fn().mockResolvedValue({ collector: [] });

      (axios.post as jest.Mock).mockResolvedValue({ data: { id: 'test' } });

      const startTime = Date.now();
      const result = await scheduler.runFullPipeline();
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeGreaterThan(0);

      // Verify performance logging
      expect(performanceLogger.startTimer).toHaveBeenCalledWith('Full Automation Pipeline');
    });
  });

  describe('Service Integration Points', () => {
    it('should properly pass data between Google Trends and Amazon Scraper', async () => {
      // Mock Google Trends to return specific keywords
      (googleTrends.interestOverTime as jest.Mock).mockResolvedValue(
        JSON.stringify({
          default: {
            timelineData: [{ time: '1640995200', value: [85] }]
          }
        })
      );
      (googleTrends.relatedQueries as jest.Mock).mockResolvedValue(
        JSON.stringify({ default: { rankedList: [] } })
      );
      (googleTrends.interestByRegion as jest.Mock).mockResolvedValue(
        JSON.stringify({ default: { geoMapData: [] } })
      );

      // Mock Amazon scraper
      const mockPage = {
        goto: jest.fn(),
        waitForSelector: jest.fn(),
        content: jest.fn().mockResolvedValue('<div></div>'),
        close: jest.fn(),
        setUserAgent: jest.fn(),
        setViewport: jest.fn()
      };
      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn()
      };
      (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

      // Mock other services
      const TikTokScraper = require('tiktok-scraper');
      TikTokScraper.hashtag = jest.fn().mockResolvedValue({ collector: [] });
      (axios.post as jest.Mock).mockResolvedValue({ data: { id: 'test' } });

      await scheduler.runFullPipeline();

      // Verify that Amazon scraper was called with trending keywords
      expect(mockPage.goto).toHaveBeenCalledWith(
        expect.stringContaining('adult toys'), // One of the adult product categories
        expect.any(Object)
      );
    });

    it('should properly format data for CMS integration', async () => {
      // Mock trend data
      (googleTrends.interestOverTime as jest.Mock).mockResolvedValue(
        JSON.stringify({
          default: {
            timelineData: [{ time: '1640995200', value: [90] }]
          }
        })
      );
      (googleTrends.relatedQueries as jest.Mock).mockResolvedValue(
        JSON.stringify({
          default: {
            rankedList: [{
              rankedKeyword: [{ query: 'trending wellness' }]
            }]
          }
        })
      );
      (googleTrends.interestByRegion as jest.Mock).mockResolvedValue(
        JSON.stringify({ default: { geoMapData: [] } })
      );

      // Mock product data
      const mockPage = {
        goto: jest.fn(),
        waitForSelector: jest.fn(),
        content: jest.fn().mockResolvedValue(`
          <div data-component-type="s-search-result">
            <h2><a href="/dp/B001234567"><span>High Quality Wellness Device with Premium Features for Health</span></a></h2>
            <span class="a-price"><span class="a-offscreen">$89.99</span></span>
            <span class="a-icon-alt">4.8 out of 5 stars</span>
            <a><span aria-label="456 customer reviews">456</span></a>
            <img src="https://example.com/image.jpg" />
          </div>
        `),
        close: jest.fn(),
        setUserAgent: jest.fn(),
        setViewport: jest.fn()
      };
      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn()
      };
      (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

      // Mock social media
      const TikTokScraper = require('tiktok-scraper');
      TikTokScraper.hashtag = jest.fn().mockResolvedValue({ collector: [] });

      // Mock CMS and image processing
      (axios.get as jest.Mock).mockResolvedValue({
        data: Buffer.from('image-data')
      });

      let cmsPayload: any;
      (axios.post as jest.Mock).mockImplementation((url, data) => {
        if (url.includes('/products')) {
          cmsPayload = data;
        }
        return Promise.resolve({ data: { id: 'cms-123' } });
      });

      await scheduler.runFullPipeline();

      // Verify CMS payload structure
      expect(cmsPayload).toMatchObject({
        title: expect.stringContaining('High Quality Wellness Device'),
        description: expect.any(String),
        content: expect.stringContaining('Trending Now'),
        price: 89.99,
        images: expect.any(Array),
        tags: expect.arrayContaining(['wellness', 'trending']),
        categories: expect.any(Array),
        sourceUrl: expect.stringContaining('B001234567'),
        trendScore: expect.any(Number),
        metadata: {
          amazonId: 'B001234567',
          rating: 4.8,
          reviewCount: 456,
          scrapedAt: expect.any(String),
          lastUpdated: expect.any(String)
        },
        seo: {
          metaTitle: expect.stringContaining('High Quality Wellness Device'),
          metaDescription: expect.any(String),
          slug: expect.any(String)
        },
        status: 'published'
      });
    });

    it('should send appropriate notifications throughout pipeline', async () => {
      // Mock all services to succeed
      (googleTrends.interestOverTime as jest.Mock).mockResolvedValue(
        JSON.stringify({
          default: {
            timelineData: [{ time: '1640995200', value: [85] }]
          }
        })
      );
      (googleTrends.relatedQueries as jest.Mock).mockResolvedValue(
        JSON.stringify({ default: { rankedList: [] } })
      );
      (googleTrends.interestByRegion as jest.Mock).mockResolvedValue(
        JSON.stringify({ default: { geoMapData: [] } })
      );

      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue({
          goto: jest.fn(),
          waitForSelector: jest.fn(),
          content: jest.fn().mockResolvedValue('<div></div>'),
          close: jest.fn(),
          setUserAgent: jest.fn(),
          setViewport: jest.fn()
        }),
        close: jest.fn()
      };
      (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

      const TikTokScraper = require('tiktok-scraper');
      TikTokScraper.hashtag = jest.fn().mockResolvedValue({ collector: [] });

      (axios.post as jest.Mock).mockResolvedValue({ data: { id: 'test' } });

      await scheduler.runFullPipeline();

      // Verify notification was sent for pipeline completion
      expect(axios.post).toHaveBeenCalledWith(
        'https://hooks.slack.com/test',
        expect.objectContaining({
          text: '✅ Full Automation Pipeline Complete'
        }),
        expect.any(Object)
      );
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle Google Trends API failures', async () => {
      (googleTrends.interestOverTime as jest.Mock).mockRejectedValue(
        new Error('Google Trends API quota exceeded')
      );

      await expect(scheduler.runFullPipeline()).rejects.toThrow('Google Trends API quota exceeded');
      
      expect(logger.error).toHaveBeenCalledWith(
        'Error in full automation pipeline:',
        expect.any(Error)
      );
    });

    it('should handle Amazon scraper browser failures', async () => {
      // Mock Google Trends success
      (googleTrends.interestOverTime as jest.Mock).mockResolvedValue(
        JSON.stringify({
          default: {
            timelineData: [{ time: '1640995200', value: [80] }]
          }
        })
      );
      (googleTrends.relatedQueries as jest.Mock).mockResolvedValue(
        JSON.stringify({ default: { rankedList: [] } })
      );
      (googleTrends.interestByRegion as jest.Mock).mockResolvedValue(
        JSON.stringify({ default: { geoMapData: [] } })
      );

      // Mock browser failure
      (puppeteer.launch as jest.Mock).mockRejectedValue(
        new Error('Failed to launch browser')
      );

      // Mock other services
      const TikTokScraper = require('tiktok-scraper');
      TikTokScraper.hashtag = jest.fn().mockResolvedValue({ collector: [] });
      (axios.post as jest.Mock).mockResolvedValue({ data: { id: 'test' } });

      const result = await scheduler.runFullPipeline();

      // Should complete with no products but other data
      expect(result.googleTrends.keywords.length).toBeGreaterThan(0);
      expect(result.productOpportunities).toEqual([]);
      expect(result.socialMediaTrends).toEqual([]);
    });

    it('should handle CMS API failures', async () => {
      // Mock successful data gathering
      (googleTrends.interestOverTime as jest.Mock).mockResolvedValue(
        JSON.stringify({
          default: {
            timelineData: [{ time: '1640995200', value: [85] }]
          }
        })
      );
      (googleTrends.relatedQueries as jest.Mock).mockResolvedValue(
        JSON.stringify({ default: { rankedList: [] } })
      );
      (googleTrends.interestByRegion as jest.Mock).mockResolvedValue(
        JSON.stringify({ default: { geoMapData: [] } })
      );

      const mockPage = {
        goto: jest.fn(),
        waitForSelector: jest.fn(),
        content: jest.fn().mockResolvedValue(`
          <div data-component-type="s-search-result">
            <h2><a href="/dp/B001"><span>Quality Product with Sufficient Length for Testing CMS Integration</span></a></h2>
            <span class="a-price"><span class="a-offscreen">$49.99</span></span>
            <span class="a-icon-alt">4.0 out of 5 stars</span>
            <img src="https://example.com/image.jpg" />
          </div>
        `),
        close: jest.fn(),
        setUserAgent: jest.fn(),
        setViewport: jest.fn()
      };
      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn()
      };
      (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

      const TikTokScraper = require('tiktok-scraper');
      TikTokScraper.hashtag = jest.fn().mockResolvedValue({ collector: [] });

      // Mock CMS failure
      (axios.get as jest.Mock).mockResolvedValue({
        data: Buffer.from('image')
      });
      (axios.post as jest.Mock).mockImplementation((url) => {
        if (url.includes('/products')) {
          return Promise.reject(new Error('CMS API is down'));
        }
        return Promise.resolve({ data: { success: true } });
      });

      const result = await scheduler.runFullPipeline();

      // Should complete pipeline but with CMS integration failures logged
      expect(result.productOpportunities.length).toBeGreaterThan(0);
      expect(logger.info).toHaveBeenCalledWith('🔗 Starting CMS integration...');
    });

    it('should ensure cleanup occurs even after failures', async () => {
      (googleTrends.interestOverTime as jest.Mock).mockRejectedValue(
        new Error('Complete failure')
      );

      const mockBrowser = {
        newPage: jest.fn(),
        close: jest.fn()
      };
      (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

      try {
        await scheduler.runFullPipeline();
      } catch (error) {
        // Expected to fail
      }

      // Verify cleanup occurred
      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });

  describe('Data Quality and Validation', () => {
    it('should filter out low-quality products in integration', async () => {
      // Mock trend data
      (googleTrends.interestOverTime as jest.Mock).mockResolvedValue(
        JSON.stringify({
          default: {
            timelineData: [{ time: '1640995200', value: [80] }]
          }
        })
      );
      (googleTrends.relatedQueries as jest.Mock).mockResolvedValue(
        JSON.stringify({ default: { rankedList: [] } })
      );
      (googleTrends.interestByRegion as jest.Mock).mockResolvedValue(
        JSON.stringify({ default: { geoMapData: [] } })
      );

      // Mock mixed quality products
      const mockPage = {
        goto: jest.fn(),
        waitForSelector: jest.fn(),
        content: jest.fn().mockResolvedValue(`
          <div data-component-type="s-search-result">
            <h2><a href="/dp/B001"><span>High Quality Product with Sufficient Length</span></a></h2>
            <span class="a-price"><span class="a-offscreen">$79.99</span></span>
            <span class="a-icon-alt">4.5 out of 5 stars</span>
            <a><span aria-label="200 customer reviews">200</span></a>
            <img src="https://example.com/image1.jpg" />
          </div>
          <div data-component-type="s-search-result">
            <h2><a href="/dp/B002"><span>Bad</span></a></h2>
            <span class="a-price"><span class="a-offscreen">$5.99</span></span>
            <span class="a-icon-alt">2.0 out of 5 stars</span>
            <img src="https://example.com/image2.jpg" />
          </div>
        `),
        close: jest.fn(),
        setUserAgent: jest.fn(),
        setViewport: jest.fn()
      };
      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn()
      };
      (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

      const TikTokScraper = require('tiktok-scraper');
      TikTokScraper.hashtag = jest.fn().mockResolvedValue({ collector: [] });

      (axios.get as jest.Mock).mockResolvedValue({
        data: Buffer.from('image')
      });
      (axios.post as jest.Mock).mockResolvedValue({ data: { id: 'test' } });

      const result = await scheduler.runFullPipeline();

      // Should only include high-quality products
      expect(result.productOpportunities.length).toBe(1);
      expect(result.productOpportunities[0].title).toContain('High Quality Product');
    });

    it('should validate and sanitize all data through pipeline', async () => {
      // Mock potentially problematic data
      (googleTrends.interestOverTime as jest.Mock).mockResolvedValue(
        JSON.stringify({
          default: {
            timelineData: [
              { time: '1640995200', value: [85] },
              { time: 'invalid', value: ['not-a-number'] },
              { time: '1640995400', value: [null] }
            ]
          }
        })
      );
      (googleTrends.relatedQueries as jest.Mock).mockResolvedValue(
        JSON.stringify({
          default: {
            rankedList: [{
              rankedKeyword: [
                { query: 'valid wellness product' },
                { query: '<script>alert("xss")</script>' },
                { query: null }
              ]
            }]
          }
        })
      );
      (googleTrends.interestByRegion as jest.Mock).mockResolvedValue(
        JSON.stringify({ default: { geoMapData: [] } })
      );

      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue({
          goto: jest.fn(),
          waitForSelector: jest.fn(),
          content: jest.fn().mockResolvedValue('<div></div>'),
          close: jest.fn(),
          setUserAgent: jest.fn(),
          setViewport: jest.fn()
        }),
        close: jest.fn()
      };
      (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

      const TikTokScraper = require('tiktok-scraper');
      TikTokScraper.hashtag = jest.fn().mockResolvedValue({ collector: [] });

      (axios.post as jest.Mock).mockResolvedValue({ data: { id: 'test' } });

      const result = await scheduler.runFullPipeline();

      // Should handle invalid data gracefully
      expect(result).toBeDefined();
      expect(result.googleTrends.keywords.length).toBeGreaterThan(0);
      
      // Verify no malicious content made it through
      const allText = JSON.stringify(result);
      expect(allText).not.toContain('<script>');
      expect(allText).not.toContain('alert(');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', async () => {
      // Mock large dataset responses
      const largeTrendData = {
        default: {
          timelineData: Array(1000).fill(0).map((_, i) => ({
            time: `${1640995200 + i}`,
            value: [Math.floor(Math.random() * 100)]
          }))
        }
      };

      (googleTrends.interestOverTime as jest.Mock).mockResolvedValue(
        JSON.stringify(largeTrendData)
      );
      (googleTrends.relatedQueries as jest.Mock).mockResolvedValue(
        JSON.stringify({
          default: {
            rankedList: [{
              rankedKeyword: Array(100).fill(0).map((_, i) => ({ query: `query ${i}` }))
            }]
          }
        })
      );
      (googleTrends.interestByRegion as jest.Mock).mockResolvedValue(
        JSON.stringify({ default: { geoMapData: [] } })
      );

      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue({
          goto: jest.fn(),
          waitForSelector: jest.fn(),
          content: jest.fn().mockResolvedValue('<div></div>'),
          close: jest.fn(),
          setUserAgent: jest.fn(),
          setViewport: jest.fn()
        }),
        close: jest.fn()
      };
      (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

      const TikTokScraper = require('tiktok-scraper');
      TikTokScraper.hashtag = jest.fn().mockResolvedValue({ collector: [] });

      (axios.post as jest.Mock).mockResolvedValue({ data: { id: 'test' } });

      const initialMemory = process.memoryUsage().heapUsed;
      
      const result = await scheduler.runFullPipeline();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(result).toBeDefined();
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
    });

    it('should complete pipeline within reasonable time limits', async () => {
      // Mock fast responses
      (googleTrends.interestOverTime as jest.Mock).mockResolvedValue(
        JSON.stringify({
          default: {
            timelineData: [{ time: '1640995200', value: [80] }]
          }
        })
      );
      (googleTrends.relatedQueries as jest.Mock).mockResolvedValue(
        JSON.stringify({ default: { rankedList: [] } })
      );
      (googleTrends.interestByRegion as jest.Mock).mockResolvedValue(
        JSON.stringify({ default: { geoMapData: [] } })
      );

      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue({
          goto: jest.fn(),
          waitForSelector: jest.fn(),
          content: jest.fn().mockResolvedValue('<div></div>'),
          close: jest.fn(),
          setUserAgent: jest.fn(),
          setViewport: jest.fn()
        }),
        close: jest.fn()
      };
      (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

      const TikTokScraper = require('tiktok-scraper');
      TikTokScraper.hashtag = jest.fn().mockResolvedValue({ collector: [] });

      (axios.post as jest.Mock).mockResolvedValue({ data: { id: 'test' } });

      const startTime = Date.now();
      const result = await scheduler.runFullPipeline();
      const endTime = Date.now();

      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
    });
  });
});