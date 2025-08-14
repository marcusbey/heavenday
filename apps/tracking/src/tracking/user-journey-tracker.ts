import { SheetsClient } from '../sheets/client';
import { config } from '../config';
import { logger } from '../utils/logger';
import { UserActivity, ConversionEvent, UserActivityType, ConversionType, SyncResult } from '../types';
import { format, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';

export class UserJourneyTracker {
  private sheetsClient: SheetsClient;
  private analyticsSpreadsheetId: string;

  constructor() {
    this.sheetsClient = new SheetsClient();
    this.analyticsSpreadsheetId = config.spreadsheets.analytics;
  }

  async trackUserActivity(activity: UserActivity): Promise<void> {
    try {
      logger.info('Tracking user activity', { 
        userId: activity.userId, 
        type: activity.type,
        page: activity.page 
      });

      const activityRow = this.activityToSheetRow(activity);
      await this.sheetsClient.appendRows(
        this.analyticsSpreadsheetId,
        'User Activities',
        [activityRow]
      );

      // Update user journey if it's a significant event
      await this.updateUserJourney(activity);

      logger.info('User activity tracked successfully', { 
        userId: activity.userId, 
        type: activity.type 
      });
    } catch (error) {
      logger.error('Error tracking user activity', { error, activity });
      throw error;
    }
  }

  async trackPageView(data: {
    userId: string;
    sessionId: string;
    page: string;
    referrer?: string;
    userAgent?: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const activity: UserActivity = {
      ...data,
      type: 'page_view',
      ipAddress: data.metadata?.ipAddress,
      timestamp: data.timestamp,
      metadata: data.metadata
    };

    await this.trackUserActivity(activity);
  }

  async trackProductView(data: {
    userId: string;
    sessionId: string;
    productId: string;
    page?: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const activity: UserActivity = {
      ...data,
      type: 'product_view',
      page: data.page || `/products/${data.productId}`,
      timestamp: data.timestamp,
      metadata: data.metadata
    };

    await this.trackUserActivity(activity);
  }

  async trackSearch(data: {
    userId: string;
    sessionId: string;
    searchQuery: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const activity: UserActivity = {
      ...data,
      type: 'search',
      page: '/search',
      timestamp: data.timestamp,
      metadata: data.metadata
    };

    await this.trackUserActivity(activity);
  }

  async trackCartAction(data: {
    userId: string;
    sessionId: string;
    productId: string;
    action: 'add' | 'remove';
    timestamp: Date;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const activity: UserActivity = {
      userId: data.userId,
      sessionId: data.sessionId,
      productId: data.productId,
      type: data.action === 'add' ? 'add_to_cart' : 'remove_from_cart',
      page: data.metadata?.page || '/cart',
      timestamp: data.timestamp,
      metadata: data.metadata
    };

    await this.trackUserActivity(activity);

    // Track as conversion event if adding to cart
    if (data.action === 'add') {
      await this.trackConversion({
        userId: data.userId,
        sessionId: data.sessionId,
        type: 'add_to_cart',
        productId: data.productId,
        timestamp: data.timestamp,
        metadata: data.metadata
      });
    }
  }

  async trackConversion(event: ConversionEvent): Promise<void> {
    try {
      logger.info('Tracking conversion event', { 
        userId: event.userId, 
        type: event.type,
        value: event.value 
      });

      const conversionRow = this.conversionToSheetRow(event);
      await this.sheetsClient.appendRows(
        this.analyticsSpreadsheetId,
        'Conversion Events',
        [conversionRow]
      );

      logger.info('Conversion event tracked successfully', { 
        userId: event.userId, 
        type: event.type 
      });
    } catch (error) {
      logger.error('Error tracking conversion event', { error, event });
      throw error;
    }
  }

  async trackPurchase(data: {
    userId: string;
    sessionId: string;
    orderId: string;
    value: number;
    currency: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  }): Promise<void> {
    // Track the purchase activity
    await this.trackUserActivity({
      userId: data.userId,
      sessionId: data.sessionId,
      type: 'purchase',
      timestamp: data.timestamp,
      metadata: { ...data.metadata, orderId: data.orderId, value: data.value }
    });

    // Track the conversion event
    await this.trackConversion({
      userId: data.userId,
      sessionId: data.sessionId,
      type: 'purchase',
      value: data.value,
      currency: data.currency,
      orderId: data.orderId,
      timestamp: data.timestamp,
      metadata: data.metadata
    });

    // Update user journey
    await this.completeUserJourney(data.userId, data.sessionId, data.timestamp);
  }

  async generateCohortAnalysis(startDate: Date, endDate: Date): Promise<void> {
    try {
      logger.info('Generating cohort analysis', { startDate, endDate });

      // Get all users who made their first purchase in the date range
      const cohorts = await this.getCohortData(startDate, endDate);

      // Clear existing cohort data
      await this.sheetsClient.clearRange(
        this.analyticsSpreadsheetId,
        'Cohort Analysis!A2:Z1000'
      );

      // Add cohort analysis data
      const cohortRows = cohorts.map(cohort => [
        format(cohort.cohortMonth, 'yyyy-MM'),
        cohort.users,
        cohort.retention.month0,
        cohort.retention.month1,
        cohort.retention.month2,
        cohort.retention.month3,
        cohort.retention.month6,
        cohort.retention.month12,
        cohort.averageRevenuePerUser.toFixed(2),
        cohort.totalRevenue.toFixed(2)
      ]);

      if (cohortRows.length > 0) {
        await this.sheetsClient.appendRows(
          this.analyticsSpreadsheetId,
          'Cohort Analysis',
          cohortRows
        );
      }

      logger.info('Cohort analysis generated successfully');
    } catch (error) {
      logger.error('Error generating cohort analysis', { error });
      throw error;
    }
  }

  async updateFunnelAnalysis(): Promise<void> {
    try {
      logger.info('Updating funnel analysis');

      const today = format(new Date(), 'yyyy-MM-dd');
      const funnelData = await this.calculateFunnelMetrics(today);

      // Update or add funnel data
      const funnelRow = [
        today,
        funnelData.visitors,
        funnelData.productViews,
        funnelData.cartAdditions,
        funnelData.checkoutStarted,
        funnelData.purchases,
        funnelData.visitorToProductRate.toFixed(2),
        funnelData.productToCartRate.toFixed(2),
        funnelData.cartToCheckoutRate.toFixed(2),
        funnelData.checkoutToPurchaseRate.toFixed(2),
        funnelData.overallConversionRate.toFixed(2)
      ];

      const existing = await this.sheetsClient.findAndUpdateRow(
        this.analyticsSpreadsheetId,
        'Funnel Analysis',
        0, // Search in Date column
        today,
        funnelRow
      );

      if (!existing) {
        await this.sheetsClient.appendRows(
          this.analyticsSpreadsheetId,
          'Funnel Analysis',
          [funnelRow]
        );
      }

      logger.info('Funnel analysis updated successfully');
    } catch (error) {
      logger.error('Error updating funnel analysis', { error });
      throw error;
    }
  }

  async syncAnalyticsData(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      recordsProcessed: 0,
      recordsAdded: 0,
      recordsUpdated: 0,
      errors: [],
      timestamp: new Date()
    };

    try {
      logger.info('Starting analytics data sync');

      // Update funnel analysis
      await this.updateFunnelAnalysis();
      result.recordsProcessed++;

      // Generate cohort analysis for the last 12 months
      const startDate = startOfMonth(new Date());
      startDate.setMonth(startDate.getMonth() - 12);
      const endDate = endOfMonth(new Date());
      
      await this.generateCohortAnalysis(startDate, endDate);
      result.recordsProcessed++;

      // Update user journeys summary
      await this.updateUserJourneysSummary();
      result.recordsProcessed++;

      result.recordsAdded = result.recordsProcessed;
      result.success = true;

      logger.info('Analytics data sync completed', result);
      return result;
    } catch (error) {
      const errorMessage = `Error during analytics sync: ${error}`;
      result.errors.push(errorMessage);
      logger.error(errorMessage, { error });
      return result;
    }
  }

  private async updateUserJourney(activity: UserActivity): Promise<void> {
    try {
      // Get or create user journey for this session
      const journey = await this.getUserJourney(activity.userId, activity.sessionId);
      
      if (journey) {
        // Update existing journey
        await this.updateExistingJourney(journey, activity);
      } else {
        // Create new journey
        await this.createNewJourney(activity);
      }
    } catch (error) {
      logger.error('Error updating user journey', { error, activity });
      // Don't throw - this is supplementary tracking
    }
  }

  private async getUserJourney(userId: string, sessionId: string): Promise<any | null> {
    try {
      const values = await this.sheetsClient.getValues(
        this.analyticsSpreadsheetId,
        'User Journey!A:O'
      );
      
      return values.find(row => row[0] === userId && row[1] === sessionId);
    } catch (error) {
      logger.error('Error getting user journey', { error, userId, sessionId });
      return null;
    }
  }

  private async createNewJourney(activity: UserActivity): Promise<void> {
    const journeyRow = [
      activity.userId,
      activity.sessionId,
      format(activity.timestamp, 'yyyy-MM-dd HH:mm:ss'), // Journey Start
      '', // Journey End - will be updated later
      1, // Pages Visited
      activity.type === 'product_view' ? 1 : 0, // Products Viewed
      activity.type === 'category_view' ? 1 : 0, // Categories Browsed
      activity.type === 'search' ? 1 : 0, // Search Queries
      activity.type === 'add_to_cart' ? 1 : 0, // Cart Additions
      activity.type === 'checkout_started' ? 1 : 0, // Checkout Started
      activity.type === 'purchase' ? 1 : 0, // Purchase Completed
      0, // Session Duration (will be calculated)
      0, // Bounce Rate (will be calculated)
      '' // Conversion Type (will be updated)
    ];

    await this.sheetsClient.appendRows(
      this.analyticsSpreadsheetId,
      'User Journey',
      [journeyRow]
    );
  }

  private async updateExistingJourney(journey: any[], activity: UserActivity): Promise<void> {
    // Update journey metrics based on new activity
    const updatedJourney = [...journey];
    
    // Update counters
    if (activity.type === 'page_view') updatedJourney[4] = parseInt(updatedJourney[4]) + 1;
    if (activity.type === 'product_view') updatedJourney[5] = parseInt(updatedJourney[5]) + 1;
    if (activity.type === 'category_view') updatedJourney[6] = parseInt(updatedJourney[6]) + 1;
    if (activity.type === 'search') updatedJourney[7] = parseInt(updatedJourney[7]) + 1;
    if (activity.type === 'add_to_cart') updatedJourney[8] = parseInt(updatedJourney[8]) + 1;
    if (activity.type === 'checkout_started') updatedJourney[9] = parseInt(updatedJourney[9]) + 1;
    if (activity.type === 'purchase') updatedJourney[10] = parseInt(updatedJourney[10]) + 1;

    // Update journey end time
    updatedJourney[3] = format(activity.timestamp, 'yyyy-MM-dd HH:mm:ss');

    // Calculate session duration
    const startTime = new Date(updatedJourney[2]);
    const endTime = new Date(updatedJourney[3]);
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    updatedJourney[11] = durationMinutes;

    // Determine if it's a bounce (single page view with short duration)
    const bounceRate = parseInt(updatedJourney[4]) === 1 && durationMinutes < 2 ? 1 : 0;
    updatedJourney[12] = bounceRate;

    // Update conversion type
    if (activity.type === 'purchase') updatedJourney[13] = 'purchase';
    else if (activity.type === 'checkout_started' && !updatedJourney[13]) updatedJourney[13] = 'checkout';
    else if (activity.type === 'add_to_cart' && !updatedJourney[13]) updatedJourney[13] = 'cart';

    // Update the row
    await this.sheetsClient.findAndUpdateRow(
      this.analyticsSpreadsheetId,
      'User Journey',
      0, // Search in User ID column
      activity.userId,
      updatedJourney
    );
  }

  private async completeUserJourney(userId: string, sessionId: string, timestamp: Date): Promise<void> {
    // Mark journey as completed with purchase
    const journey = await this.getUserJourney(userId, sessionId);
    if (journey) {
      journey[3] = format(timestamp, 'yyyy-MM-dd HH:mm:ss'); // Journey End
      journey[10] = parseInt(journey[10]) + 1; // Purchase Completed
      journey[13] = 'purchase'; // Conversion Type

      await this.sheetsClient.findAndUpdateRow(
        this.analyticsSpreadsheetId,
        'User Journey',
        0,
        userId,
        journey
      );
    }
  }

  private async updateUserJourneysSummary(): Promise<void> {
    // This would calculate and update summary metrics for user journeys
    // Implementation would depend on specific requirements
    logger.info('User journeys summary updated');
  }

  private async getCohortData(startDate: Date, endDate: Date): Promise<any[]> {
    // This would analyze user data to generate cohort information
    // For now, return empty array - implement based on your specific needs
    logger.info('Generating cohort data', { startDate, endDate });
    return [];
  }

  private async calculateFunnelMetrics(date: string): Promise<any> {
    try {
      // Get activities for the date
      const activities = await this.getActivitiesForDate(date);
      
      const visitors = new Set(activities.map(a => a.userId)).size;
      const productViews = activities.filter(a => a.type === 'product_view').length;
      const cartAdditions = activities.filter(a => a.type === 'add_to_cart').length;
      const checkoutStarted = activities.filter(a => a.type === 'checkout_started').length;
      const purchases = activities.filter(a => a.type === 'purchase').length;

      return {
        visitors,
        productViews,
        cartAdditions,
        checkoutStarted,
        purchases,
        visitorToProductRate: visitors > 0 ? (productViews / visitors) * 100 : 0,
        productToCartRate: productViews > 0 ? (cartAdditions / productViews) * 100 : 0,
        cartToCheckoutRate: cartAdditions > 0 ? (checkoutStarted / cartAdditions) * 100 : 0,
        checkoutToPurchaseRate: checkoutStarted > 0 ? (purchases / checkoutStarted) * 100 : 0,
        overallConversionRate: visitors > 0 ? (purchases / visitors) * 100 : 0
      };
    } catch (error) {
      logger.error('Error calculating funnel metrics', { error, date });
      return {
        visitors: 0,
        productViews: 0,
        cartAdditions: 0,
        checkoutStarted: 0,
        purchases: 0,
        visitorToProductRate: 0,
        productToCartRate: 0,
        cartToCheckoutRate: 0,
        checkoutToPurchaseRate: 0,
        overallConversionRate: 0
      };
    }
  }

  private async getActivitiesForDate(date: string): Promise<UserActivity[]> {
    try {
      const values = await this.sheetsClient.getValues(
        this.analyticsSpreadsheetId,
        'User Activities!A:P'
      );
      
      return values
        .filter(row => {
          const timestamp = new Date(row[10]); // Timestamp column
          return format(timestamp, 'yyyy-MM-dd') === date;
        })
        .map(row => this.sheetRowToActivity(row));
    } catch (error) {
      logger.error('Error getting activities for date', { error, date });
      return [];
    }
  }

  private activityToSheetRow(activity: UserActivity): any[] {
    const deviceType = this.getDeviceType(activity.userAgent);
    const browser = this.getBrowser(activity.userAgent);
    const location = this.getLocation(activity.ipAddress);

    return [
      activity.userId,
      activity.sessionId,
      activity.type,
      activity.page || '',
      activity.productId || '',
      activity.categoryId || '',
      activity.searchQuery || '',
      activity.referrer || '',
      activity.userAgent || '',
      activity.ipAddress || '',
      format(activity.timestamp, 'yyyy-MM-dd HH:mm:ss'),
      0, // Duration - will be calculated
      deviceType,
      browser,
      location.country,
      location.city
    ];
  }

  private conversionToSheetRow(conversion: ConversionEvent): any[] {
    const conversionPath = this.getConversionPath(conversion.userId, conversion.sessionId);
    const daysToConvert = this.getDaysToConvert(conversion.userId, conversion.timestamp);
    const touchpoints = this.getTouchpoints(conversion.userId, conversion.sessionId);

    return [
      conversion.userId,
      conversion.sessionId,
      conversion.type,
      conversion.value || 0,
      conversion.currency || 'USD',
      conversion.orderId || '',
      conversion.productId || '',
      format(conversion.timestamp, 'yyyy-MM-dd HH:mm:ss'),
      conversionPath,
      daysToConvert,
      touchpoints
    ];
  }

  private sheetRowToActivity(row: any[]): UserActivity {
    return {
      userId: row[0],
      sessionId: row[1],
      type: row[2] as UserActivityType,
      page: row[3] || undefined,
      productId: row[4] || undefined,
      categoryId: row[5] || undefined,
      searchQuery: row[6] || undefined,
      referrer: row[7] || undefined,
      userAgent: row[8] || undefined,
      ipAddress: row[9] || undefined,
      timestamp: new Date(row[10])
    };
  }

  private getDeviceType(userAgent?: string): string {
    if (!userAgent) return 'Unknown';
    
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      return /iPad/.test(userAgent) ? 'Tablet' : 'Mobile';
    }
    return 'Desktop';
  }

  private getBrowser(userAgent?: string): string {
    if (!userAgent) return 'Unknown';
    
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Other';
  }

  private getLocation(ipAddress?: string): { country: string; city: string } {
    // This would integrate with a geolocation service
    // For now, return default values
    return { country: 'Unknown', city: 'Unknown' };
  }

  private getConversionPath(userId: string, sessionId: string): string {
    // This would analyze the user's journey to create a conversion path
    return 'Direct';
  }

  private getDaysToConvert(userId: string, conversionTime: Date): number {
    // This would calculate days from first visit to conversion
    return 0;
  }

  private getTouchpoints(userId: string, sessionId: string): number {
    // This would count the number of touchpoints in the user's journey
    return 1;
  }
}