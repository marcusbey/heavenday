#!/usr/bin/env tsx

import { logger } from '../utils/logger';
import { OrderTracker } from '../tracking/order-tracker';
import { UserJourneyTracker } from '../tracking/user-journey-tracker';
import { SupportTracker } from '../tracking/support-tracker';
import { InventoryTracker } from '../tracking/inventory-tracker';
import { BusinessIntelligenceTracker } from '../tracking/business-intelligence-tracker';

async function syncAllData() {
  try {
    console.log('🔄 Starting manual data sync...\n');

    // Initialize all trackers
    const orderTracker = new OrderTracker();
    const userJourneyTracker = new UserJourneyTracker();
    const supportTracker = new SupportTracker();
    const inventoryTracker = new InventoryTracker();
    const biTracker = new BusinessIntelligenceTracker();

    const startTime = Date.now();

    // Sync Orders
    console.log('📦 Syncing orders data...');
    const orderResult = await orderTracker.syncOrdersFromStrapi();
    console.log(`   ✅ Orders: ${orderResult.recordsProcessed} processed, ${orderResult.recordsAdded} added, ${orderResult.recordsUpdated} updated`);
    if (orderResult.errors.length > 0) {
      console.log(`   ⚠️  Errors: ${orderResult.errors.length}`);
    }

    // Sync User Analytics
    console.log('\n📊 Syncing user analytics...');
    const analyticsResult = await userJourneyTracker.syncAnalyticsData();
    console.log(`   ✅ Analytics: ${analyticsResult.recordsProcessed} processed`);
    if (analyticsResult.errors.length > 0) {
      console.log(`   ⚠️  Errors: ${analyticsResult.errors.length}`);
    }

    // Update funnel analysis
    console.log('\n🔍 Updating funnel analysis...');
    await userJourneyTracker.updateFunnelAnalysis();
    console.log('   ✅ Funnel analysis updated');

    // Sync Support Data
    console.log('\n🎧 Syncing support data...');
    const supportResult = await supportTracker.syncSupportData();
    console.log(`   ✅ Support: ${supportResult.recordsProcessed} processed`);
    if (supportResult.errors.length > 0) {
      console.log(`   ⚠️  Errors: ${supportResult.errors.length}`);
    }

    // Sync Inventory
    console.log('\n📋 Syncing inventory data...');
    const inventoryResult = await inventoryTracker.syncInventoryData();
    console.log(`   ✅ Inventory: ${inventoryResult.recordsProcessed} processed, ${inventoryResult.recordsUpdated} updated`);
    if (inventoryResult.errors.length > 0) {
      console.log(`   ⚠️  Errors: ${inventoryResult.errors.length}`);
    }

    // Sync Business Intelligence
    console.log('\n📈 Syncing business intelligence...');
    const biResult = await biTracker.syncBusinessIntelligence();
    console.log(`   ✅ Business Intelligence: ${biResult.recordsProcessed} processed`);
    if (biResult.errors.length > 0) {
      console.log(`   ⚠️  Errors: ${biResult.errors.length}`);
    }

    // Generate cohort analysis
    console.log('\n👥 Generating cohort analysis...');
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);
    const endDate = new Date();
    await userJourneyTracker.generateCohortAnalysis(startDate, endDate);
    console.log('   ✅ Cohort analysis generated');

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`\n🎉 Sync completed successfully in ${duration} seconds!`);

    // Summary
    const totalProcessed = 
      orderResult.recordsProcessed +
      analyticsResult.recordsProcessed +
      supportResult.recordsProcessed +
      inventoryResult.recordsProcessed +
      biResult.recordsProcessed;

    const totalErrors = 
      orderResult.errors.length +
      analyticsResult.errors.length +
      supportResult.errors.length +
      inventoryResult.errors.length +
      biResult.errors.length;

    console.log(`\n📊 Summary:`);
    console.log(`   Total records processed: ${totalProcessed}`);
    console.log(`   Total errors: ${totalErrors}`);
    console.log(`   Duration: ${duration} seconds`);

    if (totalErrors > 0) {
      console.log('\n⚠️  Check logs for error details');
      logger.error('Sync completed with errors', {
        totalErrors,
        orderErrors: orderResult.errors.length,
        analyticsErrors: analyticsResult.errors.length,
        supportErrors: supportResult.errors.length,
        inventoryErrors: inventoryResult.errors.length,
        biErrors: biResult.errors.length
      });
    }

  } catch (error) {
    console.error('❌ Sync failed:', error);
    logger.error('Manual sync failed', { error });
    process.exit(1);
  }
}

// Command line arguments handling
const args = process.argv.slice(2);
const syncType = args[0] || 'all';

async function runSync() {
  switch (syncType) {
    case 'orders':
      console.log('📦 Syncing orders only...');
      const orderTracker = new OrderTracker();
      const result = await orderTracker.syncOrdersFromStrapi();
      console.log(`✅ ${result.recordsProcessed} orders processed`);
      break;
    
    case 'analytics':
      console.log('📊 Syncing analytics only...');
      const analyticsTracker = new UserJourneyTracker();
      await analyticsTracker.syncAnalyticsData();
      console.log('✅ Analytics synced');
      break;
    
    case 'support':
      console.log('🎧 Syncing support only...');
      const supportTracker = new SupportTracker();
      await supportTracker.syncSupportData();
      console.log('✅ Support data synced');
      break;
    
    case 'inventory':
      console.log('📋 Syncing inventory only...');
      const inventoryTracker = new InventoryTracker();
      await inventoryTracker.syncInventoryData();
      console.log('✅ Inventory synced');
      break;
    
    case 'bi':
      console.log('📈 Syncing business intelligence only...');
      const biTracker = new BusinessIntelligenceTracker();
      await biTracker.syncBusinessIntelligence();
      console.log('✅ Business intelligence synced');
      break;
    
    case 'all':
    default:
      await syncAllData();
      break;
  }
}

// Show usage if help requested
if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: npm run sheets:sync [type]');
  console.log('');
  console.log('Types:');
  console.log('  all        - Sync all data (default)');
  console.log('  orders     - Sync orders only');
  console.log('  analytics  - Sync user analytics only');
  console.log('  support    - Sync support data only');
  console.log('  inventory  - Sync inventory data only');
  console.log('  bi         - Sync business intelligence only');
  console.log('');
  console.log('Examples:');
  console.log('  npm run sheets:sync');
  console.log('  npm run sheets:sync orders');
  console.log('  npm run sheets:sync analytics');
  process.exit(0);
}

// Run the sync
runSync().catch(error => {
  console.error('❌ Sync failed:', error);
  process.exit(1);
});