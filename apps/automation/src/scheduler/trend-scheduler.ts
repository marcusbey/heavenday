import * as cron from 'node-cron';
import { logger, performanceLogger } from '../utils/logger';
import { googleTrendsService } from '../trends/google-trends';
import { amazonScraperService } from '../scraping/amazon-scraper';
import { socialMediaTrendsService } from '../scraping/social-media';
import { cmsIntegrationService } from '../pipeline/cms-integration';
import { TrendAnalysisResult } from '../types/trends';
import { NotificationService } from '../utils/notifications';

export interface SchedulerConfig {
  trendsSchedule: string;
  scrapingSchedule: string;
  socialMediaSchedule: string;
  cleanupSchedule: string;
  enabled: boolean;
}

export class TrendSchedulerService {
  private config: SchedulerConfig;
  private isRunning: boolean = false;
  private tasks: cron.ScheduledTask[] = [];
  private notificationService: NotificationService;

  constructor(config?: Partial<SchedulerConfig>) {
    this.config = {
      trendsSchedule: process.env.TRENDS_CRON_SCHEDULE || '0 8 * * *', // Daily at 8 AM
      scrapingSchedule: process.env.SCRAPING_CRON_SCHEDULE || '0 10 * * *', // Daily at 10 AM
      socialMediaSchedule: '0 12 * * *', // Daily at 12 PM
      cleanupSchedule: '0 2 * * 0', // Weekly at 2 AM on Sunday
      enabled: true,
      ...config
    };

    this.notificationService = new NotificationService();
  }

  /**
   * Start all scheduled tasks
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    logger.info('Starting trend scheduler service');

    if (this.config.enabled) {
      this.scheduleTrendAnalysis();
      this.scheduleProductScraping();
      this.scheduleSocialMediaAnalysis();
      this.scheduleDataCleanup();
      this.scheduleHealthCheck();
    }

    this.isRunning = true;
    logger.info('Trend scheduler service started successfully');
  }

  /**
   * Stop all scheduled tasks
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('Scheduler is not running');
      return;
    }

    logger.info('Stopping trend scheduler service');

    this.tasks.forEach(task => {
      task.stop();
    });
    this.tasks = [];

    this.isRunning = false;
    logger.info('Trend scheduler service stopped');
  }

  /**
   * Schedule Google Trends analysis
   */
  private scheduleTrendAnalysis(): void {
    const task = cron.schedule(this.config.trendsSchedule, async () => {
      const timer = performanceLogger.startTimer('Google Trends Analysis');
      
      try {
        logger.info('Starting scheduled Google Trends analysis');
        
        const trendData = await googleTrendsService.getComprehensiveTrendAnalysis();
        
        // Store trend data (this would integrate with your database)
        await this.storeTrendData(trendData);
        
        // Send notification about trending keywords
        await this.notificationService.sendTrendNotification({
          type: 'google_trends',
          keywordCount: trendData.keywords.length,
          topKeywords: trendData.keywords.slice(0, 5).map(k => k.keyword),
          averageScore: trendData.summary.averageScore
        });

        logger.info(`Google Trends analysis completed. Found ${trendData.keywords.length} trending keywords`);
        
      } catch (error) {
        logger.error('Error in scheduled Google Trends analysis:', error);
        await this.notificationService.sendErrorNotification('Google Trends Analysis', error);
      } finally {
        timer.end();
      }
    }, {
      scheduled: false,
      timezone: 'America/New_York'
    });

    task.start();
    this.tasks.push(task);
    logger.info(`Google Trends analysis scheduled: ${this.config.trendsSchedule}`);
  }

  /**
   * Schedule product scraping
   */
  private scheduleProductScraping(): void {
    const task = cron.schedule(this.config.scrapingSchedule, async () => {
      const timer = performanceLogger.startTimer('Product Scraping');
      
      try {
        logger.info('Starting scheduled product scraping');
        
        // Get latest trending keywords to scrape
        const trendKeywords = await this.getLatestTrendKeywords();
        
        if (trendKeywords.length === 0) {
          logger.info('No trending keywords found for scraping');
          return;
        }

        // Scrape Amazon products
        const amazonProducts = await amazonScraperService.searchProducts(trendKeywords);
        
        // Get Amazon bestsellers
        const bestsellers = await amazonScraperService.getBestsellers();
        
        const allProducts = [...amazonProducts, ...bestsellers];

        // Store scraped products
        await this.storeScrapedProducts(allProducts);

        // Send notification about scraped products
        await this.notificationService.sendScrapingNotification({
          productCount: allProducts.length,
          topProducts: allProducts.slice(0, 5).map(p => ({
            title: p.title,
            price: p.price,
            trendScore: p.trendScore
          })),
          platform: 'amazon'
        });

        logger.info(`Product scraping completed. Scraped ${allProducts.length} products`);
        
      } catch (error) {
        logger.error('Error in scheduled product scraping:', error);
        await this.notificationService.sendErrorNotification('Product Scraping', error);
      } finally {
        timer.end();
        // Ensure browser cleanup
        await amazonScraperService.close();
      }
    }, {
      scheduled: false,
      timezone: 'America/New_York'
    });

    task.start();
    this.tasks.push(task);
    logger.info(`Product scraping scheduled: ${this.config.scrapingSchedule}`);
  }

