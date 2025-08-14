import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';
import { NotificationType, NotificationConfig } from '../types';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.pass
      }
    });
  }

  async sendNotification(
    type: NotificationType,
    recipients: string[],
    subject: string,
    content: string,
    data?: any
  ): Promise<void> {
    try {
      logger.info('Sending email notification', { type, recipients: recipients.length });

      const htmlContent = this.generateEmailHTML(type, content, data);

      const mailOptions = {
        from: config.email.from,
        to: recipients.join(', '),
        subject: `[Heaven Dolls] ${subject}`,
        text: content,
        html: htmlContent
      };

      await this.transporter.sendMail(mailOptions);
      
      logger.info('Email notification sent successfully', { type, recipients: recipients.length });
    } catch (error) {
      logger.error('Error sending email notification', { error, type, recipients });
      throw error;
    }
  }

  async sendOrderDelayAlert(orderData: {
    orderId: string;
    customerName: string;
    customerEmail: string;
    expectedDelivery: Date;
    currentStatus: string;
    daysDelayed: number;
  }): Promise<void> {
    const subject = `Order Delivery Delay Alert - ${orderData.orderId}`;
    const content = `
      Order ${orderData.orderId} for customer ${orderData.customerName} is delayed by ${orderData.daysDelayed} days.
      
      Customer: ${orderData.customerName}
      Email: ${orderData.customerEmail}
      Expected Delivery: ${orderData.expectedDelivery.toDateString()}
      Current Status: ${orderData.currentStatus}
      
      Please take immediate action to resolve this delivery delay.
    `;

    await this.sendNotification(
      'order_delayed',
      ['operations@heaven-dolls.com', 'support@heaven-dolls.com'],
      subject,
      content,
      orderData
    );
  }

  async sendInventoryLowAlert(inventoryData: {
    productId: string;
    productName: string;
    sku: string;
    currentStock: number;
    threshold: number;
    estimatedStockoutDate?: Date;
  }): Promise<void> {
    const subject = `Low Inventory Alert - ${inventoryData.productName}`;
    const content = `
      Product ${inventoryData.productName} (${inventoryData.sku}) is running low on inventory.
      
      Product: ${inventoryData.productName}
      SKU: ${inventoryData.sku}
      Current Stock: ${inventoryData.currentStock}
      Low Stock Threshold: ${inventoryData.threshold}
      ${inventoryData.estimatedStockoutDate ? `Estimated Stockout: ${inventoryData.estimatedStockoutDate.toDateString()}` : ''}
      
      Please arrange for restocking as soon as possible.
    `;

    await this.sendNotification(
      'inventory_low',
      ['inventory@heaven-dolls.com', 'operations@heaven-dolls.com'],
      subject,
      content,
      inventoryData
    );
  }

  async sendSupportUrgentAlert(ticketData: {
    ticketId: string;
    customerId: string;
    customerName: string;
    customerEmail: string;
    subject: string;
    priority: string;
    createdAt: Date;
  }): Promise<void> {
    const subject = `Urgent Support Ticket - ${ticketData.ticketId}`;
    const content = `
      An urgent support ticket has been created and requires immediate attention.
      
      Ticket ID: ${ticketData.ticketId}
      Customer: ${ticketData.customerName} (${ticketData.customerEmail})
      Subject: ${ticketData.subject}
      Priority: ${ticketData.priority}
      Created: ${ticketData.createdAt.toLocaleString()}
      
      Please assign and respond to this ticket immediately.
    `;

    await this.sendNotification(
      'support_urgent',
      ['support@heaven-dolls.com', 'manager@heaven-dolls.com'],
      subject,
      content,
      ticketData
    );
  }

  async sendSystemErrorAlert(errorData: {
    service: string;
    error: string;
    timestamp: Date;
    severity: 'low' | 'medium' | 'high' | 'critical';
    details?: string;
  }): Promise<void> {
    const subject = `System Error Alert - ${errorData.service} (${errorData.severity.toUpperCase()})`;
    const content = `
      A system error has been detected in the tracking system.
      
      Service: ${errorData.service}
      Severity: ${errorData.severity.toUpperCase()}
      Error: ${errorData.error}
      Timestamp: ${errorData.timestamp.toLocaleString()}
      ${errorData.details ? `Details: ${errorData.details}` : ''}
      
      Please investigate and resolve this issue immediately.
    `;

    const recipients = errorData.severity === 'critical' || errorData.severity === 'high'
      ? ['tech@heaven-dolls.com', 'manager@heaven-dolls.com']
      : ['tech@heaven-dolls.com'];

    await this.sendNotification(
      'system_error',
      recipients,
      subject,
      content,
      errorData
    );
  }

  async sendDailyReport(reportData: {
    date: string;
    totalOrders: number;
    totalRevenue: number;
    newCustomers: number;
    supportTickets: number;
    lowStockAlerts: number;
    systemErrors: number;
    topProducts: any[];
    keyMetrics: any;
  }): Promise<void> {
    const subject = `Daily Report - ${reportData.date}`;
    const content = `
      Daily Summary for ${reportData.date}
      
      ORDERS & REVENUE
      - Total Orders: ${reportData.totalOrders}
      - Total Revenue: $${reportData.totalRevenue.toFixed(2)}
      - Average Order Value: $${(reportData.totalRevenue / reportData.totalOrders || 0).toFixed(2)}
      
      CUSTOMERS
      - New Customers: ${reportData.newCustomers}
      - Customer Satisfaction: ${reportData.keyMetrics?.customerSatisfactionScore?.toFixed(1) || 'N/A'}/5
      
      SUPPORT
      - New Tickets: ${reportData.supportTickets}
      - Average Response Time: ${reportData.keyMetrics?.averageResponseTime?.toFixed(1) || 'N/A'} minutes
      
      INVENTORY & OPERATIONS
      - Low Stock Alerts: ${reportData.lowStockAlerts}
      - System Errors: ${reportData.systemErrors}
      
      TOP PRODUCTS
      ${reportData.topProducts.map((product, index) => 
        `${index + 1}. ${product.name} - ${product.orders} orders, $${product.revenue?.toFixed(2) || '0.00'} revenue`
      ).join('\n      ')}
      
      View detailed analytics in the Google Sheets dashboard.
    `;

    await this.sendNotification(
      'daily_report',
      ['management@heaven-dolls.com', 'operations@heaven-dolls.com'],
      subject,
      content,
      reportData
    );
  }

  async sendWeeklyReport(reportData: {
    weekStart: string;
    weekEnd: string;
    summary: any;
    trends: any;
    recommendations: string[];
  }): Promise<void> {
    const subject = `Weekly Business Report - ${reportData.weekStart} to ${reportData.weekEnd}`;
    const content = `
      Weekly Business Report (${reportData.weekStart} to ${reportData.weekEnd})
      
      PERFORMANCE SUMMARY
      - Total Revenue: $${reportData.summary.totalRevenue?.toFixed(2) || '0.00'}
      - Total Orders: ${reportData.summary.totalOrders || 0}
      - New Customers: ${reportData.summary.newCustomers || 0}
      - Conversion Rate: ${reportData.summary.conversionRate?.toFixed(2) || '0.00'}%
      
      TRENDS & INSIGHTS
      - Revenue Growth: ${reportData.trends.revenueGrowth?.toFixed(1) || '0.0'}%
      - Customer Growth: ${reportData.trends.customerGrowth?.toFixed(1) || '0.0'}%
      - Average Order Value: ${reportData.trends.aovTrend > 0 ? '+' : ''}${reportData.trends.aovTrend?.toFixed(1) || '0.0'}%
      
      KEY RECOMMENDATIONS
      ${reportData.recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n      ')}
      
      View the complete analysis in the Business Intelligence dashboard.
    `;

    await this.sendNotification(
      'weekly_report',
      ['management@heaven-dolls.com', 'marketing@heaven-dolls.com'],
      subject,
      content,
      reportData
    );
  }

  private generateEmailHTML(type: NotificationType, content: string, data?: any): string {
    const baseStyles = `
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #ddd; }
        .footer { background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
        .alert { padding: 15px; margin: 10px 0; border-radius: 4px; }
        .alert-urgent { background: #fee; border-left: 4px solid #dc3545; }
        .alert-warning { background: #fff3cd; border-left: 4px solid #ffc107; }
        .alert-info { background: #e7f3ff; border-left: 4px solid #0066cc; }
        .metrics { display: flex; flex-wrap: wrap; gap: 15px; margin: 20px 0; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 6px; flex: 1; min-width: 120px; text-align: center; }
        .metric-value { font-size: 24px; font-weight: bold; color: #667eea; }
        .metric-label { font-size: 12px; color: #666; text-transform: uppercase; }
      </style>
    `;

    const getAlertClass = () => {
      switch (type) {
        case 'support_urgent':
        case 'system_error':
        case 'order_delayed':
          return 'alert-urgent';
        case 'inventory_low':
          return 'alert-warning';
        default:
          return 'alert-info';
      }
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Heaven Dolls Notification</title>
          ${baseStyles}
        </head>
        <body>
          <div class="header">
            <h1>Heaven Dolls</h1>
            <p>Marketplace Tracking System</p>
          </div>
          
          <div class="content">
            <div class="alert ${getAlertClass()}">
              ${content.replace(/\n/g, '<br>')}
            </div>
            
            ${this.generateDataSection(type, data)}
          </div>
          
          <div class="footer">
            <p>This is an automated notification from the Heaven Dolls tracking system.</p>
            <p>© ${new Date().getFullYear()} Heaven Dolls. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;
  }

  private generateDataSection(type: NotificationType, data?: any): string {
    if (!data) return '';

    switch (type) {
      case 'daily_report':
        return `
          <div class="metrics">
            <div class="metric">
              <div class="metric-value">${data.totalOrders}</div>
              <div class="metric-label">Orders</div>
            </div>
            <div class="metric">
              <div class="metric-value">$${data.totalRevenue?.toFixed(0) || '0'}</div>
              <div class="metric-label">Revenue</div>
            </div>
            <div class="metric">
              <div class="metric-value">${data.newCustomers}</div>
              <div class="metric-label">New Customers</div>
            </div>
            <div class="metric">
              <div class="metric-value">${data.supportTickets}</div>
              <div class="metric-label">Support Tickets</div>
            </div>
          </div>
        `;
      
      case 'weekly_report':
        return `
          <div class="metrics">
            <div class="metric">
              <div class="metric-value">$${data.summary?.totalRevenue?.toFixed(0) || '0'}</div>
              <div class="metric-label">Weekly Revenue</div>
            </div>
            <div class="metric">
              <div class="metric-value">${data.summary?.totalOrders || '0'}</div>
              <div class="metric-label">Total Orders</div>
            </div>
            <div class="metric">
              <div class="metric-value">${data.summary?.conversionRate?.toFixed(1) || '0.0'}%</div>
              <div class="metric-label">Conversion Rate</div>
            </div>
          </div>
        `;
      
      default:
        return '';
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service connection failed', { error });
      return false;
    }
  }
}