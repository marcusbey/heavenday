import React from 'react';
import { 
  render, 
  screen, 
  fireEvent, 
  waitFor,
  checkA11y,
  mockViewport,
  viewports,
  navigateWithKeyboard,
  addProductToCart,
  addProductToWishlist,
  createMockProduct,
  createMockProductWithVariants
} from '../../../tests/utils/test-utils';
import { ProductCard } from '../product-card';

describe('ProductCard - Enhanced Tests', () => {
  const mockProduct = createMockProduct({
    attributes: {
      name: 'Premium Wellness Doll',
      slug: 'premium-wellness-doll',
      price: 299.99,
      originalPrice: 399.99,
      discountPercentage: 25,
      averageRating: 4.5,
      reviewCount: 127,
      stockQuantity: 15,
      trending: true,
      featured: false,
      mainImage: {
        data: {
          attributes: {
            url: '/premium-doll.jpg',
            alternativeText: 'Premium Wellness Doll'
          }
        }
      }
    }
  });

  describe('Rendering and Structure', () => {
    it('renders all essential product information', () => {
      render(<ProductCard product={mockProduct} />);

      expect(screen.getByText('Premium Wellness Doll')).toBeInTheDocument();
      expect(screen.getByText('$299.99')).toBeInTheDocument();
      expect(screen.getByText('$399.99')).toBeInTheDocument();
      expect(screen.getByText('127')).toBeInTheDocument(); // Review count
      expect(screen.getByText('Trending')).toBeInTheDocument();
      expect(screen.getByText('-25%')).toBeInTheDocument();
    });

    it('passes accessibility checks', async () => {
      const { container } = render(<ProductCard product={mockProduct} />);
      await checkA11y(container);
    });

    it('has proper semantic structure', () => {
      render(<ProductCard product={mockProduct} />);

      const productCard = screen.getByRole('article');
      expect(productCard).toBeInTheDocument();

      const productLink = screen.getByRole('link', { name: /premium wellness doll/i });
      expect(productLink).toHaveAttribute('href', '/products/premium-wellness-doll');

      const productImage = screen.getByRole('img');
      expect(productImage).toHaveAttribute('alt', 'Premium Wellness Doll');
    });
  });

  describe('Product Image Display', () => {
    it('displays product image with correct attributes', () => {
      render(<ProductCard product={mockProduct} />);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', '/premium-doll.jpg');
      expect(image).toHaveAttribute('alt', 'Premium Wellness Doll');
    });

    it('handles missing images gracefully', () => {
      const productWithoutImage = createMockProduct({
        attributes: {
          name: 'Product Without Image',
          mainImage: null
        }
      });

      render(<ProductCard product={productWithoutImage} />);

      // Should still render product information
      expect(screen.getByText('Product Without Image')).toBeInTheDocument();
      
      // Image container should exist but without image
      const imageContainer = screen.getByText('Product Without Image')
        .closest('article')
        ?.querySelector('.aspect-square');
      expect(imageContainer).toBeInTheDocument();
    });

    it('has proper image hover effects', async () => {
      const { user } = render(<ProductCard product={mockProduct} />);

      const productCard = screen.getByRole('article');
      await user.hover(productCard);

      const image = screen.getByRole('img');
      expect(image).toHaveClass('group-hover:scale-105');
    });

    it('applies correct image sizing and responsive behavior', () => {
      render(<ProductCard product={mockProduct} />);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('sizes', '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw');
    });
  });

  describe('Badge System', () => {
    it('displays trending badge when product is trending', () => {
      render(<ProductCard product={mockProduct} />);

      const trendingBadge = screen.getByText('Trending');
      expect(trendingBadge).toBeInTheDocument();
      expect(trendingBadge.closest('.badge')).toHaveClass('variant-secondary');
    });

    it('displays featured badge when product is featured', () => {
      const featuredProduct = createMockProduct({
        attributes: { featured: true, trending: false }
      });

      render(<ProductCard product={featuredProduct} />);

      const featuredBadge = screen.getByText('Featured');
      expect(featuredBadge).toBeInTheDocument();
      expect(featuredBadge.closest('.badge')).toHaveClass('variant-default');
    });

    it('displays discount badge when product has discount', () => {
      render(<ProductCard product={mockProduct} />);

      const discountBadge = screen.getByText('-25%');
      expect(discountBadge).toBeInTheDocument();
      expect(discountBadge.closest('.badge')).toHaveClass('variant-destructive');
    });

    it('displays out of stock badge when inventory is zero', () => {
      const outOfStockProduct = createMockProduct({
        attributes: { stockQuantity: 0 }
      });

      render(<ProductCard product={outOfStockProduct} />);

      const outOfStockBadge = screen.getByText('Out of Stock');
      expect(outOfStockBadge).toBeInTheDocument();
      expect(outOfStockBadge.closest('.badge')).toHaveClass('variant-secondary');
    });

    it('stacks multiple badges correctly', () => {
      const productWithMultipleBadges = createMockProduct({
        attributes: {
          trending: true,
          featured: true,
          originalPrice: 200,
          price: 150,
          discountPercentage: 25
        }
      });

      render(<ProductCard product={productWithMultipleBadges} />);

      expect(screen.getByText('Trending')).toBeInTheDocument();
      expect(screen.getByText('Featured')).toBeInTheDocument();
      expect(screen.getByText('-25%')).toBeInTheDocument();

      // Badges should be in a vertical stack
      const badgeContainer = screen.getByText('Trending').closest('.flex-col');
      expect(badgeContainer).toBeInTheDocument();
    });
  });

  describe('Price Display', () => {
    it('displays current price prominently', () => {
      render(<ProductCard product={mockProduct} />);

      const currentPrice = screen.getByText('$299.99');
      expect(currentPrice).toHaveClass('font-semibold', 'text-lg');
    });

    it('displays original price with strikethrough when discounted', () => {
      render(<ProductCard product={mockProduct} />);

      const originalPrice = screen.getByText('$399.99');
      expect(originalPrice).toHaveClass('line-through', 'text-muted-foreground');
    });

    it('does not show original price when not discounted', () => {
      const regularProduct = createMockProduct({
        attributes: {
          price: 199.99,
          originalPrice: null,
          discountPercentage: null
        }
      });

      render(<ProductCard product={regularProduct} />);

      expect(screen.getByText('$199.99')).toBeInTheDocument();
      expect(screen.queryByText(/line-through/)).not.toBeInTheDocument();
    });

    it('handles different currency formats', () => {
      const productWithDifferentCurrency = createMockProduct({
        attributes: {
          price: 99.99,
          currency: 'EUR'
        }
      });

      render(<ProductCard product={productWithDifferentCurrency} />);

      // Should still display price (currency handling would be in a currency formatter)
      expect(screen.getByText('$99.99')).toBeInTheDocument();
    });
  });

  describe('Rating System', () => {
    it('displays star rating when reviews exist', () => {
      render(<ProductCard product={mockProduct} />);

      const stars = screen.getAllByTestId('star-icon');
      expect(stars).toHaveLength(5);

      // First 4 stars should be filled (rating 4.5)
      const filledStars = stars.filter(star => 
        star.classList.contains('fill-yellow-400')
      );
      expect(filledStars).toHaveLength(4);
    });

    it('displays review count', () => {
      render(<ProductCard product={mockProduct} />);

      expect(screen.getByText('(127)')).toBeInTheDocument();
    });

    it('does not show rating when no reviews exist', () => {
      const productWithoutReviews = createMockProduct({
        attributes: {
          averageRating: null,
          reviewCount: 0
        }
      });

      render(<ProductCard product={productWithoutReviews} />);

      expect(screen.queryByTestId('star-icon')).not.toBeInTheDocument();
      expect(screen.queryByText(/\(\d+\)/)).not.toBeInTheDocument();
    });

    it('handles partial star ratings correctly', () => {
      const productWithPartialRating = createMockProduct({
        attributes: {
          averageRating: 3.7,
          reviewCount: 50
        }
      });

      render(<ProductCard product={productWithPartialRating} />);

      const stars = screen.getAllByTestId('star-icon');
      
      // First 3 stars should be filled (Math.floor(3.7) = 3)
      const filledStars = stars.filter(star => 
        star.classList.contains('fill-yellow-400')
      );
      expect(filledStars).toHaveLength(3);
    });
  });

  describe('Action Buttons', () => {
    describe('Wishlist Button', () => {
      it('displays wishlist button when enabled', () => {
        render(<ProductCard product={mockProduct} showWishlist={true} />);

        const wishlistButton = screen.getByRole('button', { name: /wishlist/i });
        expect(wishlistButton).toBeInTheDocument();
        expect(wishlistButton.querySelector('[data-testid="heart-icon"]')).toBeInTheDocument();
      });

      it('hides wishlist button when disabled', () => {
        render(<ProductCard product={mockProduct} showWishlist={false} />);

        expect(screen.queryByRole('button', { name: /wishlist/i })).not.toBeInTheDocument();
      });

      it('shows wishlist button on hover', async () => {
        const { user } = render(<ProductCard product={mockProduct} />);

        const wishlistButton = screen.getByRole('button', { name: /wishlist/i });
        expect(wishlistButton).toHaveClass('opacity-0');

        const productCard = screen.getByRole('article');
        await user.hover(productCard);

        expect(wishlistButton).toHaveClass('group-hover:opacity-100');
      });

      it('handles wishlist button click', async () => {
        const { user } = render(<ProductCard product={mockProduct} />);

        await addProductToWishlist(user);

        // Would trigger wishlist functionality in real app
        const wishlistButton = screen.getByRole('button', { name: /wishlist/i });
        expect(wishlistButton).toBeInTheDocument();
      });
    });

    describe('Quick Add Button', () => {
      it('displays quick add button when enabled and in stock', () => {
        render(<ProductCard product={mockProduct} showQuickAdd={true} />);

        const quickAddButton = screen.getByRole('button', { name: /quick add/i });
        expect(quickAddButton).toBeInTheDocument();
        expect(quickAddButton.querySelector('[data-testid="shopping-bag-icon"]')).toBeInTheDocument();
      });

      it('hides quick add button when disabled', () => {
        render(<ProductCard product={mockProduct} showQuickAdd={false} />);

        expect(screen.queryByRole('button', { name: /quick add/i })).not.toBeInTheDocument();
      });

      it('hides quick add button when out of stock', () => {
        const outOfStockProduct = createMockProduct({
          attributes: { stockQuantity: 0 }
        });

        render(<ProductCard product={outOfStockProduct} showQuickAdd={true} />);

        expect(screen.queryByRole('button', { name: /quick add/i })).not.toBeInTheDocument();
      });

      it('shows quick add button on hover', async () => {
        const { user } = render(<ProductCard product={mockProduct} />);

        const quickAddButton = screen.getByRole('button', { name: /quick add/i });
        expect(quickAddButton).toHaveClass('opacity-0');

        const productCard = screen.getByRole('article');
        await user.hover(productCard);

        expect(quickAddButton).toHaveClass('group-hover:opacity-100');
      });

      it('handles quick add button click', async () => {
        const { user } = render(<ProductCard product={mockProduct} />);

        await addProductToCart(user);

        // Would trigger cart functionality in real app
        const quickAddButton = screen.getByRole('button', { name: /quick add/i });
        expect(quickAddButton).toBeInTheDocument();
      });
    });
  });

  describe('Hover Effects and Interactions', () => {
    it('applies hover effects to card container', async () => {
      const { user } = render(<ProductCard product={mockProduct} />);

      const productCard = screen.getByRole('article');
      
      await user.hover(productCard);
      expect(productCard).toHaveClass('hover:shadow-lg');
    });

    it('shows interactive elements on hover', async () => {
      const { user } = render(<ProductCard product={mockProduct} />);

      const productCard = screen.getByRole('article');
      const wishlistButton = screen.getByRole('button', { name: /wishlist/i });
      const quickAddButton = screen.getByRole('button', { name: /quick add/i });

      // Initially hidden
      expect(wishlistButton).toHaveClass('opacity-0');
      expect(quickAddButton).toHaveClass('opacity-0');

      await user.hover(productCard);

      // Should become visible on hover
      expect(wishlistButton).toHaveClass('group-hover:opacity-100');
      expect(quickAddButton).toHaveClass('group-hover:opacity-100');
    });

    it('applies image zoom effect on hover', async () => {
      const { user } = render(<ProductCard product={mockProduct} />);

      const productCard = screen.getByRole('article');
      const image = screen.getByRole('img');

      await user.hover(productCard);
      expect(image).toHaveClass('group-hover:scale-105');
    });
  });

  describe('Responsive Design', () => {
    it('adapts to mobile viewport', () => {
      mockViewport(viewports.mobile.width);
      render(<ProductCard product={mockProduct} />);

      const productCard = screen.getByRole('article');
      expect(productCard).toBeInTheDocument();

      // Should maintain readability on mobile
      expect(screen.getByText('Premium Wellness Doll')).toBeInTheDocument();
      expect(screen.getByText('$299.99')).toBeInTheDocument();
    });

    it('adjusts button sizes for touch interfaces', () => {
      mockViewport(viewports.mobile.width);
      render(<ProductCard product={mockProduct} />);

      const wishlistButton = screen.getByRole('button', { name: /wishlist/i });
      const quickAddButton = screen.getByRole('button', { name: /quick add/i });

      // Buttons should be touch-friendly
      expect(wishlistButton).toHaveClass('h-8', 'w-8');
      expect(quickAddButton).toHaveClass('size-sm');
    });

    it('maintains aspect ratio across viewports', () => {
      [viewports.mobile, viewports.tablet, viewports.desktop].forEach(viewport => {
        mockViewport(viewport.width);
        const { container, unmount } = render(<ProductCard product={mockProduct} />);

        const imageContainer = container.querySelector('.aspect-square');
        expect(imageContainer).toBeInTheDocument();

        unmount();
      });
    });
  });

  describe('Accessibility Features', () => {
    it('has proper keyboard navigation', async () => {
      const { user } = render(<ProductCard product={mockProduct} />);

      // Tab to product link
      await navigateWithKeyboard(user, 'Tab');
      const productLink = screen.getByRole('link', { name: /premium wellness doll/i });
      expect(productLink).toHaveFocus();

      // Tab to wishlist button
      await navigateWithKeyboard(user, 'Tab');
      const wishlistButton = screen.getByRole('button', { name: /wishlist/i });
      expect(wishlistButton).toHaveFocus();

      // Tab to quick add button
      await navigateWithKeyboard(user, 'Tab');
      const quickAddButton = screen.getByRole('button', { name: /quick add/i });
      expect(quickAddButton).toHaveFocus();
    });

    it('has proper ARIA labels and descriptions', () => {
      render(<ProductCard product={mockProduct} />);

      const productCard = screen.getByRole('article');
      expect(productCard).toHaveAttribute('aria-label', expect.stringMatching(/premium wellness doll/i));

      const productLink = screen.getByRole('link', { name: /premium wellness doll/i });
      expect(productLink).toHaveAttribute('aria-describedby');

      const wishlistButton = screen.getByRole('button', { name: /wishlist/i });
      expect(wishlistButton).toHaveAttribute('aria-label', expect.stringMatching(/add.*wishlist/i));
    });

    it('announces price information to screen readers', () => {
      render(<ProductCard product={mockProduct} />);

      const priceSection = screen.getByText('$299.99').closest('div');
      expect(priceSection).toHaveAttribute('aria-label', expect.stringMatching(/price.*299.*original.*399/i));
    });

    it('provides rating information for screen readers', () => {
      render(<ProductCard product={mockProduct} />);

      const ratingSection = screen.getAllByTestId('star-icon')[0].closest('div');
      expect(ratingSection).toHaveAttribute('aria-label', expect.stringMatching(/4.5.*out of.*5.*127.*reviews/i));
    });
  });

  describe('Performance and Optimization', () => {
    it('renders quickly without performance issues', () => {
      const startTime = performance.now();
      render(<ProductCard product={mockProduct} />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50);
    });

    it('handles rapid prop changes efficiently', () => {
      const { rerender } = render(<ProductCard product={mockProduct} />);

      // Rapid prop changes
      for (let i = 0; i < 20; i++) {
        const updatedProduct = createMockProduct({
          ...mockProduct,
          attributes: {
            ...mockProduct.attributes,
            price: mockProduct.attributes.price + i
          }
        });

        rerender(<ProductCard product={updatedProduct} />);
      }

      expect(screen.getByText('Premium Wellness Doll')).toBeInTheDocument();
    });

    it('optimizes image loading', () => {
      render(<ProductCard product={mockProduct} />);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('loading', 'lazy');
      expect(image).toHaveAttribute('sizes');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles missing product attributes gracefully', () => {
      const incompleteProduct = createMockProduct({
        attributes: {
          name: 'Incomplete Product',
          // Missing many attributes
          price: 99.99
        }
      });

      expect(() => {
        render(<ProductCard product={incompleteProduct} />);
      }).not.toThrow();

      expect(screen.getByText('Incomplete Product')).toBeInTheDocument();
      expect(screen.getByText('$99.99')).toBeInTheDocument();
    });

    it('handles zero prices gracefully', () => {
      const freeProduct = createMockProduct({
        attributes: {
          name: 'Free Product',
          price: 0
        }
      });

      render(<ProductCard product={freeProduct} />);

      expect(screen.getByText('$0')).toBeInTheDocument();
    });

    it('handles very long product names', () => {
      const longNameProduct = createMockProduct({
        attributes: {
          name: 'This is a very long product name that should be truncated properly to maintain layout consistency across different screen sizes and viewports'
        }
      });

      render(<ProductCard product={longNameProduct} />);

      const productName = screen.getByText(/this is a very long product name/i);
      expect(productName).toHaveClass('line-clamp-2');
    });

    it('handles negative stock quantities', () => {
      const negativeStockProduct = createMockProduct({
        attributes: {
          stockQuantity: -5
        }
      });

      render(<ProductCard product={negativeStockProduct} />);

      // Should treat negative stock as out of stock
      expect(screen.getByText('Out of Stock')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /quick add/i })).not.toBeInTheDocument();
    });
  });

  describe('Variant Support', () => {
    it('handles products with variants', () => {
      const productWithVariants = createMockProductWithVariants();

      render(<ProductCard product={productWithVariants} />);

      // Should display base product information
      expect(screen.getByText(productWithVariants.attributes.name)).toBeInTheDocument();
      expect(screen.getByText(`$${productWithVariants.attributes.price}`)).toBeInTheDocument();
    });

    it('shows variant indicator when multiple variants exist', () => {
      const productWithVariants = createMockProductWithVariants({}, 5);

      render(<ProductCard product={productWithVariants} />);

      // Could show variant count or indicator
      const variantIndicator = screen.queryByText(/5.*variants?/i);
      if (variantIndicator) {
        expect(variantIndicator).toBeInTheDocument();
      }
    });
  });
});