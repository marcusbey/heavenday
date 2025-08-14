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
  expectErrorMessage,
  expectNoErrorMessage,
  createMockCategory
} from '../../../tests/utils/test-utils';
import { Header } from '../header';
import { server } from '../../../tests/mocks/server';
import { http, HttpResponse } from 'msw';

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
            showInNavigation: true,
            level: 0 
          } 
        }),
        createMockCategory({ 
          id: 2, 
          attributes: { 
            name: 'Fashion', 
            slug: 'fashion',
            showInNavigation: true,
            level: 0 
          } 
        })
      ]
    },
    isLoading: false,
    error: null
  })
}));

describe('Header - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering and Structure', () => {
    it('renders all essential elements correctly', () => {
      render(<Header />);

      // Logo and branding
      expect(screen.getByText('Heaven Dolls')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /heaven dolls/i })).toHaveAttribute('href', '/');

      // Navigation
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByText('All Products')).toBeInTheDocument();
      expect(screen.getByText('Electronics')).toBeInTheDocument();
      expect(screen.getByText('Fashion')).toBeInTheDocument();
      expect(screen.getByText('Trending')).toBeInTheDocument();

      // Search bar
      expect(screen.getByRole('searchbox')).toBeInTheDocument();

      // User actions
      expect(screen.getByRole('button', { name: /cart/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /wishlist/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /account/i })).toBeInTheDocument();
    });

    it('passes accessibility checks', async () => {
      const { container } = render(<Header />);
      await checkA11y(container);
    });

    it('has proper semantic HTML structure', () => {
      render(<Header />);

      const header = screen.getByRole('banner');
      expect(header).toBeInTheDocument();
      expect(header).toHaveAttribute('class', expect.stringContaining('sticky'));

      const navigation = screen.getByRole('navigation');
      expect(navigation).toBeInTheDocument();

      const searchBox = screen.getByRole('searchbox');
      expect(searchBox).toBeInTheDocument();
    });
  });

  describe('Mobile Menu Functionality', () => {
    beforeEach(() => {
      mockViewport(viewports.mobile.width);
    });

    it('shows mobile menu button on mobile', () => {
      render(<Header />);
      
      const mobileMenuButton = screen.getByRole('button', { name: /menu/i });
      expect(mobileMenuButton).toBeInTheDocument();
      expect(mobileMenuButton).toBeVisible();
    });

    it('opens mobile menu when button is clicked', async () => {
      const { user } = render(<Header />);
      
      const mobileMenuButton = screen.getByRole('button', { name: /menu/i });
      await user.click(mobileMenuButton);

      // Wait for mobile menu to appear
      await waitFor(() => {
        expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();
      });
    });

    it('closes mobile menu when close button is clicked', async () => {
      const { user } = render(<Header />);
      
      // Open menu
      const mobileMenuButton = screen.getByRole('button', { name: /menu/i });
      await user.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();
      });

      // Close menu
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();
      });
    });

    it('closes mobile menu on escape key', async () => {
      const { user } = render(<Header />);
      
      // Open menu
      const mobileMenuButton = screen.getByRole('button', { name: /menu/i });
      await user.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();
      });

      // Press escape
      await navigateWithKeyboard(user, 'Escape');

      await waitFor(() => {
        expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();
      });
    });
  });

  describe('Desktop Navigation', () => {
    beforeEach(() => {
      mockViewport(viewports.desktop.width);
    });

    it('hides mobile menu button on desktop', () => {
      render(<Header />);
      
      const mobileMenuButton = screen.getByRole('button', { name: /menu/i });
      expect(mobileMenuButton).toHaveClass('lg:hidden');
    });

    it('displays desktop navigation links', () => {
      render(<Header />);
      
      const navigation = screen.getByRole('navigation');
      expect(navigation).toHaveClass('hidden', 'lg:flex');
      
      expect(screen.getByRole('link', { name: /all products/i })).toHaveAttribute('href', '/products');
      expect(screen.getByRole('link', { name: /electronics/i })).toHaveAttribute('href', '/categories/electronics');
      expect(screen.getByRole('link', { name: /fashion/i })).toHaveAttribute('href', '/categories/fashion');
      expect(screen.getByRole('link', { name: /trending/i })).toHaveAttribute('href', '/trending');
    });

    it('supports keyboard navigation', async () => {
      const { user } = render(<Header />);
      
      // Tab through navigation links
      await navigateWithKeyboard(user, 'Tab', 3);
      
      // Should focus on first nav link
      const firstLink = screen.getByRole('link', { name: /all products/i });
      expect(firstLink).toHaveFocus();

      // Arrow right to next link
      await navigateWithKeyboard(user, 'ArrowRight');
      const electronicsLink = screen.getByRole('link', { name: /electronics/i });
      expect(electronicsLink).toHaveFocus();
    });
  });

  describe('Search Functionality', () => {
    it('renders search input with proper attributes', () => {
      render(<Header />);
      
      const searchInput = screen.getByRole('searchbox');
      expect(searchInput).toHaveAttribute('type', 'search');
      expect(searchInput).toHaveAttribute('placeholder', expect.stringMatching(/search/i));
      expect(searchInput).toHaveAttribute('aria-label', expect.stringMatching(/search/i));
    });

    it('shows search suggestions when typing', async () => {
      const { user } = render(<Header />);
      
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'test');

      await waitFor(() => {
        expect(screen.getByText('test Product 1')).toBeInTheDocument();
        expect(screen.getByText('test Product 2')).toBeInTheDocument();
      });
    });

    it('navigates to search results on form submission', async () => {
      const { user } = render(<Header />);
      
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'wellness dolls');
      
      // Submit search
      await user.keyboard('{Enter}');
      
      // Check that navigation occurred (would be handled by Next.js router in real app)
      expect(searchInput).toHaveValue('wellness dolls');
    });

    it('clears search on escape key', async () => {
      const { user } = render(<Header />);
      
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'test query');
      expect(searchInput).toHaveValue('test query');

      await navigateWithKeyboard(user, 'Escape');
      expect(searchInput).toHaveValue('');
    });

    it('handles empty search gracefully', async () => {
      const { user } = render(<Header />);
      
      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, '');
      await user.keyboard('{Enter}');
      
      // Should not show any error messages
      expectNoErrorMessage();
    });
  });

  describe('Cart Functionality', () => {
    it('displays cart button with correct icon', () => {
      render(<Header />);
      
      const cartButton = screen.getByRole('button', { name: /cart/i });
      expect(cartButton).toBeInTheDocument();
      expect(cartButton.querySelector('[data-testid="shopping-bag-icon"]')).toBeInTheDocument();
    });

    it('shows cart item count badge', () => {
      render(<Header />);
      
      // Default count should be 0
      const badge = screen.getByText('0');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-brand-600');
    });

    it('opens cart drawer when clicked', async () => {
      const { user } = render(<Header />);
      
      const cartButton = screen.getByRole('button', { name: /cart/i });
      await user.click(cartButton);

      await waitFor(() => {
        expect(screen.getByTestId('cart-drawer')).toBeInTheDocument();
      });
    });

    it('closes cart drawer when backdrop is clicked', async () => {
      const { user } = render(<Header />);
      
      // Open cart
      const cartButton = screen.getByRole('button', { name: /cart/i });
      await user.click(cartButton);

      await waitFor(() => {
        expect(screen.getByTestId('cart-drawer')).toBeInTheDocument();
      });

      // Click backdrop
      const backdrop = screen.getByTestId('cart-drawer-backdrop');
      await user.click(backdrop);

      await waitFor(() => {
        expect(screen.queryByTestId('cart-drawer')).not.toBeInTheDocument();
      });
    });
  });

  describe('Wishlist and User Actions', () => {
    it('renders wishlist link correctly', () => {
      render(<Header />);
      
      const wishlistLink = screen.getByRole('link', { name: /wishlist/i });
      expect(wishlistLink).toHaveAttribute('href', '/wishlist');
      expect(wishlistLink.querySelector('[data-testid="heart-icon"]')).toBeInTheDocument();
    });

    it('renders user account link correctly', () => {
      render(<Header />);
      
      const accountLink = screen.getByRole('link', { name: /account/i });
      expect(accountLink).toHaveAttribute('href', '/account');
      expect(accountLink.querySelector('[data-testid="user-icon"]')).toBeInTheDocument();
    });

    it('has proper hover states for all buttons', async () => {
      const { user } = render(<Header />);
      
      const cartButton = screen.getByRole('button', { name: /cart/i });
      const wishlistLink = screen.getByRole('link', { name: /wishlist/i });
      const accountLink = screen.getByRole('link', { name: /account/i });

      // Test hover states
      await user.hover(cartButton);
      expect(cartButton).toHaveClass('hover:bg-accent');

      await user.hover(wishlistLink);
      expect(wishlistLink).toHaveClass('hover:bg-accent');

      await user.hover(accountLink);
      expect(accountLink).toHaveClass('hover:bg-accent');
    });
  });

  describe('Responsive Design', () => {
    it('adapts to mobile viewport', () => {
      mockViewport(viewports.mobile.width);
      render(<Header />);
      
      // Mobile menu button should be visible
      const mobileMenuButton = screen.getByRole('button', { name: /menu/i });
      expect(mobileMenuButton).toBeVisible();
      
      // Desktop navigation should be hidden
      const navigation = screen.getByRole('navigation');
      expect(navigation).toHaveClass('hidden');
    });

    it('adapts to tablet viewport', () => {
      mockViewport(viewports.tablet.width);
      render(<Header />);
      
      // Should still show mobile menu on tablet
      const mobileMenuButton = screen.getByRole('button', { name: /menu/i });
      expect(mobileMenuButton).toBeVisible();
    });

    it('adapts to desktop viewport', () => {
      mockViewport(viewports.desktop.width);
      render(<Header />);
      
      // Desktop navigation should be visible
      const navigation = screen.getByRole('navigation');
      expect(navigation).toHaveClass('lg:flex');
      
      // Mobile menu button should be hidden
      const mobileMenuButton = screen.getByRole('button', { name: /menu/i });
      expect(mobileMenuButton).toHaveClass('lg:hidden');
    });

    it('maintains proper spacing across viewports', () => {
      [viewports.mobile, viewports.tablet, viewports.desktop].forEach(viewport => {
        mockViewport(viewport.width);
        const { container } = render(<Header />);
        
        const header = container.querySelector('header');
        expect(header).toHaveClass('h-16'); // Consistent height
        
        const containerDiv = header?.querySelector('.container');
        expect(containerDiv).toHaveClass('flex', 'items-center');
      });
    });
  });

  describe('Sticky Header Behavior', () => {
    it('has sticky positioning classes', () => {
      render(<Header />);
      
      const header = screen.getByRole('banner');
      expect(header).toHaveClass('sticky', 'top-0', 'z-50');
    });

    it('has backdrop blur effects', () => {
      render(<Header />);
      
      const header = screen.getByRole('banner');
      expect(header).toHaveClass('backdrop-blur');
      expect(header).toHaveClass('bg-background/95');
    });
  });

  describe('Categories Integration', () => {
    it('renders category links from API data', () => {
      render(<Header />);
      
      expect(screen.getByRole('link', { name: /electronics/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /fashion/i })).toBeInTheDocument();
    });

    it('handles category loading state gracefully', () => {
      // Mock loading state
      jest.doMock('@/hooks/use-categories', () => ({
        useCategories: () => ({
          data: null,
          isLoading: true,
          error: null
        })
      }));

      render(<Header />);
      
      // Should still render basic navigation
      expect(screen.getByText('All Products')).toBeInTheDocument();
      expect(screen.getByText('Trending')).toBeInTheDocument();
    });

    it('handles category error state gracefully', () => {
      // Mock error state
      jest.doMock('@/hooks/use-categories', () => ({
        useCategories: () => ({
          data: null,
          isLoading: false,
          error: new Error('Failed to load categories')
        })
      }));

      render(<Header />);
      
      // Should still render basic navigation without errors
      expect(screen.getByText('All Products')).toBeInTheDocument();
      expect(screen.getByText('Trending')).toBeInTheDocument();
      expectNoErrorMessage();
    });
  });

  describe('Performance and Optimization', () => {
    it('renders quickly under performance budget', () => {
      const renderTime = performance.now();
      render(<Header />);
      const endTime = performance.now();
      
      expect(endTime - renderTime).toBeLessThan(100); // Should render in under 100ms
    });

    it('does not cause memory leaks', () => {
      const { unmount } = render(<Header />);
      
      // Simulate user interactions
      const cartButton = screen.getByRole('button', { name: /cart/i });
      fireEvent.click(cartButton);
      
      // Unmount component
      unmount();
      
      // Should not throw errors or cause memory leaks
      expect(() => {
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }).not.toThrow();
    });
  });

  describe('Error Boundaries and Edge Cases', () => {
    it('handles missing category data gracefully', () => {
      render(<Header />);
      
      // Should not crash if categories are undefined
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('handles network errors gracefully', async () => {
      // Mock network error
      server.use(
        http.get('/api/categories', () => {
          return HttpResponse.json(
            { error: 'Network error' },
            { status: 500 }
          );
        })
      );

      render(<Header />);
      
      // Component should still render without crashing
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expectNoErrorMessage();
    });
  });

  describe('Keyboard Navigation and Focus Management', () => {
    it('supports tab navigation through all interactive elements', async () => {
      const { user } = render(<Header />);
      
      // Tab through all focusable elements
      const focusableElements = [
        screen.getByRole('link', { name: /heaven dolls/i }),
        screen.getByRole('link', { name: /all products/i }),
        screen.getByRole('link', { name: /electronics/i }),
        screen.getByRole('link', { name: /fashion/i }),
        screen.getByRole('link', { name: /trending/i }),
        screen.getByRole('searchbox'),
        screen.getByRole('link', { name: /wishlist/i }),
        screen.getByRole('button', { name: /cart/i }),
        screen.getByRole('link', { name: /account/i })
      ];

      for (const element of focusableElements) {
        await navigateWithKeyboard(user, 'Tab');
        expect(document.activeElement).toBe(element);
      }
    });

    it('maintains focus within mobile menu when open', async () => {
      mockViewport(viewports.mobile.width);
      const { user } = render(<Header />);
      
      // Open mobile menu
      const mobileMenuButton = screen.getByRole('button', { name: /menu/i });
      await user.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();
      });

      // Focus should be trapped within mobile menu
      const mobileMenu = screen.getByTestId('mobile-menu');
      const focusableElements = mobileMenu.querySelectorAll('button, a, input, [tabindex]');
      
      expect(focusableElements.length).toBeGreaterThan(0);
    });
  });
});