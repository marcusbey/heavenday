import { SheetsClient } from '../sheets/client';
import { config } from '../config';
import { logger } from '../utils/logger';
import { getTemplate } from '../templates/sheets-templates';

export class SheetsInitializer {
  private sheetsClient: SheetsClient;

  constructor() {
    this.sheetsClient = new SheetsClient();
  }

  async initializeAllSpreadsheets(): Promise<{
    orders: string;
    analytics: string;
    support: string;
    inventory: string;
    businessIntelligence: string;
  }> {
    try {
      logger.info('Initializing all Google Sheets spreadsheets');

      const results = await Promise.all([
        this.initializeOrdersSpreadsheet(),
        this.initializeAnalyticsSpreadsheet(),
        this.initializeSupportSpreadsheet(),
        this.initializeInventorySpreadsheet(),
        this.initializeBusinessIntelligenceSpreadsheet()
      ]);

      const spreadsheetIds = {
        orders: results[0],
        analytics: results[1],
        support: results[2],
        inventory: results[3],
        businessIntelligence: results[4]
      };

      // Setup conditional formatting and charts
      await this.setupConditionalFormatting(spreadsheetIds);
      await this.setupCharts(spreadsheetIds);

      logger.info('All spreadsheets initialized successfully', spreadsheetIds);
      return spreadsheetIds;
    } catch (error) {
      logger.error('Error initializing spreadsheets', { error });
      throw error;
    }
  }

  async initializeOrdersSpreadsheet(): Promise<string> {
    try {
      logger.info('Initializing Orders spreadsheet');
      
      const template = getTemplate('orders');
      const spreadsheetId = await this.sheetsClient.createSpreadsheet(
        template.title,
        template.sheets
      );

      // Add data validation for status columns
      await this.addOrderStatusValidation(spreadsheetId);

      logger.info('Orders spreadsheet initialized', { spreadsheetId });
      return spreadsheetId;
    } catch (error) {
      logger.error('Error initializing orders spreadsheet', { error });
      throw error;
    }
  }

  async initializeAnalyticsSpreadsheet(): Promise<string> {
    try {
      logger.info('Initializing Analytics spreadsheet');
      
      const template = getTemplate('analytics');
      const spreadsheetId = await this.sheetsClient.createSpreadsheet(
        template.title,
        template.sheets
      );

      // Add data validation for activity types
      await this.addActivityTypeValidation(spreadsheetId);

      logger.info('Analytics spreadsheet initialized', { spreadsheetId });
      return spreadsheetId;
    } catch (error) {
      logger.error('Error initializing analytics spreadsheet', { error });
      throw error;
    }
  }

  async initializeSupportSpreadsheet(): Promise<string> {
    try {
      logger.info('Initializing Support spreadsheet');
      
      const template = getTemplate('support');
      const spreadsheetId = await this.sheetsClient.createSpreadsheet(
        template.title,
        template.sheets
      );

      // Add data validation for support fields
      await this.addSupportValidation(spreadsheetId);

      logger.info('Support spreadsheet initialized', { spreadsheetId });
      return spreadsheetId;
    } catch (error) {
      logger.error('Error initializing support spreadsheet', { error });
      throw error;
    }
  }

  async initializeInventorySpreadsheet(): Promise<string> {
    try {
      logger.info('Initializing Inventory spreadsheet');
      
      const template = getTemplate('inventory');
      const spreadsheetId = await this.sheetsClient.createSpreadsheet(
        template.title,
        template.sheets
      );

      // Add data validation for inventory fields
      await this.addInventoryValidation(spreadsheetId);

      logger.info('Inventory spreadsheet initialized', { spreadsheetId });
      return spreadsheetId;
    } catch (error) {
      logger.error('Error initializing inventory spreadsheet', { error });
      throw error;
    }
  }

  async initializeBusinessIntelligenceSpreadsheet(): Promise<string> {
    try {
      logger.info('Initializing Business Intelligence spreadsheet');
      
      const template = getTemplate('business-intelligence');
      const spreadsheetId = await this.sheetsClient.createSpreadsheet(
        template.title,
        template.sheets
      );

      logger.info('Business Intelligence spreadsheet initialized', { spreadsheetId });
      return spreadsheetId;
    } catch (error) {
      logger.error('Error initializing business intelligence spreadsheet', { error });
      throw error;
    }
  }

