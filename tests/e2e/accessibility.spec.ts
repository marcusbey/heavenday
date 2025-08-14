import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { HomePage } from '../utils/page-objects/home-page';
import { ProductPage } from '../utils/page-objects/product-page';
import { CartPage } from '../utils/page-objects/cart-page';

test.describe('Accessibility Tests', () => {
  test('should meet WCAG 2.1 AA standards on homepage', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForLoad();

    // Run axe accessibility audit
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should support complete keyboard navigation', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForLoad();

    // Test skip links
    await page.keyboard.press('Tab');
    const skipLink = page.locator('[data-testid="skip-to-content"]');
    if (await skipLink.isVisible()) {
      await expect(skipLink).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('#main-content')).toBeFocused();
    }

    // Reset focus to beginning
    await page.keyboard.press('Home');
    await page.locator('body').focus();

    // Navigate through header elements
    const headerElements = [
      '[data-testid="logo"]',
      '[data-testid="nav-home"]',
      '[data-testid="nav-products"]',
      '[data-testid="nav-categories"]',
      '[data-testid="search-input"]',
      '[data-testid="cart-icon"]',
      '[data-testid="wishlist-icon"]'
    ];

    for (const selector of headerElements) {
      await page.keyboard.press('Tab');
      const element = page.locator(selector);
      if (await element.isVisible()) {
        await expect(element).toBeFocused();
      }
    }

    // Test dropdown menu navigation
    const categoriesNav = page.locator('[data-testid="nav-categories"]');
    if (await categoriesNav.isVisible()) {
      await categoriesNav.focus();
      await page.keyboard.press('Enter');
      
      const dropdown = page.locator('[data-testid="categories-dropdown"]');
      if (await dropdown.isVisible()) {
        await page.keyboard.press('ArrowDown');
        await expect(page.locator('[data-testid="category-item"]:first-child')).toBeFocused();
      }
      
      // Close dropdown with Escape
      await page.keyboard.press('Escape');
      await expect(dropdown).toBeHidden();
    }

    // Test main content navigation
    await page.keyboard.press('Tab');
    const featuredProduct = page.locator('[data-testid="product-card"]').first();
    await featuredProduct.scrollIntoViewIfNeeded();
    
    // Navigate through product cards
    for (let i = 0; i < 3; i++) {
      const productCard = page.locator('[data-testid="product-card"]').nth(i);
      if (await productCard.isVisible()) {
        await productCard.focus();
        await expect(productCard).toBeFocused();
        await page.keyboard.press('Tab');
      }
    }
  });

  test('should provide proper ARIA labels and roles', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForLoad();

    // Test landmark roles
    await expect(page.locator('[role="banner"]')).toBeVisible(); // Header
    await expect(page.locator('[role="navigation"]')).toBeVisible(); // Nav
    await expect(page.locator('[role="main"]')).toBeVisible(); // Main content
    await expect(page.locator('[role="contentinfo"]')).toBeVisible(); // Footer

    // Test search functionality ARIA
    const searchInput = page.locator('[data-testid="search-input"]');
    await expect(searchInput).toHaveAttribute('aria-label', /search/i);
    await expect(searchInput).toHaveAttribute('role', 'searchbox');

    // Test product cards ARIA
    const productCards = page.locator('[data-testid="product-card"]');
    const firstCard = productCards.first();
    await expect(firstCard).toHaveAttribute('role', 'article');
    await expect(firstCard).toHaveAttribute('aria-label', /.+/);

    // Test interactive elements
    const addToCartButtons = page.locator('[data-testid="quick-add-to-cart"]');
    if (await addToCartButtons.count() > 0) {
      const firstButton = addToCartButtons.first();
      await expect(firstButton).toHaveAttribute('aria-label', /add .+ to cart/i);
    }

    // Test cart icon
    const cartIcon = page.locator('[data-testid="cart-icon"]');
    await expect(cartIcon).toHaveAttribute('aria-label', /shopping cart/i);
    
    const cartCount = page.locator('[data-testid="cart-count"]');
    if (await cartCount.isVisible()) {
      await expect(cartCount).toHaveAttribute('aria-live', 'polite');
    }

    // Test heading hierarchy
    const h1 = page.locator('h1');
    expect(await h1.count()).toBeGreaterThanOrEqual(1);
    
    const h2s = page.locator('h2');
    const h3s = page.locator('h3');
    
    // Verify logical heading order exists
    expect(await h2s.count()).toBeGreaterThan(0);
  });

  test('should support screen reader navigation on product page', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForLoad();

    // Navigate to product page
    await page.locator('[data-testid="product-card"]').first().click();
    
    const productPage = new ProductPage(page);
    await productPage.waitForLoad();

    // Run accessibility scan on product page
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);

    // Test product image alt text
    const mainImage = page.locator('[data-testid="main-product-image"]');
    await expect(mainImage).toHaveAttribute('alt', /.+/);

    // Test product thumbnails
    const thumbnails = page.locator('[data-testid="image-thumbnail"]');
    const thumbnailCount = await thumbnails.count();
    
    for (let i = 0; i < Math.min(thumbnailCount, 3); i++) {
      const thumbnail = thumbnails.nth(i);
      await expect(thumbnail).toHaveAttribute('alt', /.+/);
    }

    // Test product information structure
    await expect(page.locator('[data-testid="product-title"]')).toHaveRole('heading');
    await expect(page.locator('[data-testid="product-price"]')).toHaveAttribute('aria-label', /price/i);

    // Test variant selection accessibility
    const sizeSelector = page.locator('[data-testid="variant-size"]');
    if (await sizeSelector.isVisible()) {
      await expect(sizeSelector).toHaveAttribute('aria-label', /select size/i);
      await expect(sizeSelector).toHaveRole('combobox');
    }

    // Test add to cart button
    const addToCartButton = page.locator('[data-testid="add-to-cart"]');
    await expect(addToCartButton).toHaveAttribute('aria-label', /.+/);
    
    // Test quantity selector
    const quantityInput = page.locator('[data-testid="quantity-selector"]');
    if (await quantityInput.isVisible()) {
      await expect(quantityInput).toHaveAttribute('aria-label', /quantity/i);
      await expect(quantityInput).toHaveRole('spinbutton');
      await expect(quantityInput).toHaveAttribute('aria-valuemin');
      await expect(quantityInput).toHaveAttribute('aria-valuemax');
    }

    // Test reviews section
    const reviewsSection = page.locator('[data-testid="reviews-section"]');
    if (await reviewsSection.isVisible()) {
      await expect(reviewsSection).toHaveRole('region');
      await expect(reviewsSection).toHaveAttribute('aria-label', /reviews/i);
      
      // Test individual reviews
      const reviews = page.locator('[data-testid="review-item"]');
      if (await reviews.count() > 0) {
        const firstReview = reviews.first();
        await expect(firstReview).toHaveRole('article');
        
        const rating = firstReview.locator('[data-testid="review-rating"]');
        if (await rating.isVisible()) {
          await expect(rating).toHaveAttribute('aria-label', /rating/i);
        }
      }
    }
  });

  test('should support screen reader on cart and checkout', async ({ page }) => {
    // Add product to cart first
    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForLoad();
    
    await page.locator('[data-testid="product-card"]').first().click();
    const productPage = new ProductPage(page);
    await productPage.addToCart();

    // Navigate to cart
    const cartPage = new CartPage(page);
    await cartPage.goto();
    await cartPage.waitForLoad();

    // Run accessibility scan on cart page
    const cartScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(cartScanResults.violations).toEqual([]);

    // Test cart item structure
    const cartItems = page.locator('[data-testid="cart-item"]');
    if (await cartItems.count() > 0) {
      const firstItem = cartItems.first();
      await expect(firstItem).toHaveRole('listitem');
      
      // Test quantity controls
      const quantityInput = firstItem.locator('[data-testid="quantity-input"]');
      await expect(quantityInput).toHaveAttribute('aria-label', /quantity/i);
      
      const increaseButton = firstItem.locator('[data-testid="quantity-increase"]');
      const decreaseButton = firstItem.locator('[data-testid="quantity-decrease"]');
      
      if (await increaseButton.isVisible()) {
        await expect(increaseButton).toHaveAttribute('aria-label', /increase quantity/i);
      }
      if (await decreaseButton.isVisible()) {
        await expect(decreaseButton).toHaveAttribute('aria-label', /decrease quantity/i);
      }
      
      // Test remove button
      const removeButton = firstItem.locator('[data-testid="remove-item"]');
      if (await removeButton.isVisible()) {
        await expect(removeButton).toHaveAttribute('aria-label', /remove .+ from cart/i);
      }
    }

    // Test cart totals
    const cartTotal = page.locator('[data-testid="cart-total"]');
    await expect(cartTotal).toHaveAttribute('aria-label', /total/i);

    // Test checkout button
    const checkoutButton = page.locator('[data-testid="checkout-button"]');
    await expect(checkoutButton).toHaveAttribute('aria-label', /proceed to checkout/i);

    // Navigate to checkout
    await checkoutButton.click();
    await page.waitForLoadState('networkidle');

    // Run accessibility scan on checkout page
    const checkoutScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(checkoutScanResults.violations).toEqual([]);

    // Test form accessibility
    const shippingForm = page.locator('[data-testid="shipping-form"]');
    if (await shippingForm.isVisible()) {
      // Test form labels
      const formFields = [
        'first-name',
        'last-name', 
        'email',
        'address',
        'city',
        'zip-code'
      ];

      for (const field of formFields) {
        const input = page.locator(`[data-testid="${field}"]`);
        if (await input.isVisible()) {
          const label = page.locator(`label[for="${field}"], [data-testid="${field}-label"]`);
          await expect(label).toBeVisible();
        }
      }

      // Test required field indicators
      const requiredFields = page.locator('[required], [aria-required="true"]');
      const requiredCount = await requiredFields.count();
      expect(requiredCount).toBeGreaterThan(0);
    }

    // Test error message accessibility
    const firstNameInput = page.locator('[data-testid="first-name"]');
    if (await firstNameInput.isVisible()) {
      // Trigger validation error
      await firstNameInput.focus();
      await firstNameInput.blur();
      
      const errorMessage = page.locator('[data-testid="first-name-error"]');
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toHaveAttribute('role', 'alert');
        await expect(firstNameInput).toHaveAttribute('aria-describedby', /error/i);
      }
    }
  });

  test('should handle focus management in modals and overlays', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForLoad();

    // Test search modal focus
    const searchToggle = page.locator('[data-testid="search-toggle"]');
    if (await searchToggle.isVisible()) {
      await searchToggle.click();
      
      const searchModal = page.locator('[data-testid="search-modal"]');
      const searchInput = page.locator('[data-testid="search-modal-input"]');
      
      if (await searchModal.isVisible()) {
        // Focus should move to search input
        await expect(searchInput).toBeFocused();
        
        // Test Escape key closes modal
        await page.keyboard.press('Escape');
        await expect(searchModal).toBeHidden();
        
        // Focus should return to trigger
        await expect(searchToggle).toBeFocused();
      }
    }

    // Test mobile menu focus management
    await page.setViewportSize({ width: 375, height: 812 });
    const mobileMenuToggle = page.locator('[data-testid="mobile-menu-toggle"]');
    
    if (await mobileMenuToggle.isVisible()) {
      await mobileMenuToggle.click();
      
      const mobileMenu = page.locator('[data-testid="mobile-menu"]');
      if (await mobileMenu.isVisible()) {
        // Focus should be trapped within menu
        const firstMenuItem = mobileMenu.locator('a, button').first();
        await expect(firstMenuItem).toBeFocused();
        
        // Test Tab navigation within menu
        await page.keyboard.press('Tab');
        const secondMenuItem = mobileMenu.locator('a, button').nth(1);
        if (await secondMenuItem.isVisible()) {
          await expect(secondMenuItem).toBeFocused();
        }
        
        // Close menu and verify focus return
        await page.keyboard.press('Escape');
        await expect(mobileMenu).toBeHidden();
        await expect(mobileMenuToggle).toBeFocused();
      }
    }

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // Test product quick view modal (if available)
    const productCard = page.locator('[data-testid="product-card"]').first();
    const quickViewButton = productCard.locator('[data-testid="quick-view"]');
    
    if (await quickViewButton.isVisible()) {
      await quickViewButton.click();
      
      const quickViewModal = page.locator('[data-testid="quick-view-modal"]');
      if (await quickViewModal.isVisible()) {
        // Test focus trap in modal
        const modalTitle = quickViewModal.locator('h2, [role="heading"]').first();
        await expect(modalTitle).toBeFocused();
        
        // Test Tab cycling within modal
        const modalElements = await quickViewModal.locator('button, input, select, a, [tabindex="0"]').all();
        
        if (modalElements.length > 1) {
          for (let i = 0; i < Math.min(modalElements.length, 3); i++) {
            await page.keyboard.press('Tab');
          }
          
          // Should cycle back to first element
          await page.keyboard.press('Tab');
        }
        
        // Close modal
        const closeButton = quickViewModal.locator('[data-testid="close-modal"], [aria-label*="close"]');
        if (await closeButton.isVisible()) {
          await closeButton.click();
        } else {
          await page.keyboard.press('Escape');
        }
        
        await expect(quickViewModal).toBeHidden();
        await expect(quickViewButton).toBeFocused();
      }
    }
  });

  test('should provide proper color contrast and visual accessibility', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForLoad();

    // Test high contrast mode simulation
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(500);

    // Verify dark mode styles exist
    const body = page.locator('body');
    const bodyStyles = await body.evaluate(el => window.getComputedStyle(el));
    
    // Basic check that styles change in dark mode
    expect(bodyStyles.backgroundColor).not.toBe('rgb(255, 255, 255)');

    // Reset to light mode
    await page.emulateMedia({ colorScheme: 'light' });

    // Test reduced motion preferences
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    // Check that animations are disabled/reduced
    const animatedElements = page.locator('[data-testid*="animated"], .animate-');
    if (await animatedElements.count() > 0) {
      const firstAnimated = animatedElements.first();
      const styles = await firstAnimated.evaluate(el => window.getComputedStyle(el));
      
      // Should have reduced or no animations
      expect(
        styles.animationDuration === '0s' ||
        styles.animationDelay === '0s' ||
        styles.transitionDuration === '0s'
      ).toBeTruthy();
    }

    // Test focus indicators
    const focusableElements = page.locator('button, a, input, select, [tabindex]:not([tabindex="-1"])');
    const firstFocusable = focusableElements.first();
    
    await firstFocusable.focus();
    const focusStyles = await firstFocusable.evaluate(el => window.getComputedStyle(el));
    
    // Should have visible focus indicator
    expect(
      focusStyles.outline !== 'none' ||
      focusStyles.boxShadow !== 'none' ||
      focusStyles.borderColor !== 'transparent'
    ).toBeTruthy();

    // Test text scaling compatibility
    await page.addStyleTag({
      content: `
        * {
          font-size: 200% !important;
        }
      `
    });

    await page.waitForTimeout(500);

    // Verify layout doesn't break with larger text
    const header = page.locator('[data-testid="header"]');
    const headerBox = await header.boundingBox();
    expect(headerBox?.height).toBeGreaterThan(50); // Should accommodate larger text

    // Verify text doesn't overlap
    const productTitle = page.locator('[data-testid="product-card"] h3').first();
    if (await productTitle.isVisible()) {
      const titleBox = await productTitle.boundingBox();
      expect(titleBox?.height).toBeGreaterThan(20); // Should have adequate height
    }
  });
});