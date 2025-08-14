import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

// Create a custom render function that includes providers
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

interface AllTheProvidersProps {
  children: React.ReactNode;
}

const AllTheProviders: React.FC<AllTheProvidersProps> = ({ children }) => {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const user = userEvent.setup();
  
  return {
    user,
    ...render(ui, { wrapper: AllTheProviders, ...options }),
  };
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Test data factories
export const createMockProduct = (overrides = {}) => ({
  id: 1,
  attributes: {
    name: 'Test Product',
    slug: 'test-product',
    description: 'A test product description',
    price: 99.99,
    compareAtPrice: 129.99,
    currency: 'USD',
    sku: 'TEST-001',
    inventory: 50,
    featured: false,
    status: 'active',
    averageRating: 4.5,
    reviewCount: 10,
    trendScore: 85,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    publishedAt: '2024-01-01T00:00:00Z',
    images: {
      data: [
        {
          id: 1,
          attributes: {
            url: '/test-image.jpg',
            alternativeText: 'Test product image',
            width: 800,
            height: 600,
          },
        },
      ],
    },
    categories: {
      data: [
        {
          id: 1,
          attributes: {
            name: 'Test Category',
            slug: 'test-category',
          },
        },
      ],
    },
    brand: {
      data: {
        id: 1,
        attributes: {
          name: 'Test Brand',
          slug: 'test-brand',
        },
      },
    },
    ...overrides,
  },
});

export const createMockCategory = (overrides = {}) => ({
  id: 1,
  attributes: {
    name: 'Test Category',
    slug: 'test-category',
    description: 'A test category',
    image: {
      data: {
        id: 1,
        attributes: {
          url: '/category-image.jpg',
          alternativeText: 'Test category image',
        },
      },
    },
    products: {
      data: [createMockProduct()],
    },
    ...overrides,
  },
});

export const createMockReview = (overrides = {}) => ({
  id: 1,
  attributes: {
    rating: 5,
    comment: 'Great product!',
    author: 'Test User',
    verified: true,
    helpful: 10,
    createdAt: '2024-01-01T00:00:00Z',
    product: {
      data: createMockProduct(),
    },
    ...overrides,
  },
});

// Mock API responses
export const mockApiResponse = (data: any, meta = {}) => ({
  data,
  meta: {
    pagination: {
      page: 1,
      pageSize: 10,
      pageCount: 1,
      total: Array.isArray(data) ? data.length : 1,
    },
    ...meta,
  },
});

// Test helpers
export const waitForLoadingToFinish = () =>
  screen.findByText(/loading/i, {}, { timeout: 3000 }).then(
    () => screen.waitForElementToBeRemoved(() => screen.queryByText(/loading/i))
  );

export { screen } from '@testing-library/react';