  private async addOrderStatusValidation(spreadsheetId: string): Promise<void> {
    try {
      const statusOptions = [
        'pending', 'confirmed', 'processing', 'shipped', 
        'out_for_delivery', 'delivered', 'cancelled', 'refunded', 'returned'
      ];

      // Add data validation to status column in Orders sheet
      const requests = [{
        setDataValidation: {
          range: {
            sheetId: 0, // Orders sheet
            startRowIndex: 1,
            endRowIndex: 1000,
            startColumnIndex: 4, // Status column
            endColumnIndex: 5
          },
          rule: {
            condition: {
              type: 'ONE_OF_LIST',
              values: statusOptions.map(status => ({ userEnteredValue: status }))
            },
            showCustomUi: true,
            strict: true
          }
        }
      }];

      await this.sheetsClient.batchUpdate(spreadsheetId, requests);
    } catch (error) {
      logger.error('Error adding order status validation', { error });
    }
  }

  private async addActivityTypeValidation(spreadsheetId: string): Promise<void> {
    try {
      const activityTypes = [
        'page_view', 'product_view', 'category_view', 'search',
        'add_to_cart', 'remove_from_cart', 'add_to_wishlist', 'remove_from_wishlist',
        'checkout_started', 'checkout_completed', 'purchase', 'sign_up', 'sign_in', 'sign_out'
      ];

      // Add data validation to activity type column in User Activities sheet
      const requests = [{
        setDataValidation: {
          range: {
            sheetId: 0, // User Activities sheet
            startRowIndex: 1,
            endRowIndex: 5000,
            startColumnIndex: 2, // Activity Type column
            endColumnIndex: 3
          },
          rule: {
            condition: {
              type: 'ONE_OF_LIST',
              values: activityTypes.map(type => ({ userEnteredValue: type }))
            },
            showCustomUi: true,
            strict: true
          }
        }
      }];

      await this.sheetsClient.batchUpdate(spreadsheetId, requests);
    } catch (error) {
      logger.error('Error adding activity type validation', { error });
    }
  }

  private async addSupportValidation(spreadsheetId: string): Promise<void> {
    try {
      const priorities = ['low', 'medium', 'high', 'urgent'];
      const statuses = ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'];
      const categories = ['order', 'shipping', 'payment', 'product', 'return', 'account', 'technical', 'general'];

      const requests = [
        // Priority validation
        {
          setDataValidation: {
            range: {
              sheetId: 0, // Support Tickets sheet
              startRowIndex: 1,
              endRowIndex: 5000,
              startColumnIndex: 7, // Priority column
              endColumnIndex: 8
            },
            rule: {
              condition: {
                type: 'ONE_OF_LIST',
                values: priorities.map(priority => ({ userEnteredValue: priority }))
              },
              showCustomUi: true,
              strict: true
            }
          }
        },
        // Status validation
        {
          setDataValidation: {
            range: {
              sheetId: 0,
              startRowIndex: 1,
              endRowIndex: 5000,
              startColumnIndex: 8, // Status column
              endColumnIndex: 9
            },
            rule: {
              condition: {
                type: 'ONE_OF_LIST',
                values: statuses.map(status => ({ userEnteredValue: status }))
              },
              showCustomUi: true,
              strict: true
            }
          }
        },
        // Category validation
        {
          setDataValidation: {
            range: {
              sheetId: 0,
              startRowIndex: 1,
              endRowIndex: 5000,
              startColumnIndex: 6, // Category column
              endColumnIndex: 7
            },
            rule: {
              condition: {
                type: 'ONE_OF_LIST',
                values: categories.map(category => ({ userEnteredValue: category }))
              },
              showCustomUi: true,
              strict: true
            }
          }
        }
      ];

      await this.sheetsClient.batchUpdate(spreadsheetId, requests);
    } catch (error) {
      logger.error('Error adding support validation', { error });
    }
  }

  private async addInventoryValidation(spreadsheetId: string): Promise<void> {
    try {
      const stockStatuses = ['In Stock', 'Low Stock', 'Out of Stock'];
      const movementTypes = ['purchase', 'sale', 'adjustment', 'return', 'restock'];
      const alertTypes = ['low_stock', 'out_of_stock', 'overstock'];

      const requests = [
        // Stock status validation in Product Inventory sheet
        {
          setDataValidation: {
            range: {
              sheetId: 0, // Product Inventory sheet
              startRowIndex: 1,
              endRowIndex: 1000,
              startColumnIndex: 15, // Stock Status column
              endColumnIndex: 16
            },
            rule: {
              condition: {
                type: 'ONE_OF_LIST',
                values: stockStatuses.map(status => ({ userEnteredValue: status }))
              },
              showCustomUi: true,
              strict: true
            }
          }
        },
        // Movement type validation in Stock Movements sheet
        {
          setDataValidation: {
            range: {
              sheetId: 1, // Stock Movements sheet
              startRowIndex: 1,
              endRowIndex: 5000,
              startColumnIndex: 2, // Movement Type column
              endColumnIndex: 3
            },
            rule: {
              condition: {
                type: 'ONE_OF_LIST',
                values: movementTypes.map(type => ({ userEnteredValue: type }))
              },
              showCustomUi: true,
              strict: true
            }
          }
        },
        // Alert type validation in Low Stock Alerts sheet
        {
          setDataValidation: {
            range: {
              sheetId: 2, // Low Stock Alerts sheet
              startRowIndex: 1,
              endRowIndex: 1000,
              startColumnIndex: 6, // Alert Type column
              endColumnIndex: 7
            },
            rule: {
              condition: {
                type: 'ONE_OF_LIST',
                values: alertTypes.map(type => ({ userEnteredValue: type }))
              },
              showCustomUi: true,
              strict: true
            }
          }
        }
      ];

      await this.sheetsClient.batchUpdate(spreadsheetId, requests);
    } catch (error) {
      logger.error('Error adding inventory validation', { error });
    }
  }

