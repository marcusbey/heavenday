import { SheetsClient } from '../sheets/client';
import { config } from '../config';
import { logger } from '../utils/logger';
import { Product, InventoryAlert, InventoryAlertType, SyncResult } from '../types';
import { format } from 'date-fns';

export class InventoryTracker {
  private sheetsClient: SheetsClient;
  private inventorySpreadsheetId: string;

  constructor() {
    this.sheetsClient = new SheetsClient();
    this.inventorySpreadsheetId = config.spreadsheets.inventory;
  }

  async trackStockMovement(data: {
    productId: string;
    sku: string;
    movementType: 'purchase' | 'sale' | 'adjustment' | 'return' | 'restock';
    quantity: number;
    reason: string;
    orderId?: string;
    reference?: string;
    movedBy: string;
    costImpact?: number;
    notes?: string;
  }): Promise<void> {
    try {
      logger.info('Tracking stock movement', { 
        productId: data.productId, 
        type: data.movementType,
        quantity: data.quantity 
      });

      // Get current product inventory
      const product = await this.getProductInventory(data.productId);
      if (!product) {
        throw new Error(`Product not found: ${data.productId}`);
      }

      const previousStock = product.inventory;
      const newStock = data.movementType === 'sale' || data.movementType === 'adjustment' 
        ? previousStock - Math.abs(data.quantity)
        : previousStock + Math.abs(data.quantity);

      // Update product inventory
      await this.updateProductStock(data.productId, newStock);

      // Log stock movement
      const movementRow = [
        data.productId,
        data.sku,
        data.movementType,
        data.quantity,
        previousStock,
        newStock,
        data.reason,
        data.orderId || '',
        data.reference || '',
        data.movedBy,
        format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
        data.costImpact || 0,
        data.notes || ''
      ];

      await this.sheetsClient.appendRows(
        this.inventorySpreadsheetId,
        'Stock Movements',
        [movementRow]
      );

      // Check for low stock alerts
      await this.checkStockLevels(data.productId, newStock, product.lowStockThreshold);

      logger.info('Stock movement tracked successfully', { 
        productId: data.productId,
        previousStock,
        newStock 
      });
    } catch (error) {
      logger.error('Error tracking stock movement', { error, data });
      throw error;
    }
  }

  async updateProductInventory(productData: {
    id: string;
    name: string;
    sku: string;
    category: string;
    subCategory?: string;
    brand?: string;
    currentStock: number;
    lowStockThreshold: number;
    reorderPoint: number;
    reorderQuantity: number;
    costPrice: number;
    sellingPrice: number;
    compareAtPrice?: number;
    supplier?: string;
    lastRestocked?: Date;
  }): Promise<void> {
    try {
      logger.info('Updating product inventory', { productId: productData.id });

      const stockStatus = this.getStockStatus(productData.currentStock, productData.lowStockThreshold);
      const daysOfInventory = await this.calculateDaysOfInventory(productData.id, productData.currentStock);
      const turnoverRate = await this.calculateTurnoverRate(productData.id);

      const inventoryRow = [
        productData.id,
        productData.name,
        productData.sku,
        productData.category,
        productData.subCategory || '',
        productData.brand || '',
        productData.currentStock,
        productData.lowStockThreshold,
        productData.reorderPoint,
        productData.reorderQuantity,
        productData.costPrice,
        productData.sellingPrice,
        productData.compareAtPrice || '',
        productData.supplier || '',
        productData.lastRestocked ? format(productData.lastRestocked, 'yyyy-MM-dd') : '',
        stockStatus,
        daysOfInventory,
        turnoverRate.toFixed(2)
      ];

      // Update or add product inventory
      const existing = await this.sheetsClient.findAndUpdateRow(
        this.inventorySpreadsheetId,
        'Product Inventory',
        0, // Search in Product ID column
        productData.id,
        inventoryRow
      );

      if (!existing) {
        await this.sheetsClient.appendRows(
          this.inventorySpreadsheetId,
          'Product Inventory',
          [inventoryRow]
        );
      }

      // Check for alerts
      await this.checkStockLevels(productData.id, productData.currentStock, productData.lowStockThreshold);

      logger.info('Product inventory updated successfully', { productId: productData.id });
    } catch (error) {
      logger.error('Error updating product inventory', { error, productData });
      throw error;
    }
  }

