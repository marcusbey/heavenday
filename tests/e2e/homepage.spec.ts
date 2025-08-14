import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays main navigation and branding', async ({ page }) => {
    // Check header elements
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByAltText('Heaven Dolls')).toBeVisible();
    
    // Check navigation links
    await expect(page.getByRole('link', { name: 'Shop' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Categories' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'About' })).toBeVisible();
    
    // Check search functionality
    await expect(page.getByPlaceholder(/search products/i)).toBeVisible();
    
    // Check cart and wishlist
    await expect(page.getByRole('button', { name: /cart/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /wishlist/i })).toBeVisible();
  });

  test('displays hero section with call-to-action', async ({ page }) => {
    // Check hero section
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(
      page.getByText(/discover trending adult wellness products/i)
    ).toBeVisible();
    
    // Check primary CTA
    const ctaButton = page.getByRole('link', { name: /shop now|explore products/i });
    await expect(ctaButton).toBeVisible();
    
    // Test CTA navigation
    await ctaButton.click();
    await expect(page).toHaveURL(/.*\/products/);
  });

  test('displays featured products section', async ({ page }) => {
    // Check section heading
    await expect(
      page.getByRole('heading', { name: /featured products|trending now/i })
    ).toBeVisible();
    
    // Check for product cards
    const productCards = page.locator('[data-testid="product-card"]');
    await expect(productCards).toHaveCount.greaterThan(0);
    
    // Check product card content
    const firstProduct = productCards.first();
    await expect(firstProduct.getByRole('img')).toBeVisible();
    await expect(firstProduct.locator('text=/\\$\\d+/').first()).toBeVisible();
    await expect(firstProduct.getByRole('link')).toBeVisible();
  });

  test('displays category showcase', async ({ page }) => {
    // Check categories section
    await expect(
      page.getByRole('heading', { name: /shop by category|categories/i })
    ).toBeVisible();
    
    // Check category links
    await expect(page.getByRole('link', { name: /wellness/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /adult/i })).toBeVisible();
    
    // Test category navigation
    await page.getByRole('link', { name: /wellness/i }).click();
    await expect(page).toHaveURL(/.*\/categories\/wellness/);
  });

  test('has working footer with links', async ({ page }) => {
    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Check footer content
    const footer = page.getByRole('contentinfo');
    await expect(footer).toBeVisible();
    
    // Check footer links
    await expect(footer.getByRole('link', { name: /privacy policy/i })).toBeVisible();
    await expect(footer.getByRole('link', { name: /terms of service/i })).toBeVisible();
    await expect(footer.getByRole('link', { name: /contact/i })).toBeVisible();
  });

  test('is responsive on mobile devices', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip('This test is only for mobile devices');
    }

    // Check mobile menu
    const mobileMenuButton = page.getByRole('button', { name: /menu/i });
    await expect(mobileMenuButton).toBeVisible();
    
    // Open mobile menu
    await mobileMenuButton.click();
    const mobileMenu = page.getByTestId('mobile-menu');
    await expect(mobileMenu).toBeVisible();
    
    // Check mobile navigation links
    await expect(mobileMenu.getByRole('link', { name: 'Shop' })).toBeVisible();
    await expect(mobileMenu.getByRole('link', { name: 'Categories' })).toBeVisible();
  });

  test('handles search functionality', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search products/i);
    
    // Type search query
    await searchInput.fill('wellness doll');
    
    // Submit search
    await page.keyboard.press('Enter');
    
    // Should navigate to search results
    await expect(page).toHaveURL(/.*\/search\?.*q=wellness%20doll/);
    
    // Check search results page
    await expect(
      page.getByRole('heading', { name: /search results|results for/i })
    ).toBeVisible();
  });

  test('shows loading states gracefully', async ({ page }) => {
    // Intercept API calls to simulate slow network
    await page.route('**/api/products**', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      route.continue();
    });
    
    await page.goto('/');
    
    // Should show loading skeletons or indicators
    const loadingElements = page.locator('[data-testid*="skeleton"], [data-testid*="loading"]');
    await expect(loadingElements.first()).toBeVisible();
  });

  test('displays trending badge and scores', async ({ page }) => {
    // Check for trending indicators
    const trendingBadges = page.locator('text=/trending|hot|popular/i');
    await expect(trendingBadges.first()).toBeVisible();
    
    // Check trend scores
    const trendScores = page.locator('[data-testid="trend-score"]');
    if (await trendScores.count() > 0) {
      await expect(trendScores.first()).toBeVisible();
    }
  });
});

test.describe('Performance', () => {
  test('loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000); // 3 seconds max
  });

  test('lazy loads images', async ({ page }) => {
    await page.goto('/');
    
    // Get images below the fold
    const belowFoldImages = page.locator('img').nth(10);
    
    if (await belowFoldImages.count() > 0) {
      // Should not be loaded initially
      const src = await belowFoldImages.getAttribute('src');
      expect(src).toBeFalsy();
      
      // Scroll to image
      await belowFoldImages.scrollIntoViewIfNeeded();
      
      // Should load after scrolling
      await expect(belowFoldImages).toHaveAttribute('src', /.+/);
    }
  });
});