  private async setupConditionalFormatting(spreadsheetIds: any): Promise<void> {
    try {
      logger.info('Setting up conditional formatting');

      // Orders - Status color coding
      await this.sheetsClient.addConditionalFormatting(
        spreadsheetIds.orders,
        0, // Orders sheet
        { startRow: 1, endRow: 1000, startColumn: 4, endColumn: 5 }, // Status column
        {
          type: 'TEXT_EQ',
          values: [{ userEnteredValue: 'delivered' }]
        },
        {
          backgroundColor: { red: 0.85, green: 0.92, blue: 0.83 } // Light green
        }
      );

      await this.sheetsClient.addConditionalFormatting(
        spreadsheetIds.orders,
        0,
        { startRow: 1, endRow: 1000, startColumn: 4, endColumn: 5 },
        {
          type: 'TEXT_EQ',
          values: [{ userEnteredValue: 'cancelled' }]
        },
        {
          backgroundColor: { red: 0.96, green: 0.8, blue: 0.8 } // Light red
        }
      );

      // Support - Priority color coding
      await this.sheetsClient.addConditionalFormatting(
        spreadsheetIds.support,
        0, // Support Tickets sheet
        { startRow: 1, endRow: 5000, startColumn: 7, endColumn: 8 }, // Priority column
        {
          type: 'TEXT_EQ',
          values: [{ userEnteredValue: 'urgent' }]
        },
        {
          backgroundColor: { red: 0.96, green: 0.8, blue: 0.8 } // Light red
        }
      );

      // Inventory - Stock level color coding
      await this.sheetsClient.addConditionalFormatting(
        spreadsheetIds.inventory,
        0, // Product Inventory sheet
        { startRow: 1, endRow: 1000, startColumn: 15, endColumn: 16 }, // Stock Status column
        {
          type: 'TEXT_EQ',
          values: [{ userEnteredValue: 'Out of Stock' }]
        },
        {
          backgroundColor: { red: 0.96, green: 0.8, blue: 0.8 } // Light red
        }
      );

      logger.info('Conditional formatting setup completed');
    } catch (error) {
      logger.error('Error setting up conditional formatting', { error });
    }
  }

  private async setupCharts(spreadsheetIds: any): Promise<void> {
    try {
      logger.info('Setting up charts');

      // Orders - Daily orders chart
      await this.sheetsClient.createChart(
        spreadsheetIds.orders,
        4, // Daily Summary sheet
        'LINE',
        {
          sheetId: 4,
          startRowIndex: 1,
          endRowIndex: 100,
          startColumnIndex: 0,
          endColumnIndex: 2
        },
        {
          overlayPosition: {
            anchorCell: {
              sheetId: 4,
              rowIndex: 5,
              columnIndex: 15
            }
          }
        }
      );

      // Business Intelligence - Revenue chart
      await this.sheetsClient.createChart(
        spreadsheetIds.businessIntelligence,
        0, // KPI Dashboard sheet
        'COLUMN',
        {
          sheetId: 0,
          startRowIndex: 1,
          endRowIndex: 100,
          startColumnIndex: 0,
          endColumnIndex: 3
        },
        {
          overlayPosition: {
            anchorCell: {
              sheetId: 0,
              rowIndex: 5,
              columnIndex: 16
            }
          }
        }
      );

      logger.info('Charts setup completed');
    } catch (error) {
      logger.error('Error setting up charts', { error });
    }
  }

  async updateEnvironmentFile(spreadsheetIds: any): Promise<void> {
    try {
      logger.info('Environment file would be updated with spreadsheet IDs');
      logger.info('Add these IDs to your .env file:', spreadsheetIds);
      
      // In a real implementation, you might want to automatically update the .env file
      // or provide a script to do so
      
    } catch (error) {
      logger.error('Error updating environment file', { error });
    }
  }
}