  /**
   * Schedule social media trend analysis
   */
  private scheduleSocialMediaAnalysis(): void {
    const task = cron.schedule(this.config.socialMediaSchedule, async () => {
      const timer = performanceLogger.startTimer('Social Media Analysis');
      
      try {
        logger.info('Starting scheduled social media trend analysis');
        
        const socialTrends = await socialMediaTrendsService.getComprehensiveSocialTrends();
        
        // Store social media trends
        await this.storeSocialMediaTrends(socialTrends);

        // Send notification about social trends
        await this.notificationService.sendSocialMediaNotification({
          trendCount: socialTrends.length,
          topHashtags: socialTrends.slice(0, 5).map(t => ({
            hashtag: t.hashtag,
            platform: t.platform,
            trendScore: t.trendScore
          }))
        });

        logger.info(`Social media analysis completed. Found ${socialTrends.length} trends`);
        
      } catch (error) {
        logger.error('Error in scheduled social media analysis:', error);
        await this.notificationService.sendErrorNotification('Social Media Analysis', error);
      } finally {
        timer.end();
      }
    }, {
      scheduled: false,
      timezone: 'America/New_York'
    });

    task.start();
    this.tasks.push(task);
    logger.info(`Social media analysis scheduled: ${this.config.socialMediaSchedule}`);
  }

  /**
   * Schedule data cleanup
   */
  private scheduleDataCleanup(): void {
    const task = cron.schedule(this.config.cleanupSchedule, async () => {
      const timer = performanceLogger.startTimer('Data Cleanup');
      
      try {
        logger.info('Starting scheduled data cleanup');
        
        // Clean up old trend data (older than 30 days)
        const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        await this.cleanupOldData(cutoffDate);
        
        // Clean up failed scraping attempts
        await this.cleanupFailedScrapes();
        
        // Archive old logs
        await this.archiveLogs();
        
        logger.info('Data cleanup completed');
        
      } catch (error) {
        logger.error('Error in scheduled data cleanup:', error);
      } finally {
        timer.end();
        performanceLogger.logMemoryUsage();
      }
    }, {
      scheduled: false,
      timezone: 'America/New_York'
    });

    task.start();
    this.tasks.push(task);
    logger.info(`Data cleanup scheduled: ${this.config.cleanupSchedule}`);
  }

  /**
   * Schedule health check
   */
  private scheduleHealthCheck(): void {
    // Health check every 15 minutes
    const task = cron.schedule('*/15 * * * *', async () => {
      try {
        const healthStatus = await this.performHealthCheck();
        
        if (!healthStatus.healthy) {
          await this.notificationService.sendHealthAlert(healthStatus);
        }
        
      } catch (error) {
        logger.error('Error in health check:', error);
      }
    }, {
      scheduled: false,
      timezone: 'America/New_York'
    });

    task.start();
    this.tasks.push(task);
  }

