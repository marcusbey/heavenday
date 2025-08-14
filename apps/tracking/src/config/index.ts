import dotenv from 'dotenv';
import { TrackingConfig } from '../types';

dotenv.config();

const requiredEnvVars = [
  'GOOGLE_CLIENT_EMAIL',
  'GOOGLE_PRIVATE_KEY',
  'GOOGLE_PROJECT_ID',
  'ORDERS_SPREADSHEET_ID',
  'ANALYTICS_SPREADSHEET_ID',
  'SUPPORT_SPREADSHEET_ID',
  'INVENTORY_SPREADSHEET_ID',
  'BUSINESS_INTELLIGENCE_SPREADSHEET_ID',
  'STRAPI_API_URL',
  'STRAPI_API_TOKEN',
  'WEBHOOK_PORT',
  'WEBHOOK_SECRET',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'NOTIFICATION_EMAIL'
];

// Validate required environment variables
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

export const config: TrackingConfig = {
  googleSheets: {
    clientEmail: process.env.GOOGLE_CLIENT_EMAIL!,
    privateKey: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    projectId: process.env.GOOGLE_PROJECT_ID!
  },
  spreadsheets: {
    orders: process.env.ORDERS_SPREADSHEET_ID!,
    analytics: process.env.ANALYTICS_SPREADSHEET_ID!,
    support: process.env.SUPPORT_SPREADSHEET_ID!,
    inventory: process.env.INVENTORY_SPREADSHEET_ID!,
    businessIntelligence: process.env.BUSINESS_INTELLIGENCE_SPREADSHEET_ID!
  },
  strapi: {
    apiUrl: process.env.STRAPI_API_URL!,
    apiToken: process.env.STRAPI_API_TOKEN!
  },
  webhook: {
    port: parseInt(process.env.WEBHOOK_PORT!, 10),
    secret: process.env.WEBHOOK_SECRET!
  },
  email: {
    host: process.env.SMTP_HOST!,
    port: parseInt(process.env.SMTP_PORT!, 10),
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
    from: process.env.NOTIFICATION_EMAIL!
  },
  sync: {
    intervalMinutes: parseInt(process.env.SYNC_INTERVAL_MINUTES || '5', 10),
    batchSize: parseInt(process.env.BATCH_SIZE || '100', 10)
  }
};

export const isProduction = process.env.NODE_ENV === 'production';
export const isDevelopment = process.env.NODE_ENV === 'development';
export const logLevel = process.env.LOG_LEVEL || 'info';
export const trackingEnabled = process.env.TRACKING_ENABLED !== 'false';