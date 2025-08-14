#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface TestSuite {
  name: string;
  path: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: number; // in seconds
  description: string;
}

interface TestResult {
  suite: string;
  passed: boolean;
  duration: number;
  coverage: number;
  errors: string[];
}

class CMSTestRunner {
  private testSuites: TestSuite[] = [
    {
      name: 'Content Models',
      path: 'tests/models/**/*.test.ts',
      priority: 'high',
      estimatedTime: 120,
      description: 'Schema validation, field constraints, and relationship testing'
    },
    {
      name: 'API Endpoints',
      path: 'tests/api/endpoints/**/*.test.ts',
      priority: 'high',
      estimatedTime: 180,
      description: 'CRUD operations, filtering, pagination, and custom endpoints'
    },
    {
      name: 'Database Integration',
      path: 'tests/database/**/*.test.ts',
      priority: 'high',
      estimatedTime: 150,
      description: 'Connection pooling, migrations, performance, and integrity'
    },
    {
      name: 'Security Tests',
      path: 'tests/security/**/*.test.ts',
      priority: 'high',
      estimatedTime: 100,
      description: 'Authentication, authorization, input validation, and attack prevention'
    },
    {
      name: 'Webhook Integration',
      path: 'tests/api/webhooks/**/*.test.ts',
      priority: 'high',
      estimatedTime: 90,
      description: 'Payload validation, error handling, and concurrent processing'
    },
    {
      name: 'Full CMS Integration',
      path: 'tests/integration/**/*.test.ts',
      priority: 'high',
      estimatedTime: 200,
      description: 'End-to-end workflows and complete marketplace scenarios'
    }
  ];

  private results: TestResult[] = [];
  private startTime: number = 0;
  private endTime: number = 0;

  constructor() {
    this.startTime = Date.now();
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Heaven Dolls CMS Comprehensive Test Suite');
    console.log('='.repeat(60));
    
    this.printTestPlan();
    
    // Run tests based on priority
    const highPriorityTests = this.testSuites.filter(t => t.priority === 'high');
    const mediumPriorityTests = this.testSuites.filter(t => t.priority === 'medium');
    const lowPriorityTests = this.testSuites.filter(t => t.priority === 'low');

    console.log('\n📋 Executing High Priority Tests...');
    await this.runTestSuites(highPriorityTests);

    console.log('\n📋 Executing Medium Priority Tests...');
    await this.runTestSuites(mediumPriorityTests);

    console.log('\n📋 Executing Low Priority Tests...');
    await this.runTestSuites(lowPriorityTests);

    this.endTime = Date.now();
    await this.generateReport();
  }

  private printTestPlan(): void {
    console.log('\n📊 Test Plan Overview:');
    console.log('-'.repeat(60));
    
    const totalEstimatedTime = this.testSuites.reduce((sum, suite) => sum + suite.estimatedTime, 0);
    
    this.testSuites.forEach(suite => {
      const priority = suite.priority.toUpperCase().padEnd(6);
      const time = `${suite.estimatedTime}s`.padEnd(6);
      console.log(`${priority} | ${time} | ${suite.name}`);
      console.log(`${''.padEnd(8)}| ${''.padEnd(6)} | ${suite.description}`);
    });
    
    console.log('-'.repeat(60));
    console.log(`Total Estimated Time: ${Math.round(totalEstimatedTime / 60)} minutes`);
  }

  private async runTestSuites(suites: TestSuite[]): Promise<void> {
    for (const suite of suites) {
      await this.runTestSuite(suite);
    }
  }