  /**
   * Run full automation pipeline immediately
   */
  async runFullPipeline(): Promise<TrendAnalysisResult> {
    const timer = performanceLogger.startTimer('Full Automation Pipeline');
    
    try {
      logger.info('Starting full automation pipeline');

      // 1. Analyze trends
      const googleTrends = await googleTrendsService.getComprehensiveTrendAnalysis();
      logger.info(`✓ Google trends analysis complete: ${googleTrends.keywords.length} keywords`);

      // 2. Analyze social media trends
      const socialMediaTrends = await socialMediaTrendsService.getComprehensiveSocialTrends();
      logger.info(`✓ Social media analysis complete: ${socialMediaTrends.length} trends`);

      // 3. Scrape products based on trends
      const trendKeywords = googleTrends.keywords.slice(0, 10).map(k => k.keyword);
      const productOpportunities = await amazonScraperService.searchProducts(trendKeywords);
      logger.info(`✓ Product scraping complete: ${productOpportunities.length} products`);

      // 4. Generate recommendations
      const recommendations = this.generateRecommendations(googleTrends, socialMediaTrends, productOpportunities);

      const result: TrendAnalysisResult = {
        googleTrends,
        socialMediaTrends,
        productOpportunities,
        recommendations,
        generatedAt: new Date()
      };

      // 5. Integrate with CMS for automatic product listing
      logger.info('🔗 Starting CMS integration...');
      const cmsResponses = await cmsIntegrationService.processTrendAnalysisResults(result);
      const successfulIntegrations = cmsResponses.filter(r => r.success).length;
      logger.info(`✅ CMS integration complete: ${successfulIntegrations}/${cmsResponses.length} products created`);

      // Store comprehensive results
      await this.storeAnalysisResult(result);

      // Send summary notification
      await this.notificationService.sendPipelineCompleteNotification({
        ...result,
        cmsIntegration: {
          totalProcessed: cmsResponses.length,
          successful: successfulIntegrations,
          failed: cmsResponses.length - successfulIntegrations
        }
      });

      logger.info('Full automation pipeline completed successfully');
      return result;

    } catch (error) {
      logger.error('Error in full automation pipeline:', error);
      throw error;
    } finally {
      timer.end();
      await amazonScraperService.close();
    }
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(googleTrends: any, socialTrends: any[], products: any[]): string[] {
    const recommendations: string[] = [];

    // High-scoring Google trends
    const highScoringTrends = googleTrends.keywords.filter((k: any) => k.score >= 80);
    if (highScoringTrends.length > 0) {
      recommendations.push(`Focus on high-scoring trends: ${highScoringTrends.slice(0, 3).map((k: any) => k.keyword).join(', ')}`);
    }

    // Trending social media hashtags
    const trendingSocial = socialTrends.filter(t => t.trendScore >= 70);
    if (trendingSocial.length > 0) {
      recommendations.push(`Leverage trending social hashtags: ${trendingSocial.slice(0, 3).map(t => t.hashtag).join(', ')}`);
    }

    // High-potential products
    const highPotentialProducts = products.filter(p => p.trendScore >= 75 && p.reviewCount >= 100);
    if (highPotentialProducts.length > 0) {
      recommendations.push(`Consider dropshipping: ${highPotentialProducts.length} high-potential products identified`);
    }

    // Geographic opportunities
    if (googleTrends.summary.topRegions.length > 0) {
      recommendations.push(`Target regions: ${googleTrends.summary.topRegions.slice(0, 2).map((r: any) => r.geoName).join(', ')}`);
    }

    return recommendations;
  }

  /**
   * Data storage methods (to be implemented with actual database)
   */
  private async storeTrendData(trendData: any): Promise<void> {
    // Implementation would store in database
    logger.info('Storing trend data to database');
  }

  private async storeScrapedProducts(products: any[]): Promise<void> {
    // Implementation would store in database
    logger.info(`Storing ${products.length} scraped products to database`);
  }

  private async storeSocialMediaTrends(trends: any[]): Promise<void> {
    // Implementation would store in database
    logger.info(`Storing ${trends.length} social media trends to database`);
  }

  private async storeAnalysisResult(result: TrendAnalysisResult): Promise<void> {
    // Implementation would store comprehensive result
    logger.info('Storing complete analysis result to database');
  }

  private async getLatestTrendKeywords(): Promise<string[]> {
    // Implementation would fetch from database
    return ['wellness products', 'personal care', 'health accessories'];
  }

  private async cleanupOldData(cutoffDate: Date): Promise<void> {
    // Implementation would clean up old database records
    logger.info(`Cleaning up data older than ${cutoffDate.toISOString()}`);
  }

  private async cleanupFailedScrapes(): Promise<void> {
    // Implementation would clean up failed scraping attempts
    logger.info('Cleaning up failed scraping attempts');
  }

  private async archiveLogs(): Promise<void> {
    // Implementation would archive old log files
    logger.info('Archiving old log files');
  }

  private async performHealthCheck(): Promise<any> {
    return {
      healthy: true,
      services: {
        googleTrends: 'operational',
        amazonScraper: 'operational',
        socialMedia: 'operational'
      },
      timestamp: new Date()
    };
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      taskCount: this.tasks.length,
      config: this.config,
      uptime: process.uptime()
    };
  }
}

// Export singleton instance
export const trendSchedulerService = new TrendSchedulerService();

// CLI execution
if (require.main === module) {
  const scheduler = new TrendSchedulerService();
  
  scheduler.start();
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    scheduler.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    scheduler.stop();
    process.exit(0);
  });
}