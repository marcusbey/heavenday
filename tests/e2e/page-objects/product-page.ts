import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';

export class ProductPage extends BasePage {
  // Product details
  readonly productTitle: Locator;
  readonly productPrice: Locator;
  readonly productComparePrice: Locator;
  readonly productDescription: Locator;
  readonly productSku: Locator;
  readonly productBrand: Locator;
  readonly productCategory: Locator;
  readonly stockStatus: Locator;
  readonly outOfStockBadge: Locator;

  // Product images
  readonly productImage: Locator;
  readonly imageGallery: Locator;
  readonly imageGalleryThumbnails: Locator;
  readonly zoomButton: Locator;

  // Product actions
  readonly addToCartButton: Locator;
  readonly addToWishlistButton: Locator;
  readonly notifyWhenAvailableButton: Locator;
  readonly quantityInput: Locator;
  readonly quantityIncreaseButton: Locator;
  readonly quantityDecreaseButton: Locator;

  // Product variants
  readonly variantSelector: Locator;
  readonly colorSelector: Locator;
  readonly sizeSelector: Locator;

  // Product tabs
  readonly descriptionTab: Locator;
  readonly specificationsTab: Locator;
  readonly reviewsTab: Locator;
  readonly shippingTab: Locator;

  // Reviews section
  readonly reviewsSection: Locator;
  readonly averageRating: Locator;
  readonly reviewCount: Locator;
  readonly writeReviewButton: Locator;
  readonly reviewForm: Locator;
  readonly reviewsList: Locator;

  // Related products
  readonly relatedProducts: Locator;
  readonly relatedProductCards: Locator;

  // Notifications
  readonly successMessage: Locator;
  readonly errorMessage: Locator;

  // Breadcrumb
  readonly breadcrumb: Locator;

  constructor(page: Page) {
    super(page);

    // Product details
    this.productTitle = page.getByRole('heading', { level: 1 });
    this.productPrice = page.locator('[data-testid="product-price"]');
    this.productComparePrice = page.locator('[data-testid="compare-price"]');
    this.productDescription = page.locator('[data-testid="product-description"]');
    this.productSku = page.locator('[data-testid="product-sku"]');
    this.productBrand = page.locator('[data-testid="product-brand"]');
    this.productCategory = page.locator('[data-testid="product-category"]');
    this.stockStatus = page.locator('[data-testid="stock-status"]');
    this.outOfStockBadge = page.getByText(/out of stock|sold out/i);

    // Product images
    this.productImage = page.locator('[data-testid="product-image"]');
    this.imageGallery = page.locator('[data-testid="image-gallery"]');
    this.imageGalleryThumbnails = page.locator('[data-testid="gallery-thumbnail"]');
    this.zoomButton = page.getByRole('button', { name: /zoom|enlarge/i });

    // Product actions
    this.addToCartButton = page.getByRole('button', { name: /add to cart/i });
    this.addToWishlistButton = page.getByRole('button', { name: /add to wishlist|wishlist/i });
    this.notifyWhenAvailableButton = page.getByRole('button', { name: /notify when available/i });
    this.quantityInput = page.locator('[data-testid="quantity-input"]');
    this.quantityIncreaseButton = page.getByRole('button', { name: /increase quantity|\+/i });
    this.quantityDecreaseButton = page.getByRole('button', { name: /decrease quantity|\-/i });

    // Product variants
    this.variantSelector = page.locator('[data-testid="variant-selector"]');
    this.colorSelector = page.locator('[data-testid="color-selector"]');
    this.sizeSelector = page.locator('[data-testid="size-selector"]');

    // Product tabs
    this.descriptionTab = page.getByRole('tab', { name: /description/i });
    this.specificationsTab = page.getByRole('tab', { name: /specifications/i });
    this.reviewsTab = page.getByRole('tab', { name: /reviews/i });
    this.shippingTab = page.getByRole('tab', { name: /shipping/i });

    // Reviews section
    this.reviewsSection = page.locator('[data-testid="reviews-section"]');
    this.averageRating = page.locator('[data-testid="average-rating"]');
    this.reviewCount = page.locator('[data-testid="review-count"]');
    this.writeReviewButton = page.getByRole('button', { name: /write review|add review/i });
    this.reviewForm = page.locator('[data-testid="review-form"]');
    this.reviewsList = page.locator('[data-testid="reviews-list"]');

    // Related products
    this.relatedProducts = page.locator('[data-testid="related-products"]');
    this.relatedProductCards = page.locator('[data-testid="related-product-card"]');

    // Notifications
    this.successMessage = page.getByText(/added to cart|item added|success/i);
    this.errorMessage = page.getByText(/error|failed|something went wrong/i);

    // Breadcrumb
    this.breadcrumb = page.locator('[data-testid="breadcrumb"]');
  }