  private async runTestSuite(suite: TestSuite): Promise<void> {
    console.log(`\n🧪 Running ${suite.name}...`);
    console.log(`   ${suite.description}`);
    
    const startTime = Date.now();
    
    try {
      // Run Jest with specific pattern
      const jestCommand = `npx jest ${suite.path} --coverage --coverageDirectory=coverage/${suite.name.toLowerCase().replace(/\s+/g, '-')} --json --outputFile=test-results-${suite.name.toLowerCase().replace(/\s+/g, '-')}.json`;
      
      console.log(`   Executing: ${jestCommand}`);
      
      const output = execSync(jestCommand, {
        encoding: 'utf8',
        cwd: process.cwd(),
        timeout: suite.estimatedTime * 2000 // Double the estimated time as timeout
      });

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      // Parse Jest output for results
      const coverage = this.extractCoverageFromOutput(output);
      
      this.results.push({
        suite: suite.name,
        passed: true,
        duration,
        coverage,
        errors: []
      });

      console.log(`   ✅ ${suite.name} passed in ${duration.toFixed(2)}s (Coverage: ${coverage.toFixed(1)}%)`);
      
    } catch (error: any) {
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      this.results.push({
        suite: suite.name,
        passed: false,
        duration,
        coverage: 0,
        errors: [error.message]
      });

      console.log(`   ❌ ${suite.name} failed in ${duration.toFixed(2)}s`);
      console.log(`   Error: ${error.message}`);
    }
  }

  private extractCoverageFromOutput(output: string): number {
    // Extract coverage percentage from Jest output
    // This is a simplified version - in practice, you'd parse the JSON output
    const coverageMatch = output.match(/All files\s*\|\s*([\d.]+)/);
    return coverageMatch ? parseFloat(coverageMatch[1]) : 0;
  }

  private async generateReport(): Promise<void> {
    const totalDuration = (this.endTime - this.startTime) / 1000;
    const passedTests = this.results.filter(r => r.passed).length;
    const totalTests = this.results.length;
    const overallCoverage = this.results.reduce((sum, r) => sum + r.coverage, 0) / this.results.length;

    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST EXECUTION SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`\n🏁 Overall Results:`);
    console.log(`   Total Suites: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${totalTests - passedTests}`);
    console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log(`   Total Duration: ${Math.round(totalDuration / 60)} minutes ${Math.round(totalDuration % 60)} seconds`);
    console.log(`   Average Coverage: ${overallCoverage.toFixed(1)}%`);

    console.log(`\n📋 Detailed Results:`);
    console.log('-'.repeat(60));
    
    this.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      const duration = `${result.duration.toFixed(1)}s`.padEnd(8);
      const coverage = `${result.coverage.toFixed(1)}%`.padEnd(8);
      
      console.log(`${status} ${result.suite.padEnd(25)} | ${duration} | ${coverage}`);
      