  async createStockAlert(data: {
    productId: string;
    productName: string;
    sku: string;
    currentStock: number;
    threshold: number;
    alertType: InventoryAlertType;
  }): Promise<void> {
    try {
      const alertId = this.generateAlertId();
      
      const alert: InventoryAlert = {
        id: alertId,
        productId: data.productId,
        productName: data.productName,
        sku: data.sku,
        currentStock: data.currentStock,
        threshold: data.threshold,
        alertType: data.alertType,
        status: 'active',
        createdAt: new Date()
      };

      logger.info('Creating stock alert', { alertId, productId: data.productId, type: data.alertType });

      const alertRow = [
        alert.id,
        alert.productId,
        alert.productName,
        alert.sku,
        alert.currentStock,
        alert.threshold,
        alert.alertType,
        alert.status,
        format(alert.createdAt, 'yyyy-MM-dd HH:mm:ss'),
        '', // Resolved At
        this.calculateDaysWithLowStock(alert.createdAt),
        this.estimateLostSales(data.productId, data.currentStock)
      ];

      await this.sheetsClient.appendRows(
        this.inventorySpreadsheetId,
        'Low Stock Alerts',
        [alertRow]
      );

      logger.info('Stock alert created successfully', { alertId });
    } catch (error) {
      logger.error('Error creating stock alert', { error, data });
      throw error;
    }
  }

  async resolveStockAlert(alertId: string): Promise<void> {
    try {
      logger.info('Resolving stock alert', { alertId });

      const alert = await this.getStockAlert(alertId);
      if (!alert) {
        throw new Error(`Stock alert not found: ${alertId}`);
      }

      const resolvedAlert = {
        ...alert,
        status: 'resolved',
        resolvedAt: new Date()
      };

      const alertRow = this.alertToSheetRow(resolvedAlert);
      
      await this.sheetsClient.findAndUpdateRow(
        this.inventorySpreadsheetId,
        'Low Stock Alerts',
        0, // Search in Alert ID column
        alertId,
        alertRow
      );

      logger.info('Stock alert resolved successfully', { alertId });
    } catch (error) {
      logger.error('Error resolving stock alert', { error, alertId });
      throw error;
    }
  }

  async updateSupplierPerformance(): Promise<void> {
    try {
      logger.info('Updating supplier performance metrics');

      const suppliers = await this.getSupplierPerformanceData();

      // Clear existing supplier performance data
      await this.sheetsClient.clearRange(
        this.inventorySpreadsheetId,
        'Supplier Performance!A2:J1000'
      );

      // Add updated supplier performance
      const supplierRows = suppliers.map(supplier => [
        supplier.name,
        supplier.contactEmail,
        supplier.productsCount,
        supplier.averageLeadTime.toFixed(1),
        supplier.onTimeDeliveryRate.toFixed(2),
        supplier.qualityScore.toFixed(2),
        supplier.lastOrderDate ? format(supplier.lastOrderDate, 'yyyy-MM-dd') : '',
        supplier.totalOrders,
        supplier.averageOrderValue.toFixed(2),
        supplier.paymentTerms
      ]);

      if (supplierRows.length > 0) {
        await this.sheetsClient.appendRows(
          this.inventorySpreadsheetId,
          'Supplier Performance',
          supplierRows
        );
      }

      logger.info('Supplier performance updated successfully');
    } catch (error) {
      logger.error('Error updating supplier performance', { error });
      throw error;
    }
  }

  async updateInventoryForecasting(): Promise<void> {
    try {
      logger.info('Updating inventory forecasting');

      const forecasts = await this.generateInventoryForecasts();

      // Clear existing forecasting data
      await this.sheetsClient.clearRange(
        this.inventorySpreadsheetId,
        'Forecasting!A2:K1000'
      );

      // Add updated forecasts
      const forecastRows = forecasts.map(forecast => [
        forecast.productId,
        forecast.productName,
        forecast.sku,
        forecast.currentStock,
        forecast.averageDailySales.toFixed(2),
        forecast.daysOfInventoryRemaining,
        forecast.predictedStockOutDate ? format(forecast.predictedStockOutDate, 'yyyy-MM-dd') : '',
        forecast.recommendedReorderQuantity,
        forecast.seasonalFactor.toFixed(2),
        forecast.trendFactor.toFixed(2),
        forecast.safetyStock
      ]);

      if (forecastRows.length > 0) {
        await this.sheetsClient.appendRows(
          this.inventorySpreadsheetId,
          'Forecasting',
          forecastRows
        );
      }

      logger.info('Inventory forecasting updated successfully');
    } catch (error) {
      logger.error('Error updating inventory forecasting', { error });
      throw error;
    }
  }

