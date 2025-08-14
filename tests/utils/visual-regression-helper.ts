import { Page, Locator, expect } from '@playwright/test';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Visual Regression Testing Helper
 * 
 * Features:
 * - Full page and element screenshots
 * - Cross-browser visual comparison
 * - Responsive design validation
 * - Component-level testing
 * - Threshold-based comparison
 * - Baseline management
 * - Automated diff generation
 */

export interface VisualTestOptions {
  threshold?: number;
  maxDiffPixels?: number;
  fullPage?: boolean;
  clip?: { x: number; y: number; width: number; height: number };
  mask?: Locator[];
  animations?: 'disabled' | 'allow';
}

export interface VisualComparisonResult {
  passed: boolean;
  diffPixels: number;
  diffPercentage: number;
  expectedPath: string;
  actualPath: string;
  diffPath?: string;
}

export class VisualRegressionHelper {
  private page: Page;
  private screenshotDir: string;
  private browser: string;

  constructor(page: Page, browser: string = 'chromium') {
    this.page = page;
    this.browser = browser;
    this.screenshotDir = join(process.cwd(), 'test-results', 'screenshots');
    
    // Ensure screenshot directory exists
    if (!existsSync(this.screenshotDir)) {
      mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  /**
   * Take full page screenshot for comparison
   */
  async compareFullPage(
    testName: string, 
    options: VisualTestOptions = {}
  ): Promise<void> {
    console.log(`📸 Taking full page screenshot: ${testName}`);

    // Disable animations for consistent screenshots
    if (options.animations === 'disabled') {
      await this.disableAnimations();
    }

    // Mask dynamic elements if specified
    const maskElements = options.mask || [];
    
    await expect(this.page).toHaveScreenshot(`${testName}-${this.browser}.png`, {
      fullPage: options.fullPage !== false,
      threshold: options.threshold || 0.2,
      maxDiffPixels: options.maxDiffPixels || 100,
      clip: options.clip,
      mask: maskElements,
    });
  }

  /**
   * Compare specific element
   */
  async compareElement(
    element: Locator,
    testName: string,
    options: VisualTestOptions = {}
  ): Promise<void> {
    console.log(`📸 Taking element screenshot: ${testName}`);

    if (options.animations === 'disabled') {
      await this.disableAnimations();
    }

    await expect(element).toHaveScreenshot(`${testName}-${this.browser}.png`, {
      threshold: options.threshold || 0.2,
      maxDiffPixels: options.maxDiffPixels || 50,
      mask: options.mask,
    });
  }

  /**
   * Test responsive design across multiple viewports
   */
  async testResponsiveDesign(
    testName: string,
    viewports: Array<{ width: number; height: number; name: string }> = []
  ): Promise<void> {
    console.log(`📱 Testing responsive design: ${testName}`);

    const defaultViewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1440, height: 900, name: 'desktop' },
      { width: 1920, height: 1080, name: 'desktop-large' },
    ];

    const testViewports = viewports.length > 0 ? viewports : defaultViewports;

    for (const viewport of testViewports) {
      console.log(`📐 Testing ${viewport.name} viewport (${viewport.width}x${viewport.height})`);
      
      await this.page.setViewportSize({
        width: viewport.width,
        height: viewport.height
      });

      // Wait for layout to stabilize
      await this.page.waitForTimeout(500);
      await this.page.waitForLoadState('networkidle');

      await this.compareFullPage(`${testName}-${viewport.name}`, {
        animations: 'disabled'
      });
    }
  }

  /**
   * Test dark mode visual differences
   */
  async testDarkMode(testName: string): Promise<void> {
    console.log(`🌙 Testing dark mode: ${testName}`);

    // Test light mode first
    await this.page.emulateMedia({ colorScheme: 'light' });
    await this.page.waitForTimeout(500);
    await this.compareFullPage(`${testName}-light-mode`, {
      animations: 'disabled'
    });

    // Test dark mode
    await this.page.emulateMedia({ colorScheme: 'dark' });
    await this.page.waitForTimeout(500);
    await this.compareFullPage(`${testName}-dark-mode`, {
      animations: 'disabled'
    });
  }

