import { SheetsClient } from '../sheets/client';
import { config } from '../config';
import { logger } from '../utils/logger';
import { BusinessMetric, SyncResult } from '../types';
import { format, startOfMonth, endOfMonth, subDays, subMonths } from 'date-fns';

export class BusinessIntelligenceTracker {
  private sheetsClient: SheetsClient;
  private biSpreadsheetId: string;

  constructor() {
    this.sheetsClient = new SheetsClient();
    this.biSpreadsheetId = config.spreadsheets.businessIntelligence;
  }

  async updateKPIDashboard(date: Date = new Date()): Promise<void> {
    try {
      logger.info('Updating KPI dashboard', { date });

      const dateStr = format(date, 'yyyy-MM-dd');
      const kpis = await this.calculateKPIs(dateStr);

      const kpiRow = [
        dateStr,
        kpis.totalRevenue.toFixed(2),
        kpis.totalOrders,
        kpis.averageOrderValue.toFixed(2),
        kpis.grossProfitMargin.toFixed(2),
        kpis.customerAcquisitionCost.toFixed(2),
        kpis.customerLifetimeValue.toFixed(2),
        kpis.conversionRate.toFixed(2),
        kpis.cartAbandonmentRate.toFixed(2),
        kpis.returnRate.toFixed(2),
        kpis.customerSatisfactionScore.toFixed(2),
        kpis.netPromoterScore.toFixed(2),
        kpis.websiteVisitors,
        kpis.newCustomers,
        kpis.returningCustomers
      ];

      // Update or add KPI data
      const existing = await this.sheetsClient.findAndUpdateRow(
        this.biSpreadsheetId,
        'KPI Dashboard',
        0, // Search in Date column
        dateStr,
        kpiRow
      );

      if (!existing) {
        await this.sheetsClient.appendRows(
          this.biSpreadsheetId,
          'KPI Dashboard',
          [kpiRow]
        );
      }

      logger.info('KPI dashboard updated successfully');
    } catch (error) {
      logger.error('Error updating KPI dashboard', { error });
      throw error;
    }
  }

  async updateProductPerformance(): Promise<void> {
    try {
      logger.info('Updating product performance metrics');

      const products = await this.getProductPerformanceData();

      // Clear existing product performance data
      await this.sheetsClient.clearRange(
        this.biSpreadsheetId,
        'Product Performance!A2:O1000'
      );

      // Add updated product performance
      const productRows = products.map(product => [
        product.id,
        product.name,
        product.sku,
        product.category,
        product.views,
        product.clicks,
        product.addToCart,
        product.purchases,
        product.revenue.toFixed(2),
        product.unitsSold,
        product.conversionRate.toFixed(2),
        product.revenuePerView.toFixed(4),
        product.returnRate.toFixed(2),
        product.customerRating.toFixed(2),
        product.inventoryTurnover.toFixed(2)
      ]);

      if (productRows.length > 0) {
        await this.sheetsClient.appendRows(
          this.biSpreadsheetId,
          'Product Performance',
          productRows
        );
      }

      logger.info('Product performance updated successfully');
    } catch (error) {
      logger.error('Error updating product performance', { error });
      throw error;
    }
  }

  async updateCustomerSegments(): Promise<void> {
    try {
      logger.info('Updating customer segments');

      const segments = await this.getCustomerSegments();

      // Clear existing customer segments data
      await this.sheetsClient.clearRange(
        this.biSpreadsheetId,
        'Customer Segments!A2:J1000'
      );

      // Add updated customer segments
      const segmentRows = segments.map(segment => [
        segment.name,
        segment.customerCount,
        segment.averageOrderValue.toFixed(2),
        segment.purchaseFrequency.toFixed(2),
        segment.customerLifetimeValue.toFixed(2),
        segment.churnRate.toFixed(2),
        segment.revenueContribution.toFixed(2),
        segment.preferredCategories.join(', '),
        segment.averageSessionDuration.toFixed(2),
        segment.customerSatisfactionScore.toFixed(2)
      ]);

      if (segmentRows.length > 0) {
        await this.sheetsClient.appendRows(
          this.biSpreadsheetId,
          'Customer Segments',
          segmentRows
        );
      }

      logger.info('Customer segments updated successfully');
    } catch (error) {
      logger.error('Error updating customer segments', { error });
      throw error;
    }
  }