  async syncInventoryData(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      recordsProcessed: 0,
      recordsAdded: 0,
      recordsUpdated: 0,
      errors: [],
      timestamp: new Date()
    };

    try {
      logger.info('Starting inventory data sync');

      // Sync product inventory from Strapi
      const products = await this.fetchProductsFromStrapi();
      result.recordsProcessed += products.length;

      for (const product of products) {
        try {
          await this.updateProductInventory({
            id: product.id,
            name: product.name,
            sku: product.sku,
            category: product.category,
            currentStock: product.inventory,
            lowStockThreshold: product.lowStockThreshold,
            reorderPoint: product.lowStockThreshold,
            reorderQuantity: 100, // Default value
            costPrice: product.costPrice || 0,
            sellingPrice: product.price,
            compareAtPrice: product.compareAtPrice,
            lastRestocked: product.updatedAt
          });
          result.recordsUpdated++;
        } catch (error) {
          const errorMessage = `Error syncing product ${product.id}: ${error}`;
          result.errors.push(errorMessage);
          logger.error(errorMessage, { error, productId: product.id });
        }
      }

      // Update supplier performance
      await this.updateSupplierPerformance();
      result.recordsProcessed++;

      // Update inventory forecasting
      await this.updateInventoryForecasting();
      result.recordsProcessed++;

      result.success = result.errors.length === 0;
      logger.info('Inventory data sync completed', result);

      return result;
    } catch (error) {
      const errorMessage = `Error during inventory sync: ${error}`;
      result.errors.push(errorMessage);
      logger.error(errorMessage, { error });
      return result;
    }
  }

  private async getProductInventory(productId: string): Promise<Product | null> {
    try {
      const values = await this.sheetsClient.getValues(
        this.inventorySpreadsheetId,
        'Product Inventory!A:R'
      );
      
      const productRow = values.find(row => row[0] === productId);
      if (!productRow) return null;
      
      return this.sheetRowToProduct(productRow);
    } catch (error) {
      logger.error('Error getting product inventory', { error, productId });
      return null;
    }
  }

  private async updateProductStock(productId: string, newStock: number): Promise<void> {
    // Update the current stock value in the Product Inventory sheet
    const values = await this.sheetsClient.getValues(
      this.inventorySpreadsheetId,
      'Product Inventory!A:R'
    );
    
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] === productId) {
        values[i][6] = newStock; // Current Stock column
        values[i][15] = this.getStockStatus(newStock, parseInt(values[i][7])); // Stock Status
        
        await this.sheetsClient.updateRange(
          this.inventorySpreadsheetId,
          `Product Inventory!A${i + 1}:R${i + 1}`,
          [values[i]]
        );
        break;
      }
    }
  }

  private async checkStockLevels(productId: string, currentStock: number, threshold: number): Promise<void> {
    if (currentStock <= 0) {
      const product = await this.getProductInventory(productId);
      if (product) {
        await this.createStockAlert({
          productId,
          productName: product.name,
          sku: product.sku,
          currentStock,
          threshold,
          alertType: 'out_of_stock'
        });
      }
    } else if (currentStock <= threshold) {
      const product = await this.getProductInventory(productId);
      if (product) {
        await this.createStockAlert({
          productId,
          productName: product.name,
          sku: product.sku,
          currentStock,
          threshold,
          alertType: 'low_stock'
        });
      }
    }
  }

  private async getStockAlert(alertId: string): Promise<InventoryAlert | null> {
    try {
      const values = await this.sheetsClient.getValues(
        this.inventorySpreadsheetId,
        'Low Stock Alerts!A:L'
      );
      
      const alertRow = values.find(row => row[0] === alertId);
      if (!alertRow) return null;
      
      return this.sheetRowToAlert(alertRow);
    } catch (error) {
      logger.error('Error getting stock alert', { error, alertId });
      return null;
    }
  }

  private async fetchProductsFromStrapi(): Promise<Product[]> {
    // This would integrate with your Strapi API to fetch product data
    // For now, return empty array - implement based on your Strapi structure
    logger.info('Fetching products from Strapi API');
    return [];
  }

  private async getSupplierPerformanceData(): Promise<any[]> {
    // This would analyze supplier data and performance metrics
    // Return mock data for now
    return [
      {
        name: 'Supplier A',
        contactEmail: 'supplier.a@example.com',
        productsCount: 25,
        averageLeadTime: 7.5,
        onTimeDeliveryRate: 95.2,
        qualityScore: 4.6,
        lastOrderDate: new Date(),
        totalOrders: 156,
        averageOrderValue: 2500,
        paymentTerms: 'Net 30'
      }
    ];
  }

  private async generateInventoryForecasts(): Promise<any[]> {
    // This would analyze sales data to generate forecasts
    // Return mock data for now
    return [
      {
        productId: 'PROD-001',
        productName: 'Premium Doll',
        sku: 'PD-001',
        currentStock: 25,
        averageDailySales: 1.5,
        daysOfInventoryRemaining: 17,
        predictedStockOutDate: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000),
        recommendedReorderQuantity: 50,
        seasonalFactor: 1.2,
        trendFactor: 1.1,
        safetyStock: 10
      }
    ];
  }

  private async calculateDaysOfInventory(productId: string, currentStock: number): Promise<number> {
    // This would calculate based on sales velocity
    const averageDailySales = await this.getAverageDailySales(productId);
    return averageDailySales > 0 ? Math.round(currentStock / averageDailySales) : 999;
  }

  private async calculateTurnoverRate(productId: string): Promise<number> {
    // This would calculate inventory turnover based on sales data
    return 2.5; // Mock value
  }

  private async getAverageDailySales(productId: string): Promise<number> {
    // This would calculate average daily sales from order data
    return 1.5; // Mock value
  }

  private calculateDaysWithLowStock(createdAt: Date): number {
    return Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  }

  private estimateLostSales(productId: string, currentStock: number): number {
    // This would estimate potential lost sales due to stock issues
    return currentStock <= 0 ? 500 : 0; // Mock calculation
  }

  private getStockStatus(currentStock: number, threshold: number): string {
    if (currentStock <= 0) return 'Out of Stock';
    if (currentStock <= threshold) return 'Low Stock';
    return 'In Stock';
  }

  private generateAlertId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 7);
    return `ALERT-${timestamp}-${randomStr}`.toUpperCase();
  }

  private sheetRowToProduct(row: any[]): Product {
    return {
      id: row[0],
      name: row[1],
      sku: row[2],
      category: row[3],
      brand: row[5] || undefined,
      price: parseFloat(row[11]) || 0,
      compareAtPrice: row[12] ? parseFloat(row[12]) : undefined,
      costPrice: parseFloat(row[10]) || 0,
      inventory: parseInt(row[6]) || 0,
      lowStockThreshold: parseInt(row[7]) || 0,
      isActive: true,
      views: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private sheetRowToAlert(row: any[]): InventoryAlert {
    return {
      id: row[0],
      productId: row[1],
      productName: row[2],
      sku: row[3],
      currentStock: parseInt(row[4]) || 0,
      threshold: parseInt(row[5]) || 0,
      alertType: row[6] as InventoryAlertType,
      status: row[7] as 'active' | 'resolved',
      createdAt: new Date(row[8]),
      resolvedAt: row[9] ? new Date(row[9]) : undefined
    };
  }

  private alertToSheetRow(alert: InventoryAlert): any[] {
    return [
      alert.id,
      alert.productId,
      alert.productName,
      alert.sku,
      alert.currentStock,
      alert.threshold,
      alert.alertType,
      alert.status,
      format(alert.createdAt, 'yyyy-MM-dd HH:mm:ss'),
      alert.resolvedAt ? format(alert.resolvedAt, 'yyyy-MM-dd HH:mm:ss') : '',
      this.calculateDaysWithLowStock(alert.createdAt),
      this.estimateLostSales(alert.productId, alert.currentStock)
    ];
  }
}