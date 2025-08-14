import { test, expect } from '@playwright/test';

test.describe('Shopping Cart', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('adds product to cart from product page', async ({ page }) => {
    // Navigate to a product
    await page.getByRole('link', { name: /premium wellness doll/i }).first().click();
    
    // Add to cart
    const addToCartButton = page.getByRole('button', { name: /add to cart/i });
    await expect(addToCartButton).toBeVisible();
    await addToCartButton.click();
    
    // Check success feedback
    await expect(
      page.getByText(/added to cart|item added/i)
    ).toBeVisible();
    
    // Check cart indicator
    const cartButton = page.getByRole('button', { name: /cart/i });
    await expect(cartButton).toContainText('1');
  });

  test('adds product to cart from product card', async ({ page }) => {
    // Find first product card
    const productCard = page.locator('[data-testid="product-card"]').first();
    await expect(productCard).toBeVisible();
    
    // Add to cart using quick add button
    const quickAddButton = productCard.getByRole('button', { name: /add to cart/i });
    await quickAddButton.click();
    
    // Verify cart count increased
    const cartButton = page.getByRole('button', { name: /cart/i });
    await expect(cartButton).toContainText('1');
  });

  test('opens and displays cart drawer', async ({ page }) => {
    // Add item to cart first
    await page.getByRole('link', { name: /premium wellness doll/i }).first().click();
    await page.getByRole('button', { name: /add to cart/i }).click();
    
    // Open cart drawer
    await page.getByRole('button', { name: /cart/i }).click();
    
    // Check cart drawer is visible
    const cartDrawer = page.getByRole('dialog', { name: /shopping cart|cart/i });
    await expect(cartDrawer).toBeVisible();
    
    // Check cart content
    await expect(cartDrawer.getByText(/premium wellness doll/i)).toBeVisible();
    await expect(cartDrawer.locator('text=/\\$\\d+/')).toBeVisible();
    
    // Check cart actions
    await expect(cartDrawer.getByRole('button', { name: /checkout/i })).toBeVisible();
    await expect(cartDrawer.getByRole('button', { name: /view cart/i })).toBeVisible();
  });

  test('updates item quantity in cart', async ({ page }) => {
    // Add item to cart
    await page.getByRole('link', { name: /premium wellness doll/i }).first().click();
    await page.getByRole('button', { name: /add to cart/i }).click();
    
    // Open cart
    await page.getByRole('button', { name: /cart/i }).click();
    const cartDrawer = page.getByRole('dialog', { name: /shopping cart|cart/i });
    
    // Update quantity
    const quantityInput = cartDrawer.getByLabel(/quantity/i);
    await quantityInput.fill('2');
    
    // Verify total updates
    const total = cartDrawer.locator('[data-testid="cart-total"]');
    await expect(total).toContainText(/\$\d+/);
    
    // Verify cart indicator updates
    await page.keyboard.press('Escape'); // Close cart
    const cartButton = page.getByRole('button', { name: /cart/i });
    await expect(cartButton).toContainText('2');
  });

  test('removes item from cart', async ({ page }) => {
    // Add item to cart
    await page.getByRole('link', { name: /premium wellness doll/i }).first().click();
    await page.getByRole('button', { name: /add to cart/i }).click();
    
    // Open cart
    await page.getByRole('button', { name: /cart/i }).click();
    const cartDrawer = page.getByRole('dialog', { name: /shopping cart|cart/i });
    
    // Remove item
    const removeButton = cartDrawer.getByRole('button', { name: /remove|delete/i });
    await removeButton.click();
    
    // Confirm removal if dialog appears
    const confirmButton = page.getByRole('button', { name: /confirm|yes|remove/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
    
    // Verify cart is empty
    await expect(cartDrawer.getByText(/cart is empty|no items/i)).toBeVisible();
    
    // Verify cart indicator resets
    await page.keyboard.press('Escape');
    const cartButton = page.getByRole('button', { name: /cart/i });
    await expect(cartButton).not.toContainText(/\d+/);
  });

  test('navigates to full cart page', async ({ page }) => {
    // Add item to cart
    await page.getByRole('link', { name: /premium wellness doll/i }).first().click();
    await page.getByRole('button', { name: /add to cart/i }).click();
    
    // Open cart drawer
    await page.getByRole('button', { name: /cart/i }).click();
    const cartDrawer = page.getByRole('dialog', { name: /shopping cart|cart/i });
    
    // Navigate to full cart page
    await cartDrawer.getByRole('button', { name: /view cart/i }).click();
    
    // Verify navigation
    await expect(page).toHaveURL(/.*\/cart/);
    
    // Check cart page content
    await expect(page.getByRole('heading', { name: /shopping cart/i })).toBeVisible();
    await expect(page.getByText(/premium wellness doll/i)).toBeVisible();
  });

  test('calculates totals correctly', async ({ page }) => {
    // Add multiple items
    const products = await page.locator('[data-testid="product-card"]').all();
    
    for (let i = 0; i < Math.min(2, products.length); i++) {
      const addButton = products[i].getByRole('button', { name: /add to cart/i });
      await addButton.click();
      await page.waitForTimeout(500); // Small delay between additions
    }
    
    // Open cart
    await page.getByRole('button', { name: /cart/i }).click();
    const cartDrawer = page.getByRole('dialog', { name: /shopping cart|cart/i });
    
    // Check subtotal exists
    await expect(cartDrawer.getByText(/subtotal/i)).toBeVisible();
    await expect(cartDrawer.locator('[data-testid="cart-subtotal"]')).toContainText(/\$\d+/);
    
    // Check total exists
    await expect(cartDrawer.getByText(/total/i)).toBeVisible();
    await expect(cartDrawer.locator('[data-testid="cart-total"]')).toContainText(/\$\d+/);
  });

  test('persists cart across page refreshes', async ({ page }) => {
    // Add item to cart
    await page.getByRole('link', { name: /premium wellness doll/i }).first().click();
    await page.getByRole('button', { name: /add to cart/i }).click();
    
    // Refresh page
    await page.reload();
    
    // Verify cart persists
    const cartButton = page.getByRole('button', { name: /cart/i });
    await expect(cartButton).toContainText('1');
    
    // Open cart to verify content
    await cartButton.click();
    const cartDrawer = page.getByRole('dialog', { name: /shopping cart|cart/i });
    await expect(cartDrawer.getByText(/premium wellness doll/i)).toBeVisible();
  });

  test('handles out of stock products', async ({ page }) => {
    // Navigate to a product
    await page.getByRole('link', { name: /premium wellness doll/i }).first().click();
    
    // Check if product is out of stock
    const outOfStockBadge = page.getByText(/out of stock|sold out/i);
    
    if (await outOfStockBadge.isVisible()) {
      // Add to cart button should be disabled
      const addToCartButton = page.getByRole('button', { name: /add to cart/i });
      await expect(addToCartButton).toBeDisabled();
      
      // Should show notify when available option
      await expect(
        page.getByRole('button', { name: /notify when available/i })
      ).toBeVisible();
    }
  });

  test('applies promotional codes', async ({ page }) => {
    // Add item to cart
    await page.getByRole('link', { name: /premium wellness doll/i }).first().click();
    await page.getByRole('button', { name: /add to cart/i }).click();
    
    // Go to cart page
    await page.goto('/cart');
    
    // Look for promo code input
    const promoInput = page.getByPlaceholder(/promo code|coupon|discount/i);
    
    if (await promoInput.isVisible()) {
      await promoInput.fill('TEST10');
      await page.getByRole('button', { name: /apply|submit/i }).click();
      
      // Check for discount application
      await expect(
        page.getByText(/discount applied|promo code applied/i)
      ).toBeVisible();
    }
  });

  test('proceeds to checkout', async ({ page }) => {
    // Add item to cart
    await page.getByRole('link', { name: /premium wellness doll/i }).first().click();
    await page.getByRole('button', { name: /add to cart/i }).click();
    
    // Open cart
    await page.getByRole('button', { name: /cart/i }).click();
    const cartDrawer = page.getByRole('dialog', { name: /shopping cart|cart/i });
    
    // Proceed to checkout
    await cartDrawer.getByRole('button', { name: /checkout/i }).click();
    
    // Should navigate to checkout or login
    await expect(page).toHaveURL(/.*\/(checkout|auth\/login)/);
  });

  test('handles cart errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/cart**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' }),
      });
    });
    
    // Try to add item to cart
    await page.getByRole('link', { name: /premium wellness doll/i }).first().click();
    await page.getByRole('button', { name: /add to cart/i }).click();
    
    // Should show error message
    await expect(
      page.getByText(/error adding to cart|something went wrong/i)
    ).toBeVisible();
  });
});

test.describe('Cart Accessibility', () => {
  test('cart is keyboard navigable', async ({ page }) => {
    // Add item to cart
    await page.getByRole('link', { name: /premium wellness doll/i }).first().click();
    await page.getByRole('button', { name: /add to cart/i }).click();
    
    // Navigate to cart using keyboard
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Should open cart
    
    const cartDrawer = page.getByRole('dialog', { name: /shopping cart|cart/i });
    await expect(cartDrawer).toBeVisible();
  });

  test('cart has proper ARIA labels', async ({ page }) => {
    // Add item to cart
    await page.getByRole('link', { name: /premium wellness doll/i }).first().click();
    await page.getByRole('button', { name: /add to cart/i }).click();
    
    // Open cart
    await page.getByRole('button', { name: /cart/i }).click();
    
    // Check ARIA attributes
    const cartDrawer = page.getByRole('dialog');
    await expect(cartDrawer).toHaveAttribute('aria-labelledby');
    await expect(cartDrawer).toHaveAttribute('role', 'dialog');
  });
});