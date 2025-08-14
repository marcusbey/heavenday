import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProducts } from '../use-products';
import { createMockProduct, mockApiResponse } from '../../tests/utils/test-utils';
import * as api from '../../lib/api';

jest.mock('../../lib/api');

describe('useProducts', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('fetches products successfully', async () => {
    const mockProducts = [
      createMockProduct({ id: 1 }),
      createMockProduct({ id: 2 }),
    ];
    const mockResponse = mockApiResponse(mockProducts);

    (api.fetchProducts as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useProducts(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockResponse);
    expect(api.fetchProducts).toHaveBeenCalledWith({
      page: 1,
      pageSize: 12,
      sort: 'createdAt:desc',
    });
  });

  it('applies filters correctly', async () => {
    const mockResponse = mockApiResponse([]);
    (api.fetchProducts as jest.Mock).mockResolvedValueOnce(mockResponse);

    const filters = {
      categories: ['1', '2'],
      priceRange: [10, 100],
      brands: ['brand-1'],
      inStock: true,
    };

    const { result } = renderHook(() => useProducts(filters), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.fetchProducts).toHaveBeenCalledWith({
      page: 1,
      pageSize: 12,
      sort: 'createdAt:desc',
      filters: {
        categories: { id: { $in: ['1', '2'] } },
        price: { $gte: 10, $lte: 100 },
        brand: { id: { $in: ['brand-1'] } },
        inventory: { $gt: 0 },
      },
    });
  });

  it('handles pagination', async () => {
    const mockResponse = mockApiResponse([]);
    (api.fetchProducts as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(
      () => useProducts({}, { page: 2, pageSize: 24 }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.fetchProducts).toHaveBeenCalledWith({
      page: 2,
      pageSize: 24,
      sort: 'createdAt:desc',
    });
  });

  it('handles sorting options', async () => {
    const mockResponse = mockApiResponse([]);
    (api.fetchProducts as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(
      () => useProducts({}, { sort: 'price:asc' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.fetchProducts).toHaveBeenCalledWith({
      page: 1,
      pageSize: 12,
      sort: 'price:asc',
    });
  });

  it('handles search query', async () => {
    const mockResponse = mockApiResponse([]);
    (api.fetchProducts as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(
      () => useProducts({ search: 'test product' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.fetchProducts).toHaveBeenCalledWith({
      page: 1,
      pageSize: 12,
      sort: 'createdAt:desc',
      filters: {
        $or: [
          { name: { $containsi: 'test product' } },
          { description: { $containsi: 'test product' } },
        ],
      },
    });
  });

  it('handles API errors', async () => {
    const mockError = new Error('API Error');
    (api.fetchProducts as jest.Mock).mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useProducts(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(mockError);
  });

  it('refetches data when filters change', async () => {
    const mockResponse = mockApiResponse([]);
    (api.fetchProducts as jest.Mock).mockResolvedValue(mockResponse);

    const { result, rerender } = renderHook(
      ({ filters }) => useProducts(filters),
      {
        wrapper,
        initialProps: { filters: {} },
      }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.fetchProducts).toHaveBeenCalledTimes(1);

    // Change filters
    rerender({ filters: { categories: ['1'] } });

    await waitFor(() => {
      expect(api.fetchProducts).toHaveBeenCalledTimes(2);
    });
  });
});