  /**
   * Navigate to product page by slug
   */
  async navigateToProduct(slug: string): Promise<void> {
    await this.goto(`/products/${slug}`);
  }

  /**
   * Verify product page is loaded
   */
  async verifyPageLoaded(): Promise<void> {
    await expect(this.productTitle).toBeVisible();
    await expect(this.productPrice).toBeVisible();
    await expect(this.addToCartButton).toBeVisible();
    await this.waitForLoadingToComplete();
  }

  /**
   * Verify product details
   */
  async verifyProductDetails(): Promise<void> {
    await expect(this.productTitle).toBeVisible();
    await expect(this.productPrice).toBeVisible();
    await expect(this.productDescription).toBeVisible();
    await expect(this.productImage).toBeVisible();
  }

  /**
   * Add product to cart
   */
  async addToCart(quantity: number = 1): Promise<void> {
    // Set quantity if different from 1
    if (quantity > 1) {
      await this.setQuantity(quantity);
    }

    await this.clickElement(this.addToCartButton);
    await expect(this.successMessage).toBeVisible();
  }

  /**
   * Add product to wishlist
   */
  async addToWishlist(): Promise<void> {
    await this.clickElement(this.addToWishlistButton);
    await expect(this.page.getByText(/added to wishlist/i)).toBeVisible();
  }

  /**
   * Set product quantity
   */
  async setQuantity(quantity: number): Promise<void> {
    await this.fillInput(this.quantityInput, quantity.toString());
  }

  /**
   * Increase quantity
   */
  async increaseQuantity(): Promise<void> {
    await this.clickElement(this.quantityIncreaseButton);
  }

  /**
   * Decrease quantity
   */
  async decreaseQuantity(): Promise<void> {
    await this.clickElement(this.quantityDecreaseButton);
  }

  /**
   * Select product variant
   */
  async selectVariant(variantName: string): Promise<void> {
    await this.clickElement(this.variantSelector);
    await this.clickElement(this.page.getByText(variantName));
  }

  /**
   * Select product color
   */
  async selectColor(colorName: string): Promise<void> {
    await this.clickElement(this.colorSelector.locator(`[data-color="${colorName}"]`));
  }

  /**
   * Select product size
   */
  async selectSize(sizeName: string): Promise<void> {
    await this.clickElement(this.sizeSelector.locator(`[data-size="${sizeName}"]`));
  }

  /**
   * Navigate through image gallery
   */
  async navigateImageGallery(): Promise<void> {
    const thumbnailCount = await this.imageGalleryThumbnails.count();
    
    for (let i = 0; i < Math.min(3, thumbnailCount); i++) {
      await this.clickElement(this.imageGalleryThumbnails.nth(i));
      await this.page.waitForTimeout(500); // Allow image to load
    }
  }

  /**
   * Zoom product image
   */
  async zoomImage(): Promise<void> {
    if (await this.isElementVisible(this.zoomButton)) {
      await this.clickElement(this.zoomButton);
      // Verify zoom overlay appears
      await expect(this.page.locator('[data-testid="image-zoom-overlay"]')).toBeVisible();
    }
  }

