import { GoogleTrendsService } from '../../src/trends/google-trends';
import { AmazonScraperService } from '../../src/scraping/amazon-scraper';
import { SocialMediaTrendsService } from '../../src/scraping/social-media';
import { CMSIntegrationService } from '../../src/pipeline/cms-integration';
import { NotificationService } from '../../src/utils/notifications';
import { TrendSchedulerService } from '../../src/scheduler/trend-scheduler';
import { performanceLogger } from '../../src/utils/logger';

// Mock external dependencies for performance testing
jest.mock('google-trends-api');
jest.mock('puppeteer');
jest.mock('instagram-private-api');
jest.mock('tiktok-scraper');
jest.mock('axios');
jest.mock('sharp');
jest.mock('fs/promises');
jest.mock('node-cron');

import googleTrends from 'google-trends-api';
import puppeteer from 'puppeteer';
import axios from 'axios';

describe('Automation Performance Tests', () => {
  let mockProcessEnv: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockProcessEnv = process.env;
    process.env = {
      ...mockProcessEnv,
      MIN_TREND_SCORE: '70',
      SCRAPING_DELAY_MS: '10', // Minimal delay for performance tests
      CMS_API_URL: 'https://test-cms.example.com/api',
      CMS_API_KEY: 'test-key',
      WEBHOOK_URL: 'https://hooks.slack.com/test'
    };
  });

  afterEach(() => {
    process.env = mockProcessEnv;
  });

  describe('Google Trends Performance', () => {
    let service: GoogleTrendsService;

    beforeEach(() => {
      service = new GoogleTrendsService();
    });

    it('should handle large trend datasets efficiently', async () => {
      // Mock large response with 1000 data points
      const largeTrendData = {
        default: {
          timelineData: Array(1000).fill(0).map((_, i) => ({
            time: `${1640995200 + i * 3600}`, // Hourly data points
            value: [Math.floor(Math.random() * 100)]
          }))
        }
      };

      (googleTrends.interestOverTime as jest.Mock).mockResolvedValue(
        JSON.stringify(largeTrendData)
      );
      (googleTrends.relatedQueries as jest.Mock).mockResolvedValue(
        JSON.stringify({ default: { rankedList: [] } })
      );

      const startTime = process.hrtime.bigint();
      const initialMemory = process.memoryUsage().heapUsed;

      const result = await service.getTrendingKeywords();

      const endTime = process.hrtime.bigint();
      const finalMemory = process.memoryUsage().heapUsed;

      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      const memoryUsed = finalMemory - initialMemory;

      // Performance assertions
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(memoryUsed).toBeLessThan(50 * 1024 * 1024); // Less than 50MB memory increase
      expect(result).toBeDefined();
    });

    it('should handle concurrent trend requests efficiently', async () => {
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

      const concurrentRequests = 10;
      const startTime = Date.now();

      const promises = Array(concurrentRequests).fill(0).map(() => 
        service.getTrendingKeywords()
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();

      const totalDuration = endTime - startTime;
      const averageDuration = totalDuration / concurrentRequests;

      expect(results).toHaveLength(concurrentRequests);
      expect(averageDuration).toBeLessThan(2000); // Average less than 2 seconds per request
      expect(totalDuration).toBeLessThan(15000); // Total less than 15 seconds
    });

    it('should handle geographic trend analysis performance', async () => {
      // Mock large geographic dataset
      const largeGeoData = {
        default: {
          geoMapData: Array(200).fill(0).map((_, i) => ({
            geoCode: `R${i.toString().padStart(3, '0')}`,
            geoName: `Region ${i}`,
            value: [Math.floor(Math.random() * 100)]
          }))
        }
      };

      (googleTrends.interestByRegion as jest.Mock).mockResolvedValue(
        JSON.stringify(largeGeoData)
      );

      const startTime = Date.now();
      const result = await service.getGeographicTrends('wellness');
      const endTime = Date.now();

      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].score).toBeGreaterThanOrEqual(result[result.length - 1].score); // Verify sorting
    });

    it('should optimize memory usage during comprehensive analysis', async () => {
      (googleTrends.interestOverTime as jest.Mock).mockResolvedValue(
        JSON.stringify({
          default: {
            timelineData: Array(500).fill(0).map((_, i) => ({
              time: `${1640995200 + i}`,
              value: [Math.floor(Math.random() * 100)]
            }))
          }
        })
      );
      (googleTrends.relatedQueries as jest.Mock).mockResolvedValue(
        JSON.stringify({
          default: {
            rankedList: [{
              rankedKeyword: Array(50).fill(0).map((_, i) => ({ query: `query ${i}` }))
            }]
          }
        })
      );
      (googleTrends.interestByRegion as jest.Mock).mockResolvedValue(
        JSON.stringify({
          default: {
            geoMapData: Array(100).fill(0).map((_, i) => ({
              geoCode: `R${i}`,
              geoName: `Region ${i}`,
              value: [Math.floor(Math.random() * 100)]
            }))
          }
        })
      );

      const initialMemory = process.memoryUsage();
      
      const result = await service.getComprehensiveTrendAnalysis();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      expect(result).toBeDefined();
      expect(result.keywords.length).toBeGreaterThan(0);
      expect(memoryIncrease).toBeLessThan(30 * 1024 * 1024); // Less than 30MB increase
    });
  });

  describe('Amazon Scraper Performance', () => {
    let service: AmazonScraperService;

    beforeEach(() => {
      service = new AmazonScraperService({
        delayBetweenRequests: 10, // Minimal delay for performance tests
        maxProducts: 50
      });
    });

    afterEach(async () => {
      await service.close();
    });

    it('should handle large product search results efficiently', async () => {
      // Mock large HTML response with many products
      const largeProductHtml = Array(100).fill(0).map((_, i) => `
        <div data-component-type="s-search-result">
          <h2><a href="/dp/B${i.toString().padStart(10, '0')}">
            <span>Product ${i} with Sufficient Length for Testing Performance</span>
          </a></h2>
          <span class="a-price"><span class="a-offscreen">$${(Math.random() * 100 + 10).toFixed(2)}</span></span>
          <span class="a-icon-alt">${(Math.random() * 2 + 3).toFixed(1)} out of 5 stars</span>
          <a><span aria-label="${Math.floor(Math.random() * 500) + 10} customer reviews">${Math.floor(Math.random() * 500) + 10}</span></a>
          <img src="https://example.com/image${i}.jpg" />
        </div>
      `).join('');

      const mockPage = {
        goto: jest.fn(),
        waitForSelector: jest.fn(),
        content: jest.fn().mockResolvedValue(largeProductHtml),
        close: jest.fn(),
        setUserAgent: jest.fn(),
        setViewport: jest.fn()
      };

      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn()
      };

      (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

      const startTime = Date.now();
      const initialMemory = process.memoryUsage().heapUsed;

      const result = await service.searchProducts(['wellness']);

      const endTime = Date.now();
      const finalMemory = process.memoryUsage().heapUsed;

      const duration = endTime - startTime;
      const memoryUsed = finalMemory - initialMemory;

      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      expect(memoryUsed).toBeLessThan(25 * 1024 * 1024); // Less than 25MB memory increase
      expect(result.length).toBeLessThanOrEqual(50); // Respects maxProducts limit
    });

    it('should handle multiple concurrent scraping operations', async () => {
      const mockPage = {
        goto: jest.fn(),
        waitForSelector: jest.fn(),
        content: jest.fn().mockResolvedValue(`
          <div data-component-type="s-search-result">
            <h2><a href="/dp/B001"><span>Test Product with Sufficient Length</span></a></h2>
            <span class="a-price"><span class="a-offscreen">$29.99</span></span>
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

      const keywords = ['wellness', 'health', 'personal care', 'massage', 'intimate'];
      const startTime = Date.now();

      const results = await service.searchProducts(keywords);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results).toBeDefined();
      expect(duration).toBeLessThan(keywords.length * 2000); // No more than 2 seconds per keyword
    });

    it('should optimize browser resource usage', async () => {
      const mockPage = {
        goto: jest.fn(),
        waitForSelector: jest.fn(),
        content: jest.fn().mockResolvedValue('<div data-component-type="s-search-result"></div>'),
        close: jest.fn(),
        setUserAgent: jest.fn(),
        setViewport: jest.fn()
      };

      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn()
      };

      (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

      // Perform multiple operations
      await service.searchProducts(['test1']);
      await service.searchProducts(['test2']);
      await service.getBestsellers(['Health']);

      // Verify browser reuse
      expect(puppeteer.launch).toHaveBeenCalledTimes(1); // Should reuse browser
      expect(mockBrowser.newPage).toHaveBeenCalledTimes(3); // One page per operation
      expect(mockPage.close).toHaveBeenCalledTimes(3); // Each page should be closed
    });
  });

  describe('CMS Integration Performance', () => {
    let service: CMSIntegrationService;

    beforeEach(() => {
      service = new CMSIntegrationService();
    });

    it('should handle batch product creation efficiently', async () => {
      // Mock large product dataset
      const largeProductSet = Array(25).fill(0).map((_, i) => ({
        id: `B${i.toString().padStart(10, '0')}`,
        title: `High Quality Product ${i} with Sufficient Length for Testing`,
        description: `Description for product ${i}`,
        imageUrl: `https://example.com/image${i}.jpg`,
        sourceUrl: `https://amazon.com/dp/B${i}`,
        platform: 'amazon' as const,
        price: 25 + Math.random() * 75,
        rating: 3.5 + Math.random() * 1.5,
        reviewCount: Math.floor(Math.random() * 500) + 50,
        trendScore: 70 + Math.random() * 30,
        keywords: ['wellness', 'health'],
        scrapedAt: new Date()
      }));

      const mockTrendResult = {
        googleTrends: {
          timestamp: new Date(),
          keywords: [{ keyword: 'wellness', score: 85, geo: 'US', timestamp: new Date(), relatedQueries: [], category: 'adult-products' }],
          geographicTrends: [],
          summary: { totalKeywords: 1, averageScore: 85, topRegions: [] }
        },
        socialMediaTrends: [],
        productOpportunities: largeProductSet,
        recommendations: [],
        generatedAt: new Date()
      };

      // Mock fast image processing
      (axios.get as jest.Mock).mockResolvedValue({
        data: Buffer.from('mock-image-data')
      });

      // Mock fast CMS API
      let requestCount = 0;
      (axios.post as jest.Mock).mockImplementation(() => {
        requestCount++;
        return Promise.resolve({
          data: { id: `cms-product-${requestCount}` }
        });
      });

      const startTime = Date.now();
      const initialMemory = process.memoryUsage().heapUsed;

      const responses = await service.processTrendAnalysisResults(mockTrendResult);

      const endTime = Date.now();
      const finalMemory = process.memoryUsage().heapUsed;

      const duration = endTime - startTime;
      const memoryUsed = finalMemory - initialMemory;

      expect(responses.length).toBeLessThanOrEqual(20); // Should filter to top 20
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      expect(memoryUsed).toBeLessThan(20 * 1024 * 1024); // Less than 20MB memory increase
    });

    it('should optimize image processing performance', async () => {
      const productWithImages = {
        id: 'B001',
        title: 'Test Product with Images',
        imageUrl: 'https://example.com/large-image.jpg'
      } as any;

      // Mock large image data
      const largeImageBuffer = Buffer.alloc(5 * 1024 * 1024); // 5MB image
      (axios.get as jest.Mock).mockResolvedValue({
        data: largeImageBuffer
      });

      const sharp = require('sharp');
      const mockSharpInstance = {
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.alloc(1024 * 1024)) // 1MB processed
      };
      sharp.mockImplementation(() => mockSharpInstance);

      const fs = require('fs/promises');
      fs.mkdir = jest.fn();
      fs.writeFile = jest.fn();

      const startTime = Date.now();
      
      const processedImages = await service['processProductImages'](productWithImages);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5000); // Should process within 5 seconds
      expect(processedImages.length).toBe(3); // thumb, medium, large
      expect(mockSharpInstance.resize).toHaveBeenCalledTimes(3); // One for each size
    });
  });

  describe('Notification Service Performance', () => {
    let service: NotificationService;

    beforeEach(() => {
      service = new NotificationService();
    });

    it('should handle high-frequency notifications efficiently', async () => {
      (axios.post as jest.Mock).mockResolvedValue({ status: 200 });

      const notifications = Array(50).fill(0).map((_, i) => ({
        type: 'google_trends' as const,
        keywordCount: i + 1,
        topKeywords: [`keyword${i}`],
        averageScore: 70 + Math.random() * 30
      }));

      const startTime = Date.now();

      // Send notifications sequentially to test rate limiting
      for (const notification of notifications) {
        await service.sendTrendNotification(notification);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(axios.post).toHaveBeenCalledTimes(50);
      expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
    });

    it('should handle concurrent notification sending', async () => {
      (axios.post as jest.Mock).mockResolvedValue({ status: 200 });

      const notifications = [
        service.sendTrendNotification({
          type: 'google_trends',
          keywordCount: 5,
          topKeywords: ['test'],
          averageScore: 80
        }),
        service.sendScrapingNotification({
          productCount: 10,
          topProducts: [{ title: 'Test Product', price: 29.99, trendScore: 75 }],
          platform: 'amazon'
        }),
        service.sendSocialMediaNotification({
          trendCount: 3,
          topHashtags: [{ hashtag: '#test', platform: 'instagram', trendScore: 70 }]
        })
      ];

      const startTime = Date.now();
      await Promise.all(notifications);
      const endTime = Date.now();

      const duration = endTime - startTime;

      expect(duration).toBeLessThan(3000); // Should complete concurrently within 3 seconds
      expect(axios.post).toHaveBeenCalledTimes(3);
    });
  });

  describe('Full Pipeline Performance', () => {
    it('should complete full pipeline within performance thresholds', async () => {
      const scheduler = new TrendSchedulerService({ enabled: false });

      // Mock all services for optimal performance
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
            <h2><a href="/dp/B001"><span>Fast Loading Product with Sufficient Length</span></a></h2>
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

      (axios.get as jest.Mock).mockResolvedValue({
        data: Buffer.from('fast-image')
      });
      (axios.post as jest.Mock).mockResolvedValue({
        data: { id: 'fast-cms-response' }
      });

      const startTime = Date.now();
      const initialMemory = process.memoryUsage();

      const result = await scheduler.runFullPipeline();

      const endTime = Date.now();
      const finalMemory = process.memoryUsage();

      const duration = endTime - startTime;
      const memoryUsed = finalMemory.heapUsed - initialMemory.heapUsed;

      // Performance thresholds
      expect(duration).toBeLessThan(60000); // Complete within 1 minute
      expect(memoryUsed).toBeLessThan(100 * 1024 * 1024); // Less than 100MB memory increase
      expect(result).toBeDefined();
      expect(result.generatedAt).toBeInstanceOf(Date);

      scheduler.stop();
    });

    it('should handle stress testing with multiple concurrent pipelines', async () => {
      const concurrentPipelines = 3;
      const schedulers = Array(concurrentPipelines).fill(0).map(() => 
        new TrendSchedulerService({ enabled: false })
      );

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
      const initialMemory = process.memoryUsage().heapUsed;

      const promises = schedulers.map(scheduler => scheduler.runFullPipeline());
      const results = await Promise.all(promises);

      const endTime = Date.now();
      const finalMemory = process.memoryUsage().heapUsed;

      const duration = endTime - startTime;
      const memoryUsed = finalMemory - initialMemory;

      expect(results).toHaveLength(concurrentPipelines);
      expect(duration).toBeLessThan(120000); // Complete within 2 minutes
      expect(memoryUsed).toBeLessThan(200 * 1024 * 1024); // Less than 200MB total increase

      // Cleanup
      schedulers.forEach(scheduler => scheduler.stop());
    });
  });

  describe('Memory Leak Detection', () => {
    it('should not leak memory during repeated operations', async () => {
      const service = new GoogleTrendsService();

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

      const memorySnapshots: number[] = [];

      // Perform multiple operations and measure memory
      for (let i = 0; i < 10; i++) {
        await service.getTrendingKeywords();
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        memorySnapshots.push(process.memoryUsage().heapUsed);
        
        // Small delay to allow cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Check for memory growth trend
      const initialMemory = memorySnapshots[0];
      const finalMemory = memorySnapshots[memorySnapshots.length - 1];
      const memoryGrowth = finalMemory - initialMemory;

      // Should not grow significantly (allow for 10MB variance)
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
    });

    it('should clean up browser resources properly', async () => {
      const service = new AmazonScraperService();

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

      // Perform multiple scraping operations
      for (let i = 0; i < 5; i++) {
        await service.searchProducts([`keyword${i}`]);
      }

      await service.close();

      // Verify all pages were closed
      expect(mockPage.close).toHaveBeenCalledTimes(5);
      
      // Verify browser was closed
      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });
});