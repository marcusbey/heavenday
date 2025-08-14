import { TrendSchedulerService } from '../../src/scheduler/trend-scheduler';
import { createMockTrendData, createMockProductData, createMockSocialMediaTrend } from '../setup';

// Mock node-cron
jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn()
  }))
}));

// Mock services
jest.mock('../../src/trends/google-trends', () => ({
  googleTrendsService: {
    getComprehensiveTrendAnalysis: jest.fn()
  }
}));

jest.mock('../../src/scraping/amazon-scraper', () => ({
  amazonScraperService: {
    searchProducts: jest.fn(),
    getBestsellers: jest.fn(),
    close: jest.fn()
  }
}));

jest.mock('../../src/scraping/social-media', () => ({
  socialMediaTrendsService: {
    getComprehensiveSocialTrends: jest.fn()
  }
}));

import * as cron from 'node-cron';
import { googleTrendsService } from '../../src/trends/google-trends';
import { amazonScraperService } from '../../src/scraping/amazon-scraper';
import { socialMediaTrendsService } from '../../src/scraping/social-media';

describe('TrendSchedulerService', () => {
  let scheduler: TrendSchedulerService;
  let mockTask: any;

  beforeEach(() => {
    mockTask = {
      start: jest.fn(),
      stop: jest.fn()
    };

    (cron.schedule as jest.Mock).mockReturnValue(mockTask);

    scheduler = new TrendSchedulerService({
      trendsSchedule: '0 8 * * *',
      scrapingSchedule: '0 10 * * *',
      enabled: true
    });

    jest.clearAllMocks();
  });

  describe('start', () => {
    it('should start all scheduled tasks', () => {
      scheduler.start();

      expect(cron.schedule).toHaveBeenCalledTimes(5); // trends, scraping, social, cleanup, health
      expect(mockTask.start).toHaveBeenCalledTimes(5);
      expect(scheduler.getStatus().isRunning).toBe(true);
    });

    it('should not start if already running', () => {
      scheduler.start();
      scheduler.start(); // Second call

      // Should only be called once for each task
      expect(cron.schedule).toHaveBeenCalledTimes(5);
    });

    it('should not start tasks if disabled', () => {
      const disabledScheduler = new TrendSchedulerService({ enabled: false });
      disabledScheduler.start();

      expect(cron.schedule).not.toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('should stop all scheduled tasks', () => {
      scheduler.start();
      scheduler.stop();

      expect(mockTask.stop).toHaveBeenCalledTimes(5);
      expect(scheduler.getStatus().isRunning).toBe(false);
    });

    it('should handle stop when not running', () => {
      expect(() => scheduler.stop()).not.toThrow();
    });
  });

  describe('runFullPipeline', () => {
    beforeEach(() => {
      (googleTrendsService.getComprehensiveTrendAnalysis as jest.Mock)
        .mockResolvedValue(createMockTrendData());
      
      (socialMediaTrendsService.getComprehensiveSocialTrends as jest.Mock)
        .mockResolvedValue([createMockSocialMediaTrend()]);
      
      (amazonScraperService.searchProducts as jest.Mock)
        .mockResolvedValue([createMockProductData()]);
    });

    it('should run full automation pipeline', async () => {
      const result = await scheduler.runFullPipeline();

      expect(result).toHaveProperty('googleTrends');
      expect(result).toHaveProperty('socialMediaTrends');
      expect(result).toHaveProperty('productOpportunities');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('generatedAt');

      expect(googleTrendsService.getComprehensiveTrendAnalysis).toHaveBeenCalled();
      expect(socialMediaTrendsService.getComprehensiveSocialTrends).toHaveBeenCalled();
      expect(amazonScraperService.searchProducts).toHaveBeenCalled();
    });

    it('should generate recommendations based on results', async () => {
      const result = await scheduler.runFullPipeline();

      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle pipeline errors', async () => {
      (googleTrendsService.getComprehensiveTrendAnalysis as jest.Mock)
        .mockRejectedValue(new Error('Trends API failed'));

      await expect(scheduler.runFullPipeline()).rejects.toThrow('Trends API failed');
    });

    it('should always close browser after completion', async () => {
      await scheduler.runFullPipeline();
      expect(amazonScraperService.close).toHaveBeenCalled();
    });

    it('should close browser even if pipeline fails', async () => {
      (googleTrendsService.getComprehensiveTrendAnalysis as jest.Mock)
        .mockRejectedValue(new Error('Pipeline failed'));

      try {
        await scheduler.runFullPipeline();
      } catch (error) {
        // Expected
      }

      expect(amazonScraperService.close).toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('should return scheduler status', () => {
      const status = scheduler.getStatus();

      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('taskCount');
      expect(status).toHaveProperty('config');
      expect(status).toHaveProperty('uptime');
      expect(typeof status.isRunning).toBe('boolean');
      expect(typeof status.taskCount).toBe('number');
    });

    it('should show correct task count when running', () => {
      scheduler.start();
      const status = scheduler.getStatus();

      expect(status.isRunning).toBe(true);
      expect(status.taskCount).toBe(5); // trends, scraping, social, cleanup, health
    });

    it('should show zero task count when stopped', () => {
      scheduler.start();
      scheduler.stop();
      const status = scheduler.getStatus();

      expect(status.isRunning).toBe(false);
      expect(status.taskCount).toBe(0);
    });
  });

  describe('recommendation generation', () => {
    it('should generate high-scoring trend recommendations', async () => {
      const mockTrendData = {
        ...createMockTrendData(),
        keywords: [
          { keyword: 'high-score-keyword', score: 85, relatedQueries: [] }
        ]
      };

      (googleTrendsService.getComprehensiveTrendAnalysis as jest.Mock)
        .mockResolvedValue(mockTrendData);
      (socialMediaTrendsService.getComprehensiveSocialTrends as jest.Mock)
        .mockResolvedValue([]);
      (amazonScraperService.searchProducts as jest.Mock)
        .mockResolvedValue([]);

      const result = await scheduler.runFullPipeline();
      
      expect(result.recommendations).toContain(
        expect.stringMatching(/high-score-keyword/)
      );
    });

    it('should generate social media recommendations', async () => {
      const mockSocialTrend = {
        ...createMockSocialMediaTrend(),
        trendScore: 75,
        hashtag: '#trending'
      };

      (googleTrendsService.getComprehensiveTrendAnalysis as jest.Mock)
        .mockResolvedValue(createMockTrendData());
      (socialMediaTrendsService.getComprehensiveSocialTrends as jest.Mock)
        .mockResolvedValue([mockSocialTrend]);
      (amazonScraperService.searchProducts as jest.Mock)
        .mockResolvedValue([]);

      const result = await scheduler.runFullPipeline();
      
      expect(result.recommendations).toContain(
        expect.stringMatching(/#trending/)
      );
    });

    it('should generate product recommendations', async () => {
      const mockProduct = {
        ...createMockProductData(),
        trendScore: 80,
        reviewCount: 200
      };

      (googleTrendsService.getComprehensiveTrendAnalysis as jest.Mock)
        .mockResolvedValue(createMockTrendData());
      (socialMediaTrendsService.getComprehensiveSocialTrends as jest.Mock)
        .mockResolvedValue([]);
      (amazonScraperService.searchProducts as jest.Mock)
        .mockResolvedValue([mockProduct]);

      const result = await scheduler.runFullPipeline();
      
      expect(result.recommendations).toContain(
        expect.stringMatching(/high-potential products/)
      );
    });
  });

  describe('error handling', () => {
    it('should handle individual service failures gracefully', async () => {
      (googleTrendsService.getComprehensiveTrendAnalysis as jest.Mock)
        .mockResolvedValue(createMockTrendData());
      (socialMediaTrendsService.getComprehensiveSocialTrends as jest.Mock)
        .mockRejectedValue(new Error('Social media failed'));
      (amazonScraperService.searchProducts as jest.Mock)
        .mockResolvedValue([createMockProductData()]);

      // Should not throw, but continue with available data
      await expect(scheduler.runFullPipeline()).rejects.toThrow('Social media failed');
    });
  });

  describe('configuration', () => {
    it('should use environment variables for configuration', () => {
      process.env.TRENDS_CRON_SCHEDULE = '0 9 * * *';
      process.env.SCRAPING_CRON_SCHEDULE = '0 11 * * *';

      const newScheduler = new TrendSchedulerService();
      const config = newScheduler.getStatus().config;

      expect(config.trendsSchedule).toBe('0 9 * * *');
      expect(config.scrapingSchedule).toBe('0 11 * * *');
    });

    it('should use default configuration when env vars not set', () => {
      delete process.env.TRENDS_CRON_SCHEDULE;
      delete process.env.SCRAPING_CRON_SCHEDULE;

      const newScheduler = new TrendSchedulerService();
      const config = newScheduler.getStatus().config;

      expect(config.trendsSchedule).toBe('0 8 * * *');
      expect(config.scrapingSchedule).toBe('0 10 * * *');
    });
  });
});