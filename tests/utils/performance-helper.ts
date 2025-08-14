import { Page, expect } from '@playwright/test';

/**
 * Performance Testing Helper with Core Web Vitals
 * 
 * Features:
 * - Core Web Vitals measurement (LCP, FID, CLS)
 * - Resource loading performance
 * - Network analysis
 * - Memory usage tracking
 * - Lighthouse integration
 * - Performance budgets
 * - Real user metrics simulation
 */

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  
  // Other Important Metrics
  fcp: number | null; // First Contentful Paint
  ttfb: number | null; // Time to First Byte
  fmp: number | null; // First Meaningful Paint
  tti: number | null; // Time to Interactive
  
  // Loading Performance
  loadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  
  // Resource Metrics
  totalRequestCount: number;
  totalTransferSize: number;
  imageCount: number;
  imageTransferSize: number;
  scriptCount: number;
  scriptTransferSize: number;
  cssCount: number;
  cssTransferSize: number;
  
  // Performance Scores
  performanceScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
  seoScore: number;
}

export interface PerformanceBudget {
  lcp: number; // 2500ms for good
  fid: number; // 100ms for good
  cls: number; // 0.1 for good
  fcp: number; // 1800ms for good
  ttfb: number; // 800ms for good
  loadTime: number; // 3000ms for good
  totalTransferSize: number; // 1.6MB for mobile
  imageTransferSize: number; // 500KB
  scriptTransferSize: number; // 300KB
}

export class PerformanceHelper {
  private page: Page;
  private performanceObserver: any;
  private resourceMetrics: Map<string, any> = new Map();

  // Default performance budget for Heaven-Dolls
  private readonly defaultBudget: PerformanceBudget = {
    lcp: 2500,
    fid: 100,
    cls: 0.1,
    fcp: 1800,
    ttfb: 800,
    loadTime: 3000,
    totalTransferSize: 1600 * 1024, // 1.6MB
    imageTransferSize: 500 * 1024, // 500KB
    scriptTransferSize: 300 * 1024, // 300KB
  };

  constructor(page: Page) {
    this.page = page;
    this.setupResourceTracking();
  }

  /**
   * Setup resource tracking
   */
  private async setupResourceTracking(): Promise<void> {
    // Track all network requests
    this.page.on('response', (response) => {
      const url = response.url();
      const resourceType = this.getResourceType(url, response.headers()['content-type'] || '');
      
      this.resourceMetrics.set(url, {
        url,
        status: response.status(),
        size: parseInt(response.headers()['content-length'] || '0', 10),
        type: resourceType,
        timing: response.timing(),
      });
    });
  }

