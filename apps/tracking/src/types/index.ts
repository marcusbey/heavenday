// Core tracking types
export interface Order {
  id: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  shippingAddress: Address;
  billingAddress: Address;
  paymentMethod: string;
  shippingMethod: string;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
}

export interface OrderItem {
  productId: string;
  variantId?: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  totalPrice: number;
  imageUrl?: string;
}

export interface Address {
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  country: string;
  postalCode: string;
  phone?: string;
}

export type OrderStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'processing' 
  | 'shipped' 
  | 'out_for_delivery' 
  | 'delivered' 
  | 'cancelled' 
  | 'refunded' 
  | 'returned';

export interface UserActivity {
  userId: string;
  sessionId: string;
  type: UserActivityType;
  page?: string;
  productId?: string;
  categoryId?: string;
  searchQuery?: string;
  referrer?: string;
  userAgent?: string;
  ipAddress?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export type UserActivityType = 
  | 'page_view' 
  | 'product_view' 
  | 'category_view' 
  | 'search' 
  | 'add_to_cart' 
  | 'remove_from_cart' 
  | 'add_to_wishlist' 
  | 'remove_from_wishlist'
  | 'checkout_started'
  | 'checkout_completed'
  | 'purchase'
  | 'sign_up'
  | 'sign_in'
  | 'sign_out';

export interface ConversionEvent {
  userId: string;
  sessionId: string;
  type: ConversionType;
  value?: number;
  currency?: string;
  orderId?: string;
  productId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export type ConversionType = 
  | 'purchase' 
  | 'add_to_cart' 
  | 'begin_checkout' 
  | 'sign_up' 
  | 'subscribe';

export interface SupportTicket {
  id: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  subject: string;
  description: string;
  category: SupportCategory;
  priority: SupportPriority;
  status: SupportStatus;
  assignedTo?: string;
  orderId?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  firstResponseAt?: Date;
  responseTime?: number; // minutes
  resolutionTime?: number; // minutes
  satisfactionScore?: number; // 1-5
  tags?: string[];
}

export type SupportCategory = 
  | 'order' 
  | 'shipping' 
  | 'payment' 
  | 'product' 
  | 'return' 
  | 'account' 
  | 'technical' 
  | 'general';

export type SupportPriority = 'low' | 'medium' | 'high' | 'urgent';

export type SupportStatus = 
  | 'open' 
  | 'in_progress' 
  | 'waiting_customer' 
  | 'resolved' 
  | 'closed';

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  subCategory?: string;
  brand?: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  inventory: number;
  lowStockThreshold: number;
  isActive: boolean;
  views: number;
  clicks: number;
  conversions: number;
  revenue: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryAlert {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  threshold: number;
  alertType: InventoryAlertType;
  status: 'active' | 'resolved';
  createdAt: Date;
  resolvedAt?: Date;
}

export type InventoryAlertType = 'low_stock' | 'out_of_stock' | 'overstock';

export interface BusinessMetric {
  date: string; // YYYY-MM-DD format
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  newCustomers: number;
  returningCustomers: number;
  conversionRate: number;
  cartAbandonmentRate: number;
  refundRate: number;
  customerSatisfactionScore: number;
  supportTicketsCreated: number;
  supportTicketsResolved: number;
  averageResponseTime: number; // minutes
  averageResolutionTime: number; // minutes
  websiteVisitors: number;
  pageViews: number;
  bounceRate: number;
  sessionDuration: number; // seconds
}

// Google Sheets specific types
export interface SheetConfig {
  spreadsheetId: string;
  sheetName: string;
  headers: string[];
}

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsAdded: number;
  recordsUpdated: number;
  errors: string[];
  timestamp: Date;
}

// Notification types
export interface NotificationConfig {
  type: NotificationType;
  enabled: boolean;
  recipients: string[];
  conditions?: NotificationCondition[];
}

export type NotificationType = 
  | 'order_delayed' 
  | 'inventory_low' 
  | 'support_urgent' 
  | 'system_error' 
  | 'daily_report' 
  | 'weekly_report';

export interface NotificationCondition {
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
  value: string | number;
}

// Configuration types
export interface TrackingConfig {
  googleSheets: {
    clientEmail: string;
    privateKey: string;
    projectId: string;
  };
  spreadsheets: {
    orders: string;
    analytics: string;
    support: string;
    inventory: string;
    businessIntelligence: string;
  };
  strapi: {
    apiUrl: string;
    apiToken: string;
  };
  webhook: {
    port: number;
    secret: string;
  };
  email: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
  };
  sync: {
    intervalMinutes: number;
    batchSize: number;
  };
}