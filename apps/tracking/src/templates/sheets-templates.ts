// Google Sheets templates for all tracking spreadsheets

export const ORDERS_TEMPLATE = {
  title: 'Heaven Dolls - Orders Dashboard',
  sheets: [
    {
      title: 'Orders',
      headers: [
        'Order ID',
        'Customer ID',
        'Customer Name',
        'Customer Email',
        'Status',
        'Total Amount',
        'Currency',
        'Payment Method',
        'Shipping Method',
        'Tracking Number',
        'Carrier',
        'Estimated Delivery',
        'Actual Delivery',
        'Items Count',
        'Order Items',
        'Shipping Address',
        'Billing Address',
        'Created At',
        'Updated At',
        'Processing Time (Hours)',
        'Shipping Time (Days)',
        'Notes'
      ]
    },
    {
      title: 'Order Items',
      headers: [
        'Order ID',
        'Product ID',
        'Variant ID',
        'Product Name',
        'SKU',
        'Quantity',
        'Unit Price',
        'Total Price',
        'Image URL',
        'Created At'
      ]
    },
    {
      title: 'Status History',
      headers: [
        'Order ID',
        'Previous Status',
        'New Status',
        'Changed By',
        'Changed At',
        'Notes',
        'Duration in Status (Hours)'
      ]
    },
    {
      title: 'Shipping Updates',
      headers: [
        'Order ID',
        'Tracking Number',
        'Carrier',
        'Status',
        'Location',
        'Update Time',
        'Estimated Delivery',
        'Notes'
      ]
    },
    {
      title: 'Daily Summary',
      headers: [
        'Date',
        'Total Orders',
        'Pending Orders',
        'Processing Orders',
        'Shipped Orders',
        'Delivered Orders',
        'Cancelled Orders',
        'Total Revenue',
        'Average Order Value',
        'Average Processing Time (Hours)',
        'On-Time Delivery Rate (%)'
      ]
    }
  ]
};

export const ANALYTICS_TEMPLATE = {
  title: 'Heaven Dolls - User Analytics',
  sheets: [
    {
      title: 'User Activities',
      headers: [
        'User ID',
        'Session ID',
        'Activity Type',
        'Page',
        'Product ID',
        'Category ID',
        'Search Query',
        'Referrer',
        'User Agent',
        'IP Address',
        'Timestamp',
        'Duration (Seconds)',
        'Device Type',
        'Browser',
        'Country',
        'City'
      ]
    },
    {
      title: 'Conversion Events',
      headers: [
        'User ID',
        'Session ID',
        'Event Type',
        'Value',
        'Currency',
        'Order ID',
        'Product ID',
        'Timestamp',
        'Conversion Path',
        'Days to Convert',
        'Touchpoints'
      ]
    },
    {
      title: 'User Journey',
      headers: [
        'User ID',
        'Session ID',
        'Journey Start',
        'Journey End',
        'Pages Visited',
        'Products Viewed',
        'Categories Browsed',
        'Search Queries',
        'Cart Additions',
        'Checkout Started',
        'Purchase Completed',
        'Session Duration (Minutes)',
        'Bounce Rate',
        'Conversion Type'
      ]
    },
    {
      title: 'Cohort Analysis',
      headers: [
        'Cohort Month',
        'Users',
        'Month 0 Retention',
        'Month 1 Retention',
        'Month 2 Retention',
        'Month 3 Retention',
        'Month 6 Retention',
        'Month 12 Retention',
        'Average Revenue per User',
        'Total Revenue'
      ]
    },
    {
      title: 'Funnel Analysis',
      headers: [
        'Date',
        'Visitors',
        'Product Views',
        'Cart Additions',
        'Checkout Started',
        'Purchases',
        'Visitor to Product Rate (%)',
        'Product to Cart Rate (%)',
        'Cart to Checkout Rate (%)',
        'Checkout to Purchase Rate (%)',
        'Overall Conversion Rate (%)'
      ]
    }
  ]
};

export const SUPPORT_TEMPLATE = {
  title: 'Heaven Dolls - Customer Support',
  sheets: [
    {
      title: 'Support Tickets',
      headers: [
        'Ticket ID',
        'Customer ID',
        'Customer Name',
        'Customer Email',
        'Subject',
        'Description',
        'Category',
        'Priority',
        'Status',
        'Assigned To',
        'Order ID',
        'Created At',
        'Updated At',
        'First Response At',
        'Resolved At',
        'Response Time (Minutes)',
        'Resolution Time (Minutes)',
        'Satisfaction Score',
        'Tags',
        'Notes'
      ]
    },
    {
      title: 'Ticket Updates',
      headers: [
        'Ticket ID',
        'Update Type',
        'Previous Status',
        'New Status',
        'Updated By',
        'Update Time',
        'Message',
        'Internal Note',
        'Customer Visible'
      ]
    },
    {
      title: 'Agent Performance',
      headers: [
        'Agent Name',
        'Agent Email',
        'Date',
        'Tickets Assigned',
        'Tickets Resolved',
        'Average Response Time (Minutes)',
        'Average Resolution Time (Minutes)',
        'Customer Satisfaction Score',
        'Escalated Tickets',
        'Active Tickets'
      ]
    },
    {
      title: 'Category Analysis',
      headers: [
        'Category',
        'Date',
        'Tickets Created',
        'Tickets Resolved',
        'Average Resolution Time (Hours)',
        'Customer Satisfaction Score',
        'Escalation Rate (%)',
        'Common Issues'
      ]
    },
    {
      title: 'Daily Metrics',
      headers: [
        'Date',
        'Tickets Created',
        'Tickets Resolved',
        'Tickets Pending',
        'Average Response Time (Minutes)',
        'Average Resolution Time (Hours)',
        'Customer Satisfaction Score',
        'SLA Compliance (%)',
        'Escalation Rate (%)'
      ]
    }
  ]
};

