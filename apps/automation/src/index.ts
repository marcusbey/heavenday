import dotenv from 'dotenv';
import { logger, performanceLogger } from './utils/logger';
import { trendSchedulerService } from './scheduler/trend-scheduler';
import { TrendAnalysisResult } from './types/trends';

dotenv.config();

logger.info('🚀 Heaven Dolls Automation Service Started');

/**
 * Main automation orchestrator
 * Runs the full trend analysis and product sourcing pipeline
 */
export async function runAutomation(): Promise<TrendAnalysisResult> {
  const timer = performanceLogger.startTimer('Full Automation Pipeline');
  
  try {
    logger.info('🔄 Starting automation pipeline...');
    
    // Run the comprehensive automation pipeline
    const result = await trendSchedulerService.runFullPipeline();
    
    logger.info('✅ Automation pipeline completed successfully!');
    logger.info(`📊 Results: ${result.googleTrends.keywords.length} trends, ${result.productOpportunities.length} products, ${result.recommendations.length} recommendations`);
    
    return result;
  } catch (error) {
    logger.error('❌ Automation pipeline failed:', error);
    throw error;
  } finally {
    timer.end();
    performanceLogger.logMemoryUsage();
  }
}

/**
 * Start the scheduler service for automated runs
 */
export function startScheduler() {
  logger.info('🕒 Starting scheduler service...');
  trendSchedulerService.start();
  
  // Graceful shutdown handlers
  process.on('SIGINT', () => {
    logger.info('📥 Received SIGINT, shutting down gracefully...');
    trendSchedulerService.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('📥 Received SIGTERM, shutting down gracefully...');
    trendSchedulerService.stop();
    process.exit(0);
  });
}

/**
 * Get service status
 */
export function getStatus() {
  return {
    service: 'Heaven Dolls Automation',
    status: 'operational',
    scheduler: trendSchedulerService.getStatus(),
    timestamp: new Date().toISOString()
  };
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'run':
      runAutomation()
        .then(result => {
          console.log('\n📋 Summary:');
          console.log(`• Google Trends: ${result.googleTrends.keywords.length} keywords found`);
          console.log(`• Social Media: ${result.socialMediaTrends.length} trends found`);
          console.log(`• Products: ${result.productOpportunities.length} products scraped`);
          console.log(`• Recommendations: ${result.recommendations.length} generated`);
          
          if (result.recommendations.length > 0) {
            console.log('\n💡 Top Recommendations:');
            result.recommendations.slice(0, 3).forEach((rec, i) => {
              console.log(`${i + 1}. ${rec}`);
            });
          }
        })
        .catch(error => {
          logger.error('CLI execution failed:', error);
          process.exit(1);
        });
      break;
    
    case 'schedule':
      startScheduler();
      logger.info('✅ Scheduler started. Press Ctrl+C to stop.');
      break;
    
    case 'status':
      console.log(JSON.stringify(getStatus(), null, 2));
      break;
    
    default:
      console.log(`
🏠 Heaven Dolls Automation Service

Usage:
  npm run pipeline:full        # Run the full automation pipeline once
  npm run scheduler:start      # Start the scheduled automation service
  
Commands:
  node dist/index.js run       # Run pipeline once
  node dist/index.js schedule  # Start scheduler
  node dist/index.js status    # Get service status

Environment Variables:
  See .env.example for required configuration
      `);
      break;
  }
}