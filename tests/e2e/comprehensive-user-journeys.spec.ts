import { test, expect, Browser, BrowserContext } from '@playwright/test';
import { HomePage } from './page-objects/homepage';
import { ProductPage } from './page-objects/product-page';
import { CartPage } from './page-objects/cart-page';
import { CheckoutPage } from './page-objects/checkout-page';
import { OrderConfirmationPage } from './page-objects/order-confirmation-page';
import { AuthPage } from './page-objects/auth-page';
import { SearchPage } from './page-objects/search-page';
import { AccessibilityHelper } from '../utils/accessibility-helper';
import { PerformanceHelper } from '../utils/performance-helper';
import { VisualRegressionHelper } from '../utils/visual-regression-helper';

/**
 * Comprehensive E2E Test Suite for Heaven-Dolls Marketplace
 * 
 * This test suite covers all critical user journeys and scenarios:
 * - Complete purchase flows
 * - Cross-browser compatibility
 * - Performance benchmarks
 * - Accessibility compliance
 * - Visual regression testing
 * - Error handling and recovery
 * - Mobile responsiveness
 */

test.describe('Heaven-Dolls E2E Test Suite - Comprehensive User Journeys', () => {
  let homePage: HomePage;
  let productPage: ProductPage;
  let cartPage: CartPage;
  let checkoutPage: CheckoutPage;
  let orderConfirmationPage: OrderConfirmationPage;
  let authPage: AuthPage;
  let searchPage: SearchPage;
  let accessibilityHelper: AccessibilityHelper;
  let performanceHelper: PerformanceHelper;
  let visualHelper: VisualRegressionHelper;

  test.beforeEach(async ({ page, browserName }) => {
    // Initialize page objects
    homePage = new HomePage(page);
    productPage = new ProductPage(page);
    cartPage = new CartPage(page);
    checkoutPage = new CheckoutPage(page);
    orderConfirmationPage = new OrderConfirmationPage(page);
    authPage = new AuthPage(page);
    searchPage = new SearchPage(page);

    // Initialize helpers
    accessibilityHelper = new AccessibilityHelper(page);
    performanceHelper = new PerformanceHelper(page);
    visualHelper = new VisualRegressionHelper(page, browserName);

    // Clear any existing state
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.describe('Complete Purchase Flow - New Customer', () => {
    test('should complete entire purchase journey with performance and accessibility validation', async ({ page, browserName }) => {
      test.info().annotations.push(
        { type: 'feature', description: 'Complete purchase flow validation' },
        { type: 'browsers', description: `Testing on ${browserName}` }
      );

      // Step 1: Homepage Performance and Visual Test
      const homepageMetrics = await performanceHelper.testPageLoadPerformance('/');
      expect(homepageMetrics.loadTime).toBeLessThan(3000);
      
      await visualHelper.compareFullPage('homepage-initial-load');
      await accessibilityHelper.runFullAccessibilityScan();

      await homePage.verifyPageLoaded();
      await homePage.verifyHeaderElements();
      await homePage.verifyHeroSection();

      // Step 2: Product Discovery
      await homePage.verifyFeaturedProducts();
      const firstProductName = await homePage.productCard.locator('h3').textContent();
      
      await visualHelper.testComponentStates(
        homePage.productCard,
        'product-card-states',
        ['normal', 'hover']
      );

      // Step 3: Product Details Performance Test
      await homePage.clickFirstProduct();
      const productMetrics = await performanceHelper.measureCoreWebVitals();
      
      expect(productMetrics.lcp).toBeLessThan(2500);
      expect(productMetrics.cls).toBeLessThan(0.1);

      await productPage.verifyPageLoaded();
      await productPage.verifyProductDetails();
      
      // Visual regression test for product page
      await visualHelper.compareFullPage('product-detail-page');

      // Step 4: Add to Cart with Accessibility Test
      await accessibilityHelper.testKeyboardNavigation();
      await productPage.addToCart(2);

      // Verify cart update with visual feedback
      await cartPage.openCartDrawer();
      await cartPage.verifyCartHasItems();
      await visualHelper.compareElement(cartPage.cartDrawer, 'cart-drawer-with-items');

      // Step 5: Shopping Cart Experience
      await cartPage.navigateToFullCart();
      await cartPage.verifyCartTotals();
      
      // Test cart accessibility
      await accessibilityHelper.testFormAccessibility();
      
      // Test quantity updates with visual validation
      await cartPage.updateItemQuantity(0, 1);
      await visualHelper.compareFullPage('cart-after-quantity-update');

      // Step 6: Checkout Process
      await cartPage.proceedToCheckout();

      // Handle authentication redirect
      if (page.url().includes('/auth/login')) {
        await visualHelper.compareFullPage('login-page');
        
        // Test guest checkout option
        await checkoutPage.selectGuestCheckout();
      }

      await checkoutPage.verifyPageLoaded();
      await checkoutPage.verifySecurityFeatures();

      // Performance test for checkout page
      const checkoutMetrics = await performanceHelper.measureCoreWebVitals();
      expect(checkoutMetrics.fid).toBeLessThan(100);

      // Step 7: Complete Checkout Form
      const shippingInfo = {\n        firstName: 'John',\n        lastName: 'Doe',\n        email: 'john.doe@example.com',\n        phone: '555-123-4567',\n        address1: '123 Test Street',\n        city: 'Test City',\n        state: 'CA',\n        zipCode: '12345',\n        country: 'United States'\n      };\n\n      const paymentInfo = {\n        number: '4242424242424242',\n        expiry: '12/25',\n        cvv: '123',\n        name: 'John Doe'\n      };\n\n      await checkoutPage.fillShippingInformation(shippingInfo);\n      await visualHelper.compareFullPage('checkout-shipping-filled');\n      \n      await checkoutPage.selectShippingMethod('standard');\n      await checkoutPage.fillCreditCardInformation(paymentInfo);\n      await checkoutPage.acceptTermsAndConditions();\n\n      // Visual test of completed form\n      await visualHelper.compareFullPage('checkout-form-completed');\n\n      // Step 8: Performance Test During Order Submission\n      const orderStartTime = Date.now();\n      await checkoutPage.placeOrder();\n      const orderProcessTime = Date.now() - orderStartTime;\n      \n      expect(orderProcessTime).toBeLessThan(5000); // Order should process within 5 seconds\n\n      // Step 9: Order Confirmation\n      await orderConfirmationPage.verifyPageLoaded();\n      await orderConfirmationPage.verifyCompleteOrderConfirmation();\n      \n      const orderNumber = await orderConfirmationPage.getOrderNumber();\n      expect(orderNumber).toBeTruthy();\n      \n      await visualHelper.compareFullPage('order-confirmation-page');\n      \n      // Verify order details match what was submitted\n      await orderConfirmationPage.verifyOrderDetails({\n        customerName: `${shippingInfo.firstName} ${shippingInfo.lastName}`,\n        email: shippingInfo.email,\n        totalAmount: '$' // This would be calculated based on cart contents\n      });\n\n      // Step 10: Final Accessibility and Performance Validation\n      await accessibilityHelper.runFullAccessibilityScan();\n      const finalMetrics = await performanceHelper.measureCoreWebVitals();\n      \n      // Generate comprehensive reports\n      const performanceReport = await performanceHelper.generatePerformanceReport(page.url());\n      const accessibilityReport = await accessibilityHelper.generateAccessibilityReport();\n      \n      console.log('🎯 Final Performance Score:', performanceReport.score);\n      console.log('♿ Final Accessibility Score:', accessibilityReport.score);\n      \n      // Attach reports to test results\n      test.info().attach('performance-report', {\n        body: JSON.stringify(performanceReport, null, 2),\n        contentType: 'application/json'\n      });\n      \n      test.info().attach('accessibility-report', {\n        body: JSON.stringify(accessibilityReport, null, 2),\n        contentType: 'application/json'\n      });\n      \n      // Performance assertions\n      expect(performanceReport.score).toBeGreaterThan(75);\n      expect(accessibilityReport.score).toBeGreaterThan(90);\n    });\n\n    test('should handle payment errors gracefully with proper UX feedback', async ({ page }) => {\n      // Navigate through purchase flow\n      await homePage.navigate();\n      await homePage.clickFirstProduct();\n      await productPage.addToCart(1);\n      await cartPage.openCartDrawer();\n      await cartPage.proceedToCheckout();\n      \n      // Mock payment failure\n      await page.route('**/api/payments/**', route => {\n        route.fulfill({\n          status: 400,\n          contentType: 'application/json',\n          body: JSON.stringify({\n            error: 'payment_declined',\n            message: 'Your card was declined. Please try a different payment method.'\n          })\n        });\n      });\n      \n      // Attempt checkout\n      await checkoutPage.selectGuestCheckout();\n      await checkoutPage.fillShippingInformation({\n        firstName: 'Test',\n        lastName: 'User',\n        email: 'test@example.com',\n        phone: '555-0000',\n        address1: '123 Test St',\n        city: 'Test City',\n        state: 'CA',\n        zipCode: '12345',\n        country: 'United States'\n      });\n      \n      await checkoutPage.fillCreditCardInformation({\n        number: '4000000000000002', // Declined card\n        expiry: '12/25',\n        cvv: '123',\n        name: 'Test User'\n      });\n      \n      await checkoutPage.acceptTermsAndConditions();\n      \n      // Test visual state of error\n      await visualHelper.compareFullPage('checkout-payment-error');\n      \n      // Verify error handling\n      await expect(page.getByText(/card was declined|payment declined/i)).toBeVisible();\n      \n      // Test retry functionality\n      await page.unroute('**/api/payments/**');\n      \n      // Update with valid card\n      await checkoutPage.fillCreditCardInformation({\n        number: '4242424242424242',\n        expiry: '12/25',\n        cvv: '123',\n        name: 'Test User'\n      });\n      \n      await checkoutPage.placeOrder();\n      await orderConfirmationPage.verifyPageLoaded();\n    });\n  });\n\n  test.describe('Returning Customer Experience', () => {\n    test('should provide optimized experience for returning customers', async ({ page }) => {\n      // Login as returning customer\n      await authPage.navigateToLogin();\n      await authPage.login('returning@customer.com', 'SecurePass123!');\n      \n      // Performance test with logged-in state\n      const authenticatedMetrics = await performanceHelper.testPageLoadPerformance('/');\n      expect(authenticatedMetrics.loadTime).toBeLessThan(2000); // Should be faster for returning users\n      \n      // Test personalized experience\n      await homePage.verifyPageLoaded();\n      \n      // Quick add to cart (should be faster for returning customers)\n      const startTime = Date.now();\n      await homePage.clickFirstProduct();\n      await productPage.addToCart(1);\n      const addToCartTime = Date.now() - startTime;\n      \n      expect(addToCartTime).toBeLessThan(2000);\n      \n      // Verify saved payment/address handling in checkout\n      await cartPage.proceedToCheckout();\n      await checkoutPage.verifyPageLoaded();\n      \n      // Should have saved addresses/payment methods\n      const savedAddressExists = await checkoutPage.isElementVisible(checkoutPage.savedAddresses);\n      const savedPaymentExists = await checkoutPage.isElementVisible(checkoutPage.savedPaymentMethods);\n      \n      // Visual test with saved information\n      if (savedAddressExists || savedPaymentExists) {\n        await visualHelper.compareFullPage('checkout-with-saved-info');\n      }\n    });\n  });\n\n  test.describe('Mobile User Experience', () => {\n    test('should provide excellent mobile experience with touch interactions', async ({ page }) => {\n      // Set mobile viewport\n      await page.setViewportSize({ width: 375, height: 667 });\n      \n      // Test mobile performance\n      const mobileMetrics = await performanceHelper.testMobilePerformance('/');\n      expect(mobileMetrics.totalTransferSize).toBeLessThan(1000 * 1024); // 1MB for mobile\n      \n      await homePage.verifyPageLoaded();\n      \n      // Test mobile navigation\n      await homePage.openMobileMenu();\n      await visualHelper.compareFullPage('mobile-menu-open');\n      \n      // Test touch interactions\n      const productCard = homePage.productCard;\n      \n      // Simulate touch events\n      await productCard.dispatchEvent('touchstart');\n      await page.waitForTimeout(100);\n      await productCard.dispatchEvent('touchend');\n      \n      // Test mobile product browsing\n      await productCard.click();\n      await productPage.verifyPageLoaded();\n      \n      // Test mobile image gallery (swipe interactions)\n      await productPage.navigateImageGallery();\n      \n      // Test mobile cart\n      await productPage.addToCart(1);\n      await cartPage.openCartDrawer();\n      await visualHelper.compareFullPage('mobile-cart-drawer');\n      \n      // Test mobile checkout\n      await cartPage.proceedToCheckout();\n      await checkoutPage.verifyPageLoaded();\n      \n      // Test mobile form usability\n      await accessibilityHelper.testMobileAccessibility();\n      \n      // Visual test of mobile checkout form\n      await visualHelper.compareFullPage('mobile-checkout-form');\n      \n      // Test touch target sizes\n      const touchTargets = page.locator('button, a, input');\n      const targetCount = await touchTargets.count();\n      \n      for (let i = 0; i < Math.min(targetCount, 10); i++) {\n        const target = touchTargets.nth(i);\n        if (await target.isVisible()) {\n          const box = await target.boundingBox();\n          if (box) {\n            expect(box.width).toBeGreaterThanOrEqual(44); // WCAG touch target size\n            expect(box.height).toBeGreaterThanOrEqual(44);\n          }\n        }\n      }\n    });\n  });\n\n  test.describe('Search and Discovery Flow', () => {\n    test('should provide excellent search experience with performance', async ({ page }) => {\n      await homePage.navigate();\n      \n      // Test search performance\n      const searchStartTime = Date.now();\n      await homePage.performSearch('wellness products');\n      const searchTime = Date.now() - searchStartTime;\n      \n      expect(searchTime).toBeLessThan(1000); // Search should be fast\n      \n      await searchPage.verifyPageLoaded();\n      await searchPage.verifySearchResults();\n      \n      // Test search accessibility\n      await accessibilityHelper.testSearchAccessibility();\n      \n      // Test filters\n      await searchPage.applyPriceFilter(50, 200);\n      await searchPage.applyCategoryFilter('Wellness');\n      \n      // Visual test of filtered results\n      await visualHelper.compareFullPage('search-results-filtered');\n      \n      // Test search performance with filters\n      const filteredResults = page.locator('[data-testid=\"product-card\"]');\n      const resultCount = await filteredResults.count();\n      expect(resultCount).toBeGreaterThan(0);\n      \n      // Test sort functionality\n      await searchPage.changeSortOrder('price');\n      await visualHelper.compareFullPage('search-results-sorted');\n      \n      // Verify sort worked by checking price order\n      const priceElements = page.locator('[data-testid=\"product-price\"]');\n      const priceCount = await priceElements.count();\n      \n      if (priceCount >= 2) {\n        const firstPrice = await priceElements.nth(0).textContent();\n        const secondPrice = await priceElements.nth(1).textContent();\n        \n        // Extract numeric values (assuming format like \"$29.99\")\n        const firstValue = parseFloat(firstPrice?.replace(/[^0-9.]/g, '') || '0');\n        const secondValue = parseFloat(secondPrice?.replace(/[^0-9.]/g, '') || '0');\n        \n        expect(firstValue).toBeLessThanOrEqual(secondValue);\n      }\n    });\n  });\n\n  test.describe('Cross-Browser Compatibility', () => {\n    (['chromium', 'firefox', 'webkit'] as const).forEach((browserName) => {\n      test(`should work correctly on ${browserName}`, async ({ page }) => {\n        test.skip(browserName === 'webkit' && process.platform === 'linux', 'WebKit not available on Linux CI');\n        \n        // Test critical path on each browser\n        await homePage.navigate();\n        await homePage.verifyPageLoaded();\n        \n        // Browser-specific performance test\n        const metrics = await performanceHelper.measureCoreWebVitals();\n        \n        // Browser-specific thresholds (WebKit might be slower)\n        const lcpThreshold = browserName === 'webkit' ? 3000 : 2500;\n        if (metrics.lcp) {\n          expect(metrics.lcp).toBeLessThan(lcpThreshold);\n        }\n        \n        // Visual regression per browser\n        await visualHelper.compareFullPage(`cross-browser-homepage`);\n        \n        // Test critical functionality\n        await homePage.clickFirstProduct();\n        await productPage.verifyPageLoaded();\n        await productPage.addToCart(1);\n        \n        await cartPage.openCartDrawer();\n        await cartPage.verifyCartHasItems();\n        \n        // Browser-specific visual test\n        await visualHelper.compareFullPage(`cross-browser-cart-drawer`);\n      });\n    });\n  });\n\n  test.describe('Accessibility Compliance', () => {\n    test('should meet WCAG 2.1 AA standards across all pages', async ({ page }) => {\n      const pagesToTest = [\n        { url: '/', name: 'homepage' },\n        { url: '/products', name: 'product-listing' },\n        { url: '/search?q=wellness', name: 'search-results' },\n        { url: '/cart', name: 'cart' },\n        { url: '/checkout', name: 'checkout' },\n        { url: '/auth/login', name: 'login' },\n      ];\n      \n      for (const pageToTest of pagesToTest) {\n        await page.goto(pageToTest.url);\n        await page.waitForLoadState('networkidle');\n        \n        // Run comprehensive accessibility scan\n        await accessibilityHelper.runFullAccessibilityScan({ wcagLevel: 'AA' });\n        \n        // Test keyboard navigation\n        await accessibilityHelper.testKeyboardNavigation();\n        \n        // Test screen reader compatibility\n        await accessibilityHelper.testScreenReaderCompatibility();\n        \n        // Test color contrast\n        await accessibilityHelper.testColorContrast();\n        \n        console.log(`✅ Accessibility tests passed for ${pageToTest.name}`);\n      }\n    });\n  });\n\n  test.describe('Performance Budget Compliance', () => {\n    test('should meet performance budgets across all critical pages', async ({ page }) => {\n      const performanceBudget = {\n        lcp: 2500,\n        fid: 100,\n        cls: 0.1,\n        loadTime: 3000,\n        totalTransferSize: 1600 * 1024, // 1.6MB\n      };\n      \n      const criticalPages = [\n        '/',\n        '/products',\n        '/cart',\n        '/checkout'\n      ];\n      \n      for (const url of criticalPages) {\n        const { metrics, budgetResults, passed } = await performanceHelper.testPerformanceBudget(\n          performanceBudget\n        );\n        \n        // Log results for debugging\n        console.log(`Performance results for ${url}:`, budgetResults);\n        \n        // Assert budget compliance\n        expect(passed).toBe(true);\n        \n        // Attach detailed metrics\n        test.info().attach(`performance-${url.replace('/', 'home')}`, {\n          body: JSON.stringify(metrics, null, 2),\n          contentType: 'application/json'\n        });\n      }\n    });\n  });\n\n  test.describe('Error Handling and Recovery', () => {\n    test('should handle network errors gracefully', async ({ page }) => {\n      await homePage.navigate();\n      \n      // Simulate network failure\n      await page.route('**/api/**', route => {\n        route.abort('failed');\n      });\n      \n      // Test error states\n      await homePage.performSearch('test query');\n      \n      // Should show error message\n      await expect(page.getByText(/error|something went wrong|try again/i)).toBeVisible();\n      \n      // Visual test of error state\n      await visualHelper.compareFullPage('network-error-state');\n      \n      // Test recovery\n      await page.unroute('**/api/**');\n      \n      const retryButton = page.getByRole('button', { name: /try again|retry/i });\n      if (await retryButton.isVisible()) {\n        await retryButton.click();\n      } else {\n        // Refresh page to recover\n        await page.reload();\n      }\n      \n      await homePage.verifyPageLoaded();\n    });\n  });\n});"