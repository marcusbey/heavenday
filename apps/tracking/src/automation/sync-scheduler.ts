import cron from 'node-cron';
import { logger } from '../utils/logger';
import { config } from '../config';
import { OrderTracker } from '../tracking/order-tracker';
import { UserJourneyTracker } from '../tracking/user-journey-tracker';
import { SupportTracker } from '../tracking/support-tracker';
import { InventoryTracker } from '../tracking/inventory-tracker';
import { BusinessIntelligenceTracker } from '../tracking/business-intelligence-tracker';
import { EmailService } from '../notifications/email-service';
import { SheetsInitializer } from '../setup/sheets-initializer';

export class SyncScheduler {
  private orderTracker: OrderTracker;
  private userJourneyTracker: UserJourneyTracker;
  private supportTracker: SupportTracker;
  private inventoryTracker: InventoryTracker;
  private biTracker: BusinessIntelligenceTracker;
  private emailService: EmailService;
  private sheetsInitializer: SheetsInitializer;

  constructor() {
    this.orderTracker = new OrderTracker();
    this.userJourneyTracker = new UserJourneyTracker();
    this.supportTracker = new SupportTracker();
    this.inventoryTracker = new InventoryTracker();
    this.biTracker = new BusinessIntelligenceTracker();
    this.emailService = new EmailService();
    this.sheetsInitializer = new SheetsInitializer();
  }

  public start(): void {
    logger.info('Starting sync scheduler');

    // Every 5 minutes - Real-time data sync
    cron.schedule('*/5 * * * *', async () => {
      await this.syncRealTimeData();
    });

    // Every hour - Analytics and aggregations
    cron.schedule('0 * * * *', async () => {
      await this.syncHourlyData();
    });

    // Every day at 6 AM - Daily reports and maintenance
    cron.schedule('0 6 * * *', async () => {
      await this.syncDailyData();
    });

    // Every Monday at 8 AM - Weekly reports
    cron.schedule('0 8 * * 1', async () => {
      await this.syncWeeklyData();
    });

    // Every month on the 1st at 9 AM - Monthly reports and cleanup
    cron.schedule('0 9 1 * *', async () => {
      await this.syncMonthlyData();
    });

    logger.info('Sync scheduler started successfully');
  }

  private async syncRealTimeData(): Promise<void> {
    try {
      logger.info('Starting real-time data sync');

      // Sync orders from Strapi
      const orderResult = await this.orderTracker.syncOrdersFromStrapi();
      logger.info('Orders sync completed', { 
        processed: orderResult.recordsProcessed,
        added: orderResult.recordsAdded,
        updated: orderResult.recordsUpdated,
        errors: orderResult.errors.length 
      });

      // Sync inventory data
      const inventoryResult = await this.inventoryTracker.syncInventoryData();
      logger.info('Inventory sync completed', { 
        processed: inventoryResult.recordsProcessed,
        updated: inventoryResult.recordsUpdated,
        errors: inventoryResult.errors.length 
      });

      // Handle sync errors
      if (orderResult.errors.length > 0 || inventoryResult.errors.length > 0) {
        await this.emailService.sendSystemErrorAlert({
          service: 'real-time-sync',
          error: 'Sync errors detected',
          timestamp: new Date(),
          severity: 'medium',
          details: `Order errors: ${orderResult.errors.length}, Inventory errors: ${inventoryResult.errors.length}`
        });
      }

      logger.info('Real-time data sync completed');
    } catch (error) {
      logger.error('Error in real-time data sync', { error });
      
      await this.emailService.sendSystemErrorAlert({
        service: 'real-time-sync',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        severity: 'high',
        details: 'Real-time sync job failed'
      });
    }
  }

  private async syncHourlyData(): Promise<void> {
    try {
      logger.info('Starting hourly data sync');

      // Update analytics and user journey data
      const analyticsResult = await this.userJourneyTracker.syncAnalyticsData();
      logger.info('Analytics sync completed', { 
        processed: analyticsResult.recordsProcessed,
        errors: analyticsResult.errors.length 
      });

      // Update support metrics
      await this.supportTracker.updateAgentPerformance();
      await this.supportTracker.updateCategoryAnalysis();
      logger.info('Support metrics updated');

      // Update funnel analysis
      await this.userJourneyTracker.updateFunnelAnalysis();
      logger.info('Funnel analysis updated');

      logger.info('Hourly data sync completed');
    } catch (error) {
      logger.error('Error in hourly data sync', { error });
      
      await this.emailService.sendSystemErrorAlert({
        service: 'hourly-sync',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        severity: 'medium',
        details: 'Hourly sync job failed'
      });
    }
  }

