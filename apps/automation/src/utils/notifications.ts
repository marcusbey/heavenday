import axios from 'axios';
import { logger } from './logger';

export interface TrendNotification {
  type: 'google_trends';
  keywordCount: number;
  topKeywords: string[];
  averageScore: number;
}

export interface ScrapingNotification {
  productCount: number;
  topProducts: Array<{
    title: string;
    price: number;
    trendScore: number;
  }>;
  platform: string;
}

export interface SocialMediaNotification {
  trendCount: number;
  topHashtags: Array<{
    hashtag: string;
    platform: string;
    trendScore: number;
  }>;
}

export class NotificationService {
  private webhookUrl: string;
  private enabled: boolean;

  constructor() {
    this.webhookUrl = process.env.WEBHOOK_URL || '';
    this.enabled = !!this.webhookUrl;
  }

  /**
   * Send trend analysis notification
   */
  async sendTrendNotification(data: TrendNotification): Promise<void> {
    if (!this.enabled) return;

    try {
      const message = {
        text: `📈 Google Trends Analysis Complete`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Google Trends Analysis Results*\n` +
                    `• Keywords found: ${data.keywordCount}\n` +
                    `• Average score: ${data.averageScore.toFixed(1)}\n` +
                    `• Top keywords: ${data.topKeywords.join(', ')}`
            }
          }
        ]
      };

      await this.sendWebhook(message);
      logger.info('Trend notification sent successfully');
    } catch (error) {
      logger.error('Error sending trend notification:', error);
    }
  }

  /**
   * Send product scraping notification
   */
  async sendScrapingNotification(data: ScrapingNotification): Promise<void> {
    if (!this.enabled) return;

    try {
      const topProductsList = data.topProducts
        .map(p => `• ${p.title.substring(0, 50)}... - $${p.price} (Score: ${p.trendScore})`)
        .join('\n');

      const message = {
        text: `🛒 Product Scraping Complete`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${data.platform} Product Scraping Results*\n` +
                    `Products scraped: ${data.productCount}\n\n` +
                    `*Top Products:*\n${topProductsList}`
            }
          }
        ]
      };

      await this.sendWebhook(message);
      logger.info('Scraping notification sent successfully');
    } catch (error) {
      logger.error('Error sending scraping notification:', error);
    }
  }

  /**
   * Send social media trends notification
   */
  async sendSocialMediaNotification(data: SocialMediaNotification): Promise<void> {
    if (!this.enabled) return;

    try {
      const hashtagsList = data.topHashtags
        .map(h => `• ${h.hashtag} (${h.platform}) - Score: ${h.trendScore}`)
        .join('\n');

      const message = {
        text: `📱 Social Media Analysis Complete`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Social Media Trend Analysis Results*\n` +
                    `Trends found: ${data.trendCount}\n\n` +
                    `*Top Hashtags:*\n${hashtagsList}`
            }
          }
        ]
      };

      await this.sendWebhook(message);
      logger.info('Social media notification sent successfully');
    } catch (error) {
      logger.error('Error sending social media notification:', error);
    }
  }

  /**
   * Send full pipeline completion notification
   */
  async sendPipelineCompleteNotification(result: any): Promise<void> {
    if (!this.enabled) return;

    try {
      const message = {
        text: `✅ Full Automation Pipeline Complete`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Automation Pipeline Results*\n` +
                    `• Google trends: ${result.googleTrends.keywords.length} keywords\n` +
                    `• Social trends: ${result.socialMediaTrends.length} hashtags\n` +
                    `• Products found: ${result.productOpportunities.length}\n` +
                    `• Recommendations: ${result.recommendations.length}\n\n` +
                    `*Top Recommendations:*\n${result.recommendations.slice(0, 3).map((r: string) => `• ${r}`).join('\n')}`
            }
          }
        ]
      };

      await this.sendWebhook(message);
      logger.info('Pipeline completion notification sent successfully');
    } catch (error) {
      logger.error('Error sending pipeline completion notification:', error);
    }
  }

  /**
   * Send error notification
   */
  async sendErrorNotification(service: string, error: any): Promise<void> {
    if (!this.enabled) return;

    try {
      const message = {
        text: `🚨 Automation Error Alert`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Error in ${service}*\n` +
                    `Error: ${error.message || 'Unknown error'}\n` +
                    `Time: ${new Date().toISOString()}`
            }
          }
        ]
      };

      await this.sendWebhook(message);
      logger.info('Error notification sent successfully');
    } catch (notificationError) {
      logger.error('Error sending error notification:', notificationError);
    }
  }

  /**
   * Send health alert
   */
  async sendHealthAlert(healthStatus: any): Promise<void> {
    if (!this.enabled) return;

    try {
      const serviceStatus = Object.entries(healthStatus.services)
        .map(([service, status]) => `• ${service}: ${status}`)
        .join('\n');

      const message = {
        text: `⚠️ Health Alert`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*System Health Alert*\n` +
                    `Overall status: ${healthStatus.healthy ? '✅ Healthy' : '❌ Unhealthy'}\n\n` +
                    `*Service Status:*\n${serviceStatus}\n\n` +
                    `Time: ${healthStatus.timestamp}`
            }
          }
        ]
      };

      await this.sendWebhook(message);
      logger.info('Health alert sent successfully');
    } catch (error) {
      logger.error('Error sending health alert:', error);
    }
  }

  /**
   * Send daily summary
   */
  async sendDailySummary(summary: any): Promise<void> {
    if (!this.enabled) return;

    try {
      const message = {
        text: `📊 Daily Automation Summary`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Daily Summary - ${new Date().toDateString()}*\n\n` +
                    `🔍 *Trend Analysis:*\n` +
                    `• Google trends analyzed: ${summary.trendsAnalyzed || 0}\n` +
                    `• Social media trends: ${summary.socialTrends || 0}\n\n` +
                    `🛒 *Product Scraping:*\n` +
                    `• Products scraped: ${summary.productsScraped || 0}\n` +
                    `• New opportunities: ${summary.newOpportunities || 0}\n\n` +
                    `📈 *Performance:*\n` +
                    `• Total runtime: ${summary.totalRuntime || 'N/A'}\n` +
                    `• Success rate: ${summary.successRate || 'N/A'}%`
            }
          }
        ]
      };

      await this.sendWebhook(message);
      logger.info('Daily summary sent successfully');
    } catch (error) {
      logger.error('Error sending daily summary:', error);
    }
  }

  /**
   * Send webhook message
   */
  private async sendWebhook(message: any): Promise<void> {
    if (!this.webhookUrl) {
      logger.warn('Webhook URL not configured, skipping notification');
      return;
    }

    try {
      await axios.post(this.webhookUrl, message, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
    } catch (error) {
      logger.error('Error sending webhook:', error);
      throw error;
    }
  }

  /**
   * Test notification system
   */
  async testNotification(): Promise<void> {
    try {
      const message = {
        text: `🧪 Notification Test`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Notification System Test*\n` +
                    `This is a test notification from the Heaven Dolls automation system.\n` +
                    `Time: ${new Date().toISOString()}\n` +
                    `Status: ✅ Working correctly`
            }
          }
        ]
      };

      await this.sendWebhook(message);
      logger.info('Test notification sent successfully');
    } catch (error) {
      logger.error('Test notification failed:', error);
      throw error;
    }
  }
}