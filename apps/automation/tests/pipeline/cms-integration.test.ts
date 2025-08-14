import { CmsIntegration } from '../../src/pipeline/cms-integration';
import axios from 'axios';
import { createMockProductData, createMockTrendData } from '../setup';

jest.mock('axios');
jest.mock('../../src/utils/logger');

describe('CmsIntegration', () => {
  let cmsIntegration: CmsIntegration;
  const mockAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    jest.clearAllMocks();
    cmsIntegration = new CmsIntegration();
    
    // Mock axios create method
    mockAxios.create = jest.fn().mockReturnValue({
      post: jest.fn(),
      put: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    } as any);
  });

  describe('syncProducts', () => {
    it('successfully syncs products to CMS', async () => {
      const mockProducts = [
        createMockProductData(),
        createMockProductData(),
      ];
      
      const mockApiClient = mockAxios.create();
      (mockApiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { data: { id: 1, attributes: mockProducts[0] } },
      });

      await cmsIntegration.syncProducts(mockProducts);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/products',
        expect.objectContaining({
          data: expect.objectContaining({
            name: mockProducts[0].title,
            description: mockProducts[0].description,
            price: mockProducts[0].price,
            trendScore: mockProducts[0].trendScore,
          }),
        })
      );
    });

    it('handles product sync errors', async () => {
      const mockProducts = [createMockProductData()];
      const mockError = new Error('API Error');
      
      const mockApiClient = mockAxios.create();
      (mockApiClient.post as jest.Mock).mockRejectedValueOnce(mockError);

      await expect(cmsIntegration.syncProducts(mockProducts)).rejects.toThrow();
    });

    it('validates product data before syncing', async () => {
      const invalidProduct = {
        id: 'invalid',
        // Missing required fields
      };

      await expect(
        cmsIntegration.syncProducts([invalidProduct as any])
      ).rejects.toThrow();
    });

    it('batches large product syncs', async () => {
      const mockProducts = Array(150).fill(null).map(() => createMockProductData());
      const mockApiClient = mockAxios.create();
      (mockApiClient.post as jest.Mock).mockResolvedValue({
        data: { data: { id: 1 } },
      });

      await cmsIntegration.syncProducts(mockProducts);

      // Should batch in groups of 100
      expect(mockApiClient.post).toHaveBeenCalledTimes(150);
    });
  });

  describe('syncTrends', () => {
    it('successfully syncs trend data to CMS', async () => {
      const mockTrendData = createMockTrendData();
      const mockApiClient = mockAxios.create();
      
      (mockApiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { data: { id: 1 } },
      });

      await cmsIntegration.syncTrends(mockTrendData);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/trends',
        expect.objectContaining({
          data: expect.objectContaining({
            keywords: mockTrendData.keywords,
            geographicTrends: mockTrendData.geographicTrends,
            summary: mockTrendData.summary,
          }),
        })
      );
    });

    it('handles trend sync errors gracefully', async () => {
      const mockTrendData = createMockTrendData();
      const mockApiClient = mockAxios.create();
      
      (mockApiClient.post as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(cmsIntegration.syncTrends(mockTrendData)).rejects.toThrow();
    });
  });

  describe('updateProductImages', () => {
    it('uploads and associates images with products', async () => {
      const productId = '123';
      const imageUrls = ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'];
      
      const mockApiClient = mockAxios.create();
      (mockApiClient.post as jest.Mock).mockResolvedValueOnce({
        data: [{ id: 1 }, { id: 2 }],
      });
      
      (mockApiClient.put as jest.Mock).mockResolvedValueOnce({
        data: { data: { id: productId } },
      });

      await cmsIntegration.updateProductImages(productId, imageUrls);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/upload',
        expect.any(FormData),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'multipart/form-data',
          }),
        })
      );
    });
  });

  describe('createProductVariants', () => {
    it('creates product variants in CMS', async () => {
      const productId = '123';
      const variants = [
        { sku: 'VAR-001', price: 29.99, attributes: { color: 'Red' } },
        { sku: 'VAR-002', price: 29.99, attributes: { color: 'Blue' } },
      ];
      
      const mockApiClient = mockAxios.create();
      (mockApiClient.post as jest.Mock).mockResolvedValue({
        data: { data: { id: 1 } },
      });

      await cmsIntegration.createProductVariants(productId, variants);

      expect(mockApiClient.post).toHaveBeenCalledTimes(2);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/product-variants',
        expect.objectContaining({
          data: expect.objectContaining({
            sku: variants[0].sku,
            price: variants[0].price,
            product: productId,
          }),
        })
      );
    });
  });

  describe('Authentication', () => {
    it('includes API token in requests', async () => {
      process.env.STRAPI_API_TOKEN = 'test-token';
      
      const mockApiClient = mockAxios.create();
      const interceptorCall = (mockApiClient.interceptors.request.use as jest.Mock).mock.calls[0][0];
      
      const config = { headers: {} };
      const result = interceptorCall(config);
      
      expect(result.headers.Authorization).toBe('Bearer test-token');
    });

    it('handles missing API token', async () => {
      delete process.env.STRAPI_API_TOKEN;
      
      jest.resetModules();
      
      expect(() => new CmsIntegration()).toThrow();
    });
  });

  describe('Error Handling', () => {
    it('retries failed requests', async () => {
      const mockProducts = [createMockProductData()];
      const mockApiClient = mockAxios.create();
      
      (mockApiClient.post as jest.Mock)
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({ data: { data: { id: 1 } } });

      await cmsIntegration.syncProducts(mockProducts);

      expect(mockApiClient.post).toHaveBeenCalledTimes(2);
    });

    it('logs detailed error information', async () => {
      const mockError = {
        response: {
          status: 400,
          data: { error: { message: 'Validation error' } },
        },
      };
      
      const mockApiClient = mockAxios.create();
      (mockApiClient.post as jest.Mock).mockRejectedValueOnce(mockError);

      await expect(
        cmsIntegration.syncProducts([createMockProductData()])
      ).rejects.toThrow();
    });
  });
});