  /**
   * Switch to product tab
   */
  async switchToTab(tabName: 'description' | 'specifications' | 'reviews' | 'shipping'): Promise<void> {
    const tabMap = {
      description: this.descriptionTab,
      specifications: this.specificationsTab,
      reviews: this.reviewsTab,
      shipping: this.shippingTab
    };

    await this.clickElement(tabMap[tabName]);
    
    // Verify tab content is visible
    const tabPanelMap = {
      description: '[data-testid="description-panel"]',
      specifications: '[data-testid="specifications-panel"]',
      reviews: '[data-testid="reviews-panel"]',
      shipping: '[data-testid="shipping-panel"]'
    };

    await expect(this.page.locator(tabPanelMap[tabName])).toBeVisible();
  }

  /**
   * Write a product review
   */
  async writeReview(rating: number, title: string, comment: string): Promise<void> {
    await this.switchToTab('reviews');
    await this.clickElement(this.writeReviewButton);
    
    // Fill review form
    await this.page.locator('[data-testid="rating-input"]').click();
    await this.page.locator(`[data-rating="${rating}"]`).click();
    await this.fillInput(this.page.locator('[data-testid="review-title"]'), title);
    await this.fillInput(this.page.locator('[data-testid="review-comment"]'), comment);
    
    // Submit review
    await this.clickElement(this.page.getByRole('button', { name: /submit review/i }));
    await expect(this.page.getByText(/review submitted|thank you/i)).toBeVisible();
  }

  /**
   * Verify product is out of stock
   */
  async verifyOutOfStock(): Promise<void> {
    await expect(this.outOfStockBadge).toBeVisible();
    await expect(this.addToCartButton).toBeDisabled();
    await expect(this.notifyWhenAvailableButton).toBeVisible();
  }

  /**
   * Sign up for stock notification
   */
  async signUpForStockNotification(email: string): Promise<void> {
    await this.clickElement(this.notifyWhenAvailableButton);
    await this.fillInput(this.page.locator('[data-testid="notification-email"]'), email);
    await this.clickElement(this.page.getByRole('button', { name: /notify me/i }));
    await expect(this.page.getByText(/we'll notify you/i)).toBeVisible();
  }

  /**
   * Verify related products
   */
  async verifyRelatedProducts(): Promise<void> {
    await this.scrollToElement(this.relatedProducts);
    await expect(this.relatedProducts).toBeVisible();
    await expect(this.relatedProductCards).toHaveCount.greaterThan(0);
  }

  /**
   * Click related product
   */
  async clickRelatedProduct(index: number = 0): Promise<void> {
    await this.scrollToElement(this.relatedProducts);
    await this.clickElement(this.relatedProductCards.nth(index));
  }

  /**
   * Verify breadcrumb navigation
   */
  async verifyBreadcrumb(): Promise<void> {
    await expect(this.breadcrumb).toBeVisible();
    await expect(this.breadcrumb.getByRole('link', { name: /home/i })).toBeVisible();
    await expect(this.breadcrumb.getByRole('link', { name: /products/i })).toBeVisible();
  }

  /**
   * Navigate using breadcrumb
   */
  async navigateViaBreadcrumb(linkName: string): Promise<void> {
    await this.clickElement(this.breadcrumb.getByRole('link', { name: new RegExp(linkName, 'i') }));
  }

  /**
   * Get product price
   */
  async getProductPrice(): Promise<string> {
    return await this.getElementText(this.productPrice);
  }

  /**
   * Get product title
   */
  async getProductTitle(): Promise<string> {
    return await this.getElementText(this.productTitle);
  }

  /**
   * Verify product specifications
   */
  async verifySpecifications(): Promise<void> {
    await this.switchToTab('specifications');
    await expect(this.page.locator('[data-testid="specifications-table"]')).toBeVisible();
  }

  /**
   * Verify shipping information
   */
  async verifyShippingInfo(): Promise<void> {
    await this.switchToTab('shipping');
    await expect(this.page.locator('[data-testid="shipping-info"]')).toBeVisible();
  }
}