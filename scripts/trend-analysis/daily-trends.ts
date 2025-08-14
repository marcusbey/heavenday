#!/usr/bin/env tsx

/**
 * Daily Trends Analysis Script
 * 
 * This script runs daily trend analysis and generates actionable insights
 * for the Heaven Dolls marketplace.
 */

import { googleTrendsService } from '../../apps/automation/src/trends/google-trends';
import { logger } from '../../apps/automation/src/utils/logger';
import fs from 'fs/promises';
import path from 'path';

interface DailyTrendReport {
  date: string;
  trending_keywords: Array<{
    keyword: string;
    score: number;
    related_queries: string[];
  }>;
  geographic_insights: Array<{
    region: string;
    top_keywords: string[];
  }>;
  recommendations: string[];
  metadata: {
    total_keywords: number;
    average_score: number;
    analysis_duration_ms: number;
  };
}

/**
 * Main function to run daily trends analysis
 */
async function runDailyTrendsAnalysis(): Promise<void> {
  const startTime = Date.now();
  
  try {
    logger.info('🚀 Starting daily trends analysis');

    // Get comprehensive trend data
    const trendData = await googleTrendsService.getComprehensiveTrendAnalysis();

    // Generate insights and recommendations
    const recommendations = generateRecommendations(trendData);

    // Create daily report
    const report: DailyTrendReport = {
      date: new Date().toISOString().split('T')[0],
      trending_keywords: trendData.keywords.map(k => ({
        keyword: k.keyword,
        score: k.score,
        related_queries: k.relatedQueries
      })),
      geographic_insights: generateGeographicInsights(trendData.geographicTrends),
      recommendations,
      metadata: {
        total_keywords: trendData.keywords.length,
        average_score: trendData.summary.averageScore,
        analysis_duration_ms: Date.now() - startTime
      }
    };

    // Save report to file
    await saveReport(report);

    // Generate summary for console output
    printSummary(report);

    logger.info('✅ Daily trends analysis completed successfully');

  } catch (error) {
    logger.error('❌ Daily trends analysis failed:', error);
    throw error;
  }
}

/**
 * Generate actionable recommendations based on trend data
 */
function generateRecommendations(trendData: any): string[] {
  const recommendations: string[] = [];

  // High-scoring keyword recommendations
  const highScoringKeywords = trendData.keywords.filter((k: any) => k.score >= 80);
  if (highScoringKeywords.length > 0) {
    recommendations.push(
      `🎯 High-opportunity keywords identified: ${highScoringKeywords.slice(0, 3).map((k: any) => k.keyword).join(', ')}`
    );
  }

  // Geographic opportunity recommendations
  if (trendData.summary.topRegions.length > 0) {
    const topRegion = trendData.summary.topRegions[0];
    recommendations.push(
      `🌍 Focus marketing efforts on ${topRegion.geoName} (trend score: ${topRegion.score})`
    );
  }

  // Seasonal trend recommendations
  const currentMonth = new Date().getMonth();
  if (currentMonth >= 10 || currentMonth <= 1) { // Nov, Dec, Jan
    recommendations.push('🎄 Consider holiday-themed product positioning and marketing');
  } else if (currentMonth >= 5 && currentMonth <= 7) { // Jun, Jul, Aug
    recommendations.push('☀️ Summer wellness trends may be emerging - monitor closely');
  }

  // Related query opportunities
  const allRelatedQueries = trendData.keywords
    .flatMap((k: any) => k.relatedQueries)
    .filter((query: string) => query.length > 0);
  
  if (allRelatedQueries.length > 10) {
    recommendations.push(
      `💡 Explore ${allRelatedQueries.length} related search queries for content and product ideas`
    );
  }

  // Trend momentum recommendations
  const averageScore = trendData.summary.averageScore;
  if (averageScore > 70) {
    recommendations.push('🚀 Overall trend momentum is strong - consider increasing ad spend');
  } else if (averageScore < 40) {
    recommendations.push('⚠️ Overall trend momentum is weak - focus on brand building and content');
  }

  return recommendations;
}

/**
 * Generate geographic insights
 */
function generateGeographicInsights(geographicTrends: any[]): Array<{ region: string; top_keywords: string[] }> {
  const regionMap = new Map<string, string[]>();

  geographicTrends.forEach(trend => {
    if (!regionMap.has(trend.geoName)) {
      regionMap.set(trend.geoName, []);
    }
    regionMap.get(trend.geoName)!.push(trend.keyword);
  });

  return Array.from(regionMap.entries())
    .map(([region, keywords]) => ({
      region,
      top_keywords: [...new Set(keywords)].slice(0, 5)
    }))
    .slice(0, 10); // Top 10 regions
}

/**
 * Save report to file
 */
