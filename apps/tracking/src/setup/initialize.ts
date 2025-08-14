#!/usr/bin/env tsx

import { logger } from '../utils/logger';
import { SheetsInitializer } from './sheets-initializer';
import { EmailService } from '../notifications/email-service';

async function initialize() {
  try {
    console.log('🚀 Initializing Heaven Dolls Tracking System...\n');

    // Initialize Google Sheets
    const sheetsInitializer = new SheetsInitializer();
    
    console.log('📊 Creating Google Sheets spreadsheets...');
    const spreadsheetIds = await sheetsInitializer.initializeAllSpreadsheets();
    
    console.log('\n✅ All spreadsheets created successfully!');
    console.log('\n📋 Spreadsheet IDs:');
    console.log(`Orders: ${spreadsheetIds.orders}`);
    console.log(`Analytics: ${spreadsheetIds.analytics}`);
    console.log(`Support: ${spreadsheetIds.support}`);
    console.log(`Inventory: ${spreadsheetIds.inventory}`);
    console.log(`Business Intelligence: ${spreadsheetIds.businessIntelligence}`);

    // Update environment file
    console.log('\n🔧 Update your .env file with these spreadsheet IDs:');
    console.log(`ORDERS_SPREADSHEET_ID=${spreadsheetIds.orders}`);
    console.log(`ANALYTICS_SPREADSHEET_ID=${spreadsheetIds.analytics}`);
    console.log(`SUPPORT_SPREADSHEET_ID=${spreadsheetIds.support}`);
    console.log(`INVENTORY_SPREADSHEET_ID=${spreadsheetIds.inventory}`);
    console.log(`BUSINESS_INTELLIGENCE_SPREADSHEET_ID=${spreadsheetIds.businessIntelligence}`);

    // Test email service
    console.log('\n📧 Testing email service connection...');
    const emailService = new EmailService();
    const emailConnected = await emailService.testConnection();
    
    if (emailConnected) {
      console.log('✅ Email service connection successful');
    } else {
      console.log('⚠️  Email service connection failed - check your SMTP configuration');
    }

    console.log('\n🎉 Initialization completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Update your .env file with the spreadsheet IDs above');
    console.log('2. Share the spreadsheets with your team members');
    console.log('3. Start the tracking service: npm run dev');
    console.log('4. Test webhooks: npm run webhook:start');

    // Generate sharing links
    console.log('\n🔗 Google Sheets Links:');
    console.log(`Orders Dashboard: https://docs.google.com/spreadsheets/d/${spreadsheetIds.orders}`);
    console.log(`Analytics: https://docs.google.com/spreadsheets/d/${spreadsheetIds.analytics}`);
    console.log(`Support: https://docs.google.com/spreadsheets/d/${spreadsheetIds.support}`);
    console.log(`Inventory: https://docs.google.com/spreadsheets/d/${spreadsheetIds.inventory}`);
    console.log(`Business Intelligence: https://docs.google.com/spreadsheets/d/${spreadsheetIds.businessIntelligence}`);

    console.log('\n✨ Heaven Dolls Tracking System is ready to use!');

  } catch (error) {
    console.error('❌ Initialization failed:', error);
    logger.error('Initialization failed', { error });
    process.exit(1);
  }
}

// Run initialization
initialize();