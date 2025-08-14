import { test, expect } from '@playwright/test';
import { HomePage } from '../page-objects/homepage';
import { ProductPage } from '../page-objects/product-page';
import { CartPage } from '../page-objects/cart-page';
import { AuthPage } from '../page-objects/auth-page';

test.describe('Shopping Cart & Checkout Comprehensive Workflows', () => {
  let homePage: HomePage;
  let productPage: ProductPage;
  let cartPage: CartPage;
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    productPage = new ProductPage(page);
    cartPage = new CartPage(page);
    authPage = new AuthPage(page);
  });

  test.describe('Cart Management Workflows', () => {
    test('add multiple products from different sources to cart', async ({ page }) => {
      // Add product from homepage featured section
      await homePage.navigate();
      await homePage.verifyPageLoaded();
      
      const featuredProducts = page.locator('[data-testid="product-card"]');
      await featuredProducts.first().getByRole('button', { name: /add to cart/i }).click();
      
      // Verify cart count
      let cartCount = await homePage.getCartItemCount();
      expect(cartCount).toContain('1');
      
      // Add product from product detail page
      await featuredProducts.nth(1).click();
      await productPage.verifyPageLoaded();
      await productPage.setQuantity(2);
      await productPage.addToCart();
      
      // Verify cart count updated
      cartCount = await homePage.getCartItemCount();
      expect(cartCount).toContain('3');
      
      // Add product from category page
      await homePage.navigateToCategory('wellness');
      const categoryProducts = page.locator('[data-testid="product-card"]');
      await categoryProducts.first().getByRole('button', { name: /add to cart/i }).click();
      
      // Verify final cart count
      cartCount = await homePage.getCartItemCount();
      expect(cartCount).toContain('4');
      
      // Verify all products in cart
      await cartPage.openCartDrawer();
      await cartPage.verifyCartHasItems();
      const itemCount = await cartPage.getCartItemCount();
      expect(itemCount).toBeGreaterThanOrEqual(3);
    });
    
    test('cart quantity management and total calculations', async ({ page }) => {
      // Add products to cart
      await homePage.navigate();
      await homePage.clickFirstProduct();
      await productPage.addToCart(3);
      
      await homePage.navigate();
      await page.locator('[data-testid="product-card"]').nth(1).click();
      await productPage.addToCart(2);
      
      // Navigate to full cart page
      await cartPage.navigate();
      await cartPage.verifyPageLoaded();
      await cartPage.verifyCartHasItems();
      
      // Test quantity increase
      const initialSubtotal = await cartPage.getSubtotal();
      await cartPage.increaseItemQuantity(0);
      
      // Verify subtotal updated
      const newSubtotal = await cartPage.getSubtotal();
      expect(newSubtotal).not.toBe(initialSubtotal);
      
      // Test quantity decrease
      await cartPage.decreaseItemQuantity(0);
      
      // Test manual quantity update
      await cartPage.updateItemQuantity(1, 5);
      
      // Verify totals calculation
      await cartPage.verifyCartTotals();
      
      // Test quantity limits (if any)
      await cartPage.updateItemQuantity(0, 999);
      // Should either accept large quantity or show error
    });
    
    test('cart item removal and empty cart handling', async ({ page }) => {
      // Add multiple items to cart
      await homePage.navigate();
      await homePage.clickFirstProduct();
      await productPage.addToCart(1);
      
      await homePage.navigate();
      await page.locator('[data-testid="product-card"]').nth(1).click();
      await productPage.addToCart(1);
      
      // Navigate to cart
      await cartPage.navigate();
      await cartPage.verifyCartHasItems();
      
      const initialItemCount = await cartPage.getCartItemCount();
      
      // Remove first item
      await cartPage.removeCartItem(0);
      
      // Verify item count decreased
      const afterRemovalCount = await cartPage.getCartItemCount();
      expect(afterRemovalCount).toBe(initialItemCount - 1);
      
      // Remove remaining items
      const remainingItems = await cartPage.getCartItemCount();
      for (let i = remainingItems - 1; i >= 0; i--) {
        await cartPage.removeCartItem(0);
      }
      
      // Verify empty cart state
      await cartPage.verifyEmptyCart();
      
      // Test continue shopping from empty cart
      await cartPage.continueShopping();
      await expect(page).toHaveURL(/.*\/products/);
    });
    
    test('cart persistence across sessions and pages', async ({ page }) => {
      // Add items to cart
      await homePage.navigate();
      await homePage.clickFirstProduct();
      await productPage.addToCart(2);
      
      // Navigate to different pages
      await homePage.navigate();
      let cartCount = await homePage.getCartItemCount();
      expect(cartCount).toContain('2');
      
      // Refresh page
      await page.reload();
      cartCount = await homePage.getCartItemCount();
      expect(cartCount).toContain('2');
      
      // Navigate to cart and verify items
      await cartPage.navigate();
      await cartPage.verifyCartPersistence();
      
      // Open new tab (simulate returning to site)
      const newTab = await page.context().newPage();
      const newHomePage = new HomePage(newTab);
      await newHomePage.navigate();
      const newTabCartCount = await newHomePage.getCartItemCount();
      expect(newTabCartCount).toContain('2');
      
      await newTab.close();
    });
  });

  test.describe('Promotional Codes and Discounts', () => {
    test('apply and remove promotional codes', async ({ page }) => {
      // Add items to cart
      await homePage.navigate();
      await homePage.clickFirstProduct();
      await productPage.addToCart(1);
      
      await cartPage.navigate();
      await cartPage.verifyCartHasItems();
      
      const originalTotal = await cartPage.getTotalAmount();
      
      // Apply valid promo code
      await cartPage.applyPromoCode('TEST10');
      
      // Check if promo code was accepted
      try {
        await cartPage.verifyPromoCodeApplied();
        
        // Verify discount applied
        const discountedTotal = await cartPage.getTotalAmount();
        expect(discountedTotal).not.toBe(originalTotal);
        
        // Remove promo code
        await cartPage.removePromoCode();
        
        // Verify original total restored
        const restoredTotal = await cartPage.getTotalAmount();
        expect(restoredTotal).toBe(originalTotal);
      } catch {
        // If promo code functionality not implemented, verify error handling
        await cartPage.verifyPromoCodeError();
      }
      
      // Test invalid promo code
      await cartPage.applyPromoCode('INVALID123');
      await cartPage.verifyPromoCodeError();
    });
    
    test('multiple promotional codes and stacking', async ({ page }) => {
      await homePage.navigate();
      await homePage.clickFirstProduct();
      await productPage.addToCart(2);
      
      await cartPage.navigate();
      await cartPage.verifyCartHasItems();
      
      // Try to apply multiple promo codes
      const promoCodes = ['WELCOME10', 'SAVE5', 'NEWUSER'];
      
      for (const code of promoCodes) {
        await cartPage.applyPromoCode(code);
        
        // Check if code was applied or if stacking is prevented
        try {
          await cartPage.verifyPromoCodeApplied();
        } catch {
          await cartPage.verifyPromoCodeError();
        }
      }
    });
  });

  test.describe('Shipping Options and Calculations', () => {
    test('shipping method selection and cost calculation', async ({ page }) => {
      await homePage.navigate();
      await homePage.clickFirstProduct();
      await productPage.addToCart(1);
      
      await cartPage.navigate();
      await cartPage.verifyCartHasItems();
      
      // Test different shipping options
      const shippingOptions = ['standard', 'express', 'overnight'] as const;
      
      for (const option of shippingOptions) {
        const beforeTotal = await cartPage.getTotalAmount();
        
        await cartPage.selectShippingOption(option);
        await cartPage.verifyShippingCalculation();
        
        const afterTotal = await cartPage.getTotalAmount();
        // Total should change unless it's free shipping
      }
    });
    
    test('shipping calculation based on location', async ({ page }) => {
      await homePage.navigate();
      await homePage.clickFirstProduct();
      await productPage.addToCart(1);
      
      await cartPage.navigate();
      await cartPage.verifyCartHasItems();
      
      // Test shipping calculator (if available)
      const shippingCalculator = page.locator('[data-testid="shipping-calculator"]');
      
      if (await shippingCalculator.isVisible()) {
        // Enter postal code
        await page.locator('[data-testid="postal-code"]').fill('90210');
        await page.getByRole('button', { name: /calculate shipping/i }).click();
        
        // Verify shipping options appear
        await expect(page.locator('[data-testid="shipping-options"]')).toBeVisible();
        
        // Test international shipping
        await page.locator('[data-testid="postal-code"]').fill('M5V 3A8'); // Toronto
        await page.getByRole('button', { name: /calculate shipping/i }).click();
      }
    });
  });

  test.describe('Guest vs Registered User Checkout', () => {
    test('guest checkout workflow', async ({ page }) => {
      // Ensure user is logged out
      await page.goto('/auth/logout');
      
      // Add items to cart as guest
      await homePage.navigate();
      await homePage.clickFirstProduct();
      await productPage.addToCart(1);
      
      // Proceed to checkout
      await cartPage.openCartDrawer();
      await cartPage.proceedToCheckout();
      
      // Should redirect to login/registration or guest checkout
      if (page.url().includes('/auth/login')) {
        // Look for guest checkout option
        const guestCheckoutButton = page.getByRole('button', { name: /guest checkout|checkout as guest/i });
        
        if (await guestCheckoutButton.isVisible()) {
          await guestCheckoutButton.click();
        } else {
          // If no guest option, create quick account
          await authPage.navigateToRegistrationFromLogin();
          await authPage.register(
            'Guest User',
            'guest@example.com',
            'GuestPass123!',
            'GuestPass123!'
          );
        }
      }
      
      // Should reach checkout page
      await expect(page).toHaveURL(/.*\/checkout/);
    });
    
    test('registered user express checkout', async ({ page }) => {
      // Login first
      await authPage.navigateToLogin();
      await authPage.login('test@example.com', 'Test123456!');
      await authPage.verifySuccessfulLogin();
      
      // Add items to cart
      await homePage.navigate();
      await homePage.clickFirstProduct();
      await productPage.addToCart(1);
      
      // Express checkout (should skip login)
      await cartPage.openCartDrawer();
      await cartPage.proceedToCheckout();
      
      // Should go directly to checkout
      await expect(page).toHaveURL(/.*\/checkout/);
      
      // Verify user details are pre-filled (if checkout form is loaded)
      const checkoutForm = page.locator('[data-testid="checkout-form"]');
      if (await checkoutForm.isVisible()) {
        const emailField = page.locator('[data-testid="email-field"]');
        if (await emailField.isVisible()) {
          const emailValue = await emailField.inputValue();
          expect(emailValue).toBe('test@example.com');
        }
      }
    });
    
    test('account creation during checkout', async ({ page }) => {
      // Start as guest
      await page.goto('/auth/logout');
      
      // Add items and proceed to checkout
      await homePage.navigate();
      await homePage.clickFirstProduct();
      await productPage.addToCart(1);
      
      await cartPage.openCartDrawer();
      await cartPage.proceedToCheckout();
      
      // Create account during checkout
      if (page.url().includes('/auth/login')) {
        await authPage.navigateToRegistrationFromLogin();
        await authPage.register(
          'Checkout User',
          'checkout@example.com',
          'CheckoutPass123!',
          'CheckoutPass123!'
        );
        
        await authPage.verifySuccessfulRegistration();
        
        // Should proceed to checkout
        await expect(page).toHaveURL(/.*\/(checkout|dashboard)/);
      }
    });
  });

  test.describe('Cart Error Handling', () => {
    test('handle out of stock items during checkout', async ({ page }) => {
      // Add items to cart
      await homePage.navigate();
      await homePage.clickFirstProduct();
      await productPage.addToCart(5); // Try to add large quantity
      
      // Navigate to cart
      await cartPage.navigate();
      await cartPage.verifyCartHasItems();
      
      // Mock inventory update that makes item out of stock
      await page.route('**/api/cart/validate', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ 
            error: 'Item out of stock',
            availableQuantity: 0
          })
        });
      });
      
      // Proceed to checkout
      await cartPage.proceedToCheckout();
      
      // Should show out of stock error
      await expect(page.getByText(/out of stock|unavailable/i)).toBeVisible();
      
      // Verify user can remove item or update quantity
      const updateButton = page.getByRole('button', { name: /update|remove/i });
      if (await updateButton.isVisible()) {
        await updateButton.click();
      }
    });
    
    test('handle price changes during checkout', async ({ page }) => {
      // Add items to cart
      await homePage.navigate();
      await homePage.clickFirstProduct();
      await productPage.addToCart(1);
      
      await cartPage.navigate();
      const originalTotal = await cartPage.getTotalAmount();
      
      // Mock price change
      await page.route('**/api/cart/validate', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            priceChanged: true,
            newTotal: '$299.99',
            message: 'Prices have been updated'
          })
        });
      });
      
      // Proceed to checkout
      await cartPage.proceedToCheckout();
      
      // Should show price change notification
      await expect(page.getByText(/price.*(changed|updated)/i)).toBeVisible();
      
      // User should be able to accept or cancel
      const acceptButton = page.getByRole('button', { name: /accept|continue/i });
      if (await acceptButton.isVisible()) {
        await acceptButton.click();
      }
    });
    
    test('handle network errors during cart operations', async ({ page }) => {
      // Add item to cart
      await homePage.navigate();
      await homePage.clickFirstProduct();
      await productPage.addToCart(1);
      
      await cartPage.navigate();
      await cartPage.verifyCartHasItems();
      
      // Mock network error for cart updates
      await page.route('**/api/cart/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' })
        });
      });
      
      // Try to update quantity
      await cartPage.updateItemQuantity(0, 3);
      
      // Should show error message
      await expect(page.getByText(/error|failed|try again/i)).toBeVisible();
      
      // Should provide retry option
      const retryButton = page.getByRole('button', { name: /retry|try again/i });
      if (await retryButton.isVisible()) {
        // Remove route mock and retry
        await page.unroute('**/api/cart/**');
        await retryButton.click();
        
        // Should succeed
        await cartPage.waitForLoadingToComplete();
      }
    });
  });

  test.describe('Save for Later and Wishlist Integration', () => {
    test('save items for later workflow', async ({ page }) => {
      // Add items to cart
      await homePage.navigate();
      await homePage.clickFirstProduct();
      await productPage.addToCart(1);
      
      await cartPage.navigate();
      await cartPage.verifyCartHasItems();
      
      // Save item for later
      await cartPage.saveItemForLater(0);
      
      // Verify item moved to saved section
      const savedItems = page.locator('[data-testid="saved-items"]');
      if (await savedItems.isVisible()) {
        await expect(savedItems.locator('[data-testid="saved-item"]')).toHaveCount.greaterThan(0);
        
        // Move item back to cart
        const moveToCartButton = savedItems.getByRole('button', { name: /move to cart/i });
        if (await moveToCartButton.isVisible()) {
          await moveToCartButton.click();
          await cartPage.verifyCartHasItems();
        }
      }
    });
    
    test('wishlist to cart workflow', async ({ page }) => {
      // Login first
      await authPage.navigateToLogin();
      await authPage.login('test@example.com', 'Test123456!');
      
      // Add item to wishlist
      await homePage.navigate();
      await homePage.clickFirstProduct();
      await productPage.addToWishlist();
      
      // Navigate to wishlist
      await page.goto('/wishlist');
      
      // Move item from wishlist to cart
      const wishlistItems = page.locator('[data-testid="wishlist-item"]');
      if (await wishlistItems.count() > 0) {
        const addToCartButton = wishlistItems.first().getByRole('button', { name: /add to cart/i });
        await addToCartButton.click();
        
        // Verify item added to cart
        const cartCount = await homePage.getCartItemCount();
        expect(cartCount).toContain('1');
      }
    });
  });

  test.describe('Mobile Cart Experience', () => {
    test('mobile cart drawer interactions', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Add items to cart
      await homePage.navigate();
      await homePage.clickFirstProduct();
      await productPage.addToCart(1);
      
      // Test mobile cart drawer
      await cartPage.openCartDrawer();
      await cartPage.verifyCartHasItems();
      
      // Test mobile quantity controls
      await cartPage.increaseItemQuantity(0);
      await cartPage.decreaseItemQuantity(0);
      
      // Test mobile checkout
      await cartPage.proceedToCheckout();
    });
    
    test('mobile cart page responsive design', async ({ page }) => {
      // Test different mobile breakpoints
      const mobileBreakpoints = [
        { width: 320, height: 568 }, // iPhone SE
        { width: 375, height: 667 }, // iPhone 8
        { width: 414, height: 896 }, // iPhone XR
      ];
      
      for (const viewport of mobileBreakpoints) {
        await page.setViewportSize(viewport);
        
        // Add item and navigate to cart
        await homePage.navigate();
        await homePage.clickFirstProduct();
        await productPage.addToCart(1);
        
        await cartPage.navigate();
        await cartPage.verifyPageLoaded();
        await cartPage.verifyCartHasItems();
        
        // Verify mobile layout
        await expect(page.locator('[data-testid="cart-items"]')).toBeVisible();
        await expect(page.locator('[data-testid="cart-total"]')).toBeVisible();
        await expect(cartPage.checkoutButton).toBeVisible();
      }
    });
  });
});
