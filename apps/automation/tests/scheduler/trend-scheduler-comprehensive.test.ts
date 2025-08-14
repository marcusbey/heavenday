import { TrendSchedulerService, SchedulerConfig } from '../../src/scheduler/trend-scheduler';
import { TrendAnalysisResult } from '../../src/types/trends';
import { logger, performanceLogger } from '../../src/utils/logger';
import { googleTrendsService } from '../../src/trends/google-trends';
import { amazonScraperService } from '../../src/scraping/amazon-scraper';
import { socialMediaTrendsService } from '../../src/scraping/social-media';
import { cmsIntegrationService } from '../../src/pipeline/cms-integration';
import { NotificationService } from '../../src/utils/notifications';
import * as cron from 'node-cron';

// Mock all dependencies
jest.mock('node-cron');
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  },
  performanceLogger: {
    startTimer: jest.fn(() => ({
      end: jest.fn(() => 100)
    })),
    logMemoryUsage: jest.fn()
  }
}));
jest.mock('../../src/trends/google-trends');
jest.mock('../../src/scraping/amazon-scraper');
jest.mock('../../src/scraping/social-media');
jest.mock('../../src/pipeline/cms-integration');
jest.mock('../../src/utils/notifications');

describe('TrendSchedulerService - Comprehensive Tests', () => {
  let service: TrendSchedulerService;
  let mockTask: jest.Mocked<cron.ScheduledTask>;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockProcessEnv: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Backup environment
    mockProcessEnv = process.env;
    process.env = {
      ...mockProcessEnv,
      TRENDS_CRON_SCHEDULE: '0 8 * * *',
      SCRAPING_CRON_SCHEDULE: '0 10 * * *',
      WEBHOOK_URL: 'https://hooks.slack.com/test'
    };

    // Mock cron task
    mockTask = {
      start: jest.fn(),
      stop: jest.fn(),
      destroy: jest.fn(),
      getStatus: jest.fn(() => 'scheduled')
    } as any;

    (cron.schedule as jest.Mock).mockReturnValue(mockTask);

    // Mock notification service
    mockNotificationService = {
      sendTrendNotification: jest.fn(),
      sendScrapingNotification: jest.fn(),
      sendSocialMediaNotification: jest.fn(),
      sendPipelineCompleteNotification: jest.fn(),
      sendErrorNotification: jest.fn(),
      sendHealthAlert: jest.fn(),
      sendDailySummary: jest.fn(),
      testNotification: jest.fn()
    } as any;

    (NotificationService as jest.MockedClass<typeof NotificationService>).mockImplementation(() => mockNotificationService);

    service = new TrendSchedulerService();
  });

  afterEach(() => {
    service.stop();
    process.env = mockProcessEnv;
  });

  describe('Scheduler Configuration', () => {
    it('should initialize with default configuration', () => {
      const defaultService = new TrendSchedulerService();
      const status = defaultService.getStatus();
      
      expect(status.config).toMatchObject({
        trendsSchedule: '0 8 * * *',
        scrapingSchedule: '0 10 * * *',
        socialMediaSchedule: '0 12 * * *',
        cleanupSchedule: '0 2 * * 0',
        enabled: true
      });
    });

    it('should initialize with custom configuration', () => {
      const customConfig: Partial<SchedulerConfig> = {
        trendsSchedule: '0 6 * * *',
        scrapingSchedule: '0 9 * * *',
        enabled: false
      };

      const customService = new TrendSchedulerService(customConfig);
      const status = customService.getStatus();
      
      expect(status.config.trendsSchedule).toBe('0 6 * * *');
      expect(status.config.scrapingSchedule).toBe('0 9 * * *');
      expect(status.config.enabled).toBe(false);
      
      customService.stop();
    });

    it('should use environment variables for cron schedules', () => {
      process.env.TRENDS_CRON_SCHEDULE = '0 9 * * *';
      process.env.SCRAPING_CRON_SCHEDULE = '0 11 * * *';

      const envService = new TrendSchedulerService();
      const status = envService.getStatus();
      
      expect(status.config.trendsSchedule).toBe('0 9 * * *');
      expect(status.config.scrapingSchedule).toBe('0 11 * * *');
      
      envService.stop();
    });
  });

  describe('Scheduler Lifecycle', () => {
    it('should start all scheduled tasks', () => {
      service.start();

      expect(cron.schedule).toHaveBeenCalledTimes(5); // 4 main tasks + health check
      expect(mockTask.start).toHaveBeenCalledTimes(5);
      expect(logger.info).toHaveBeenCalledWith('Starting trend scheduler service');
      expect(logger.info).toHaveBeenCalledWith('Trend scheduler service started successfully');
      
      const status = service.getStatus();
      expect(status.isRunning).toBe(true);
      expect(status.taskCount).toBe(5);
    });

    it('should not start tasks when disabled', () => {
      const disabledService = new TrendSchedulerService({ enabled: false });
      disabledService.start();

      expect(cron.schedule).not.toHaveBeenCalled();
      expect(mockTask.start).not.toHaveBeenCalled();
      
      disabledService.stop();
    });

    it('should handle multiple start calls gracefully', () => {
      service.start();
      service.start(); // Second call

      expect(logger.warn).toHaveBeenCalledWith('Scheduler is already running');
    });

    it('should stop all scheduled tasks', () => {
      service.start();
      service.stop();

      expect(mockTask.stop).toHaveBeenCalledTimes(5);
      expect(logger.info).toHaveBeenCalledWith('Stopping trend scheduler service');
      expect(logger.info).toHaveBeenCalledWith('Trend scheduler service stopped');
      
      const status = service.getStatus();
      expect(status.isRunning).toBe(false);
      expect(status.taskCount).toBe(0);
    });

    it('should handle stop when not running', () => {
      service.stop(); // Stop without starting

      expect(logger.warn).toHaveBeenCalledWith('Scheduler is not running');
    });

    it('should handle multiple stop calls gracefully', () => {
      service.start();
      service.stop();
      service.stop(); // Second call

      expect(logger.warn).toHaveBeenCalledWith('Scheduler is not running');
    });
  });

  describe('Google Trends Analysis Scheduling', () => {
    it('should schedule Google Trends analysis with correct cron pattern', () => {
      service.start();

      expect(cron.schedule).toHaveBeenCalledWith(
        '0 8 * * *',
        expect.any(Function),
        expect.objectContaining({
          scheduled: false,
          timezone: 'America/New_York'
        })
      );
    });

    it('should execute Google Trends analysis successfully', async () => {
      const mockTrendData = {
        timestamp: new Date(),
        keywords: [
          {
            keyword: 'wellness',
            score: 85,
            geo: 'US',
            timestamp: new Date(),
            relatedQueries: ['health', 'fitness'],
            category: 'adult-products'
          }
        ],
        geographicTrends: [],
        summary: {
          totalKeywords: 1,
          averageScore: 85,
          topRegions: []
        }
      };

      (googleTrendsService.getComprehensiveTrendAnalysis as jest.Mock).mockResolvedValue(mockTrendData);

      service.start();

      // Get the scheduled function and execute it
      const scheduledFunction = (cron.schedule as jest.Mock).mock.calls[0][1];
      await scheduledFunction();

      expect(googleTrendsService.getComprehensiveTrendAnalysis).toHaveBeenCalled();
      expect(mockNotificationService.sendTrendNotification).toHaveBeenCalledWith({
        type: 'google_trends',
        keywordCount: 1,
        topKeywords: ['wellness'],
        averageScore: 85
      });
      expect(logger.info).toHaveBeenCalledWith('Google Trends analysis completed. Found 1 trending keywords');
    });

    it('should handle Google Trends analysis errors', async () => {
      const analysisError = new Error('API quota exceeded');
      (googleTrendsService.getComprehensiveTrendAnalysis as jest.Mock).mockRejectedValue(analysisError);

      service.start();

      const scheduledFunction = (cron.schedule as jest.Mock).mock.calls[0][1];
      await scheduledFunction();

      expect(logger.error).toHaveBeenCalledWith('Error in scheduled Google Trends analysis:', analysisError);
      expect(mockNotificationService.sendErrorNotification).toHaveBeenCalledWith('Google Trends Analysis', analysisError);
    });

    it('should use performance timer for Google Trends analysis', async () => {
      const mockTimer = { end: jest.fn(() => 1500) };
      (performanceLogger.startTimer as jest.Mock).mockReturnValue(mockTimer);

      (googleTrendsService.getComprehensiveTrendAnalysis as jest.Mock).mockResolvedValue({
        keywords: [],
        geographicTrends: [],
        summary: { totalKeywords: 0, averageScore: 0, topRegions: [] }
      });

      service.start();

      const scheduledFunction = (cron.schedule as jest.Mock).mock.calls[0][1];
      await scheduledFunction();

      expect(performanceLogger.startTimer).toHaveBeenCalledWith('Google Trends Analysis');
      expect(mockTimer.end).toHaveBeenCalled();
    });
  });

  describe('Product Scraping Scheduling', () => {
    it('should schedule product scraping with correct timing', () => {
      service.start();

      // Find the scraping schedule call
      const scrapingCall = (cron.schedule as jest.Mock).mock.calls.find(
        call => call[0] === '0 10 * * *'
      );
      expect(scrapingCall).toBeDefined();
    });

    it('should execute product scraping successfully', async () => {
      const mockProducts = [
        {
          id: 'B001',
          title: 'Wellness Product',
          description: 'Great product',
          imageUrl: 'https://example.com/image.jpg',
          sourceUrl: 'https://amazon.com/dp/B001',
          platform: 'amazon' as const,
          price: 29.99,
          rating: 4.5,
          reviewCount: 100,
          trendScore: 85,
          keywords: ['wellness'],
          scrapedAt: new Date()
        }
      ];

      const mockBestsellers = [
        {
          id: 'B002',
          title: 'Bestseller Product',
          description: 'Top rated',
          imageUrl: 'https://example.com/image2.jpg',
          sourceUrl: 'https://amazon.com/dp/B002',
          platform: 'amazon' as const,
          price: 39.99,
          rating: 5.0,
          reviewCount: 500,
          trendScore: 95,
          keywords: ['health'],
          scrapedAt: new Date()
        }
      ];

      // Mock the private method getLatestTrendKeywords
      service['getLatestTrendKeywords'] = jest.fn().mockResolvedValue(['wellness', 'health']);
      
      (amazonScraperService.searchProducts as jest.Mock).mockResolvedValue(mockProducts);
      (amazonScraperService.getBestsellers as jest.Mock).mockResolvedValue(mockBestsellers);

      service.start();

      // Find and execute the scraping function
      const scrapingCall = (cron.schedule as jest.Mock).mock.calls.find(
        call => call[0] === '0 10 * * *'
      );
      const scheduledFunction = scrapingCall[1];
      await scheduledFunction();

      expect(amazonScraperService.searchProducts).toHaveBeenCalledWith(['wellness', 'health']);
      expect(amazonScraperService.getBestsellers).toHaveBeenCalled();
      expect(mockNotificationService.sendScrapingNotification).toHaveBeenCalledWith({
        productCount: 2,
        topProducts: expect.arrayContaining([
          expect.objectContaining({ title: 'Wellness Product' }),
          expect.objectContaining({ title: 'Bestseller Product' })
        ]),
        platform: 'amazon'
      });
    });

    it('should handle empty keyword list', async () => {
      service['getLatestTrendKeywords'] = jest.fn().mockResolvedValue([]);
      
      service.start();

      const scrapingCall = (cron.schedule as jest.Mock).mock.calls.find(
        call => call[0] === '0 10 * * *'
      );
      const scheduledFunction = scrapingCall[1];
      await scheduledFunction();

      expect(amazonScraperService.searchProducts).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('No trending keywords found for scraping');
    });

    it('should handle scraping errors and cleanup browser', async () => {
      const scrapingError = new Error('Browser crash');
      service['getLatestTrendKeywords'] = jest.fn().mockResolvedValue(['test']);
      (amazonScraperService.searchProducts as jest.Mock).mockRejectedValue(scrapingError);

      service.start();

      const scrapingCall = (cron.schedule as jest.Mock).mock.calls.find(
        call => call[0] === '0 10 * * *'
      );
      const scheduledFunction = scrapingCall[1];
      await scheduledFunction();

      expect(logger.error).toHaveBeenCalledWith('Error in scheduled product scraping:', scrapingError);
      expect(mockNotificationService.sendErrorNotification).toHaveBeenCalledWith('Product Scraping', scrapingError);
      expect(amazonScraperService.close).toHaveBeenCalled(); // Should cleanup
    });
  });

  describe('Social Media Analysis Scheduling', () => {
    it('should schedule social media analysis', () => {
      service.start();

      const socialCall = (cron.schedule as jest.Mock).mock.calls.find(
        call => call[0] === '0 12 * * *'
      );
      expect(socialCall).toBeDefined();
    });

    it('should execute social media analysis successfully', async () => {
      const mockSocialTrends = [
        {
          platform: 'instagram' as const,
          hashtag: '#wellness',
          postCount: 100,
          engagementRate: 8.5,
          trendScore: 85,
          relatedProducts: ['wellness product'],
          scrapedAt: new Date()
        }
      ];

      (socialMediaTrendsService.getComprehensiveSocialTrends as jest.Mock).mockResolvedValue(mockSocialTrends);

      service.start();

      const socialCall = (cron.schedule as jest.Mock).mock.calls.find(
        call => call[0] === '0 12 * * *'
      );
      const scheduledFunction = socialCall[1];
      await scheduledFunction();

      expect(socialMediaTrendsService.getComprehensiveSocialTrends).toHaveBeenCalled();
      expect(mockNotificationService.sendSocialMediaNotification).toHaveBeenCalledWith({
        trendCount: 1,
        topHashtags: [{
          hashtag: '#wellness',
          platform: 'instagram',
          trendScore: 85
        }]
      });
    });

    it('should handle social media analysis errors', async () => {
      const socialError = new Error('Instagram API unavailable');
      (socialMediaTrendsService.getComprehensiveSocialTrends as jest.Mock).mockRejectedValue(socialError);

      service.start();

      const socialCall = (cron.schedule as jest.Mock).mock.calls.find(
        call => call[0] === '0 12 * * *'
      );
      const scheduledFunction = socialCall[1];
      await scheduledFunction();

      expect(logger.error).toHaveBeenCalledWith('Error in scheduled social media analysis:', socialError);
      expect(mockNotificationService.sendErrorNotification).toHaveBeenCalledWith('Social Media Analysis', socialError);
    });
  });

  describe('Data Cleanup Scheduling', () => {
    it('should schedule data cleanup weekly', () => {
      service.start();

      const cleanupCall = (cron.schedule as jest.Mock).mock.calls.find(
        call => call[0] === '0 2 * * 0'
      );
      expect(cleanupCall).toBeDefined();
    });

    it('should execute data cleanup tasks', async () => {
      service['cleanupOldData'] = jest.fn().mockResolvedValue(undefined);
      service['cleanupFailedScrapes'] = jest.fn().mockResolvedValue(undefined);
      service['archiveLogs'] = jest.fn().mockResolvedValue(undefined);

      service.start();

      const cleanupCall = (cron.schedule as jest.Mock).mock.calls.find(
        call => call[0] === '0 2 * * 0'
      );
      const scheduledFunction = cleanupCall[1];
      await scheduledFunction();

      expect(service['cleanupOldData']).toHaveBeenCalledWith(expect.any(Date));
      expect(service['cleanupFailedScrapes']).toHaveBeenCalled();
      expect(service['archiveLogs']).toHaveBeenCalled();
      expect(performanceLogger.logMemoryUsage).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      const cleanupError = new Error('Database connection failed');
      service['cleanupOldData'] = jest.fn().mockRejectedValue(cleanupError);
      service['cleanupFailedScrapes'] = jest.fn().mockResolvedValue(undefined);
      service['archiveLogs'] = jest.fn().mockResolvedValue(undefined);

      service.start();

      const cleanupCall = (cron.schedule as jest.Mock).mock.calls.find(
        call => call[0] === '0 2 * * 0'
      );
      const scheduledFunction = cleanupCall[1];
      await scheduledFunction();

      expect(logger.error).toHaveBeenCalledWith('Error in scheduled data cleanup:', cleanupError);
      // Should still continue with other cleanup tasks
      expect(service['cleanupFailedScrapes']).toHaveBeenCalled();
    });
  });

  describe('Health Check Scheduling', () => {
    it('should schedule health checks every 15 minutes', () => {
      service.start();

      const healthCall = (cron.schedule as jest.Mock).mock.calls.find(
        call => call[0] === '*/15 * * * *'
      );
      expect(healthCall).toBeDefined();
    });

    it('should perform health check and send alert for unhealthy status', async () => {
      const unhealthyStatus = {
        healthy: false,
        services: {
          googleTrends: 'error',
          amazonScraper: 'operational',
          socialMedia: 'error'
        },
        timestamp: new Date()
      };

      service['performHealthCheck'] = jest.fn().mockResolvedValue(unhealthyStatus);

      service.start();

      const healthCall = (cron.schedule as jest.Mock).mock.calls.find(
        call => call[0] === '*/15 * * * *'
      );
      const scheduledFunction = healthCall[1];
      await scheduledFunction();

      expect(service['performHealthCheck']).toHaveBeenCalled();
      expect(mockNotificationService.sendHealthAlert).toHaveBeenCalledWith(unhealthyStatus);
    });

    it('should not send alert for healthy status', async () => {
      const healthyStatus = {
        healthy: true,
        services: {
          googleTrends: 'operational',
          amazonScraper: 'operational',
          socialMedia: 'operational'
        },
        timestamp: new Date()
      };

      service['performHealthCheck'] = jest.fn().mockResolvedValue(healthyStatus);

      service.start();

      const healthCall = (cron.schedule as jest.Mock).mock.calls.find(
        call => call[0] === '*/15 * * * *'
      );
      const scheduledFunction = healthCall[1];
      await scheduledFunction();

      expect(mockNotificationService.sendHealthAlert).not.toHaveBeenCalled();
    });

    it('should handle health check errors', async () => {
      const healthError = new Error('Health check failed');
      service['performHealthCheck'] = jest.fn().mockRejectedValue(healthError);

      service.start();

      const healthCall = (cron.schedule as jest.Mock).mock.calls.find(
        call => call[0] === '*/15 * * * *'
      );
      const scheduledFunction = healthCall[1];
      await scheduledFunction();

      expect(logger.error).toHaveBeenCalledWith('Error in health check:', healthError);
    });
  });

  describe('Full Pipeline Execution', () => {
    it('should execute complete automation pipeline', async () => {
      const mockGoogleTrends = {
        timestamp: new Date(),
        keywords: [{ keyword: 'wellness', score: 85, geo: 'US', timestamp: new Date(), relatedQueries: [], category: 'adult-products' }],
        geographicTrends: [],
        summary: { totalKeywords: 1, averageScore: 85, topRegions: [] }
      };

      const mockSocialTrends = [{
        platform: 'instagram' as const,
        hashtag: '#wellness',
        postCount: 100,
        engagementRate: 8.5,
        trendScore: 85,
        relatedProducts: [],
        scrapedAt: new Date()
      }];

      const mockProducts = [{
        id: 'B001',
        title: 'Product',
        description: 'Description',
        imageUrl: 'https://example.com/img.jpg',
        sourceUrl: 'https://amazon.com/dp/B001',
        platform: 'amazon' as const,
        price: 29.99,
        rating: 4.5,
        reviewCount: 100,
        trendScore: 85,
        keywords: ['wellness'],
        scrapedAt: new Date()
      }];

      const mockCMSResponses = [{ success: true, productId: 'cms-1', message: 'Created successfully' }];

      (googleTrendsService.getComprehensiveTrendAnalysis as jest.Mock).mockResolvedValue(mockGoogleTrends);
      (socialMediaTrendsService.getComprehensiveSocialTrends as jest.Mock).mockResolvedValue(mockSocialTrends);
      (amazonScraperService.searchProducts as jest.Mock).mockResolvedValue(mockProducts);
      (cmsIntegrationService.processTrendAnalysisResults as jest.Mock).mockResolvedValue(mockCMSResponses);

      const result = await service.runFullPipeline();

      expect(result).toMatchObject({
        googleTrends: mockGoogleTrends,
        socialMediaTrends: mockSocialTrends,
        productOpportunities: mockProducts,
        recommendations: expect.any(Array),
        generatedAt: expect.any(Date)
      });

      expect(cmsIntegrationService.processTrendAnalysisResults).toHaveBeenCalledWith(result);
      expect(mockNotificationService.sendPipelineCompleteNotification).toHaveBeenCalled();
      expect(amazonScraperService.close).toHaveBeenCalled(); // Cleanup
    });

    it('should generate meaningful recommendations', async () => {
      const highScoringTrends = {
        keywords: [
          { keyword: 'high score trend', score: 85, geo: 'US', timestamp: new Date(), relatedQueries: [], category: 'adult-products' },
          { keyword: 'medium score trend', score: 65, geo: 'US', timestamp: new Date(), relatedQueries: [], category: 'adult-products' }
        ],
        summary: {
          topRegions: [
            { geo: 'US', geoName: 'United States', score: 90 },
            { geo: 'CA', geoName: 'Canada', score: 80 }
          ]
        }
      };

      const highEngagementSocial = [{
        platform: 'instagram' as const,
        hashtag: '#trending',
        trendScore: 85,
        postCount: 1000,
        engagementRate: 10,
        relatedProducts: [],
        scrapedAt: new Date()
      }];

      const highPotentialProducts = [{
        id: 'B001',
        title: 'High Potential Product',
        trendScore: 85,
        reviewCount: 200,
        rating: 4.8,
        price: 49.99,
        description: 'desc',
        imageUrl: 'img',
        sourceUrl: 'url',
        platform: 'amazon' as const,
        keywords: ['wellness'],
        scrapedAt: new Date()
      }];

      const recommendations = service['generateRecommendations'](
        highScoringTrends as any,
        highEngagementSocial,
        highPotentialProducts
      );

      expect(recommendations).toContain(expect.stringMatching(/high-scoring trends/i));
      expect(recommendations).toContain(expect.stringMatching(/trending social hashtags/i));
      expect(recommendations).toContain(expect.stringMatching(/dropshipping.*high-potential products/i));
      expect(recommendations).toContain(expect.stringMatching(/target regions/i));
    });

    it('should handle full pipeline errors gracefully', async () => {
      const pipelineError = new Error('Google Trends API down');
      (googleTrendsService.getComprehensiveTrendAnalysis as jest.Mock).mockRejectedValue(pipelineError);

      await expect(service.runFullPipeline()).rejects.toThrow('Google Trends API down');
      expect(amazonScraperService.close).toHaveBeenCalled(); // Should still cleanup
    });

    it('should use performance timers for full pipeline', async () => {
      const mockTimer = { end: jest.fn(() => 5000) };
      (performanceLogger.startTimer as jest.Mock).mockReturnValue(mockTimer);

      (googleTrendsService.getComprehensiveTrendAnalysis as jest.Mock).mockResolvedValue({
        keywords: [], geographicTrends: [], summary: { totalKeywords: 0, averageScore: 0, topRegions: [] }
      });
      (socialMediaTrendsService.getComprehensiveSocialTrends as jest.Mock).mockResolvedValue([]);
      (amazonScraperService.searchProducts as jest.Mock).mockResolvedValue([]);
      (cmsIntegrationService.processTrendAnalysisResults as jest.Mock).mockResolvedValue([]);

      await service.runFullPipeline();

      expect(performanceLogger.startTimer).toHaveBeenCalledWith('Full Automation Pipeline');
      expect(mockTimer.end).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should continue operation when individual tasks fail', async () => {
      // Mock one task failing
      (googleTrendsService.getComprehensiveTrendAnalysis as jest.Mock).mockRejectedValue(new Error('API down'));
      
      // But other services working
      (socialMediaTrendsService.getComprehensiveSocialTrends as jest.Mock).mockResolvedValue([]);

      service.start();

      // Execute trends analysis (should fail)
      const trendsCall = (cron.schedule as jest.Mock).mock.calls[0][1];
      await trendsCall();

      // Execute social analysis (should succeed)
      const socialCall = (cron.schedule as jest.Mock).mock.calls.find(
        call => call[0] === '0 12 * * *'
      )[1];
      await socialCall();

      expect(logger.error).toHaveBeenCalledWith('Error in scheduled Google Trends analysis:', expect.any(Error));
      expect(socialMediaTrendsService.getComprehensiveSocialTrends).toHaveBeenCalled();
    });

    it('should handle notification service failures', async () => {
      mockNotificationService.sendTrendNotification.mockRejectedValue(new Error('Webhook failed'));

      (googleTrendsService.getComprehensiveTrendAnalysis as jest.Mock).mockResolvedValue({
        keywords: [{ keyword: 'test', score: 75, geo: 'US', timestamp: new Date(), relatedQueries: [], category: 'adult-products' }],
        geographicTrends: [],
        summary: { totalKeywords: 1, averageScore: 75, topRegions: [] }
      });

      service.start();

      const trendsCall = (cron.schedule as jest.Mock).mock.calls[0][1];
      await trendsCall();

      // Should continue despite notification failure
      expect(googleTrendsService.getComprehensiveTrendAnalysis).toHaveBeenCalled();
    });

    it('should handle cron schedule creation failures', () => {
      (cron.schedule as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid cron pattern');
      });

      expect(() => service.start()).toThrow('Invalid cron pattern');
    });
  });

  describe('Performance and Resource Management', () => {
    it('should track memory usage during cleanup', async () => {
      service['cleanupOldData'] = jest.fn().mockResolvedValue(undefined);
      service['cleanupFailedScrapes'] = jest.fn().mockResolvedValue(undefined);
      service['archiveLogs'] = jest.fn().mockResolvedValue(undefined);

      service.start();

      const cleanupCall = (cron.schedule as jest.Mock).mock.calls.find(
        call => call[0] === '0 2 * * 0'
      );
      const scheduledFunction = cleanupCall[1];
      await scheduledFunction();

      expect(performanceLogger.logMemoryUsage).toHaveBeenCalled();
    });

    it('should handle concurrent task execution', async () => {
      service.start();

      // Simulate concurrent execution of multiple scheduled tasks
      const tasks = (cron.schedule as jest.Mock).mock.calls.map(call => call[1]);
      
      // Mock all services to resolve quickly
      (googleTrendsService.getComprehensiveTrendAnalysis as jest.Mock).mockResolvedValue({
        keywords: [], geographicTrends: [], summary: { totalKeywords: 0, averageScore: 0, topRegions: [] }
      });
      (socialMediaTrendsService.getComprehensiveSocialTrends as jest.Mock).mockResolvedValue([]);
      service['getLatestTrendKeywords'] = jest.fn().mockResolvedValue([]);
      service['cleanupOldData'] = jest.fn().mockResolvedValue(undefined);
      service['performHealthCheck'] = jest.fn().mockResolvedValue({ healthy: true });

      // Execute all tasks concurrently
      await Promise.all(tasks.map(task => task()));

      // All should complete without conflicts
      expect(googleTrendsService.getComprehensiveTrendAnalysis).toHaveBeenCalled();
      expect(socialMediaTrendsService.getComprehensiveSocialTrends).toHaveBeenCalled();
    });

    it('should provide accurate status information', () => {
      const status = service.getStatus();

      expect(status).toMatchObject({
        isRunning: false,
        taskCount: 0,
        config: expect.any(Object),
        uptime: expect.any(Number)
      });

      service.start();
      const runningStatus = service.getStatus();

      expect(runningStatus.isRunning).toBe(true);
      expect(runningStatus.taskCount).toBe(5);
      expect(runningStatus.uptime).toBeGreaterThan(0);
    });
  });

  describe('Data Storage Integration', () => {
    it('should call data storage methods with correct data', async () => {
      const mockTrendData = {
        keywords: [{ keyword: 'test', score: 75, geo: 'US', timestamp: new Date(), relatedQueries: [], category: 'adult-products' }],
        geographicTrends: [],
        summary: { totalKeywords: 1, averageScore: 75, topRegions: [] }
      };

      service['storeTrendData'] = jest.fn().mockResolvedValue(undefined);
      (googleTrendsService.getComprehensiveTrendAnalysis as jest.Mock).mockResolvedValue(mockTrendData);

      service.start();

      const trendsCall = (cron.schedule as jest.Mock).mock.calls[0][1];
      await trendsCall();

      expect(service['storeTrendData']).toHaveBeenCalledWith(mockTrendData);
    });

    it('should store scraped products correctly', async () => {
      const mockProducts = [{ id: 'B001', title: 'Product' }] as any;
      
      service['getLatestTrendKeywords'] = jest.fn().mockResolvedValue(['test']);
      service['storeScrapedProducts'] = jest.fn().mockResolvedValue(undefined);
      (amazonScraperService.searchProducts as jest.Mock).mockResolvedValue(mockProducts);
      (amazonScraperService.getBestsellers as jest.Mock).mockResolvedValue([]);

      service.start();

      const scrapingCall = (cron.schedule as jest.Mock).mock.calls.find(
        call => call[0] === '0 10 * * *'
      );
      const scheduledFunction = scrapingCall[1];
      await scheduledFunction();

      expect(service['storeScrapedProducts']).toHaveBeenCalledWith(mockProducts);
    });

    it('should store comprehensive analysis results', async () => {
      service['storeAnalysisResult'] = jest.fn().mockResolvedValue(undefined);

      (googleTrendsService.getComprehensiveTrendAnalysis as jest.Mock).mockResolvedValue({
        keywords: [], geographicTrends: [], summary: { totalKeywords: 0, averageScore: 0, topRegions: [] }
      });
      (socialMediaTrendsService.getComprehensiveSocialTrends as jest.Mock).mockResolvedValue([]);
      (amazonScraperService.searchProducts as jest.Mock).mockResolvedValue([]);
      (cmsIntegrationService.processTrendAnalysisResults as jest.Mock).mockResolvedValue([]);

      const result = await service.runFullPipeline();

      expect(service['storeAnalysisResult']).toHaveBeenCalledWith(result);
    });
  });
});

// Integration tests for scheduler with real timing
describe('TrendSchedulerService - Timing Integration Tests', () => {
  let service: TrendSchedulerService;

  beforeEach(() => {
    service = new TrendSchedulerService({
      enabled: false // Start disabled for manual control
    });
  });

  afterEach(() => {
    service.stop();
  });

  it('should handle rapid start/stop cycles', () => {
    for (let i = 0; i < 10; i++) {
      service.start();
      service.stop();
    }

    const status = service.getStatus();
    expect(status.isRunning).toBe(false);
    expect(status.taskCount).toBe(0);
  });

  it('should validate cron expressions', () => {
    const invalidCronService = new TrendSchedulerService({
      trendsSchedule: 'invalid cron',
      enabled: false
    });

    expect(() => invalidCronService.start()).toThrow();
    
    invalidCronService.stop();
  });

  it('should handle timezone configurations', () => {
    const timezoneService = new TrendSchedulerService({
      enabled: true
    });

    timezoneService.start();

    // Verify timezone was set in cron schedule calls
    expect(cron.schedule).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Function),
      expect.objectContaining({
        timezone: 'America/New_York'
      })
    );

    timezoneService.stop();
  });
});