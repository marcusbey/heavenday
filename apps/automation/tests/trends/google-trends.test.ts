import { GoogleTrendsService } from '../../src/trends/google-trends';
import { createMockTrendData } from '../setup';

// Mock the google-trends-api module
jest.mock('google-trends-api', () => ({
  interestOverTime: jest.fn(),
  relatedQueries: jest.fn(),
  interestByRegion: jest.fn()
}));

import googleTrends from 'google-trends-api';

describe('GoogleTrendsService', () => {
  let service: GoogleTrendsService;
  
  beforeEach(() => {
    service = new GoogleTrendsService();
    jest.clearAllMocks();
  });

  describe('getTrendingKeywords', () => {
    it('should fetch and return trending keywords', async () => {
      const mockResponse = JSON.stringify({
        default: {
          timelineData: [
            { time: '1640995200', value: [75] }
          ]
        }
      });

      (googleTrends.interestOverTime as jest.Mock).mockResolvedValue(mockResponse);
      (googleTrends.relatedQueries as jest.Mock).mockResolvedValue(JSON.stringify({
        default: {
          rankedList: [{
            rankedKeyword: [{ query: 'related query 1' }]
          }]
        }
      }));

      const result = await service.getTrendingKeywords('US', 'today 1-m');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(googleTrends.interestOverTime).toHaveBeenCalled();
    });

    it('should filter keywords below minimum score', async () => {
      const mockResponse = JSON.stringify({
        default: {
          timelineData: [
            { time: '1640995200', value: [25] } // Below threshold
          ]
        }
      });

      (googleTrends.interestOverTime as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.getTrendingKeywords();
      expect(result).toHaveLength(0);
    });

    it('should handle API errors gracefully', async () => {
      (googleTrends.interestOverTime as jest.Mock).mockRejectedValue(new Error('API Error'));

      await expect(service.getTrendingKeywords()).rejects.toThrow('API Error');
    });
  });

  describe('getRelatedQueries', () => {
    it('should fetch related queries for a keyword', async () => {
      const mockResponse = JSON.stringify({
        default: {
          rankedList: [{
            rankedKeyword: [
              { query: 'wellness product' },
              { query: 'health accessory' }
            ]
          }]
        }
      });

      (googleTrends.relatedQueries as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.getRelatedQueries('wellness');
      
      expect(result).toEqual(['wellness product', 'health accessory']);
      expect(googleTrends.relatedQueries).toHaveBeenCalledWith({
        keyword: 'wellness',
        startTime: expect.any(Date),
        endTime: expect.any(Date),
        geo: 'US'
      });
    });

    it('should return empty array on API failure', async () => {
      (googleTrends.relatedQueries as jest.Mock).mockRejectedValue(new Error('API Error'));

      const result = await service.getRelatedQueries('test');
      expect(result).toEqual([]);
    });
  });

  describe('getGeographicTrends', () => {
    it('should fetch geographic trends for a keyword', async () => {
      const mockResponse = JSON.stringify({
        default: {
          geoMapData: [
            { geoCode: 'US', geoName: 'United States', value: [85] },
            { geoCode: 'CA', geoName: 'Canada', value: [70] }
          ]
        }
      });

      (googleTrends.interestByRegion as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.getGeographicTrends('wellness');
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        geo: 'US',
        geoName: 'United States',
        score: 85,
        keyword: 'wellness'
      });
    });

    it('should filter regions below minimum score', async () => {
      const mockResponse = JSON.stringify({
        default: {
          geoMapData: [
            { geoCode: 'US', geoName: 'United States', value: [85] },
            { geoCode: 'CA', geoName: 'Canada', value: [25] } // Below threshold
          ]
        }
      });

      (googleTrends.interestByRegion as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.getGeographicTrends('wellness');
      expect(result).toHaveLength(1);
      expect(result[0].geo).toBe('US');
    });
  });

  describe('getComprehensiveTrendAnalysis', () => {
    it('should return comprehensive trend analysis', async () => {
      // Mock all required API calls
      const timelineResponse = JSON.stringify({
        default: {
          timelineData: [{ time: '1640995200', value: [75] }]
        }
      });

      const relatedResponse = JSON.stringify({
        default: {
          rankedList: [{ rankedKeyword: [{ query: 'related query' }] }]
        }
      });

      const geoResponse = JSON.stringify({
        default: {
          geoMapData: [{ geoCode: 'US', geoName: 'United States', value: [80] }]
        }
      });

      (googleTrends.interestOverTime as jest.Mock).mockResolvedValue(timelineResponse);
      (googleTrends.relatedQueries as jest.Mock).mockResolvedValue(relatedResponse);
      (googleTrends.interestByRegion as jest.Mock).mockResolvedValue(geoResponse);

      const result = await service.getComprehensiveTrendAnalysis();
      
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('keywords');
      expect(result).toHaveProperty('geographicTrends');
      expect(result).toHaveProperty('summary');
      expect(result.summary).toHaveProperty('totalKeywords');
      expect(result.summary).toHaveProperty('averageScore');
      expect(result.summary).toHaveProperty('topRegions');
    });
  });

  describe('validateTrendData', () => {
    it('should validate correct trend data format', () => {
      const validData = [{
        keyword: 'test',
        score: 75,
        geo: 'US'
      }];

      const result = service.validateTrendData(validData);
      expect(result).toEqual(validData);
    });

    it('should return empty array for invalid data', () => {
      const invalidData = [{
        keyword: 'test',
        score: 'invalid', // Should be number
        geo: 'US'
      }];

      const result = service.validateTrendData(invalidData);
      expect(result).toEqual([]);
    });
  });

  describe('rate limiting', () => {
    it('should implement rate limiting between API calls', async () => {
      const startTime = Date.now();
      
      // Mock successful responses
      (googleTrends.interestOverTime as jest.Mock).mockResolvedValue(
        JSON.stringify({ default: { timelineData: [] } })
      );

      // Get trends for multiple keywords to test rate limiting
      const keywords = ['keyword1', 'keyword2'];
      await service.getTrendingKeywords();

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should take some time due to rate limiting
      expect(duration).toBeGreaterThan(1000); // At least 1 second for delays
    });
  });
});