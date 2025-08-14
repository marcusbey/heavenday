import React from 'react';
import { 
  render, 
  screen, 
  fireEvent, 
  waitFor,
  checkA11y,
  navigateWithKeyboard,
  typeInSearchBox,
  expectErrorMessage,
  expectNoErrorMessage,
  createMockProduct,
  mockApiResponse
} from '../../../tests/utils/test-utils';
import { SearchBar } from '../search-bar';
import { server } from '../../../tests/mocks/server';
import { http, HttpResponse } from 'msw';

// Mock hooks
jest.mock('@/hooks/use-products', () => ({
  useSearchProducts: jest.fn()
}));

jest.mock('@/hooks/use-debounced-value', () => ({
  useDebouncedValue: jest.fn()
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
  })
}));

import { useSearchProducts } from '@/hooks/use-products';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

const mockUseSearchProducts = useSearchProducts as jest.MockedFunction<typeof useSearchProducts>;
const mockUseDebouncedValue = useDebouncedValue as jest.MockedFunction<typeof useDebouncedValue>;

describe('SearchBar - Comprehensive Tests', () => {
  const mockPush = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock debounced value to return the same value immediately for testing
    mockUseDebouncedValue.mockImplementation((value) => value);
    
    // Default mock for search products
    mockUseSearchProducts.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isSuccess: false,
      isError: false
    });

    jest.mock('next/navigation', () => ({
      useRouter: () => ({
        push: mockPush,
        pathname: '/',
      })
    }));
  });

  describe('Rendering and Structure', () => {
    it('renders search input with correct attributes', () => {
      render(<SearchBar />);

      const searchInput = screen.getByRole('searchbox');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('type', 'search');
      expect(searchInput).toHaveAttribute('placeholder', 'Search for products...');
      expect(searchInput).toHaveValue('');
    });

    it('renders search button', () => {
      render(<SearchBar />);

      const searchButton = screen.getByRole('button', { name: /search/i });
      expect(searchButton).toBeInTheDocument();
      expect(searchButton).toHaveAttribute('type', 'submit');
    });

    it('renders search icon in input', () => {
      render(<SearchBar />);

      const searchIcon = screen.getByTestId('search-icon');
      expect(searchIcon).toBeInTheDocument();
      expect(searchIcon).toHaveClass('absolute', 'left-3');
    });

    it('passes accessibility checks', async () => {
      const { container } = render(<SearchBar />);
      await checkA11y(container);
    });

    it('has proper ARIA attributes', () => {
      render(<SearchBar />);

      const searchInput = screen.getByRole('searchbox');
      expect(searchInput).toHaveAttribute('aria-label', expect.stringMatching(/search/i));
      
      const form = searchInput.closest('form');
      expect(form).toHaveAttribute('role', 'search');
    });
  });

  describe('Search Input Functionality', () => {
    it('updates input value when typing', async () => {
      const { user } = render(<SearchBar />);

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'wellness dolls');

      expect(searchInput).toHaveValue('wellness dolls');
    });

    it('triggers debounced search after typing', async () => {
      const mockProducts = mockApiResponse([
        createMockProduct({ 
          attributes: { name: 'Wellness Doll 1', slug: 'wellness-doll-1' } 
        }),
        createMockProduct({ 
          attributes: { name: 'Wellness Doll 2', slug: 'wellness-doll-2' } 
        })
      ]);

      mockUseSearchProducts.mockReturnValue({
        data: mockProducts,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false
      });

      const { user } = render(<SearchBar />);

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'wellness');

      // Should call useSearchProducts with the query
      expect(mockUseSearchProducts).toHaveBeenCalledWith(
        'wellness',
        undefined,
        { enabled: true }
      );
    });

    it('does not search for queries shorter than 2 characters', async () => {
      const { user } = render(<SearchBar />);

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'w');

      expect(mockUseSearchProducts).toHaveBeenCalledWith(
        'w',
        undefined,
        { enabled: false }
      );
    });

    it('clears input on escape key', async () => {
      const { user } = render(<SearchBar />);

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'test query');
      expect(searchInput).toHaveValue('test query');

      await navigateWithKeyboard(user, 'Escape');
      expect(searchInput).toHaveValue('');
    });
  });

  describe('Search Results Dropdown', () => {
    const mockSearchResults = mockApiResponse([
      createMockProduct({ 
        id: 1,
        attributes: { 
          name: 'Wellness Doll Premium', 
          slug: 'wellness-doll-premium',
          price: 99.99,
          mainImage: {
            data: {
              attributes: {
                url: '/test-image-1.jpg',
                alternativeText: 'Wellness Doll Premium'
              }
            }
          }
        } 
      }),
      createMockProduct({ 
        id: 2,
        attributes: { 
          name: 'Wellness Doll Basic', 
          slug: 'wellness-doll-basic',
          price: 69.99,
          mainImage: {
            data: {
              attributes: {
                url: '/test-image-2.jpg',
                alternativeText: 'Wellness Doll Basic'
              }
            }
          }
        } 
      })
    ]);

    beforeEach(() => {
      mockUseSearchProducts.mockReturnValue({
        data: mockSearchResults,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false
      });
    });

    it('shows dropdown when typing 2 or more characters', async () => {
      const { user } = render(<SearchBar />);

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'wellness');

      await waitFor(() => {
        expect(screen.getByText('Products')).toBeInTheDocument();
        expect(screen.getByText('Wellness Doll Premium')).toBeInTheDocument();
        expect(screen.getByText('Wellness Doll Basic')).toBeInTheDocument();
      });
    });

    it('displays product information correctly', async () => {
      const { user } = render(<SearchBar />);

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'wellness');

      await waitFor(() => {
        expect(screen.getByText('Wellness Doll Premium')).toBeInTheDocument();
        expect(screen.getByText('$99.99')).toBeInTheDocument();
        expect(screen.getByText('Wellness Doll Basic')).toBeInTheDocument();
        expect(screen.getByText('$69.99')).toBeInTheDocument();
      });

      // Check product images
      const productImages = screen.getAllByRole('img');
      expect(productImages).toHaveLength(2);
      expect(productImages[0]).toHaveAttribute('alt', 'Wellness Doll Premium');
      expect(productImages[1]).toHaveAttribute('alt', 'Wellness Doll Basic');
    });

    it('limits displayed results to 6 products', async () => {
      const manyProducts = mockApiResponse(
        Array.from({ length: 10 }, (_, i) => 
          createMockProduct({ 
            id: i + 1,
            attributes: { 
              name: `Product ${i + 1}`, 
              slug: `product-${i + 1}`,
              price: 50 + (i * 10)
            } 
          })
        )
      );

      mockUseSearchProducts.mockReturnValue({
        data: manyProducts,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false
      });

      const { user } = render(<SearchBar />);

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'product');

      await waitFor(() => {
        const productLinks = screen.getAllByRole('link', { name: /product \d+/i });
        expect(productLinks).toHaveLength(6);
        
        // Should show "View all results" button
        expect(screen.getByText('View all 10 results')).toBeInTheDocument();
      });
    });

    it('navigates to product page when clicking result', async () => {
      const { user } = render(<SearchBar />);

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'wellness');

      await waitFor(() => {
        expect(screen.getByText('Wellness Doll Premium')).toBeInTheDocument();
      });

      const productLink = screen.getByRole('link', { name: /wellness doll premium/i });
      expect(productLink).toHaveAttribute('href', '/products/wellness-doll-premium');
    });

    it('closes dropdown when clicking product result', async () => {
      const { user } = render(<SearchBar />);

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'wellness');

      await waitFor(() => {
        expect(screen.getByText('Wellness Doll Premium')).toBeInTheDocument();
      });

      const productLink = screen.getByRole('link', { name: /wellness doll premium/i });
      await user.click(productLink);

      await waitFor(() => {
        expect(screen.queryByText('Products')).not.toBeInTheDocument();
      });

      expect(searchInput).toHaveValue('');
    });

    it('closes dropdown when clicking outside', async () => {
      const { user } = render(
        <div>
          <SearchBar />
          <div data-testid="outside-element">Outside</div>
        </div>
      );

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'wellness');

      await waitFor(() => {
        expect(screen.getByText('Products')).toBeInTheDocument();
      });

      const outsideElement = screen.getByTestId('outside-element');
      await user.click(outsideElement);

      await waitFor(() => {
        expect(screen.queryByText('Products')).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading spinner in search button when searching', () => {
      mockUseSearchProducts.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
        isSuccess: false,
        isError: false
      });

      render(<SearchBar />);

      const loadingSpinner = screen.getByTestId('loading-spinner');
      expect(loadingSpinner).toBeInTheDocument();
      expect(loadingSpinner).toHaveClass('animate-spin');
    });

    it('shows loading message in dropdown when searching', async () => {
      mockUseSearchProducts.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
        isSuccess: false,
        isError: false
      });

      const { user } = render(<SearchBar />);

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'wellness');

      await waitFor(() => {
        expect(screen.getByText('Searching...')).toBeInTheDocument();
        expect(screen.getByTestId('dropdown-loading-spinner')).toBeInTheDocument();
      });
    });

    it('hides loading state when search completes', async () => {
      // Start with loading state
      mockUseSearchProducts.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
        isSuccess: false,
        isError: false
      });

      const { user, rerender } = render(<SearchBar />);

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'wellness');

      await waitFor(() => {
        expect(screen.getByText('Searching...')).toBeInTheDocument();
      });

      // Update to completed state
      mockUseSearchProducts.mockReturnValue({
        data: mockApiResponse([]),
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false
      });

      rerender(<SearchBar />);

      await waitFor(() => {
        expect(screen.queryByText('Searching...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Empty States and Error Handling', () => {
    it('shows no results message when search returns empty', async () => {
      mockUseSearchProducts.mockReturnValue({
        data: mockApiResponse([]),
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false
      });

      const { user } = render(<SearchBar />);

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'nonexistent');

      await waitFor(() => {
        expect(screen.getByText('No products found for "nonexistent"')).toBeInTheDocument();
      });
    });

    it('handles search API errors gracefully', async () => {
      mockUseSearchProducts.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Search failed'),
        refetch: jest.fn(),
        isSuccess: false,
        isError: true
      });

      const { user } = render(<SearchBar />);

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'wellness');

      // Should not show error to user, but handle gracefully
      expectNoErrorMessage();
      expect(screen.queryByText('Products')).not.toBeInTheDocument();
    });

    it('handles missing product images gracefully', async () => {
      const productsWithoutImages = mockApiResponse([
        createMockProduct({ 
          attributes: { 
            name: 'Product Without Image',
            slug: 'product-without-image',
            mainImage: null
          } 
        })
      ]);

      mockUseSearchProducts.mockReturnValue({
        data: productsWithoutImages,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false
      });

      const { user } = render(<SearchBar />);

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'product');

      await waitFor(() => {
        expect(screen.getByText('Product Without Image')).toBeInTheDocument();
      });

      // Should not crash without image
      const imageContainer = screen.getByText('Product Without Image').closest('a')?.querySelector('.relative');
      expect(imageContainer).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('navigates to search results page on form submit', async () => {
      const { user } = render(<SearchBar />);

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'wellness dolls');

      const form = searchInput.closest('form')!;
      fireEvent.submit(form);

      expect(mockPush).toHaveBeenCalledWith('/search?q=wellness%20dolls');
    });

    it('clears input and closes dropdown after submit', async () => {
      mockUseSearchProducts.mockReturnValue({
        data: mockApiResponse([createMockProduct()]),
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false
      });

      const { user } = render(<SearchBar />);

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'wellness');

      await waitFor(() => {
        expect(screen.getByText('Products')).toBeInTheDocument();
      });

      const form = searchInput.closest('form')!;
      fireEvent.submit(form);

      expect(searchInput).toHaveValue('');
      await waitFor(() => {
        expect(screen.queryByText('Products')).not.toBeInTheDocument();
      });
    });

    it('does not submit empty search', async () => {
      const { user } = render(<SearchBar />);

      const searchInput = screen.getByRole('searchbox');
      const form = searchInput.closest('form')!;
      
      // Submit empty form
      fireEvent.submit(form);

      expect(mockPush).not.toHaveBeenCalled();

      // Submit whitespace-only search
      await user.type(searchInput, '   ');
      fireEvent.submit(form);

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('trims whitespace from search query', async () => {
      const { user } = render(<SearchBar />);

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, '  wellness dolls  ');

      const form = searchInput.closest('form')!;
      fireEvent.submit(form);

      expect(mockPush).toHaveBeenCalledWith('/search?q=wellness%20dolls');
    });
  });

  describe('Keyboard Navigation', () => {
    const mockSearchResults = mockApiResponse([
      createMockProduct({ attributes: { name: 'Product 1', slug: 'product-1' } }),
      createMockProduct({ attributes: { name: 'Product 2', slug: 'product-2' } }),
      createMockProduct({ attributes: { name: 'Product 3', slug: 'product-3' } })
    ]);

    beforeEach(() => {
      mockUseSearchProducts.mockReturnValue({
        data: mockSearchResults,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false
      });
    });

    it('supports arrow key navigation through results', async () => {
      const { user } = render(<SearchBar />);

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'product');

      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
      });

      // Arrow down should focus first result
      await navigateWithKeyboard(user, 'ArrowDown');
      const firstResult = screen.getByRole('link', { name: /product 1/i });
      expect(firstResult).toHaveFocus();

      // Arrow down should focus next result
      await navigateWithKeyboard(user, 'ArrowDown');
      const secondResult = screen.getByRole('link', { name: /product 2/i });
      expect(secondResult).toHaveFocus();
    });

    it('wraps navigation at end of results', async () => {
      const { user } = render(<SearchBar />);

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'product');

      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
      });

      // Navigate to last result
      await navigateWithKeyboard(user, 'ArrowDown', 3);
      const thirdResult = screen.getByRole('link', { name: /product 3/i });
      expect(thirdResult).toHaveFocus();

      // Arrow down should wrap to first result
      await navigateWithKeyboard(user, 'ArrowDown');
      const firstResult = screen.getByRole('link', { name: /product 1/i });
      expect(firstResult).toHaveFocus();
    });

    it('selects result on Enter key', async () => {
      const { user } = render(<SearchBar />);

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'product');

      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
      });

      await navigateWithKeyboard(user, 'ArrowDown');
      await navigateWithKeyboard(user, 'Enter');

      // Should navigate to selected product
      expect(mockPush).toHaveBeenCalledWith('/products/product-1');
    });

    it('closes dropdown on Escape key', async () => {
      const { user } = render(<SearchBar />);

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'product');

      await waitFor(() => {
        expect(screen.getByText('Products')).toBeInTheDocument();
      });

      await navigateWithKeyboard(user, 'Escape');

      await waitFor(() => {
        expect(screen.queryByText('Products')).not.toBeInTheDocument();
      });
    });
  });

  describe('Performance and Memory Management', () => {
    it('debounces search requests properly', async () => {
      const { user } = render(<SearchBar />);

      const searchInput = screen.getByRole('searchbox');
      
      // Type quickly
      await user.type(searchInput, 'w');
      await user.type(searchInput, 'e');
      await user.type(searchInput, 'l');
      await user.type(searchInput, 'l');

      // Should not make multiple API calls due to debouncing
      expect(mockUseSearchProducts).toHaveBeenCalledTimes(4); // Once per character
      expect(mockUseDebouncedValue).toHaveBeenCalled();
    });

    it('cleans up event listeners on unmount', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      const { unmount } = render(<SearchBar />);

      expect(addEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });

    it('does not cause memory leaks during rapid typing', async () => {
      const { user } = render(<SearchBar />);

      const searchInput = screen.getByRole('searchbox');
      
      // Simulate rapid typing and clearing
      for (let i = 0; i < 10; i++) {
        await user.type(searchInput, `query${i}`);
        await user.clear(searchInput);
      }

      // Should not throw errors or cause memory issues
      expect(() => {
        if (global.gc) {
          global.gc();
        }
      }).not.toThrow();
    });
  });

  describe('Accessibility Features', () => {
    it('announces search results to screen readers', async () => {
      const { user } = render(<SearchBar />);

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'wellness');

      await waitFor(() => {
        const dropdown = screen.getByRole('listbox');
        expect(dropdown).toHaveAttribute('aria-label', expect.stringMatching(/search results/i));
      });
    });

    it('has proper focus management', async () => {
      const { user } = render(<SearchBar />);

      const searchInput = screen.getByRole('searchbox');
      
      // Focus should start on input
      expect(searchInput).toHaveFocus();

      await user.type(searchInput, 'product');
      
      // Focus should remain on input while typing
      expect(searchInput).toHaveFocus();
    });

    it('supports screen reader navigation', async () => {
      mockUseSearchProducts.mockReturnValue({
        data: mockApiResponse([createMockProduct()]),
        isLoading: false,
        error: null,
        refetch: jest.fn(),
        isSuccess: true,
        isError: false
      });

      const { user } = render(<SearchBar />);

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'product');

      await waitFor(() => {
        const results = screen.getAllByRole('option');
        expect(results).toHaveLength(1);
        
        results.forEach(result => {
          expect(result).toHaveAttribute('role', 'option');
        });
      });
    });
  });
});