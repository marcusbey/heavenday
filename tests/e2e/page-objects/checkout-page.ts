import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';

/**
 * Comprehensive Checkout Page Object Model
 * 
 * Handles:
 * - Guest checkout flow
 * - Registered user checkout
 * - Shipping information
 * - Payment processing
 * - Order confirmation
 * - Error handling
 */
export class CheckoutPage extends BasePage {
  // Page header
  readonly pageTitle: Locator;
  readonly securityBadge: Locator;
  readonly progressSteps: Locator;

  // Shipping Information
  readonly shippingSection: Locator;
  readonly shippingTitle: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly addressLine1Input: Locator;
  readonly addressLine2Input: Locator;
  readonly cityInput: Locator;
  readonly stateSelect: Locator;
  readonly zipCodeInput: Locator;
  readonly countrySelect: Locator;

  // Billing Information
  readonly billingSection: Locator;
  readonly sameAsShippingCheckbox: Locator;
  readonly billingFirstNameInput: Locator;
  readonly billingLastNameInput: Locator;
  readonly billingAddressLine1Input: Locator;
  readonly billingAddressLine2Input: Locator;
  readonly billingCityInput: Locator;
  readonly billingStateSelect: Locator;
  readonly billingZipCodeInput: Locator;
  readonly billingCountrySelect: Locator;

  // Shipping Options
  readonly shippingOptionsSection: Locator;
  readonly standardShippingOption: Locator;
  readonly expressShippingOption: Locator;
  readonly overnightShippingOption: Locator;
  readonly shippingDateEstimate: Locator;

  // Payment Information
  readonly paymentSection: Locator;
  readonly paymentMethodTabs: Locator;
  readonly creditCardTab: Locator;
  readonly paypalTab: Locator;
  readonly applePayTab: Locator;
  readonly googlePayTab: Locator;
  
  // Credit Card Fields
  readonly cardNumberInput: Locator;
  readonly expiryDateInput: Locator;
  readonly cvvInput: Locator;
  readonly cardholderNameInput: Locator;
  readonly saveCardCheckbox: Locator;

  // PayPal
  readonly paypalButton: Locator;
  readonly paypalModal: Locator;

  // Digital Wallets
  readonly applePayButton: Locator;
  readonly googlePayButton: Locator;

  // Order Summary
  readonly orderSummarySection: Locator;
  readonly orderItems: Locator;
  readonly subtotalAmount: Locator;
  readonly shippingAmount: Locator;
  readonly taxAmount: Locator;
  readonly discountAmount: Locator;
  readonly totalAmount: Locator;
  readonly promoCodeInput: Locator;
  readonly applyPromoButton: Locator;

  // Legal and Terms
  readonly termsCheckbox: Locator;
  readonly privacyCheckbox: Locator;
  readonly marketingOptinCheckbox: Locator;
  readonly ageVerificationCheckbox: Locator;

  // Actions
  readonly backToCartButton: Locator;
  readonly continueButton: Locator;
  readonly placeOrderButton: Locator;
  readonly editOrderButton: Locator;

  // Guest Options
  readonly guestCheckoutOption: Locator;
  readonly createAccountOption: Locator;
  readonly loginLink: Locator;

  // Saved Information
  readonly savedAddresses: Locator;
  readonly savedPaymentMethods: Locator;
  readonly addNewAddressButton: Locator;
  readonly addNewPaymentButton: Locator;

  // Error Messages
  readonly errorMessages: Locator;
  readonly fieldErrors: Locator;
  readonly paymentErrors: Locator;
  readonly shippingErrors: Locator;

  // Loading States
  readonly loadingSpinner: Locator;
  readonly processingPayment: Locator;
  readonly validatingAddress: Locator;

  // Security Features
  readonly sslCertificate: Locator;
  readonly securityFeatures: Locator;
  readonly encryptionNotice: Locator;

