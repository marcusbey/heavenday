import { test, expect } from '@playwright/test';
import { HomePage } from '../utils/page-objects/home-page';
import { ProductPage } from '../utils/page-objects/product-page';
import { CartPage } from '../utils/page-objects/cart-page';
import { CheckoutPage } from '../utils/page-objects/checkout-page';

test.describe('Complete User Journey - Discovery to Purchase', () => {
  test('should complete full shopping journey as new customer', async ({ page }) => {
    // Start journey on homepage
    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForLoad();
    
    // Verify homepage elements load correctly
    await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="featured-products"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-showcase"]')).toBeVisible();
    
    // Browse featured products
    await homePage.clickFeaturedProduct(0);
    
    // Product detail page interaction
    const productPage = new ProductPage(page);
    await productPage.waitForLoad();
    
    // Verify product details are displayed
    await expect(page.locator('[data-testid="product-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="product-price"]')).toBeVisible();
    await expect(page.locator('[data-testid="product-images"]')).toBeVisible();
    
    // Test image gallery interaction
    await productPage.clickImageThumbnail(1);
    await expect(page.locator('[data-testid="main-product-image"]')).toBeVisible();
    
    // Add product to cart
    await productPage.selectVariant('Size', 'Medium');
    await productPage.selectVariant('Color', 'Pink');
    await productPage.addToCart();
    
    // Verify cart icon updates
    await expect(page.locator('[data-testid="cart-count"]')).toHaveText('1');
    
    // Continue shopping - browse categories
    await homePage.navigateToCategory('Wellness');
    
    // Filter products
    await page.locator('[data-testid="price-filter"]').selectOption('50-100');
    await page.locator('[data-testid="rating-filter"]').selectOption('4+');
    await page.waitForLoadState('networkidle');
    
    // Add second product to cart
    await page.locator('[data-testid="product-card"]').first().click();
    await productPage.waitForLoad();
    await productPage.addToCart();
    
    // Go to cart
    const cartPage = new CartPage(page);
    await cartPage.goto();
    await cartPage.waitForLoad();
    
    // Verify cart contents
    await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(2);
    
    // Update quantity
    await cartPage.updateQuantity(0, 2);
    await page.waitForLoadState('networkidle');
    
    // Verify total updates
    const total = await page.locator('[data-testid="cart-total"]').textContent();
    expect(total).toMatch(/\$\d+\.\d{2}/);
    
    // Proceed to checkout
    await cartPage.proceedToCheckout();
    
    // Checkout flow
    const checkoutPage = new CheckoutPage(page);
    await checkoutPage.waitForLoad();
    
    // Fill shipping information
    await checkoutPage.fillShippingInfo({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      address: '123 Main St',
      city: 'Anytown',
      zipCode: '12345',
      country: 'US'
    });
    
    // Verify order summary
    await expect(page.locator('[data-testid="order-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="shipping-cost"]')).toBeVisible();
    
    // Complete order (simulated)
    await checkoutPage.completeOrder();
    
    // Verify success page
    await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();
    await expect(page.locator('[data-testid="order-number"]')).toBeVisible();
  });

  test('should handle mobile user journey with touch interactions', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    
    const homePage = new HomePage(page);
    await homePage.goto();
    
    // Test mobile navigation
    await page.locator('[data-testid="mobile-menu-toggle"]').click();
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    // Test swipe gesture on product carousel
    const carousel = page.locator('[data-testid="featured-carousel"]');
    await carousel.hover();
    
    // Simulate swipe left
    await carousel.dragTo(carousel, { 
      sourcePosition: { x: 300, y: 100 },
      targetPosition: { x: 100, y: 100 }
    });
    
    // Verify carousel moved
    await expect(page.locator('[data-testid="carousel-item"].active')).not.toHaveAttribute('data-index', '0');
    
    // Test touch product interaction
    await page.locator('[data-testid="product-card"]').first().tap();
    
    const productPage = new ProductPage(page);
    await productPage.waitForLoad();
    
    // Test pinch-to-zoom simulation on product image
    const productImage = page.locator('[data-testid="main-product-image"]');
    await productImage.dblclick(); // Double tap to zoom
    
    // Test mobile cart interaction
    await productPage.addToCart();
    
    // Test mobile checkout
    await page.locator('[data-testid="cart-icon"]').click();
    await page.locator('[data-testid="checkout-button"]').click();
    
    // Verify mobile-optimized form
    await expect(page.locator('[data-testid="mobile-checkout-form"]')).toBeVisible();
  });

  test('should support keyboard navigation and accessibility', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // Navigate through header menu
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }
    
    // Press Enter on focused element
    await page.keyboard.press('Enter');
    
    // Test skip links for accessibility
    await page.keyboard.press('Tab');
    const skipLink = page.locator('[data-testid="skip-to-content"]');
    if (await skipLink.isVisible()) {
      await skipLink.click();
      await expect(page.locator('#main-content')).toBeFocused();
    }
    
    // Test ARIA labels and roles
    await expect(page.locator('[role="navigation"]')).toBeVisible();
    await expect(page.locator('[role="main"]')).toBeVisible();
    await expect(page.locator('[aria-label]')).toHaveCount.greaterThan(5);
    
    // Test form accessibility
    await page.locator('[data-testid="search-input"]').focus();
    await page.keyboard.type('wellness products');
    await page.keyboard.press('Enter');
    
    // Verify search results have proper ARIA labels
    await expect(page.locator('[aria-label*="search results"]')).toBeVisible();
  });

  test('should handle error scenarios gracefully', async ({ page }) => {
    const homePage = new HomePage(page);
    
    // Test network error simulation
    await page.route('**/api/products', route => route.abort());
    await homePage.goto();
    
    // Verify error message appears
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    
    // Test retry functionality
    await page.unroute('**/api/products');
    await page.locator('[data-testid="retry-button"]').click();
    await page.waitForLoadState('networkidle');
    
    // Verify content loads after retry
    await expect(page.locator('[data-testid="featured-products"]')).toBeVisible();
    
    // Test form validation errors
    const cartPage = new CartPage(page);
    await cartPage.goto();
    await cartPage.proceedToCheckout();
    
    const checkoutPage = new CheckoutPage(page);
    await checkoutPage.submitWithoutData();
    
    // Verify validation messages
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="address-error"]')).toBeVisible();
    
    // Test session timeout
    await page.evaluate(() => {
      localStorage.removeItem('auth-token');
      sessionStorage.clear();
    });
    
    await page.reload();
    await expect(page.locator('[data-testid="login-prompt"]')).toBeVisible();
  });

  test('should maintain cart persistence across sessions', async ({ page, context }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    
    // Add product to cart
    await page.locator('[data-testid="product-card"]').first().click();
    const productPage = new ProductPage(page);
    await productPage.addToCart();
    
    // Verify cart count
    await expect(page.locator('[data-testid="cart-count"]')).toHaveText('1');
    
    // Simulate page refresh
    await page.reload();
    
    // Verify cart persists
    await expect(page.locator('[data-testid="cart-count"]')).toHaveText('1');
    
    // Test cart persistence across new tab
    const newPage = await context.newPage();
    await newPage.goto(homePage.url);
    
    // Verify cart persists in new tab
    await expect(newPage.locator('[data-testid="cart-count"]')).toHaveText('1');
    
    await newPage.close();
  });

  test('should handle high-traffic scenarios', async ({ page }) => {
    // Simulate slow network conditions
    await page.emulateNetworkConditions({
      offline: false,
      downloadThroughput: 100 * 1024, // 100 KB/s
      uploadThroughput: 50 * 1024,    // 50 KB/s
      latency: 200                     // 200ms latency
    });
    
    const homePage = new HomePage(page);
    const startTime = Date.now();
    await homePage.goto();
    await homePage.waitForLoad();
    const loadTime = Date.now() - startTime;
    
    // Verify page loads within acceptable time even under slow conditions
    expect(loadTime).toBeLessThan(10000); // 10 seconds max
    
    // Test that critical elements are prioritized
    await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="navigation"]')).toBeVisible();
    
    // Test progressive loading
    await expect(page.locator('[data-testid="featured-products"]')).toBeVisible();
    
    // Reset network conditions
    await page.emulateNetworkConditions({
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0
    });
  });
});