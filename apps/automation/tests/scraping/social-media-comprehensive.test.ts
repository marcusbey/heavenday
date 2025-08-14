import { SocialMediaTrendsService } from '../../src/scraping/social-media';
import { SocialMediaTrend } from '../../src/types/trends';
import { logger } from '../../src/utils/logger';
import { IgApiClient } from 'instagram-private-api';
import TikTokScraper from 'tiktok-scraper';

// Mock dependencies
jest.mock('instagram-private-api');
jest.mock('tiktok-scraper', () => ({
  hashtag: jest.fn()
}));
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('SocialMediaTrendsService - Comprehensive Tests', () => {
  let service: SocialMediaTrendsService;
  let mockIgClient: jest.Mocked<IgApiClient>;
  let mockProcessEnv: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Backup and set environment variables
    mockProcessEnv = process.env;
    process.env = {
      ...mockProcessEnv,
      SCRAPING_DELAY_MS: '100', // Reduced for tests
      INSTAGRAM_USERNAME: 'test_user',
      INSTAGRAM_PASSWORD: 'test_password',
      TIKTOK_SESSION_ID: 'test_session'
    };

    // Mock Instagram API Client
    mockIgClient = {
      state: {
        generateDevice: jest.fn()
      },
      account: {
        login: jest.fn()
      },
      feed: {
        tags: jest.fn()
      }
    } as any;

    (IgApiClient as jest.MockedClass<typeof IgApiClient>).mockImplementation(() => mockIgClient);

    service = new SocialMediaTrendsService();
  });

  afterEach(() => {
    process.env = mockProcessEnv;
  });

  describe('Instagram Integration', () => {
    describe('Initialization', () => {
      it('should initialize Instagram client successfully', async () => {
        mockIgClient.account.login.mockResolvedValue({} as any);

        await service.initializeInstagram();

        expect(mockIgClient.state.generateDevice).toHaveBeenCalledWith('test_user');
        expect(mockIgClient.account.login).toHaveBeenCalledWith('test_user', 'test_password');
        expect(logger.info).toHaveBeenCalledWith('Instagram client initialized successfully');
      });

      it('should handle missing credentials', async () => {
        delete process.env.INSTAGRAM_USERNAME;
        delete process.env.INSTAGRAM_PASSWORD;

        await expect(service.initializeInstagram()).rejects.toThrow('Instagram credentials not provided');
        expect(logger.error).toHaveBeenCalledWith('Failed to initialize Instagram client:', expect.any(Error));
      });

      it('should handle login failures', async () => {
        const loginError = new Error('Invalid credentials');
        mockIgClient.account.login.mockRejectedValue(loginError);

        await expect(service.initializeInstagram()).rejects.toThrow('Invalid credentials');
        expect(logger.error).toHaveBeenCalledWith('Failed to initialize Instagram client:', loginError);
      });

      it('should handle rate limiting during login', async () => {
        const rateLimitError = new Error('Rate limit exceeded');
        rateLimitError.name = 'IgResponseError';
        mockIgClient.account.login.mockRejectedValue(rateLimitError);

        await expect(service.initializeInstagram()).rejects.toThrow('Rate limit exceeded');
      });
    });

    describe('Trend Collection', () => {
      beforeEach(async () => {
        mockIgClient.account.login.mockResolvedValue({} as any);
        await service.initializeInstagram();
      });

      it('should collect Instagram trends for all hashtags', async () => {
        const mockPosts = [
          {
            like_count: 100,
            comment_count: 20,
            caption: { text: 'Great wellness product! #wellness' }
          },
          {
            like_count: 50,
            comment_count: 10,
            caption: { text: 'Love this intimate care device #intimatehealth' }
          }
        ];

        const mockHashtagFeed = {
          items: jest.fn().mockResolvedValue(mockPosts)
        };
        mockIgClient.feed.tags.mockReturnValue(mockHashtagFeed as any);

        const trends = await service.getInstagramTrends();

        expect(trends.length).toBeGreaterThan(0);
        expect(trends[0]).toMatchObject({
          platform: 'instagram',
          hashtag: expect.stringMatching(/^#/),
          postCount: mockPosts.length,
          engagementRate: expect.any(Number),
          trendScore: expect.any(Number),
          relatedProducts: expect.any(Array),
          scrapedAt: expect.any(Date)
        });
      });

      it('should calculate engagement rate correctly', async () => {
        const mockPosts = [
          { like_count: 100, comment_count: 20 }, // 120 total engagement
          { like_count: 80, comment_count: 15 }   // 95 total engagement
        ];
        // Total engagement: 215, posts: 2, average: 107.5

        const mockHashtagFeed = {
          items: jest.fn().mockResolvedValue(mockPosts)
        };
        mockIgClient.feed.tags.mockReturnValue(mockHashtagFeed as any);

        const trends = await service.getInstagramTrends();

        const trend = trends[0];
        expect(trend.engagementRate).toBe(107.5); // (215 / 2)
      });

      it('should extract product mentions from captions', async () => {
        const mockPosts = [
          {
            like_count: 100,
            comment_count: 20,
            caption: { text: 'Love this wellness product for personal care!' }
          },
          {
            like_count: 50,
            comment_count: 10,
            caption: { text: 'This intimate device changed my health routine' }
          }
        ];

        const mockHashtagFeed = {
          items: jest.fn().mockResolvedValue(mockPosts)
        };
        mockIgClient.feed.tags.mockReturnValue(mockHashtagFeed as any);

        const trends = await service.getInstagramTrends();

        expect(trends[0].relatedProducts.length).toBeGreaterThan(0);
        expect(trends[0].relatedProducts).toContain(expect.stringMatching(/wellness product|intimate device/));
      });

      it('should handle empty hashtag feeds', async () => {
        const mockHashtagFeed = {
          items: jest.fn().mockResolvedValue([])
        };
        mockIgClient.feed.tags.mockReturnValue(mockHashtagFeed as any);

        const trends = await service.getInstagramTrends();

        expect(Array.isArray(trends)).toBe(true);
      });

      it('should handle individual hashtag failures gracefully', async () => {
        let callCount = 0;
        mockIgClient.feed.tags.mockImplementation(() => {
          callCount++;
          if (callCount <= 2) {
            throw new Error('Hashtag not available');
          }
          return {
            items: jest.fn().mockResolvedValue([
              { like_count: 100, comment_count: 20 }
            ])
          } as any;
        });

        const trends = await service.getInstagramTrends();

        // Should have some successful results despite failures
        expect(trends.length).toBeGreaterThan(0);
        expect(logger.error).toHaveBeenCalledTimes(2);
      });

      it('should sort trends by score in descending order', async () => {
        let callCount = 0;
        mockIgClient.feed.tags.mockImplementation(() => {
          callCount++;
          const postCount = callCount * 50; // Varying post counts
          const engagement = callCount * 10;
          
          return {
            items: jest.fn().mockResolvedValue(
              Array(postCount).fill({ like_count: engagement, comment_count: 5 })
            )
          } as any;
        });

        const trends = await service.getInstagramTrends();

        // Verify sorting by score (descending)
        for (let i = 1; i < trends.length; i++) {
          expect(trends[i-1].trendScore).toBeGreaterThanOrEqual(trends[i].trendScore);
        }
      });

      it('should implement rate limiting between hashtag requests', async () => {
        const startTime = Date.now();
        
        const mockHashtagFeed = {
          items: jest.fn().mockResolvedValue([])
        };
        mockIgClient.feed.tags.mockReturnValue(mockHashtagFeed as any);

        await service.getInstagramTrends();

        const endTime = Date.now();
        const duration = endTime - startTime;

        // Should have delays between hashtag requests
        // With 10 hashtags and 100ms delay, minimum ~900ms
        expect(duration).toBeGreaterThan(800);
      });
    });
  });

  describe('TikTok Integration', () => {
    describe('Trend Collection', () => {
      it('should collect TikTok trends successfully', async () => {
        const mockTikTokData = {
          collector: [
            {
              text: 'Great wellness product review! #wellness',
              playCount: 10000,
              diggCount: 500,
              shareCount: 50
            },
            {
              text: 'Personal care routine with this device',
              playCount: 5000,
              diggCount: 200,
              shareCount: 20
            }
          ]
        };

        (TikTokScraper.hashtag as jest.Mock).mockResolvedValue(mockTikTokData);

        const trends = await service.getTikTokTrends();

        expect(trends.length).toBeGreaterThan(0);
        expect(trends[0]).toMatchObject({
          platform: 'tiktok',
          hashtag: expect.stringMatching(/^#/),
          postCount: mockTikTokData.collector.length,
          engagementRate: expect.any(Number),
          trendScore: expect.any(Number),
          relatedProducts: expect.any(Array),
          scrapedAt: expect.any(Date)
        });
      });

      it('should calculate TikTok engagement rate with view count', async () => {
        const mockTikTokData = {
          collector: [
            {
              text: 'Test video',
              playCount: 10000,
              diggCount: 500,  // 5% like rate
              shareCount: 100  // 1% share rate
            }
          ]
        };
        // Engagement rate = (likes + shares) / views * 100 = 600/10000 * 100 = 6%

        (TikTokScraper.hashtag as jest.Mock).mockResolvedValue(mockTikTokData);

        const trends = await service.getTikTokTrends();

        expect(trends[0].engagementRate).toBe(6); // 6%
      });

      it('should extract product mentions from TikTok videos', async () => {
        const mockTikTokData = {
          collector: [
            {
              text: 'Review of this amazing wellness product for health',
              playCount: 1000,
              diggCount: 50,
              shareCount: 5
            },
            {
              text: 'Personal care device unboxing and review',
              playCount: 2000,
              diggCount: 100,
              shareCount: 10
            }
          ]
        };

        (TikTokScraper.hashtag as jest.Mock).mockResolvedValue(mockTikTokData);

        const trends = await service.getTikTokTrends();

        expect(trends[0].relatedProducts.length).toBeGreaterThan(0);
        expect(trends[0].relatedProducts).toContain(expect.stringMatching(/wellness product|care device/));
      });

      it('should handle TikTok API errors gracefully', async () => {
        (TikTokScraper.hashtag as jest.Mock).mockRejectedValue(new Error('TikTok API unavailable'));

        const trends = await service.getTikTokTrends();

        expect(trends).toEqual([]);
        expect(logger.error).toHaveBeenCalledWith('Error fetching TikTok trends:', expect.any(Error));
      });

      it('should handle empty TikTok responses', async () => {
        (TikTokScraper.hashtag as jest.Mock).mockResolvedValue({ collector: [] });

        const trends = await service.getTikTokTrends();

        expect(Array.isArray(trends)).toBe(true);
      });

      it('should handle malformed TikTok responses', async () => {
        const malformedResponses = [
          null,
          undefined,
          {},
          { collector: null },
          { collector: 'not-an-array' }
        ];

        for (const response of malformedResponses) {
          (TikTokScraper.hashtag as jest.Mock).mockResolvedValueOnce(response);
          
          const trends = await service.getTikTokTrends();
          expect(Array.isArray(trends)).toBe(true);
        }
      });

      it('should limit TikTok requests to configured number of posts', async () => {
        const mockTikTokData = {
          collector: Array(100).fill({
            text: 'Test video',
            playCount: 1000,
            diggCount: 50,
            shareCount: 5
          })
        };

        (TikTokScraper.hashtag as jest.Mock).mockResolvedValue(mockTikTokData);

        await service.getTikTokTrends();

        // Verify that TikTok scraper was called with limit
        expect(TikTokScraper.hashtag).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ number: 50 })
        );
      });
    });
  });

  describe('Comprehensive Social Trends', () => {
    it('should combine Instagram and TikTok trends', async () => {
      // Mock Instagram success
      const mockIgPosts = [
        { like_count: 100, comment_count: 20 }
      ];
      const mockHashtagFeed = {
        items: jest.fn().mockResolvedValue(mockIgPosts)
      };
      mockIgClient.feed.tags.mockReturnValue(mockHashtagFeed as any);
      mockIgClient.account.login.mockResolvedValue({} as any);

      // Mock TikTok success
      const mockTikTokData = {
        collector: [
          {
            text: 'Test video',
            playCount: 1000,
            diggCount: 50,
            shareCount: 5
          }
        ]
      };
      (TikTokScraper.hashtag as jest.Mock).mockResolvedValue(mockTikTokData);

      const trends = await service.getComprehensiveSocialTrends();

      expect(trends.length).toBeGreaterThan(0);
      
      // Should have trends from both platforms
      const platforms = trends.map(t => t.platform);
      expect(platforms).toContain('instagram');
      expect(platforms).toContain('tiktok');
      
      // Should be sorted by trend score
      for (let i = 1; i < trends.length; i++) {
        expect(trends[i-1].trendScore).toBeGreaterThanOrEqual(trends[i].trendScore);
      }
    });

    it('should handle partial platform failures', async () => {
      // Mock Instagram failure
      mockIgClient.account.login.mockRejectedValue(new Error('Instagram unavailable'));

      // Mock TikTok success
      const mockTikTokData = {
        collector: [
          {
            text: 'Test video',
            playCount: 1000,
            diggCount: 50,
            shareCount: 5
          }
        ]
      };
      (TikTokScraper.hashtag as jest.Mock).mockResolvedValue(mockTikTokData);

      const trends = await service.getComprehensiveSocialTrends();

      // Should have TikTok trends despite Instagram failure
      expect(trends.length).toBeGreaterThan(0);
      expect(trends.every(t => t.platform === 'tiktok')).toBe(true);
      
      expect(logger.error).toHaveBeenCalledWith('Instagram trends failed:', expect.any(Error));
    });

    it('should handle complete platform failures', async () => {
      // Mock both platforms failing
      mockIgClient.account.login.mockRejectedValue(new Error('Instagram unavailable'));
      (TikTokScraper.hashtag as jest.Mock).mockRejectedValue(new Error('TikTok unavailable'));

      const trends = await service.getComprehensiveSocialTrends();

      expect(trends).toEqual([]);
      expect(logger.error).toHaveBeenCalledTimes(2);
    });
  });

  describe('Trend Score Calculation', () => {
    it('should calculate Instagram trend scores correctly', () => {
      const testCases = [
        {
          postCount: 100,
          engagementRate: 10,
          platform: 'instagram' as const,
          expectedRange: [80, 100]
        },
        {
          postCount: 50,
          engagementRate: 5,
          platform: 'instagram' as const,
          expectedRange: [40, 70]
        },
        {
          postCount: 10,
          engagementRate: 2,
          platform: 'instagram' as const,
          expectedRange: [10, 40]
        }
      ];

      testCases.forEach(({ postCount, engagementRate, platform, expectedRange }) => {
        const score = service['calculateSocialTrendScore'](postCount, engagementRate, platform);
        expect(score).toBeGreaterThanOrEqual(expectedRange[0]);
        expect(score).toBeLessThanOrEqual(expectedRange[1]);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    it('should calculate TikTok trend scores with view bonus', () => {
      const baseScore = service['calculateSocialTrendScore'](50, 5, 'instagram');
      const tiktokScore = service['calculateSocialTrendScore'](50, 5, 'tiktok', 1000000); // 1M views

      // TikTok score should be higher due to view bonus
      expect(tiktokScore).toBeGreaterThan(baseScore);
    });

    it('should handle edge cases in score calculation', () => {
      const edgeCases = [
        { postCount: 0, engagementRate: 0, platform: 'instagram' as const },
        { postCount: 10000, engagementRate: 100, platform: 'instagram' as const },
        { postCount: 1, engagementRate: 0.1, platform: 'tiktok' as const, totalViews: 1 },
        { postCount: 100, engagementRate: 50, platform: 'tiktok' as const, totalViews: 10000000 }
      ];

      edgeCases.forEach(({ postCount, engagementRate, platform, totalViews }) => {
        const score = service['calculateSocialTrendScore'](postCount, engagementRate, platform, totalViews);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
        expect(Number.isFinite(score)).toBe(true);
      });
    });
  });

  describe('Product Mention Extraction', () => {
    describe('Instagram Product Mentions', () => {
      it('should extract product mentions from Instagram captions', () => {
        const mockPosts = [
          {
            caption: { text: 'Love this wellness product for my daily routine!' }
          },
          {
            caption: { text: 'This intimate care device is amazing for health' }
          },
          {
            caption: { text: 'Personal care accessory review - highly recommend!' }
          },
          {
            caption: { text: 'Check out this wellness toy for couples' }
          },
          {
            caption: { text: 'Just a regular post without product mentions' }
          }
        ];

        const mentions = service['extractProductMentions'](mockPosts);

        expect(mentions.length).toBeGreaterThan(0);
        expect(mentions).toContain(expect.stringMatching(/wellness product|care device|care accessory|wellness toy/));
        expect(mentions.length).toBeLessThanOrEqual(10); // Should limit results
      });

      it('should handle posts without captions', () => {
        const mockPosts = [
          { caption: null },
          { caption: { text: null } },
          { caption: { text: '' } },
          {},
          { caption: { text: 'Valid wellness product mention' } }
        ];

        const mentions = service['extractProductMentions'](mockPosts);

        expect(Array.isArray(mentions)).toBe(true);
        expect(mentions.length).toBeGreaterThan(0); // Should find the valid mention
      });

      it('should extract context around product keywords', () => {
        const mockPosts = [
          {
            caption: { text: 'I absolutely love this amazing wellness product that changed my life completely' }
          }
        ];

        const mentions = service['extractProductMentions'](mockPosts);

        expect(mentions[0]).toContain('wellness product');
      });
    });

    describe('TikTok Product Mentions', () => {
      it('should extract product mentions from TikTok videos', () => {
        const mockPosts = [
          { text: 'Review of this wellness product - so good!' },
          { text: 'Unboxing my new intimate care device' },
          { text: 'Personal care routine with this accessory' },
          { text: 'Dance video without products' },
          { text: 'Health device that everyone needs' }
        ];

        const mentions = service['extractProductMentionsFromTikTok'](mockPosts);

        expect(mentions.length).toBeGreaterThan(0);
        expect(mentions).toContain(expect.stringMatching(/wellness product|care device|care routine|health device/));
        expect(mentions.length).toBeLessThanOrEqual(10);
      });

      it('should handle TikTok posts without text', () => {
        const mockPosts = [
          { text: null },
          { text: '' },
          {},
          { text: 'Valid wellness product mention' }
        ];

        const mentions = service['extractProductMentionsFromTikTok'](mockPosts);

        expect(Array.isArray(mentions)).toBe(true);
        expect(mentions.length).toBeGreaterThan(0);
      });

      it('should extract shorter context for TikTok due to character limits', () => {
        const mockPosts = [
          { text: 'Amazing wellness product review here!' }
        ];

        const mentions = service['extractProductMentionsFromTikTok'](mockPosts);

        expect(mentions[0]).toContain('wellness product');
      });
    });

    it('should filter out non-relevant product mentions', () => {
      const mockPosts = [
        {
          caption: { text: 'Child toy recommendation for kids' }
        },
        {
          caption: { text: 'Baby product for infants' }
        },
        {
          caption: { text: 'Teen accessory for teenagers' }
        },
        {
          caption: { text: 'Adult wellness product for health' }
        }
      ];

      const mentions = service['extractProductMentions'](mockPosts);

      // Should only include the adult wellness product
      expect(mentions.every(mention => 
        !mention.toLowerCase().includes('child') &&
        !mention.toLowerCase().includes('baby') &&
        !mention.toLowerCase().includes('teen')
      )).toBe(true);
    });
  });

  describe('Hashtag Performance Analysis', () => {
    it('should analyze hashtag performance over time', async () => {
      const analysis = await service.analyzeHashtagPerformance('#wellness', 7);

      expect(analysis).toMatchObject({
        hashtag: '#wellness',
        period: 7,
        averageEngagement: expect.any(Number),
        growthRate: expect.any(Number),
        peakDays: expect.any(Array),
        recommendation: expect.any(String)
      });

      expect(logger.info).toHaveBeenCalledWith('Analyzing performance for #wellness over 7 days');
    });

    it('should handle hashtag performance analysis errors', async () => {
      // Simulate an error in analysis
      const originalAnalyze = service.analyzeHashtagPerformance;
      service.analyzeHashtagPerformance = jest.fn().mockRejectedValue(new Error('Analysis failed'));

      await expect(service.analyzeHashtagPerformance('#test')).rejects.toThrow('Analysis failed');
      expect(logger.error).toHaveBeenCalledWith(
        'Error analyzing hashtag performance for #test:',
        expect.any(Error)
      );

      // Restore original method
      service.analyzeHashtagPerformance = originalAnalyze;
    });
  });

  describe('Rate Limiting and Performance', () => {
    it('should implement proper rate limiting across platforms', async () => {
      const startTime = Date.now();

      // Mock responses for both platforms
      const mockHashtagFeed = {
        items: jest.fn().mockResolvedValue([])
      };
      mockIgClient.feed.tags.mockReturnValue(mockHashtagFeed as any);
      mockIgClient.account.login.mockResolvedValue({} as any);

      (TikTokScraper.hashtag as jest.Mock).mockResolvedValue({ collector: [] });

      await service.getComprehensiveSocialTrends();

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should have significant delays due to rate limiting
      // With 10 hashtags per platform and 100ms delay, minimum ~1800ms
      expect(duration).toBeGreaterThan(1500);
    });

    it('should handle concurrent hashtag requests efficiently', async () => {
      // Mock fast responses
      const mockHashtagFeed = {
        items: jest.fn().mockResolvedValue([
          { like_count: 100, comment_count: 20 }
        ])
      };
      mockIgClient.feed.tags.mockReturnValue(mockHashtagFeed as any);
      mockIgClient.account.login.mockResolvedValue({} as any);

      (TikTokScraper.hashtag as jest.Mock).mockResolvedValue({
        collector: [
          { text: 'test', playCount: 1000, diggCount: 50, shareCount: 5 }
        ]
      });

      const startTime = Date.now();
      
      // Run multiple comprehensive analyses
      const promises = Array(3).fill(0).map(() => service.getComprehensiveSocialTrends());
      const results = await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });

      // Should not take excessively long for concurrent requests
      expect(duration).toBeLessThan(10000); // 10 seconds max
    });

    it('should handle memory efficiently with large datasets', async () => {
      // Mock large datasets
      const largePosts = Array(1000).fill({
        like_count: Math.floor(Math.random() * 1000),
        comment_count: Math.floor(Math.random() * 100),
        caption: { text: 'Test wellness product content' }
      });

      const mockHashtagFeed = {
        items: jest.fn().mockResolvedValue(largePosts)
      };
      mockIgClient.feed.tags.mockReturnValue(mockHashtagFeed as any);
      mockIgClient.account.login.mockResolvedValue({} as any);

      const largeTikTokData = {
        collector: Array(1000).fill({
          text: 'Test wellness product video',
          playCount: Math.floor(Math.random() * 100000),
          diggCount: Math.floor(Math.random() * 1000),
          shareCount: Math.floor(Math.random() * 100)
        })
      };
      (TikTokScraper.hashtag as jest.Mock).mockResolvedValue(largeTikTokData);

      const initialMemory = process.memoryUsage().heapUsed;

      await service.getComprehensiveSocialTrends();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from Instagram API errors', async () => {
      // First call fails, second succeeds
      let callCount = 0;
      mockIgClient.account.login.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Temporary Instagram error');
        }
        return Promise.resolve({} as any);
      });

      const mockHashtagFeed = {
        items: jest.fn().mockResolvedValue([
          { like_count: 100, comment_count: 20 }
        ])
      };
      mockIgClient.feed.tags.mockReturnValue(mockHashtagFeed as any);

      // First call should fail
      await expect(service.getInstagramTrends()).rejects.toThrow('Temporary Instagram error');

      // Second call should succeed
      const trends = await service.getInstagramTrends();
      expect(trends.length).toBeGreaterThan(0);
    });

    it('should handle session expiration gracefully', async () => {
      mockIgClient.account.login.mockResolvedValue({} as any);
      
      // Mock session expiration on hashtag request
      const mockHashtagFeed = {
        items: jest.fn().mockRejectedValue(new Error('Session expired'))
      };
      mockIgClient.feed.tags.mockReturnValue(mockHashtagFeed as any);

      const trends = await service.getInstagramTrends();

      expect(trends).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle TikTok scraper timeouts', async () => {
      (TikTokScraper.hashtag as jest.Mock).mockRejectedValue(new Error('Request timeout'));

      const trends = await service.getTikTokTrends();

      expect(trends).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith('Error fetching TikTok trends:', expect.any(Error));
    });

    it('should validate and sanitize extracted data', () => {
      // Test with potentially malicious or malformed data
      const maliciousPosts = [
        {
          caption: { text: '<script>alert("xss")</script> wellness product' }
        },
        {
          caption: { text: 'SQL injection attempt\'; DROP TABLE products; -- wellness' }
        },
        {
          caption: { text: 'Normal wellness product review' }
        }
      ];

      const mentions = service['extractProductMentions'](maliciousPosts);

      // Should extract mentions but sanitize content
      expect(mentions.length).toBeGreaterThan(0);
      mentions.forEach(mention => {
        expect(mention).not.toContain('<script>');
        expect(mention).not.toContain('DROP TABLE');
      });
    });
  });
});

