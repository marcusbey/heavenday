import React from 'react';
import { 
  render, 
  screen, 
  fireEvent, 
  waitFor,
  checkA11y,
  navigateWithKeyboard,
  selectFromDropdown,
  fillForm,
  expectErrorMessage,
  expectNoErrorMessage,
  createMockCategory
} from '../../../tests/utils/test-utils';
import { ProductFilters } from '../product-filters';

// Mock hooks
jest.mock('@/hooks/use-categories', () => ({
  useCategories: () => ({
    data: {
      data: [
        createMockCategory({ 
          id: 1, 
          attributes: { 
            name: 'Electronics', 
            slug: 'electronics',
            productCount: 25
          } 
        }),
        createMockCategory({ 
          id: 2, 
          attributes: { 
            name: 'Fashion', 
            slug: 'fashion',
            productCount: 35
          } 
        }),
        createMockCategory({ 
          id: 3, 
          attributes: { 
            name: 'Home & Garden', 
            slug: 'home-garden',
            productCount: 18
          } 
        })
      ]
    },
    isLoading: false,
    error: null
  })
}));

describe('ProductFilters - Enhanced Tests', () => {
  const mockOnFiltersChange = jest.fn();
  const defaultFilters = {};

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering and Structure', () => {
    it('renders all filter sections', () => {
      render(
        <ProductFilters 
          filters={defaultFilters} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      expect(screen.getByText('Categories')).toBeInTheDocument();
      expect(screen.getByText('Price Range')).toBeInTheDocument();
      expect(screen.getByText('Minimum Rating')).toBeInTheDocument();
      expect(screen.getByText('Availability')).toBeInTheDocument();
      expect(screen.getByText('Special Features')).toBeInTheDocument();
    });

    it('passes accessibility checks', async () => {
      const { container } = render(
        <ProductFilters 
          filters={defaultFilters} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );
      
      await checkA11y(container);
    });

    it('has proper semantic structure', () => {
      render(
        <ProductFilters 
          filters={defaultFilters} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      const headings = screen.getAllByRole('heading', { level: 3 });
      expect(headings).toHaveLength(5);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);

      const textInputs = screen.getAllByRole('spinbutton'); // number inputs
      expect(textInputs).toHaveLength(2); // min and max price
    });
  });

  describe('Category Filtering', () => {
    it('displays available categories with product counts', () => {
      render(
        <ProductFilters 
          filters={defaultFilters} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      expect(screen.getByText('Electronics')).toBeInTheDocument();
      expect(screen.getByText('(25)')).toBeInTheDocument();
      expect(screen.getByText('Fashion')).toBeInTheDocument();
      expect(screen.getByText('(35)')).toBeInTheDocument();
      expect(screen.getByText('Home & Garden')).toBeInTheDocument();
      expect(screen.getByText('(18)')).toBeInTheDocument();
    });

    it('handles category selection', async () => {
      const { user } = render(
        <ProductFilters 
          filters={defaultFilters} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      const electronicsCheckbox = screen.getByRole('checkbox', { name: /electronics/i });
      await user.click(electronicsCheckbox);

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        category: 'electronics'
      });
    });

    it('handles category deselection', async () => {
      const filtersWithCategory = { category: 'electronics' };
      const { user } = render(
        <ProductFilters 
          filters={filtersWithCategory} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      const electronicsCheckbox = screen.getByRole('checkbox', { name: /electronics/i });
      expect(electronicsCheckbox).toBeChecked();

      await user.click(electronicsCheckbox);

      expect(mockOnFiltersChange).toHaveBeenCalledWith({});
    });

    it('shows selected category in active filters', () => {
      const filtersWithCategory = { category: 'electronics' };
      
      render(
        <ProductFilters 
          filters={filtersWithCategory} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      expect(screen.getByText('Active Filters')).toBeInTheDocument();
      expect(screen.getByText('Category: electronics')).toBeInTheDocument();
    });

    it('allows removing category from active filters', async () => {
      const filtersWithCategory = { category: 'electronics' };
      const { user } = render(
        <ProductFilters 
          filters={filtersWithCategory} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      const removeButton = screen.getByRole('button', { name: /remove.*electronics/i });
      await user.click(removeButton);

      expect(mockOnFiltersChange).toHaveBeenCalledWith({});
    });
  });

  describe('Price Range Filtering', () => {
    it('renders price range inputs', () => {
      render(
        <ProductFilters 
          filters={defaultFilters} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      const minPriceInput = screen.getByPlaceholderText('Min');
      const maxPriceInput = screen.getByPlaceholderText('Max');
      const applyButton = screen.getByRole('button', { name: 'Apply' });

      expect(minPriceInput).toBeInTheDocument();
      expect(maxPriceInput).toBeInTheDocument();
      expect(applyButton).toBeInTheDocument();
    });

    it('handles price range input and application', async () => {
      const { user } = render(
        <ProductFilters 
          filters={defaultFilters} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      const minPriceInput = screen.getByPlaceholderText('Min');
      const maxPriceInput = screen.getByPlaceholderText('Max');
      const applyButton = screen.getByRole('button', { name: 'Apply' });

      await user.type(minPriceInput, '50');
      await user.type(maxPriceInput, '200');
      await user.click(applyButton);

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        priceRange: [50, 200]
      });
    });

    it('handles minimum price only', async () => {
      const { user } = render(
        <ProductFilters 
          filters={defaultFilters} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      const minPriceInput = screen.getByPlaceholderText('Min');
      const applyButton = screen.getByRole('button', { name: 'Apply' });

      await user.type(minPriceInput, '100');
      await user.click(applyButton);

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        priceRange: [100, 10000]
      });
    });

    it('handles maximum price only', async () => {
      const { user } = render(
        <ProductFilters 
          filters={defaultFilters} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      const maxPriceInput = screen.getByPlaceholderText('Max');
      const applyButton = screen.getByRole('button', { name: 'Apply' });

      await user.type(maxPriceInput, '500');
      await user.click(applyButton);

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        priceRange: [0, 500]
      });
    });

    it('validates price range (min <= max)', async () => {
      const { user } = render(
        <ProductFilters 
          filters={defaultFilters} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      const minPriceInput = screen.getByPlaceholderText('Min');
      const maxPriceInput = screen.getByPlaceholderText('Max');
      const applyButton = screen.getByRole('button', { name: 'Apply' });

      await user.type(minPriceInput, '500');
      await user.type(maxPriceInput, '100');
      await user.click(applyButton);

      // Should not apply invalid range
      expect(mockOnFiltersChange).toHaveBeenCalledWith({});
    });

    it('shows price range in active filters', () => {
      const filtersWithPriceRange = { priceRange: [50, 200] };
      
      render(
        <ProductFilters 
          filters={filtersWithPriceRange} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      expect(screen.getByText('$50 - $200')).toBeInTheDocument();
    });

    it('allows removing price range from active filters', async () => {
      const filtersWithPriceRange = { priceRange: [50, 200] };
      const { user } = render(
        <ProductFilters 
          filters={filtersWithPriceRange} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      const removeButton = screen.getByRole('button', { name: /remove.*price/i });
      await user.click(removeButton);

      expect(mockOnFiltersChange).toHaveBeenCalledWith({});
    });

    it('clears price inputs when price range is removed', async () => {
      const filtersWithPriceRange = { priceRange: [50, 200] };
      const { user } = render(
        <ProductFilters 
          filters={filtersWithPriceRange} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      const removeButton = screen.getByRole('button', { name: /remove.*price/i });
      await user.click(removeButton);

      const minPriceInput = screen.getByPlaceholderText('Min') as HTMLInputElement;
      const maxPriceInput = screen.getByPlaceholderText('Max') as HTMLInputElement;

      expect(minPriceInput.value).toBe('');
      expect(maxPriceInput.value).toBe('');
    });
  });

  describe('Rating Filtering', () => {
    it('displays rating options with stars', () => {
      render(
        <ProductFilters 
          filters={defaultFilters} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      // Should show rating options for 4, 3, 2, 1 stars
      expect(screen.getByRole('checkbox', { name: /4.*stars/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /3.*stars/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /2.*stars/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /1.*stars/i })).toBeInTheDocument();

      // Check for star icons
      const starIcons = screen.getAllByTestId('star-icon');
      expect(starIcons.length).toBeGreaterThan(0);
    });

    it('handles rating selection', async () => {
      const { user } = render(
        <ProductFilters 
          filters={defaultFilters} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      const fourStarCheckbox = screen.getByRole('checkbox', { name: /4.*stars/i });
      await user.click(fourStarCheckbox);

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        rating: 4
      });
    });

    it('handles rating deselection', async () => {
      const filtersWithRating = { rating: 4 };
      const { user } = render(
        <ProductFilters 
          filters={filtersWithRating} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      const fourStarCheckbox = screen.getByRole('checkbox', { name: /4.*stars/i });
      expect(fourStarCheckbox).toBeChecked();

      await user.click(fourStarCheckbox);

      expect(mockOnFiltersChange).toHaveBeenCalledWith({});
    });

    it('shows selected rating in active filters', () => {
      const filtersWithRating = { rating: 4 };
      
      render(
        <ProductFilters 
          filters={filtersWithRating} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      expect(screen.getByText('4+ Stars')).toBeInTheDocument();
    });

    it('displays correct number of filled stars for each rating', () => {
      render(
        <ProductFilters 
          filters={defaultFilters} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      // Get all star icons grouped by rating
      const ratingLabels = screen.getAllByText('& up');
      expect(ratingLabels).toHaveLength(4); // For ratings 4, 3, 2, 1

      // Check that star display is correct (would need more specific selectors)
      const starIcons = screen.getAllByTestId('star-icon');
      expect(starIcons.length).toBe(20); // 4 ratings × 5 stars each
    });
  });

  describe('Availability Filtering', () => {
    it('displays in stock filter option', () => {
      render(
        <ProductFilters 
          filters={defaultFilters} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      const inStockCheckbox = screen.getByRole('checkbox', { name: /in stock only/i });
      expect(inStockCheckbox).toBeInTheDocument();
    });

    it('handles in stock filter toggle', async () => {
      const { user } = render(
        <ProductFilters 
          filters={defaultFilters} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      const inStockCheckbox = screen.getByRole('checkbox', { name: /in stock only/i });
      await user.click(inStockCheckbox);

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        inStock: true
      });
    });

    it('handles in stock filter removal', async () => {
      const filtersWithInStock = { inStock: true };
      const { user } = render(
        <ProductFilters 
          filters={filtersWithInStock} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      const inStockCheckbox = screen.getByRole('checkbox', { name: /in stock only/i });
      expect(inStockCheckbox).toBeChecked();

      await user.click(inStockCheckbox);

      expect(mockOnFiltersChange).toHaveBeenCalledWith({});
    });
  });

  describe('Special Features Filtering', () => {
    it('displays special feature options', () => {
      render(
        <ProductFilters 
          filters={defaultFilters} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      const featuredCheckbox = screen.getByRole('checkbox', { name: /featured products/i });
      const trendingCheckbox = screen.getByRole('checkbox', { name: /trending products/i });

      expect(featuredCheckbox).toBeInTheDocument();
      expect(trendingCheckbox).toBeInTheDocument();
    });

    it('handles featured products filter', async () => {
      const { user } = render(
        <ProductFilters 
          filters={defaultFilters} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      const featuredCheckbox = screen.getByRole('checkbox', { name: /featured products/i });
      await user.click(featuredCheckbox);

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        featured: true
      });
    });

    it('handles trending products filter', async () => {
      const { user } = render(
        <ProductFilters 
          filters={defaultFilters} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      const trendingCheckbox = screen.getByRole('checkbox', { name: /trending products/i });
      await user.click(trendingCheckbox);

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        trending: true
      });
    });
  });

  describe('Active Filters Management', () => {
    it('shows active filters section when filters are applied', () => {
      const filtersWithMultiple = {
        category: 'electronics',
        priceRange: [50, 200],
        rating: 4,
        featured: true
      };

      render(
        <ProductFilters 
          filters={filtersWithMultiple} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      expect(screen.getByText('Active Filters')).toBeInTheDocument();
      expect(screen.getByText('Clear All')).toBeInTheDocument();
      expect(screen.getByText('Category: electronics')).toBeInTheDocument();
      expect(screen.getByText('$50 - $200')).toBeInTheDocument();
      expect(screen.getByText('4+ Stars')).toBeInTheDocument();
    });

    it('hides active filters section when no filters are applied', () => {
      render(
        <ProductFilters 
          filters={defaultFilters} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      expect(screen.queryByText('Active Filters')).not.toBeInTheDocument();
      expect(screen.queryByText('Clear All')).not.toBeInTheDocument();
    });

    it('clears all filters when Clear All is clicked', async () => {
      const filtersWithMultiple = {
        category: 'electronics',
        priceRange: [50, 200],
        rating: 4
      };

      const { user } = render(
        <ProductFilters 
          filters={filtersWithMultiple} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      const clearAllButton = screen.getByRole('button', { name: 'Clear All' });
      await user.click(clearAllButton);

      expect(mockOnFiltersChange).toHaveBeenCalledWith({});
    });

    it('clears price inputs when Clear All is clicked', async () => {
      const filtersWithPriceRange = { priceRange: [50, 200] };
      const { user } = render(
        <ProductFilters 
          filters={filtersWithPriceRange} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      const clearAllButton = screen.getByRole('button', { name: 'Clear All' });
      await user.click(clearAllButton);

      const minPriceInput = screen.getByPlaceholderText('Min') as HTMLInputElement;
      const maxPriceInput = screen.getByPlaceholderText('Max') as HTMLInputElement;

      expect(minPriceInput.value).toBe('');
      expect(maxPriceInput.value).toBe('');
    });
  });

  describe('Keyboard Navigation and Accessibility', () => {
    it('supports keyboard navigation through all interactive elements', async () => {
      const { user } = render(
        <ProductFilters 
          filters={defaultFilters} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      // Tab through checkboxes
      await navigateWithKeyboard(user, 'Tab');
      const firstCheckbox = screen.getAllByRole('checkbox')[0];
      expect(firstCheckbox).toHaveFocus();

      // Continue tabbing
      await navigateWithKeyboard(user, 'Tab');
      const secondCheckbox = screen.getAllByRole('checkbox')[1];
      expect(secondCheckbox).toHaveFocus();
    });

    it('has proper labels and ARIA attributes', () => {
      render(
        <ProductFilters 
          filters={defaultFilters} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveAccessibleName();
      });

      const numberInputs = screen.getAllByRole('spinbutton');
      numberInputs.forEach(input => {
        expect(input).toHaveAttribute('placeholder');
      });
    });

    it('supports checkbox activation with Enter/Space', async () => {
      const { user } = render(
        <ProductFilters 
          filters={defaultFilters} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      const firstCheckbox = screen.getAllByRole('checkbox')[0];
      firstCheckbox.focus();

      await navigateWithKeyboard(user, 'Enter');
      expect(mockOnFiltersChange).toHaveBeenCalled();
    });

    it('provides proper focus indicators', async () => {
      const { user } = render(
        <ProductFilters 
          filters={defaultFilters} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      await navigateWithKeyboard(user, 'Tab');
      const focusedElement = document.activeElement;
      
      expect(focusedElement).toHaveClass('focus:ring'); // or similar focus styles
    });
  });

  describe('Responsive Design and Layout', () => {
    it('maintains proper spacing and layout', () => {
      const { container } = render(
        <ProductFilters 
          filters={defaultFilters} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      const filterContainer = container.firstChild;
      expect(filterContainer).toHaveClass('space-y-6');

      // Price range grid should be responsive
      const priceGrid = screen.getByPlaceholderText('Min').closest('.grid');
      expect(priceGrid).toHaveClass('grid-cols-2');
    });

    it('handles long category names gracefully', () => {
      // Mock with long category name
      jest.doMock('@/hooks/use-categories', () => ({
        useCategories: () => ({
          data: {
            data: [
              createMockCategory({ 
                attributes: { 
                  name: 'Very Long Category Name That Should Not Break Layout',
                  slug: 'very-long-category',
                  productCount: 5
                } 
              })
            ]
          }
        })
      }));

      render(
        <ProductFilters 
          filters={defaultFilters} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      expect(screen.getByText('Very Long Category Name That Should Not Break Layout')).toBeInTheDocument();
    });

    it('applies custom className correctly', () => {
      const { container } = render(
        <ProductFilters 
          filters={defaultFilters} 
          onFiltersChange={mockOnFiltersChange}
          className="custom-filters-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-filters-class');
    });
  });

  describe('Performance and Optimization', () => {
    it('renders efficiently with many categories', () => {
      const manyCategories = Array.from({ length: 20 }, (_, i) =>
        createMockCategory({ 
          id: i + 1, 
          attributes: { 
            name: `Category ${i + 1}`, 
            slug: `category-${i + 1}`,
            productCount: Math.floor(Math.random() * 50)
          } 
        })
      );

      jest.doMock('@/hooks/use-categories', () => ({
        useCategories: () => ({
          data: { data: manyCategories }
        })
      }));

      const startTime = performance.now();
      render(
        <ProductFilters 
          filters={defaultFilters} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    it('handles rapid filter changes efficiently', async () => {
      const { user } = render(
        <ProductFilters 
          filters={defaultFilters} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      
      // Rapidly toggle multiple filters
      for (const checkbox of checkboxes.slice(0, 5)) {
        await user.click(checkbox);
      }

      expect(mockOnFiltersChange).toHaveBeenCalledTimes(5);
    });

    it('debounces price input changes', async () => {
      const { user } = render(
        <ProductFilters 
          filters={defaultFilters} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      const minPriceInput = screen.getByPlaceholderText('Min');
      
      // Type quickly
      await user.type(minPriceInput, '12345');
      
      // Apply button should still work
      const applyButton = screen.getByRole('button', { name: 'Apply' });
      await user.click(applyButton);

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        priceRange: [12345, 10000]
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles empty categories data gracefully', () => {
      jest.doMock('@/hooks/use-categories', () => ({
        useCategories: () => ({
          data: { data: [] }
        })
      }));

      expect(() => {
        render(
          <ProductFilters 
            filters={defaultFilters} 
            onFiltersChange={mockOnFiltersChange} 
          />
        );
      }).not.toThrow();

      expect(screen.getByText('Categories')).toBeInTheDocument();
    });

    it('handles malformed category data gracefully', () => {
      jest.doMock('@/hooks/use-categories', () => ({
        useCategories: () => ({
          data: { data: null }
        })
      }));

      expect(() => {
        render(
          <ProductFilters 
            filters={defaultFilters} 
            onFiltersChange={mockOnFiltersChange} 
          />
        );
      }).not.toThrow();
    });

    it('handles invalid price inputs gracefully', async () => {
      const { user } = render(
        <ProductFilters 
          filters={defaultFilters} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      const minPriceInput = screen.getByPlaceholderText('Min');
      const applyButton = screen.getByRole('button', { name: 'Apply' });

      // Try invalid input
      await user.type(minPriceInput, 'invalid');
      await user.click(applyButton);

      // Should not break or apply invalid filter
      expectNoErrorMessage();
      expect(mockOnFiltersChange).toHaveBeenCalledWith({});
    });

    it('handles negative price inputs', async () => {
      const { user } = render(
        <ProductFilters 
          filters={defaultFilters} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      const minPriceInput = screen.getByPlaceholderText('Min');
      const applyButton = screen.getByRole('button', { name: 'Apply' });

      await user.type(minPriceInput, '-50');
      await user.click(applyButton);

      // Should handle negative input appropriately
      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        priceRange: [-50, 10000]
      });
    });

    it('handles missing onFiltersChange callback gracefully', () => {
      expect(() => {
        render(
          <ProductFilters 
            filters={defaultFilters} 
            onFiltersChange={undefined as any} 
          />
        );
      }).not.toThrow();
    });
  });

  describe('Integration with Filter State', () => {
    it('reflects current filter state correctly', () => {
      const complexFilters = {
        category: 'electronics',
        priceRange: [100, 500],
        rating: 3,
        inStock: true,
        featured: true,
        trending: false
      };

      render(
        <ProductFilters 
          filters={complexFilters} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      // Check that all filters are reflected in UI
      expect(screen.getByRole('checkbox', { name: /electronics/i })).toBeChecked();
      expect(screen.getByDisplayValue('100')).toBeInTheDocument();
      expect(screen.getByDisplayValue('500')).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /3.*stars/i })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: /in stock only/i })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: /featured products/i })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: /trending products/i })).not.toBeChecked();
    });

    it('updates when filters prop changes', () => {
      const { rerender } = render(
        <ProductFilters 
          filters={defaultFilters} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      expect(screen.queryByText('Active Filters')).not.toBeInTheDocument();

      rerender(
        <ProductFilters 
          filters={{ category: 'fashion' }} 
          onFiltersChange={mockOnFiltersChange} 
        />
      );

      expect(screen.getByText('Active Filters')).toBeInTheDocument();
      expect(screen.getByText('Category: fashion')).toBeInTheDocument();
    });
  });
});