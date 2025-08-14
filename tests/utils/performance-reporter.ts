import { 
  FullConfig, 
  FullResult, 
  Reporter, 
  Suite, 
  TestCase, 
  TestResult 
} from '@playwright/test/reporter';
import { writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Custom Performance Reporter for Heaven-Dolls E2E Tests
 * 
 * Tracks and reports:
 * - Test execution times
 * - Performance metrics
 * - Core Web Vitals
 * - Resource loading times
 * - Memory usage
 * - Network activity
 */
export default class PerformanceReporter implements Reporter {
  private config!: FullConfig;
  private performanceData: any[] = [];
  private startTime!: number;

  onBegin(config: FullConfig, suite: Suite) {
    this.config = config;
    this.startTime = Date.now();
    console.log(`🚀 Starting Heaven-Dolls E2E Test Suite`);
    console.log(`📊 Performance monitoring enabled`);
    console.log(`🌐 Projects: ${config.projects.map(p => p.name).join(', ')}`);
  }

  onTestBegin(test: TestCase, result: TestResult) {
    // Track test start time
    (result as any).performanceStart = Date.now();
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const performanceStart = (result as any).performanceStart;
    const duration = performanceStart ? Date.now() - performanceStart : result.duration;
    
    // Collect performance data
    const performanceMetrics = {
      testId: test.id,
      title: test.title,
      project: test.parent.project()?.name || 'unknown',
      status: result.status,
      duration,
      retry: result.retry,
      timestamp: new Date().toISOString(),
      
      // Extract performance metrics if available
      metrics: this.extractPerformanceMetrics(result),
    };

    this.performanceData.push(performanceMetrics);

    // Log slow tests (>30 seconds)
    if (duration > 30000) {
      console.log(`⚠️  Slow test detected: ${test.title} (${duration}ms)`);
    }

    // Log failed performance thresholds
    const metrics = performanceMetrics.metrics;
    if (metrics.lcp && metrics.lcp > 2500) {
      console.log(`⚠️  LCP threshold exceeded: ${metrics.lcp}ms in ${test.title}`);
    }
    if (metrics.fid && metrics.fid > 100) {
      console.log(`⚠️  FID threshold exceeded: ${metrics.fid}ms in ${test.title}`);
    }
    if (metrics.cls && metrics.cls > 0.1) {
      console.log(`⚠️  CLS threshold exceeded: ${metrics.cls} in ${test.title}`);
    }
  }

  onEnd(result: FullResult) {
    const totalTime = Date.now() - this.startTime;
    
    console.log('\n📈 Performance Summary:');
    console.log(`⏱️  Total execution time: ${totalTime}ms`);
    console.log(`✅ Tests passed: ${this.performanceData.filter(t => t.status === 'passed').length}`);
    console.log(`❌ Tests failed: ${this.performanceData.filter(t => t.status === 'failed').length}`);
    console.log(`⏭️  Tests skipped: ${this.performanceData.filter(t => t.status === 'skipped').length}`);

    // Calculate performance statistics
    const durations = this.performanceData.map(t => t.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);

    console.log(`📊 Average test duration: ${Math.round(avgDuration)}ms`);
    console.log(`🐌 Slowest test: ${Math.round(maxDuration)}ms`);
    console.log(`⚡ Fastest test: ${Math.round(minDuration)}ms`);

    // Performance metrics summary
    this.reportPerformanceMetrics();

    // Save detailed performance report
    this.savePerformanceReport();

    // Check if performance meets SLA
    this.checkPerformanceSLA();
  }

  private extractPerformanceMetrics(result: TestResult): any {
    // Extract performance metrics from attachments or stdout
    const metrics: any = {
      lcp: null,
      fid: null,
      cls: null,
      fcp: null,
      ttfb: null,
      loadTime: null,
    };

    try {
      // Check for performance attachments
      for (const attachment of result.attachments) {
        if (attachment.name === 'performance-metrics') {
          const data = JSON.parse(attachment.body?.toString() || '{}');
          Object.assign(metrics, data);
        }
      }

      // Check stdout for performance logs
      for (const stdout of result.stdout) {
        if (stdout.includes('PERFORMANCE:')) {
          try {
            const perfData = JSON.parse(stdout.split('PERFORMANCE:')[1]);
            Object.assign(metrics, perfData);
          } catch (e) {
            // Ignore parsing errors
          }
        }
      }
    } catch (error) {
      // Ignore extraction errors
    }

    return metrics;
  }

  private reportPerformanceMetrics() {
    const metricsData = this.performanceData
      .filter(t => t.metrics && Object.keys(t.metrics).some(k => t.metrics[k] !== null))
      .map(t => t.metrics);

    if (metricsData.length === 0) {
      console.log('📊 No performance metrics collected');
      return;
    }

    console.log('\n🎯 Core Web Vitals Summary:');

    // LCP (Largest Contentful Paint)
    const lcpValues = metricsData.filter(m => m.lcp).map(m => m.lcp);
    if (lcpValues.length > 0) {
      const avgLCP = lcpValues.reduce((a, b) => a + b, 0) / lcpValues.length;
      const goodLCP = lcpValues.filter(v => v <= 2500).length;
      console.log(`🖼️  LCP: ${Math.round(avgLCP)}ms avg (${goodLCP}/${lcpValues.length} good)`);
    }

    // FID (First Input Delay)
    const fidValues = metricsData.filter(m => m.fid).map(m => m.fid);
    if (fidValues.length > 0) {
      const avgFID = fidValues.reduce((a, b) => a + b, 0) / fidValues.length;
      const goodFID = fidValues.filter(v => v <= 100).length;
      console.log(`👆 FID: ${Math.round(avgFID)}ms avg (${goodFID}/${fidValues.length} good)`);
    }

    // CLS (Cumulative Layout Shift)
    const clsValues = metricsData.filter(m => m.cls).map(m => m.cls);
    if (clsValues.length > 0) {
      const avgCLS = clsValues.reduce((a, b) => a + b, 0) / clsValues.length;
      const goodCLS = clsValues.filter(v => v <= 0.1).length;
      console.log(`📏 CLS: ${avgCLS.toFixed(3)} avg (${goodCLS}/${clsValues.length} good)`);
    }
  }

  private savePerformanceReport() {
    const reportPath = join(process.cwd(), 'test-results', 'performance-report.json');
    
    const report = {
      summary: {
        totalTests: this.performanceData.length,
        passed: this.performanceData.filter(t => t.status === 'passed').length,
        failed: this.performanceData.filter(t => t.status === 'failed').length,
        totalDuration: Date.now() - this.startTime,
        generatedAt: new Date().toISOString(),
      },
      tests: this.performanceData,
      thresholds: {
        lcp: 2500,
        fid: 100,
        cls: 0.1,
        maxTestDuration: 30000,
      },
    };

    try {
      writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Performance report saved: ${reportPath}`);
    } catch (error) {
      console.error('❌ Failed to save performance report:', error);
    }
  }

  private checkPerformanceSLA() {
    const totalTime = Date.now() - this.startTime;
    const maxAllowedTime = 10 * 60 * 1000; // 10 minutes
    
    if (totalTime > maxAllowedTime) {
      console.log(`⚠️  SLA WARNING: Test suite exceeded 10 minute limit (${Math.round(totalTime / 1000)}s)`);
    }

    const slowTests = this.performanceData.filter(t => t.duration > 30000);
    if (slowTests.length > 0) {
      console.log(`⚠️  SLA WARNING: ${slowTests.length} tests exceeded 30s threshold`);
    }

    const failureRate = this.performanceData.filter(t => t.status === 'failed').length / this.performanceData.length;
    if (failureRate > 0.05) {
      console.log(`⚠️  SLA WARNING: Failure rate ${(failureRate * 100).toFixed(1)}% exceeds 5% threshold`);
    }

    console.log('\n✅ Performance SLA check completed');
  }
}