import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';

export class CartPage extends BasePage {
  // Cart elements
  readonly cartTitle: Locator;
  readonly cartItems: Locator;
  readonly cartItem: Locator;
  readonly emptyCartMessage: Locator;
  readonly continueShopping: Locator;

  // Cart item elements
  readonly itemImage: Locator;
  readonly itemTitle: Locator;
  readonly itemPrice: Locator;
  readonly itemQuantity: Locator;
  readonly itemSubtotal: Locator;
  readonly removeItemButton: Locator;
  readonly updateQuantityButton: Locator;

  // Cart totals
  readonly subtotal: Locator;
  readonly shippingCost: Locator;
  readonly taxAmount: Locator;
  readonly discountAmount: Locator;
  readonly totalAmount: Locator;

  // Promotion codes
  readonly promoCodeInput: Locator;
  readonly applyPromoButton: Locator;
  readonly promoCodeError: Locator;
  readonly promoCodeSuccess: Locator;
  readonly removePromoButton: Locator;

  // Shipping options
  readonly shippingSelector: Locator;
  readonly standardShipping: Locator;
  readonly expressShipping: Locator;
  readonly overnightShipping: Locator;

  // Cart actions
  readonly checkoutButton: Locator;
  readonly updateCartButton: Locator;
  readonly clearCartButton: Locator;
  readonly saveForLaterButton: Locator;

  // Cart drawer (mobile)
  readonly cartDrawer: Locator;
  readonly cartDrawerClose: Locator;
  readonly viewCartButton: Locator;

  // Quantity controls
  readonly quantityInput: Locator;
  readonly increaseQuantity: Locator;
  readonly decreaseQuantity: Locator;

  // Notifications
  readonly successMessage: Locator;
  readonly errorMessage: Locator;
  readonly confirmDialog: Locator;

  constructor(page: Page) {
    super(page);

    // Cart elements
    this.cartTitle = page.getByRole('heading', { name: /shopping cart|cart/i });
    this.cartItems = page.locator('[data-testid="cart-items"]');
    this.cartItem = page.locator('[data-testid="cart-item"]');
    this.emptyCartMessage = page.getByText(/cart is empty|no items/i);
    this.continueShopping = page.getByRole('link', { name: /continue shopping/i });

    // Cart item elements
    this.itemImage = page.locator('[data-testid="cart-item-image"]');
    this.itemTitle = page.locator('[data-testid="cart-item-title"]');
    this.itemPrice = page.locator('[data-testid="cart-item-price"]');
    this.itemQuantity = page.locator('[data-testid="cart-item-quantity"]');
    this.itemSubtotal = page.locator('[data-testid="cart-item-subtotal"]');
    this.removeItemButton = page.getByRole('button', { name: /remove|delete/i });
    this.updateQuantityButton = page.getByRole('button', { name: /update/i });

    // Cart totals
    this.subtotal = page.locator('[data-testid="cart-subtotal"]');
    this.shippingCost = page.locator('[data-testid="shipping-cost"]');
    this.taxAmount = page.locator('[data-testid="tax-amount"]');
    this.discountAmount = page.locator('[data-testid="discount-amount"]');
    this.totalAmount = page.locator('[data-testid="cart-total"]');

    // Promotion codes
    this.promoCodeInput = page.getByPlaceholder(/promo code|coupon|discount/i);
    this.applyPromoButton = page.getByRole('button', { name: /apply|submit/i });
    this.promoCodeError = page.getByText(/invalid code|expired|not found/i);
    this.promoCodeSuccess = page.getByText(/discount applied|promo code applied/i);
    this.removePromoButton = page.getByRole('button', { name: /remove discount/i });

    // Shipping options
    this.shippingSelector = page.locator('[data-testid="shipping-selector"]');
    this.standardShipping = page.locator('[data-shipping="standard"]');
    this.expressShipping = page.locator('[data-shipping="express"]');
    this.overnightShipping = page.locator('[data-shipping="overnight"]');

    // Cart actions
    this.checkoutButton = page.getByRole('button', { name: /checkout|proceed to checkout/i });
    this.updateCartButton = page.getByRole('button', { name: /update cart/i });
    this.clearCartButton = page.getByRole('button', { name: /clear cart|empty cart/i });
    this.saveForLaterButton = page.getByRole('button', { name: /save for later/i });

    // Cart drawer
    this.cartDrawer = page.getByRole('dialog', { name: /shopping cart|cart/i });
    this.cartDrawerClose = page.getByRole('button', { name: /close cart/i });
    this.viewCartButton = page.getByRole('button', { name: /view cart/i });

    // Quantity controls
    this.quantityInput = page.getByLabel(/quantity/i);
    this.increaseQuantity = page.getByRole('button', { name: /increase|\+/i });
    this.decreaseQuantity = page.getByRole('button', { name: /decrease|\-/i });

    // Notifications
    this.successMessage = page.getByText(/updated|removed|applied/i);
    this.errorMessage = page.getByText(/error|failed|something went wrong/i);
    this.confirmDialog = page.getByRole('dialog', { name: /confirm|delete/i });
  }

