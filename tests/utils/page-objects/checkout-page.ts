import { Page, Locator } from '@playwright/test';

interface ShippingInfo {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  city: string;
  zipCode: string;
  country: string;
  state?: string;
  phone?: string;
}

interface PaymentInfo {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName: string;
}

export class CheckoutPage {
  readonly page: Page;
  readonly url: string;
  readonly shippingForm: Locator;
  readonly paymentForm: Locator;
  readonly orderSummary: Locator;
  readonly placeOrderButton: Locator;
  readonly backToCartButton: Locator;
  readonly guestCheckoutButton: Locator;
  readonly loginForm: Locator;

  constructor(page: Page) {
    this.page = page;
    this.url = `${process.env.BASE_URL || 'http://localhost:3000'}/checkout`;
    this.shippingForm = page.locator('[data-testid="shipping-form"]');
    this.paymentForm = page.locator('[data-testid="payment-form"]');
    this.orderSummary = page.locator('[data-testid="order-summary"]');
    this.placeOrderButton = page.locator('[data-testid="place-order"]');
    this.backToCartButton = page.locator('[data-testid="back-to-cart"]');
    this.guestCheckoutButton = page.locator('[data-testid="guest-checkout"]');
    this.loginForm = page.locator('[data-testid="login-form"]');
  }

  async goto() {
    await this.page.goto(this.url);
  }

  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
    await this.orderSummary.waitFor();
  }

  async chooseGuestCheckout() {
    if (await this.guestCheckoutButton.isVisible()) {
      await this.guestCheckoutButton.click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  async loginExistingUser(email: string, password: string) {
    if (await this.loginForm.isVisible()) {
      await this.page.locator('[data-testid="login-email"]').fill(email);
      await this.page.locator('[data-testid="login-password"]').fill(password);
      await this.page.locator('[data-testid="login-submit"]').click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  async fillShippingInfo(info: ShippingInfo) {
    await this.page.locator('[data-testid="first-name"]').fill(info.firstName);
    await this.page.locator('[data-testid="last-name"]').fill(info.lastName);
    await this.page.locator('[data-testid="email"]').fill(info.email);
    await this.page.locator('[data-testid="address"]').fill(info.address);
    await this.page.locator('[data-testid="city"]').fill(info.city);
    await this.page.locator('[data-testid="zip-code"]').fill(info.zipCode);
    await this.page.locator('[data-testid="country"]').selectOption(info.country);
    
    if (info.state) {
      await this.page.locator('[data-testid="state"]').selectOption(info.state);
    }
    
    if (info.phone) {
      await this.page.locator('[data-testid="phone"]').fill(info.phone);
    }
  }

  async selectShippingMethod(method: string) {
    const shippingOption = this.page.locator(`[data-testid="shipping-${method}"]`);
    await shippingOption.click();
    await this.page.waitForLoadState('networkidle');
  }

  async fillPaymentInfo(info: PaymentInfo) {
    await this.page.locator('[data-testid="card-number"]').fill(info.cardNumber);
    await this.page.locator('[data-testid="expiry-date"]').fill(info.expiryDate);
    await this.page.locator('[data-testid="cvv"]').fill(info.cvv);
    await this.page.locator('[data-testid="cardholder-name"]').fill(info.cardholderName);
  }

  async selectPaymentMethod(method: string) {
    const paymentMethod = this.page.locator(`[data-testid="payment-${method}"]`);
    await paymentMethod.click();
  }

  async setBillingAddressSameAsShipping(same: boolean) {
    const checkbox = this.page.locator('[data-testid="billing-same-as-shipping"]');
    if (same) {
      await checkbox.check();
    } else {
      await checkbox.uncheck();
    }
  }

  async fillBillingAddress(info: ShippingInfo) {
    await this.page.locator('[data-testid="billing-first-name"]').fill(info.firstName);
    await this.page.locator('[data-testid="billing-last-name"]').fill(info.lastName);
    await this.page.locator('[data-testid="billing-address"]').fill(info.address);
    await this.page.locator('[data-testid="billing-city"]').fill(info.city);
    await this.page.locator('[data-testid="billing-zip-code"]').fill(info.zipCode);
    await this.page.locator('[data-testid="billing-country"]').selectOption(info.country);
    
    if (info.state) {
      await this.page.locator('[data-testid="billing-state"]').selectOption(info.state);
    }
  }

  async getOrderSummary() {
    const items = await this.page.locator('[data-testid="summary-item"]').count();
    const subtotal = await this.page.locator('[data-testid="summary-subtotal"]').textContent();
    const shipping = await this.page.locator('[data-testid="summary-shipping"]').textContent();
    const tax = await this.page.locator('[data-testid="summary-tax"]').textContent();
    const total = await this.page.locator('[data-testid="summary-total"]').textContent();
    
    return { items, subtotal, shipping, tax, total };
  }

  async reviewOrder() {
    const reviewButton = this.page.locator('[data-testid="review-order"]');
    if (await reviewButton.isVisible()) {
      await reviewButton.click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  async acceptTermsAndConditions() {
    const termsCheckbox = this.page.locator('[data-testid="accept-terms"]');
    await termsCheckbox.check();
  }

  async subscribeToNewsletter(subscribe: boolean) {
    const newsletterCheckbox = this.page.locator('[data-testid="subscribe-newsletter"]');
    if (subscribe) {
      await newsletterCheckbox.check();
    } else {
      await newsletterCheckbox.uncheck();
    }
  }

  async placeOrder() {
    await this.placeOrderButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async completeOrder() {
    // Fill required fields if not already filled
    await this.acceptTermsAndConditions();
    await this.placeOrder();
  }

  async submitWithoutData() {
    await this.placeOrderButton.click();
    // Don't wait for navigation as form validation should prevent submission
  }

  async backToCart() {
    await this.backToCartButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async getValidationErrors() {
    const errors = await this.page.locator('[data-testid$="-error"]').all();
    const errorMessages = [];
    
    for (const error of errors) {
      if (await error.isVisible()) {
        const message = await error.textContent();
        errorMessages.push(message);
      }
    }
    
    return errorMessages;
  }

  async isPlaceOrderDisabled(): Promise<boolean> {
    return await this.placeOrderButton.isDisabled();
  }

  async getShippingOptions() {
    const options = await this.page.locator('[data-testid^="shipping-"]').all();
    const shippingMethods = [];
    
    for (const option of options) {
      const text = await option.textContent();
      const value = await option.getAttribute('data-testid');
      shippingMethods.push({ text, value });
    }
    
    return shippingMethods;
  }

  async applyDiscountCode(code: string) {
    const discountInput = this.page.locator('[data-testid="discount-code"]');
    const applyButton = this.page.locator('[data-testid="apply-discount"]');
    
    await discountInput.fill(code);
    await applyButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async getEstimatedDeliveryDate(): Promise<string> {
    const deliveryDate = this.page.locator('[data-testid="estimated-delivery-date"]');
    return await deliveryDate.textContent() || '';
  }

  async saveShippingAddress() {
    const saveAddressCheckbox = this.page.locator('[data-testid="save-shipping-address"]');
    await saveAddressCheckbox.check();
  }

  async savePaymentMethod() {
    const savePaymentCheckbox = this.page.locator('[data-testid="save-payment-method"]');
    await savePaymentCheckbox.check();
  }

  async createAccount(password: string, confirmPassword: string) {
    const createAccountCheckbox = this.page.locator('[data-testid="create-account"]');
    await createAccountCheckbox.check();
    
    await this.page.locator('[data-testid="account-password"]').fill(password);
    await this.page.locator('[data-testid="confirm-password"]').fill(confirmPassword);
  }
}