  /**
   * Measure Core Web Vitals and performance metrics
   */
  async measureCoreWebVitals(): Promise<PerformanceMetrics> {
    console.log('📊 Measuring Core Web Vitals...');

    // Inject performance observer script
    await this.page.addInitScript(() => {
      // Store performance data globally
      (window as any).performanceData = {
        lcp: null,
        fid: null,
        cls: null,
        fcp: null,
        ttfb: null,
      };

      // Largest Contentful Paint
      if ('PerformanceObserver' in window) {
        try {
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            (window as any).performanceData.lcp = lastEntry.startTime;
          });
          lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

          // First Input Delay
          const fidObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry: any) => {
              (window as any).performanceData.fid = entry.processingStart - entry.startTime;
            });
          });
          fidObserver.observe({ type: 'first-input', buffered: true });

          // Cumulative Layout Shift
          let clsValue = 0;
          const clsObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry: any) => {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            });
            (window as any).performanceData.cls = clsValue;
          });
          clsObserver.observe({ type: 'layout-shift', buffered: true });

          // First Contentful Paint
          const fcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry: any) => {
              if (entry.name === 'first-contentful-paint') {
                (window as any).performanceData.fcp = entry.startTime;
              }
            });
          });
          fcpObserver.observe({ type: 'paint', buffered: true });
        } catch (e) {
          console.warn('Performance Observer not fully supported:', e);
        }
      }

      // Navigation Timing
      if (performance.timing) {
        (window as any).performanceData.ttfb = performance.timing.responseStart - performance.timing.navigationStart;
      }
    });

    // Wait for page load and some interaction time
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000); // Allow time for metrics collection

    // Simulate user interaction for FID measurement
    await this.simulateUserInteraction();

    // Wait a bit more for CLS to stabilize
    await this.page.waitForTimeout(1000);

    // Extract performance data
    const performanceData = await this.page.evaluate(() => {
      return {
        ...(window as any).performanceData,
        // Navigation Timing API
        loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
        domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
        firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || null,
        // Memory usage (if available)
        memoryUsage: (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
        } : null,
      };
    });

    // Calculate resource metrics
    const resourceMetrics = this.calculateResourceMetrics();

    const metrics: PerformanceMetrics = {
      ...performanceData,
      ...resourceMetrics,
      performanceScore: this.calculatePerformanceScore(performanceData),
      accessibilityScore: 0, // Would be set by accessibility tests
      bestPracticesScore: 0, // Would be calculated based on best practices
      seoScore: 0, // Would be calculated based on SEO factors
    };

    // Log performance data for the custom reporter
    console.log(`PERFORMANCE: ${JSON.stringify(metrics)}`);

    return metrics;
  }

  /**
   * Run performance test with budget validation
   */
  async testPerformanceBudget(customBudget?: Partial<PerformanceBudget>): Promise<{
    metrics: PerformanceMetrics;
    budgetResults: { [key: string]: { actual: number; budget: number; passed: boolean } };
    passed: boolean;
  }> {
    const budget = { ...this.defaultBudget, ...customBudget };
    const metrics = await this.measureCoreWebVitals();

    const budgetResults: { [key: string]: { actual: number; budget: number; passed: boolean } } = {};

    // Check Core Web Vitals
    if (metrics.lcp !== null) {
      budgetResults.lcp = {
        actual: metrics.lcp,
        budget: budget.lcp,
        passed: metrics.lcp <= budget.lcp
      };
    }

    if (metrics.fid !== null) {
      budgetResults.fid = {
        actual: metrics.fid,
        budget: budget.fid,
        passed: metrics.fid <= budget.fid
      };
    }

    if (metrics.cls !== null) {
      budgetResults.cls = {
        actual: metrics.cls,
        budget: budget.cls,
        passed: metrics.cls <= budget.cls
      };
    }

    // Check other metrics
    budgetResults.loadTime = {
      actual: metrics.loadTime,
      budget: budget.loadTime,
      passed: metrics.loadTime <= budget.loadTime
    };

    budgetResults.totalTransferSize = {
      actual: metrics.totalTransferSize,
      budget: budget.totalTransferSize,
      passed: metrics.totalTransferSize <= budget.totalTransferSize
    };

    const allPassed = Object.values(budgetResults).every(result => result.passed);

    // Log results
    console.log('💰 Performance Budget Results:');
    Object.entries(budgetResults).forEach(([metric, result]) => {
      const status = result.passed ? '✅' : '❌';
      const unit = this.getMetricUnit(metric);
      console.log(`${status} ${metric}: ${this.formatMetricValue(result.actual, unit)} (budget: ${this.formatMetricValue(result.budget, unit)})`);
    });

    return {
      metrics,
      budgetResults,
      passed: allPassed
    };
  }

  /**
   * Test page load performance
   */
  async testPageLoadPerformance(url: string): Promise<PerformanceMetrics> {
    console.log(`🚀 Testing page load performance for: ${url}`);

    const startTime = Date.now();
    
    // Navigate with network tracking
    await this.page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    const loadTime = Date.now() - startTime;
    const metrics = await this.measureCoreWebVitals();

    // Validate critical performance thresholds
    if (metrics.lcp && metrics.lcp > 4000) {
      console.warn(`⚠️  LCP is poor: ${metrics.lcp}ms (should be < 2500ms)`);
    }

    if (metrics.cls && metrics.cls > 0.25) {
      console.warn(`⚠️  CLS is poor: ${metrics.cls} (should be < 0.1)`);
    }

    if (loadTime > 5000) {
      console.warn(`⚠️  Page load time is slow: ${loadTime}ms`);
    }

    return metrics;
  }

  /**
   * Test mobile performance
   */
  async testMobilePerformance(url: string): Promise<PerformanceMetrics> {
    console.log('📱 Testing mobile performance...');

    // Simulate slow 3G connection
    const client = await this.page.context().newCDPSession(this.page);
    await client.send('Network.enable');
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 1.6 * 1024 * 1024 / 8, // 1.6Mbps
      uploadThroughput: 750 * 1024 / 8, // 750kbps
      latency: 150 // 150ms
    });

    // Set mobile viewport
    await this.page.setViewportSize({ width: 375, height: 667 });

    // Measure performance on mobile
    const metrics = await this.testPageLoadPerformance(url);

    // Mobile-specific validations
    if (metrics.totalTransferSize > 1000 * 1024) { // 1MB for mobile
      console.warn(`⚠️  Total transfer size too large for mobile: ${metrics.totalTransferSize / 1024}KB`);
    }

    return metrics;
  }

  /**
   * Test scroll performance (for long pages)
   */
  async testScrollPerformance(): Promise<{ averageFPS: number; jankyFrames: number }> {
    console.log('📜 Testing scroll performance...');

    // Start performance monitoring
    await this.page.evaluate(() => {
      (window as any).scrollMetrics = {
        frames: [],
        startTime: performance.now()
      };

      // Monitor scroll performance
      let lastFrameTime = performance.now();
      
      const measureFrame = () => {
        const now = performance.now();
        const frameDuration = now - lastFrameTime;
        (window as any).scrollMetrics.frames.push(frameDuration);
        lastFrameTime = now;
        requestAnimationFrame(measureFrame);
      };
      
      requestAnimationFrame(measureFrame);
    });

    // Simulate scroll
    const pageHeight = await this.page.evaluate(() => document.body.scrollHeight);
    const scrollDistance = pageHeight / 10; // Scroll in 10 steps

    for (let i = 0; i < 10; i++) {
      await this.page.evaluate((distance) => {
        window.scrollBy(0, distance);
      }, scrollDistance);
      await this.page.waitForTimeout(100);
    }

    // Get scroll performance data
    const scrollData = await this.page.evaluate(() => {
      const metrics = (window as any).scrollMetrics;
      const frames = metrics.frames;
      const averageFrameTime = frames.reduce((sum: number, frame: number) => sum + frame, 0) / frames.length;
      const averageFPS = 1000 / averageFrameTime;
      const jankyFrames = frames.filter((frame: number) => frame > 16.67).length; // Frames slower than 60fps

      return {
        averageFPS: Math.round(averageFPS),
        jankyFrames
      };
    });

    console.log(`📈 Average FPS: ${scrollData.averageFPS}, Janky frames: ${scrollData.jankyFrames}`);

    return scrollData;
  }

  /**
   * Test image loading performance
   */
  async testImageLoadingPerformance(): Promise<{
    totalImages: number;
    lazyLoadedImages: number;
    averageLoadTime: number;
    largestImage: { size: number; url: string };
  }> {
    console.log('🖼️  Testing image loading performance...');

    // Wait for images to load
    await this.page.waitForLoadState('networkidle');

    const imageData = await this.page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      const imageInfo = images.map(img => ({
        src: img.src,
        loading: img.loading,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        complete: img.complete,
        decoded: (img as any).decoded || false
      }));

      return imageInfo;
    });

    const resourceData = Array.from(this.resourceMetrics.values())
      .filter(resource => resource.type === 'image');

    const totalImages = imageData.length;
    const lazyLoadedImages = imageData.filter(img => img.loading === 'lazy').length;
    const averageLoadTime = resourceData.reduce((sum, resource) => sum + resource.timing, 0) / resourceData.length || 0;
    const largestImage = resourceData.reduce((largest, current) => 
      current.size > largest.size ? current : largest, { size: 0, url: '' });

    console.log(`📊 Images: ${totalImages} total, ${lazyLoadedImages} lazy-loaded`);
    console.log(`⏱️  Average load time: ${Math.round(averageLoadTime)}ms`);
    console.log(`📏 Largest image: ${Math.round(largestImage.size / 1024)}KB`);

    return {
      totalImages,
      lazyLoadedImages,
      averageLoadTime,
      largestImage
    };
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(url: string): Promise<{
    url: string;
    timestamp: string;
    metrics: PerformanceMetrics;
    recommendations: string[];
    score: number;
  }> {
    console.log('📊 Generating comprehensive performance report...');

    const metrics = await this.testPageLoadPerformance(url);
    const recommendations = this.generateRecommendations(metrics);
    const score = this.calculateOverallPerformanceScore(metrics);

    return {
      url,
      timestamp: new Date().toISOString(),
      metrics,
      recommendations,
      score
    };
  }

  // Private helper methods

  private async simulateUserInteraction(): Promise<void> {
    // Simulate various user interactions to trigger FID measurement
    const interactiveElements = await this.page.locator('button, a, input').all();
    
    if (interactiveElements.length > 0) {
      // Click on the first interactive element
      const element = interactiveElements[0];
      if (await element.isVisible()) {
        await element.hover();
        await this.page.waitForTimeout(100);
      }
    }

    // Simulate keyboard interaction
    await this.page.keyboard.press('Tab');
    await this.page.waitForTimeout(50);
  }

  private getResourceType(url: string, contentType: string): string {
    if (contentType.includes('image/')) return 'image';
    if (contentType.includes('javascript') || url.includes('.js')) return 'script';
    if (contentType.includes('css') || url.includes('.css')) return 'stylesheet';
    if (contentType.includes('font/') || url.includes('.woff') || url.includes('.ttf')) return 'font';
    return 'other';
  }

  private calculateResourceMetrics(): Partial<PerformanceMetrics> {
    const resources = Array.from(this.resourceMetrics.values());
    
    const images = resources.filter(r => r.type === 'image');
    const scripts = resources.filter(r => r.type === 'script');
    const css = resources.filter(r => r.type === 'stylesheet');
    
    return {
      totalRequestCount: resources.length,
      totalTransferSize: resources.reduce((sum, r) => sum + r.size, 0),
      imageCount: images.length,
      imageTransferSize: images.reduce((sum, r) => sum + r.size, 0),
      scriptCount: scripts.length,
      scriptTransferSize: scripts.reduce((sum, r) => sum + r.size, 0),
      cssCount: css.length,
      cssTransferSize: css.reduce((sum, r) => sum + r.size, 0),
    };
  }

  private calculatePerformanceScore(metrics: any): number {
    let score = 100;

    // LCP scoring
    if (metrics.lcp !== null) {
      if (metrics.lcp > 4000) score -= 30;
      else if (metrics.lcp > 2500) score -= 15;
    }

    // FID scoring
    if (metrics.fid !== null) {
      if (metrics.fid > 300) score -= 30;
      else if (metrics.fid > 100) score -= 15;
    }

    // CLS scoring
    if (metrics.cls !== null) {
      if (metrics.cls > 0.25) score -= 30;
      else if (metrics.cls > 0.1) score -= 15;
    }

    // Load time scoring
    if (metrics.loadTime > 5000) score -= 20;
    else if (metrics.loadTime > 3000) score -= 10;

    return Math.max(0, score);
  }

  private calculateOverallPerformanceScore(metrics: PerformanceMetrics): number {
    // Weighted scoring system
    const lcpScore = this.scoreLCP(metrics.lcp);
    const fidScore = this.scoreFID(metrics.fid);
    const clsScore = this.scoreCLS(metrics.cls);
    const fcpScore = this.scoreFCP(metrics.fcp);

    // Weighted average (LCP 25%, FID 25%, CLS 25%, FCP 25%)
    return Math.round((lcpScore * 0.25) + (fidScore * 0.25) + (clsScore * 0.25) + (fcpScore * 0.25));
  }

  private scoreLCP(lcp: number | null): number {
    if (lcp === null) return 0;
    if (lcp <= 2500) return 100;
    if (lcp <= 4000) return 50;
    return 0;
  }

  private scoreFID(fid: number | null): number {
    if (fid === null) return 0;
    if (fid <= 100) return 100;
    if (fid <= 300) return 50;
    return 0;
  }

  private scoreCLS(cls: number | null): number {
    if (cls === null) return 0;
    if (cls <= 0.1) return 100;
    if (cls <= 0.25) return 50;
    return 0;
  }

  private scoreFCP(fcp: number | null): number {
    if (fcp === null) return 0;
    if (fcp <= 1800) return 100;
    if (fcp <= 3000) return 50;
    return 0;
  }

  private generateRecommendations(metrics: PerformanceMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.lcp && metrics.lcp > 2500) {
      recommendations.push('Optimize Largest Contentful Paint by optimizing images and critical resources');
    }

    if (metrics.fid && metrics.fid > 100) {
      recommendations.push('Reduce First Input Delay by optimizing JavaScript execution');
    }

    if (metrics.cls && metrics.cls > 0.1) {
      recommendations.push('Fix Cumulative Layout Shift by setting dimensions for images and ads');
    }

    if (metrics.totalTransferSize > 1600 * 1024) {
      recommendations.push('Reduce total transfer size by optimizing assets and enabling compression');
    }

    if (metrics.imageTransferSize > 500 * 1024) {
      recommendations.push('Optimize images by using modern formats (WebP, AVIF) and proper sizing');
    }

    if (metrics.scriptTransferSize > 300 * 1024) {
      recommendations.push('Optimize JavaScript by code splitting and removing unused code');
    }

    if (metrics.loadTime > 3000) {
      recommendations.push('Improve page load time by optimizing critical rendering path');
    }

    return recommendations;
  }

  private getMetricUnit(metric: string): string {
    const timeMetrics = ['lcp', 'fid', 'fcp', 'ttfb', 'loadTime'];
    const sizeMetrics = ['totalTransferSize', 'imageTransferSize', 'scriptTransferSize'];
    
    if (timeMetrics.includes(metric)) return 'ms';
    if (sizeMetrics.includes(metric)) return 'bytes';
    if (metric === 'cls') return '';
    return '';
  }

  private formatMetricValue(value: number, unit: string): string {
    if (unit === 'bytes') {
      return `${Math.round(value / 1024)}KB`;
    }
    if (unit === 'ms') {
      return `${Math.round(value)}ms`;
    }
    if (unit === '') {
      return value.toFixed(3);
    }
    return value.toString();
  }
}