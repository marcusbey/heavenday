import { CMSIntegrationService, CMSProduct, CMSResponse } from '../../src/pipeline/cms-integration';
import { ProductTrend, TrendAnalysisResult } from '../../src/types/trends';
import { logger } from '../../src/utils/logger';
import axios from 'axios';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

// Mock dependencies
jest.mock('axios');
jest.mock('sharp');
jest.mock('fs/promises');
jest.mock('path');
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('CMSIntegrationService - Comprehensive Tests', () => {
  let service: CMSIntegrationService;
  let mockAxios: jest.Mocked<typeof axios>;
  let mockSharp: jest.Mocked<typeof sharp>;
  let mockFs: jest.Mocked<typeof fs>;
  let mockPath: jest.Mocked<typeof path>;
  let mockProcessEnv: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Backup environment
    mockProcessEnv = process.env;
    process.env = {
      ...mockProcessEnv,
      CMS_API_URL: 'https://cms.example.com/api',
      CMS_API_KEY: 'test-api-key-123'
    };

    // Mock axios
    mockAxios = axios as jest.Mocked<typeof axios>;
    
    // Mock sharp
    const mockSharpInstance = {
      resize: jest.fn().mockReturnThis(),
      jpeg: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed-image'))
    };
    mockSharp = sharp as jest.Mocked<typeof sharp>;
    (mockSharp as any).mockImplementation(() => mockSharpInstance);

    // Mock fs
    mockFs = fs as jest.Mocked<typeof fs>;
    mockFs.mkdir = jest.fn().mockResolvedValue(undefined);
    mockFs.writeFile = jest.fn().mockResolvedValue(undefined);

    // Mock path
    mockPath = path as jest.Mocked<typeof path>;
    mockPath.join = jest.fn((...args) => args.join('/'));

    service = new CMSIntegrationService();
  });

  afterEach(() => {
    process.env = mockProcessEnv;
  });

  describe('Configuration and Initialization', () => {
    it('should initialize with environment variables', () => {
      const status = service.getStatus();
      
      expect(status).toMatchObject({
        cmsApiUrl: 'https://cms.example.com/api',
        configured: true,
        imagesPath: expect.stringContaining('data/images/products')
      });
    });

    it('should handle missing environment variables', () => {
      delete process.env.CMS_API_URL;
      delete process.env.CMS_API_KEY;

      const unconfiguredService = new CMSIntegrationService();
      const status = unconfiguredService.getStatus();
      
      expect(status.configured).toBe(false);
    });

    it('should use default CMS URL when not provided', () => {
      delete process.env.CMS_API_URL;
      
      const defaultService = new CMSIntegrationService();
      const status = defaultService.getStatus();
      
      expect(status.cmsApiUrl).toBe('http://localhost:3000/api');
    });
  });

  describe('Product Filtering and Selection', () => {
    it('should filter products based on quality criteria', () => {
      const testProducts: ProductTrend[] = [
        // Good product - should be included
        {
          id: 'B001',
          title: 'High Quality Wellness Product with Long Title',
          description: 'Great product',
          imageUrl: 'https://example.com/image1.jpg',
          sourceUrl: 'https://amazon.com/dp/B001',
          platform: 'amazon',
          price: 49.99,
          rating: 4.5,
          reviewCount: 200,
          trendScore: 85,
          keywords: ['wellness'],
          scrapedAt: new Date()
        },
        // Low trend score - should be excluded
        {
          id: 'B002',
          title: 'Low Score Product',
          description: 'Poor product',
          imageUrl: 'https://example.com/image2.jpg',
          sourceUrl: 'https://amazon.com/dp/B002',
          platform: 'amazon',
          price: 29.99,
          rating: 4.0,
          reviewCount: 100,
          trendScore: 60, // Below 70 threshold
          keywords: ['health'],
          scrapedAt: new Date()
        },
        // Price too low - should be excluded
        {
          id: 'B003',
          title: 'Cheap Product',
          description: 'Too cheap',
          imageUrl: 'https://example.com/image3.jpg',
          sourceUrl: 'https://amazon.com/dp/B003',
          platform: 'amazon',
          price: 5.99, // Below $10 threshold
          rating: 4.0,
          reviewCount: 50,
          trendScore: 80,
          keywords: ['care'],
          scrapedAt: new Date()
        },
        // Price too high - should be excluded
        {
          id: 'B004',
          title: 'Expensive Product',
          description: 'Too expensive',
          imageUrl: 'https://example.com/image4.jpg',
          sourceUrl: 'https://amazon.com/dp/B004',
          platform: 'amazon',
          price: 599.99, // Above $500 threshold
          rating: 5.0,
          reviewCount: 300,
          trendScore: 90,
          keywords: ['premium'],
          scrapedAt: new Date()
        },
        // Low rating with reviews - should be excluded
        {
          id: 'B005',
          title: 'Poor Rating Product',
          description: 'Bad reviews',
          imageUrl: 'https://example.com/image5.jpg',
          sourceUrl: 'https://amazon.com/dp/B005',
          platform: 'amazon',
          price: 39.99,
          rating: 2.5, // Below 3.5 threshold
          reviewCount: 100,
          trendScore: 75,
          keywords: ['wellness'],
          scrapedAt: new Date()
        },
        // Short title - should be excluded
        {
          id: 'B006',
          title: 'Short', // Less than 10 characters
          description: 'Short title',
          imageUrl: 'https://example.com/image6.jpg',
          sourceUrl: 'https://amazon.com/dp/B006',
          platform: 'amazon',
          price: 29.99,
          rating: 4.0,
          reviewCount: 50,
          trendScore: 80,
          keywords: ['test'],
          scrapedAt: new Date()
        },
        // No image - should be excluded
        {
          id: 'B007',
          title: 'Product Without Image',
          description: 'No image provided',
          imageUrl: '', // No image URL
          sourceUrl: 'https://amazon.com/dp/B007',
          platform: 'amazon',
          price: 29.99,
          rating: 4.0,
          reviewCount: 50,
          trendScore: 80,
          keywords: ['test'],
          scrapedAt: new Date()
        }
      ];

      const filtered = service['filterTopProducts'](testProducts);
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('B001');
    });

    it('should sort products by trend score and limit to top 20', () => {
      const manyProducts: ProductTrend[] = Array(50).fill(0).map((_, i) => ({
        id: `B${i.toString().padStart(3, '0')}`,
        title: `Product ${i} with sufficient length`,
        description: `Description ${i}`,
        imageUrl: `https://example.com/image${i}.jpg`,
        sourceUrl: `https://amazon.com/dp/B${i}`,
        platform: 'amazon' as const,
        price: 25 + Math.random() * 50, // Between $25-75
        rating: 3.5 + Math.random() * 1.5, // Between 3.5-5.0
        reviewCount: Math.floor(Math.random() * 500),
        trendScore: 70 + Math.random() * 30, // Between 70-100
        keywords: ['wellness'],
        scrapedAt: new Date()
      }));

      const filtered = service['filterTopProducts'](manyProducts);
      
      expect(filtered.length).toBeLessThanOrEqual(20);
      
      // Verify sorting by trend score (descending)
      for (let i = 1; i < filtered.length; i++) {
        expect(filtered[i-1].trendScore).toBeGreaterThanOrEqual(filtered[i].trendScore);
      }
    });
  });

  describe('Product Conversion to CMS Format', () => {
    let mockTrendAnalysisResult: TrendAnalysisResult;
    let mockProduct: ProductTrend;

    beforeEach(() => {
      mockTrendAnalysisResult = {
        googleTrends: {
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
        },
        socialMediaTrends: [],
        productOpportunities: [],
        recommendations: [],
        generatedAt: new Date()
      };

      mockProduct = {
        id: 'B001234567',
        title: 'Premium Wellness Device for Personal Health Care',
        description: 'A high-quality wellness device designed for personal health improvement',
        imageUrl: 'https://m.media-amazon.com/images/example.jpg',
        sourceUrl: 'https://amazon.com/dp/B001234567',
        platform: 'amazon',
        price: 79.99,
        rating: 4.5,
        reviewCount: 250,
        trendScore: 88,
        keywords: ['wellness', 'health', 'personal', 'care'],
        scrapedAt: new Date()
      };

      // Mock image processing
      mockAxios.get.mockResolvedValue({
        data: Buffer.from('mock-image-data')
      });
    });

    it('should convert ProductTrend to CMS format correctly', async () => {
      const cmsProduct = await service['convertProductToCMS'](mockProduct, mockTrendAnalysisResult);

      expect(cmsProduct).toMatchObject({
        title: expect.stringContaining('Premium Wellness Device'),
        description: mockProduct.description,
        content: expect.stringContaining('Premium Wellness Device'),
        price: 79.99,
        images: expect.any(Array),
        tags: expect.arrayContaining(['wellness', 'health']),
        categories: expect.any(Array),
        sourceUrl: mockProduct.sourceUrl,
        trendScore: 88,
        metadata: {
          amazonId: 'B001234567',
          rating: 4.5,
          reviewCount: 250,
          scrapedAt: expect.any(String),
          lastUpdated: expect.any(String)
        },
        seo: {
          metaTitle: expect.stringContaining('Premium Wellness Device'),
          metaDescription: expect.stringContaining('Premium Wellness Device'),
          slug: expect.any(String)
        },
        status: 'published' // High trend score >= 85
      });
    });

    it('should set draft status for lower trend scores', async () => {
      const lowScoreProduct = { ...mockProduct, trendScore: 75 };
      
      const cmsProduct = await service['convertProductToCMS'](lowScoreProduct, mockTrendAnalysisResult);
      
      expect(cmsProduct.status).toBe('draft');
    });

    it('should clean product titles properly', () => {
      const testTitles = [
        'Amazon Basic Wellness Product',
        'eBay Special Health Device',
        'Etsy Handmade    Multiple    Spaces',
        'Product with Special Characters!@#$%',
        'Very Long Product Title That Exceeds The Maximum Length Limit And Should Be Truncated'
      ];

      testTitles.forEach(title => {
        const cleaned = service['cleanTitle'](title);
        
        expect(cleaned).not.toContain('Amazon');
        expect(cleaned).not.toContain('eBay');
        expect(cleaned).not.toContain('Etsy');
        expect(cleaned).not.toMatch(/\s{2,}/); // No multiple spaces
        expect(cleaned).not.toMatch(/[^\w\s-]/); // No special chars except hyphens
        expect(cleaned.length).toBeLessThanOrEqual(80);
      });
    });

    it('should generate SEO-friendly slugs', () => {
      const testTitles = [
        'Premium Wellness Device',
        'Health Care Product with Special Characters!',
        'UPPERCASE PRODUCT NAME',
        'Product   with   Multiple   Spaces'
      ];

      testTitles.forEach(title => {
        const slug = service['generateSlug'](title);
        
        expect(slug).toMatch(/^[a-z0-9-]+$/); // Only lowercase, numbers, and hyphens
        expect(slug).not.toMatch(/^-|-$/); // No leading/trailing hyphens
        expect(slug).not.toMatch(/--/); // No double hyphens
        expect(slug.length).toBeLessThanOrEqual(50);
      });
    });

    it('should infer product categories correctly', () => {
      const testProducts = [
        {
          title: 'Wellness Device for Health',
          keywords: ['wellness', 'health'],
          expectedCategories: ['Wellness', 'Health']
        },
        {
          title: 'Personal Care Massage Tool',
          keywords: ['personal', 'care', 'massage'],
          expectedCategories: ['Personal Care', 'Massage & Relaxation']
        },
        {
          title: 'Intimate Health Product',
          keywords: ['intimate', 'health'],
          expectedCategories: ['Health', 'Intimate Care']
        },
        {
          title: 'Generic Product Name',
          keywords: ['generic'],
          expectedCategories: ['Adult Products'] // Default category
        }
      ];

      testProducts.forEach(({ title, keywords, expectedCategories }) => {
        const mockProd = { ...mockProduct, title, keywords };
        const categories = service['inferCategories'](mockProd);
        
        expectedCategories.forEach(category => {
          expect(categories).toContain(category);
        });
      });
    });

    it('should generate relevant tags', () => {
      const tags = service['generateTags'](mockProduct, mockTrendAnalysisResult);
      
      expect(tags).toContain('wellness');
      expect(tags).toContain('health');
      expect(tags).toContain('personal');
      expect(tags).toContain('care');
      expect(tags.length).toBeLessThanOrEqual(10);
      
      // Should include quality tags for high-scoring product
      if (mockProduct.rating >= 4.5) expect(tags).toContain('premium');
      if (mockProduct.reviewCount >= 200) expect(tags).toContain('popular');
      if (mockProduct.trendScore >= 85) expect(tags).toContain('trending');
    });

    it('should extract features from product titles', () => {
      const testTitles = [
        'Waterproof Rechargeable Silicone Wellness Device',
        'Premium Medical Grade Quiet Powerful Tool',
        'Ergonomic Discreet Safe Hygienic Product',
        'Regular Product Without Special Features'
      ];

      testTitles.forEach(title => {
        const features = service['extractFeatures'](title);
        
        if (title.includes('Waterproof')) expect(features).toContain('Waterproof');
        if (title.includes('Rechargeable')) expect(features).toContain('Rechargeable');
        if (title.includes('Premium')) expect(features).toContain('Premium');
        if (title.includes('Medical Grade')) expect(features).toContain('Medical grade');
      });
    });

    it('should generate appropriate benefits', () => {
      const highQualityProduct = {
        ...mockProduct,
        rating: 4.8,
        reviewCount: 500,
        price: 29.99,
        trendScore: 90
      };

      const benefits = service['generateBenefits'](highQualityProduct);
      
      expect(benefits).toContain('Highly rated by customers');
      expect(benefits).toContain('Proven customer satisfaction');
      expect(benefits).toContain('Affordable quality');
      expect(benefits).toContain('Currently trending product');
    });
  });

  describe('Image Processing', () => {
    it('should process product images in multiple sizes', async () => {
      const mockImageBuffer = Buffer.from('mock-image-data');
      mockAxios.get.mockResolvedValue({ data: mockImageBuffer });

      const processedImages = await service['processProductImages'](mockProduct);

      expect(mockAxios.get).toHaveBeenCalledWith(
        mockProduct.imageUrl,
        expect.objectContaining({
          responseType: 'arraybuffer',
          timeout: 10000,
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('Mozilla')
          })
        })
      );

      expect(mockSharp).toHaveBeenCalledWith(mockImageBuffer);
      expect(processedImages).toHaveLength(3); // thumb, medium, large
      expect(processedImages).toEqual([
        `/images/products/${mockProduct.id}-thumb.jpg`,
        `/images/products/${mockProduct.id}-medium.jpg`,
        `/images/products/${mockProduct.id}-large.jpg`
      ]);
    });

    it('should handle image download failures gracefully', async () => {
      mockAxios.get.mockRejectedValue(new Error('Image not found'));

      const processedImages = await service['processProductImages'](mockProduct);

      expect(processedImages).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith(
        `Error processing images for product ${mockProduct.id}:`,
        expect.any(Error)
      );
    });

    it('should handle image processing failures', async () => {
      mockAxios.get.mockResolvedValue({ data: Buffer.from('invalid-image') });
      
      const mockSharpInstance = {
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockRejectedValue(new Error('Invalid image format'))
      };
      (mockSharp as any).mockImplementation(() => mockSharpInstance);

      const processedImages = await service['processProductImages'](mockProduct);

      expect(processedImages).toEqual([]);
    });

    it('should handle missing image URL', async () => {
      const productWithoutImage = { ...mockProduct, imageUrl: '' };
      
      const processedImages = await service['processProductImages'](productWithoutImage);

      expect(processedImages).toEqual([]);
      expect(mockAxios.get).not.toHaveBeenCalled();
    });

    it('should create necessary directories', async () => {
      mockAxios.get.mockResolvedValue({ data: Buffer.from('image') });

      await service['processProductImages'](mockProduct);

      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('data/images/products'),
        { recursive: true }
      );
    });
  });

  describe('CMS Product Creation', () => {
    let mockCMSProduct: CMSProduct;

    beforeEach(() => {
      mockCMSProduct = {
        title: 'Test Wellness Product',
        description: 'A test product for wellness',
        content: '<div>Enhanced content</div>',
        price: 49.99,
        images: ['/images/products/test-thumb.jpg'],
        tags: ['wellness', 'health'],
        categories: ['Wellness'],
        sourceUrl: 'https://amazon.com/dp/B001',
        trendScore: 85,
        metadata: {
          amazonId: 'B001',
          rating: 4.5,
          reviewCount: 100,
          scrapedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        },
        seo: {
          metaTitle: 'Test Wellness Product - Premium Adult Wellness Products',
          metaDescription: 'Discover test wellness product...',
          slug: 'test-wellness-product'
        },
        status: 'published'
      };
    });

    it('should create CMS product successfully', async () => {
      const mockResponse = {
        data: { id: 'cms-product-123' }
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await service['createCMSProduct'](mockCMSProduct);

      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://cms.example.com/api/products',
        mockCMSProduct,
        {
          headers: {
            'Authorization': 'Bearer test-api-key-123',
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      expect(result).toEqual({
        success: true,
        productId: 'cms-product-123',
        message: 'Product created successfully'
      });
    });

    it('should handle CMS API errors', async () => {
      const apiError = {
        response: {
          data: {
            message: 'Validation failed',
            errors: ['Title is required', 'Price must be positive']
          }
        }
      };
      mockAxios.post.mockRejectedValue(apiError);

      const result = await service['createCMSProduct'](mockCMSProduct);

      expect(result).toEqual({
        success: false,
        message: 'Validation failed',
        errors: ['Title is required', 'Price must be positive']
      });
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network timeout');
      mockAxios.post.mockRejectedValue(networkError);

      const result = await service['createCMSProduct'](mockCMSProduct);

      expect(result).toEqual({
        success: false,
        message: 'Network timeout',
        errors: ['Network timeout']
      });
    });

    it('should handle missing CMS configuration', async () => {
      delete process.env.CMS_API_URL;
      delete process.env.CMS_API_KEY;
      
      const unconfiguredService = new CMSIntegrationService();
      const result = await unconfiguredService['createCMSProduct'](mockCMSProduct);

      expect(result).toEqual({
        success: false,
        message: 'CMS API configuration missing'
      });
    });
  });

  describe('Full Pipeline Processing', () => {
    let mockTrendAnalysisResult: TrendAnalysisResult;

    beforeEach(() => {
      mockTrendAnalysisResult = {
        googleTrends: {
          timestamp: new Date(),
          keywords: [
            {
              keyword: 'wellness',
              score: 85,
              geo: 'US',
              timestamp: new Date(),
              relatedQueries: ['health'],
              category: 'adult-products'
            }
          ],
          geographicTrends: [],
          summary: { totalKeywords: 1, averageScore: 85, topRegions: [] }
        },
        socialMediaTrends: [],
        productOpportunities: [
          {
            id: 'B001',
            title: 'High Quality Wellness Product with Sufficient Length',
            description: 'Great product for wellness',
            imageUrl: 'https://example.com/image.jpg',
            sourceUrl: 'https://amazon.com/dp/B001',
            platform: 'amazon',
            price: 49.99,
            rating: 4.5,
            reviewCount: 200,
            trendScore: 85,
            keywords: ['wellness', 'health'],
            scrapedAt: new Date()
          },
          {
            id: 'B002',
            title: 'Another Quality Product with Good Length',
            description: 'Another great product',
            imageUrl: 'https://example.com/image2.jpg',
            sourceUrl: 'https://amazon.com/dp/B002',
            platform: 'amazon',
            price: 39.99,
            rating: 4.0,
            reviewCount: 150,
            trendScore: 78,
            keywords: ['health', 'care'],
            scrapedAt: new Date()
          }
        ],
        recommendations: [],
        generatedAt: new Date()
      };

      // Mock successful image processing
      mockAxios.get.mockResolvedValue({ data: Buffer.from('image') });
      
      // Mock successful CMS creation
      let productCounter = 0;
      mockAxios.post.mockImplementation(() => {
        productCounter++;
        return Promise.resolve({
          data: { id: `cms-product-${productCounter}` }
        });
      });
    });

    it('should process trend analysis results successfully', async () => {
      const responses = await service.processTrendAnalysisResults(mockTrendAnalysisResult);

      expect(responses).toHaveLength(2);
      expect(responses.every(r => r.success)).toBe(true);
      
      expect(logger.info).toHaveBeenCalledWith('📦 Found 2 high-quality products for CMS integration');
      expect(logger.info).toHaveBeenCalledWith('🎯 CMS integration complete. 2/2 products created successfully');
    });

    it('should implement rate limiting between product creations', async () => {
      const startTime = Date.now();
      
      await service.processTrendAnalysisResults(mockTrendAnalysisResult);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should have at least 1 second delay between products (1000ms * 1 gap)
      expect(duration).toBeGreaterThan(900);
    });

    it('should handle mixed success/failure scenarios', async () => {
      let callCount = 0;
      mockAxios.post.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ data: { id: 'cms-product-1' } });
        } else {
          return Promise.reject(new Error('CMS API error'));
        }
      });

      const responses = await service.processTrendAnalysisResults(mockTrendAnalysisResult);

      expect(responses).toHaveLength(2);
      expect(responses[0].success).toBe(true);
      expect(responses[1].success).toBe(false);
      
      expect(logger.info).toHaveBeenCalledWith('🎯 CMS integration complete. 1/2 products created successfully');
    });

    it('should handle product conversion errors', async () => {
      // Mock image processing failure
      mockAxios.get.mockRejectedValue(new Error('Image download failed'));

      const responses = await service.processTrendAnalysisResults(mockTrendAnalysisResult);

      expect(responses).toHaveLength(2);
      responses.forEach(response => {
        expect(response).toMatchObject({
          success: expect.any(Boolean),
          message: expect.any(String)
        });
      });
    });

    it('should filter products appropriately', async () => {
      // Add low-quality products that should be filtered out
      const lowQualityProducts = [
        {
          id: 'B003',
          title: 'Bad', // Too short
          description: 'Low quality product',
          imageUrl: 'https://example.com/image3.jpg',
          sourceUrl: 'https://amazon.com/dp/B003',
          platform: 'amazon' as const,
          price: 9.99,
          rating: 2.0,
          reviewCount: 10,
          trendScore: 60, // Too low
          keywords: ['bad'],
          scrapedAt: new Date()
        }
      ];

      const extendedResult = {
        ...mockTrendAnalysisResult,
        productOpportunities: [...mockTrendAnalysisResult.productOpportunities, ...lowQualityProducts]
      };

      const responses = await service.processTrendAnalysisResults(extendedResult);

      // Should only process the 2 good products, not the bad one
      expect(responses).toHaveLength(2);
      expect(mockAxios.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('Content Enhancement', () => {
    let mockProduct: ProductTrend;
    let mockTrendResult: TrendAnalysisResult;

    beforeEach(() => {
      mockProduct = {
        id: 'B001',
        title: 'Premium Waterproof Rechargeable Wellness Device',
        description: 'High-quality wellness device for personal health',
        imageUrl: 'https://example.com/image.jpg',
        sourceUrl: 'https://amazon.com/dp/B001',
        platform: 'amazon',
        price: 79.99,
        rating: 4.7,
        reviewCount: 350,
        trendScore: 92,
        keywords: ['wellness', 'health', 'premium'],
        scrapedAt: new Date()
      };

      mockTrendResult = {
        googleTrends: {
          timestamp: new Date(),
          keywords: [
            {
              keyword: 'wellness',
              score: 85,
              geo: 'US',
              timestamp: new Date(),
              relatedQueries: ['health'],
              category: 'adult-products'
            }
          ],
          geographicTrends: [],
          summary: { totalKeywords: 1, averageScore: 85, topRegions: [] }
        },
        socialMediaTrends: [],
        productOpportunities: [],
        recommendations: [],
        generatedAt: new Date()
      };
    });

    it('should enhance product description with trend context', () => {
      const enhancedContent = service['enhanceProductDescription'](mockProduct, mockTrendResult);

      expect(enhancedContent).toContain('product-content');
      expect(enhancedContent).toContain('trend-highlight');
      expect(enhancedContent).toContain('Trending Now');
      expect(enhancedContent).toContain('wellness');
      expect(enhancedContent).toContain('product-features');
      expect(enhancedContent).toContain('Waterproof');
      expect(enhancedContent).toContain('Rechargeable');
      expect(enhancedContent).toContain('Premium');
      expect(enhancedContent).toContain('product-benefits');
      expect(enhancedContent).toContain('Highly rated by customers');
      expect(enhancedContent).toContain('Trend Score: 92/100');
    });

    it('should get trend context when product keywords match', () => {
      const context = service['getTrendContext'](mockProduct, mockTrendResult);

      expect(context).toContain('Trending Now');
      expect(context).toContain('wellness');
      expect(context).toContain('Score: 85');
    });

    it('should return null when no trend context matches', () => {
      const unrelatedProduct = {
        ...mockProduct,
        keywords: ['unrelated', 'different']
      };

      const context = service['getTrendContext'](unrelatedProduct, mockTrendResult);

      expect(context).toBeNull();
    });

    it('should extract features correctly', () => {
      const features = service['extractFeatures'](mockProduct.title);

      expect(features).toContain('Waterproof');
      expect(features).toContain('Rechargeable');
      expect(features).toContain('Premium');
    });

    it('should generate benefits based on product metrics', () => {
      const benefits = service['generateBenefits'](mockProduct);

      expect(benefits).toContain('Highly rated by customers'); // rating >= 4.0
      expect(benefits).toContain('Proven customer satisfaction'); // reviewCount >= 100
      expect(benefits).toContain('Premium quality construction'); // price > 100
      expect(benefits).toContain('Currently trending product'); // trendScore >= 80
    });
  });

  describe('Product Updates', () => {
    it('should handle existing product updates', async () => {
      const mockResult: TrendAnalysisResult = {
        googleTrends: {
          timestamp: new Date(),
          keywords: [],
          geographicTrends: [],
          summary: { totalKeywords: 0, averageScore: 0, topRegions: [] }
        },
        socialMediaTrends: [],
        productOpportunities: [],
        recommendations: [],
        generatedAt: new Date()
      };

      const responses = await service.updateExistingProducts(mockResult);

      expect(responses).toEqual([]);
      expect(logger.info).toHaveBeenCalledWith('🔄 Updating existing CMS products with latest trend data');
      expect(logger.info).toHaveBeenCalledWith('📝 Product updates feature to be implemented based on CMS structure');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle complete pipeline failure gracefully', async () => {
      const invalidResult = {
        productOpportunities: null
      } as any;

      await expect(service.processTrendAnalysisResults(invalidResult)).rejects.toThrow();
      expect(logger.error).toHaveBeenCalledWith('❌ Error in CMS integration pipeline:', expect.any(Error));
    });

    it('should handle individual product processing errors', async () => {
      const mockResult: TrendAnalysisResult = {
        googleTrends: {
          timestamp: new Date(),
          keywords: [],
          geographicTrends: [],
          summary: { totalKeywords: 0, averageScore: 0, topRegions: [] }
        },
        socialMediaTrends: [],
        productOpportunities: [
          {
            id: 'B001',
            title: 'Good Product with Sufficient Length for Testing',
            description: 'Valid product',
            imageUrl: 'https://example.com/image.jpg',
            sourceUrl: 'https://amazon.com/dp/B001',
            platform: 'amazon',
            price: 49.99,
            rating: 4.5,
            reviewCount: 100,
            trendScore: 85,
            keywords: ['wellness'],
            scrapedAt: new Date()
          }
        ],
        recommendations: [],
        generatedAt: new Date()
      };

      // Mock conversion failure
      const originalConvert = service['convertProductToCMS'];
      service['convertProductToCMS'] = jest.fn().mockRejectedValue(new Error('Conversion failed'));

      const responses = await service.processTrendAnalysisResults(mockResult);

      expect(responses).toHaveLength(1);
      expect(responses[0].success).toBe(false);
      expect(responses[0].message).toContain('Error processing product');

      // Restore original method
      service['convertProductToCMS'] = originalConvert;
    });

    it('should handle timeout errors in CMS requests', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded'
      };
      mockAxios.post.mockRejectedValue(timeoutError);

      const mockCMSProduct = {
        title: 'Test Product',
        description: 'Test',
        content: 'Test content',
        price: 29.99,
        images: [],
        tags: [],
        categories: [],
        sourceUrl: 'test',
        trendScore: 80,
        metadata: {
          scrapedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        },
        seo: {
          metaTitle: 'Test',
          metaDescription: 'Test',
          slug: 'test'
        },
        status: 'draft' as const
      };

      const result = await service['createCMSProduct'](mockCMSProduct);

      expect(result.success).toBe(false);
      expect(result.message).toContain('timeout');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large numbers of products efficiently', async () => {
      const largeProductList: ProductTrend[] = Array(100).fill(0).map((_, i) => ({
        id: `B${i.toString().padStart(3, '0')}`,
        title: `Product ${i} with sufficient length for testing purposes`,
        description: `Description for product ${i}`,
        imageUrl: `https://example.com/image${i}.jpg`,
        sourceUrl: `https://amazon.com/dp/B${i}`,
        platform: 'amazon' as const,
        price: 25 + Math.random() * 50,
        rating: 3.5 + Math.random() * 1.5,
        reviewCount: Math.floor(Math.random() * 500),
        trendScore: 70 + Math.random() * 30,
        keywords: ['wellness', 'health'],
        scrapedAt: new Date()
      }));

      const largeResult: TrendAnalysisResult = {
        googleTrends: {
          timestamp: new Date(),
          keywords: [],
          geographicTrends: [],
          summary: { totalKeywords: 0, averageScore: 0, topRegions: [] }
        },
        socialMediaTrends: [],
        productOpportunities: largeProductList,
        recommendations: [],
        generatedAt: new Date()
      };

      // Mock fast CMS responses
      mockAxios.post.mockResolvedValue({ data: { id: 'test-id' } });
      mockAxios.get.mockResolvedValue({ data: Buffer.from('image') });

      const responses = await service.processTrendAnalysisResults(largeResult);

      // Should only process top 20 products
      expect(responses.length).toBeLessThanOrEqual(20);
    });

    it('should handle memory efficiently with large datasets', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Process a moderate number of products
      const products: ProductTrend[] = Array(50).fill(0).map((_, i) => ({
        id: `B${i}`,
        title: `Product ${i} with adequate length for testing`,
        description: `Description ${i}`,
        imageUrl: `https://example.com/image${i}.jpg`,
        sourceUrl: `https://amazon.com/dp/B${i}`,
        platform: 'amazon' as const,
        price: 30,
        rating: 4.0,
        reviewCount: 100,
        trendScore: 75,
        keywords: ['test'],
        scrapedAt: new Date()
      }));

      const result: TrendAnalysisResult = {
        googleTrends: {
          timestamp: new Date(),
          keywords: [],
          geographicTrends: [],
          summary: { totalKeywords: 0, averageScore: 0, topRegions: [] }
        },
        socialMediaTrends: [],
        productOpportunities: products,
        recommendations: [],
        generatedAt: new Date()
      };

      mockAxios.post.mockResolvedValue({ data: { id: 'test' } });
      mockAxios.get.mockResolvedValue({ data: Buffer.from('small-image') });

      await service.processTrendAnalysisResults(result);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});

// Integration tests for CMS integration
describe('CMSIntegrationService - Integration Tests', () => {
  let service: CMSIntegrationService;

  beforeEach(() => {
    process.env.CMS_API_URL = 'https://test-cms.example.com/api';
    process.env.CMS_API_KEY = 'test-key';
    service = new CMSIntegrationService();
  });

  it('should generate realistic product data for CMS', () => {
    const realisticProduct: ProductTrend = {
      id: 'B08XQPZG4M',
      title: 'Premium Waterproof Rechargeable Personal Wellness Device - Quiet Motor, Medical Grade Silicone',
      description: 'Experience ultimate wellness with this premium personal care device. Features quiet motor technology and medical-grade silicone construction for safe, comfortable use.',
      imageUrl: 'https://m.media-amazon.com/images/I/61234567890._AC_SL1500_.jpg',
      sourceUrl: 'https://amazon.com/dp/B08XQPZG4M',
      platform: 'amazon',
      price: 89.99,
      rating: 4.6,
      reviewCount: 1247,
      trendScore: 87,
      keywords: ['wellness', 'personal', 'care', 'premium', 'health'],
      scrapedAt: new Date()
    };

    const categories = service['inferCategories'](realisticProduct);
    const tags = service['generateTags'](realisticProduct, {
      googleTrends: { keywords: [{ keyword: 'wellness', score: 85 } as any] },
      socialMediaTrends: [],
      productOpportunities: [],
      recommendations: [],
      generatedAt: new Date()
    } as any);
    const features = service['extractFeatures'](realisticProduct.title);
    const benefits = service['generateBenefits'](realisticProduct);

    expect(categories).toContain('Wellness');
    expect(categories).toContain('Personal Care');
    
    expect(tags).toContain('wellness');
    expect(tags).toContain('premium');
    expect(tags).toContain('popular');
    expect(tags).toContain('trending');
    
    expect(features).toContain('Waterproof');
    expect(features).toContain('Rechargeable');
    expect(features).toContain('Quiet');
    expect(features).toContain('Medical grade');
    
    expect(benefits).toContain('Highly rated by customers');
    expect(benefits).toContain('Proven customer satisfaction');
    expect(benefits).toContain('Premium quality construction');
    expect(benefits).toContain('Currently trending product');
  });

  it('should handle realistic title cleaning scenarios', () => {
    const realTitles = [
      'Amazon Basics Personal Wellness Device with Multiple Settings',
      'eBay Special: Premium Health Care Tool - Fast Shipping!',
      'Etsy Handmade Intimate Care Product (Discreet Packaging)',
      'Premium Wellness Device | Waterproof & Rechargeable | FDA Approved',
      'Personal Care Tool - 10 Vibration Patterns - USB Rechargeable - Quiet Motor'
    ];

    realTitles.forEach(title => {
      const cleaned = service['cleanTitle'](title);
      
      expect(cleaned).not.toContain('Amazon');
      expect(cleaned).not.toContain('eBay');
      expect(cleaned).not.toContain('Etsy');
      expect(cleaned).toMatch(/^[a-zA-Z0-9\s-]+$/);
      expect(cleaned.length).toBeLessThanOrEqual(80);
    });
  });
});