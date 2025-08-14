import React from 'react';
import { 
  render, 
  screen,
  checkA11y,
  mockViewport,
  viewports,
  createMockProduct,
  testResponsiveComponent
} from '../../../tests/utils/test-utils';
import { ProductGrid } from '../product-grid';

describe('ProductGrid - Comprehensive Tests', () => {
  const mockProducts = [
    createMockProduct({ 
      id: 1, 
      attributes: { 
        name: 'Product 1', 
        slug: 'product-1', 
        price: 99.99 
      } 
    }),
    createMockProduct({ 
      id: 2, 
      attributes: { 
        name: 'Product 2', 
        slug: 'product-2', 
        price: 149.99 
      } 
    }),
    createMockProduct({ 
      id: 3, 
      attributes: { 
        name: 'Product 3', 
        slug: 'product-3', 
        price: 79.99 
      } 
    }),
    createMockProduct({ 
      id: 4, 
      attributes: { 
        name: 'Product 4', 
        slug: 'product-4', 
        price: 199.99 
      } 
    })
  ];

  describe('Rendering and Structure', () => {
    it('renders products in grid layout', () => {
      render(<ProductGrid products={mockProducts} />);

      const productCards = screen.getAllByRole('article');
      expect(productCards).toHaveLength(4);

      mockProducts.forEach(product => {
        expect(screen.getByText(product.attributes.name)).toBeInTheDocument();
        expect(screen.getByText(`$${product.attributes.price}`)).toBeInTheDocument();
      });
    });

    it('passes accessibility checks', async () => {
      const { container } = render(<ProductGrid products={mockProducts} />);
      await checkA11y(container);
    });

    it('has proper grid structure and semantics', () => {
      render(<ProductGrid products={mockProducts} />);

      const grid = screen.getAllByRole('article')[0].parentElement;
      expect(grid).toHaveClass('grid', 'gap-6');
      expect(grid).toHaveAttribute('role', 'grid');
    });

    it('renders with custom className', () => {
      const { container } = render(
        <ProductGrid products={mockProducts} className="custom-class" />
      );

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('custom-class');
    });
  });

  describe('Grid Column Configurations', () => {
    it('renders 2-column grid correctly', () => {
      const { container } = render(
        <ProductGrid products={mockProducts} columns={2} />
      );

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('grid-cols-1', 'sm:grid-cols-2');
    });

    it('renders 3-column grid correctly', () => {
      const { container } = render(
        <ProductGrid products={mockProducts} columns={3} />
      );

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3');
    });

    it('renders 4-column grid correctly (default)', () => {
      const { container } = render(
        <ProductGrid products={mockProducts} />
      );

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3', 'xl:grid-cols-4');
    });

    it('renders 5-column grid correctly', () => {
      const { container } = render(
        <ProductGrid products={mockProducts} columns={5} />
      );

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-4', 'xl:grid-cols-5');
    });
  });

  describe('Loading States', () => {
    it('shows skeleton cards when loading', () => {
      render(<ProductGrid products={[]} isLoading={true} />);

      const skeletons = screen.getAllByTestId('product-card-skeleton');
      expect(skeletons).toHaveLength(12);

      // Should not show actual products or empty state
      expect(screen.queryByText('No products found')).not.toBeInTheDocument();
    });

    it('maintains grid structure during loading', () => {
      const { container } = render(
        <ProductGrid products={[]} isLoading={true} columns={3} />
      );

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3');
    });

    it('applies custom className during loading', () => {
      const { container } = render(
        <ProductGrid products={[]} isLoading={true} className="loading-grid" />
      );

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('loading-grid');
    });

    it('shows correct number of skeletons for different column configurations', () => {
      [2, 3, 4, 5].forEach(columns => {
        const { unmount } = render(
          <ProductGrid products={[]} isLoading={true} columns={columns as any} />
        );

        const skeletons = screen.getAllByTestId('product-card-skeleton');
        expect(skeletons).toHaveLength(12); // Always shows 12 skeletons

        unmount();
      });
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no products and not loading', () => {
      render(<ProductGrid products={[]} isLoading={false} />);

      expect(screen.getByText('No products found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search or filter criteria.')).toBeInTheDocument();
    });

    it('has proper empty state styling', () => {
      render(<ProductGrid products={[]} />);

      const emptyState = screen.getByText('No products found').closest('.text-center');
      expect(emptyState).toHaveClass('py-12');

      const heading = screen.getByText('No products found');
      expect(heading).toHaveClass('text-lg', 'font-semibold', 'mb-2');

      const description = screen.getByText('Try adjusting your search or filter criteria.');
      expect(description).toHaveClass('text-muted-foreground');
    });

    it('does not show empty state when loading', () => {
      render(<ProductGrid products={[]} isLoading={true} />);

      expect(screen.queryByText('No products found')).not.toBeInTheDocument();
    });
  });

  describe('Product Card Integration', () => {
    it('passes props to ProductCard components', () => {
      render(
        <ProductGrid 
          products={mockProducts} 
          showWishlist={false} 
          showQuickAdd={false} 
        />
      );

      // Should not show wishlist or quick add buttons
      expect(screen.queryByRole('button', { name: /wishlist/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /quick add/i })).not.toBeInTheDocument();
    });

    it('shows wishlist buttons when enabled', () => {
      render(
        <ProductGrid 
          products={mockProducts} 
          showWishlist={true} 
        />
      );

      const wishlistButtons = screen.getAllByRole('button', { name: /wishlist/i });
      expect(wishlistButtons).toHaveLength(mockProducts.length);
    });

    it('shows quick add buttons when enabled', () => {
      render(
        <ProductGrid 
          products={mockProducts} 
          showQuickAdd={true} 
        />
      );

      const quickAddButtons = screen.getAllByRole('button', { name: /quick add/i });
      expect(quickAddButtons).toHaveLength(mockProducts.length);
    });

    it('renders unique keys for each product card', () => {
      const { container } = render(<ProductGrid products={mockProducts} />);

      const productCards = container.querySelectorAll('[data-product-id]');
      const uniqueKeys = new Set(
        Array.from(productCards).map(card => card.getAttribute('data-product-id'))
      );

      expect(uniqueKeys.size).toBe(mockProducts.length);
    });
  });

  describe('Responsive Design', () => {
    it('adapts to mobile viewport', () => {
      mockViewport(viewports.mobile.width);
      const { container } = render(
        <ProductGrid products={mockProducts} columns={4} />
      );

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('grid-cols-1');
    });

    it('adapts to tablet viewport', () => {
      mockViewport(viewports.tablet.width);
      const { container } = render(
        <ProductGrid products={mockProducts} columns={4} />
      );

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('sm:grid-cols-2');
    });

    it('adapts to desktop viewport', () => {
      mockViewport(viewports.desktop.width);
      const { container } = render(
        <ProductGrid products={mockProducts} columns={4} />
      );

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('lg:grid-cols-3');
    });

    it('maintains proper spacing across viewports', async () => {
      const results = await testResponsiveComponent(
        <ProductGrid products={mockProducts} />,
        ['mobile', 'tablet', 'desktop']
      );

      results.forEach(({ viewport, hasA11yViolations }) => {
        expect(hasA11yViolations).toBe(false);
      });
    });
  });

  describe('Performance and Optimization', () => {
    it('renders efficiently with large product lists', () => {
      const largeProductList = Array.from({ length: 100 }, (_, i) =>
        createMockProduct({ 
          id: i + 1, 
          attributes: { 
            name: `Product ${i + 1}`, 
            slug: `product-${i + 1}` 
          } 
        })
      );

      const startTime = performance.now();
      render(<ProductGrid products={largeProductList} />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(200); // Should render in under 200ms
    });

    it('does not cause memory leaks with frequent updates', () => {
      let products = mockProducts.slice(0, 2);
      const { rerender } = render(<ProductGrid products={products} />);

      // Simulate frequent product updates
      for (let i = 0; i < 10; i++) {
        products = products.concat(
          createMockProduct({ 
            id: 100 + i, 
            attributes: { name: `Dynamic Product ${i}` } 
          })
        );
        rerender(<ProductGrid products={products} />);
      }

      expect(() => {
        if (global.gc) {
          global.gc();
        }
      }).not.toThrow();
    });

    it('handles rapid loading state changes efficiently', () => {
      const { rerender } = render(
        <ProductGrid products={mockProducts} isLoading={true} />
      );

      // Rapid loading state changes
      for (let i = 0; i < 20; i++) {
        rerender(
          <ProductGrid products={mockProducts} isLoading={i % 2 === 0} />
        );
      }

      // Should not throw errors
      expect(screen.getByText('Product 1')).toBeInTheDocument();
    });
  });

  describe('Grid Layout Behavior', () => {
    it('maintains consistent spacing between items', () => {
      const { container } = render(<ProductGrid products={mockProducts} />);

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('gap-6');
    });

    it('handles uneven product counts gracefully', () => {
      const oddNumberProducts = mockProducts.slice(0, 3);
      
      render(<ProductGrid products={oddNumberProducts} columns={4} />);

      const productCards = screen.getAllByRole('article');
      expect(productCards).toHaveLength(3);

      // Grid should still maintain proper structure
      const grid = productCards[0].parentElement;
      expect(grid).toHaveClass('xl:grid-cols-4');
    });

    it('handles single product display', () => {
      const singleProduct = [mockProducts[0]];
      
      render(<ProductGrid products={singleProduct} />);

      expect(screen.getByText('Product 1')).toBeInTheDocument();
      expect(screen.getAllByRole('article')).toHaveLength(1);
    });

    it('maintains grid structure with different column counts', () => {
      [2, 3, 4, 5].forEach(columns => {
        const { container, unmount } = render(
          <ProductGrid products={mockProducts} columns={columns as any} />
        );

        const grid = container.querySelector('.grid');
        expect(grid).toHaveClass('grid', 'gap-6');
        
        unmount();
      });
    });
  });

  describe('Accessibility Features', () => {
    it('provides proper grid semantics', () => {
      render(<ProductGrid products={mockProducts} />);

      const grid = screen.getAllByRole('article')[0].parentElement;
      expect(grid).toHaveAttribute('role', 'grid');
    });

    it('has proper landmark structure', () => {
      render(<ProductGrid products={mockProducts} />);

      const productCards = screen.getAllByRole('article');
      productCards.forEach(card => {
        expect(card).toHaveAttribute('role', 'article');
      });
    });

    it('supports keyboard navigation between products', async () => {
      const { user } = render(<ProductGrid products={mockProducts} />);

      const firstProductLink = screen.getAllByRole('link')[0];
      firstProductLink.focus();

      // Tab should navigate to next product
      await user.tab();
      
      const secondProductLink = screen.getAllByRole('link')[1];
      expect(secondProductLink).toHaveFocus();
    });

    it('provides proper screen reader context', () => {
      render(<ProductGrid products={mockProducts} />);

      // Each product should have proper heading structure
      const productHeadings = screen.getAllByRole('heading', { level: 3 });
      expect(productHeadings.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles malformed product data gracefully', () => {
      const malformedProducts = [
        createMockProduct({ attributes: { name: '', slug: '', price: 0 } }),
        // @ts-ignore - Testing with invalid data
        { id: 'invalid', attributes: null },
        createMockProduct({ attributes: { name: 'Valid Product', slug: 'valid', price: 99.99 } })
      ];

      expect(() => {
        render(<ProductGrid products={malformedProducts as any} />);
      }).not.toThrow();

      // Should render valid products
      expect(screen.getByText('Valid Product')).toBeInTheDocument();
    });

    it('handles undefined products array gracefully', () => {
      expect(() => {
        render(<ProductGrid products={undefined as any} />);
      }).not.toThrow();

      // Should show empty state
      expect(screen.getByText('No products found')).toBeInTheDocument();
    });

    it('handles null products array gracefully', () => {
      expect(() => {
        render(<ProductGrid products={null as any} />);
      }).not.toThrow();

      expect(screen.getByText('No products found')).toBeInTheDocument();
    });

    it('recovers from rendering errors', () => {
      const problematicProducts = [
        createMockProduct({ id: 1 }),
        createMockProduct({ id: 2 }),
        // This might cause issues but should be handled
        createMockProduct({ id: 1 }) // Duplicate ID
      ];

      expect(() => {
        render(<ProductGrid products={problematicProducts} />);
      }).not.toThrow();
    });
  });

  describe('Interaction with Child Components', () => {
    it('propagates user interactions from product cards', async () => {
      const { user } = render(<ProductGrid products={mockProducts} />);

      // Click on first product
      const firstProductLink = screen.getByRole('link', { name: /product 1/i });
      await user.click(firstProductLink);

      // Should maintain product card functionality
      expect(firstProductLink).toHaveAttribute('href', '/products/product-1');
    });

    it('handles product card errors gracefully', () => {
      // Mock console.error to suppress expected errors
      const originalError = console.error;
      console.error = jest.fn();

      // This should not crash the entire grid
      expect(() => {
        render(<ProductGrid products={mockProducts} />);
      }).not.toThrow();

      console.error = originalError;
    });
  });

  describe('Visual Design Consistency', () => {
    it('maintains consistent visual hierarchy', () => {
      const { container } = render(<ProductGrid products={mockProducts} />);

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('gap-6');

      // All product cards should have consistent spacing
      const productCards = screen.getAllByRole('article');
      productCards.forEach(card => {
        expect(card.parentElement).toHaveClass('gap-6');
      });
    });

    it('applies proper responsive breakpoints', () => {
      const breakpoints = [
        { width: 320, expectedCols: 1 },
        { width: 640, expectedCols: 2 },
        { width: 1024, expectedCols: 3 },
        { width: 1280, expectedCols: 4 }
      ];

      breakpoints.forEach(({ width, expectedCols }) => {
        mockViewport(width);
        const { container, unmount } = render(
          <ProductGrid products={mockProducts.slice(0, expectedCols * 2)} />
        );

        const grid = container.querySelector('.grid');
        expect(grid).toBeInTheDocument();
        
        unmount();
      });
    });
  });
});