  async updateChannelPerformance(date: Date = new Date()): Promise<void> {
    try {
      logger.info('Updating channel performance', { date });

      const dateStr = format(date, 'yyyy-MM-dd');
      const channels = await this.getChannelPerformance(dateStr);

      // Clear existing channel performance for the date
      await this.clearChannelPerformanceForDate(dateStr);

      // Add updated channel performance
      const channelRows = channels.map(channel => [
        channel.name,
        dateStr,
        channel.sessions,
        channel.users,
        channel.bounceRate.toFixed(2),
        channel.averageSessionDuration.toFixed(2),
        channel.pagesPerSession.toFixed(2),
        channel.conversionRate.toFixed(2),
        channel.revenue.toFixed(2),
        channel.costPerAcquisition.toFixed(2),
        channel.returnOnAdSpend.toFixed(2),
        channel.customerLifetimeValue.toFixed(2)
      ]);

      if (channelRows.length > 0) {
        await this.sheetsClient.appendRows(
          this.biSpreadsheetId,
          'Channel Performance',
          channelRows
        );
      }

      logger.info('Channel performance updated successfully');
    } catch (error) {
      logger.error('Error updating channel performance', { error });
      throw error;
    }
  }

  async updateFinancialSummary(date: Date = new Date()): Promise<void> {
    try {
      logger.info('Updating financial summary', { date });

      const dateStr = format(date, 'yyyy-MM-dd');
      const financials = await this.calculateFinancialMetrics(dateStr);

      const financialRow = [
        dateStr,
        financials.grossRevenue.toFixed(2),
        financials.refunds.toFixed(2),
        financials.netRevenue.toFixed(2),
        financials.costOfGoodsSold.toFixed(2),
        financials.grossProfit.toFixed(2),
        financials.operatingExpenses.toFixed(2),
        financials.marketingCosts.toFixed(2),
        financials.shippingCosts.toFixed(2),
        financials.paymentProcessingFees.toFixed(2),
        financials.netProfit.toFixed(2),
        financials.profitMargin.toFixed(2),
        financials.cashFlow.toFixed(2)
      ];

      // Update or add financial data
      const existing = await this.sheetsClient.findAndUpdateRow(
        this.biSpreadsheetId,
        'Financial Summary',
        0, // Search in Date column
        dateStr,
        financialRow
      );

      if (!existing) {
        await this.sheetsClient.appendRows(
          this.biSpreadsheetId,
          'Financial Summary',
          [financialRow]
        );
      }

      logger.info('Financial summary updated successfully');
    } catch (error) {
      logger.error('Error updating financial summary', { error });
      throw error;
    }
  }

  async updateGrowthMetrics(date: Date = new Date()): Promise<void> {
    try {
      logger.info('Updating growth metrics', { date });

      const dateStr = format(date, 'yyyy-MM-dd');
      const growth = await this.calculateGrowthMetrics(dateStr);

      const growthRow = [
        dateStr,
        growth.revenueGrowthRate.toFixed(2),
        growth.customerGrowthRate.toFixed(2),
        growth.orderGrowthRate.toFixed(2),
        growth.averageOrderValueGrowthRate.toFixed(2),
        growth.marketShare.toFixed(2),
        growth.customerRetentionRate.toFixed(2),
        growth.monthlyRecurringRevenue.toFixed(2),
        growth.churnRate.toFixed(2),
        growth.expansionRevenue.toFixed(2),
        growth.netRevenueRetention.toFixed(2)
      ];

      // Update or add growth metrics
      const existing = await this.sheetsClient.findAndUpdateRow(
        this.biSpreadsheetId,
        'Growth Metrics',
        0, // Search in Date column
        dateStr,
        growthRow
      );

      if (!existing) {
        await this.sheetsClient.appendRows(
          this.biSpreadsheetId,
          'Growth Metrics',
          [growthRow]
        );
      }

      logger.info('Growth metrics updated successfully');
    } catch (error) {
      logger.error('Error updating growth metrics', { error });
      throw error;
    }
  }