      if (!result.passed && result.errors.length > 0) {
        result.errors.forEach(error => {
          console.log(`   └─ ${error}`);
        });
      }
    });

    console.log('-'.repeat(60));

    // Generate quality assessment
    this.generateQualityAssessment(passedTests, totalTests, overallCoverage);

    // Generate HTML report
    await this.generateHtmlReport();

    // Generate coverage badge
    this.generateCoverageBadge(overallCoverage);
  }

  private generateQualityAssessment(passed: number, total: number, coverage: number): void {
    console.log(`\n🎯 Quality Assessment:`);
    
    const successRate = (passed / total) * 100;
    
    if (successRate === 100 && coverage >= 95) {
      console.log(`   🏆 EXCELLENT - All tests passed with high coverage!`);
    } else if (successRate >= 90 && coverage >= 90) {
      console.log(`   🥇 VERY GOOD - High success rate and good coverage`);
    } else if (successRate >= 80 && coverage >= 80) {
      console.log(`   🥈 GOOD - Decent test results, room for improvement`);
    } else if (successRate >= 70 || coverage >= 70) {
      console.log(`   🥉 FAIR - Needs improvement in test coverage or success rate`);
    } else {
      console.log(`   ⚠️  POOR - Significant issues need to be addressed`);
    }

    // Specific recommendations
    console.log(`\n💡 Recommendations:`);
    
    if (coverage < 95) {
      console.log(`   • Increase test coverage to 95%+ (currently ${coverage.toFixed(1)}%)`);
    }
    
    if (successRate < 100) {
      console.log(`   • Fix failing tests to achieve 100% success rate`);
    }
    
    if (coverage >= 95 && successRate === 100) {
      console.log(`   • Excellent job! Consider adding performance benchmarks`);
      console.log(`   • Add more edge cases and error scenarios`);
      console.log(`   • Consider adding mutation testing for even higher confidence`);
    }
  }

  private async generateHtmlReport(): Promise<void> {
    const htmlReport = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Heaven Dolls CMS Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric-card { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #007bff; }
        .test-results { margin-top: 30px; }
        .test-item { display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #eee; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .coverage-bar { width: 100%; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; }
        .coverage-fill { height: 100%; background: linear-gradient(90deg, #28a745, #ffc107, #dc3545); }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏆 Heaven Dolls CMS Test Report</h1>
            <p>Comprehensive Testing Suite Results</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="metrics">
            <div class="metric-card">
                <div class="metric-value">${this.results.filter(r => r.passed).length}/${this.results.length}</div>
                <div>Tests Passed</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${((this.results.reduce((sum, r) => sum + r.coverage, 0) / this.results.length)).toFixed(1)}%</div>
                <div>Avg Coverage</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${Math.round((this.endTime - this.startTime) / 60000)}m</div>
                <div>Total Time</div>
            </div>
        </div>

        <div class="test-results">
            <h2>Test Suite Results</h2>
            ${this.results.map(result => `
                <div class="test-item">
                    <span class="${result.passed ? 'passed' : 'failed'}">
                        ${result.passed ? '✅' : '❌'} ${result.suite}
                    </span>
                    <span>${result.duration.toFixed(1)}s | ${result.coverage.toFixed(1)}%</span>
                </div>
            `).join('')}
        </div>

        <div style="margin-top: 30px;">
            <h2>Coverage Overview</h2>
            <div class="coverage-bar">
                <div class="coverage-fill" style="width: ${(this.results.reduce((sum, r) => sum + r.coverage, 0) / this.results.length)}%"></div>
            </div>
            <p style="text-align: center; margin-top: 10px;">
                Overall Coverage: ${((this.results.reduce((sum, r) => sum + r.coverage, 0) / this.results.length)).toFixed(1)}%
            </p>
        </div>
    </div>
</body>
</html>`;

    const reportPath = path.join(process.cwd(), 'test-report.html');
    fs.writeFileSync(reportPath, htmlReport);
    console.log(`\n📄 HTML report generated: ${reportPath}`);
  }

  private generateCoverageBadge(coverage: number): void {
    const color = coverage >= 95 ? 'brightgreen' : coverage >= 80 ? 'yellow' : 'red';
    const badgeUrl = `https://img.shields.io/badge/coverage-${coverage.toFixed(1)}%25-${color}`;
    
    console.log(`\n🏷️  Coverage Badge:`);
    console.log(`   URL: ${badgeUrl}`);
    console.log(`   Markdown: ![Coverage](${badgeUrl})`);
  }

  static async main(): Promise<void> {
    const runner = new CMSTestRunner();
    
    try {
      await runner.runAllTests();
      
      const overallSuccess = runner.results.every(r => r.passed);
      const averageCoverage = runner.results.reduce((sum, r) => sum + r.coverage, 0) / runner.results.length;
      
      if (overallSuccess && averageCoverage >= 95) {
        console.log('\n🎉 ALL TESTS PASSED WITH EXCELLENT COVERAGE!');
        console.log('✅ CMS is ready for production deployment');
        process.exit(0);
      } else if (overallSuccess && averageCoverage >= 90) {
        console.log('\n✅ All tests passed with good coverage');
        console.log('⚠️  Consider improving coverage before production');
        process.exit(0);
      } else {
        console.log('\n❌ Some tests failed or coverage is too low');
        console.log('🔧 Fix issues before proceeding');
        process.exit(1);
      }
      
    } catch (error) {
      console.error('\n💥 Test runner encountered an error:', error);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  CMSTestRunner.main();
}

export default CMSTestRunner;