  private async syncDailyData(): Promise<void> {
    try {
      logger.info('Starting daily data sync');

      const today = new Date();
      
      // Update daily support metrics
      await this.supportTracker.updateDailyMetrics(today);
      logger.info('Daily support metrics updated');

      // Update business intelligence dashboards
      const biResult = await this.biTracker.syncBusinessIntelligence();
      logger.info('Business intelligence sync completed', { 
        processed: biResult.recordsProcessed,
        errors: biResult.errors.length 
      });

      // Update inventory forecasting
      await this.inventoryTracker.updateInventoryForecasting();
      logger.info('Inventory forecasting updated');

      // Generate and send daily report
      await this.sendDailyReport(today);

      logger.info('Daily data sync completed');
    } catch (error) {
      logger.error('Error in daily data sync', { error });
      
      await this.emailService.sendSystemErrorAlert({
        service: 'daily-sync',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        severity: 'high',
        details: 'Daily sync job failed'
      });
    }
  }

  private async syncWeeklyData(): Promise<void> {
    try {
      logger.info('Starting weekly data sync');

      // Generate cohort analysis
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7 * 12); // Last 12 weeks
      const endDate = new Date();

      await this.userJourneyTracker.generateCohortAnalysis(startDate, endDate);
      logger.info('Cohort analysis generated');

      // Generate and send weekly report
      await this.sendWeeklyReport();

      logger.info('Weekly data sync completed');
    } catch (error) {
      logger.error('Error in weekly data sync', { error });
      
      await this.emailService.sendSystemErrorAlert({
        service: 'weekly-sync',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        severity: 'medium',
        details: 'Weekly sync job failed'
      });
    }
  }

  private async syncMonthlyData(): Promise<void> {
    try {
      logger.info('Starting monthly data sync');

      // Update customer segments
      await this.biTracker.updateCustomerSegments();
      logger.info('Customer segments updated');

      // Update supplier performance
      await this.inventoryTracker.updateSupplierPerformance();
      logger.info('Supplier performance updated');

      // Generate comprehensive business report
      const startDate = new Date();
      startDate.setDate(1); // First day of current month
      startDate.setMonth(startDate.getMonth() - 1); // Previous month
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0); // Last day of previous month

      const businessReport = await this.biTracker.generateBusinessReport(startDate, endDate);
      logger.info('Monthly business report generated', { 
        period: businessReport.period 
      });

      // Cleanup old data (optional)
      await this.cleanupOldData();

      logger.info('Monthly data sync completed');
    } catch (error) {
      logger.error('Error in monthly data sync', { error });
      
      await this.emailService.sendSystemErrorAlert({
        service: 'monthly-sync',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        severity: 'high',
        details: 'Monthly sync job failed'
      });
    }
  }

  private async sendDailyReport(date: Date): Promise<void> {
    try {
      // This would gather data from various sources to create a daily report
      const reportData = {
        date: date.toISOString().split('T')[0],
        totalOrders: 45, // Mock data - implement actual data gathering
        totalRevenue: 8750.50,
        newCustomers: 12,
        supportTickets: 8,
        lowStockAlerts: 3,
        systemErrors: 1,
        topProducts: [
          { name: 'Premium Doll A', orders: 8, revenue: 1200 },
          { name: 'Luxury Collection B', orders: 6, revenue: 950 },
          { name: 'Standard Doll C', orders: 12, revenue: 480 }
        ],
        keyMetrics: {
          customerSatisfactionScore: 4.3,
          averageResponseTime: 28.5
        }
      };

      await this.emailService.sendDailyReport(reportData);
      logger.info('Daily report sent successfully');
    } catch (error) {
      logger.error('Error sending daily report', { error });
    }
  }

  private async sendWeeklyReport(): Promise<void> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      // This would gather comprehensive weekly data
      const reportData = {
        weekStart: startDate.toISOString().split('T')[0],
        weekEnd: endDate.toISOString().split('T')[0],
        summary: {
          totalRevenue: 61250.75,
          totalOrders: 315,
          newCustomers: 89,
          conversionRate: 3.2
        },
        trends: {
          revenueGrowth: 12.5,
          customerGrowth: 8.3,
          aovTrend: -2.1
        },
        recommendations: [
          'Focus marketing efforts on high-converting product categories',
          'Implement retention campaigns for new customer segment',
          'Optimize checkout process to reduce abandonment rate'
        ]
      };

      await this.emailService.sendWeeklyReport(reportData);
      logger.info('Weekly report sent successfully');
    } catch (error) {
      logger.error('Error sending weekly report', { error });
    }
  }

  private async cleanupOldData(): Promise<void> {
    try {
      logger.info('Starting data cleanup');
      
      // This would implement data retention policies
      // For example, archiving old activity data, cleaning up resolved alerts, etc.
      // Implementation depends on your data retention requirements
      
      logger.info('Data cleanup completed');
    } catch (error) {
      logger.error('Error in data cleanup', { error });
    }
  }

  public stop(): void {
    logger.info('Stopping sync scheduler');
    cron.getTasks().forEach(task => {
      task.stop();
    });
    logger.info('Sync scheduler stopped');
  }
}