  /**
   * Navigate to cart page
   */
  async navigate(): Promise<void> {
    await this.goto('/cart');
  }

  /**
   * Open cart drawer
   */
  async openCartDrawer(): Promise<void> {
    await this.clickElement(this.page.getByRole('button', { name: /cart/i }));
    await expect(this.cartDrawer).toBeVisible();
  }

  /**
   * Close cart drawer
   */
  async closeCartDrawer(): Promise<void> {
    await this.clickElement(this.cartDrawerClose);
    await expect(this.cartDrawer).not.toBeVisible();
  }

  /**
   * Navigate from drawer to full cart page
   */
  async navigateToFullCart(): Promise<void> {
    await this.clickElement(this.viewCartButton);
    await this.verifyUrlContains('/cart');
  }

  /**
   * Verify cart page is loaded
   */
  async verifyPageLoaded(): Promise<void> {
    await expect(this.cartTitle).toBeVisible();
    await this.waitForLoadingToComplete();
  }

  /**
   * Verify cart is empty
   */
  async verifyEmptyCart(): Promise<void> {
    await expect(this.emptyCartMessage).toBeVisible();
    await expect(this.continueShopping).toBeVisible();
  }

  /**
   * Verify cart has items
   */
  async verifyCartHasItems(): Promise<void> {
    await expect(this.cartItems).toBeVisible();
    await expect(this.cartItem).toHaveCount.greaterThan(0);
  }

  /**
   * Get cart item count
   */
  async getCartItemCount(): Promise<number> {
    return await this.cartItem.count();
  }

  /**
   * Verify cart item details
   */
  async verifyCartItemDetails(itemIndex: number = 0): Promise<void> {
    const item = this.cartItem.nth(itemIndex);
    await expect(item.locator('[data-testid="cart-item-image"]')).toBeVisible();
    await expect(item.locator('[data-testid="cart-item-title"]')).toBeVisible();
    await expect(item.locator('[data-testid="cart-item-price"]')).toBeVisible();
    await expect(item.locator('[data-testid="cart-item-quantity"]')).toBeVisible();
  }

  /**
   * Update item quantity
   */
  async updateItemQuantity(itemIndex: number, quantity: number): Promise<void> {
    const item = this.cartItem.nth(itemIndex);
    const quantityInput = item.locator('[data-testid="quantity-input"]');
    
    await this.fillInput(quantityInput, quantity.toString());
    
    // Wait for auto-update or click update button if present
    const updateButton = item.locator('[data-testid="update-quantity"]');
    if (await this.isElementVisible(updateButton)) {
      await this.clickElement(updateButton);
    }
    
    await this.waitForLoadingToComplete();
  }

  /**
   * Increase item quantity
   */
  async increaseItemQuantity(itemIndex: number): Promise<void> {
    const item = this.cartItem.nth(itemIndex);
    const increaseButton = item.getByRole('button', { name: /increase|\+/i });
    await this.clickElement(increaseButton);
    await this.waitForLoadingToComplete();
  }

  /**
   * Decrease item quantity
   */
  async decreaseItemQuantity(itemIndex: number): Promise<void> {
    const item = this.cartItem.nth(itemIndex);
    const decreaseButton = item.getByRole('button', { name: /decrease|\-/i });
    await this.clickElement(decreaseButton);
    await this.waitForLoadingToComplete();
  }

  /**
   * Remove item from cart
   */
  async removeCartItem(itemIndex: number): Promise<void> {
    const item = this.cartItem.nth(itemIndex);
    const removeButton = item.getByRole('button', { name: /remove|delete/i });
    
    await this.clickElement(removeButton);
    
    // Handle confirmation dialog if it appears
    const confirmButton = this.page.getByRole('button', { name: /confirm|yes|remove/i });
    if (await this.isElementVisible(confirmButton)) {
      await this.clickElement(confirmButton);
    }
    
    await this.waitForLoadingToComplete();
  }

