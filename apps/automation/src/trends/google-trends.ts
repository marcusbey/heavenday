import googleTrends from 'google-trends-api';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { TrendData, TrendKeyword, GeographicTrend } from '../types/trends';

// Validation schemas
const TrendResultSchema = z.object({
  keyword: z.string(),
  score: z.number(),
  geo: z.string().optional(),
  time: z.string().optional(),
  relatedQueries: z.array(z.string()).optional(),
});

// Configuration for adult product categories
const ADULT_PRODUCT_CATEGORIES = [
  'adult toys',
  'intimate products',
  'personal care',
  'wellness products',
  'bedroom accessories',
  'couples products',
  'health wellness'
];

export class GoogleTrendsService {
  private minTrendScore: number;
  private maxProductsPerTrend: number;
  private rateLimitDelay: number;

  constructor() {
    this.minTrendScore = parseInt(process.env.MIN_TREND_SCORE || '50');
    this.maxProductsPerTrend = parseInt(process.env.MAX_PRODUCTS_PER_TREND || '20');
    this.rateLimitDelay = parseInt(process.env.SCRAPING_DELAY_MS || '2000');
  }

  /**
   * Get trending keywords for adult product categories
   */
  async getTrendingKeywords(geo: string = 'US', timeframe: string = 'today 1-m'): Promise<TrendKeyword[]> {
    try {
      logger.info(`Fetching trending keywords for geo: ${geo}, timeframe: ${timeframe}`);
      
      const trendingKeywords: TrendKeyword[] = [];

      for (const category of ADULT_PRODUCT_CATEGORIES) {
        try {
          await this.delay(this.rateLimitDelay);
          
          const results = await googleTrends.interestOverTime({
            keyword: category,
            startTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            endTime: new Date(),
            geo: geo,
          });

          const parsedResults = JSON.parse(results);
          const timelineData = parsedResults.default?.timelineData || [];

          if (timelineData.length > 0) {
            const latestData = timelineData[timelineData.length - 1];
            const score = latestData.value?.[0] || 0;

            if (score >= this.minTrendScore) {
              // Get related queries for this trending keyword
              const relatedQueries = await this.getRelatedQueries(category, geo);
              
              trendingKeywords.push({
                keyword: category,
                score,
                geo,
                timestamp: new Date(),
                relatedQueries,
                category: 'adult-products'
              });

              logger.info(`Found trending keyword: ${category} with score: ${score}`);
            }
          }
        } catch (error) {
          logger.error(`Error fetching trends for category ${category}:`, error);
        }
      }

      return trendingKeywords.sort((a, b) => b.score - a.score);
    } catch (error) {
      logger.error('Error fetching trending keywords:', error);
      throw error;
    }
  }

  /**
   * Get related queries for a specific keyword
   */
  async getRelatedQueries(keyword: string, geo: string = 'US'): Promise<string[]> {
    try {
      await this.delay(this.rateLimitDelay);
      
      const results = await googleTrends.relatedQueries({
        keyword,
        startTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endTime: new Date(),
        geo,
      });

      const parsedResults = JSON.parse(results);
      const relatedQueries = parsedResults.default?.rankedList?.[0]?.rankedKeyword || [];
      
      return relatedQueries
        .slice(0, 10) // Limit to top 10 related queries
        .map((item: any) => item.query)
        .filter((query: string) => this.isRelevantQuery(query));
    } catch (error) {
      logger.warn(`Could not fetch related queries for ${keyword}:`, error);
      return [];
    }
  }

  /**
   * Analyze trend data for geographic distribution
   */
  async getGeographicTrends(keyword: string, timeframe: string = 'today 1-m'): Promise<GeographicTrend[]> {
    try {
      await this.delay(this.rateLimitDelay);
      
      const results = await googleTrends.interestByRegion({
        keyword,
        startTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endTime: new Date(),
      });

      const parsedResults = JSON.parse(results);
      const geoMapData = parsedResults.default?.geoMapData || [];

      return geoMapData
        .filter((item: any) => item.value?.[0] >= this.minTrendScore)
        .map((item: any) => ({
          geo: item.geoCode,
          geoName: item.geoName,
          score: item.value[0],
          keyword
        }))
        .sort((a: GeographicTrend, b: GeographicTrend) => b.score - a.score);
    } catch (error) {
      logger.error(`Error fetching geographic trends for ${keyword}:`, error);
      return [];
    }
  }

  /**
   * Get comprehensive trend analysis
   */
  async getComprehensiveTrendAnalysis(): Promise<TrendData> {
    try {
      logger.info('Starting comprehensive trend analysis');
      
      const trendingKeywords = await this.getTrendingKeywords();
      const geographicData: GeographicTrend[] = [];

      // Get geographic data for top trending keywords
      for (const keyword of trendingKeywords.slice(0, 5)) {
        const geoTrends = await this.getGeographicTrends(keyword.keyword);
        geographicData.push(...geoTrends);
      }

      const trendData: TrendData = {
        timestamp: new Date(),
        keywords: trendingKeywords,
        geographicTrends: geographicData,
        summary: {
          totalKeywords: trendingKeywords.length,
          averageScore: trendingKeywords.reduce((sum, k) => sum + k.score, 0) / trendingKeywords.length,
          topRegions: geographicData
            .slice(0, 5)
            .map(g => ({ geo: g.geo, geoName: g.geoName, score: g.score }))
        }
      };

      logger.info(`Trend analysis complete. Found ${trendingKeywords.length} trending keywords`);
      return trendData;
    } catch (error) {
      logger.error('Error in comprehensive trend analysis:', error);
      throw error;
    }
  }

  /**
   * Filter relevant queries for adult products
   */
  private isRelevantQuery(query: string): boolean {
    const adultProductTerms = [
      'toy', 'product', 'adult', 'intimate', 'personal', 'wellness',
      'bedroom', 'couple', 'health', 'care', 'accessory', 'device'
    ];
    
    const excludeTerms = [
      'child', 'kid', 'baby', 'minor', 'teen'
    ];

    const queryLower = query.toLowerCase();
    
    // Exclude inappropriate terms
    if (excludeTerms.some(term => queryLower.includes(term))) {
      return false;
    }

    // Include if it contains relevant adult product terms
    return adultProductTerms.some(term => queryLower.includes(term));
  }

  /**
   * Rate limiting delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate trend data
   */
  validateTrendData(data: any): TrendKeyword[] {
    try {
      return data.map((item: any) => TrendResultSchema.parse(item));
    } catch (error) {
      logger.error('Invalid trend data format:', error);
      return [];
    }
  }
}

// Export singleton instance
export const googleTrendsService = new GoogleTrendsService();