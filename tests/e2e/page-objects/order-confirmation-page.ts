import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';

/**
 * Order Confirmation Page Object Model
 * 
 * Handles:
 * - Order confirmation display
 * - Order details verification
 * - Email confirmation
 * - Order tracking setup
 * - Receipt download
 * - Customer account creation
 */
export class OrderConfirmationPage extends BasePage {
  // Page header
  readonly pageTitle: Locator;
  readonly successMessage: Locator;
  readonly orderNumber: Locator;
  readonly thankYouMessage: Locator;

  // Order Information
  readonly orderDetailsSection: Locator;
  readonly orderNumberDisplay: Locator;
  readonly orderDate: Locator;
  readonly orderStatus: Locator;
  readonly estimatedDelivery: Locator;
  readonly trackingNumber: Locator;

  // Customer Information
  readonly customerInfoSection: Locator;
  readonly customerName: Locator;
  readonly customerEmail: Locator;
  readonly customerPhone: Locator;

  // Shipping Information
  readonly shippingInfoSection: Locator;
  readonly shippingAddress: Locator;
  readonly shippingMethod: Locator;
  readonly deliveryDate: Locator;

  // Billing Information
  readonly billingInfoSection: Locator;
  readonly billingAddress: Locator;
  readonly paymentMethod: Locator;
  readonly paymentStatus: Locator;

  // Order Items
  readonly orderItemsSection: Locator;
  readonly orderItems: Locator;
  readonly itemNames: Locator;
  readonly itemQuantities: Locator;
  readonly itemPrices: Locator;
  readonly itemImages: Locator;

  // Order Totals
  readonly orderTotalsSection: Locator;
  readonly subtotalAmount: Locator;
  readonly shippingAmount: Locator;
  readonly taxAmount: Locator;
  readonly discountAmount: Locator;
  readonly totalAmount: Locator;

  // Actions
  readonly printReceiptButton: Locator;
  readonly downloadReceiptButton: Locator;
  readonly emailReceiptButton: Locator;
  readonly trackOrderButton: Locator;
  readonly continueShoppingButton: Locator;
  readonly createAccountButton: Locator;
  readonly viewOrderHistoryButton: Locator;

  // Email Confirmation
  readonly emailConfirmationSection: Locator;
  readonly emailSentMessage: Locator;
  readonly emailAddress: Locator;
  readonly resendEmailButton: Locator;

  // Account Creation
  readonly accountCreationSection: Locator;
  readonly createAccountForm: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly marketingOptinCheckbox: Locator;
  readonly submitAccountButton: Locator;

  // Order Tracking
  readonly trackingSection: Locator;
  readonly trackingLink: Locator;
  readonly carrierInfo: Locator;
  readonly shippingUpdates: Locator;

  // Related Products
  readonly relatedProductsSection: Locator;
  readonly recommendedProducts: Locator;
  readonly reorderButton: Locator;

  // Customer Support
  readonly supportSection: Locator;
  readonly contactSupportLink: Locator;
  readonly faqLink: Locator;
  readonly returnPolicyLink: Locator;

  // Social Sharing
  readonly shareSection: Locator;
  readonly shareButtons: Locator;
  readonly socialMediaLinks: Locator;

  // Reviews and Feedback
  readonly reviewSection: Locator;
  readonly reviewInvitation: Locator;
  readonly feedbackForm: Locator;