  async generateBusinessReport(startDate: Date, endDate: Date): Promise<any> {
    try {
      logger.info('Generating business intelligence report', { startDate, endDate });

      const report = {
        period: {
          start: format(startDate, 'yyyy-MM-dd'),
          end: format(endDate, 'yyyy-MM-dd')
        },
        summary: await this.getReportSummary(startDate, endDate),
        topProducts: await this.getTopProducts(startDate, endDate),
        customerInsights: await this.getCustomerInsights(startDate, endDate),
        channelAnalysis: await this.getChannelAnalysis(startDate, endDate),
        financialHighlights: await this.getFinancialHighlights(startDate, endDate),
        recommendations: await this.generateRecommendations(startDate, endDate)
      };

      logger.info('Business intelligence report generated successfully');
      return report;
    } catch (error) {
      logger.error('Error generating business report', { error });
      throw error;
    }
  }

  async syncBusinessIntelligence(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      recordsProcessed: 0,
      recordsAdded: 0,
      recordsUpdated: 0,
      errors: [],
      timestamp: new Date()
    };

    try {
      logger.info('Starting business intelligence sync');

      const today = new Date();

      // Update KPI dashboard
      await this.updateKPIDashboard(today);
      result.recordsProcessed++;

      // Update product performance
      await this.updateProductPerformance();
      result.recordsProcessed++;

      // Update customer segments
      await this.updateCustomerSegments();
      result.recordsProcessed++;

      // Update channel performance
      await this.updateChannelPerformance(today);
      result.recordsProcessed++;

      // Update financial summary
      await this.updateFinancialSummary(today);
      result.recordsProcessed++;

      // Update growth metrics
      await this.updateGrowthMetrics(today);
      result.recordsProcessed++;

      result.recordsAdded = result.recordsProcessed;
      result.success = true;

      logger.info('Business intelligence sync completed', result);
      return result;
    } catch (error) {
      const errorMessage = `Error during business intelligence sync: ${error}`;
      result.errors.push(errorMessage);
      logger.error(errorMessage, { error });
      return result;
    }
  }

  private async calculateKPIs(date: string): Promise<any> {
    try {
      // This would integrate with your data sources to calculate KPIs
      // For now, return mock data - implement based on your data structure
      return {
        totalRevenue: 25000,
        totalOrders: 150,
        averageOrderValue: 166.67,
        grossProfitMargin: 45.5,
        customerAcquisitionCost: 25.50,
        customerLifetimeValue: 450,
        conversionRate: 3.2,
        cartAbandonmentRate: 68.5,
        returnRate: 5.2,
        customerSatisfactionScore: 4.3,
        netPromoterScore: 65,
        websiteVisitors: 4680,
        newCustomers: 89,
        returningCustomers: 61
      };
    } catch (error) {
      logger.error('Error calculating KPIs', { error, date });
      throw error;
    }
  }

  private async getProductPerformanceData(): Promise<any[]> {
    try {
      // This would analyze product data from various sources
      // Return mock data for now
      return [
        {
          id: 'PROD-001',
          name: 'Premium Doll Collection',
          sku: 'PDC-001',
          category: 'Luxury',
          views: 1250,
          clicks: 230,
          addToCart: 45,
          purchases: 12,
          revenue: 2400,
          unitsSold: 12,
          conversionRate: 5.22,
          revenuePerView: 1.92,
          returnRate: 2.5,
          customerRating: 4.7,
          inventoryTurnover: 2.3
        }
      ];
    } catch (error) {
      logger.error('Error getting product performance data', { error });
      return [];
    }
  }

  private async getCustomerSegments(): Promise<any[]> {
    try {
      // This would analyze customer data to create segments
      return [
        {
          name: 'High Value Customers',
          customerCount: 125,
          averageOrderValue: 325.50,
          purchaseFrequency: 2.8,
          customerLifetimeValue: 890,
          churnRate: 12.5,
          revenueContribution: 45.2,
          preferredCategories: ['Luxury', 'Premium'],
          averageSessionDuration: 285,
          customerSatisfactionScore: 4.6
        },
        {
          name: 'Regular Customers',
          customerCount: 485,
          averageOrderValue: 125.75,
          purchaseFrequency: 1.9,
          customerLifetimeValue: 240,
          churnRate: 25.8,
          revenueContribution: 38.7,
          preferredCategories: ['Standard', 'Sale'],
          averageSessionDuration: 180,
          customerSatisfactionScore: 4.1
        }
      ];
    } catch (error) {
      logger.error('Error getting customer segments', { error });
      return [];
    }
  }

  private async getChannelPerformance(date: string): Promise<any[]> {
    try {
      // This would analyze traffic and conversion data by channel
      return [
        {
          name: 'Organic Search',
          sessions: 1250,
          users: 980,
          bounceRate: 45.5,
          averageSessionDuration: 195,
          pagesPerSession: 3.2,
          conversionRate: 4.1,
          revenue: 5200,
          costPerAcquisition: 0,
          returnOnAdSpend: 0,
          customerLifetimeValue: 425
        },
        {
          name: 'Paid Search',
          sessions: 850,
          users: 720,
          bounceRate: 52.3,
          averageSessionDuration: 165,
          pagesPerSession: 2.8,
          conversionRate: 6.2,
          revenue: 8400,
          costPerAcquisition: 35.50,
          returnOnAdSpend: 4.2,
          customerLifetimeValue: 380
        }
      ];
    } catch (error) {
      logger.error('Error getting channel performance', { error, date });
      return [];
    }
  }

  private async calculateFinancialMetrics(date: string): Promise<any> {
    try {
      // This would calculate financial metrics from order and expense data
      return {
        grossRevenue: 25000,
        refunds: 1250,
        netRevenue: 23750,
        costOfGoodsSold: 12950,
        grossProfit: 10800,
        operatingExpenses: 5200,
        marketingCosts: 1800,
        shippingCosts: 950,
        paymentProcessingFees: 475,
        netProfit: 2375,
        profitMargin: 10.0,
        cashFlow: 2100
      };
    } catch (error) {
      logger.error('Error calculating financial metrics', { error, date });
      return {
        grossRevenue: 0,
        refunds: 0,
        netRevenue: 0,
        costOfGoodsSold: 0,
        grossProfit: 0,
        operatingExpenses: 0,
        marketingCosts: 0,
        shippingCosts: 0,
        paymentProcessingFees: 0,
        netProfit: 0,
        profitMargin: 0,
        cashFlow: 0
      };
    }
  }

  private async calculateGrowthMetrics(date: string): Promise<any> {
    try {
      // This would calculate growth metrics comparing to previous periods
      return {
        revenueGrowthRate: 12.5,
        customerGrowthRate: 8.3,
        orderGrowthRate: 15.2,
        averageOrderValueGrowthRate: -2.1,
        marketShare: 0.8,
        customerRetentionRate: 85.5,
        monthlyRecurringRevenue: 18500,
        churnRate: 14.5,
        expansionRevenue: 2100,
        netRevenueRetention: 108.5
      };
    } catch (error) {
      logger.error('Error calculating growth metrics', { error, date });
      return {
        revenueGrowthRate: 0,
        customerGrowthRate: 0,
        orderGrowthRate: 0,
        averageOrderValueGrowthRate: 0,
        marketShare: 0,
        customerRetentionRate: 0,
        monthlyRecurringRevenue: 0,
        churnRate: 0,
        expansionRevenue: 0,
        netRevenueRetention: 0
      };
    }
  }

  private async clearChannelPerformanceForDate(date: string): Promise<void> {
    // This would clear existing channel performance data for the specified date
    // Implementation depends on your specific requirements
  }

  private async getReportSummary(startDate: Date, endDate: Date): Promise<any> {
    // Generate executive summary for the report period
    return {
      totalRevenue: 125000,
      totalOrders: 750,
      newCustomers: 445,
      averageOrderValue: 166.67,
      conversionRate: 3.2
    };
  }

  private async getTopProducts(startDate: Date, endDate: Date): Promise<any[]> {
    // Get top performing products for the period
    return [];
  }

  private async getCustomerInsights(startDate: Date, endDate: Date): Promise<any> {
    // Analyze customer behavior and patterns
    return {};
  }

  private async getChannelAnalysis(startDate: Date, endDate: Date): Promise<any> {
    // Analyze channel performance and ROI
    return {};
  }

  private async getFinancialHighlights(startDate: Date, endDate: Date): Promise<any> {
    // Extract key financial metrics and trends
    return {};
  }

  private async generateRecommendations(startDate: Date, endDate: Date): Promise<string[]> {
    // Generate business recommendations based on data analysis
    return [
      'Focus marketing efforts on high-converting channels',
      'Optimize product pages with low conversion rates',
      'Implement retention strategies for high-value customer segments'
    ];
  }
}