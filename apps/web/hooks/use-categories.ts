import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => apiClient.getCategories(),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

export function useCategory(slug: string) {
  return useQuery({
    queryKey: ['category', slug],
    queryFn: () => apiClient.getCategory(slug),
    enabled: !!slug,
    staleTime: 1000 * 60 * 30,
  });
}

export function useFeaturedCategories() {
  return useQuery({
    queryKey: ['featured-categories'],
    queryFn: () => apiClient.getFeaturedCategories(),
    staleTime: 1000 * 60 * 30,
  });
}