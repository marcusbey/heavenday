import { IgApiClient } from 'instagram-private-api';
import TikTokScraper from 'tiktok-scraper';
import { logger } from '../utils/logger';
import { SocialMediaTrend } from '../types/trends';

// Configuration for adult product hashtags
const ADULT_PRODUCT_HASHTAGS = [
  'adultcare',
  'intimatehealth',
  'personalwellness',
  'selfcare',
  'wellnessjuourney',
  'healthylifestyle',
  'personalcare',
  'intimateproducts',
  'wellness',
  'selfconfidence'
];

export class SocialMediaTrendsService {
  private igClient: IgApiClient | null = null;
  private rateLimitDelay: number;

  constructor() {
    this.rateLimitDelay = parseInt(process.env.SCRAPING_DELAY_MS || '5000');
  }

  /**
   * Initialize Instagram client
   */
  async initializeInstagram(): Promise<void> {
    try {
      if (!process.env.INSTAGRAM_USERNAME || !process.env.INSTAGRAM_PASSWORD) {
        throw new Error('Instagram credentials not provided');
      }

      this.igClient = new IgApiClient();
      this.igClient.state.generateDevice(process.env.INSTAGRAM_USERNAME);

      await this.igClient.account.login(
        process.env.INSTAGRAM_USERNAME,
        process.env.INSTAGRAM_PASSWORD
      );

      logger.info('Instagram client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Instagram client:', error);
      throw error;
    }
  }

  /**
   * Get trending hashtags from Instagram
   */
  async getInstagramTrends(): Promise<SocialMediaTrend[]> {
    if (!this.igClient) {
      await this.initializeInstagram();
    }

    const trends: SocialMediaTrend[] = [];

    try {
      for (const hashtag of ADULT_PRODUCT_HASHTAGS) {
        try {
          await this.delay(this.rateLimitDelay);

          const hashtagFeed = this.igClient!.feed.tags(hashtag);
          const posts = await hashtagFeed.items();

          if (posts && posts.length > 0) {
            const postCount = posts.length;
            const totalLikes = posts.reduce((sum, post) => sum + (post.like_count || 0), 0);
            const totalComments = posts.reduce((sum, post) => sum + (post.comment_count || 0), 0);
            
            const engagementRate = postCount > 0 ? (totalLikes + totalComments) / postCount : 0;
            const trendScore = this.calculateSocialTrendScore(postCount, engagementRate, 'instagram');

            // Extract related products from captions
            const relatedProducts = this.extractProductMentions(posts);

            trends.push({
              platform: 'instagram',
              hashtag: `#${hashtag}`,
              postCount,
              engagementRate,
              trendScore,
              relatedProducts,
              scrapedAt: new Date()
            });

            logger.info(`Instagram trend for #${hashtag}: ${postCount} posts, score: ${trendScore}`);
          }
        } catch (error) {
          logger.error(`Error fetching Instagram data for #${hashtag}:`, error);
        }
      }

      return trends.sort((a, b) => b.trendScore - a.trendScore);
    } catch (error) {
      logger.error('Error fetching Instagram trends:', error);
      throw error;
    }
  }

