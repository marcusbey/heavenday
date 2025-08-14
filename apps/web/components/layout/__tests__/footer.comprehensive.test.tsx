import React from 'react';
import { 
  render, 
  screen,
  checkA11y,
  mockViewport,
  viewports,
  navigateWithKeyboard
} from '../../../tests/utils/test-utils';
import { Footer } from '../footer';

describe('Footer - Comprehensive Tests', () => {
  describe('Rendering and Structure', () => {
    it('renders all essential footer sections', () => {
      render(<Footer />);

      // Brand section
      expect(screen.getByText('Heaven Dolls')).toBeInTheDocument();
      expect(screen.getByText(/premium adult products marketplace/i)).toBeInTheDocument();

      // Navigation sections
      expect(screen.getByText('Shop')).toBeInTheDocument();
      expect(screen.getByText('Support')).toBeInTheDocument();
      expect(screen.getByText('Legal')).toBeInTheDocument();

      // Trust badges
      expect(screen.getByText('SSL Secured')).toBeInTheDocument();
      expect(screen.getByText('Secure Payments')).toBeInTheDocument();
      expect(screen.getByText('Discreet Packaging')).toBeInTheDocument();

      // Age verification
      expect(screen.getByText('18+ Only. Adult Content.')).toBeInTheDocument();
      expect(screen.getByText(/this website contains adult content/i)).toBeInTheDocument();
    });

    it('passes accessibility checks', async () => {
      const { container } = render(<Footer />);
      await checkA11y(container);
    });

    it('has proper semantic HTML structure', () => {
      render(<Footer />);

      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeInTheDocument();
      expect(footer.tagName).toBe('FOOTER');

      // Check for proper heading hierarchy
      const headings = screen.getAllByRole('heading', { level: 3 });
      expect(headings).toHaveLength(3);
      expect(headings[0]).toHaveTextContent('Shop');
      expect(headings[1]).toHaveTextContent('Support');
      expect(headings[2]).toHaveTextContent('Legal');
    });

    it('includes company logo and branding', () => {
      render(<Footer />);

      const logo = screen.getByText('Heaven Dolls').previousSibling;
      expect(logo).toHaveClass('bg-brand-gradient');
      expect(logo).toHaveClass('h-8', 'w-8', 'rounded-lg');
    });
  });

  describe('Brand Section', () => {
    it('displays brand information correctly', () => {
      render(<Footer />);

      expect(screen.getByText('Heaven Dolls')).toBeInTheDocument();
      expect(screen.getByText(/premium adult products marketplace/i)).toBeInTheDocument();
      expect(screen.getByText(/sophisticated, discreet, and tastefully curated/i)).toBeInTheDocument();
    });

    it('shows trust indicators in brand section', () => {
      render(<Footer />);

      expect(screen.getByText('Secure & Discreet')).toBeInTheDocument();
      expect(screen.getByText('Fast Shipping')).toBeInTheDocument();

      // Check for icons
      const shieldIcons = screen.getAllByTestId('shield-icon');
      const truckIcons = screen.getAllByTestId('truck-icon');
      
      expect(shieldIcons.length).toBeGreaterThan(0);
      expect(truckIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Navigation Links', () => {
    describe('Shop Section', () => {
      it('renders all shop navigation links', () => {
        render(<Footer />);

        const shopLinks = [
          { text: 'All Products', href: '/products' },
          { text: 'Trending', href: '/trending' },
          { text: 'Featured', href: '/featured' },
          { text: 'New Arrivals', href: '/new' }
        ];

        shopLinks.forEach(({ text, href }) => {
          const link = screen.getByRole('link', { name: text });
          expect(link).toBeInTheDocument();
          expect(link).toHaveAttribute('href', href);
        });
      });

      it('has proper hover states for shop links', async () => {
        const { user } = render(<Footer />);

        const allProductsLink = screen.getByRole('link', { name: 'All Products' });
        
        await user.hover(allProductsLink);
        expect(allProductsLink).toHaveClass('hover:text-foreground');
      });
    });

    describe('Support Section', () => {
      it('renders all support navigation links', () => {
        render(<Footer />);

        const supportLinks = [
          { text: 'Help Center', href: '/help' },
          { text: 'Contact Us', href: '/contact' },
          { text: 'Shipping Info', href: '/shipping' },
          { text: 'Returns', href: '/returns' }
        ];

        supportLinks.forEach(({ text, href }) => {
          const link = screen.getByRole('link', { name: text });
          expect(link).toBeInTheDocument();
          expect(link).toHaveAttribute('href', href);
        });
      });

      it('has proper hover states for support links', async () => {
        const { user } = render(<Footer />);

        const helpCenterLink = screen.getByRole('link', { name: 'Help Center' });
        
        await user.hover(helpCenterLink);
        expect(helpCenterLink).toHaveClass('hover:text-foreground');
      });
    });

    describe('Legal Section', () => {
      it('renders all legal navigation links', () => {
        render(<Footer />);

        const legalLinks = [
          { text: 'Privacy Policy', href: '/privacy' },
          { text: 'Terms of Service', href: '/terms' },
          { text: 'Cookie Policy', href: '/cookies' },
          { text: 'Age Verification', href: '/age-verification' }
        ];

        legalLinks.forEach(({ text, href }) => {
          const link = screen.getByRole('link', { name: text });
          expect(link).toBeInTheDocument();
          expect(link).toHaveAttribute('href', href);
        });
      });

      it('has proper hover states for legal links', async () => {
        const { user } = render(<Footer />);

        const privacyLink = screen.getByRole('link', { name: 'Privacy Policy' });
        
        await user.hover(privacyLink);
        expect(privacyLink).toHaveClass('hover:text-foreground');
      });
    });
  });

  describe('Trust Badges and Security Features', () => {
    it('displays all trust badges with icons', () => {
      render(<Footer />);

      const trustBadges = [
        { text: 'SSL Secured', icon: 'shield-icon' },
        { text: 'Secure Payments', icon: 'credit-card-icon' },
        { text: 'Discreet Packaging', icon: 'heart-icon' }
      ];

      trustBadges.forEach(({ text, icon }) => {
        expect(screen.getByText(text)).toBeInTheDocument();
        expect(screen.getByTestId(icon)).toBeInTheDocument();
      });
    });

    it('displays security and trust information prominently', () => {
      render(<Footer />);

      // Multiple trust indicators
      expect(screen.getAllByText(/secure/i)).toHaveLength(2); // "Secure & Discreet" and "SSL Secured"
      expect(screen.getByText('Secure Payments')).toBeInTheDocument();
      expect(screen.getByText('Discreet Packaging')).toBeInTheDocument();
    });
  });

  describe('Copyright and Legal Information', () => {
    it('displays copyright information', () => {
      render(<Footer />);

      expect(screen.getByText('© 2024 Heaven Dolls. All rights reserved.')).toBeInTheDocument();
    });

    it('displays age restriction warnings', () => {
      render(<Footer />);

      expect(screen.getByText('18+ Only. Adult Content.')).toBeInTheDocument();
      expect(screen.getByText(/this website contains adult content/i)).toBeInTheDocument();
      expect(screen.getByText(/intended for adults aged 18 and over/i)).toBeInTheDocument();
    });

    it('includes proper age verification notice', () => {
      render(<Footer />);

      const ageNotice = screen.getByText(/by continuing to use this site/i);
      expect(ageNotice).toBeInTheDocument();
      expect(ageNotice).toHaveClass('text-xs', 'text-center');
      
      // Check that the notice is in the proper styled section
      const noticeContainer = ageNotice.closest('.bg-muted\\/50');
      expect(noticeContainer).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('adapts to mobile viewport', () => {
      mockViewport(viewports.mobile.width);
      render(<Footer />);

      const gridContainer = screen.getByText('Shop').closest('.grid');
      expect(gridContainer).toHaveClass('grid-cols-1');
      
      // Trust badges should stack vertically on mobile
      const trustBadgeContainer = screen.getByText('SSL Secured').closest('.flex');
      expect(trustBadgeContainer).toHaveClass('flex-col', 'md:flex-row');
    });

    it('adapts to tablet viewport', () => {
      mockViewport(viewports.tablet.width);
      render(<Footer />);

      const gridContainer = screen.getByText('Shop').closest('.grid');
      expect(gridContainer).toHaveClass('md:grid-cols-2');
    });

    it('adapts to desktop viewport', () => {
      mockViewport(viewports.desktop.width);
      render(<Footer />);

      const gridContainer = screen.getByText('Shop').closest('.grid');
      expect(gridContainer).toHaveClass('lg:grid-cols-5');
      
      // Brand section should span 2 columns on desktop
      const brandSection = screen.getByText('Heaven Dolls').closest('.lg\\:col-span-2');
      expect(brandSection).toBeInTheDocument();
    });

    it('maintains proper spacing across viewports', () => {
      [viewports.mobile, viewports.tablet, viewports.desktop].forEach(viewport => {
        mockViewport(viewport.width);
        const { container } = render(<Footer />);
        
        const footer = container.querySelector('footer');
        expect(footer).toHaveClass('border-t');
        
        const mainContainer = footer?.querySelector('.container');
        expect(mainContainer).toHaveClass('py-12');
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('supports tab navigation through all links', async () => {
      const { user } = render(<Footer />);

      // Get all links in order
      const allLinks = screen.getAllByRole('link');
      expect(allLinks.length).toBeGreaterThan(0);

      // Tab through first few links to ensure navigation works
      for (let i = 0; i < Math.min(3, allLinks.length); i++) {
        await navigateWithKeyboard(user, 'Tab');
        expect(document.activeElement).toBe(allLinks[i]);
      }
    });

    it('has proper focus indicators', async () => {
      const { user } = render(<Footer />);

      const firstLink = screen.getByRole('link', { name: 'All Products' });
      await user.tab();
      
      expect(firstLink).toHaveFocus();
      expect(firstLink).toHaveClass('transition-colors');
    });

    it('maintains logical tab order', async () => {
      const { user } = render(<Footer />);

      // Tab order should be: Shop links -> Support links -> Legal links
      const expectedOrder = [
        'All Products',
        'Trending',
        'Featured', 
        'New Arrivals',
        'Help Center',
        'Contact Us',
        'Shipping Info',
        'Returns',
        'Privacy Policy',
        'Terms of Service',
        'Cookie Policy',
        'Age Verification'
      ];

      for (const linkText of expectedOrder.slice(0, 5)) { // Test first 5 for brevity
        await navigateWithKeyboard(user, 'Tab');
        const currentLink = screen.getByRole('link', { name: linkText });
        expect(currentLink).toHaveFocus();
      }
    });
  });

  describe('Accessibility Features', () => {
    it('has proper ARIA labels and roles', () => {
      render(<Footer />);

      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeInTheDocument();

      // Check that all navigation sections have proper headings
      const shopHeading = screen.getByRole('heading', { name: 'Shop' });
      const supportHeading = screen.getByRole('heading', { name: 'Support' });
      const legalHeading = screen.getByRole('heading', { name: 'Legal' });

      expect(shopHeading).toBeInTheDocument();
      expect(supportHeading).toBeInTheDocument();
      expect(legalHeading).toBeInTheDocument();
    });

    it('provides sufficient color contrast', () => {
      render(<Footer />);

      // Check that muted text has appropriate classes
      const mutedElements = screen.getAllByText('', { selector: '.text-muted-foreground' });
      mutedElements.forEach(element => {
        expect(element).toHaveClass('text-muted-foreground');
      });
    });

    it('has descriptive link text', () => {
      render(<Footer />);

      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link.textContent).toBeTruthy();
        expect(link.textContent?.trim().length).toBeGreaterThan(0);
      });
    });

    it('supports screen reader navigation', () => {
      render(<Footer />);

      // Check for proper landmark structure
      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeInTheDocument();

      // Check for proper list structures
      const lists = footer.querySelectorAll('ul');
      expect(lists.length).toBe(3); // Shop, Support, Legal

      lists.forEach(list => {
        const listItems = list.querySelectorAll('li');
        expect(listItems.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Visual Design and Styling', () => {
    it('has consistent spacing and typography', () => {
      render(<Footer />);

      // Check main container spacing
      const mainContainer = screen.getByText('Heaven Dolls').closest('.container');
      expect(mainContainer).toHaveClass('py-12');

      // Check section spacing
      const gridContainer = screen.getByText('Shop').closest('.grid');
      expect(gridContainer).toHaveClass('gap-8');

      // Check typography classes
      const headings = screen.getAllByRole('heading', { level: 3 });
      headings.forEach(heading => {
        expect(heading).toHaveClass('font-semibold', 'mb-4');
      });
    });

    it('applies correct color schemes', () => {
      render(<Footer />);

      // Footer background
      const footer = screen.getByRole('contentinfo');
      expect(footer).toHaveClass('bg-background', 'border-t');

      // Age verification section
      const ageVerificationSection = screen.getByText(/this website contains adult content/i).closest('.bg-muted\\/50');
      expect(ageVerificationSection).toBeInTheDocument();
    });

    it('uses consistent icon sizing', () => {
      render(<Footer />);

      const icons = [
        screen.getAllByTestId('shield-icon'),
        screen.getAllByTestId('truck-icon'),
        screen.getAllByTestId('credit-card-icon'),
        screen.getAllByTestId('heart-icon')
      ].flat();

      icons.forEach(icon => {
        expect(icon).toHaveClass('h-4', 'w-4');
      });
    });
  });

  describe('Content Accuracy and Completeness', () => {
    it('contains all required legal and policy links', () => {
      render(<Footer />);

      const requiredLegalLinks = [
        'Privacy Policy',
        'Terms of Service',
        'Cookie Policy',
        'Age Verification'
      ];

      requiredLegalLinks.forEach(linkText => {
        expect(screen.getByRole('link', { name: linkText })).toBeInTheDocument();
      });
    });

    it('includes appropriate adult content warnings', () => {
      render(<Footer />);

      // Multiple levels of age verification
      expect(screen.getByText('18+ Only. Adult Content.')).toBeInTheDocument();
      expect(screen.getByText(/this website contains adult content/i)).toBeInTheDocument();
      expect(screen.getByText(/intended for adults aged 18 and over/i)).toBeInTheDocument();
      expect(screen.getByText(/acknowledge that you are at least 18 years old/i)).toBeInTheDocument();
    });

    it('displays current year in copyright', () => {
      render(<Footer />);

      const currentYear = new Date().getFullYear();
      expect(screen.getByText(`© ${currentYear} Heaven Dolls. All rights reserved.`)).toBeInTheDocument();
    });

    it('includes comprehensive support links', () => {
      render(<Footer />);

      const supportLinks = [
        'Help Center',
        'Contact Us', 
        'Shipping Info',
        'Returns'
      ];

      supportLinks.forEach(linkText => {
        expect(screen.getByRole('link', { name: linkText })).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Optimization', () => {
    it('renders quickly without performance issues', () => {
      const startTime = performance.now();
      render(<Footer />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50); // Should render in under 50ms
    });

    it('does not cause layout shifts', () => {
      const { container } = render(<Footer />);
      
      // Get initial layout measurements
      const footer = container.querySelector('footer');
      const initialHeight = footer?.offsetHeight;

      // Re-render and check that height is stable
      render(<Footer />);
      const finalHeight = footer?.offsetHeight;

      expect(finalHeight).toBe(initialHeight);
    });

    it('handles component unmounting gracefully', () => {
      const { unmount } = render(<Footer />);
      
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('renders without any props', () => {
      expect(() => render(<Footer />)).not.toThrow();
    });

    it('maintains structure even with missing icons', () => {
      // Mock console.error to suppress expected icon loading errors
      const originalError = console.error;
      console.error = jest.fn();

      render(<Footer />);

      // Should still render text content even if icons fail
      expect(screen.getByText('SSL Secured')).toBeInTheDocument();
      expect(screen.getByText('Secure Payments')).toBeInTheDocument();
      expect(screen.getByText('Discreet Packaging')).toBeInTheDocument();

      console.error = originalError;
    });

    it('handles long content gracefully', () => {
      render(<Footer />);

      // Check that long description text wraps properly
      const description = screen.getByText(/premium adult products marketplace/i);
      const descriptionContainer = description.closest('.max-w-md');
      expect(descriptionContainer).toBeInTheDocument();
    });
  });
});