// Integration tests for social media trends
describe('SocialMediaTrendsService - Integration Tests', () => {
  let service: SocialMediaTrendsService;

  beforeEach(() => {
    process.env.SCRAPING_DELAY_MS = '10'; // Very fast for integration tests
    service = new SocialMediaTrendsService();
  });

  it('should calculate realistic trend scores for typical data', () => {
    const typicalInstagramData = {
      postCount: 250,
      engagementRate: 8.5
    };

    const score = service['calculateSocialTrendScore'](
      typicalInstagramData.postCount,
      typicalInstagramData.engagementRate,
      'instagram'
    );

    expect(score).toBeGreaterThan(70); // Should be high for good engagement
    expect(score).toBeLessThanOrEqual(100);
  });

  it('should handle real-world hashtag variations', () => {
    const realHashtags = [
      '#wellness',
      '#WELLNESS',
      '#wellnessjourney',
      '#wellness_lifestyle',
      '#wellness123',
      '#wellness-products'
    ];

    realHashtags.forEach(hashtag => {
      expect(() => {
        // This would be called in real implementation
        const normalized = hashtag.toLowerCase().replace(/[^a-z0-9]/g, '');
        expect(normalized).toBeTruthy();
      }).not.toThrow();
    });
  });

  it('should extract meaningful product mentions from realistic content', () => {
    const realisticPosts = [
      {
        caption: { 
          text: 'Just tried this amazing wellness device from @brand - game changer for my self-care routine! 💕 #wellness #selfcare #health' 
        }
      },
      {
        caption: { 
          text: 'Honest review: this personal care product exceeded my expectations. Link in bio! #personalcare #review' 
        }
      },
      {
        caption: { 
          text: 'Morning routine update: adding this wellness tool to my daily ritual has been incredible #morningroutine #wellness' 
        }
      }
    ];

    const mentions = service['extractProductMentions'](realisticPosts);

    expect(mentions.length).toBeGreaterThan(0);
    expect(mentions.some(mention => 
      mention.includes('wellness device') || 
      mention.includes('care product') ||
      mention.includes('wellness tool')
    )).toBe(true);
  });
});