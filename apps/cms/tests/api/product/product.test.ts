import productController from '../../../src/api/product/controllers/product';
import productService from '../../../src/api/product/services/product';
import { createMockContext, createTestProduct, createTestCategory } from '../../setup';

jest.mock('../../../src/api/product/services/product');

describe('Product API', () => {
  describe('Controller', () => {
    let ctx: any;

    beforeEach(() => {
      jest.clearAllMocks();
      ctx = createMockContext();
    });

    describe('find', () => {
      it('returns all products with default pagination', async () => {
        const mockProducts = [
          createTestProduct({ id: 1 }),
          createTestProduct({ id: 2 }),
        ];

        (productService.find as jest.Mock).mockResolvedValue({
          results: mockProducts,
          pagination: {
            page: 1,
            pageSize: 25,
            pageCount: 1,
            total: 2,
          },
        });

        await productController.find(ctx);

        expect(productService.find).toHaveBeenCalledWith({
          populate: expect.any(Object),
          filters: {},
          sort: { createdAt: 'desc' },
          pagination: {
            page: 1,
            pageSize: 25,
          },
        });

        expect(ctx.send).toHaveBeenCalledWith({
          data: mockProducts,
          meta: {
            pagination: {
              page: 1,
              pageSize: 25,
              pageCount: 1,
              total: 2,
            },
          },
        });
      });

      it('applies filters correctly', async () => {
        ctx.request.query = {
          filters: {
            categories: { id: { $in: [1, 2] } },
            price: { $gte: 50, $lte: 200 },
            status: 'active',
          },
        };

        (productService.find as jest.Mock).mockResolvedValue({
          results: [],
          pagination: { page: 1, pageSize: 25, pageCount: 0, total: 0 },
        });

        await productController.find(ctx);

        expect(productService.find).toHaveBeenCalledWith({
          populate: expect.any(Object),
          filters: {
            categories: { id: { $in: [1, 2] } },
            price: { $gte: 50, $lte: 200 },
            status: 'active',
          },
          sort: { createdAt: 'desc' },
          pagination: { page: 1, pageSize: 25 },
        });
      });

      it('handles search queries', async () => {
        ctx.request.query = {
          _q: 'wellness product',
        };

        (productService.find as jest.Mock).mockResolvedValue({
          results: [],
          pagination: { page: 1, pageSize: 25, pageCount: 0, total: 0 },
        });

        await productController.find(ctx);

        expect(productService.find).toHaveBeenCalledWith({
          populate: expect.any(Object),
          filters: {
            $or: [
              { name: { $containsi: 'wellness product' } },
              { description: { $containsi: 'wellness product' } },
            ],
          },
          sort: { createdAt: 'desc' },
          pagination: { page: 1, pageSize: 25 },
        });
      });

      it('handles sorting options', async () => {
        ctx.request.query = {
          sort: 'price:asc',
        };

        (productService.find as jest.Mock).mockResolvedValue({
          results: [],
          pagination: { page: 1, pageSize: 25, pageCount: 0, total: 0 },
        });

        await productController.find(ctx);

        expect(productService.find).toHaveBeenCalledWith({
          populate: expect.any(Object),
          filters: {},
          sort: { price: 'asc' },
          pagination: { page: 1, pageSize: 25 },
        });
      });

      it('handles trending products', async () => {
        ctx.request.query = {
          filters: { featured: true },
          sort: 'trendScore:desc',
        };

        const trendingProducts = [
          createTestProduct({ id: 1, featured: true, trendScore: 95 }),
          createTestProduct({ id: 2, featured: true, trendScore: 90 }),
        ];

        (productService.find as jest.Mock).mockResolvedValue({
          results: trendingProducts,
          pagination: { page: 1, pageSize: 25, pageCount: 1, total: 2 },
        });

        await productController.find(ctx);

        expect(productService.find).toHaveBeenCalledWith({
          populate: expect.any(Object),
          filters: { featured: true },
          sort: { trendScore: 'desc' },
          pagination: { page: 1, pageSize: 25 },
        });
      });
    });

    describe('findOne', () => {
      it('returns a single product by id', async () => {
        const mockProduct = createTestProduct({ id: 1 });
        ctx.params = { id: '1' };

        (productService.findOne as jest.Mock).mockResolvedValue(mockProduct);

        await productController.findOne(ctx);

        expect(productService.findOne).toHaveBeenCalledWith(1, {
          populate: expect.any(Object),
        });

        expect(ctx.send).toHaveBeenCalledWith({
          data: mockProduct,
        });
      });

      it('returns 404 when product not found', async () => {
        ctx.params = { id: '999' };

        (productService.findOne as jest.Mock).mockResolvedValue(null);

        await productController.findOne(ctx);

        expect(ctx.notFound).toHaveBeenCalledWith('Product not found');
      });

      it('finds product by slug', async () => {
        const mockProduct = createTestProduct({ slug: 'test-product' });
        ctx.params = { id: 'test-product' };

        (productService.findOne as jest.Mock)
          .mockResolvedValueOnce(null) // First call with ID fails
          .mockResolvedValueOnce(mockProduct); // Second call with slug succeeds

        await productController.findOne(ctx);

        expect(productService.findOne).toHaveBeenCalledTimes(2);
        expect(productService.findOne).toHaveBeenLastCalledWith(
          { slug: 'test-product' },
          expect.any(Object)
        );
        expect(ctx.send).toHaveBeenCalledWith({ data: mockProduct });
      });
    });

    describe('create', () => {
      it('creates a new product', async () => {
        const productData = {
          name: 'New Product',
          description: 'Description',
          price: 49.99,
          sku: 'NEW001',
          categories: [1, 2],
        };

        ctx.request.body = { data: productData };

        const createdProduct = createTestProduct({ ...productData, id: 3 });
        (productService.create as jest.Mock).mockResolvedValue(createdProduct);

        await productController.create(ctx);

        expect(productService.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            ...productData,
            slug: expect.any(String),
          }),
        });

        expect(ctx.send).toHaveBeenCalledWith({
          data: createdProduct,
        });
      });

      it('validates required fields', async () => {
        ctx.request.body = {
          data: {
            // Missing required fields
            description: 'Test',
          },
        };

        await productController.create(ctx);

        expect(ctx.badRequest).toHaveBeenCalledWith(
          expect.stringContaining('required')
        );
      });

      it('handles duplicate SKU error', async () => {
        ctx.request.body = {
          data: {
            name: 'Product',
            price: 99.99,
            sku: 'EXISTING001',
          },
        };

        (productService.create as jest.Mock).mockRejectedValue(
          new Error('Unique constraint violation')
        );

        await expect(productController.create(ctx)).rejects.toThrow();
      });
    });

    describe('update', () => {
      it('updates an existing product', async () => {
        ctx.params = { id: '1' };
        ctx.request.body = {
          data: {
            name: 'Updated Product',
            price: 79.99,
          },
        };

        const updatedProduct = createTestProduct({
          id: 1,
          name: 'Updated Product',
          price: 79.99,
        });

        (productService.update as jest.Mock).mockResolvedValue(updatedProduct);

        await productController.update(ctx);

        expect(productService.update).toHaveBeenCalledWith(1, {
          data: {
            name: 'Updated Product',
            price: 79.99,
          },
        });

        expect(ctx.send).toHaveBeenCalledWith({
          data: updatedProduct,
        });
      });

      it('regenerates slug when name changes', async () => {
        ctx.params = { id: '1' };
        ctx.request.body = {
          data: {
            name: 'Completely New Name',
          },
        };

        const updatedProduct = createTestProduct({
          id: 1,
          name: 'Completely New Name',
          slug: 'completely-new-name',
        });

        (productService.update as jest.Mock).mockResolvedValue(updatedProduct);

        await productController.update(ctx);

        expect(productService.update).toHaveBeenCalledWith(1, {
          data: {
            name: 'Completely New Name',
            slug: 'completely-new-name',
          },
        });
      });
    });

    describe('delete', () => {
      it('deletes a product', async () => {
        ctx.params = { id: '1' };

        (productService.delete as jest.Mock).mockResolvedValue({
          id: 1,
        });

        await productController.delete(ctx);

        expect(productService.delete).toHaveBeenCalledWith(1);
        expect(ctx.send).toHaveBeenCalledWith({
          data: { id: 1 },
        });
      });

      it('returns 404 when product not found', async () => {
        ctx.params = { id: '999' };

        (productService.delete as jest.Mock).mockResolvedValue(null);

        await productController.delete(ctx);

        expect(ctx.notFound).toHaveBeenCalledWith('Product not found');
      });
    });

    describe('bulkAction', () => {
      it('performs bulk update on products', async () => {
        ctx.request.body = {
          ids: [1, 2, 3],
          action: 'update',
          data: { status: 'inactive' },
        };

        await productController.bulkAction(ctx);

        expect(productService.update).toHaveBeenCalledTimes(3);
        expect(ctx.send).toHaveBeenCalledWith({
          message: 'Bulk action completed',
          affected: 3,
        });
      });

      it('performs bulk delete on products', async () => {
        ctx.request.body = {
          ids: [1, 2],
          action: 'delete',
        };

        await productController.bulkAction(ctx);

        expect(productService.delete).toHaveBeenCalledTimes(2);
        expect(ctx.send).toHaveBeenCalledWith({
          message: 'Bulk action completed',
          affected: 2,
        });
      });
    });
  });

  describe('Middleware', () => {
    it('validates create request', async () => {
      const validateCreate = require('../../../src/api/product/middlewares/validate-create');
      const ctx = createMockContext({
        request: {
          body: {
            data: {
              name: '',
              price: -10,
            },
          },
        },
      });

      const next = jest.fn();
      await validateCreate(ctx, next);

      expect(ctx.badRequest).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('populates default fields', async () => {
      const populateDefaults = require('../../../src/api/product/middlewares/populate-defaults');
      const ctx = createMockContext();
      
      const next = jest.fn();
      await populateDefaults(ctx, next);

      expect(ctx.query.populate).toBeDefined();
      expect(next).toHaveBeenCalled();
    });
  });
});