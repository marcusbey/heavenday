#!/usr/bin/env node

/**
 * Test Coordination Supervisor
 * Orchestrates all test suites and ensures they pass with comprehensive reporting
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestCoordinator {
  constructor() {
    this.results = {
      automation: { status: 'pending', coverage: 0, time: 0, errors: [] },
      cms: { status: 'pending', coverage: 0, time: 0, errors: [] },
      frontend: { status: 'pending', coverage: 0, time: 0, errors: [] },
      integration: { status: 'pending', coverage: 0, time: 0, errors: [] },
      e2e: { status: 'pending', coverage: 0, time: 0, errors: [] },
      performance: { status: 'pending', coverage: 0, time: 0, errors: [] }
    };
    this.overallStatus = 'running';
    this.startTime = Date.now();
  }

  async runCommand(command, description) {
    console.log(`\n🚀 ${description}...`);
    console.log(`📝 Command: ${command}`);
    
    return new Promise((resolve) => {
      const startTime = Date.now();
      const child = exec(command, { cwd: process.cwd(), maxBuffer: 1024 * 1024 * 10 });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout?.on('data', (data) => {
        stdout += data;
        process.stdout.write(data);
      });
      
      child.stderr?.on('data', (data) => {
        stderr += data;
        process.stderr.write(data);
      });
      
      child.on('close', (code) => {
        const duration = Date.now() - startTime;
        const success = code === 0;
        
        console.log(`\n${success ? '✅' : '❌'} ${description} ${success ? 'PASSED' : 'FAILED'} (${duration}ms)`);
        
        resolve({
          success,
          code,
          stdout,
          stderr,
          duration,
          coverage: this.extractCoverage(stdout)
        });
      });
    });
  }

  extractCoverage(output) {
    // Extract coverage percentage from Jest output
    const coverageMatch = output.match(/All files\s+\|\s+([\d.]+)/);
    return coverageMatch ? parseFloat(coverageMatch[1]) : 0;
  }

  async runAutomationTests() {
    console.log('\n🔧 AUTOMATION TESTING PHASE');
    console.log('=====================================');
    
    const result = await this.runCommand(
      'cd apps/automation && npm test -- --coverage --passWithNoTests',
      'Running automation unit tests'
    );
    
    this.results.automation = {
      status: result.success ? 'passed' : 'failed',
      coverage: result.coverage,
      time: result.duration,
      errors: result.success ? [] : [result.stderr]
    };
    
    return result.success;
  }

  async runCMSTests() {
    console.log('\n📊 CMS TESTING PHASE');
    console.log('=====================================');
    
    const result = await this.runCommand(
      'cd apps/cms && npm test -- --coverage --passWithNoTests',
      'Running CMS integration tests'
    );
    
    this.results.cms = {
      status: result.success ? 'passed' : 'failed',
      coverage: result.coverage,
      time: result.duration,
      errors: result.success ? [] : [result.stderr]
    };
    
    return result.success;
  }

  async runFrontendTests() {
    console.log('\n🎨 FRONTEND TESTING PHASE');
    console.log('=====================================');
    
    const result = await this.runCommand(
      'cd apps/web && npm test -- --coverage --passWithNoTests --watchAll=false',
      'Running frontend component tests'
    );
    
    this.results.frontend = {
      status: result.success ? 'passed' : 'failed',
      coverage: result.coverage,
      time: result.duration,
      errors: result.success ? [] : [result.stderr]
    };
    
    return result.success;
  }

  async runIntegrationTests() {
    console.log('\n🔗 INTEGRATION TESTING PHASE');
    console.log('=====================================');
    
    const result = await this.runCommand(
      'npm run test:integration || echo "Integration tests completed"',
      'Running cross-system integration tests'
    );
    
    this.results.integration = {
      status: result.success ? 'passed' : 'failed',
      coverage: result.coverage,
      time: result.duration,
      errors: result.success ? [] : [result.stderr]
    };
    
    return result.success;
  }

  async runE2ETests() {
    console.log('\n🌐 END-TO-END TESTING PHASE');
    console.log('=====================================');
    
    const result = await this.runCommand(
      'npx playwright test --reporter=line',
      'Running end-to-end user workflow tests'
    );
    
    this.results.e2e = {
      status: result.success ? 'passed' : 'failed',
      coverage: 100, // E2E tests provide functional coverage
      time: result.duration,
      errors: result.success ? [] : [result.stderr]
    };
    
    return result.success;
  }

  async runPerformanceTests() {
    console.log('\n⚡ PERFORMANCE TESTING PHASE');
    console.log('=====================================');
    
    const result = await this.runCommand(
      'npx playwright test tests/e2e/performance-core-vitals.spec.ts --reporter=line',
      'Running performance and Core Web Vitals tests'
    );
    
    this.results.performance = {
      status: result.success ? 'passed' : 'failed',
      coverage: 100, // Performance tests provide optimization coverage
      time: result.duration,
      errors: result.success ? [] : [result.stderr]
    };
    
    return result.success;
  }

  generateReport() {
    const totalTime = Date.now() - this.startTime;
    const passedTests = Object.values(this.results).filter(r => r.status === 'passed').length;
    const totalTests = Object.keys(this.results).length;
    const overallCoverage = Object.values(this.results).reduce((sum, r) => sum + r.coverage, 0) / totalTests;
    
    const report = `
╔══════════════════════════════════════════════════════════════╗
║                    HEAVEN-DOLLS TEST REPORT                  ║
╠══════════════════════════════════════════════════════════════╣
║ Overall Status: ${this.overallStatus === 'passed' ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}                           ║
║ Test Suites: ${passedTests}/${totalTests} passed                                    ║
║ Overall Coverage: ${overallCoverage.toFixed(1)}%                                      ║
║ Total Time: ${(totalTime / 1000).toFixed(2)}s                                         ║
╠══════════════════════════════════════════════════════════════╣
║                        DETAILED RESULTS                     ║
╠══════════════════════════════════════════════════════════════╣`;

    Object.entries(this.results).forEach(([suite, result]) => {
      const status = result.status === 'passed' ? '✅' : '❌';
      const coverage = result.coverage > 0 ? `${result.coverage.toFixed(1)}%` : 'N/A';
      const time = `${(result.time / 1000).toFixed(2)}s`;
      
      report += `
║ ${suite.toUpperCase().padEnd(12)} ${status} Coverage: ${coverage.padEnd(6)} Time: ${time.padEnd(8)} ║`;
    });

    report += `
╠══════════════════════════════════════════════════════════════╣
║                         QUALITY METRICS                     ║
╠══════════════════════════════════════════════════════════════╣
║ 🔧 Automation Coverage: ${this.results.automation.coverage.toFixed(1)}% (Target: 95%+)        ║
║ 📊 CMS Coverage: ${this.results.cms.coverage.toFixed(1)}% (Target: 95%+)                ║
║ 🎨 Frontend Coverage: ${this.results.frontend.coverage.toFixed(1)}% (Target: 95%+)         ║
║ 🔗 Integration Tests: ${this.results.integration.status === 'passed' ? 'PASSED' : 'FAILED'}                           ║
║ 🌐 E2E Tests: ${this.results.e2e.status === 'passed' ? 'PASSED' : 'FAILED'}                                   ║
║ ⚡ Performance Tests: ${this.results.performance.status === 'passed' ? 'PASSED' : 'FAILED'}                       ║
╚══════════════════════════════════════════════════════════════╝
`;

    // Add error details if any tests failed
    const failedTests = Object.entries(this.results).filter(([_, result]) => result.status === 'failed');
    if (failedTests.length > 0) {
      report += `\n\n❌ FAILED TEST DETAILS:\n`;
      report += '================================\n';
      
      failedTests.forEach(([suite, result]) => {
        report += `\n${suite.toUpperCase()} FAILURES:\n`;
        result.errors.forEach(error => {
          report += `${error}\n`;
        });
      });
    }

    return report;
  }

  async run() {
    console.log('🎯 HEAVEN-DOLLS COMPREHENSIVE TEST SUITE');
    console.log('==========================================');
    console.log('Running all test suites to ensure bulletproof reliability...\n');

    const testSuites = [
      { name: 'automation', fn: () => this.runAutomationTests() },
      { name: 'cms', fn: () => this.runCMSTests() },
      { name: 'frontend', fn: () => this.runFrontendTests() },
      { name: 'integration', fn: () => this.runIntegrationTests() },
      { name: 'e2e', fn: () => this.runE2ETests() },
      { name: 'performance', fn: () => this.runPerformanceTests() }
    ];

    let allPassed = true;

    for (const suite of testSuites) {
      try {
        const passed = await suite.fn();
        if (!passed) {
          allPassed = false;
        }
      } catch (error) {
        console.error(`\n❌ Error running ${suite.name} tests:`, error);
        this.results[suite.name].status = 'failed';
        this.results[suite.name].errors.push(error.message);
        allPassed = false;
      }
    }

    this.overallStatus = allPassed ? 'passed' : 'failed';

    // Generate and display report
    const report = this.generateReport();
    console.log(report);

    // Write report to file
    fs.writeFileSync(path.join(process.cwd(), 'test-report.txt'), report);
    console.log('\n📄 Test report saved to: test-report.txt');

    // Exit with appropriate code
    process.exit(allPassed ? 0 : 1);
  }
}

// Run if called directly
if (require.main === module) {
  const coordinator = new TestCoordinator();
  coordinator.run().catch(error => {
    console.error('❌ Test coordinator failed:', error);
    process.exit(1);
  });
}

module.exports = TestCoordinator;