import { Page, Locator } from '@playwright/test';

export class CartPage {
  readonly page: Page;
  readonly url: string;
  readonly cartItems: Locator;
  readonly cartTotal: Locator;
  readonly subtotal: Locator;
  readonly shipping: Locator;
  readonly tax: Locator;
  readonly checkoutButton: Locator;
  readonly continueShoppingButton: Locator;
  readonly promoCodeInput: Locator;
  readonly applyPromoButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.url = `${process.env.BASE_URL || 'http://localhost:3000'}/cart`;
    this.cartItems = page.locator('[data-testid="cart-item"]');
    this.cartTotal = page.locator('[data-testid="cart-total"]');
    this.subtotal = page.locator('[data-testid="cart-subtotal"]');
    this.shipping = page.locator('[data-testid="cart-shipping"]');
    this.tax = page.locator('[data-testid="cart-tax"]');
    this.checkoutButton = page.locator('[data-testid="checkout-button"]');
    this.continueShoppingButton = page.locator('[data-testid="continue-shopping"]');
    this.promoCodeInput = page.locator('[data-testid="promo-code-input"]');
    this.applyPromoButton = page.locator('[data-testid="apply-promo"]');
  }

  async goto() {
    await this.page.goto(this.url);
  }

  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
    // Wait for cart items to load or empty cart message
    await this.page.waitForSelector('[data-testid="cart-item"], [data-testid="empty-cart"]');
  }

  async getCartItemCount(): Promise<number> {
    return await this.cartItems.count();
  }

  async updateQuantity(itemIndex: number, newQuantity: number) {
    const item = this.cartItems.nth(itemIndex);
    const quantityInput = item.locator('[data-testid="quantity-input"]');
    
    await quantityInput.fill(newQuantity.toString());
    await quantityInput.press('Enter');
    await this.page.waitForLoadState('networkidle');
  }

  async removeItem(itemIndex: number) {
    const item = this.cartItems.nth(itemIndex);
    const removeButton = item.locator('[data-testid="remove-item"]');
    
    await removeButton.click();
    
    // Wait for confirmation dialog if it appears
    const confirmDialog = this.page.locator('[data-testid="confirm-remove"]');
    if (await confirmDialog.isVisible()) {
      await this.page.locator('[data-testid="confirm-yes"]').click();
    }
    
    await this.page.waitForLoadState('networkidle');
  }

  async moveToWishlist(itemIndex: number) {
    const item = this.cartItems.nth(itemIndex);
    const moveButton = item.locator('[data-testid="move-to-wishlist"]');
    
    await moveButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async getItemDetails(itemIndex: number) {
    const item = this.cartItems.nth(itemIndex);
    
    const name = await item.locator('[data-testid="item-name"]').textContent();
    const price = await item.locator('[data-testid="item-price"]').textContent();
    const quantity = await item.locator('[data-testid="quantity-input"]').inputValue();
    const total = await item.locator('[data-testid="item-total"]').textContent();
    
    return { name, price, quantity: parseInt(quantity), total };
  }

  async getTotals() {
    const subtotal = await this.subtotal.textContent() || '$0.00';
    const shipping = await this.shipping.textContent() || '$0.00';
    const tax = await this.tax.textContent() || '$0.00';
    const total = await this.cartTotal.textContent() || '$0.00';
    
    return { subtotal, shipping, tax, total };
  }

  async applyPromoCode(code: string) {
    await this.promoCodeInput.fill(code);
    await this.applyPromoButton.click();
    
    // Wait for either success or error message
    await this.page.waitForSelector('[data-testid="promo-success"], [data-testid="promo-error"]');
  }

  async proceedToCheckout() {
    await this.checkoutButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async continueShopping() {
    await this.continueShoppingButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async isEmpty(): Promise<boolean> {
    const emptyMessage = this.page.locator('[data-testid="empty-cart"]');
    return await emptyMessage.isVisible();
  }

  async saveForLater(itemIndex: number) {
    const item = this.cartItems.nth(itemIndex);
    const saveButton = item.locator('[data-testid="save-for-later"]');
    
    await saveButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async updateShippingEstimate(zipCode: string) {
    const zipInput = this.page.locator('[data-testid="shipping-zip"]');
    const estimateButton = this.page.locator('[data-testid="estimate-shipping"]');
    
    await zipInput.fill(zipCode);
    await estimateButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async selectShippingOption(option: string) {
    const shippingOption = this.page.locator(`[data-testid="shipping-${option}"]`);
    await shippingOption.click();
    await this.page.waitForLoadState('networkidle');
  }

  async getEstimatedDelivery(): Promise<string> {
    const delivery = this.page.locator('[data-testid="estimated-delivery"]');
    return await delivery.textContent() || '';
  }

  async isCheckoutDisabled(): Promise<boolean> {
    return await this.checkoutButton.isDisabled();
  }

  async getPromoDiscount(): Promise<string> {
    const discount = this.page.locator('[data-testid="promo-discount"]');
    if (await discount.isVisible()) {
      return await discount.textContent() || '';
    }
    return '';
  }

  async removePromoCode() {
    const removePromo = this.page.locator('[data-testid="remove-promo"]');
    if (await removePromo.isVisible()) {
      await removePromo.click();
      await this.page.waitForLoadState('networkidle');
    }
  }
}