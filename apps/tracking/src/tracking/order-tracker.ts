import { SheetsClient } from '../sheets/client';
import { config } from '../config';
import { logger } from '../utils/logger';
import { Order, OrderStatus, SyncResult } from '../types';
import { format } from 'date-fns';

export class OrderTracker {
  private sheetsClient: SheetsClient;
  private ordersSpreadsheetId: string;

  constructor() {
    this.sheetsClient = new SheetsClient();
    this.ordersSpreadsheetId = config.spreadsheets.orders;
  }

  async trackOrder(order: Order): Promise<void> {
    try {
      logger.info('Tracking new order', { orderId: order.id });

      // Check if order already exists
      const existing = await this.findOrder(order.id);
      
      if (existing) {
        await this.updateOrder(order);
      } else {
        await this.addOrder(order);
      }

      // Track order items separately
      await this.trackOrderItems(order);

      // Add to status history
      await this.trackStatusChange(order.id, null, order.status, 'System', new Date(), 'Order created');

      logger.info('Order tracked successfully', { orderId: order.id });
    } catch (error) {
      logger.error('Error tracking order', { error, orderId: order.id });
      throw error;
    }
  }

  async updateOrderStatus(
    orderId: string, 
    newStatus: OrderStatus, 
    metadata?: {
      trackingNumber?: string;
      carrier?: string;
      estimatedDelivery?: Date;
      actualDelivery?: Date;
      notes?: string;
    }
  ): Promise<void> {
    try {
      logger.info('Updating order status', { orderId, newStatus });

      // Get current order
      const currentOrder = await this.getOrderById(orderId);
      if (!currentOrder) {
        throw new Error(`Order not found: ${orderId}`);
      }

      const previousStatus = currentOrder.status;
      
      // Update order status
      const updatedOrder: Order = {
        ...currentOrder,
        status: newStatus,
        updatedAt: new Date(),
        ...(metadata?.trackingNumber && { trackingNumber: metadata.trackingNumber }),
        ...(metadata?.carrier && { carrier: metadata.carrier }),
        ...(metadata?.estimatedDelivery && { estimatedDelivery: metadata.estimatedDelivery }),
        ...(metadata?.actualDelivery && { actualDelivery: metadata.actualDelivery }),
        ...(metadata?.notes && { notes: metadata.notes })
      };

      await this.updateOrder(updatedOrder);

      // Track status change
      const statusChangeDuration = this.calculateStatusDuration(currentOrder.updatedAt, new Date());
      await this.trackStatusChange(
        orderId, 
        previousStatus, 
        newStatus, 
        'System', 
        new Date(),
        metadata?.notes || `Status changed from ${previousStatus} to ${newStatus}`,
        statusChangeDuration
      );

      // Add shipping update if relevant
      if (metadata?.trackingNumber && (newStatus === 'shipped' || newStatus === 'out_for_delivery')) {
        await this.trackShippingUpdate(orderId, {
          trackingNumber: metadata.trackingNumber,
          carrier: metadata.carrier || 'Unknown',
          status: newStatus === 'shipped' ? 'Shipped' : 'Out for Delivery',
          updateTime: new Date(),
          estimatedDelivery: metadata.estimatedDelivery,
          notes: metadata.notes
        });
      }

      logger.info('Order status updated successfully', { orderId, previousStatus, newStatus });
    } catch (error) {
      logger.error('Error updating order status', { error, orderId, newStatus });
      throw error;
    }
  }

  async syncOrdersFromStrapi(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      recordsProcessed: 0,
      recordsAdded: 0,
      recordsUpdated: 0,
      errors: [],
      timestamp: new Date()
    };

