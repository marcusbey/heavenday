import { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly url: string;
  readonly heroSection: Locator;
  readonly featuredProducts: Locator;
  readonly categoryShowcase: Locator;
  readonly searchInput: Locator;
  readonly cartIcon: Locator;
  readonly navigationMenu: Locator;

  constructor(page: Page) {
    this.page = page;
    this.url = process.env.BASE_URL || 'http://localhost:3000';
    this.heroSection = page.locator('[data-testid="hero-section"]');
    this.featuredProducts = page.locator('[data-testid="featured-products"]');
    this.categoryShowcase = page.locator('[data-testid="category-showcase"]');
    this.searchInput = page.locator('[data-testid="search-input"]');
    this.cartIcon = page.locator('[data-testid="cart-icon"]');
    this.navigationMenu = page.locator('[data-testid="navigation-menu"]');
  }

  async goto() {
    await this.page.goto(this.url);
  }

  async waitForLoad() {
    await this.heroSection.waitFor();
    await this.featuredProducts.waitFor();
    await this.page.waitForLoadState('networkidle');
  }

  async clickFeaturedProduct(index: number) {
    const product = this.featuredProducts.locator('[data-testid="product-card"]').nth(index);
    await product.click();
  }

  async searchForProduct(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToCategory(categoryName: string) {
    const categoryLink = this.categoryShowcase.locator(`[data-testid="category-${categoryName.toLowerCase()}"]`);
    await categoryLink.click();
    await this.page.waitForLoadState('networkidle');
  }

  async openCart() {
    await this.cartIcon.click();
  }

  async getCartCount(): Promise<string> {
    const cartCount = this.page.locator('[data-testid="cart-count"]');
    return await cartCount.textContent() || '0';
  }

  async openMobileMenu() {
    const mobileToggle = this.page.locator('[data-testid="mobile-menu-toggle"]');
    await mobileToggle.click();
  }

  async navigateToPage(pageName: string) {
    const link = this.navigationMenu.locator(`[data-testid="nav-${pageName.toLowerCase()}"]`);
    await link.click();
    await this.page.waitForLoadState('networkidle');
  }

  async scrollToSection(sectionName: string) {
    const section = this.page.locator(`[data-testid="${sectionName}"]`);
    await section.scrollIntoViewIfNeeded();
  }

  async verifyTrustSignals() {
    const trustBadges = this.page.locator('[data-testid="trust-badges"]');
    await trustBadges.waitFor();
    return trustBadges.isVisible();
  }

  async subscribeToNewsletter(email: string) {
    const emailInput = this.page.locator('[data-testid="newsletter-email"]');
    const submitButton = this.page.locator('[data-testid="newsletter-submit"]');
    
    await emailInput.fill(email);
    await submitButton.click();
    
    const successMessage = this.page.locator('[data-testid="newsletter-success"]');
    await successMessage.waitFor();
  }
}