  /**
   * Test component states (hover, focus, active)
   */
  async testComponentStates(
    element: Locator,
    testName: string,
    states: Array<'normal' | 'hover' | 'focus' | 'active' | 'disabled'> = ['normal', 'hover', 'focus']
  ): Promise<void> {
    console.log(`🔘 Testing component states: ${testName}`);

    await this.disableAnimations();

    for (const state of states) {
      console.log(`Testing ${state} state`);

      switch (state) {
        case 'normal':
          // Do nothing, element in normal state
          break;
        case 'hover':
          await element.hover();
          await this.page.waitForTimeout(200);
          break;
        case 'focus':
          await element.focus();
          await this.page.waitForTimeout(200);
          break;
        case 'active':
          await element.dispatchEvent('mousedown');
          await this.page.waitForTimeout(100);
          break;
        case 'disabled':
          await element.evaluate(el => {
            (el as HTMLElement).setAttribute('disabled', 'disabled');
          });
          await this.page.waitForTimeout(100);
          break;
      }

      await this.compareElement(element, `${testName}-${state}`, {
        threshold: 0.1
      });

      // Reset state
      if (state === 'active') {
        await element.dispatchEvent('mouseup');
      }
      if (state === 'disabled') {
        await element.evaluate(el => {
          (el as HTMLElement).removeAttribute('disabled');
        });
      }
    }
  }

  /**
   * Test form states and validation messages
   */
  async testFormVisualStates(formSelector: string, testName: string): Promise<void> {
    console.log(`📝 Testing form visual states: ${testName}`);

    const form = this.page.locator(formSelector);
    await this.disableAnimations();

    // Test empty form
    await this.compareElement(form, `${testName}-empty`);

    // Test filled form
    const inputs = form.locator('input:not([type="hidden"]), textarea, select');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const inputType = await input.getAttribute('type');
      
      if (inputType === 'email') {
        await input.fill('test@example.com');
      } else if (inputType === 'password') {
        await input.fill('password123');
      } else if (inputType === 'number') {
        await input.fill('123');
      } else if (inputType === 'tel') {
        await input.fill('555-1234');
      } else if (await input.evaluate(el => el.tagName === 'SELECT')) {
        const options = input.locator('option');
        const optionCount = await options.count();
        if (optionCount > 1) {
          await input.selectOption({ index: 1 });
        }
      } else {
        await input.fill('Test input value');
      }
    }

    await this.compareElement(form, `${testName}-filled`);

    // Test validation errors (if form has required fields)
    const requiredInputs = form.locator('input[required], textarea[required], select[required]');
    const requiredCount = await requiredInputs.count();