async function saveReport(report: DailyTrendReport): Promise<void> {
  try {
    const reportsDir = path.join(process.cwd(), 'reports', 'trends');
    await fs.mkdir(reportsDir, { recursive: true });

    const fileName = `trends-${report.date}.json`;
    const filePath = path.join(reportsDir, fileName);

    await fs.writeFile(filePath, JSON.stringify(report, null, 2));
    logger.info(`📄 Report saved to: ${filePath}`);

    // Also save a CSV summary for easy analysis
    await saveCsvSummary(report, reportsDir);

  } catch (error) {
    logger.error('Error saving report:', error);
    throw error;
  }
}

/**
 * Save CSV summary
 */
async function saveCsvSummary(report: DailyTrendReport, reportsDir: string): Promise<void> {
  const csvFileName = `trends-summary-${report.date}.csv`;
  const csvPath = path.join(reportsDir, csvFileName);

  const csvContent = [
    'Keyword,Score,Related Queries Count',
    ...report.trending_keywords.map(k => 
      `"${k.keyword}",${k.score},${k.related_queries.length}`
    )
  ].join('\n');

  await fs.writeFile(csvPath, csvContent);
  logger.info(`📊 CSV summary saved to: ${csvPath}`);
}

/**
 * Print summary to console
 */
function printSummary(report: DailyTrendReport): void {
  console.log('\n🎯 DAILY TRENDS ANALYSIS SUMMARY');
  console.log('='.repeat(50));
  console.log(`📅 Date: ${report.date}`);
  console.log(`🔍 Keywords Analyzed: ${report.metadata.total_keywords}`);
  console.log(`📈 Average Trend Score: ${report.metadata.average_score.toFixed(1)}`);
  console.log(`⏱️  Analysis Duration: ${(report.metadata.analysis_duration_ms / 1000).toFixed(2)}s`);

  if (report.trending_keywords.length > 0) {
    console.log('\n🏆 TOP TRENDING KEYWORDS:');
    report.trending_keywords.slice(0, 5).forEach((keyword, index) => {
      console.log(`${index + 1}. ${keyword.keyword} (Score: ${keyword.score})`);
    });
  }

  if (report.geographic_insights.length > 0) {
    console.log('\n🌍 GEOGRAPHIC INSIGHTS:');
    report.geographic_insights.slice(0, 3).forEach((insight, index) => {
      console.log(`${index + 1}. ${insight.region}: ${insight.top_keywords.join(', ')}`);
    });
  }

  if (report.recommendations.length > 0) {
    console.log('\n💡 RECOMMENDATIONS:');
    report.recommendations.forEach((recommendation, index) => {
      console.log(`${index + 1}. ${recommendation}`);
    });
  }

  console.log('\n' + '='.repeat(50));
}

/**
 * Generate weekly trend comparison
 */
async function generateWeeklyComparison(): Promise<void> {
  try {
    const reportsDir = path.join(process.cwd(), 'reports', 'trends');
    const files = await fs.readdir(reportsDir);
    
    const jsonFiles = files
      .filter(f => f.endsWith('.json'))
      .sort()
      .slice(-7); // Last 7 days

    if (jsonFiles.length < 2) {
      logger.info('Not enough data for weekly comparison');
      return;
    }

    const reports: DailyTrendReport[] = [];
    for (const file of jsonFiles) {
      const content = await fs.readFile(path.join(reportsDir, file), 'utf-8');
      reports.push(JSON.parse(content));
    }

    // Analyze trends over time
    console.log('\n📊 WEEKLY TREND COMPARISON:');
    console.log('-'.repeat(50));
    
    const keywordTrends = new Map<string, number[]>();
    reports.forEach(report => {
      report.trending_keywords.forEach(keyword => {
        if (!keywordTrends.has(keyword.keyword)) {
          keywordTrends.set(keyword.keyword, []);
        }
        keywordTrends.get(keyword.keyword)!.push(keyword.score);
      });
    });

    // Show keywords with increasing trends
    const increasingTrends = Array.from(keywordTrends.entries())
      .filter(([_, scores]) => scores.length >= 3)
      .map(([keyword, scores]) => ({
        keyword,
        trend: scores[scores.length - 1] - scores[0],
        latest: scores[scores.length - 1]
      }))
      .filter(item => item.trend > 10)
      .sort((a, b) => b.trend - a.trend)
      .slice(0, 5);

    if (increasingTrends.length > 0) {
      console.log('📈 RISING TRENDS:');
      increasingTrends.forEach((item, index) => {
        console.log(`${index + 1}. ${item.keyword}: +${item.trend.toFixed(1)} (current: ${item.latest})`);
      });
    }

  } catch (error) {
    logger.warn('Could not generate weekly comparison:', error);
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const includeWeekly = args.includes('--weekly');

  runDailyTrendsAnalysis()
    .then(async () => {
      if (includeWeekly) {
        await generateWeeklyComparison();
      }
    })
    .catch(error => {
      logger.error('Script execution failed:', error);
      process.exit(1);
    });
}

export { runDailyTrendsAnalysis, generateWeeklyComparison };