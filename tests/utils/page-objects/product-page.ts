import { Page, Locator } from '@playwright/test';

export class ProductPage {
  readonly page: Page;
  readonly productTitle: Locator;
  readonly productPrice: Locator;
  readonly productImages: Locator;
  readonly mainImage: Locator;
  readonly thumbnails: Locator;
  readonly addToCartButton: Locator;
  readonly addToWishlistButton: Locator;
  readonly quantitySelector: Locator;
  readonly variantSelectors: Locator;
  readonly productDescription: Locator;
  readonly reviewsSection: Locator;
  readonly relatedProducts: Locator;

  constructor(page: Page) {
    this.page = page;
    this.productTitle = page.locator('[data-testid="product-title"]');
    this.productPrice = page.locator('[data-testid="product-price"]');
    this.productImages = page.locator('[data-testid="product-images"]');
    this.mainImage = page.locator('[data-testid="main-product-image"]');
    this.thumbnails = page.locator('[data-testid="image-thumbnail"]');
    this.addToCartButton = page.locator('[data-testid="add-to-cart"]');
    this.addToWishlistButton = page.locator('[data-testid="add-to-wishlist"]');
    this.quantitySelector = page.locator('[data-testid="quantity-selector"]');
    this.variantSelectors = page.locator('[data-testid^="variant-"]');
    this.productDescription = page.locator('[data-testid="product-description"]');
    this.reviewsSection = page.locator('[data-testid="reviews-section"]');
    this.relatedProducts = page.locator('[data-testid="related-products"]');
  }

  async waitForLoad() {
    await this.productTitle.waitFor();
    await this.productPrice.waitFor();
    await this.productImages.waitFor();
    await this.page.waitForLoadState('networkidle');
  }

  async getProductTitle(): Promise<string> {
    return await this.productTitle.textContent() || '';
  }

  async getProductPrice(): Promise<string> {
    return await this.productPrice.textContent() || '';
  }

  async clickImageThumbnail(index: number) {
    await this.thumbnails.nth(index).click();
    await this.page.waitForTimeout(500); // Wait for image transition
  }

  async zoomMainImage() {
    await this.mainImage.hover();
    await this.mainImage.click();
  }

  async selectVariant(variantType: string, value: string) {
    const variantSelector = this.page.locator(`[data-testid="variant-${variantType.toLowerCase()}"]`);
    await variantSelector.selectOption(value);
  }

  async setQuantity(quantity: number) {
    await this.quantitySelector.fill(quantity.toString());
  }

  async addToCart() {
    await this.addToCartButton.click();
    
    // Wait for success notification or cart update
    const notification = this.page.locator('[data-testid="cart-notification"]');
    await notification.waitFor({ timeout: 5000 }).catch(() => {
      // If no notification, just wait for network idle
      return this.page.waitForLoadState('networkidle');
    });
  }

  async addToWishlist() {
    await this.addToWishlistButton.click();
    
    const notification = this.page.locator('[data-testid="wishlist-notification"]');
    await notification.waitFor({ timeout: 5000 }).catch(() => {
      return this.page.waitForLoadState('networkidle');
    });
  }

  async scrollToReviews() {
    await this.reviewsSection.scrollIntoViewIfNeeded();
  }

  async writeReview(rating: number, title: string, content: string) {
    const writeReviewButton = this.page.locator('[data-testid="write-review-button"]');
    await writeReviewButton.click();

    const modal = this.page.locator('[data-testid="review-modal"]');
    await modal.waitFor();

    // Set rating
    const stars = this.page.locator('[data-testid="rating-star"]');
    await stars.nth(rating - 1).click();

    // Fill review form
    await this.page.locator('[data-testid="review-title"]').fill(title);
    await this.page.locator('[data-testid="review-content"]').fill(content);

    // Submit review
    await this.page.locator('[data-testid="submit-review"]').click();
    
    // Wait for modal to close
    await modal.waitFor({ state: 'hidden' });
  }

  async clickRelatedProduct(index: number) {
    const relatedProduct = this.relatedProducts.locator('[data-testid="product-card"]').nth(index);
    await relatedProduct.click();
    await this.waitForLoad();
  }

  async shareProduct(platform: string) {
    const shareButton = this.page.locator('[data-testid="share-button"]');
    await shareButton.click();

    const shareModal = this.page.locator('[data-testid="share-modal"]');
    await shareModal.waitFor();

    const platformButton = this.page.locator(`[data-testid="share-${platform}"]`);
    await platformButton.click();
  }

  async viewFullScreenImages() {
    await this.mainImage.click();
    
    const lightbox = this.page.locator('[data-testid="image-lightbox"]');
    await lightbox.waitFor();
    
    return lightbox;
  }

  async closeLightbox() {
    const closeButton = this.page.locator('[data-testid="lightbox-close"]');
    await closeButton.click();
  }

  async getAvailabilityStatus(): Promise<string> {
    const status = this.page.locator('[data-testid="availability-status"]');
    return await status.textContent() || '';
  }

  async getDeliveryEstimate(): Promise<string> {
    const estimate = this.page.locator('[data-testid="delivery-estimate"]');
    return await estimate.textContent() || '';
  }

  async viewProductSpecs() {
    const specsTab = this.page.locator('[data-testid="specs-tab"]');
    await specsTab.click();
    
    const specsContent = this.page.locator('[data-testid="specs-content"]');
    await specsContent.waitFor();
  }

  async viewCareInstructions() {
    const careTab = this.page.locator('[data-testid="care-tab"]');
    await careTab.click();
    
    const careContent = this.page.locator('[data-testid="care-content"]');
    await careContent.waitFor();
  }
}