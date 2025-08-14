import React from 'react';
import { 
  render, 
  screen, 
  fireEvent,
  waitFor,
  checkA11y,
  navigateWithKeyboard,
  createMockCategory
} from '../../../tests/utils/test-utils';
import { MobileMenu } from '../mobile-menu';

describe('MobileMenu - Comprehensive Tests', () => {
  const mockOnClose = jest.fn();
  const mockCategories = [
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
    }),
    createMockCategory({ 
      id: 3, 
      attributes: { 
        name: 'Home & Garden', 
        slug: 'home-garden',
        showInNavigation: true,
        level: 0 
      } 
    })
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering and Visibility', () => {
    it('does not render when isOpen is false', () => {
      render(
        <MobileMenu 
          isOpen={false} 
          onClose={mockOnClose} 
          categories={mockCategories} 
        />
      );

      expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();
      expect(screen.queryByText('Heaven Dolls')).not.toBeInTheDocument();
    });

    it('renders when isOpen is true', () => {
      render(
        <MobileMenu 
          isOpen={true} 
          onClose={mockOnClose} 
          categories={mockCategories} 
        />
      );

      expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();
      expect(screen.getByText('Heaven Dolls')).toBeInTheDocument();
    });

    it('renders backdrop when open', () => {
      render(
        <MobileMenu 
          isOpen={true} 
          onClose={mockOnClose} 
          categories={mockCategories} 
        />
      );

      const backdrop = screen.getByTestId('mobile-menu-backdrop');
      expect(backdrop).toBeInTheDocument();
      expect(backdrop).toHaveClass('fixed', 'inset-0', 'bg-black/50');
    });

    it('passes accessibility checks when open', async () => {
      const { container } = render(
        <MobileMenu 
          isOpen={true} 
          onClose={mockOnClose} 
          categories={mockCategories} 
        />
      );
      
      await checkA11y(container);
    });
  });

  describe('Header Section', () => {
    beforeEach(() => {
      render(
        <MobileMenu 
          isOpen={true} 
          onClose={mockOnClose} 
          categories={mockCategories} 
        />
      );
    });

    it('displays brand logo and name', () => {
      const brandLogo = screen.getByText('Heaven Dolls').previousSibling;
      expect(brandLogo).toHaveClass('bg-brand-gradient');
      expect(screen.getByText('Heaven Dolls')).toBeInTheDocument();
    });

    it('displays close button', () => {
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toBeInTheDocument();
      expect(closeButton.querySelector('[data-testid="x-icon"]')).toBeInTheDocument();
    });

    it('has proper header styling', () => {
      const header = screen.getByText('Heaven Dolls').closest('.flex');
      expect(header).toHaveClass('items-center', 'justify-between', 'p-4', 'border-b');
    });
  });

  describe('Navigation Links', () => {
    beforeEach(() => {
      render(
        <MobileMenu 
          isOpen={true} 
          onClose={mockOnClose} 
          categories={mockCategories} 
        />
      );
    });

    it('renders all navigation links', () => {
      // Main navigation
      expect(screen.getByRole('link', { name: /all products/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /trending/i })).toBeInTheDocument();
      
      // Category links
      expect(screen.getByRole('link', { name: /electronics/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /fashion/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /home & garden/i })).toBeInTheDocument();
      
      // User account links
      expect(screen.getByRole('link', { name: /wishlist/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /account/i })).toBeInTheDocument();
    });

    it('has correct href attributes for all links', () => {
      const expectedLinks = [
        { name: /all products/i, href: '/products' },
        { name: /electronics/i, href: '/categories/electronics' },
        { name: /fashion/i, href: '/categories/fashion' },
        { name: /home & garden/i, href: '/categories/home-garden' },
        { name: /trending/i, href: '/trending' },
        { name: /wishlist/i, href: '/wishlist' },
        { name: /account/i, href: '/account' }
      ];

      expectedLinks.forEach(({ name, href }) => {
        const link = screen.getByRole('link', { name });
        expect(link).toHaveAttribute('href', href);
      });
    });

    it('displays chevron icons for all links', () => {
      const links = screen.getAllByRole('link');
      
      links.forEach(link => {
        const chevronIcon = link.querySelector('[data-testid="chevron-right-icon"]');
        expect(chevronIcon).toBeInTheDocument();
        expect(chevronIcon).toHaveClass('h-4', 'w-4');
      });
    });

    it('has proper hover states', async () => {
      const { user } = render(
        <MobileMenu 
          isOpen={true} 
          onClose={mockOnClose} 
          categories={mockCategories} 
        />
      );

      const allProductsLink = screen.getByRole('link', { name: /all products/i });
      
      await user.hover(allProductsLink);
      expect(allProductsLink).toHaveClass('hover:bg-muted');
    });
  });

  describe('Category Integration', () => {
    it('renders dynamic category links', () => {
      render(
        <MobileMenu 
          isOpen={true} 
          onClose={mockOnClose} 
          categories={mockCategories} 
        />
      );

      mockCategories.forEach(category => {
        const link = screen.getByRole('link', { name: category.attributes.name });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', `/categories/${category.attributes.slug}`);
      });
    });

    it('handles empty categories gracefully', () => {
      render(
        <MobileMenu 
          isOpen={true} 
          onClose={mockOnClose} 
          categories={[]} 
        />
      );

      // Should still render main navigation
      expect(screen.getByRole('link', { name: /all products/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /trending/i })).toBeInTheDocument();
    });

    it('handles undefined categories gracefully', () => {
      render(
        <MobileMenu 
          isOpen={true} 
          onClose={mockOnClose} 
          categories={undefined} 
        />
      );

      // Should still render main navigation
      expect(screen.getByRole('link', { name: /all products/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /trending/i })).toBeInTheDocument();
    });

    it('maintains category order', () => {
      render(
        <MobileMenu 
          isOpen={true} 
          onClose={mockOnClose} 
          categories={mockCategories} 
        />
      );

      const categoryLinks = screen.getAllByRole('link').filter(link => 
        mockCategories.some(cat => link.textContent?.includes(cat.attributes.name))
      );

      expect(categoryLinks[0]).toHaveTextContent('Electronics');
      expect(categoryLinks[1]).toHaveTextContent('Fashion');
      expect(categoryLinks[2]).toHaveTextContent('Home & Garden');
    });
  });

  describe('Menu Structure and Layout', () => {
    beforeEach(() => {
      render(
        <MobileMenu 
          isOpen={true} 
          onClose={mockOnClose} 
          categories={mockCategories} 
        />
      );
    });

    it('has proper menu dimensions and positioning', () => {
      const menu = screen.getByTestId('mobile-menu');
      expect(menu).toHaveClass('fixed', 'left-0', 'top-0', 'h-full', 'w-80');
    });

    it('has proper sectioning with separators', () => {
      // Check for border separator between main nav and user sections
      const separator = screen.getByRole('link', { name: /wishlist/i }).closest('.pt-4.border-t');
      expect(separator).toBeInTheDocument();
    });

    it('has scrollable content area', () => {
      const scrollableArea = screen.getByRole('navigation').closest('.overflow-auto');
      expect(scrollableArea).toBeInTheDocument();
      expect(scrollableArea).toHaveClass('h-full', 'pb-20');
    });

    it('has proper spacing and padding', () => {
      const navigation = screen.getByRole('navigation');
      expect(navigation).toHaveClass('p-4', 'space-y-2');
      
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveClass('p-3');
      });
    });
  });

  describe('Interaction Handling', () => {
    it('calls onClose when close button is clicked', async () => {
      const { user } = render(
        <MobileMenu 
          isOpen={true} 
          onClose={mockOnClose} 
          categories={mockCategories} 
        />
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', async () => {
      const { user } = render(
        <MobileMenu 
          isOpen={true} 
          onClose={mockOnClose} 
          categories={mockCategories} 
        />
      );

      const backdrop = screen.getByTestId('mobile-menu-backdrop');
      await user.click(backdrop);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when navigation link is clicked', async () => {
      const { user } = render(
        <MobileMenu 
          isOpen={true} 
          onClose={mockOnClose} 
          categories={mockCategories} 
        />
      );

      const allProductsLink = screen.getByRole('link', { name: /all products/i });
      await user.click(allProductsLink);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not close when clicking inside menu area', async () => {
      const { user } = render(
        <MobileMenu 
          isOpen={true} 
          onClose={mockOnClose} 
          categories={mockCategories} 
        />
      );

      const menuArea = screen.getByTestId('mobile-menu');
      await user.click(menuArea);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('prevents event bubbling when clicking menu content', async () => {
      const { user } = render(
        <MobileMenu 
          isOpen={true} 
          onClose={mockOnClose} 
          categories={mockCategories} 
        />
      );

      // Click on the brand name (inside menu)
      const brandName = screen.getByText('Heaven Dolls');
      await user.click(brandName);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation and Focus Management', () => {
    it('supports tab navigation through all interactive elements', async () => {
      const { user } = render(
        <MobileMenu 
          isOpen={true} 
          onClose={mockOnClose} 
          categories={mockCategories} 
        />
      );

      // First tab should focus close button
      await navigateWithKeyboard(user, 'Tab');
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toHaveFocus();

      // Continue tabbing through navigation links
      await navigateWithKeyboard(user, 'Tab');
      const firstLink = screen.getByRole('link', { name: /all products/i });
      expect(firstLink).toHaveFocus();
    });

    it('closes menu on Escape key', async () => {
      const { user } = render(
        <MobileMenu 
          isOpen={true} 
          onClose={mockOnClose} 
          categories={mockCategories} 
        />
      );

      await navigateWithKeyboard(user, 'Escape');
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('maintains focus within menu when open', async () => {
      const { user } = render(
        <div>
          <button>Outside Button</button>
          <MobileMenu 
            isOpen={true} 
            onClose={mockOnClose} 
            categories={mockCategories} 
          />
        </div>
      );

      // Tab should not escape to outside elements
      const closeButton = screen.getByRole('button', { name: /close/i });
      closeButton.focus();

      // Shift+Tab should cycle to last focusable element in menu
      await navigateWithKeyboard(user, 'Tab', 1, { shiftKey: true });
      
      const lastLink = screen.getByRole('link', { name: /account/i });
      expect(lastLink).toHaveFocus();
    });

    it('activates links on Enter key', async () => {
      const { user } = render(
        <MobileMenu 
          isOpen={true} 
          onClose={mockOnClose} 
          categories={mockCategories} 
        />
      );

      const allProductsLink = screen.getByRole('link', { name: /all products/i });
      allProductsLink.focus();
      
      await navigateWithKeyboard(user, 'Enter');
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility Features', () => {
    it('has proper ARIA attributes', () => {
      render(
        <MobileMenu 
          isOpen={true} 
          onClose={mockOnClose} 
          categories={mockCategories} 
        />
      );

      const menu = screen.getByTestId('mobile-menu');
      expect(menu).toHaveAttribute('role', 'dialog');
      expect(menu).toHaveAttribute('aria-modal', 'true');
      expect(menu).toHaveAttribute('aria-label', 'Mobile navigation menu');

      const navigation = screen.getByRole('navigation');
      expect(navigation).toHaveAttribute('aria-label', 'Mobile menu navigation');
    });

    it('has proper close button labeling', () => {
      render(
        <MobileMenu 
          isOpen={true} 
          onClose={mockOnClose} 
          categories={mockCategories} 
        />
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toHaveAttribute('aria-label', 'Close mobile menu');
    });

    it('announces menu state to screen readers', () => {
      const { rerender } = render(
        <MobileMenu 
          isOpen={false} 
          onClose={mockOnClose} 
          categories={mockCategories} 
        />
      );

      // Should not be in DOM when closed
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      rerender(
        <MobileMenu 
          isOpen={true} 
          onClose={mockOnClose} 
          categories={mockCategories} 
        />
      );

      // Should be announced when opened
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('provides sufficient color contrast', () => {
      render(
        <MobileMenu 
          isOpen={true} 
          onClose={mockOnClose} 
          categories={mockCategories} 
        />
      );

      // Check backdrop has sufficient opacity for accessibility
      const backdrop = screen.getByTestId('mobile-menu-backdrop');
      expect(backdrop).toHaveClass('bg-black/50');

      // Check menu has proper background
      const menu = screen.getByTestId('mobile-menu');
      expect(menu).toHaveClass('bg-background');
    });
  });

  describe('Visual Design and Styling', () => {
    beforeEach(() => {
      render(
        <MobileMenu 
          isOpen={true} 
          onClose={mockOnClose} 
          categories={mockCategories} 
        />
      );
    });

    it('has proper visual hierarchy', () => {
      // Brand section should be prominent
      const brandSection = screen.getByText('Heaven Dolls').closest('.flex');
      expect(brandSection).toHaveClass('border-b');

      // User section should be separated
      const userSection = screen.getByRole('link', { name: /wishlist/i }).closest('.pt-4.border-t');
      expect(userSection).toBeInTheDocument();
    });

    it('has consistent link styling', () => {
      const links = screen.getAllByRole('link');
      
      links.forEach(link => {
        expect(link).toHaveClass(
          'flex', 
          'items-center', 
          'justify-between', 
          'p-3', 
          'text-sm', 
          'font-medium', 
          'rounded-lg', 
          'hover:bg-muted', 
          'transition-colors'
        );
      });
    });

    it('has proper shadow and borders', () => {
      const menu = screen.getByTestId('mobile-menu');
      expect(menu).toHaveClass('border-r', 'shadow-lg');
    });

    it('uses consistent icon sizing', () => {
      const chevronIcons = screen.getAllByTestId('chevron-right-icon');
      const closeIcon = screen.getByTestId('x-icon');
      
      chevronIcons.forEach(icon => {
        expect(icon).toHaveClass('h-4', 'w-4');
      });
      
      expect(closeIcon).toHaveClass('h-5', 'w-5');
    });
  });

  describe('Performance and Optimization', () => {
    it('renders efficiently without unnecessary re-renders', () => {
      const renderSpy = jest.fn();
      const TestMobileMenu = (props: any) => {
        renderSpy();
        return <MobileMenu {...props} />;
      };

      const { rerender } = render(
        <TestMobileMenu 
          isOpen={false} 
          onClose={mockOnClose} 
          categories={mockCategories} 
        />
      );

      renderSpy.mockClear();

      // Re-render with same props should not cause unnecessary renders
      rerender(
        <TestMobileMenu 
          isOpen={false} 
          onClose={mockOnClose} 
          categories={mockCategories} 
        />
      );

      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('handles large category lists efficiently', () => {
      const largeCategories = Array.from({ length: 50 }, (_, i) =>
        createMockCategory({ 
          id: i + 1, 
          attributes: { 
            name: `Category ${i + 1}`, 
            slug: `category-${i + 1}` 
          } 
        })
      );

      const startTime = performance.now();
      render(
        <MobileMenu 
          isOpen={true} 
          onClose={mockOnClose} 
          categories={largeCategories} 
        />
      );
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should render in under 100ms
    });

    it('does not cause memory leaks on unmount', () => {
      const { unmount } = render(
        <MobileMenu 
          isOpen={true} 
          onClose={mockOnClose} 
          categories={mockCategories} 
        />
      );

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles malformed category data gracefully', () => {
      const malformedCategories = [
        createMockCategory({ attributes: { name: '', slug: '' } }),
        createMockCategory({ attributes: { name: 'Valid Category', slug: 'valid-category' } }),
        // @ts-ignore - Testing with invalid data
        { id: 'invalid', attributes: null }
      ];

      expect(() => {
        render(
          <MobileMenu 
            isOpen={true} 
            onClose={mockOnClose} 
            categories={malformedCategories as any} 
          />
        );
      }).not.toThrow();

      // Should still render valid categories
      expect(screen.getByRole('link', { name: 'Valid Category' })).toBeInTheDocument();
    });

    it('handles rapid open/close cycles', async () => {
      const { rerender } = render(
        <MobileMenu 
          isOpen={false} 
          onClose={mockOnClose} 
          categories={mockCategories} 
        />
      );

      // Rapidly toggle open/close
      for (let i = 0; i < 10; i++) {
        rerender(
          <MobileMenu 
            isOpen={i % 2 === 0} 
            onClose={mockOnClose} 
            categories={mockCategories} 
          />
        );
      }

      // Should not throw errors
      expect(() => {
        rerender(
          <MobileMenu 
            isOpen={true} 
            onClose={mockOnClose} 
            categories={mockCategories} 
          />
        );
      }).not.toThrow();
    });

    it('handles missing onClose callback gracefully', () => {
      expect(() => {
        render(
          <MobileMenu 
            isOpen={true} 
            onClose={undefined as any} 
            categories={mockCategories} 
          />
        );
      }).not.toThrow();
    });
  });

  describe('Integration with Parent Components', () => {
    it('receives and uses props correctly', () => {
      render(
        <MobileMenu 
          isOpen={true} 
          onClose={mockOnClose} 
          categories={mockCategories} 
        />
      );

      // Should be visible when isOpen is true
      expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();

      // Should render provided categories
      mockCategories.forEach(category => {
        expect(screen.getByText(category.attributes.name)).toBeInTheDocument();
      });
    });

    it('communicates state changes to parent', async () => {
      const { user } = render(
        <MobileMenu 
          isOpen={true} 
          onClose={mockOnClose} 
          categories={mockCategories} 
        />
      );

      // Clicking close should notify parent
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);

      // Clicking link should also notify parent
      const link = screen.getByRole('link', { name: /all products/i });
      await user.click(link);

      expect(mockOnClose).toHaveBeenCalledTimes(2);
    });
  });
});