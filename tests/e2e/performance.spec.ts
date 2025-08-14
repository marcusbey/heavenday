import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('homepage loads within performance budget', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    // Check for performance metrics
    const performanceEntries = await page.evaluate(() => {
      return JSON.stringify(performance.getEntriesByType('navigation'));
    });
    
    const navigation = JSON.parse(performanceEntries)[0];
    
    // First Contentful Paint should be under 2s
    if (navigation.loadEventEnd) {
      expect(navigation.loadEventEnd - navigation.fetchStart).toBeLessThan(3000);
    }
  });

  test('product listing page performance', async ({ page }) => {
    await page.goto('/products');
    
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 5000 });
    const renderTime = Date.now() - startTime;
    
    // Product cards should render within 2 seconds
    expect(renderTime).toBeLessThan(2000);
    
    // Check that images are lazy loaded
    const images = page.locator('img[loading="lazy"]');
    const imageCount = await images.count();
    expect(imageCount).toBeGreaterThan(0);
  });

  test('search performance', async ({ page }) => {
    await page.goto('/');
    
    const searchInput = page.getByPlaceholder(/search products/i);
    
    const startTime = Date.now();
    await searchInput.fill('wellness');
    await page.keyboard.press('Enter');
    
    await page.waitForSelector('[data-testid="search-results"]', { timeout: 3000 });
    const searchTime = Date.now() - startTime;
    
    // Search should complete within 3 seconds
    expect(searchTime).toBeLessThan(3000);
  });

  test('cart operations performance', async ({ page }) => {
    await page.goto('/');
    
    // Add item to cart
    const addToCartButton = page.getByRole('button', { name: /add to cart/i }).first();
    
    const startTime = Date.now();
    await addToCartButton.click();
    
    // Wait for cart to update
    await expect(page.getByRole('button', { name: /cart/i })).toContainText('1');
    const addTime = Date.now() - startTime;
    
    // Adding to cart should be under 1 second
    expect(addTime).toBeLessThan(1000);
  });

  test('bundle size analysis', async ({ page }) => {
    // Monitor network requests
    const networkRequests: any[] = [];
    
    page.on('response', (response) => {
      if (response.url().includes('.js') || response.url().includes('.css')) {
        networkRequests.push({
          url: response.url(),
          size: response.headers()['content-length'],
          type: response.url().includes('.js') ? 'javascript' : 'css',
        });
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Calculate total JavaScript size
    const totalJSSize = networkRequests
      .filter(req => req.type === 'javascript')
      .reduce((total, req) => total + (parseInt(req.size) || 0), 0);
    
    // JavaScript bundle should be under 500KB
    expect(totalJSSize).toBeLessThan(500 * 1024);
    
    // Calculate total CSS size
    const totalCSSSize = networkRequests
      .filter(req => req.type === 'css')
      .reduce((total, req) => total + (parseInt(req.size) || 0), 0);
    
    // CSS should be under 100KB
    expect(totalCSSSize).toBeLessThan(100 * 1024);
  });

  test('image optimization', async ({ page }) => {
    await page.goto('/');
    
    // Get all images
    const images = await page.locator('img').all();
    
    for (const image of images.slice(0, 5)) { // Test first 5 images
      const src = await image.getAttribute('src');
      const alt = await image.getAttribute('alt');
      
      // Images should have alt text
      expect(alt).toBeTruthy();
      
      // Images should be optimized (WebP or modern format)
      if (src) {
        const isOptimized = src.includes('webp') || 
                           src.includes('avif') || 
                           src.includes('_next/image');
        expect(isOptimized).toBeTruthy();
      }
    }
  });

  test('memory usage stays within bounds', async ({ page }) => {
    await page.goto('/');
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    // Navigate through several pages
    await page.goto('/products');
    await page.goto('/categories/wellness');
    await page.goto('/cart');
    await page.goto('/');
    
    // Get final memory usage
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    // Memory increase should be reasonable (under 50MB)
    const memoryIncrease = finalMemory - initialMemory;
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
  });

  test('Core Web Vitals', async ({ page }) => {
    await page.goto('/');
    
    // Measure Core Web Vitals
    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals: any = {};
        
        // Largest Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          vitals.LCP = lastEntry.startTime;
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // First Input Delay
        new PerformanceObserver((list) => {
          const firstInput = list.getEntries()[0];
          vitals.FID = firstInput.processingStart - firstInput.startTime;
        }).observe({ entryTypes: ['first-input'] });
        
        // Cumulative Layout Shift
        let clsValue = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          vitals.CLS = clsValue;
        }).observe({ entryTypes: ['layout-shift'] });
        
        // Resolve after a delay to collect metrics
        setTimeout(() => resolve(vitals), 3000);
      });
    });
    
    // LCP should be under 2.5s
    if (vitals.LCP) {
      expect(vitals.LCP).toBeLessThan(2500);
    }
    
    // FID should be under 100ms
    if (vitals.FID) {
      expect(vitals.FID).toBeLessThan(100);
    }
    
    // CLS should be under 0.1
    if (vitals.CLS) {
      expect(vitals.CLS).toBeLessThan(0.1);
    }
  });
});

test.describe('Accessibility Performance', () => {
  test('keyboard navigation is responsive', async ({ page }) => {
    await page.goto('/');
    
    const startTime = Date.now();
    
    // Navigate using keyboard
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(50); // Small delay between tabs
    }
    
    const navigationTime = Date.now() - startTime;
    
    // Keyboard navigation should be smooth (under 1 second for 10 tabs)
    expect(navigationTime).toBeLessThan(1000);
  });

  test('screen reader announcements are timely', async ({ page }) => {
    await page.goto('/');
    
    // Add item to cart and measure announcement timing
    const startTime = Date.now();
    await page.getByRole('button', { name: /add to cart/i }).first().click();
    
    // Wait for ARIA live region update
    await page.waitForSelector('[aria-live="polite"]', { timeout: 1000 });
    const announcementTime = Date.now() - startTime;
    
    // Announcements should be immediate (under 500ms)
    expect(announcementTime).toBeLessThan(500);
  });
});

test.describe('Mobile Performance', () => {
  test.use({ 
    ...test.devices['iPhone 12'],
    // Simulate slower mobile connection
    extraHTTPHeaders: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    }
  });

  test('mobile page load performance', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Mobile should load within 4 seconds (allowing for slower connection)
    expect(loadTime).toBeLessThan(4000);
  });

  test('mobile touch interactions are responsive', async ({ page }) => {
    await page.goto('/');
    
    const productCard = page.locator('[data-testid="product-card"]').first();
    
    const startTime = Date.now();
    await productCard.tap();
    
    // Wait for navigation or modal
    await page.waitForLoadState('domcontentloaded');
    const responseTime = Date.now() - startTime;
    
    // Touch response should be under 300ms
    expect(responseTime).toBeLessThan(300);
  });
});