import { test, expect } from '@playwright/test';
import { HomePage } from '../page-objects/homepage';
import { ProductPage } from '../page-objects/product-page';
import { CartPage } from '../page-objects/cart-page';
import { AuthPage } from '../page-objects/auth-page';
import { SearchPage } from '../page-objects/search-page';

test.describe('Complete Purchase Flow - End-to-End User Journeys', () => {
  let homePage: HomePage;
  let productPage: ProductPage;
  let cartPage: CartPage;
  let authPage: AuthPage;
  let searchPage: SearchPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    productPage = new ProductPage(page);
    cartPage = new CartPage(page);
    authPage = new AuthPage(page);
    searchPage = new SearchPage(page);
  });

  test.describe('New Visitor Complete Journey', () => {
    test('new visitor discovers product through homepage and completes purchase', async ({ page }) => {
      // Step 1: Visitor lands on homepage
      await homePage.navigate();
      await homePage.verifyPageLoaded();
      await homePage.verifyHeaderElements();
      await homePage.verifyHeroSection();
      
      // Step 2: Browse featured products
      await homePage.verifyFeaturedProducts();
      
      // Step 3: Click on a featured product
      await homePage.clickFirstProduct();
      await productPage.verifyPageLoaded();
      await productPage.verifyProductDetails();
      
      // Step 4: Add product to cart
      await productPage.addToCart(2);
      
      // Step 5: Continue shopping and add another product
      await homePage.navigate();
      await homePage.navigateToCategory('wellness');
      await page.locator('[data-testid="product-card"]').nth(1).click();
      await productPage.verifyPageLoaded();
      await productPage.addToCart(1);
      
      // Step 6: View cart
      await cartPage.openCartDrawer();
      await cartPage.verifyCartHasItems();
      await cartPage.navigateToFullCart();
      
      // Step 7: Update quantities and verify totals
      await cartPage.verifyCartTotals();
      await cartPage.updateItemQuantity(0, 1);
      
      // Step 8: Proceed to checkout (as guest)
      await cartPage.proceedToCheckout();
      
      // Should redirect to login or checkout
      await expect(page).toHaveURL(/.*\/(checkout|auth\/login)/);
      
      // If redirected to login, create account
      if (page.url().includes('/auth/login')) {
        await authPage.navigateToRegistrationFromLogin();
        await authPage.register(
          'John Doe',
          'john.doe@example.com',
          'SecurePass123!',
          'SecurePass123!'
        );
        await authPage.verifySuccessfulRegistration();
      }
    });
    
    test('new visitor uses search to find specific product', async ({ page }) => {
      // Step 1: Visitor lands on homepage
      await homePage.navigate();
      await homePage.verifyPageLoaded();
      
      // Step 2: Use search functionality
      await homePage.performSearch('wellness doll');
      await searchPage.verifyPageLoaded();
      await searchPage.verifySearchResults();
      
      // Step 3: Apply filters to narrow results
      await searchPage.applyPriceFilter(50, 200);
      await searchPage.applyCategoryFilter('Wellness');
      
      // Step 4: Sort results by price
      await searchPage.changeSortOrder('price');
      
      // Step 5: Select product from filtered results
      await searchPage.clickProduct(0);
      await productPage.verifyPageLoaded();
      
      // Step 6: Review product details and specifications
      await productPage.switchToTab('specifications');
      await productPage.verifySpecifications();
      await productPage.switchToTab('reviews');
      
      // Step 7: Add to cart and checkout
      await productPage.addToCart(1);
      await cartPage.openCartDrawer();
      await cartPage.proceedToCheckout();
    });
    
    test('new visitor explores categories and discovers trending products', async ({ page }) => {
      // Step 1: Visitor lands on homepage
      await homePage.navigate();
      await homePage.verifyPageLoaded();
      
      // Step 2: Explore category showcase
      await homePage.verifyCategoriesShowcase();
      await homePage.navigateToCategory('trending');
      
      // Step 3: Browse category products
      await page.waitForURL(/.*\/categories\/trending/);
      await expect(page.locator('[data-testid="product-card"]')).toHaveCount.greaterThan(0);
      
      // Step 4: View trending indicators
      await homePage.verifyTrendingIndicators();
      
      // Step 5: Select trending product
      await page.locator('[data-testid="product-card"]').first().click();
      await productPage.verifyPageLoaded();
      
      // Step 6: Check product variations
      if (await productPage.isElementVisible(productPage.variantSelector)) {
        await productPage.selectVariant('Premium');
      }
      
      // Step 7: Add to wishlist before purchasing
      await productPage.addToWishlist();
      
      // Step 8: Add to cart and proceed
      await productPage.addToCart(1);
      await cartPage.openCartDrawer();
      await cartPage.proceedToCheckout();
    });
  });

  test.describe('Returning Customer Journey', () => {
    test('returning customer login and quick purchase', async ({ page }) => {
      // Step 1: Customer visits site and logs in
      await authPage.navigateToLogin();
      await authPage.verifyLoginPageLoaded();
      await authPage.login('test@example.com', 'Test123456!', true);
      await authPage.verifySuccessfulLogin();
      
      // Step 2: Navigate to products
      await homePage.navigate();
      await homePage.verifyPageLoaded();
      
      // Step 3: Quick add to cart from product cards
      const productCards = page.locator('[data-testid="product-card"]');
      await productCards.first().getByRole('button', { name: /add to cart/i }).click();
      
      // Step 4: Verify cart count updated
      const cartCount = await homePage.getCartItemCount();
      expect(cartCount).toContain('1');
      
      // Step 5: Add second product
      await productCards.nth(1).getByRole('button', { name: /add to cart/i }).click();
      
      // Step 6: Quick checkout
      await cartPage.openCartDrawer();
      await cartPage.verifyCartHasItems();
      await cartPage.proceedToCheckout();
      
      // Should proceed directly to checkout (user already logged in)
      await expect(page).toHaveURL(/.*\/checkout/);
    });
    
    test('returning customer with saved cart items', async ({ page }) => {
      // Step 1: Login first
      await authPage.navigateToLogin();
      await authPage.login('test@example.com', 'Test123456!');
      await authPage.verifySuccessfulLogin();
      
      // Step 2: Add items to cart
      await homePage.navigate();
      await homePage.clickFirstProduct();
      await productPage.addToCart(1);
      
      // Step 3: Logout and login again
      await page.getByRole('button', { name: /user menu|profile/i }).click();
      await page.getByRole('menuitem', { name: /logout|sign out/i }).click();
      
      // Step 4: Login again
      await authPage.navigateToLogin();
      await authPage.login('test@example.com', 'Test123456!');
      
      // Step 5: Verify cart persistence
      await cartPage.verifyCartPersistence();
      const cartCount = await homePage.getCartItemCount();
      expect(cartCount).toContain('1');
    });
  });

  test.describe('Mobile User Journey', () => {
    test('mobile user complete purchase flow', async ({ page }) => {
      // Simulate mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Step 1: Mobile user lands on homepage
      await homePage.navigate();
      await homePage.verifyPageLoaded();
      
      // Step 2: Open mobile menu
      await homePage.openMobileMenu();
      await homePage.verifyMobileMenuNavigation();
      
      // Step 3: Navigate using mobile menu
      const mobileMenu = page.getByTestId('mobile-menu');
      await mobileMenu.getByRole('link', { name: 'Shop' }).click();
      
      // Step 4: Browse products in mobile view
      await expect(page.locator('[data-testid="product-card"]')).toHaveCount.greaterThan(0);
      
      // Step 5: Use mobile search
      await searchPage.testMobileSearch('wellness');
      await searchPage.verifySearchResults();
      
      // Step 6: Open mobile filters
      await searchPage.openMobileFilters();
      await searchPage.applyPriceFilter(50, 150);
      await searchPage.closeMobileFilters();
      
      // Step 7: Select product
      await searchPage.clickProduct(0);
      await productPage.verifyPageLoaded();
      
      // Step 8: Mobile product interaction
      await productPage.navigateImageGallery();
      await productPage.addToCart(1);
      
      // Step 9: Mobile cart interaction
      await cartPage.openCartDrawer();
      await cartPage.verifyCartHasItems();
      await cartPage.proceedToCheckout();
    });
    
    test('mobile user with touch interactions', async ({ page }) => {
      // Simulate mobile device
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Step 1: Navigate to homepage
      await homePage.navigate();
      await homePage.verifyPageLoaded();
      
      // Step 2: Test touch interactions
      const firstProduct = page.locator('[data-testid="product-card"]').first();
      
      // Touch and hold for context menu (if implemented)
      await firstProduct.dispatchEvent('touchstart');
      await page.waitForTimeout(500);
      await firstProduct.dispatchEvent('touchend');
      
      // Step 3: Swipe interactions (if carousel is present)
      const carousel = page.locator('[data-testid="product-carousel"]');
      if (await carousel.isVisible()) {
        // Simulate swipe left
        await carousel.dispatchEvent('touchstart', {
          touches: [{ clientX: 200, clientY: 100 }]
        });
        await carousel.dispatchEvent('touchmove', {
          touches: [{ clientX: 100, clientY: 100 }]
        });
        await carousel.dispatchEvent('touchend');
      }
      
      // Step 4: Test mobile product page
      await firstProduct.click();
      await productPage.verifyPageLoaded();
      
      // Step 5: Mobile image gallery
      await productPage.navigateImageGallery();
      
      // Step 6: Mobile quantity controls
      await productPage.increaseQuantity();
      await productPage.addToCart();
    });
  });

  test.describe('Accessibility User Journey', () => {
    test('keyboard navigation complete flow', async ({ page }) => {
      // Step 1: Navigate to homepage using keyboard
      await homePage.navigate();
      await homePage.verifyPageLoaded();
      
      // Step 2: Test keyboard navigation
      await page.keyboard.press('Tab'); // Focus first interactive element
      await page.keyboard.press('Tab'); // Navigate to next element
      await page.keyboard.press('Enter'); // Activate element
      
      // Step 3: Navigate to product using keyboard
      const firstProductLink = page.locator('[data-testid="product-card"] a').first();
      await firstProductLink.focus();
      await page.keyboard.press('Enter');
      
      // Step 4: Product page keyboard interaction
      await productPage.verifyPageLoaded();
      await page.keyboard.press('Tab'); // Navigate through product elements
      
      // Step 5: Add to cart using keyboard
      await productPage.addToCartButton.focus();
      await page.keyboard.press('Enter');
      
      // Step 6: Cart keyboard navigation
      await page.keyboard.press('Tab'); // Find cart button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter'); // Open cart
      
      // Step 7: Checkout keyboard navigation
      const checkoutButton = cartPage.cartDrawer.getByRole('button', { name: /checkout/i });
      await checkoutButton.focus();
      await page.keyboard.press('Enter');
    });
    
    test('screen reader compatibility', async ({ page }) => {
      // Step 1: Navigate to homepage
      await homePage.navigate();
      await homePage.verifyPageLoaded();
      
      // Step 2: Verify ARIA labels and roles
      await expect(page.getByRole('banner')).toBeVisible();
      await expect(page.getByRole('navigation')).toBeVisible();
      await expect(page.getByRole('main')).toBeVisible();
      await expect(page.getByRole('contentinfo')).toBeVisible();
      
      // Step 3: Check product cards have proper labels
      const productCards = page.locator('[data-testid="product-card"]');
      const firstCard = productCards.first();
      
      await expect(firstCard.getByRole('img')).toHaveAttribute('alt');
      await expect(firstCard.getByRole('heading')).toBeVisible();
      
      // Step 4: Test form accessibility
      await page.goto('/auth/login');
      await expect(authPage.emailInput).toHaveAttribute('aria-label');
      await expect(authPage.passwordInput).toHaveAttribute('aria-label');
      
      // Step 5: Test cart accessibility
      await homePage.navigate();
      await homePage.clickFirstProduct();
      await productPage.addToCart(1);
      await cartPage.openCartDrawer();
      
      await expect(cartPage.cartDrawer).toHaveAttribute('role', 'dialog');
      await expect(cartPage.cartDrawer).toHaveAttribute('aria-labelledby');
    });
  });

  test.describe('International User Journey', () => {
    test('international user with currency and shipping', async ({ page }) => {
      // Step 1: Simulate international location
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'language', {
          get: () => 'fr-FR',
          configurable: true
        });
      });
      
      // Step 2: Navigate to homepage
      await homePage.navigate();
      await homePage.verifyPageLoaded();
      
      // Step 3: Check for currency/region selector
      const currencySelector = page.getByRole('button', { name: /currency|region/i });
      if (await currencySelector.isVisible()) {
        await currencySelector.click();
        await page.getByText('EUR').click();
      }
      
      // Step 4: Browse products with international pricing
      await homePage.clickFirstProduct();
      await productPage.verifyPageLoaded();
      
      // Step 5: Add to cart and check international shipping
      await productPage.addToCart(1);
      await cartPage.openCartDrawer();
      await cartPage.navigateToFullCart();
      
      // Step 6: Verify shipping options for international
      await cartPage.selectShippingOption('express');
      await cartPage.verifyShippingCalculation();
      
      // Step 7: Proceed to checkout
      await cartPage.proceedToCheckout();
    });
  });

  test.describe('Customer Support Journey', () => {
    test('customer support inquiry workflow', async ({ page }) => {
      // Step 1: Customer needs help during shopping
      await homePage.navigate();
      await homePage.verifyPageLoaded();
      
      // Step 2: Access customer support
      const supportLink = page.getByRole('link', { name: /help|support|contact/i });
      if (await supportLink.isVisible()) {
        await supportLink.click();
        
        // Step 3: Fill out support form
        await page.getByLabel(/name/i).fill('John Customer');
        await page.getByLabel(/email/i).fill('john@customer.com');
        await page.getByLabel(/subject/i).fill('Product inquiry');
        await page.getByLabel(/message/i).fill('I need help choosing the right product.');
        
        // Step 4: Submit inquiry
        await page.getByRole('button', { name: /send|submit/i }).click();
        
        // Step 5: Verify confirmation
        await expect(page.getByText(/thank you|we\'ll get back/i)).toBeVisible();
      }
      
      // Step 6: Continue shopping after support interaction
      await homePage.navigate();
      await homePage.clickFirstProduct();
      await productPage.addToCart(1);
    });
    
    test('live chat support workflow', async ({ page }) => {
      // Step 1: Navigate to product page
      await homePage.navigate();
      await homePage.clickFirstProduct();
      await productPage.verifyPageLoaded();
      
      // Step 2: Initiate live chat (if available)
      const chatWidget = page.locator('[data-testid="chat-widget"]');
      if (await chatWidget.isVisible()) {
        await chatWidget.click();
        
        // Step 3: Start chat conversation
        const chatInput = page.locator('[data-testid="chat-input"]');
        await chatInput.fill('I have questions about this product');
        await page.getByRole('button', { name: /send/i }).click();
        
        // Step 4: Verify chat response
        await expect(page.locator('[data-testid="chat-message"]')).toBeVisible();
      }
      
      // Step 5: Complete purchase after support
      await productPage.addToCart(1);
      await cartPage.openCartDrawer();
      await cartPage.proceedToCheckout();
    });
  });

  test.describe('Error Recovery Journey', () => {
    test('network error during checkout recovery', async ({ page }) => {
      // Step 1: Normal shopping flow
      await homePage.navigate();
      await homePage.clickFirstProduct();
      await productPage.addToCart(1);
      await cartPage.openCartDrawer();
      
      // Step 2: Proceed to checkout
      await cartPage.proceedToCheckout();
      
      // Step 3: Simulate network error during checkout
      await page.route('**/api/checkout**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Network error' })
        });
      });
      
      // Step 4: Attempt checkout
      if (page.url().includes('/auth/login')) {
        await authPage.login('test@example.com', 'Test123456!');
      }
      
      // Step 5: Verify error handling
      await expect(page.getByText(/error|something went wrong/i)).toBeVisible();
      
      // Step 6: Retry after error
      await page.unroute('**/api/checkout**');
      await page.getByRole('button', { name: /retry|try again/i }).click();
    });
  });
});