  constructor(page: Page) {
    super(page);

    // Page header
    this.pageTitle = page.getByRole('heading', { name: /order confirmation|thank you|order complete/i });
    this.successMessage = page.getByText(/order placed successfully|thank you for your purchase/i);
    this.orderNumber = page.locator('[data-testid="order-number"]');
    this.thankYouMessage = page.getByText(/thank you|we appreciate/i);

    // Order Information
    this.orderDetailsSection = page.locator('[data-testid="order-details"]');
    this.orderNumberDisplay = page.locator('[data-testid="order-number-display"]');
    this.orderDate = page.locator('[data-testid="order-date"]');
    this.orderStatus = page.locator('[data-testid="order-status"]');
    this.estimatedDelivery = page.locator('[data-testid="estimated-delivery"]');
    this.trackingNumber = page.locator('[data-testid="tracking-number"]');

    // Customer Information
    this.customerInfoSection = page.locator('[data-testid="customer-info"]');
    this.customerName = page.locator('[data-testid="customer-name"]');
    this.customerEmail = page.locator('[data-testid="customer-email"]');
    this.customerPhone = page.locator('[data-testid="customer-phone"]');

    // Shipping Information
    this.shippingInfoSection = page.locator('[data-testid="shipping-info"]');
    this.shippingAddress = page.locator('[data-testid="shipping-address"]');
    this.shippingMethod = page.locator('[data-testid="shipping-method"]');
    this.deliveryDate = page.locator('[data-testid="delivery-date"]');

    // Billing Information
    this.billingInfoSection = page.locator('[data-testid="billing-info"]');
    this.billingAddress = page.locator('[data-testid="billing-address"]');
    this.paymentMethod = page.locator('[data-testid="payment-method"]');
    this.paymentStatus = page.locator('[data-testid="payment-status"]');

    // Order Items
    this.orderItemsSection = page.locator('[data-testid="order-items"]');
    this.orderItems = page.locator('[data-testid="order-item"]');
    this.itemNames = page.locator('[data-testid="item-name"]');
    this.itemQuantities = page.locator('[data-testid="item-quantity"]');
    this.itemPrices = page.locator('[data-testid="item-price"]');
    this.itemImages = page.locator('[data-testid="item-image"]');

    // Order Totals
    this.orderTotalsSection = page.locator('[data-testid="order-totals"]');
    this.subtotalAmount = page.locator('[data-testid="subtotal-amount"]');
    this.shippingAmount = page.locator('[data-testid="shipping-amount"]');
    this.taxAmount = page.locator('[data-testid="tax-amount"]');
    this.discountAmount = page.locator('[data-testid="discount-amount"]');
    this.totalAmount = page.locator('[data-testid="total-amount"]');

    // Actions
    this.printReceiptButton = page.getByRole('button', { name: /print receipt/i });
    this.downloadReceiptButton = page.getByRole('button', { name: /download receipt/i });
    this.emailReceiptButton = page.getByRole('button', { name: /email receipt/i });
    this.trackOrderButton = page.getByRole('button', { name: /track order/i });
    this.continueShoppingButton = page.getByRole('button', { name: /continue shopping/i });
    this.createAccountButton = page.getByRole('button', { name: /create account/i });
    this.viewOrderHistoryButton = page.getByRole('button', { name: /order history/i });

    // Email Confirmation
    this.emailConfirmationSection = page.locator('[data-testid="email-confirmation"]');
    this.emailSentMessage = page.getByText(/confirmation email sent|receipt emailed/i);
    this.emailAddress = page.locator('[data-testid="confirmation-email"]');
    this.resendEmailButton = page.getByRole('button', { name: /resend email/i });

    // Account Creation
    this.accountCreationSection = page.locator('[data-testid="account-creation"]');
    this.createAccountForm = page.locator('[data-testid="create-account-form"]');
    this.passwordInput = page.getByLabel(/password/i);
    this.confirmPasswordInput = page.getByLabel(/confirm password/i);
    this.marketingOptinCheckbox = page.getByLabel(/marketing|newsletter|promotions/i);
    this.submitAccountButton = page.getByRole('button', { name: /create account/i });

    // Order Tracking
    this.trackingSection = page.locator('[data-testid="tracking-section"]');
    this.trackingLink = page.getByRole('link', { name: /track your order/i });
    this.carrierInfo = page.locator('[data-testid="carrier-info"]');
    this.shippingUpdates = page.locator('[data-testid="shipping-updates"]');

    // Related Products
    this.relatedProductsSection = page.locator('[data-testid="related-products"]');
    this.recommendedProducts = page.locator('[data-testid="recommended-product"]');
    this.reorderButton = page.getByRole('button', { name: /reorder/i });

    // Customer Support
    this.supportSection = page.locator('[data-testid="support-section"]');
    this.contactSupportLink = page.getByRole('link', { name: /contact support|help/i });
    this.faqLink = page.getByRole('link', { name: /faq|questions/i });
    this.returnPolicyLink = page.getByRole('link', { name: /return policy/i });

    // Social Sharing
    this.shareSection = page.locator('[data-testid="share-section"]');
    this.shareButtons = page.locator('[data-testid="share-button"]');
    this.socialMediaLinks = page.locator('[data-testid="social-link"]');

    // Reviews and Feedback
    this.reviewSection = page.locator('[data-testid="review-section"]');
    this.reviewInvitation = page.getByText(/rate your purchase|leave a review/i);
    this.feedbackForm = page.locator('[data-testid="feedback-form"]');
  }

