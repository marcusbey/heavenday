# Heaven Dolls Tracking System

A comprehensive tracking and analytics system with Google Sheets integration for the Heaven Dolls marketplace. This system provides real-time order lifecycle tracking, user journey analytics, customer support management, and business intelligence dashboards.

## Features

### 🔄 Order Lifecycle Tracking
- Complete order journey from "received" to "delivered"
- Real-time status updates: pending, processing, shipped, out for delivery, delivered
- Customer information and order details logging
- Shipping information and delivery estimates
- Order modifications and cancellations tracking

### 📊 User Journey Analytics
- User interaction tracking: page views, product views, cart additions
- Conversion funnel monitoring: visitors → leads → customers
- Search queries and product filtering behavior
- User engagement metrics and session data
- Cohort analysis and retention tracking

### 🎧 Customer Support Integration
- Customer inquiries, complaints, and support tickets logging
- Response times and resolution status tracking
- Customer satisfaction scores and feedback monitoring
- Dispute tracking and resolution workflow
- Automated alerts for urgent issues

### 📈 Business Intelligence Dashboard
- Comprehensive analytics dashboard in Google Sheets
- Automated charts and pivot tables
- Key Performance Indicators (KPIs) tracking
- Inventory levels and restocking alerts
- Automated reports and insights generation

### 🤖 Automation & Notifications
- Automated data updates using Google Apps Script
- Webhook handlers for real-time updates
- Email notifications for critical events
- Data validation and error handling
- Scheduled reports and summaries

## Google Sheets Templates

The system creates and manages five main spreadsheets:

1. **Orders Dashboard** - Complete order lifecycle tracking
2. **User Analytics** - Customer behavior and engagement metrics
3. **Customer Support** - Tickets, inquiries, and resolutions
4. **Inventory Management** - Stock levels and restocking alerts
5. **Business Intelligence** - KPIs, metrics, and insights

## Setup Instructions

### 1. Google Sheets API Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API and Google Drive API
4. Create a service account:
   - Go to "IAM & Admin" → "Service Accounts"
   - Click "Create Service Account"
   - Fill in the details and create
   - Generate a JSON key file
5. Copy the service account email and private key to your `.env` file

### 2. Environment Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in all required environment variables:
   - Google API credentials
   - Spreadsheet IDs (will be generated during setup)
   - Strapi CMS configuration
   - Email settings
   - Other service configurations

### 3. Installation

```bash
# Install dependencies
npm install

# Initialize Google Sheets templates
npm run sheets:setup

# Build the project
npm run build
```

### 4. Development

```bash
# Start development server
npm run dev

# Start webhook server
npm run webhook:start

# Sync data manually
npm run sheets:sync
```

### 5. Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm test:watch
```

## Architecture

```
src/
├── config/           # Configuration management
├── services/         # Core business logic services
├── sheets/          # Google Sheets integration
├── webhooks/        # Webhook handlers
├── tracking/        # Tracking implementations
├── notifications/   # Email and alert systems
├── automation/      # Google Apps Script automation
├── templates/       # Spreadsheet templates
├── utils/          # Utility functions
└── types/          # TypeScript type definitions
```

## Usage Examples

### Order Tracking

```typescript
import { OrderTracker } from './src/tracking/order-tracker';

const tracker = new OrderTracker();

// Track new order
await tracker.trackOrder({
  orderId: 'ORD-123',
  customerId: 'CUST-456',
  status: 'pending',
  items: [/* order items */],
  totalAmount: 99.99,
  timestamp: new Date()
});

// Update order status
await tracker.updateOrderStatus('ORD-123', 'shipped', {
  trackingNumber: 'TRACK-789',
  carrier: 'UPS',
  estimatedDelivery: new Date('2024-01-15')
});
```

### User Journey Analytics

```typescript
import { UserJourneyTracker } from './src/tracking/user-journey-tracker';

const journeyTracker = new UserJourneyTracker();

// Track page view
await journeyTracker.trackPageView({
  userId: 'USER-123',
  page: '/products/luxury-doll-collection',
  timestamp: new Date(),
  sessionId: 'SESSION-456',
  referrer: 'https://google.com'
});

// Track conversion event
await journeyTracker.trackConversion({
  userId: 'USER-123',
  type: 'purchase',
  value: 199.99,
  orderId: 'ORD-789'
});
```

### Customer Support

```typescript
import { SupportTracker } from './src/tracking/support-tracker';

const supportTracker = new SupportTracker();

// Create support ticket
await supportTracker.createTicket({
  customerId: 'CUST-123',
  subject: 'Order delivery issue',
  priority: 'high',
  category: 'shipping',
  description: 'Order not received after 2 weeks'
});
```

## API Endpoints

The webhook server provides the following endpoints:

- `POST /webhooks/order` - Order status updates
- `POST /webhooks/payment` - Payment notifications
- `POST /webhooks/shipping` - Shipping updates
- `POST /webhooks/user` - User activity tracking
- `GET /health` - Health check endpoint

## Monitoring and Alerts

The system includes comprehensive monitoring:

- **Order Alerts**: Delayed shipments, delivery issues
- **Inventory Alerts**: Low stock, out of stock items
- **Support Alerts**: High priority tickets, SLA breaches
- **System Alerts**: API failures, sync issues

## Security

- Service account authentication for Google APIs
- Webhook signature verification
- Input validation and sanitization
- Rate limiting and error handling
- Secure environment variable management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

MIT License - see LICENSE file for details