export const INVENTORY_TEMPLATE = {
  title: 'Heaven Dolls - Inventory Management',
  sheets: [
    {
      title: 'Product Inventory',
      headers: [
        'Product ID',
        'Product Name',
        'SKU',
        'Category',
        'Sub Category',
        'Brand',
        'Current Stock',
        'Low Stock Threshold',
        'Reorder Point',
        'Reorder Quantity',
        'Cost Price',
        'Selling Price',
        'Compare At Price',
        'Supplier',
        'Last Restocked',
        'Stock Status',
        'Days of Inventory',
        'Turnover Rate'
      ]
    },
    {
      title: 'Stock Movements',
      headers: [
        'Product ID',
        'SKU',
        'Movement Type',
        'Quantity',
        'Previous Stock',
        'New Stock',
        'Reason',
        'Order ID',
        'Reference',
        'Moved By',
        'Movement Date',
        'Cost Impact',
        'Notes'
      ]
    },
    {
      title: 'Low Stock Alerts',
      headers: [
        'Alert ID',
        'Product ID',
        'Product Name',
        'SKU',
        'Current Stock',
        'Threshold',
        'Alert Type',
        'Status',
        'Created At',
        'Resolved At',
        'Days Low Stock',
        'Lost Sales Estimate'
      ]
    },
    {
      title: 'Supplier Performance',
      headers: [
        'Supplier Name',
        'Contact Email',
        'Products Count',
        'Average Lead Time (Days)',
        'On-Time Delivery Rate (%)',
        'Quality Score',
        'Last Order Date',
        'Total Orders',
        'Average Order Value',
        'Payment Terms'
      ]
    },
    {
      title: 'Forecasting',
      headers: [
        'Product ID',
        'Product Name',
        'SKU',
        'Current Stock',
        'Average Daily Sales',
        'Days of Inventory Remaining',
        'Predicted Stock Out Date',
        'Recommended Reorder Quantity',
        'Seasonal Factor',
        'Trend Factor',
        'Safety Stock'
      ]
    }
  ]
};

export const BUSINESS_INTELLIGENCE_TEMPLATE = {
  title: 'Heaven Dolls - Business Intelligence',
  sheets: [
    {
      title: 'KPI Dashboard',
      headers: [
        'Date',
        'Total Revenue',
        'Total Orders',
        'Average Order Value',
        'Gross Profit Margin (%)',
        'Customer Acquisition Cost',
        'Customer Lifetime Value',
        'Conversion Rate (%)',
        'Cart Abandonment Rate (%)',
        'Return Rate (%)',
        'Customer Satisfaction Score',
        'Net Promoter Score',
        'Website Visitors',
        'New Customers',
        'Returning Customers'
      ]
    },
    {
      title: 'Product Performance',
      headers: [
        'Product ID',
        'Product Name',
        'SKU',
        'Category',
        'Views',
        'Clicks',
        'Add to Cart',
        'Purchases',
        'Revenue',
        'Units Sold',
        'Conversion Rate (%)',
        'Revenue per View',
        'Return Rate (%)',
        'Customer Rating',
        'Inventory Turnover'
      ]
    },
    {
      title: 'Customer Segments',
      headers: [
        'Segment Name',
        'Customer Count',
        'Average Order Value',
        'Purchase Frequency',
        'Customer Lifetime Value',
        'Churn Rate (%)',
        'Revenue Contribution (%)',
        'Preferred Categories',
        'Average Session Duration',
        'Customer Satisfaction Score'
      ]
    },
    {
      title: 'Channel Performance',
      headers: [
        'Channel',
        'Date',
        'Sessions',
        'Users',
        'Bounce Rate (%)',
        'Average Session Duration',
        'Pages per Session',
        'Conversion Rate (%)',
        'Revenue',
        'Cost per Acquisition',
        'Return on Ad Spend',
        'Customer Lifetime Value'
      ]
    },
    {
      title: 'Financial Summary',
      headers: [
        'Date',
        'Gross Revenue',
        'Refunds',
        'Net Revenue',
        'Cost of Goods Sold',
        'Gross Profit',
        'Operating Expenses',
        'Marketing Costs',
        'Shipping Costs',
        'Payment Processing Fees',
        'Net Profit',
        'Profit Margin (%)',
        'Cash Flow'
      ]
    },
    {
      title: 'Growth Metrics',
      headers: [
        'Date',
        'Revenue Growth Rate (%)',
        'Customer Growth Rate (%)',
        'Order Growth Rate (%)',
        'Average Order Value Growth (%)',
        'Market Share',
        'Customer Retention Rate (%)',
        'Monthly Recurring Revenue',
        'Churn Rate (%)',
        'Expansion Revenue',
        'Net Revenue Retention (%)'
      ]
    }
  ]
};

// Helper function to get template by type
export function getTemplate(type: 'orders' | 'analytics' | 'support' | 'inventory' | 'business-intelligence') {
  switch (type) {
    case 'orders':
      return ORDERS_TEMPLATE;
    case 'analytics':
      return ANALYTICS_TEMPLATE;
    case 'support':
      return SUPPORT_TEMPLATE;
    case 'inventory':
      return INVENTORY_TEMPLATE;
    case 'business-intelligence':
      return BUSINESS_INTELLIGENCE_TEMPLATE;
    default:
      throw new Error(`Unknown template type: ${type}`);
  }
}