  constructor(page: Page) {
    super(page);

    // Page header
    this.pageTitle = page.getByRole('heading', { name: /checkout|secure checkout/i });
    this.securityBadge = page.locator('[data-testid="security-badge"]');
    this.progressSteps = page.locator('[data-testid="checkout-progress"]');

    // Shipping Information
    this.shippingSection = page.locator('[data-testid="shipping-section"]');
    this.shippingTitle = page.getByRole('heading', { name: /shipping information/i });
    this.firstNameInput = page.getByLabel(/first name/i);
    this.lastNameInput = page.getByLabel(/last name/i);
    this.emailInput = page.getByLabel(/email/i);
    this.phoneInput = page.getByLabel(/phone/i);
    this.addressLine1Input = page.getByLabel(/address line 1|street address/i);
    this.addressLine2Input = page.getByLabel(/address line 2|apartment/i);
    this.cityInput = page.getByLabel(/city/i);
    this.stateSelect = page.getByLabel(/state|province/i);
    this.zipCodeInput = page.getByLabel(/zip code|postal code/i);
    this.countrySelect = page.getByLabel(/country/i);

    // Billing Information
    this.billingSection = page.locator('[data-testid="billing-section"]');
    this.sameAsShippingCheckbox = page.getByLabel(/same as shipping|billing same/i);
    this.billingFirstNameInput = page.locator('[data-testid="billing-first-name"]');
    this.billingLastNameInput = page.locator('[data-testid="billing-last-name"]');
    this.billingAddressLine1Input = page.locator('[data-testid="billing-address-1"]');
    this.billingAddressLine2Input = page.locator('[data-testid="billing-address-2"]');
    this.billingCityInput = page.locator('[data-testid="billing-city"]');
    this.billingStateSelect = page.locator('[data-testid="billing-state"]');
    this.billingZipCodeInput = page.locator('[data-testid="billing-zip"]');
    this.billingCountrySelect = page.locator('[data-testid="billing-country"]');

    // Shipping Options
    this.shippingOptionsSection = page.locator('[data-testid="shipping-options"]');
    this.standardShippingOption = page.getByRole('radio', { name: /standard/i });
    this.expressShippingOption = page.getByRole('radio', { name: /express/i });
    this.overnightShippingOption = page.getByRole('radio', { name: /overnight/i });
    this.shippingDateEstimate = page.locator('[data-testid="delivery-estimate"]');

    // Payment Information
    this.paymentSection = page.locator('[data-testid="payment-section"]');
    this.paymentMethodTabs = page.locator('[data-testid="payment-methods"]');
    this.creditCardTab = page.getByRole('tab', { name: /credit card/i });
    this.paypalTab = page.getByRole('tab', { name: /paypal/i });
    this.applePayTab = page.getByRole('tab', { name: /apple pay/i });
    this.googlePayTab = page.getByRole('tab', { name: /google pay/i });

    // Credit Card Fields
    this.cardNumberInput = page.getByLabel(/card number/i);
    this.expiryDateInput = page.getByLabel(/expiry|expiration/i);
    this.cvvInput = page.getByLabel(/cvv|security code/i);
    this.cardholderNameInput = page.getByLabel(/cardholder name|name on card/i);
    this.saveCardCheckbox = page.getByLabel(/save card|remember card/i);

    // PayPal
    this.paypalButton = page.getByRole('button', { name: /pay with paypal/i });
    this.paypalModal = page.locator('[data-testid="paypal-modal"]');

    // Digital Wallets
    this.applePayButton = page.getByRole('button', { name: /apple pay/i });
    this.googlePayButton = page.getByRole('button', { name: /google pay/i });

    // Order Summary
    this.orderSummarySection = page.locator('[data-testid="order-summary"]');
    this.orderItems = page.locator('[data-testid="order-item"]');
    this.subtotalAmount = page.locator('[data-testid="subtotal-amount"]');
    this.shippingAmount = page.locator('[data-testid="shipping-amount"]');
    this.taxAmount = page.locator('[data-testid="tax-amount"]');
    this.discountAmount = page.locator('[data-testid="discount-amount"]');
    this.totalAmount = page.locator('[data-testid="total-amount"]');
    this.promoCodeInput = page.getByPlaceholder(/promo code|discount code/i);
    this.applyPromoButton = page.getByRole('button', { name: /apply/i });

    // Legal and Terms
    this.termsCheckbox = page.getByLabel(/terms and conditions|terms of service/i);
    this.privacyCheckbox = page.getByLabel(/privacy policy/i);
    this.marketingOptinCheckbox = page.getByLabel(/marketing|newsletter|promotions/i);
    this.ageVerificationCheckbox = page.getByLabel(/age verification|18 years/i);

    // Actions
    this.backToCartButton = page.getByRole('button', { name: /back to cart/i });
    this.continueButton = page.getByRole('button', { name: /continue/i });
    this.placeOrderButton = page.getByRole('button', { name: /place order|complete purchase/i });
    this.editOrderButton = page.getByRole('button', { name: /edit order/i });

    // Guest Options
    this.guestCheckoutOption = page.getByRole('radio', { name: /guest checkout/i });
    this.createAccountOption = page.getByRole('radio', { name: /create account/i });
    this.loginLink = page.getByRole('link', { name: /login|sign in/i });

    // Saved Information
    this.savedAddresses = page.locator('[data-testid="saved-addresses"]');
    this.savedPaymentMethods = page.locator('[data-testid="saved-payments"]');
    this.addNewAddressButton = page.getByRole('button', { name: /add new address/i });
    this.addNewPaymentButton = page.getByRole('button', { name: /add new payment/i });

    // Error Messages
    this.errorMessages = page.locator('[data-testid="error-message"]');
    this.fieldErrors = page.locator('[data-testid="field-error"]');
    this.paymentErrors = page.locator('[data-testid="payment-error"]');
    this.shippingErrors = page.locator('[data-testid="shipping-error"]');

    // Loading States
    this.loadingSpinner = page.locator('[data-testid="loading"]');
    this.processingPayment = page.getByText(/processing payment/i);
    this.validatingAddress = page.getByText(/validating address/i);

    // Security Features
    this.sslCertificate = page.locator('[data-testid="ssl-certificate"]');
    this.securityFeatures = page.locator('[data-testid="security-features"]');
    this.encryptionNotice = page.getByText(/secure|encrypted|protected/i);
  }

