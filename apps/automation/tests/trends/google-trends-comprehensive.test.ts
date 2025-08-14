import { GoogleTrendsService } from '../../src/trends/google-trends';
import { createMockTrendData } from '../setup';
import { TrendKeyword, GeographicTrend, TrendData } from '../../src/types/trends';
import { logger } from '../../src/utils/logger';

// Mock the google-trends-api module
jest.mock('google-trends-api', () => ({
  interestOverTime: jest.fn(),
  relatedQueries: jest.fn(),
  interestByRegion: jest.fn()
}));

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

import googleTrends from 'google-trends-api';

describe('GoogleTrendsService - Comprehensive Tests', () => {
  let service: GoogleTrendsService;
  let mockProcessEnv: any;
  
  beforeEach(() => {
    // Backup original environment
    mockProcessEnv = process.env;
    
    // Set test environment variables
    process.env = {
      ...mockProcessEnv,
      MIN_TREND_SCORE: '50',
      MAX_PRODUCTS_PER_TREND: '20',
      SCRAPING_DELAY_MS: '100' // Reduced for faster tests
    };
    
    service = new GoogleTrendsService();
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    // Restore original environment
    process.env = mockProcessEnv;
  });

  describe('Configuration and Environment', () => {
    it('should use environment variables for configuration', () => {
      expect(service['minTrendScore']).toBe(50);
      expect(service['maxProductsPerTrend']).toBe(20);
      expect(service['rateLimitDelay']).toBe(100);
    });
    
    it('should use default values when environment variables are missing', () => {
      delete process.env.MIN_TREND_SCORE;
      delete process.env.MAX_PRODUCTS_PER_TREND;
      delete process.env.SCRAPING_DELAY_MS;
      
      const newService = new GoogleTrendsService();
      expect(newService['minTrendScore']).toBe(50); // Default value
      expect(newService['maxProductsPerTrend']).toBe(20); // Default value
      expect(newService['rateLimitDelay']).toBe(2000); // Default value
    });

    it('should handle invalid environment variable values', () => {
      process.env.MIN_TREND_SCORE = 'invalid';
      process.env.MAX_PRODUCTS_PER_TREND = 'not-a-number';
      process.env.SCRAPING_DELAY_MS = '';
      
      const newService = new GoogleTrendsService();
      expect(newService['minTrendScore']).toBe(0); // parseInt of invalid string
      expect(newService['maxProductsPerTrend']).toBe(0);
      expect(newService['rateLimitDelay']).toBe(0);
    });
  });
  
  describe('getTrendingKeywords - Advanced Testing', () => {
    it('should handle multiple successful API calls with different scores', async () => {
      let callCount = 0;
      const scores = [85, 92, 45, 78, 88, 35, 95]; // Mix of above/below threshold
      
      (googleTrends.interestOverTime as jest.Mock).mockImplementation(() => {
        const score = scores[callCount % scores.length];
        callCount++;
        return Promise.resolve(JSON.stringify({
          default: {
            timelineData: [{ time: '1640995200', value: [score] }]
          }
        }));
      });
      
      (googleTrends.relatedQueries as jest.Mock).mockResolvedValue(
        JSON.stringify({
          default: {
            rankedList: [{
              rankedKeyword: [{ query: 'wellness product' }]
            }]
          }
        })
      );

      const result = await service.getTrendingKeywords();
      
      // Should only include keywords with score >= 50
      const expectedCount = scores.filter(score => score >= 50).length;
      expect(result).toHaveLength(expectedCount);
      
      // Verify sorting by score (descending)
      for (let i = 1; i < result.length; i++) {
        expect(result[i-1].score).toBeGreaterThanOrEqual(result[i].score);
      }
    });

    it('should handle API responses with missing or malformed data', async () => {
      const malformedResponses = [
        'invalid json{',
        JSON.stringify({}), // Empty object
        JSON.stringify({ default: null }),
        JSON.stringify({ default: { timelineData: null } }),
        JSON.stringify({ default: { timelineData: [] } }), // Empty array
        JSON.stringify({ default: { timelineData: [{}] } }), // Missing value
        JSON.stringify({ default: { timelineData: [{ value: null }] } }), // Null value
      ];
      
      let callIndex = 0;
      (googleTrends.interestOverTime as jest.Mock).mockImplementation(() => {
        const response = malformedResponses[callIndex % malformedResponses.length];
        callIndex++;
        return Promise.resolve(response);
      });

      // Should handle all malformed responses without crashing
      const result = await service.getTrendingKeywords();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should continue processing when individual category calls fail', async () => {
      let callCount = 0;
      (googleTrends.interestOverTime as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount <= 3) {
          throw new Error(`API Error for call ${callCount}`);
        }
        return Promise.resolve(JSON.stringify({
          default: {
            timelineData: [{ time: '1640995200', value: [75] }]
          }
        }));
      });
      
      (googleTrends.relatedQueries as jest.Mock).mockResolvedValue(
        JSON.stringify({ default: { rankedList: [] } })
      );

      const result = await service.getTrendingKeywords();
      
      // Should have results from successful categories
      expect(result.length).toBeGreaterThan(0);
      expect(logger.error).toHaveBeenCalledTimes(3);
    });

    it('should implement proper rate limiting', async () => {
      const startTime = Date.now();
      
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

      await service.getTrendingKeywords();

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should take at least (number of categories - 1) * delay time
      // We have 7 categories, so minimum 6 * 100ms = 600ms
      expect(duration).toBeGreaterThan(500);
    });

    it('should handle different geographic regions', async () => {
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

      const regions = ['US', 'CA', 'GB', 'AU', 'DE'];
      
      for (const region of regions) {
        const result = await service.getTrendingKeywords(region);
        expect(Array.isArray(result)).toBe(true);
        
        // Verify correct geo parameter was passed
        const lastCall = (googleTrends.interestOverTime as jest.Mock).mock.calls.slice(-7); // Last 7 calls for categories
        lastCall.forEach(call => {
          expect(call[0].geo).toBe(region);
        });
      }
    });
  });

  describe('getRelatedQueries - Advanced Testing', () => {
    it('should filter out inappropriate terms comprehensively', async () => {
      const mockResponse = JSON.stringify({
        default: {
          rankedList: [{
            rankedKeyword: [
              { query: 'wellness product for adults' }, // Should be included
              { query: 'intimate care device' }, // Should be included
              { query: 'child safety toy' }, // Should be excluded (child)
              { query: 'baby wellness item' }, // Should be excluded (baby)
              { query: 'teen health product' }, // Should be excluded (teen)
              { query: 'adult personal care' }, // Should be included
              { query: 'minor health accessory' }, // Should be excluded (minor)
              { query: 'wellness toy for couples' }, // Should be included
              { query: 'kid health device' } // Should be excluded (kid)
            ]
          }]
        }
      });

      (googleTrends.relatedQueries as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.getRelatedQueries('wellness');
      
      const expectedQueries = [
        'wellness product for adults',
        'intimate care device',
        'adult personal care',
        'wellness toy for couples'
      ];
      
      expect(result).toEqual(expectedQueries);
    });

    it('should handle large numbers of related queries', async () => {
      const largeQueryList = Array(100).fill(0).map((_, i) => ({
        query: `wellness product ${i}`
      }));

      const mockResponse = JSON.stringify({
        default: {
          rankedList: [{
            rankedKeyword: largeQueryList
          }]
        }
      });

      (googleTrends.relatedQueries as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.getRelatedQueries('wellness');
      
      // Should limit to 10 results
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should handle various error conditions gracefully', async () => {
      const errorConditions = [
        new Error('Network timeout'),
        new Error('Rate limit exceeded'),
        new Error('Invalid API key'),
        new Error('Service unavailable')
      ];

      for (const error of errorConditions) {
        (googleTrends.relatedQueries as jest.Mock).mockRejectedValueOnce(error);
        
        const result = await service.getRelatedQueries('test');
        expect(result).toEqual([]);
        expect(logger.warn).toHaveBeenCalledWith(
          'Could not fetch related queries for test:',
          error
        );
      }
    });
  });

  describe('getGeographicTrends - Advanced Testing', () => {
    it('should handle regions with missing or invalid data', async () => {
      const mockResponse = JSON.stringify({
        default: {
          geoMapData: [
            { geoCode: 'US', geoName: 'United States', value: [85] }, // Valid
            { geoCode: 'CA', geoName: null, value: [70] }, // Null name
            { geoCode: 'GB', value: [60] }, // Missing name
            { value: [55] }, // Missing geoCode
            { geoCode: 'AU', geoName: 'Australia', value: null }, // Null value
            { geoCode: 'DE', geoName: 'Germany', value: [] }, // Empty value array
            { geoCode: 'FR', geoName: 'France', value: [90] } // Valid
          ]
        }
      });

      (googleTrends.interestByRegion as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.getGeographicTrends('wellness');
      
      // Should only include valid entries with scores >= minTrendScore
      const validResults = result.filter(r => r.score >= 50);
      expect(validResults.length).toBeGreaterThan(0);
      
      // All results should have required fields
      validResults.forEach(trend => {
        expect(trend).toHaveProperty('geo');
        expect(trend).toHaveProperty('geoName');
        expect(trend).toHaveProperty('score');
        expect(trend).toHaveProperty('keyword');
        expect(trend.keyword).toBe('wellness');
      });
    });

    it('should sort geographic trends by score in descending order', async () => {
      const mockResponse = JSON.stringify({
        default: {
          geoMapData: [
            { geoCode: 'US', geoName: 'United States', value: [60] },
            { geoCode: 'CA', geoName: 'Canada', value: [85] },
            { geoCode: 'GB', geoName: 'United Kingdom', value: [75] },
            { geoCode: 'AU', geoName: 'Australia', value: [90] },
            { geoCode: 'DE', geoName: 'Germany', value: [55] }
          ]
        }
      });

      (googleTrends.interestByRegion as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.getGeographicTrends('wellness');
      
      // Verify sorting (descending order)
      for (let i = 1; i < result.length; i++) {
        expect(result[i-1].score).toBeGreaterThanOrEqual(result[i].score);
      }
      
      // Verify first result is highest score
      expect(result[0].geoCode).toBe('AU'); // Australia with score 90
    });
  });

  describe('getComprehensiveTrendAnalysis - Integration Testing', () => {
    it('should perform complete workflow with all API calls', async () => {
      // Mock trending keywords response
      (googleTrends.interestOverTime as jest.Mock).mockResolvedValue(
        JSON.stringify({
          default: {
            timelineData: [{ time: '1640995200', value: [85] }]
          }
        })
      );
      
      // Mock related queries response
      (googleTrends.relatedQueries as jest.Mock).mockResolvedValue(
        JSON.stringify({
          default: {
            rankedList: [{
              rankedKeyword: [
                { query: 'wellness device' },
                { query: 'health product' }
              ]
            }]
          }
        })
      );
      
      // Mock geographic trends response
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

      const result = await service.getComprehensiveTrendAnalysis();
      
      // Verify structure
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('keywords');
      expect(result).toHaveProperty('geographicTrends');
      expect(result).toHaveProperty('summary');
      
      // Verify data integrity
      expect(result.keywords.length).toBeGreaterThan(0);
      expect(result.geographicTrends.length).toBeGreaterThan(0);
      expect(result.summary.totalKeywords).toBe(result.keywords.length);
      
      // Verify summary calculations
      const expectedAverage = result.keywords.reduce((sum, k) => sum + k.score, 0) / result.keywords.length;
      expect(result.summary.averageScore).toBe(expectedAverage);
      
      // Verify geographic data is limited to top 5 keywords
      expect(googleTrends.interestByRegion).toHaveBeenCalledTimes(Math.min(5, result.keywords.length));
    });

    it('should handle partial failures gracefully', async () => {
      // Mock mixed success/failure responses
      let interestCallCount = 0;
      (googleTrends.interestOverTime as jest.Mock).mockImplementation(() => {
        interestCallCount++;
        if (interestCallCount <= 3) {
          throw new Error('API temporarily unavailable');
        }
        return Promise.resolve(JSON.stringify({
          default: {
            timelineData: [{ time: '1640995200', value: [75] }]
          }
        }));
      });
      
      (googleTrends.relatedQueries as jest.Mock).mockResolvedValue(
        JSON.stringify({ default: { rankedList: [] } })
      );
      
      // Geo API fails completely
      (googleTrends.interestByRegion as jest.Mock).mockRejectedValue(
        new Error('Geographic API unavailable')
      );

      const result = await service.getComprehensiveTrendAnalysis();
      
      // Should still return valid structure
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('keywords');
      expect(result).toHaveProperty('geographicTrends');
      expect(result).toHaveProperty('summary');
      
      // May have fewer keywords due to failures
      expect(result.keywords.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Data Validation and Filtering', () => {
    it('should validate trend data with various edge cases', () => {
      const testCases = [
        // Valid data
        {
          input: [{ keyword: 'test', score: 75, geo: 'US' }],
          expected: 1,
          description: 'valid basic data'
        },
        // Invalid score types
        {
          input: [{ keyword: 'test', score: '75', geo: 'US' }],
          expected: 0,
          description: 'string score'
        },
        {
          input: [{ keyword: 'test', score: null, geo: 'US' }],
          expected: 0,
          description: 'null score'
        },
        {
          input: [{ keyword: 'test', score: undefined, geo: 'US' }],
          expected: 0,
          description: 'undefined score'
        },
        // Invalid keyword types
        {
          input: [{ keyword: null, score: 75, geo: 'US' }],
          expected: 0,
          description: 'null keyword'
        },
        {
          input: [{ keyword: 123, score: 75, geo: 'US' }],
          expected: 0,
          description: 'numeric keyword'
        },
        // Missing required fields
        {
          input: [{ score: 75, geo: 'US' }],
          expected: 0,
          description: 'missing keyword'
        },
        {
          input: [{ keyword: 'test', geo: 'US' }],
          expected: 0,
          description: 'missing score'
        },
        // Empty arrays and objects
        {
          input: [],
          expected: 0,
          description: 'empty array'
        },
        {
          input: [{}],
          expected: 0,
          description: 'empty object'
        }
      ];

      testCases.forEach(({ input, expected, description }) => {
        const result = service.validateTrendData(input);
        expect(result).toHaveLength(expected);
      });
    });

    it('should filter adult product relevance correctly', () => {
      const testQueries = [
        // Should be included
        { query: 'adult wellness product', expected: true },
        { query: 'intimate health device', expected: true },
        { query: 'personal care accessory', expected: true },
        { query: 'wellness toy for adults', expected: true },
        { query: 'bedroom health product', expected: true },
        { query: 'couple wellness device', expected: true },
        
        // Should be excluded
        { query: 'child toy product', expected: false },
        { query: 'baby health device', expected: false },
        { query: 'teen wellness item', expected: false },
        { query: 'minor care product', expected: false },
        { query: 'kid health accessory', expected: false },
        
        // Edge cases
        { query: '', expected: false },
        { query: '   ', expected: false },
        { query: 'product', expected: true }, // Generic product term
        { query: 'ADULT PRODUCT', expected: true }, // Uppercase
        { query: 'adult-child product', expected: false } // Contains both
      ];

      testQueries.forEach(({ query, expected }) => {
        const result = service['isRelevantQuery'](query);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle large datasets without memory leaks', async () => {
      const largeTrendData = {
        default: {
          timelineData: Array(5000).fill(0).map((_, i) => ({
            time: `${1640995200 + i}`,
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
      
      const initialMemory = process.memoryUsage().heapUsed;
      
      await service.getTrendingKeywords();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });

    it('should handle concurrent requests without conflicts', async () => {
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
      
      const concurrentRequests = Array(10).fill(0).map(() => 
        service.getTrendingKeywords()
      );
      
      const results = await Promise.all(concurrentRequests);
      
      // All requests should succeed
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should implement retry logic for transient failures', async () => {
      let attemptCount = 0;
      (googleTrends.interestOverTime as jest.Mock).mockImplementation(() => {
        attemptCount++;
        if (attemptCount <= 2) {
          const error = new Error('Transient network error');
          error.name = 'NetworkError';
          throw error;
        }
        return Promise.resolve(JSON.stringify({
          default: {
            timelineData: [{ time: '1640995200', value: [75] }]
          }
        }));
      });
      
      (googleTrends.relatedQueries as jest.Mock).mockResolvedValue(
        JSON.stringify({ default: { rankedList: [] } })
      );

      // Should eventually succeed after retries
      const result = await service.getTrendingKeywords();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle different types of API errors appropriately', async () => {
      const errorTypes = [
        { error: new Error('QUOTA_EXCEEDED'), shouldRetry: false },
        { error: new Error('INVALID_API_KEY'), shouldRetry: false },
        { error: new Error('NETWORK_TIMEOUT'), shouldRetry: true },
        { error: new Error('SERVICE_UNAVAILABLE'), shouldRetry: true }
      ];

      for (const { error } of errorTypes) {
        (googleTrends.interestOverTime as jest.Mock).mockRejectedValueOnce(error);
        
        await expect(service.getTrendingKeywords()).rejects.toThrow(error.message);
        expect(logger.error).toHaveBeenCalledWith(
          'Error fetching trending keywords:',
          error
        );
      }
    });
  });
});

// Property-based testing for edge cases
describe('GoogleTrendsService Property-Based Tests', () => {
  let service: GoogleTrendsService;
  
  beforeEach(() => {
    service = new GoogleTrendsService();
    jest.clearAllMocks();
  });
  
  describe('Score Range Properties', () => {
    it('should handle all valid score ranges consistently', () => {
      const scoreRanges = [
        { min: 0, max: 25, description: 'very low scores' },
        { min: 25, max: 50, description: 'low scores' },
        { min: 50, max: 75, description: 'medium scores' },
        { min: 75, max: 100, description: 'high scores' }
      ];

      scoreRanges.forEach(({ min, max, description }) => {
        for (let score = min; score <= max; score += 5) {
          const data = [{
            keyword: 'test',
            score,
            geo: 'US'
          }];
          
          expect(() => service.validateTrendData(data)).not.toThrow();
        }
      });
    });
  });
  
  describe('Geographic Code Properties', () => {
    it('should handle various geographic code formats', () => {
      const geoCodes = [
        'US', 'CA', 'GB', 'DE', 'FR', 'JP', 'AU', 'BR', 'IN', 'CN',
        'us', 'ca', // lowercase
        'USA', 'CAN', // 3-letter codes
        'US-CA', 'GB-ENG' // Sub-regions
      ];

      geoCodes.forEach(geo => {
        const trend: GeographicTrend = {
          geo,
          geoName: `Test Region ${geo}`,
          score: 75,
          keyword: 'test'
        };
        
        expect(trend.geo).toBe(geo);
        expect(trend.score).toBe(75);
      });
    });
  });
  
  describe('Keyword String Properties', () => {
    it('should handle various keyword string formats', () => {
      const keywords = [
        'simple keyword',
        'keyword with numbers 123',
        'UPPERCASE KEYWORD',
        'MiXeD cAsE kEyWoRd',
        'keyword-with-hyphens',
        'keyword_with_underscores',
        'keyword with special chars !@#',
        'très long keyword with many words and special characters',
        'a'.repeat(100), // Very long keyword
        '   keyword with spaces   ' // Surrounded by spaces
      ];

      keywords.forEach(keyword => {
        expect(() => {
          const data = [{
            keyword,
            score: 75,
            geo: 'US'
          }];
          service.validateTrendData(data);
        }).not.toThrow();
      });
    });
  });
});