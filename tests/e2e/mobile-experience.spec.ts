import { test, expect } from '@playwright/test';
import { HomePage } from '../utils/page-objects/home-page';
import { ProductPage } from '../utils/page-objects/product-page';
import { CartPage } from '../utils/page-objects/cart-page';

test.describe('Mobile Experience Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
  });

  test('should provide seamless mobile shopping experience', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForLoad();

    // Test mobile navigation
    await page.locator('[data-testid="mobile-menu-toggle"]').click();
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    // Test menu items are accessible
    await expect(page.locator('[data-testid="mobile-menu"] a')).toHaveCount.greaterThan(3);
    
    // Close menu by tapping outside
    await page.locator('[data-testid="mobile-menu-overlay"]').click();
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeHidden();

    // Test search on mobile
    await page.locator('[data-testid="search-toggle"]').click();
    await expect(page.locator('[data-testid="mobile-search"]')).toBeVisible();
    
    await page.locator('[data-testid="mobile-search-input"]').fill('wellness');
    await page.locator('[data-testid="mobile-search-submit"]').click();
    await page.waitForLoadState('networkidle');

    // Test product card interactions on mobile
    const productCard = page.locator('[data-testid="product-card"]').first();
    await productCard.click();

    const productPage = new ProductPage(page);
    await productPage.waitForLoad();

    // Test mobile image gallery
    await expect(page.locator('[data-testid="mobile-image-gallery"]')).toBeVisible();
    
    // Test swipe gesture on images
    const imageContainer = page.locator('[data-testid="product-images"]');
    await imageContainer.dragTo(imageContainer, {
      sourcePosition: { x: 300, y: 200 },
      targetPosition: { x: 100, y: 200 }
    });

    // Test mobile product options
    await page.locator('[data-testid="mobile-options-toggle"]').click();
    await expect(page.locator('[data-testid="mobile-options-panel"]')).toBeVisible();

    // Add to cart on mobile
    await productPage.addToCart();
    
    // Test mobile cart icon update
    await expect(page.locator('[data-testid="mobile-cart-count"]')).toHaveText('1');

    // Test mobile cart page
    await page.locator('[data-testid="mobile-cart-icon"]').click();
    
    const cartPage = new CartPage(page);
    await cartPage.waitForLoad();

    // Test mobile cart interactions
    await expect(page.locator('[data-testid="mobile-cart-item"]')).toBeVisible();
    
    // Test quantity update on mobile
    await page.locator('[data-testid="mobile-quantity-plus"]').click();
    await page.waitForLoadState('networkidle');
    
    // Test mobile checkout button
    await expect(page.locator('[data-testid="mobile-checkout-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-checkout-button"]')).toBeEnabled();
  });

  test('should handle touch gestures and interactions', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForLoad();

    // Test pull-to-refresh gesture
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    
    const startY = 100;
    const endY = 300;
    
    await page.mouse.move(page.viewportSize()!.width / 2, startY);
    await page.mouse.down();
    await page.mouse.move(page.viewportSize()!.width / 2, endY);
    await page.mouse.up();

    // Test horizontal swipe on product carousel
    const carousel = page.locator('[data-testid="featured-carousel"]');
    if (await carousel.isVisible()) {
      const carouselBox = await carousel.boundingBox();
      if (carouselBox) {
        await page.mouse.move(carouselBox.x + carouselBox.width - 50, carouselBox.y + carouselBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(carouselBox.x + 50, carouselBox.y + carouselBox.height / 2);
        await page.mouse.up();
      }
    }

    // Test long press context menu
    await page.locator('[data-testid="product-card"]').first().hover();
    await page.mouse.down();
    await page.waitForTimeout(1000); // Long press
    await page.mouse.up();

    // Test pinch zoom simulation (double tap)
    const productCard = page.locator('[data-testid="product-card"]').first();
    await productCard.dblclick();

    // Navigate to product page for image gestures
    await productCard.click();
    
    const productPage = new ProductPage(page);
    await productPage.waitForLoad();

    // Test image zoom with double tap
    const mainImage = page.locator('[data-testid="main-product-image"]');
    await mainImage.dblclick();
    
    // Test image pan after zoom
    if (await page.locator('[data-testid="zoomed-image"]').isVisible()) {
      const imageBox = await mainImage.boundingBox();
      if (imageBox) {
        await page.mouse.move(imageBox.x + imageBox.width / 2, imageBox.y + imageBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(imageBox.x + 100, imageBox.y + 50);
        await page.mouse.up();
      }
    }
  });

  test('should support mobile-specific features', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForLoad();

    // Test device orientation changes
    await page.setViewportSize({ width: 812, height: 375 }); // Landscape
    await page.waitForTimeout(500);
    
    // Verify layout adapts to landscape
    await expect(page.locator('[data-testid="landscape-layout"]')).toBeVisible();
    
    // Switch back to portrait
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);

    // Test scroll behavior on mobile
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    // Test back-to-top button appears
    await expect(page.locator('[data-testid="back-to-top"]')).toBeVisible();
    
    await page.locator('[data-testid="back-to-top"]').click();
    await page.waitForTimeout(500);
    
    // Verify scrolled to top
    const scrollPosition = await page.evaluate(() => window.pageYOffset);
    expect(scrollPosition).toBe(0);

    // Test mobile sticky header
    await page.evaluate(() => {
      window.scrollTo(0, 500);
    });
    
    await expect(page.locator('[data-testid="mobile-sticky-header"]')).toBeVisible();

    // Test mobile bottom navigation
    if (await page.locator('[data-testid="mobile-bottom-nav"]').isVisible()) {
      await page.locator('[data-testid="bottom-nav-home"]').click();
      await expect(page).toHaveURL(/\//);
      
      await page.locator('[data-testid="bottom-nav-search"]').click();
      await expect(page.locator('[data-testid="search-page"]')).toBeVisible();
      
      await page.locator('[data-testid="bottom-nav-cart"]').click();
      await expect(page).toHaveURL(/\/cart/);
    }

    // Test mobile-specific animations
    await homePage.goto();
    await page.locator('[data-testid="mobile-menu-toggle"]').click();
    
    // Verify menu slides in from side
    const menu = page.locator('[data-testid="mobile-menu"]');
    await expect(menu).toHaveCSS('transform', /translateX/);
  });

  test('should handle mobile form interactions', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForLoad();

    // Navigate to a form (newsletter signup)
    await page.locator('[data-testid="newsletter-signup"]').scrollIntoViewIfNeeded();
    
    // Test mobile keyboard handling
    const emailInput = page.locator('[data-testid="newsletter-email"]');
    await emailInput.click();
    
    // Verify keyboard appears (viewport shrinks)
    await emailInput.fill('test@example.com');
    
    // Test input field stays in view
    const inputBox = await emailInput.boundingBox();
    expect(inputBox?.y).toBeLessThan(page.viewportSize()!.height);

    // Test form submission on mobile
    await page.locator('[data-testid="newsletter-submit"]').click();
    
    // Add product and go to checkout for more form testing
    await page.locator('[data-testid="product-card"]').first().click();
    
    const productPage = new ProductPage(page);
    await productPage.addToCart();
    
    await page.locator('[data-testid="mobile-cart-icon"]').click();
    await page.locator('[data-testid="checkout-button"]').click();

    // Test mobile checkout form
    const firstNameInput = page.locator('[data-testid="first-name"]');
    await firstNameInput.click();
    await firstNameInput.fill('John');
    
    // Test autofill suggestions on mobile
    const lastNameInput = page.locator('[data-testid="last-name"]');
    await lastNameInput.click();
    await lastNameInput.fill('Doe');
    
    // Test mobile-optimized input types
    const emailField = page.locator('[data-testid="email"]');
    await expect(emailField).toHaveAttribute('type', 'email');
    await expect(emailField).toHaveAttribute('inputmode', 'email');
    
    const phoneField = page.locator('[data-testid="phone"]');
    if (await phoneField.isVisible()) {
      await expect(phoneField).toHaveAttribute('type', 'tel');
      await expect(phoneField).toHaveAttribute('inputmode', 'tel');
    }
    
    const zipField = page.locator('[data-testid="zip-code"]');
    await expect(zipField).toHaveAttribute('inputmode', 'numeric');
  });

  test('should maintain performance on mobile devices', async ({ page }) => {
    // Simulate slower mobile network
    await page.emulateNetworkConditions({
      offline: false,
      downloadThroughput: 500 * 1024, // 500 KB/s
      uploadThroughput: 250 * 1024,   // 250 KB/s
      latency: 300                     // 300ms latency
    });

    const homePage = new HomePage(page);
    const startTime = Date.now();
    await homePage.goto();
    await homePage.waitForLoad();
    const loadTime = Date.now() - startTime;

    // Verify acceptable mobile load time
    expect(loadTime).toBeLessThan(8000); // 8 seconds max on slow connection

    // Test image lazy loading on mobile
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    // Verify images load as they come into view
    const lazyImages = page.locator('img[loading="lazy"]');
    const imageCount = await lazyImages.count();
    
    if (imageCount > 0) {
      for (let i = 0; i < Math.min(imageCount, 3); i++) {
        const img = lazyImages.nth(i);
        await img.scrollIntoViewIfNeeded();
        await expect(img).toHaveAttribute('src', /.+/);
      }
    }

    // Test smooth scrolling performance
    let scrollEvents = 0;
    await page.evaluate(() => {
      let events = 0;
      window.addEventListener('scroll', () => events++);
      // @ts-ignore
      window.getScrollEvents = () => events;
    });

    await page.evaluate(() => {
      window.scrollTo({ top: 1000, behavior: 'smooth' });
    });

    await page.waitForTimeout(1000);
    
    const events = await page.evaluate(() => {
      // @ts-ignore
      return window.getScrollEvents();
    });
    
    // Verify smooth scrolling doesn't cause excessive events
    expect(events).toBeLessThan(100);

    // Reset network conditions
    await page.emulateNetworkConditions({
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0
    });
  });
});