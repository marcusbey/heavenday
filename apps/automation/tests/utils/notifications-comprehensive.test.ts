import { 
  NotificationService,
  TrendNotification,
  ScrapingNotification,
  SocialMediaNotification
} from '../../src/utils/notifications';
import { logger } from '../../src/utils/logger';
import axios from 'axios';

// Mock dependencies
jest.mock('axios');
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('NotificationService - Comprehensive Tests', () => {
  let service: NotificationService;
  let mockAxios: jest.Mocked<typeof axios>;
  let mockProcessEnv: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Backup environment
    mockProcessEnv = process.env;
    process.env = {
      ...mockProcessEnv,
      WEBHOOK_URL: 'https://hooks.slack.com/services/test/webhook/url'
    };

    mockAxios = axios as jest.Mocked<typeof axios>;
    service = new NotificationService();
  });

  afterEach(() => {
    process.env = mockProcessEnv;
  });

  describe('Service Configuration', () => {
    it('should initialize with webhook URL from environment', () => {
      expect(service['webhookUrl']).toBe('https://hooks.slack.com/services/test/webhook/url');
      expect(service['enabled']).toBe(true);
    });

    it('should be disabled when webhook URL is not provided', () => {
      delete process.env.WEBHOOK_URL;
      
      const disabledService = new NotificationService();
      expect(disabledService['enabled']).toBe(false);
      expect(disabledService['webhookUrl']).toBe('');
    });

    it('should handle empty webhook URL', () => {
      process.env.WEBHOOK_URL = '';
      
      const emptyService = new NotificationService();
      expect(emptyService['enabled']).toBe(false);
    });

    it('should handle whitespace-only webhook URL', () => {
      process.env.WEBHOOK_URL = '   ';
      
      const whitespaceService = new NotificationService();
      expect(whitespaceService['enabled']).toBe(false);
    });
  });

  describe('Trend Notifications', () => {
    it('should send trend notification with correct format', async () => {
      const trendData: TrendNotification = {
        type: 'google_trends',
        keywordCount: 5,
        topKeywords: ['wellness', 'health', 'personal care', 'intimate', 'massage'],
        averageScore: 78.4
      };

      mockAxios.post.mockResolvedValue({ status: 200 });

      await service.sendTrendNotification(trendData);

      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/test/webhook/url',
        {
          text: '📈 Google Trends Analysis Complete',
          blocks: [{
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Google Trends Analysis Results*\n' +
                    '• Keywords found: 5\n' +
                    '• Average score: 78.4\n' +
                    '• Top keywords: wellness, health, personal care, intimate, massage'
            }
          }]
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000
        }
      );

      expect(logger.info).toHaveBeenCalledWith('Trend notification sent successfully');
    });

    it('should handle trend notification with empty keywords', async () => {
      const trendData: TrendNotification = {
        type: 'google_trends',
        keywordCount: 0,
        topKeywords: [],
        averageScore: 0
      };

      mockAxios.post.mockResolvedValue({ status: 200 });

      await service.sendTrendNotification(trendData);

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          blocks: [{
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: expect.stringContaining('• Top keywords: ')
            }
          }]
        }),
        expect.any(Object)
      );
    });

    it('should handle trend notification with single keyword', async () => {
      const trendData: TrendNotification = {
        type: 'google_trends',
        keywordCount: 1,
        topKeywords: ['wellness'],
        averageScore: 85.0
      };

      mockAxios.post.mockResolvedValue({ status: 200 });

      await service.sendTrendNotification(trendData);

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          blocks: [{
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: expect.stringContaining('• Top keywords: wellness')
            }
          }]
        }),
        expect.any(Object)
      );
    });

    it('should not send trend notification when disabled', async () => {
      delete process.env.WEBHOOK_URL;
      const disabledService = new NotificationService();

      const trendData: TrendNotification = {
        type: 'google_trends',
        keywordCount: 5,
        topKeywords: ['test'],
        averageScore: 80
      };

      await disabledService.sendTrendNotification(trendData);

      expect(mockAxios.post).not.toHaveBeenCalled();
    });

    it('should handle trend notification errors', async () => {
      const trendData: TrendNotification = {
        type: 'google_trends',
        keywordCount: 3,
        topKeywords: ['test'],
        averageScore: 75
      };

      const webhookError = new Error('Webhook failed');
      mockAxios.post.mockRejectedValue(webhookError);

      await service.sendTrendNotification(trendData);

      expect(logger.error).toHaveBeenCalledWith('Error sending trend notification:', webhookError);
    });
  });

  describe('Scraping Notifications', () => {
    it('should send scraping notification with product details', async () => {
      const scrapingData: ScrapingNotification = {
        productCount: 3,
        topProducts: [
          { title: 'Premium Wellness Device for Personal Health Care', price: 89.99, trendScore: 92 },
          { title: 'Intimate Health Product - Discreet Packaging', price: 49.99, trendScore: 87 },
          { title: 'Personal Care Massage Tool with Multiple Settings', price: 34.99, trendScore: 83 }
        ],
        platform: 'amazon'
      };

      mockAxios.post.mockResolvedValue({ status: 200 });

      await service.sendScrapingNotification(scrapingData);

      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/test/webhook/url',
        {
          text: '🛒 Product Scraping Complete',
          blocks: [{
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*amazon Product Scraping Results*\n' +
                    'Products scraped: 3\n\n' +
                    '*Top Products:*\n' +
                    '• Premium Wellness Device for Personal Health Ca... - $89.99 (Score: 92)\n' +
                    '• Intimate Health Product - Discreet Packaging... - $49.99 (Score: 87)\n' +
                    '• Personal Care Massage Tool with Multiple Sett... - $34.99 (Score: 83)'
            }
          }]
        },
        expect.any(Object)
      );

      expect(logger.info).toHaveBeenCalledWith('Scraping notification sent successfully');
    });

    it('should truncate long product titles correctly', async () => {
      const scrapingData: ScrapingNotification = {
        productCount: 1,
        topProducts: [
          { 
            title: 'This is a very long product title that exceeds fifty characters and should be truncated',
            price: 29.99,
            trendScore: 75
          }
        ],
        platform: 'amazon'
      };

      mockAxios.post.mockResolvedValue({ status: 200 });

      await service.sendScrapingNotification(scrapingData);

      const expectedTruncated = 'This is a very long product title that exceeds f...';
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          blocks: [{
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: expect.stringContaining(expectedTruncated)
            }
          }]
        }),
        expect.any(Object)
      );
    });

    it('should handle scraping notification with no products', async () => {
      const scrapingData: ScrapingNotification = {
        productCount: 0,
        topProducts: [],
        platform: 'amazon'
      };

      mockAxios.post.mockResolvedValue({ status: 200 });

      await service.sendScrapingNotification(scrapingData);

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          blocks: [{
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: expect.stringContaining('Products scraped: 0')
            }
          }]
        }),
        expect.any(Object)
      );
    });

    it('should handle scraping notification errors', async () => {
      const scrapingData: ScrapingNotification = {
        productCount: 1,
        topProducts: [{ title: 'Test Product', price: 29.99, trendScore: 80 }],
        platform: 'amazon'
      };

      const webhookError = new Error('Network timeout');
      mockAxios.post.mockRejectedValue(webhookError);

      await service.sendScrapingNotification(scrapingData);

      expect(logger.error).toHaveBeenCalledWith('Error sending scraping notification:', webhookError);
    });
  });

  describe('Social Media Notifications', () => {
    it('should send social media notification with hashtag details', async () => {
      const socialData: SocialMediaNotification = {
        trendCount: 4,
        topHashtags: [
          { hashtag: '#wellness', platform: 'instagram', trendScore: 88 },
          { hashtag: '#selfcare', platform: 'tiktok', trendScore: 82 },
          { hashtag: '#health', platform: 'instagram', trendScore: 79 },
          { hashtag: '#personalcare', platform: 'tiktok', trendScore: 76 }
        ]
      };

      mockAxios.post.mockResolvedValue({ status: 200 });

      await service.sendSocialMediaNotification(socialData);

      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/test/webhook/url',
        {
          text: '📱 Social Media Analysis Complete',
          blocks: [{
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Social Media Trend Analysis Results*\n' +
                    'Trends found: 4\n\n' +
                    '*Top Hashtags:*\n' +
                    '• #wellness (instagram) - Score: 88\n' +
                    '• #selfcare (tiktok) - Score: 82\n' +
                    '• #health (instagram) - Score: 79\n' +
                    '• #personalcare (tiktok) - Score: 76'
            }
          }]
        },
        expect.any(Object)
      );

      expect(logger.info).toHaveBeenCalledWith('Social media notification sent successfully');
    });

    it('should handle social media notification with no trends', async () => {
      const socialData: SocialMediaNotification = {
        trendCount: 0,
        topHashtags: []
      };

      mockAxios.post.mockResolvedValue({ status: 200 });

      await service.sendSocialMediaNotification(socialData);

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          blocks: [{
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: expect.stringContaining('Trends found: 0')
            }
          }]
        }),
        expect.any(Object)
      );
    });

    it('should handle social media notification errors', async () => {
      const socialData: SocialMediaNotification = {
        trendCount: 1,
        topHashtags: [{ hashtag: '#test', platform: 'instagram', trendScore: 70 }]
      };

      const webhookError = new Error('Invalid webhook URL');
      mockAxios.post.mockRejectedValue(webhookError);

      await service.sendSocialMediaNotification(socialData);

      expect(logger.error).toHaveBeenCalledWith('Error sending social media notification:', webhookError);
    });
  });

  describe('Pipeline Complete Notifications', () => {
    it('should send pipeline complete notification with comprehensive results', async () => {
      const result = {
        googleTrends: {
          keywords: [
            { keyword: 'wellness', score: 85 },
            { keyword: 'health', score: 78 }
          ]
        },
        socialMediaTrends: [
          { hashtag: '#wellness', platform: 'instagram', trendScore: 88 },
          { hashtag: '#health', platform: 'tiktok', trendScore: 82 }
        ],
        productOpportunities: [
          { title: 'Product 1', price: 29.99, trendScore: 85 },
          { title: 'Product 2', price: 49.99, trendScore: 80 },
          { title: 'Product 3', price: 39.99, trendScore: 75 }
        ],
        recommendations: [
          'Focus on high-scoring wellness trends',
          'Leverage trending social hashtags',
          'Consider dropshipping opportunities'
        ]
      };

      mockAxios.post.mockResolvedValue({ status: 200 });

      await service.sendPipelineCompleteNotification(result);

      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/test/webhook/url',
        {
          text: '✅ Full Automation Pipeline Complete',
          blocks: [{
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Automation Pipeline Results*\n' +
                    '• Google trends: 2 keywords\n' +
                    '• Social trends: 2 hashtags\n' +
                    '• Products found: 3\n' +
                    '• Recommendations: 3\n\n' +
                    '*Top Recommendations:*\n' +
                    '• Focus on high-scoring wellness trends\n' +
                    '• Leverage trending social hashtags\n' +
                    '• Consider dropshipping opportunities'
            }
          }]
        },
        expect.any(Object)
      );

      expect(logger.info).toHaveBeenCalledWith('Pipeline completion notification sent successfully');
    });

    it('should handle pipeline notification with empty results', async () => {
      const result = {
        googleTrends: { keywords: [] },
        socialMediaTrends: [],
        productOpportunities: [],
        recommendations: []
      };

      mockAxios.post.mockResolvedValue({ status: 200 });

      await service.sendPipelineCompleteNotification(result);

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          blocks: [{
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: expect.stringContaining('• Google trends: 0 keywords\n' +
                                           '• Social trends: 0 hashtags\n' +
                                           '• Products found: 0\n' +
                                           '• Recommendations: 0')
            }
          }]
        }),
        expect.any(Object)
      );
    });

    it('should handle pipeline notification errors', async () => {
      const result = {
        googleTrends: { keywords: [] },
        socialMediaTrends: [],
        productOpportunities: [],
        recommendations: []
      };

      const webhookError = new Error('Webhook service unavailable');
      mockAxios.post.mockRejectedValue(webhookError);

      await service.sendPipelineCompleteNotification(result);

      expect(logger.error).toHaveBeenCalledWith('Error sending pipeline completion notification:', webhookError);
    });
  });

  describe('Error Notifications', () => {
    it('should send error notification with service and error details', async () => {
      const serviceName = 'Google Trends Analysis';
      const error = new Error('API quota exceeded');

      mockAxios.post.mockResolvedValue({ status: 200 });

      await service.sendErrorNotification(serviceName, error);

      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/test/webhook/url',
        {
          text: '🚨 Automation Error Alert',
          blocks: [{
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Error in Google Trends Analysis*\n' +
                    'Error: API quota exceeded\n' +
                    `Time: ${expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)}`
            }
          }]
        },
        expect.any(Object)
      );

      expect(logger.info).toHaveBeenCalledWith('Error notification sent successfully');
    });

    it('should handle error notification without error message', async () => {
      const serviceName = 'Test Service';
      const error = {} as Error; // Error without message

      mockAxios.post.mockResolvedValue({ status: 200 });

      await service.sendErrorNotification(serviceName, error);

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          blocks: [{
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: expect.stringContaining('Error: Unknown error')
            }
          }]
        }),
        expect.any(Object)
      );
    });

    it('should handle error notification sending failure', async () => {
      const serviceName = 'Test Service';
      const originalError = new Error('Original error');
      const notificationError = new Error('Notification failed');

      mockAxios.post.mockRejectedValue(notificationError);

      await service.sendErrorNotification(serviceName, originalError);

      expect(logger.error).toHaveBeenCalledWith('Error sending error notification:', notificationError);
    });
  });

  describe('Health Alerts', () => {
    it('should send health alert for unhealthy status', async () => {
      const healthStatus = {
        healthy: false,
        services: {
          googleTrends: 'operational',
          amazonScraper: 'error',
          socialMedia: 'operational'
        },
        timestamp: new Date('2023-01-01T12:00:00Z')
      };

      mockAxios.post.mockResolvedValue({ status: 200 });

      await service.sendHealthAlert(healthStatus);

      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/test/webhook/url',
        {
          text: '⚠️ Health Alert',
          blocks: [{
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*System Health Alert*\n' +
                    'Overall status: ❌ Unhealthy\n\n' +
                    '*Service Status:*\n' +
                    '• googleTrends: operational\n' +
                    '• amazonScraper: error\n' +
                    '• socialMedia: operational\n\n' +
                    'Time: Sun Jan 01 2023 12:00:00 GMT+0000 (Coordinated Universal Time)'
            }
          }]
        },
        expect.any(Object)
      );

      expect(logger.info).toHaveBeenCalledWith('Health alert sent successfully');
    });

    it('should send health alert for healthy status', async () => {
      const healthStatus = {
        healthy: true,
        services: {
          googleTrends: 'operational',
          amazonScraper: 'operational',
          socialMedia: 'operational'
        },
        timestamp: new Date('2023-01-01T12:00:00Z')
      };

      mockAxios.post.mockResolvedValue({ status: 200 });

      await service.sendHealthAlert(healthStatus);

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          blocks: [{
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: expect.stringContaining('Overall status: ✅ Healthy')
            }
          }]
        }),
        expect.any(Object)
      );
    });

    it('should handle health alert errors', async () => {
      const healthStatus = {
        healthy: false,
        services: {},
        timestamp: new Date()
      };

      const webhookError = new Error('Health alert failed');
      mockAxios.post.mockRejectedValue(webhookError);

      await service.sendHealthAlert(healthStatus);

      expect(logger.error).toHaveBeenCalledWith('Error sending health alert:', webhookError);
    });
  });

  describe('Daily Summary Notifications', () => {
    it('should send daily summary with comprehensive metrics', async () => {
      const summary = {
        trendsAnalyzed: 15,
        socialTrends: 8,
        productsScraped: 42,
        newOpportunities: 12,
        totalRuntime: '2h 15m',
        successRate: 95.5
      };

      mockAxios.post.mockResolvedValue({ status: 200 });

      await service.sendDailySummary(summary);

      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/test/webhook/url',
        {
          text: '📊 Daily Automation Summary',
          blocks: [{
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Daily Summary - ${new Date().toDateString()}*\n\n` +
                    '🔍 *Trend Analysis:*\n' +
                    '• Google trends analyzed: 15\n' +
                    '• Social media trends: 8\n\n' +
                    '🛒 *Product Scraping:*\n' +
                    '• Products scraped: 42\n' +
                    '• New opportunities: 12\n\n' +
                    '📈 *Performance:*\n' +
                    '• Total runtime: 2h 15m\n' +
                    '• Success rate: 95.5%'
            }
          }]
        },
        expect.any(Object)
      );

      expect(logger.info).toHaveBeenCalledWith('Daily summary sent successfully');
    });

    it('should handle daily summary with missing metrics', async () => {
      const summary = {}; // Empty summary

      mockAxios.post.mockResolvedValue({ status: 200 });

      await service.sendDailySummary(summary);

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          blocks: [{
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: expect.stringContaining('• Google trends analyzed: 0\n' +
                                           '• Social media trends: 0\n' +
                                           '• Products scraped: 0\n' +
                                           '• New opportunities: 0\n' +
                                           '• Total runtime: N/A\n' +
                                           '• Success rate: N/A%')
            }
          }]
        }),
        expect.any(Object)
      );
    });

    it('should handle daily summary errors', async () => {
      const summary = { trendsAnalyzed: 5 };
      const webhookError = new Error('Daily summary failed');
      mockAxios.post.mockRejectedValue(webhookError);

      await service.sendDailySummary(summary);

      expect(logger.error).toHaveBeenCalledWith('Error sending daily summary:', webhookError);
    });
  });

  describe('Test Notifications', () => {
    it('should send test notification successfully', async () => {
      mockAxios.post.mockResolvedValue({ status: 200 });

      await service.testNotification();

      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/test/webhook/url',
        {
          text: '🧪 Notification Test',
          blocks: [{
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Notification System Test*\n' +
                    'This is a test notification from the Heaven Dolls automation system.\n' +
                    `Time: ${expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)}\n` +
                    'Status: ✅ Working correctly'
            }
          }]
        },
        expect.any(Object)
      );

      expect(logger.info).toHaveBeenCalledWith('Test notification sent successfully');
    });

    it('should handle test notification failures', async () => {
      const testError = new Error('Test notification failed');
      mockAxios.post.mockRejectedValue(testError);

      await expect(service.testNotification()).rejects.toThrow('Test notification failed');
      expect(logger.error).toHaveBeenCalledWith('Test notification failed:', testError);
    });
  });

  describe('Webhook Communication', () => {
    it('should use correct timeout for webhook requests', async () => {
      mockAxios.post.mockResolvedValue({ status: 200 });

      await service['sendWebhook']({ test: 'message' });

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          timeout: 5000
        })
      );
    });

    it('should use correct headers for webhook requests', async () => {
      mockAxios.post.mockResolvedValue({ status: 200 });

      await service['sendWebhook']({ test: 'message' });

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );
    });

    it('should handle webhook URL not configured', async () => {
      delete process.env.WEBHOOK_URL;
      const unconfiguredService = new NotificationService();

      await unconfiguredService['sendWebhook']({ test: 'message' });

      expect(mockAxios.post).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('Webhook URL not configured, skipping notification');
    });

    it('should handle webhook timeout errors', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded'
      };
      mockAxios.post.mockRejectedValue(timeoutError);

      await expect(service['sendWebhook']({ test: 'message' })).rejects.toThrow();
      expect(logger.error).toHaveBeenCalledWith('Error sending webhook:', timeoutError);
    });

    it('should handle webhook network errors', async () => {
      const networkError = {
        code: 'ENOTFOUND',
        message: 'getaddrinfo ENOTFOUND hooks.slack.com'
      };
      mockAxios.post.mockRejectedValue(networkError);

      await expect(service['sendWebhook']({ test: 'message' })).rejects.toThrow();
      expect(logger.error).toHaveBeenCalledWith('Error sending webhook:', networkError);
    });

    it('should handle webhook HTTP errors', async () => {
      const httpError = {
        response: {
          status: 400,
          data: { error: 'invalid_payload' }
        },
        message: 'Request failed with status code 400'
      };
      mockAxios.post.mockRejectedValue(httpError);

      await expect(service['sendWebhook']({ test: 'message' })).rejects.toThrow();
      expect(logger.error).toHaveBeenCalledWith('Error sending webhook:', httpError);
    });
  });

  describe('Message Formatting', () => {
    it('should format large numbers correctly in notifications', async () => {
      const scrapingData: ScrapingNotification = {
        productCount: 1234,
        topProducts: [
          { title: 'Product', price: 1299.99, trendScore: 99 }
        ],
        platform: 'amazon'
      };

      mockAxios.post.mockResolvedValue({ status: 200 });

      await service.sendScrapingNotification(scrapingData);

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          blocks: [{
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: expect.stringContaining('Products scraped: 1234')
            }
          }]
        }),
        expect.any(Object)
      );
    });

    it('should handle special characters in messages', async () => {
      const trendData: TrendNotification = {
        type: 'google_trends',
        keywordCount: 2,
        topKeywords: ['wellness & health', 'self-care/personal'],
        averageScore: 80.5
      };

      mockAxios.post.mockResolvedValue({ status: 200 });

      await service.sendTrendNotification(trendData);

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          blocks: [{
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: expect.stringContaining('wellness & health, self-care/personal')
            }
          }]
        }),
        expect.any(Object)
      );
    });

    it('should handle emojis in product titles', async () => {
      const scrapingData: ScrapingNotification = {
        productCount: 1,
        topProducts: [
          { title: '🌟 Premium Wellness Device 💖', price: 49.99, trendScore: 85 }
        ],
        platform: 'amazon'
      };

      mockAxios.post.mockResolvedValue({ status: 200 });

      await service.sendScrapingNotification(scrapingData);

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          blocks: [{
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: expect.stringContaining('🌟 Premium Wellness Device 💖...')
            }
          }]
        }),
        expect.any(Object)
      );
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle multiple concurrent notifications', async () => {
      mockAxios.post.mockResolvedValue({ status: 200 });

      const notifications = [
        service.sendTrendNotification({
          type: 'google_trends',
          keywordCount: 1,
          topKeywords: ['test1'],
          averageScore: 80
        }),
        service.sendScrapingNotification({
          productCount: 1,
          topProducts: [{ title: 'Test Product', price: 29.99, trendScore: 75 }],
          platform: 'amazon'
        }),
        service.sendSocialMediaNotification({
          trendCount: 1,
          topHashtags: [{ hashtag: '#test', platform: 'instagram', trendScore: 70 }]
        })
      ];

      await Promise.all(notifications);

      expect(mockAxios.post).toHaveBeenCalledTimes(3);
      expect(logger.info).toHaveBeenCalledTimes(3);
    });

    it('should handle notification sending delays', async () => {
      // Simulate slow webhook response
      mockAxios.post.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ status: 200 }), 100))
      );

      const startTime = Date.now();
      
      await service.sendTrendNotification({
        type: 'google_trends',
        keywordCount: 1,
        topKeywords: ['test'],
        averageScore: 80
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeGreaterThanOrEqual(100);
    });

    it('should retry failed notifications gracefully', async () => {
      // First call fails, subsequent calls succeed
      mockAxios.post
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValue({ status: 200 });

      const trendData: TrendNotification = {
        type: 'google_trends',
        keywordCount: 1,
        topKeywords: ['test'],
        averageScore: 80
      };

      // First attempt should fail
      await service.sendTrendNotification(trendData);
      expect(logger.error).toHaveBeenCalledWith('Error sending trend notification:', expect.any(Error));

      // Second attempt should succeed
      await service.sendTrendNotification(trendData);
      expect(logger.info).toHaveBeenCalledWith('Trend notification sent successfully');
    });
  });
});