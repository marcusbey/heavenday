import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'crypto';
import { config } from '../config';
import { logger } from '../utils/logger';
import { OrderTracker } from '../tracking/order-tracker';
import { UserJourneyTracker } from '../tracking/user-journey-tracker';
import { SupportTracker } from '../tracking/support-tracker';
import { InventoryTracker } from '../tracking/inventory-tracker';
import { EmailService } from '../notifications/email-service';

export class WebhookServer {
  private app: express.Application;
  private orderTracker: OrderTracker;
  private userJourneyTracker: UserJourneyTracker;
  private supportTracker: SupportTracker;
  private inventoryTracker: InventoryTracker;
  private emailService: EmailService;

  constructor() {
    this.app = express();
    this.orderTracker = new OrderTracker();
    this.userJourneyTracker = new UserJourneyTracker();
    this.supportTracker = new SupportTracker();
    this.inventoryTracker = new InventoryTracker();
    this.emailService = new EmailService();
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors());
    
    // Body parsing middleware
    this.app.use('/webhooks', express.raw({ type: 'application/json' }));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info('Webhook request received', {
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'heaven-dolls-tracking'
      });
    });

    // Order webhooks
    this.app.post('/webhooks/order', this.verifyWebhookSignature.bind(this), this.handleOrderWebhook.bind(this));
    
    // Payment webhooks
    this.app.post('/webhooks/payment', this.verifyWebhookSignature.bind(this), this.handlePaymentWebhook.bind(this));
    
    // Shipping webhooks
    this.app.post('/webhooks/shipping', this.verifyWebhookSignature.bind(this), this.handleShippingWebhook.bind(this));
    
    // User activity webhooks
    this.app.post('/webhooks/user', this.handleUserActivityWebhook.bind(this));
    
    // Support webhooks
    this.app.post('/webhooks/support', this.verifyWebhookSignature.bind(this), this.handleSupportWebhook.bind(this));
    
    // Inventory webhooks
    this.app.post('/webhooks/inventory', this.verifyWebhookSignature.bind(this), this.handleInventoryWebhook.bind(this));

    // Strapi webhooks
    this.app.post('/webhooks/strapi/order', this.handleStrapiOrderWebhook.bind(this));
    this.app.post('/webhooks/strapi/product', this.handleStrapiProductWebhook.bind(this));

    // Error handling
    this.app.use(this.errorHandler.bind(this));
  }

  private verifyWebhookSignature(req: express.Request, res: express.Response, next: express.NextFunction): void {
    try {
      const signature = req.get('X-Webhook-Signature') || req.get('X-Hub-Signature-256');
      
      if (!signature) {
        logger.warn('Webhook signature missing', { path: req.path });
        res.status(401).json({ error: 'Signature required' });
        return;
      }

      const payload = req.body;
      const expectedSignature = crypto
        .createHmac('sha256', config.webhook.secret)
        .update(payload)
        .digest('hex');

      const providedSignature = signature.startsWith('sha256=') 
        ? signature.slice(7) 
        : signature;

      if (!crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(providedSignature, 'hex')
      )) {
        logger.warn('Invalid webhook signature', { path: req.path });
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      next();
    } catch (error) {
      logger.error('Error verifying webhook signature', { error, path: req.path });
      res.status(500).json({ error: 'Signature verification failed' });
    }
  }

  private async handleOrderWebhook(req: express.Request, res: express.Response): Promise<void> {
    try {
      const orderData = JSON.parse(req.body.toString());
      logger.info('Processing order webhook', { orderId: orderData.id, action: orderData.action });

      switch (orderData.action) {
        case 'created':
          await this.orderTracker.trackOrder(orderData.order);
          break;
        
        case 'updated':
          if (orderData.status_changed) {
            await this.orderTracker.updateOrderStatus(
              orderData.order.id,
              orderData.order.status,
              {
                trackingNumber: orderData.order.trackingNumber,
                carrier: orderData.order.carrier,
                estimatedDelivery: orderData.order.estimatedDelivery,
                notes: orderData.notes
              }
            );
          }
          break;
        
        case 'shipped':
          await this.orderTracker.updateOrderStatus(
            orderData.order.id,
            'shipped',
            {
              trackingNumber: orderData.trackingNumber,
              carrier: orderData.carrier,
              estimatedDelivery: orderData.estimatedDelivery
            }
          );
          break;
        
        case 'delivered':
          await this.orderTracker.updateOrderStatus(
            orderData.order.id,
            'delivered',
            {
              actualDelivery: new Date(orderData.deliveredAt)
            }
          );
          break;
        
        default:
          logger.warn('Unknown order action', { action: orderData.action });
      }

      res.json({ success: true, message: 'Order webhook processed' });
    } catch (error) {
      logger.error('Error processing order webhook', { error });
      res.status(500).json({ error: 'Failed to process order webhook' });
    }
  }

  private async handlePaymentWebhook(req: express.Request, res: express.Response): Promise<void> {
    try {
      const paymentData = JSON.parse(req.body.toString());
      logger.info('Processing payment webhook', { 
        paymentId: paymentData.id, 
        action: paymentData.action 
      });

      switch (paymentData.action) {
        case 'payment_completed':
          await this.orderTracker.updateOrderStatus(
            paymentData.orderId,
            'confirmed'
          );
          break;
        
        case 'payment_failed':
          await this.orderTracker.updateOrderStatus(
            paymentData.orderId,
            'cancelled',
            { notes: 'Payment failed' }
          );
          break;
        
        case 'refund_processed':
          await this.orderTracker.updateOrderStatus(
            paymentData.orderId,
            'refunded',
            { notes: `Refund: $${paymentData.amount}` }
          );
          break;
        
        default:
          logger.warn('Unknown payment action', { action: paymentData.action });
      }

      res.json({ success: true, message: 'Payment webhook processed' });
    } catch (error) {
      logger.error('Error processing payment webhook', { error });
      res.status(500).json({ error: 'Failed to process payment webhook' });
    }
  }

  private async handleShippingWebhook(req: express.Request, res: express.Response): Promise<void> {
    try {
      const shippingData = JSON.parse(req.body.toString());
      logger.info('Processing shipping webhook', { 
        trackingNumber: shippingData.trackingNumber,
        status: shippingData.status 
      });

      const statusMap: { [key: string]: any } = {
        'in_transit': 'shipped',
        'out_for_delivery': 'out_for_delivery',
        'delivered': 'delivered',
        'exception': 'shipped' // Keep as shipped but add note
      };

      const newStatus = statusMap[shippingData.status] || 'shipped';
      
      // Find order by tracking number and update
      // This would require a method to find order by tracking number
      // For now, we'll assume the order ID is provided
      if (shippingData.orderId) {
        await this.orderTracker.updateOrderStatus(
          shippingData.orderId,
          newStatus,
          {
            trackingNumber: shippingData.trackingNumber,
            carrier: shippingData.carrier,
            estimatedDelivery: shippingData.estimatedDelivery,
            notes: shippingData.statusDescription
          }
        );

        // Check for delivery delays
        if (shippingData.status === 'exception' || shippingData.delayDays > 0) {
          await this.emailService.sendOrderDelayAlert({
            orderId: shippingData.orderId,
            customerName: shippingData.customerName,
            customerEmail: shippingData.customerEmail,
            expectedDelivery: new Date(shippingData.originalEstimatedDelivery),
            currentStatus: shippingData.statusDescription,
            daysDelayed: shippingData.delayDays || 1
          });
        }
      }

      res.json({ success: true, message: 'Shipping webhook processed' });
    } catch (error) {
      logger.error('Error processing shipping webhook', { error });
      res.status(500).json({ error: 'Failed to process shipping webhook' });
    }
  }

  private async handleUserActivityWebhook(req: express.Request, res: express.Response): Promise<void> {
    try {
      const activityData = req.body;
      logger.info('Processing user activity webhook', { 
        userId: activityData.userId,
        type: activityData.type 
      });

      switch (activityData.type) {
        case 'page_view':
          await this.userJourneyTracker.trackPageView({
            userId: activityData.userId,
            sessionId: activityData.sessionId,
            page: activityData.page,
            referrer: activityData.referrer,
            userAgent: activityData.userAgent,
            timestamp: new Date(activityData.timestamp),
            metadata: activityData.metadata
          });
          break;
        
        case 'product_view':
          await this.userJourneyTracker.trackProductView({
            userId: activityData.userId,
            sessionId: activityData.sessionId,
            productId: activityData.productId,
            timestamp: new Date(activityData.timestamp),
            metadata: activityData.metadata
          });
          break;
        
        case 'add_to_cart':
          await this.userJourneyTracker.trackCartAction({
            userId: activityData.userId,
            sessionId: activityData.sessionId,
            productId: activityData.productId,
            action: 'add',
            timestamp: new Date(activityData.timestamp),
            metadata: activityData.metadata
          });
          break;
        
        case 'purchase':
          await this.userJourneyTracker.trackPurchase({
            userId: activityData.userId,
            sessionId: activityData.sessionId,
            orderId: activityData.orderId,
            value: activityData.value,
            currency: activityData.currency,
            timestamp: new Date(activityData.timestamp),
            metadata: activityData.metadata
          });
          break;
        
        case 'search':
          await this.userJourneyTracker.trackSearch({
            userId: activityData.userId,
            sessionId: activityData.sessionId,
            searchQuery: activityData.searchQuery,
            timestamp: new Date(activityData.timestamp),
            metadata: activityData.metadata
          });
          break;
        
        default:
          logger.warn('Unknown user activity type', { type: activityData.type });
      }

      res.json({ success: true, message: 'User activity webhook processed' });
    } catch (error) {
      logger.error('Error processing user activity webhook', { error });
      res.status(500).json({ error: 'Failed to process user activity webhook' });
    }
  }

  private async handleSupportWebhook(req: express.Request, res: express.Response): Promise<void> {
    try {
      const supportData = JSON.parse(req.body.toString());
      logger.info('Processing support webhook', { 
        action: supportData.action,
        ticketId: supportData.ticketId 
      });

      switch (supportData.action) {
        case 'ticket_created':
          const ticketId = await this.supportTracker.createTicket({
            customerId: supportData.ticket.customerId,
            customerEmail: supportData.ticket.customerEmail,
            customerName: supportData.ticket.customerName,
            subject: supportData.ticket.subject,
            description: supportData.ticket.description,
            category: supportData.ticket.category,
            priority: supportData.ticket.priority,
            orderId: supportData.ticket.orderId,
            tags: supportData.ticket.tags
          });

          // Send urgent alert if high priority
          if (supportData.ticket.priority === 'urgent') {
            await this.emailService.sendSupportUrgentAlert({
              ticketId,
              customerId: supportData.ticket.customerId,
              customerName: supportData.ticket.customerName,
              customerEmail: supportData.ticket.customerEmail,
              subject: supportData.ticket.subject,
              priority: supportData.ticket.priority,
              createdAt: new Date()
            });
          }
          break;
        
        case 'ticket_updated':
          await this.supportTracker.updateTicketStatus(
            supportData.ticketId,
            supportData.status,
            supportData.updatedBy,
            supportData.message,
            supportData.assignedTo
          );
          break;
        
        case 'satisfaction_score':
          await this.supportTracker.addCustomerSatisfactionScore(
            supportData.ticketId,
            supportData.score,
            supportData.feedback
          );
          break;
        
        default:
          logger.warn('Unknown support action', { action: supportData.action });
      }

      res.json({ success: true, message: 'Support webhook processed' });
    } catch (error) {
      logger.error('Error processing support webhook', { error });
      res.status(500).json({ error: 'Failed to process support webhook' });
    }
  }

  private async handleInventoryWebhook(req: express.Request, res: express.Response): Promise<void> {
    try {
      const inventoryData = JSON.parse(req.body.toString());
      logger.info('Processing inventory webhook', { 
        action: inventoryData.action,
        productId: inventoryData.productId 
      });

      switch (inventoryData.action) {
        case 'stock_movement':
          await this.inventoryTracker.trackStockMovement({
            productId: inventoryData.productId,
            sku: inventoryData.sku,
            movementType: inventoryData.movementType,
            quantity: inventoryData.quantity,
            reason: inventoryData.reason,
            orderId: inventoryData.orderId,
            movedBy: inventoryData.movedBy || 'System',
            costImpact: inventoryData.costImpact,
            notes: inventoryData.notes
          });
          break;
        
        case 'product_updated':
          await this.inventoryTracker.updateProductInventory(inventoryData.product);
          break;
        
        case 'low_stock_alert':
          await this.emailService.sendInventoryLowAlert({
            productId: inventoryData.productId,
            productName: inventoryData.productName,
            sku: inventoryData.sku,
            currentStock: inventoryData.currentStock,
            threshold: inventoryData.threshold,
            estimatedStockoutDate: inventoryData.estimatedStockoutDate 
              ? new Date(inventoryData.estimatedStockoutDate) 
              : undefined
          });
          break;
        
        default:
          logger.warn('Unknown inventory action', { action: inventoryData.action });
      }

      res.json({ success: true, message: 'Inventory webhook processed' });
    } catch (error) {
      logger.error('Error processing inventory webhook', { error });
      res.status(500).json({ error: 'Failed to process inventory webhook' });
    }
  }

  private async handleStrapiOrderWebhook(req: express.Request, res: express.Response): Promise<void> {
    try {
      const strapiData = req.body;
      logger.info('Processing Strapi order webhook', { 
        event: strapiData.event,
        model: strapiData.model 
      });

      if (strapiData.model === 'order' && strapiData.entry) {
        const order = strapiData.entry;
        
        switch (strapiData.event) {
          case 'entry.create':
            await this.orderTracker.trackOrder(this.mapStrapiOrderToOrder(order));
            break;
          
          case 'entry.update':
            await this.orderTracker.trackOrder(this.mapStrapiOrderToOrder(order));
            break;
          
          default:
            logger.info('Unhandled Strapi order event', { event: strapiData.event });
        }
      }

      res.json({ success: true, message: 'Strapi order webhook processed' });
    } catch (error) {
      logger.error('Error processing Strapi order webhook', { error });
      res.status(500).json({ error: 'Failed to process Strapi order webhook' });
    }
  }

  private async handleStrapiProductWebhook(req: express.Request, res: express.Response): Promise<void> {
    try {
      const strapiData = req.body;
      logger.info('Processing Strapi product webhook', { 
        event: strapiData.event,
        model: strapiData.model 
      });

      if (strapiData.model === 'product' && strapiData.entry) {
        const product = strapiData.entry;
        
        await this.inventoryTracker.updateProductInventory({
          id: product.id.toString(),
          name: product.name,
          sku: product.sku,
          category: product.category?.name || 'Unknown',
          subCategory: product.subCategory?.name,
          brand: product.brand?.name,
          currentStock: product.inventory || 0,
          lowStockThreshold: product.lowStockThreshold || 10,
          reorderPoint: product.reorderPoint || 10,
          reorderQuantity: product.reorderQuantity || 50,
          costPrice: product.costPrice || 0,
          sellingPrice: product.price || 0,
          compareAtPrice: product.compareAtPrice,
          lastRestocked: product.updatedAt ? new Date(product.updatedAt) : undefined
        });
      }

      res.json({ success: true, message: 'Strapi product webhook processed' });
    } catch (error) {
      logger.error('Error processing Strapi product webhook', { error });
      res.status(500).json({ error: 'Failed to process Strapi product webhook' });
    }
  }

  private mapStrapiOrderToOrder(strapiOrder: any): any {
    // Map Strapi order structure to our Order type
    // This is a simplified mapping - adjust based on your Strapi schema
    return {
      id: strapiOrder.id.toString(),
      customerId: strapiOrder.customer?.id?.toString() || 'unknown',
      customerName: `${strapiOrder.customer?.firstName || ''} ${strapiOrder.customer?.lastName || ''}`.trim() || 'Unknown',
      customerEmail: strapiOrder.customer?.email || 'unknown@example.com',
      status: strapiOrder.status || 'pending',
      totalAmount: strapiOrder.totalAmount || 0,
      currency: strapiOrder.currency || 'USD',
      paymentMethod: strapiOrder.paymentMethod || 'unknown',
      shippingMethod: strapiOrder.shippingMethod || 'standard',
      items: strapiOrder.items?.map((item: any) => ({
        productId: item.product?.id?.toString() || 'unknown',
        name: item.product?.name || 'Unknown Product',
        sku: item.product?.sku || 'unknown',
        quantity: item.quantity || 1,
        price: item.price || 0,
        totalPrice: (item.price || 0) * (item.quantity || 1)
      })) || [],
      shippingAddress: strapiOrder.shippingAddress || {},
      billingAddress: strapiOrder.billingAddress || strapiOrder.shippingAddress || {},
      createdAt: strapiOrder.createdAt ? new Date(strapiOrder.createdAt) : new Date(),
      updatedAt: strapiOrder.updatedAt ? new Date(strapiOrder.updatedAt) : new Date(),
      trackingNumber: strapiOrder.trackingNumber,
      carrier: strapiOrder.carrier,
      estimatedDelivery: strapiOrder.estimatedDelivery ? new Date(strapiOrder.estimatedDelivery) : undefined
    };
  }

  private errorHandler(err: any, req: express.Request, res: express.Response, next: express.NextFunction): void {
    logger.error('Webhook server error', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method
    });

    // Send system error alert for critical errors
    this.emailService.sendSystemErrorAlert({
      service: 'webhook-server',
      error: err.message,
      timestamp: new Date(),
      severity: 'high',
      details: `Path: ${req.path}, Method: ${req.method}`
    }).catch(emailError => {
      logger.error('Failed to send system error alert', { emailError });
    });

    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred processing the webhook'
    });
  }

  public start(): void {
    const port = config.webhook.port;
    
    this.app.listen(port, () => {
      logger.info(`Webhook server started on port ${port}`);
    });
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  const server = new WebhookServer();
  server.start();
}