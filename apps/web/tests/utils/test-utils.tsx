import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';

// Add jest-axe matcher
expect.extend(toHaveNoViolations);

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

// Accessibility testing helpers
export const checkA11y = async (container: Element | HTMLDocument = document.body) => {
  const results = await axe(container);
  expect(results).toHaveNoViolations();
};

export const renderWithA11yCheck = async (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const renderResult = customRender(ui, options);
  
  // Run accessibility check after render
  await checkA11y(renderResult.container);
  
  return renderResult;
};

// Performance testing helpers
export const measureRenderTime = (renderFn: () => void) => {
  const startTime = performance.now();
  renderFn();
  const endTime = performance.now();
  return endTime - startTime;
};

export const expectRenderTimeUnder = (maxTime: number, renderFn: () => void) => {
  const renderTime = measureRenderTime(renderFn);
  expect(renderTime).toBeLessThan(maxTime);
};

// Responsive design testing helpers
export const mockViewport = (width: number, height: number = 768) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  
  // Trigger resize event
  window.dispatchEvent(new Event('resize'));
};

export const viewports = {
  mobile: { width: 375, height: 667 },
  mobileLarge: { width: 414, height: 896 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1024, height: 768 },
  desktopLarge: { width: 1440, height: 900 },
  desktopXL: { width: 1920, height: 1080 },
};

export const testResponsiveComponent = async (
  component: React.ReactElement,
  viewportSizes: Array<keyof typeof viewports> = ['mobile', 'tablet', 'desktop']
) => {
  const results: Array<{ viewport: string; renderTime: number; hasA11yViolations: boolean }> = [];
  
  for (const viewport of viewportSizes) {
    const { width, height } = viewports[viewport];
    mockViewport(width, height);
    
    const renderTime = measureRenderTime(() => {
      render(component);
    });
    
    let hasA11yViolations = false;
    try {
      await checkA11y();
    } catch (error) {
      hasA11yViolations = true;
    }
    
    results.push({
      viewport,
      renderTime,
      hasA11yViolations
    });
  }
  
  return results;
};

// User interaction helpers
export const typeInSearchBox = async (user: ReturnType<typeof userEvent.setup>, searchTerm: string) => {
  const searchInput = screen.getByRole('searchbox');
  await user.clear(searchInput);
  await user.type(searchInput, searchTerm);
  return searchInput;
};

export const selectFromDropdown = async (
  user: ReturnType<typeof userEvent.setup>,
  triggerText: string,
  optionText: string
) => {
  const trigger = screen.getByText(triggerText);
  await user.click(trigger);
  
  const option = screen.getByText(optionText);
  await user.click(option);
  
  return option;
};

export const addProductToCart = async (
  user: ReturnType<typeof userEvent.setup>,
  productName?: string
) => {
  const addToCartButton = productName 
    ? screen.getByRole('button', { name: new RegExp(`add.*${productName}.*cart`, 'i') })
    : screen.getByRole('button', { name: /add.*cart/i });
  
  await user.click(addToCartButton);
  return addToCartButton;
};

export const addProductToWishlist = async (
  user: ReturnType<typeof userEvent.setup>,
  productName?: string
) => {
  const wishlistButton = productName
    ? screen.getByRole('button', { name: new RegExp(`add.*${productName}.*wishlist`, 'i') })
    : screen.getByRole('button', { name: /add.*wishlist|heart/i });
  
  await user.click(wishlistButton);
  return wishlistButton;
};

// Loading state helpers
export const waitForSpinnerToDisappear = () =>
  screen.waitForElementToBeRemoved(() => screen.queryByRole('status', { name: /loading/i }));

export const waitForSkeletonToDisappear = () =>
  screen.waitForElementToBeRemoved(() => screen.queryByTestId('skeleton'));

// Error handling helpers
export const expectErrorMessage = (message: string) => {
  expect(screen.getByRole('alert')).toHaveTextContent(message);
};

export const expectNoErrorMessage = () => {
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
};

// Mock data generators with more options
export const createMockProductWithVariants = (baseProduct = {}, variantCount = 3) => {
  const product = createMockProduct(baseProduct);
  
  product.attributes.variants = {
    data: Array.from({ length: variantCount }, (_, i) => ({
      id: i + 1,
      attributes: {
        name: `Variant ${i + 1}`,
        sku: `${product.attributes.sku}-V${i + 1}`,
        price: product.attributes.price + (i * 10),
        inventory: Math.floor(Math.random() * 50) + 1,
        attributes: [
          { name: 'Size', value: ['S', 'M', 'L', 'XL'][i % 4] },
          { name: 'Color', value: ['Red', 'Blue', 'Green', 'Black'][i % 4] }
        ]
      }
    }))
  };
  
  return product;
};

export const createMockProductsPage = (page = 1, pageSize = 10, total = 100) => {
  const products = Array.from({ length: pageSize }, (_, i) => 
    createMockProduct({
      id: (page - 1) * pageSize + i + 1,
      attributes: {
        name: `Product ${(page - 1) * pageSize + i + 1}`,
        slug: `product-${(page - 1) * pageSize + i + 1}`,
        price: 50 + (i * 10),
        trending: i % 3 === 0,
        featured: i % 5 === 0,
      }
    })
  );

  return mockApiResponse(products, {
    pagination: {
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize),
      total
    }
  });
};

// Form testing helpers
export const fillForm = async (
  user: ReturnType<typeof userEvent.setup>,
  formData: Record<string, string>
) => {
  for (const [field, value] of Object.entries(formData)) {
    const input = screen.getByLabelText(new RegExp(field, 'i'));
    await user.clear(input);
    await user.type(input, value);
  }
};

export const submitForm = async (user: ReturnType<typeof userEvent.setup>) => {
  const submitButton = screen.getByRole('button', { name: /submit|save|create|update/i });
  await user.click(submitButton);
  return submitButton;
};

// Drag and drop helpers for touch interactions
export const simulateDragAndDrop = async (
  user: ReturnType<typeof userEvent.setup>,
  dragElement: HTMLElement,
  dropElement: HTMLElement
) => {
  await user.pointer([
    { target: dragElement, keys: '[MouseLeft>]' },
    { target: dropElement },
    { keys: '[/MouseLeft]' }
  ]);
};

// Keyboard navigation helpers
export const navigateWithKeyboard = async (
  user: ReturnType<typeof userEvent.setup>,
  direction: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'Tab' | 'Enter' | 'Escape',
  times = 1
) => {
  for (let i = 0; i < times; i++) {
    await user.keyboard(`{${direction}}`);
  }
};

// Custom matchers for better test assertions
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeAccessible(): R;
      toHaveLoadedWithin(time: number): R;
    }
  }
}

// Additional mock data for complex scenarios
export const createMockShoppingCart = (itemCount = 3) => ({
  items: Array.from({ length: itemCount }, (_, i) => ({
    id: i + 1,
    product: createMockProduct({ id: i + 1 }),
    quantity: Math.floor(Math.random() * 3) + 1,
    price: 50 + (i * 25)
  })),
  total: 0, // Will be calculated
  itemCount: 0, // Will be calculated
  updatedAt: new Date().toISOString()
});

export const createMockWishlist = (itemCount = 5) => ({
  items: Array.from({ length: itemCount }, (_, i) => 
    createMockProduct({ id: i + 1 })
  ),
  total: itemCount,
  updatedAt: new Date().toISOString()
});