  /**
   * Navigate to checkout page
   */
  async navigate(): Promise<void> {
    await this.goto('/checkout');
  }

  /**
   * Verify checkout page is loaded
   */
  async verifyPageLoaded(): Promise<void> {
    await expect(this.pageTitle).toBeVisible();
    await expect(this.orderSummarySection).toBeVisible();
    await this.waitForLoadingToComplete();
  }

  /**
   * Select guest checkout
   */
  async selectGuestCheckout(): Promise<void> {
    if (await this.isElementVisible(this.guestCheckoutOption)) {
      await this.clickElement(this.guestCheckoutOption);
    }
  }

  /**
   * Fill shipping information
   */
  async fillShippingInformation(shippingInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  }): Promise<void> {
    await this.fillInput(this.firstNameInput, shippingInfo.firstName);
    await this.fillInput(this.lastNameInput, shippingInfo.lastName);
    await this.fillInput(this.emailInput, shippingInfo.email);
    await this.fillInput(this.phoneInput, shippingInfo.phone);
    await this.fillInput(this.addressLine1Input, shippingInfo.address1);
    
    if (shippingInfo.address2) {
      await this.fillInput(this.addressLine2Input, shippingInfo.address2);
    }
    
    await this.fillInput(this.cityInput, shippingInfo.city);
    await this.selectDropdownOption(this.stateSelect, shippingInfo.state);
    await this.fillInput(this.zipCodeInput, shippingInfo.zipCode);
    await this.selectDropdownOption(this.countrySelect, shippingInfo.country);
  }

  /**
   * Select dropdown option
   */
  private async selectDropdownOption(dropdown: Locator, option: string): Promise<void> {
    await this.clickElement(dropdown);
    await this.page.getByRole('option', { name: option }).click();
  }

  /**
   * Select shipping method
   */
  async selectShippingMethod(method: 'standard' | 'express' | 'overnight'): Promise<void> {
    const methodMap = {
      standard: this.standardShippingOption,
      express: this.expressShippingOption,
      overnight: this.overnightShippingOption
    };

    await this.clickElement(methodMap[method]);
    await this.waitForLoadingToComplete();
  }

  /**
   * Toggle same as shipping address for billing
   */
  async useSameShippingAddress(useSame: boolean = true): Promise<void> {
    const isChecked = await this.sameAsShippingCheckbox.isChecked();
    if (useSame !== isChecked) {
      await this.clickElement(this.sameAsShippingCheckbox);
    }
  }

  /**
   * Fill billing information
   */
  async fillBillingInformation(billingInfo: {
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  }): Promise<void> {
    await this.useSameShippingAddress(false);
    
    await this.fillInput(this.billingFirstNameInput, billingInfo.firstName);
    await this.fillInput(this.billingLastNameInput, billingInfo.lastName);
    await this.fillInput(this.billingAddressLine1Input, billingInfo.address1);
    
    if (billingInfo.address2) {
      await this.fillInput(this.billingAddressLine2Input, billingInfo.address2);
    }
    
    await this.fillInput(this.billingCityInput, billingInfo.city);
    await this.selectDropdownOption(this.billingStateSelect, billingInfo.state);
    await this.fillInput(this.billingZipCodeInput, billingInfo.zipCode);
    await this.selectDropdownOption(this.billingCountrySelect, billingInfo.country);
  }

  /**
   * Select payment method
   */
  async selectPaymentMethod(method: 'credit-card' | 'paypal' | 'apple-pay' | 'google-pay'): Promise<void> {
    const methodMap = {
      'credit-card': this.creditCardTab,
      'paypal': this.paypalTab,
      'apple-pay': this.applePayTab,
      'google-pay': this.googlePayTab
    };

    await this.clickElement(methodMap[method]);
  }

  /**
   * Fill credit card information
   */
  async fillCreditCardInformation(cardInfo: {
    number: string;
    expiry: string;
    cvv: string;
    name: string;
    saveCard?: boolean;
  }): Promise<void> {
    await this.selectPaymentMethod('credit-card');
    
    await this.fillInput(this.cardNumberInput, cardInfo.number);
    await this.fillInput(this.expiryDateInput, cardInfo.expiry);
    await this.fillInput(this.cvvInput, cardInfo.cvv);
    await this.fillInput(this.cardholderNameInput, cardInfo.name);

    if (cardInfo.saveCard && await this.isElementVisible(this.saveCardCheckbox)) {
      await this.clickElement(this.saveCardCheckbox);
    }
  }

  /**
   * Accept terms and conditions
   */
  async acceptTermsAndConditions(): Promise<void> {
    if (await this.isElementVisible(this.termsCheckbox)) {
      await this.clickElement(this.termsCheckbox);
    }
    
    if (await this.isElementVisible(this.ageVerificationCheckbox)) {
      await this.clickElement(this.ageVerificationCheckbox);
    }
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
   * Verify order total
   */
  async verifyOrderTotal(): Promise<string> {
    await expect(this.totalAmount).toBeVisible();
    return await this.getElementText(this.totalAmount);
  }

  /**
   * Place order
   */
  async placeOrder(): Promise<void> {
    await this.clickElement(this.placeOrderButton);
    await expect(this.processingPayment).toBeVisible();
    
    // Wait for processing to complete
    await this.page.waitForURL(/.*\/(confirmation|thank-you|order-complete)/, { timeout: 60000 });
  }

  /**
   * Complete guest checkout flow
   */
  async completeGuestCheckout(orderDetails: {
    shipping: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      address1: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
    payment: {
      number: string;
      expiry: string;
      cvv: string;
      name: string;
    };
    shippingMethod?: 'standard' | 'express' | 'overnight';
  }): Promise<void> {
    await this.verifyPageLoaded();
    await this.selectGuestCheckout();
    
    // Fill shipping information
    await this.fillShippingInformation(orderDetails.shipping);
    
    // Select shipping method
    if (orderDetails.shippingMethod) {
      await this.selectShippingMethod(orderDetails.shippingMethod);
    }
    
    // Fill payment information
    await this.fillCreditCardInformation(orderDetails.payment);
    
    // Accept terms
    await this.acceptTermsAndConditions();
    
    // Place order
    await this.placeOrder();
  }

  /**
   * Verify checkout security features
   */
  async verifySecurityFeatures(): Promise<void> {
    await expect(this.securityBadge).toBeVisible();
    await expect(this.encryptionNotice).toBeVisible();
    
    // Check SSL certificate indicator
    const url = this.page.url();
    expect(url).toMatch(/https:/);
  }

  /**
   * Handle PayPal payment
   */
  async payWithPayPal(): Promise<void> {
    await this.selectPaymentMethod('paypal');
    await this.clickElement(this.paypalButton);
    
    // Handle PayPal modal or redirect
    await expect(this.paypalModal).toBeVisible();
    
    // Note: In real tests, you would handle the PayPal authentication flow
    // For E2E tests, you might use PayPal sandbox credentials
  }

  /**
   * Handle Apple Pay
   */
  async payWithApplePay(): Promise<void> {
    await this.selectPaymentMethod('apple-pay');
    await this.clickElement(this.applePayButton);
    
    // Apple Pay would trigger native payment sheet
    // In E2E tests, this might be mocked
  }

  /**
   * Handle Google Pay
   */
  async payWithGooglePay(): Promise<void> {
    await this.selectPaymentMethod('google-pay');
    await this.clickElement(this.googlePayButton);
    
    // Google Pay would trigger payment flow
    // In E2E tests, this might be mocked
  }

  /**
   * Verify field validation errors
   */
  async verifyFieldValidationErrors(): Promise<void> {
    await expect(this.fieldErrors.first()).toBeVisible();
  }

  /**
   * Clear form and start over
   */
  async clearForm(): Promise<void> {
    await this.page.reload();
    await this.verifyPageLoaded();
  }

  /**
   * Go back to cart
   */
  async goBackToCart(): Promise<void> {
    await this.clickElement(this.backToCartButton);
    await this.verifyUrlContains('/cart');
  }

  /**
   * Select saved address
   */
  async selectSavedAddress(addressName: string): Promise<void> {
    const addressOption = this.savedAddresses.getByText(addressName);
    await this.clickElement(addressOption);
  }

  /**
   * Select saved payment method
   */
  async selectSavedPaymentMethod(methodName: string): Promise<void> {
    const paymentOption = this.savedPaymentMethods.getByText(methodName);
    await this.clickElement(paymentOption);
  }

  /**
   * Verify order items in summary
   */
  async verifyOrderItems(): Promise<void> {
    await expect(this.orderItems.first()).toBeVisible();
    const itemCount = await this.orderItems.count();
    expect(itemCount).toBeGreaterThan(0);
  }

  /**
   * Verify checkout progress steps
   */
  async verifyProgressSteps(): Promise<void> {
    await expect(this.progressSteps).toBeVisible();
  }

  /**
   * Handle address validation
   */
  async handleAddressValidation(): Promise<void> {
    // Wait for address validation to complete
    if (await this.isElementVisible(this.validatingAddress)) {
      await expect(this.validatingAddress).not.toBeVisible({ timeout: 10000 });
    }
  }
}