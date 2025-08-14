import { logger } from './utils/logger';
import { config, trackingEnabled } from './config';
import { SyncScheduler } from './automation/sync-scheduler';
import { WebhookServer } from './webhooks/server';
import { EmailService } from './notifications/email-service';

export class TrackingService {
  private syncScheduler: SyncScheduler;
  private webhookServer: WebhookServer;
  private emailService: EmailService;

  constructor() {
    this.syncScheduler = new SyncScheduler();
    this.webhookServer = new WebhookServer();
    this.emailService = new EmailService();
  }

  async start(): Promise<void> {
    try {
      logger.info('Starting Heaven Dolls Tracking Service');

      if (!trackingEnabled) {
        logger.warn('Tracking is disabled via configuration');
        return;
      }

      // Test email service connection
      const emailConnected = await this.emailService.testConnection();
      if (!emailConnected) {
        logger.warn('Email service connection failed - notifications may not work');
      }

      // Start sync scheduler
      this.syncScheduler.start();
      logger.info('Sync scheduler started');

      // Start webhook server
      this.webhookServer.start();
      logger.info('Webhook server started');

      // Send startup notification
      await this.sendStartupNotification();

      logger.info('Heaven Dolls Tracking Service started successfully');
    } catch (error) {
      logger.error('Error starting tracking service', { error });
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      logger.info('Stopping Heaven Dolls Tracking Service');

      // Stop sync scheduler
      this.syncScheduler.stop();
      logger.info('Sync scheduler stopped');

      // Webhook server would need a stop method implementation
      // this.webhookServer.stop();

      logger.info('Heaven Dolls Tracking Service stopped');
    } catch (error) {
      logger.error('Error stopping tracking service', { error });
      throw error;
    }
  }

  private async sendStartupNotification(): Promise<void> {
    try {
      await this.emailService.sendSystemErrorAlert({
        service: 'tracking-service',
        error: 'Service started successfully',
        timestamp: new Date(),
        severity: 'low',
        details: 'Heaven Dolls tracking service has been initialized and is now running'
      });
    } catch (error) {
      logger.error('Error sending startup notification', { error });
      // Don't throw - this is not critical
    }
  }
}

// Export all main classes for external use
export { OrderTracker } from './tracking/order-tracker';
export { UserJourneyTracker } from './tracking/user-journey-tracker';
export { SupportTracker } from './tracking/support-tracker';
export { InventoryTracker } from './tracking/inventory-tracker';
export { BusinessIntelligenceTracker } from './tracking/business-intelligence-tracker';
export { EmailService } from './notifications/email-service';
export { WebhookServer } from './webhooks/server';
export { SheetsInitializer } from './setup/sheets-initializer';
export { SheetsClient } from './sheets/client';

// Export types
export * from './types';

// Start the service if this file is run directly
if (require.main === module) {
  const trackingService = new TrackingService();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully');
    await trackingService.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    await trackingService.stop();
    process.exit(0);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', { promise, reason });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', { error });
    process.exit(1);
  });

  // Start the service
  trackingService.start().catch((error) => {
    logger.error('Failed to start tracking service', { error });
    process.exit(1);
  });
}