  /**
   * Get trending hashtags from TikTok
   */
  async getTikTokTrends(): Promise<SocialMediaTrend[]> {
    const trends: SocialMediaTrend[] = [];

    try {
      for (const hashtag of ADULT_PRODUCT_HASHTAGS) {
        try {
          await this.delay(this.rateLimitDelay);

          const hashtagData = await TikTokScraper.hashtag(hashtag, {
            number: 50, // Limit to 50 posts per hashtag
            sessionList: process.env.TIKTOK_SESSION_ID ? [process.env.TIKTOK_SESSION_ID] : undefined
          });

          if (hashtagData && hashtagData.collector && hashtagData.collector.length > 0) {
            const posts = hashtagData.collector;
            const postCount = posts.length;
            const totalViews = posts.reduce((sum, post) => sum + (post.playCount || 0), 0);
            const totalLikes = posts.reduce((sum, post) => sum + (post.diggCount || 0), 0);
            const totalShares = posts.reduce((sum, post) => sum + (post.shareCount || 0), 0);
            
            const engagementRate = postCount > 0 ? (totalLikes + totalShares) / totalViews * 100 : 0;
            const trendScore = this.calculateSocialTrendScore(postCount, engagementRate, 'tiktok', totalViews);

            // Extract related products from descriptions
            const relatedProducts = this.extractProductMentionsFromTikTok(posts);

            trends.push({
              platform: 'tiktok',
              hashtag: `#${hashtag}`,
              postCount,
              engagementRate,
              trendScore,
              relatedProducts,
              scrapedAt: new Date()
            });

            logger.info(`TikTok trend for #${hashtag}: ${postCount} posts, score: ${trendScore}`);
          }
        } catch (error) {
          logger.error(`Error fetching TikTok data for #${hashtag}:`, error);
        }
      }

      return trends.sort((a, b) => b.trendScore - a.trendScore);
    } catch (error) {
      logger.error('Error fetching TikTok trends:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive social media trend analysis
   */
  async getComprehensiveSocialTrends(): Promise<SocialMediaTrend[]> {
    try {
      logger.info('Starting comprehensive social media trend analysis');

      const [instagramTrends, tiktokTrends] = await Promise.allSettled([
        this.getInstagramTrends(),
        this.getTikTokTrends()
      ]);

      const allTrends: SocialMediaTrend[] = [];

      if (instagramTrends.status === 'fulfilled') {
        allTrends.push(...instagramTrends.value);
      } else {
        logger.error('Instagram trends failed:', instagramTrends.reason);
      }

      if (tiktokTrends.status === 'fulfilled') {
        allTrends.push(...tiktokTrends.value);
      } else {
        logger.error('TikTok trends failed:', tiktokTrends.reason);
      }

      logger.info(`Social media trend analysis complete. Found ${allTrends.length} trends`);
      return allTrends.sort((a, b) => b.trendScore - a.trendScore);
    } catch (error) {
      logger.error('Error in comprehensive social trend analysis:', error);
      throw error;
    }
  }

  /**
   * Calculate trend score for social media data
   */
  private calculateSocialTrendScore(
    postCount: number,
    engagementRate: number,
    platform: 'instagram' | 'tiktok',
    totalViews?: number
  ): number {
    const postCountWeight = 0.4;
    const engagementWeight = 0.4;
    const viewWeight = 0.2;

    const normalizedPostCount = Math.min(postCount / 100, 1);
    const normalizedEngagement = Math.min(engagementRate / 10, 1);
    
    let score = (normalizedPostCount * postCountWeight + normalizedEngagement * engagementWeight) * 100;

    // Add view bonus for TikTok
    if (platform === 'tiktok' && totalViews) {
      const normalizedViews = Math.min(totalViews / 1000000, 1); // Normalize by 1M views
      score += normalizedViews * viewWeight * 100;
    }

    return Math.round(Math.min(score, 100));
  }

  /**
   * Extract product mentions from Instagram posts
   */
  private extractProductMentions(posts: any[]): string[] {
    const productMentions = new Set<string>();
    const productKeywords = [
      'product', 'item', 'toy', 'device', 'accessory', 'kit',
      'wellness', 'care', 'health', 'intimate', 'personal'
    ];

    posts.forEach(post => {
      if (post.caption && post.caption.text) {
        const caption = post.caption.text.toLowerCase();
        productKeywords.forEach(keyword => {
          if (caption.includes(keyword)) {
            // Extract surrounding context
            const index = caption.indexOf(keyword);
            const start = Math.max(0, index - 20);
            const end = Math.min(caption.length, index + 20);
            const context = caption.substring(start, end);
            
            // Simple product name extraction (this could be improved with NLP)
            const words = context.split(/\s+/);
            const keywordIndex = words.findIndex(w => w.includes(keyword));
            if (keywordIndex >= 0 && keywordIndex < words.length - 1) {
              productMentions.add(words.slice(keywordIndex, keywordIndex + 2).join(' '));
            }
          }
        });
      }
    });

    return Array.from(productMentions).slice(0, 10);
  }

  /**
   * Extract product mentions from TikTok posts
   */
  private extractProductMentionsFromTikTok(posts: any[]): string[] {
    const productMentions = new Set<string>();
    const productKeywords = [
      'product', 'item', 'toy', 'device', 'accessory', 'kit',
      'wellness', 'care', 'health', 'intimate', 'personal'
    ];

    posts.forEach(post => {
      if (post.text) {
        const text = post.text.toLowerCase();
        productKeywords.forEach(keyword => {
          if (text.includes(keyword)) {
            const index = text.indexOf(keyword);
            const start = Math.max(0, index - 15);
            const end = Math.min(text.length, index + 15);
            const context = text.substring(start, end);
            
            const words = context.split(/\s+/);
            const keywordIndex = words.findIndex(w => w.includes(keyword));
            if (keywordIndex >= 0 && keywordIndex < words.length - 1) {
              productMentions.add(words.slice(keywordIndex, keywordIndex + 2).join(' '));
            }
          }
        });
      }
    });

    return Array.from(productMentions).slice(0, 10);
  }

  /**
   * Analyze hashtag performance over time
   */
  async analyzeHashtagPerformance(hashtag: string, days: number = 7): Promise<any> {
    try {
      // This would implement time-series analysis of hashtag performance
      logger.info(`Analyzing performance for ${hashtag} over ${days} days`);
      
      // Implementation would track engagement, post frequency, and growth
      return {
        hashtag,
        period: days,
        averageEngagement: 0,
        growthRate: 0,
        peakDays: [],
        recommendation: 'neutral'
      };
    } catch (error) {
      logger.error(`Error analyzing hashtag performance for ${hashtag}:`, error);
      throw error;
    }
  }

  /**
   * Rate limiting delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const socialMediaTrendsService = new SocialMediaTrendsService();

// CLI execution
if (require.main === module) {
  const service = new SocialMediaTrendsService();
  
  service.getComprehensiveSocialTrends()
    .then(trends => {
      logger.info(`Found ${trends.length} social media trends`);
      console.log(JSON.stringify(trends.slice(0, 5), null, 2));
    })
    .catch(logger.error);
}