  /**
   * Navigate to order confirmation page
   */
  async navigate(orderNumber?: string): Promise<void> {
    const url = orderNumber ? `/order-confirmation/${orderNumber}` : '/order-confirmation';
    await this.goto(url);
  }

  /**
   * Verify order confirmation page is loaded
   */
  async verifyPageLoaded(): Promise<void> {
    await expect(this.pageTitle).toBeVisible();
    await expect(this.successMessage).toBeVisible();
    await expect(this.orderNumber).toBeVisible();
    await this.waitForLoadingToComplete();
  }

  /**
   * Get order number
   */
  async getOrderNumber(): Promise<string> {
    await expect(this.orderNumberDisplay).toBeVisible();
    return await this.getElementText(this.orderNumberDisplay);
  }

  /**
   * Verify order details
   */
  async verifyOrderDetails(expectedDetails: {
    orderNumber?: string;
    customerName: string;
    email: string;
    totalAmount: string;
  }): Promise<void> {
    if (expectedDetails.orderNumber) {
      const displayedOrderNumber = await this.getOrderNumber();
      expect(displayedOrderNumber).toContain(expectedDetails.orderNumber);
    }

    await expect(this.customerName).toContainText(expectedDetails.customerName);
    await expect(this.customerEmail).toContainText(expectedDetails.email);
    await expect(this.totalAmount).toContainText(expectedDetails.totalAmount);
  }

  /**
   * Verify email confirmation was sent
   */
  async verifyEmailConfirmationSent(): Promise<void> {
    await expect(this.emailSentMessage).toBeVisible();
    await expect(this.emailAddress).toBeVisible();
  }

  /**
   * Resend confirmation email
   */
  async resendConfirmationEmail(): Promise<void> {
    await this.clickElement(this.resendEmailButton);
    await expect(this.page.getByText(/email sent|email resent/i)).toBeVisible();
  }

  /**
   * Print receipt
   */
  async printReceipt(): Promise<void> {
    const [popup] = await Promise.all([
      this.page.waitForEvent('popup'),
      this.clickElement(this.printReceiptButton)
    ]);
    
    await popup.waitForLoadState();
    expect(popup.url()).toContain('receipt');
    await popup.close();
  }

