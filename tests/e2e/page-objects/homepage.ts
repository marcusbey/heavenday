import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';

export class HomePage extends BasePage {
  // Header elements
  readonly logo: Locator;
  readonly navigationMenu: Locator;
  readonly searchInput: Locator;
  readonly cartButton: Locator;
  readonly wishlistButton: Locator;
  readonly userMenuButton: Locator;
  readonly mobileMenuButton: Locator;

  // Hero section
  readonly heroSection: Locator;
  readonly heroTitle: Locator;
  readonly heroDescription: Locator;
  readonly heroCTA: Locator;

  // Featured products
  readonly featuredSection: Locator;
  readonly featuredTitle: Locator;
  readonly productCards: Locator;
  readonly productCard: Locator;

  // Categories showcase
  readonly categoriesSection: Locator;
  readonly categoriesTitle: Locator;
  readonly categoryLinks: Locator;

  // Footer
  readonly footer: Locator;
  readonly footerLinks: Locator;

  // Navigation links
  readonly shopLink: Locator;
  readonly categoriesLink: Locator;
  readonly aboutLink: Locator;

  constructor(page: Page) {
    super(page);

    // Header elements
    this.logo = page.getByAltText('Heaven Dolls');
    this.navigationMenu = page.getByRole('navigation');
    this.searchInput = page.getByPlaceholder(/search products/i);
    this.cartButton = page.getByRole('button', { name: /cart/i });
    this.wishlistButton = page.getByRole('button', { name: /wishlist/i });
    this.userMenuButton = page.getByRole('button', { name: /user menu|profile/i });
    this.mobileMenuButton = page.getByRole('button', { name: /menu/i });

    // Navigation links
    this.shopLink = page.getByRole('link', { name: 'Shop' });
    this.categoriesLink = page.getByRole('link', { name: 'Categories' });
    this.aboutLink = page.getByRole('link', { name: 'About' });

    // Hero section
    this.heroSection = page.locator('[data-testid="hero-section"]');
    this.heroTitle = page.getByRole('heading', { level: 1 });
    this.heroDescription = page.getByText(/discover trending adult wellness products/i);
    this.heroCTA = page.getByRole('link', { name: /shop now|explore products/i });

    // Featured products
    this.featuredSection = page.locator('[data-testid="featured-section"]');
    this.featuredTitle = page.getByRole('heading', { name: /featured products|trending now/i });
    this.productCards = page.locator('[data-testid="product-card"]');
    this.productCard = this.productCards.first();

    // Categories showcase
    this.categoriesSection = page.locator('[data-testid="categories-section"]');
    this.categoriesTitle = page.getByRole('heading', { name: /shop by category|categories/i });
    this.categoryLinks = page.locator('[data-testid="category-link"]');

    // Footer
    this.footer = page.getByRole('contentinfo');
    this.footerLinks = this.footer.getByRole('link');
  }

  /**
   * Navigate to homepage
   */
  async navigate(): Promise<void> {
    await this.goto('/');
  }

  /**
   * Verify homepage is loaded
   */
  async verifyPageLoaded(): Promise<void> {
    await expect(this.logo).toBeVisible();
    await expect(this.heroTitle).toBeVisible();
    await this.waitForLoadingToComplete();
  }

  /**
   * Verify header elements are visible
   */
  async verifyHeaderElements(): Promise<void> {
    await expect(this.page.getByRole('banner')).toBeVisible();
    await expect(this.logo).toBeVisible();
    await expect(this.shopLink).toBeVisible();
    await expect(this.categoriesLink).toBeVisible();
    await expect(this.aboutLink).toBeVisible();
    await expect(this.searchInput).toBeVisible();
    await expect(this.cartButton).toBeVisible();
    await expect(this.wishlistButton).toBeVisible();
  }

  /**
   * Verify hero section
   */
  async verifyHeroSection(): Promise<void> {
    await expect(this.heroTitle).toBeVisible();
    await expect(this.heroDescription).toBeVisible();
    await expect(this.heroCTA).toBeVisible();
  }

  /**
   * Click hero CTA and verify navigation
   */
  async clickHeroCTA(): Promise<void> {
    await this.clickElement(this.heroCTA);
    await this.verifyUrlContains('/products');
  }