    try {
      logger.info('Starting order sync from Strapi');

      // Fetch orders from Strapi API
      const orders = await this.fetchOrdersFromStrapi();
      result.recordsProcessed = orders.length;

      for (const order of orders) {
        try {
          const existing = await this.findOrder(order.id);
          
          if (existing) {
            await this.updateOrder(order);
            result.recordsUpdated++;
          } else {
            await this.addOrder(order);
            await this.trackOrderItems(order);
            result.recordsAdded++;
          }
        } catch (error) {
          const errorMessage = `Error syncing order ${order.id}: ${error}`;
          result.errors.push(errorMessage);
          logger.error(errorMessage, { error, orderId: order.id });
        }
      }

      // Update daily summary
      await this.updateDailySummary();

      result.success = result.errors.length === 0;
      logger.info('Order sync completed', result);

      return result;
    } catch (error) {
      const errorMessage = `Error during order sync: ${error}`;
      result.errors.push(errorMessage);
      logger.error(errorMessage, { error });
      return result;
    }
  }

  private async addOrder(order: Order): Promise<void> {
    const orderRow = this.orderToSheetRow(order);
    await this.sheetsClient.appendRows(
      this.ordersSpreadsheetId,
      'Orders',
      [orderRow]
    );
  }

  private async updateOrder(order: Order): Promise<void> {
    const orderRow = this.orderToSheetRow(order);
    const updated = await this.sheetsClient.findAndUpdateRow(
      this.ordersSpreadsheetId,
      'Orders',
      0, // Search in Order ID column
      order.id,
      orderRow
    );

    if (!updated) {
      // If not found, add as new order
      await this.addOrder(order);
    }
  }

  private async trackOrderItems(order: Order): Promise<void> {
    const itemRows = order.items.map(item => [
      order.id,
      item.productId,
      item.variantId || '',
      item.name,
      item.sku,
      item.quantity,
      item.price,
      item.totalPrice,
      item.imageUrl || '',
      format(order.createdAt, 'yyyy-MM-dd HH:mm:ss')
    ]);

    await this.sheetsClient.appendRows(
      this.ordersSpreadsheetId,
      'Order Items',
      itemRows
    );
  }

  private async trackStatusChange(
    orderId: string,
    previousStatus: OrderStatus | null,
    newStatus: OrderStatus,
    changedBy: string,
    changedAt: Date,
    notes?: string,
    durationHours?: number
  ): Promise<void> {
    const statusRow = [
      orderId,
      previousStatus || '',
      newStatus,
      changedBy,
      format(changedAt, 'yyyy-MM-dd HH:mm:ss'),
      notes || '',
      durationHours || ''
    ];

    await this.sheetsClient.appendRows(
      this.ordersSpreadsheetId,
      'Status History',
      [statusRow]
    );
  }

  private async trackShippingUpdate(
    orderId: string,
    update: {
      trackingNumber: string;
      carrier: string;
      status: string;
      location?: string;
      updateTime: Date;
      estimatedDelivery?: Date;
      notes?: string;
    }
  ): Promise<void> {
    const shippingRow = [
      orderId,
      update.trackingNumber,
      update.carrier,
      update.status,
      update.location || '',
      format(update.updateTime, 'yyyy-MM-dd HH:mm:ss'),
      update.estimatedDelivery ? format(update.estimatedDelivery, 'yyyy-MM-dd') : '',
      update.notes || ''
    ];

    await this.sheetsClient.appendRows(
      this.ordersSpreadsheetId,
      'Shipping Updates',
      [shippingRow]
    );
  }

  private async updateDailySummary(): Promise<void> {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Get all orders for today
      const orders = await this.getOrdersForDate(today);
      
      // Calculate metrics
      const totalOrders = orders.length;
      const pendingOrders = orders.filter(o => o.status === 'pending').length;
      const processingOrders = orders.filter(o => o.status === 'processing').length;
      const shippedOrders = orders.filter(o => o.status === 'shipped').length;
      const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
      const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
      
      const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      
      // Calculate average processing time
      const processedOrders = orders.filter(o => 
        o.status === 'shipped' || o.status === 'delivered'
      );
      const averageProcessingTime = this.calculateAverageProcessingTime(processedOrders);
      
      // Calculate on-time delivery rate
      const onTimeDeliveryRate = this.calculateOnTimeDeliveryRate(orders);

      const summaryRow = [
        today,
        totalOrders,
        pendingOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        totalRevenue.toFixed(2),
        averageOrderValue.toFixed(2),
        averageProcessingTime.toFixed(2),
        onTimeDeliveryRate.toFixed(2)
      ];

      // Update or add daily summary
      const existing = await this.sheetsClient.findAndUpdateRow(
        this.ordersSpreadsheetId,
        'Daily Summary',
        0, // Search in Date column
        today,
        summaryRow
      );

      if (!existing) {
        await this.sheetsClient.appendRows(
          this.ordersSpreadsheetId,
          'Daily Summary',
          [summaryRow]
        );
      }
    } catch (error) {
      logger.error('Error updating daily summary', { error });
      throw error;
    }
  }

  private async findOrder(orderId: string): Promise<boolean> {
    try {
      const values = await this.sheetsClient.getValues(
        this.ordersSpreadsheetId,
        'Orders!A:A'
      );
      
      return values.some(row => row[0] === orderId);
    } catch (error) {
      logger.error('Error finding order', { error, orderId });
      return false;
    }
  }

  private async getOrderById(orderId: string): Promise<Order | null> {
    try {
      const values = await this.sheetsClient.getValues(
        this.ordersSpreadsheetId,
        'Orders!A:V' // Adjust range as needed
      );
      
      const orderRow = values.find(row => row[0] === orderId);
      if (!orderRow) return null;
      
      return this.sheetRowToOrder(orderRow);
    } catch (error) {
      logger.error('Error getting order by ID', { error, orderId });
      return null;
    }
  }

  private async getOrdersForDate(date: string): Promise<Order[]> {
    try {
      const values = await this.sheetsClient.getValues(
        this.ordersSpreadsheetId,
        'Orders!A:V'
      );
      
      return values
        .filter(row => {
          const createdAt = new Date(row[17]); // Created At column
          return format(createdAt, 'yyyy-MM-dd') === date;
        })
        .map(row => this.sheetRowToOrder(row));
    } catch (error) {
      logger.error('Error getting orders for date', { error, date });
      return [];
    }
  }

  private async fetchOrdersFromStrapi(): Promise<Order[]> {
    // This would integrate with your Strapi API
    // For now, return empty array - implement based on your Strapi structure
    logger.info('Fetching orders from Strapi API');
    return [];
  }

  private orderToSheetRow(order: Order): any[] {
    const shippingAddress = `${order.shippingAddress.address1}, ${order.shippingAddress.city}, ${order.shippingAddress.province}, ${order.shippingAddress.country}`;
    const billingAddress = `${order.billingAddress.address1}, ${order.billingAddress.city}, ${order.billingAddress.province}, ${order.billingAddress.country}`;
    const orderItems = order.items.map(item => `${item.name} (${item.quantity})`).join('; ');
    
    const processingTimeHours = order.status !== 'pending' 
      ? Math.round((order.updatedAt.getTime() - order.createdAt.getTime()) / (1000 * 60 * 60) * 100) / 100
      : 0;
    
    const shippingTimeDays = order.actualDelivery && order.status === 'shipped'
      ? Math.round((order.actualDelivery.getTime() - order.updatedAt.getTime()) / (1000 * 60 * 60 * 24) * 100) / 100
      : 0;

    return [
      order.id,
      order.customerId,
      order.customerName,
      order.customerEmail,
      order.status,
      order.totalAmount,
      order.currency,
      order.paymentMethod,
      order.shippingMethod,
      order.trackingNumber || '',
      order.carrier || '',
      order.estimatedDelivery ? format(order.estimatedDelivery, 'yyyy-MM-dd') : '',
      order.actualDelivery ? format(order.actualDelivery, 'yyyy-MM-dd') : '',
      order.items.length,
      orderItems,
      shippingAddress,
      billingAddress,
      format(order.createdAt, 'yyyy-MM-dd HH:mm:ss'),
      format(order.updatedAt, 'yyyy-MM-dd HH:mm:ss'),
      processingTimeHours,
      shippingTimeDays,
      order.notes || ''
    ];
  }

  private sheetRowToOrder(row: any[]): Order {
    // Convert sheet row back to Order object
    // This is a simplified implementation - adjust based on your needs
    return {
      id: row[0],
      customerId: row[1],
      customerName: row[2],
      customerEmail: row[3],
      status: row[4] as OrderStatus,
      totalAmount: parseFloat(row[5]) || 0,
      currency: row[6],
      paymentMethod: row[7],
      shippingMethod: row[8],
      trackingNumber: row[9] || undefined,
      carrier: row[10] || undefined,
      estimatedDelivery: row[11] ? new Date(row[11]) : undefined,
      actualDelivery: row[12] ? new Date(row[12]) : undefined,
      items: [], // Would need to fetch from Order Items sheet
      shippingAddress: {} as any, // Would need to parse address string
      billingAddress: {} as any, // Would need to parse address string
      createdAt: new Date(row[17]),
      updatedAt: new Date(row[18]),
      notes: row[21] || undefined
    };
  }

  private calculateStatusDuration(startTime: Date, endTime: Date): number {
    return Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60) * 100) / 100;
  }

  private calculateAverageProcessingTime(orders: Order[]): number {
    if (orders.length === 0) return 0;
    
    const totalProcessingTime = orders.reduce((sum, order) => {
      return sum + (order.updatedAt.getTime() - order.createdAt.getTime()) / (1000 * 60 * 60);
    }, 0);
    
    return totalProcessingTime / orders.length;
  }

  private calculateOnTimeDeliveryRate(orders: Order[]): number {
    const deliveredOrders = orders.filter(o => 
      o.status === 'delivered' && o.estimatedDelivery && o.actualDelivery
    );
    
    if (deliveredOrders.length === 0) return 100;
    
    const onTimeDeliveries = deliveredOrders.filter(o => 
      o.actualDelivery! <= o.estimatedDelivery!
    ).length;
    
    return (onTimeDeliveries / deliveredOrders.length) * 100;
  }
}