    if (requiredCount > 0) {
      // Clear first required field to trigger validation
      await requiredInputs.first().clear();
      
      // Try to submit form to trigger validation
      const submitButton = form.locator('button[type="submit"], input[type="submit"]');
      if (await submitButton.count() > 0) {
        await submitButton.click();
        await this.page.waitForTimeout(500);
        await this.compareElement(form, `${testName}-validation-errors`);
      }
    }
  }

  /**
   * Test loading states
   */
  async testLoadingStates(testName: string): Promise<void> {
    console.log(`⏳ Testing loading states: ${testName}`);

    // Test skeleton loading state
    const skeletons = this.page.locator('[data-testid*="skeleton"], .skeleton');
    const skeletonCount = await skeletons.count();

    if (skeletonCount > 0) {
      await this.compareFullPage(`${testName}-loading-skeleton`);
    }

    // Test spinner loading state
    const spinners = this.page.locator('[data-testid*="loading"], .loading, .spinner');
    const spinnerCount = await spinners.count();

    if (spinnerCount > 0) {
      await this.compareFullPage(`${testName}-loading-spinner`);
    }
  }

  /**
   * Test modal and overlay visuals
   */
  async testModalVisuals(
    modalTrigger: Locator,
    testName: string,
    options: { closeSelector?: string } = {}
  ): Promise<void> {
    console.log(`🏠 Testing modal visuals: ${testName}`);

    await this.disableAnimations();

    // Test page before modal opens
    await this.compareFullPage(`${testName}-before-modal`);

    // Open modal
    await modalTrigger.click();
    await this.page.waitForTimeout(500);

    // Test modal open state
    await this.compareFullPage(`${testName}-modal-open`);

    // Close modal
    if (options.closeSelector) {
      await this.page.locator(options.closeSelector).click();
    } else {
      await this.page.keyboard.press('Escape');
    }
    await this.page.waitForTimeout(500);

    // Test after modal closes
    await this.compareFullPage(`${testName}-after-modal`);
  }

  /**
   * Test cart and shopping flow visuals
   */
  async testShoppingFlowVisuals(testName: string): Promise<void> {
    console.log(`🛒 Testing shopping flow visuals: ${testName}`);

    // Test empty cart
    const cartButton = this.page.getByRole('button', { name: /cart/i });
    await cartButton.click();
    await this.page.waitForTimeout(500);
    await this.compareFullPage(`${testName}-empty-cart`);

    // Add item to cart (if add to cart button exists)
    const addToCartButtons = this.page.getByRole('button', { name: /add to cart/i });
    const buttonCount = await addToCartButtons.count();

    if (buttonCount > 0) {
      await addToCartButtons.first().click();
      await this.page.waitForTimeout(1000);
      
      // Test cart with items
      await cartButton.click();
      await this.page.waitForTimeout(500);
      await this.compareFullPage(`${testName}-cart-with-items`);
    }
  }

  /**
   * Test product grid and listing visuals
   */
  async testProductGridVisuals(testName: string): Promise<void> {
    console.log(`📦 Testing product grid visuals: ${testName}`);

    // Test different grid layouts if available
    const gridControls = this.page.locator('[data-testid*="grid"], [data-testid*="layout"]');
    const controlCount = await gridControls.count();

    if (controlCount > 0) {
      // Test each grid layout
      for (let i = 0; i < controlCount; i++) {
        await gridControls.nth(i).click();
        await this.page.waitForTimeout(500);
        await this.compareFullPage(`${testName}-grid-layout-${i}`);
      }
    } else {
      // Just test the default grid
      await this.compareFullPage(`${testName}-product-grid`);
    }

    // Test with filters applied
    const filterButtons = this.page.locator('[data-testid*="filter"] button');
    const filterCount = await filterButtons.count();

    if (filterCount > 0) {
      await filterButtons.first().click();
      await this.page.waitForTimeout(1000);
      await this.compareFullPage(`${testName}-filtered-products`);
    }
  }

  /**
   * Create visual test baseline
   */
  async createBaseline(testName: string): Promise<void> {
    console.log(`📋 Creating visual baseline: ${testName}`);
    
    const screenshotPath = join(this.screenshotDir, `${testName}-${this.browser}.png`);
    await this.page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    
    console.log(`✅ Baseline created: ${screenshotPath}`);
  }

  /**
   * Update all baselines for a test suite
   */
  async updateBaselines(testSuite: string): Promise<void> {
    console.log(`🔄 Updating baselines for: ${testSuite}`);
    
    // This would typically be handled by Playwright's --update-snapshots flag
    // But we can provide a helper method for programmatic updates
    
    console.log('Run tests with --update-snapshots flag to update baselines');
  }

  // Private helper methods

  private async disableAnimations(): Promise<void> {
    await this.page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
          scroll-behavior: auto !important;
        }
      `
    });
  }

  private async waitForStableLayout(): Promise<void> {
    // Wait for layout to stabilize
    let previousHeight = 0;
    let stableCount = 0;
    
    for (let i = 0; i < 10; i++) {
      const currentHeight = await this.page.evaluate(() => document.body.scrollHeight);
      
      if (currentHeight === previousHeight) {
        stableCount++;
        if (stableCount >= 3) break; // Layout is stable
      } else {
        stableCount = 0;
      }
      
      previousHeight = currentHeight;
      await this.page.waitForTimeout(100);
    }
  }

  /**
   * Advanced visual testing with custom thresholds per component
   */
  async compareWithCustomThreshold(
    element: Locator,
    testName: string,
    threshold: number
  ): Promise<void> {
    await expect(element).toHaveScreenshot(`${testName}-${this.browser}.png`, {
      threshold
    });
  }

  /**
   * Test visual differences between user states (logged in vs logged out)
   */
  async testUserStateVisuals(testName: string): Promise<void> {
    console.log(`👤 Testing user state visuals: ${testName}`);

    // Test logged out state
    await this.compareFullPage(`${testName}-logged-out`);

    // If login functionality exists, test logged in state
    const loginButton = this.page.getByRole('button', { name: /login|sign in/i });
    if (await loginButton.isVisible()) {
      // This would need to be integrated with your authentication system
      console.log('Login functionality detected - implement authentication flow for visual testing');
    }
  }

  /**
   * Test internationalization visual differences
   */
  async testInternationalizationVisuals(
    testName: string,
    locales: string[] = ['en', 'es', 'fr']
  ): Promise<void> {
    console.log(`🌍 Testing i18n visuals: ${testName}`);

    for (const locale of locales) {
      // Set page locale if supported
      await this.page.setExtraHTTPHeaders({
        'Accept-Language': locale
      });

      await this.page.reload();
      await this.page.waitForLoadState('networkidle');
      
      await this.compareFullPage(`${testName}-${locale}`);
    }
  }
}

/**
 * Visual testing utilities for common e-commerce patterns
 */
export class EcommerceVisualPatterns {
  private visualHelper: VisualRegressionHelper;
  private page: Page;

  constructor(page: Page, browser: string = 'chromium') {
    this.page = page;
    this.visualHelper = new VisualRegressionHelper(page, browser);
  }

  /**
   * Test complete shopping journey visuals
   */
  async testShoppingJourney(testName: string): Promise<void> {
    console.log(`🛍️  Testing complete shopping journey: ${testName}`);

    // Homepage
    await this.page.goto('/');
    await this.visualHelper.compareFullPage(`${testName}-homepage`);

    // Product listing
    await this.page.goto('/products');
    await this.visualHelper.compareFullPage(`${testName}-product-listing`);

    // Product detail (if products exist)
    const firstProduct = this.page.locator('[data-testid="product-card"] a').first();
    if (await firstProduct.isVisible()) {
      await firstProduct.click();
      await this.page.waitForLoadState('networkidle');
      await this.visualHelper.compareFullPage(`${testName}-product-detail`);
    }

    // Cart page
    await this.page.goto('/cart');
    await this.visualHelper.compareFullPage(`${testName}-cart`);

    // Checkout page
    await this.page.goto('/checkout');
    await this.visualHelper.compareFullPage(`${testName}-checkout`);
  }

  /**
   * Test all form states in checkout
   */
  async testCheckoutFormVisuals(testName: string): Promise<void> {
    await this.page.goto('/checkout');
    await this.visualHelper.testFormVisualStates('form', `${testName}-checkout-form`);
  }

  /**
   * Test product card variations
   */
  async testProductCardVariations(testName: string): Promise<void> {
    await this.page.goto('/products');
    
    const productCards = this.page.locator('[data-testid="product-card"]');
    const cardCount = await productCards.count();
    
    for (let i = 0; i < Math.min(cardCount, 3); i++) {
      const card = productCards.nth(i);
      await this.visualHelper.testComponentStates(
        card, 
        `${testName}-product-card-${i}`,
        ['normal', 'hover']
      );
    }
  }
}