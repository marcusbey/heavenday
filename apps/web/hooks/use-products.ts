import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { ExtendedProductFilters } from '@heaven-dolls/types';

export function useProducts(filters?: ExtendedProductFilters, page = 1, pageSize = 12) {
  return useQuery({
    queryKey: ['products', filters, page, pageSize],
    queryFn: () => apiClient.getProducts(filters, page, pageSize),
    keepPreviousData: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useInfiniteProducts(filters?: ExtendedProductFilters, pageSize = 12) {
  return useInfiniteQuery({
    queryKey: ['products-infinite', filters, pageSize],
    queryFn: ({ pageParam = 1 }) => apiClient.getProducts(filters, pageParam, pageSize),
    getNextPageParam: (lastPage) => {
      const { page, pageCount } = lastPage.meta.pagination;
      return page < pageCount ? page + 1 : undefined;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: () => apiClient.getProduct(slug),
    enabled: !!slug,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useFeaturedProducts(limit = 8) {
  return useQuery({
    queryKey: ['featured-products', limit],
    queryFn: () => apiClient.getFeaturedProducts(limit),
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
}

export function useTrendingProducts(limit = 8) {
  return useQuery({
    queryKey: ['trending-products', limit],
    queryFn: () => apiClient.getTrendingProducts(limit),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useSearchProducts(
  query: string, 
  filters?: ExtendedProductFilters,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['search-products', query, filters],
    queryFn: () => apiClient.searchProducts(query, filters),
    enabled: options?.enabled ?? query.length >= 2,
    staleTime: 1000 * 60 * 5,
  });
}