  /**
   * Verify featured products section
   */
  async verifyFeaturedProducts(): Promise<void> {
    await expect(this.featuredTitle).toBeVisible();
    await expect(this.productCards).toHaveCount.greaterThan(0);
    
    // Verify first product card content
    await expect(this.productCard.getByRole('img')).toBeVisible();
    await expect(this.productCard.locator('text=/\$\d+/').first()).toBeVisible();
    await expect(this.productCard.getByRole('link')).toBeVisible();
  }

  /**
   * Verify categories showcase
   */
  async verifyCategoriesShowcase(): Promise<void> {
    await expect(this.categoriesTitle).toBeVisible();
    await expect(this.page.getByRole('link', { name: /wellness/i })).toBeVisible();
    await expect(this.page.getByRole('link', { name: /adult/i })).toBeVisible();
  }

  /**
   * Navigate to category
   */
  async navigateToCategory(categoryName: string): Promise<void> {
    await this.clickElement(this.page.getByRole('link', { name: new RegExp(categoryName, 'i') }));
    await this.verifyUrlContains(`/categories/${categoryName.toLowerCase()}`);
  }

  /**
   * Verify footer
   */
  async verifyFooter(): Promise<void> {
    await this.scrollToElement(this.footer);
    await expect(this.footer).toBeVisible();
    await expect(this.footer.getByRole('link', { name: /privacy policy/i })).toBeVisible();
    await expect(this.footer.getByRole('link', { name: /terms of service/i })).toBeVisible();
    await expect(this.footer.getByRole('link', { name: /contact/i })).toBeVisible();
  }

  /**
   * Perform search
   */
  async performSearch(query: string): Promise<void> {
    await this.fillInput(this.searchInput, query);
    await this.page.keyboard.press('Enter');
    await this.verifyUrlContains(`/search?q=${encodeURIComponent(query)}`);
  }

  /**
   * Open mobile menu
   */
  async openMobileMenu(): Promise<void> {
    await this.clickElement(this.mobileMenuButton);
    const mobileMenu = this.page.getByTestId('mobile-menu');
    await expect(mobileMenu).toBeVisible();
  }

  /**
   * Verify mobile menu navigation
   */
  async verifyMobileMenuNavigation(): Promise<void> {
    const mobileMenu = this.page.getByTestId('mobile-menu');
    await expect(mobileMenu.getByRole('link', { name: 'Shop' })).toBeVisible();
    await expect(mobileMenu.getByRole('link', { name: 'Categories' })).toBeVisible();
  }

  /**
   * Get cart item count
   */
  async getCartItemCount(): Promise<string | null> {
    try {
      return await this.cartButton.textContent();
    } catch {
      return null;
    }
  }

  /**
   * Click product card
   */
  async clickFirstProduct(): Promise<void> {
    await this.clickElement(this.productCard.getByRole('link'));
  }

  /**
   * Verify trending indicators
   */
  async verifyTrendingIndicators(): Promise<void> {
    const trendingBadges = this.page.locator('text=/trending|hot|popular/i');
    await expect(trendingBadges.first()).toBeVisible();
    
    const trendScores = this.page.locator('[data-testid="trend-score"]');
    const scoreCount = await trendScores.count();
    if (scoreCount > 0) {
      await expect(trendScores.first()).toBeVisible();
    }
  }

  /**
   * Verify page performance (loading time)
   */
  async verifyPagePerformance(maxLoadTime: number = 3000): Promise<void> {
    const startTime = Date.now();
    await this.navigate();
    await this.page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    if (loadTime > maxLoadTime) {
      throw new Error(`Page load time ${loadTime}ms exceeds maximum ${maxLoadTime}ms`);
    }
  }

  /**
   * Verify lazy loading of images
   */
  async verifyLazyLoading(): Promise<void> {
    // Get images below the fold
    const belowFoldImages = this.page.locator('img').nth(10);
    const imageCount = await belowFoldImages.count();
    
    if (imageCount > 0) {
      // Should not be loaded initially
      const src = await belowFoldImages.getAttribute('src');
      expect(src).toBeFalsy();
      
      // Scroll to image
      await this.scrollToElement(belowFoldImages);
      
      // Should load after scrolling
      await expect(belowFoldImages).toHaveAttribute('src', /.+/);
    }
  }
}