  /**
   * Download receipt
   */
  async downloadReceipt(): Promise<void> {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.clickElement(this.downloadReceiptButton)
    ]);
    
    expect(download.suggestedFilename()).toMatch(/receipt.*\.pdf/i);
  }

  /**
   * Email receipt
   */
  async emailReceipt(): Promise<void> {
    await this.clickElement(this.emailReceiptButton);
    await expect(this.page.getByText(/receipt emailed|receipt sent/i)).toBeVisible();
  }

  /**
   * Track order
   */
  async trackOrder(): Promise<void> {
    await this.clickElement(this.trackOrderButton);
    await this.verifyUrlContains('/track');
  }

  /**
   * Continue shopping
   */
  async continueShopping(): Promise<void> {
    await this.clickElement(this.continueShoppingButton);
    await this.verifyUrlContains('/products');
  }

  /**
   * Create customer account
   */
  async createAccount(password: string, confirmPassword: string, optInMarketing: boolean = false): Promise<void> {
    if (await this.isElementVisible(this.createAccountForm)) {
      await this.fillInput(this.passwordInput, password);
      await this.fillInput(this.confirmPasswordInput, confirmPassword);
      
      if (optInMarketing) {
        await this.clickElement(this.marketingOptinCheckbox);
      }
      
      await this.clickElement(this.submitAccountButton);
      await expect(this.page.getByText(/account created|welcome/i)).toBeVisible();
    }
  }

  /**
   * Verify order items
   */
  async verifyOrderItems(expectedItemCount: number): Promise<void> {
    await expect(this.orderItems).toHaveCount(expectedItemCount);
    
    for (let i = 0; i < expectedItemCount; i++) {
      const item = this.orderItems.nth(i);
      await expect(item.locator('[data-testid="item-name"]')).toBeVisible();
      await expect(item.locator('[data-testid="item-quantity"]')).toBeVisible();
      await expect(item.locator('[data-testid="item-price"]')).toBeVisible();
    }
  }

  /**
   * Verify order totals
   */
  async verifyOrderTotals(): Promise<void> {
    await expect(this.subtotalAmount).toBeVisible();
    await expect(this.totalAmount).toBeVisible();
    
    // Verify amounts contain currency symbols
    await expect(this.subtotalAmount).toContainText(/\$\d+/);
    await expect(this.totalAmount).toContainText(/\$\d+/);
  }

  /**
   * Verify shipping information
   */
  async verifyShippingInformation(expectedAddress: string): Promise<void> {
    await expect(this.shippingAddress).toContainText(expectedAddress);
    await expect(this.shippingMethod).toBeVisible();
    await expect(this.estimatedDelivery).toBeVisible();
  }

  /**
   * Verify payment information
   */
  async verifyPaymentInformation(): Promise<void> {
    await expect(this.paymentMethod).toBeVisible();
    await expect(this.paymentStatus).toContainText(/paid|completed|authorized/i);
  }

  /**
   * Get tracking information
   */
  async getTrackingInformation(): Promise<{
    trackingNumber: string;
    carrier: string;
    estimatedDelivery: string;
  }> {
    const trackingNumber = await this.getElementText(this.trackingNumber);
    const carrier = await this.getElementText(this.carrierInfo);
    const estimatedDelivery = await this.getElementText(this.estimatedDelivery);

    return {
      trackingNumber,
      carrier,
      estimatedDelivery
    };
  }

  /**
   * Click on related product
   */
  async clickRelatedProduct(index: number = 0): Promise<void> {
    const product = this.recommendedProducts.nth(index);
    await this.clickElement(product);
    await this.verifyUrlContains('/products/');
  }

  /**
   * Reorder items
   */
  async reorder(): Promise<void> {
    await this.clickElement(this.reorderButton);
    await this.verifyUrlContains('/cart');
  }

  /**
   * Access customer support
   */
  async contactSupport(): Promise<void> {
    await this.clickElement(this.contactSupportLink);
    await this.verifyUrlContains('/support');
  }

  /**
   * View order history
   */
  async viewOrderHistory(): Promise<void> {
    await this.clickElement(this.viewOrderHistoryButton);
    await this.verifyUrlContains('/account/orders');
  }

  /**
   * Share order on social media
   */
  async shareOnSocialMedia(platform: 'facebook' | 'twitter' | 'instagram'): Promise<void> {
    const shareButton = this.shareButtons.filter({ hasText: new RegExp(platform, 'i') });
    const [popup] = await Promise.all([
      this.page.waitForEvent('popup'),
      this.clickElement(shareButton)
    ]);
    
    await popup.waitForLoadState();
    expect(popup.url()).toContain(platform);
    await popup.close();
  }

  /**
   * Leave product review
   */
  async leaveProductReview(): Promise<void> {
    await this.clickElement(this.reviewInvitation);
    await this.verifyUrlContains('/review');
  }

  /**
   * Verify order status
   */
  async verifyOrderStatus(expectedStatus: string): Promise<void> {
    await expect(this.orderStatus).toContainText(expectedStatus);
  }

  /**
   * Check for discount applied
   */
  async verifyDiscountApplied(): Promise<boolean> {
    return await this.isElementVisible(this.discountAmount);
  }

  /**
   * Get order date
   */
  async getOrderDate(): Promise<string> {
    return await this.getElementText(this.orderDate);
  }

  /**
   * Verify all order confirmation elements
   */
  async verifyCompleteOrderConfirmation(): Promise<void> {
    // Verify main sections are visible
    await expect(this.orderDetailsSection).toBeVisible();
    await expect(this.customerInfoSection).toBeVisible();
    await expect(this.shippingInfoSection).toBeVisible();
    await expect(this.orderItemsSection).toBeVisible();
    await expect(this.orderTotalsSection).toBeVisible();

    // Verify action buttons are available
    await expect(this.continueShoppingButton).toBeVisible();
    await expect(this.trackOrderButton).toBeVisible();

    // Verify email confirmation
    await this.verifyEmailConfirmationSent();
  }

  /**
   * Verify order security and authenticity
   */
  async verifyOrderSecurity(): Promise<void> {
    // Check that order number follows expected format
    const orderNum = await this.getOrderNumber();
    expect(orderNum).toMatch(/^[A-Z0-9]{6,12}$/);

    // Verify secure page (HTTPS)
    expect(this.page.url()).toMatch(/^https:/);

    // Check that sensitive payment info is masked
    const paymentText = await this.getElementText(this.paymentMethod);
    expect(paymentText).not.toMatch(/\d{16}/); // Full card number should not be visible
  }
}