import { test, expect } from '@playwright/test';
import { HomePage } from '../utils/page-objects/home-page';
import { ProductPage } from '../utils/page-objects/product-page';

test.describe('Performance and Core Web Vitals', () => {
  test('should meet Core Web Vitals thresholds', async ({ page }) => {
    // Start performance monitoring
    await page.goto('about:blank');
    
    // Navigate to homepage with performance tracking
    const homePage = new HomePage(page);
    const startTime = Date.now();
    
    await page.goto(homePage.url, { waitUntil: 'networkidle' });
    
    const loadTime = Date.now() - startTime;
    
    // Basic load time check
    expect(loadTime).toBeLessThan(5000); // 5 seconds max

    // Wait for page to be fully interactive
    await homePage.waitForLoad();

    // Measure Core Web Vitals
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals: any = {};
        
        // Largest Contentful Paint (LCP)
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          vitals.lcp = lastEntry.startTime;
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

        // First Input Delay (FID) - simulate with click
        const fidStart = performance.now();
        document.addEventListener('click', () => {
          vitals.fid = performance.now() - fidStart;
        }, { once: true });

        // Cumulative Layout Shift (CLS)
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          vitals.cls = clsValue;
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });

        // Time to Interactive (TTI) approximation
        vitals.tti = performance.timing.domInteractive - performance.timing.navigationStart;

        // First Contentful Paint (FCP)
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          vitals.fcp = entries[0].startTime;
        });
        fcpObserver.observe({ type: 'paint', buffered: true });

        setTimeout(() => {
          // Trigger a click to measure FID
          const clickTarget = document.querySelector('[data-testid="product-card"]') || document.body;
          (clickTarget as HTMLElement).click();
          
          setTimeout(() => resolve(vitals), 1000);
        }, 2000);
      });
    });

    console.log('Core Web Vitals:', webVitals);

    // Assert Core Web Vitals thresholds
    expect(webVitals.lcp).toBeLessThan(2500); // LCP < 2.5s (Good)
    expect(webVitals.fid).toBeLessThan(100);  // FID < 100ms (Good)
    expect(webVitals.cls).toBeLessThan(0.1);  // CLS < 0.1 (Good)
    expect(webVitals.fcp).toBeLessThan(1800); // FCP < 1.8s (Good)
    expect(webVitals.tti).toBeLessThan(3800); // TTI < 3.8s (Good)
  });

  test('should optimize image loading and performance', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    // Test lazy loading implementation
    const images = page.locator('img');
    const imageCount = await images.count();

    let lazyLoadedImages = 0;
    for (let i = 0; i < Math.min(imageCount, 10); i++) {
      const img = images.nth(i);
      const loading = await img.getAttribute('loading');
      if (loading === 'lazy') {
        lazyLoadedImages++;
      }
    }

    // At least some images should be lazy loaded
    expect(lazyLoadedImages).toBeGreaterThan(0);

    // Test image optimization
    const heroImage = page.locator('[data-testid="hero-image"]');
    if (await heroImage.isVisible()) {
      const src = await heroImage.getAttribute('src');
      const sizes = await heroImage.getAttribute('sizes');
      const srcset = await heroImage.getAttribute('srcset');

      // Should have responsive image attributes
      expect(src).toBeTruthy();
      expect(sizes || srcset).toBeTruthy();
    }

    // Test Progressive JPEG/WebP loading
    const productImages = page.locator('[data-testid="product-card"] img');
    if (await productImages.count() > 0) {
      const firstImage = productImages.first();
      const src = await firstImage.getAttribute('src');
      
      // Should use modern image formats or have optimization
      expect(src).toMatch(/\.(webp|avif|jpg|jpeg|png)(\?.*)?$/i);
    }

    // Measure image load performance
    const imageLoadTimes = await page.evaluate(() => {
      const performanceEntries = performance.getEntriesByType('resource')
        .filter(entry => entry.name.match(/\.(jpg|jpeg|png|webp|avif)(\?.*)?$/i))
        .map(entry => ({
          name: entry.name,
          duration: entry.duration,
          size: (entry as any).transferSize || 0
        }));
      
      return performanceEntries;
    });

    // Verify reasonable image load times
    imageLoadTimes.forEach(image => {
      expect(image.duration).toBeLessThan(3000); // 3 seconds max per image
    });
  });

  test('should handle large product catalogs efficiently', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForLoad();

    // Navigate to products page with many items
    await homePage.navigateToCategory('All Products');
    
    // Measure initial page load
    const startTime = Date.now();
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(5000);

    // Test pagination performance
    const pagination = page.locator('[data-testid="pagination"]');
    if (await pagination.isVisible()) {
      const pageButton = page.locator('[data-testid="page-2"]');
      if (await pageButton.isVisible()) {
        const paginationStart = Date.now();
        await pageButton.click();
        await page.waitForLoadState('networkidle');
        const paginationTime = Date.now() - paginationStart;

        expect(paginationTime).toBeLessThan(3000);
      }
    }

    // Test infinite scroll performance (if implemented)
    const infiniteScroll = page.locator('[data-testid="infinite-scroll"]');
    if (await infiniteScroll.isVisible()) {
      const initialProductCount = await page.locator('[data-testid="product-card"]').count();
      
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      await page.waitForTimeout(2000);
      
      const newProductCount = await page.locator('[data-testid="product-card"]').count();
      expect(newProductCount).toBeGreaterThan(initialProductCount);
    }

    // Test search performance
    const searchInput = page.locator('[data-testid="search-input"]');
    const searchStart = Date.now();
    await searchInput.fill('wellness');
    await searchInput.press('Enter');
    await page.waitForLoadState('networkidle');
    const searchTime = Date.now() - searchStart;

    expect(searchTime).toBeLessThan(3000);

    // Test filter performance
    const priceFilter = page.locator('[data-testid="price-filter"]');
    if (await priceFilter.isVisible()) {
      const filterStart = Date.now();
      await priceFilter.selectOption('50-100');
      await page.waitForLoadState('networkidle');
      const filterTime = Date.now() - filterStart;

      expect(filterTime).toBeLessThan(2000);
    }
  });

  test('should maintain performance under load simulation', async ({ page }) => {
    // Simulate slow network conditions
    await page.emulateNetworkConditions({
      offline: false,
      downloadThroughput: 1024 * 1024, // 1 MB/s
      uploadThroughput: 512 * 1024,    // 512 KB/s
      latency: 100                     // 100ms latency
    });

    const homePage = new HomePage(page);
    const loadStart = Date.now();
    await homePage.goto();
    await homePage.waitForLoad();
    const loadTime = Date.now() - loadStart;

    // Should still load reasonably fast under simulated load
    expect(loadTime).toBeLessThan(8000);

    // Test multiple rapid interactions
    const interactions = [
      () => page.locator('[data-testid="nav-categories"]').hover(),
      () => page.locator('[data-testid="search-input"]').click(),
      () => page.locator('[data-testid="product-card"]').first().hover(),
      () => page.locator('[data-testid="cart-icon"]').hover()
    ];

    const interactionStart = Date.now();
    for (const interaction of interactions) {
      await interaction();
      await page.waitForTimeout(100);
    }
    const interactionTime = Date.now() - interactionStart;

    // Interactions should remain responsive
    expect(interactionTime).toBeLessThan(2000);

    // Test memory usage doesn't increase excessively
    const memoryBefore = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Perform memory-intensive actions
    for (let i = 0; i < 5; i++) {
      await page.locator('[data-testid="product-card"]').nth(i % 3).hover();
      await page.waitForTimeout(200);
    }

    const memoryAfter = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Memory shouldn't increase by more than 50MB
    if (memoryBefore > 0 && memoryAfter > 0) {
      const memoryIncrease = memoryAfter - memoryBefore;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    }

    // Reset network conditions
    await page.emulateNetworkConditions({
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0
    });
  });

  test('should optimize JavaScript bundle performance', async ({ page }) => {
    // Monitor resource loading
    const resourceSizes: { [key: string]: number } = {};
    
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('.js') || url.includes('.css')) {
        try {
          const headers = response.headers();
          const contentLength = headers['content-length'];
          if (contentLength) {
            resourceSizes[url] = parseInt(contentLength);
          }
        } catch (error) {
          // Ignore errors for resource monitoring
        }
      }
    });

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForLoad();

    // Get performance metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const resources = performance.getEntriesByType('resource');
      
      const jsResources = resources.filter(r => r.name.includes('.js'));
      const cssResources = resources.filter(r => r.name.includes('.css'));
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
        loadComplete: navigation.loadEventEnd - navigation.navigationStart,
        jsCount: jsResources.length,
        cssCount: cssResources.length,
        totalJSTime: jsResources.reduce((sum, r) => sum + r.duration, 0),
        totalCSSTime: cssResources.reduce((sum, r) => sum + r.duration, 0)
      };
    });

    // Assert performance thresholds
    expect(metrics.domContentLoaded).toBeLessThan(3000); // DOM ready < 3s
    expect(metrics.loadComplete).toBeLessThan(5000);     // Full load < 5s
    expect(metrics.jsCount).toBeLessThan(20);            // Reasonable JS file count
    expect(metrics.totalJSTime).toBeLessThan(2000);      // JS load time < 2s

    // Check for code splitting
    const bundleSizes = Object.entries(resourceSizes)
      .filter(([url]) => url.includes('.js'))
      .map(([url, size]) => ({ url, size }));

    if (bundleSizes.length > 0) {
      // Main bundle shouldn't be too large
      const mainBundle = bundleSizes.find(b => b.url.includes('main') || b.url.includes('app'));
      if (mainBundle) {
        expect(mainBundle.size).toBeLessThan(500 * 1024); // 500KB max
      }

      // Should have multiple JS chunks (code splitting)
      expect(bundleSizes.length).toBeGreaterThan(1);
    }

    // Test runtime performance
    const runtimeMetrics = await page.evaluate(() => {
      const startTime = performance.now();
      
      // Simulate some DOM operations
      for (let i = 0; i < 1000; i++) {
        const div = document.createElement('div');
        div.textContent = `Test ${i}`;
        document.body.appendChild(div);
        document.body.removeChild(div);
      }
      
      return performance.now() - startTime;
    });

    // DOM operations should be fast
    expect(runtimeMetrics).toBeLessThan(100); // < 100ms for 1000 operations
  });

  test('should handle concurrent user interactions efficiently', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForLoad();

    // Simulate multiple rapid interactions
    const concurrentActions = [
      () => page.locator('[data-testid="search-input"]').fill('test'),
      () => page.locator('[data-testid="nav-categories"]').hover(),
      () => page.locator('[data-testid="product-card"]').first().hover(),
      () => page.locator('[data-testid="product-card"]').nth(1).hover(),
      () => page.locator('[data-testid="cart-icon"]').hover()
    ];

    const startTime = Date.now();
    
    // Execute actions concurrently
    await Promise.all(concurrentActions.map(action => action()));
    
    const executionTime = Date.now() - startTime;
    
    // All actions should complete quickly
    expect(executionTime).toBeLessThan(1000);

    // Test rapid navigation
    const navigationStart = Date.now();
    
    await homePage.navigateToCategory('Wellness');
    await page.waitForLoadState('networkidle');
    
    await page.goBack();
    await page.waitForLoadState('networkidle');
    
    await page.goForward();
    await page.waitForLoadState('networkidle');
    
    const navigationTime = Date.now() - navigationStart;
    expect(navigationTime).toBeLessThan(5000);

    // Test form interactions don't block UI
    const formStart = Date.now();
    
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.fill('a');
    await searchInput.fill('ab');
    await searchInput.fill('abc');
    await searchInput.fill('abcd');
    
    // UI should remain responsive during typing
    const hoverElement = page.locator('[data-testid="logo"]');
    await hoverElement.hover();
    
    const formTime = Date.now() - formStart;
    expect(formTime).toBeLessThan(1000);
  });
});