  /**
   * Apply promo code
   */
  async applyPromoCode(code: string): Promise<void> {
    await this.fillInput(this.promoCodeInput, code);
    await this.clickElement(this.applyPromoButton);
    await this.waitForLoadingToComplete();
  }

  /**
   * Verify promo code applied successfully
   */
  async verifyPromoCodeApplied(): Promise<void> {
    await expect(this.promoCodeSuccess).toBeVisible();
    await expect(this.discountAmount).toBeVisible();
    await expect(this.removePromoButton).toBeVisible();
  }

  /**
   * Verify promo code error
   */
  async verifyPromoCodeError(): Promise<void> {
    await expect(this.promoCodeError).toBeVisible();
  }

  /**
   * Remove promo code
   */
  async removePromoCode(): Promise<void> {
    await this.clickElement(this.removePromoButton);
    await this.waitForLoadingToComplete();
  }

  /**
   * Select shipping option
   */
  async selectShippingOption(option: 'standard' | 'express' | 'overnight'): Promise<void> {
    const shippingMap = {
      standard: this.standardShipping,
      express: this.expressShipping,
      overnight: this.overnightShipping
    };

    await this.clickElement(shippingMap[option]);
    await this.waitForLoadingToComplete();
  }

  /**
   * Verify cart totals
   */
  async verifyCartTotals(): Promise<void> {
    await expect(this.subtotal).toBeVisible();
    await expect(this.subtotal).toContainText(/\$\d+/);
    
    await expect(this.totalAmount).toBeVisible();
    await expect(this.totalAmount).toContainText(/\$\d+/);
  }

  /**
   * Get subtotal amount
   */
  async getSubtotal(): Promise<string> {
    return await this.getElementText(this.subtotal);
  }

  /**
   * Get total amount
   */
  async getTotalAmount(): Promise<string> {
    return await this.getElementText(this.totalAmount);
  }

  /**
   * Proceed to checkout
   */
  async proceedToCheckout(): Promise<void> {
    await this.clickElement(this.checkoutButton);
    await this.page.waitForURL(/.*\/(checkout|auth\/login)/);
  }

  /**
   * Clear entire cart
   */
  async clearCart(): Promise<void> {
    if (await this.isElementVisible(this.clearCartButton)) {
      await this.clickElement(this.clearCartButton);
      
      // Handle confirmation dialog
      const confirmButton = this.page.getByRole('button', { name: /confirm|yes|clear/i });
      if (await this.isElementVisible(confirmButton)) {
        await this.clickElement(confirmButton);
      }
      
      await this.waitForLoadingToComplete();
      await this.verifyEmptyCart();
    }
  }

  /**
   * Continue shopping
   */
  async continueShopping(): Promise<void> {
    await this.clickElement(this.continueShopping);
    await this.verifyUrlContains('/products');
  }

  /**
   * Save item for later
   */
  async saveItemForLater(itemIndex: number): Promise<void> {
    const item = this.cartItem.nth(itemIndex);
    const saveButton = item.getByRole('button', { name: /save for later/i });
    
    if (await this.isElementVisible(saveButton)) {
      await this.clickElement(saveButton);
      await this.waitForLoadingToComplete();
    }
  }

  /**
   * Verify cart persistence after page refresh
   */
  async verifyCartPersistence(): Promise<void> {
    const itemCountBefore = await this.getCartItemCount();
    await this.page.reload();
    await this.verifyPageLoaded();
    const itemCountAfter = await this.getCartItemCount();
    
    expect(itemCountAfter).toBe(itemCountBefore);
  }

  /**
   * Verify cart item by product name
   */
  async verifyCartItemByName(productName: string): Promise<void> {
    const item = this.cartItem.filter({ hasText: productName });
    await expect(item).toBeVisible();
  }

  /**
   * Update cart (if manual update is required)
   */
  async updateCart(): Promise<void> {
    if (await this.isElementVisible(this.updateCartButton)) {
      await this.clickElement(this.updateCartButton);
      await this.waitForLoadingToComplete();
    }
  }

  /**
   * Verify shipping calculation
   */
  async verifyShippingCalculation(): Promise<void> {
    if (await this.isElementVisible(this.shippingCost)) {
      await expect(this.shippingCost).toContainText(/\$\d+|free/i);
    }
  }

  /**
   * Verify tax calculation
   */
  async verifyTaxCalculation(): Promise<void> {
    if (await this.isElementVisible(this.taxAmount)) {
      await expect(this.taxAmount).toContainText(/\$\d+/);
    }
  }
}