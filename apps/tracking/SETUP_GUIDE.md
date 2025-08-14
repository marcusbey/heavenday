# Heaven Dolls Tracking System - Setup Guide

This comprehensive guide will help you set up the Heaven Dolls tracking system with Google Sheets integration.

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Google Cloud Platform account
- Gmail account for SMTP notifications
- Strapi CMS running (optional, for full integration)

## Step 1: Google Cloud Platform Setup

### 1.1 Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "New Project" and create a project named "heaven-dolls-tracking"
3. Note your project ID

### 1.2 Enable APIs

1. Navigate to "APIs & Services" > "Library"
2. Enable the following APIs:
   - Google Sheets API
   - Google Drive API

### 1.3 Create Service Account

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in the details:
   - Name: `heaven-dolls-tracking`
   - ID: `heaven-dolls-tracking`
4. Grant the service account the "Editor" role
5. Click "Done"

### 1.4 Generate Service Account Key

1. Click on the created service account
2. Go to "Keys" tab
3. Click "Add Key" > "Create New Key"
4. Choose "JSON" format
5. Download the key file securely

## Step 2: Environment Configuration

### 2.1 Copy Environment Template

```bash
cd apps/tracking
cp .env.example .env
```

### 2.2 Configure Google API Credentials

From your downloaded JSON key file, extract:
- `client_email`: Copy to `GOOGLE_CLIENT_EMAIL`
- `private_key`: Copy to `GOOGLE_PRIVATE_KEY` (keep the quotes and newlines)
- `project_id`: Copy to `GOOGLE_PROJECT_ID`

### 2.3 Configure SMTP Settings

For Gmail SMTP:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-password
NOTIFICATION_EMAIL=notifications@heaven-dolls.com
```

**Note**: Use an [App Password](https://support.google.com/accounts/answer/185833) instead of your regular Gmail password.

### 2.4 Configure Other Settings

```env
# Webhook Configuration
WEBHOOK_PORT=3001
WEBHOOK_SECRET=your-secure-secret-key

# Strapi Configuration (if using)
STRAPI_API_URL=http://localhost:1337/api
STRAPI_API_TOKEN=your-strapi-token

# Application Settings
NODE_ENV=development
LOG_LEVEL=info
TRACKING_ENABLED=true
SYNC_INTERVAL_MINUTES=5
```

## Step 3: Installation and Setup

### 3.1 Install Dependencies

```bash
npm install
```

### 3.2 Initialize Google Sheets

```bash
npm run sheets:setup
```

This command will:
- Create all required Google Sheets spreadsheets
- Set up headers, formatting, and data validation
- Display spreadsheet IDs for your .env file

### 3.3 Update Environment with Spreadsheet IDs

Copy the generated spreadsheet IDs to your `.env` file:
```env
ORDERS_SPREADSHEET_ID=your-orders-spreadsheet-id
ANALYTICS_SPREADSHEET_ID=your-analytics-spreadsheet-id
SUPPORT_SPREADSHEET_ID=your-support-spreadsheet-id
INVENTORY_SPREADSHEET_ID=your-inventory-spreadsheet-id
BUSINESS_INTELLIGENCE_SPREADSHEET_ID=your-bi-spreadsheet-id
```

### 3.4 Build the Project

```bash
npm run build
```

## Step 4: Testing the Setup

### 4.1 Test Data Sync

```bash
npm run sheets:sync
```

This will test all connections and sync any existing data.

### 4.2 Start Development Server

```bash
npm run dev
```

### 4.3 Test Webhook Server

In a separate terminal:
```bash
npm run webhook:start
```

The webhook server will start on the configured port (default: 3001).

## Step 5: Production Deployment

### 5.1 Environment Variables

Set all environment variables in your production environment:

```bash
# Google Sheets API
export GOOGLE_CLIENT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
export GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"
export GOOGLE_PROJECT_ID="your-project-id"

# Spreadsheet IDs
export ORDERS_SPREADSHEET_ID="your-orders-id"
export ANALYTICS_SPREADSHEET_ID="your-analytics-id"
export SUPPORT_SPREADSHEET_ID="your-support-id"
export INVENTORY_SPREADSHEET_ID="your-inventory-id"
export BUSINESS_INTELLIGENCE_SPREADSHEET_ID="your-bi-id"

# SMTP Configuration
export SMTP_HOST="smtp.gmail.com"
export SMTP_PORT=587
export SMTP_USER="your-email@gmail.com"
export SMTP_PASS="your-app-password"
export NOTIFICATION_EMAIL="notifications@heaven-dolls.com"

# Application Configuration
export NODE_ENV="production"
export WEBHOOK_PORT=3001
export WEBHOOK_SECRET="your-production-secret"
export STRAPI_API_URL="https://your-domain.com/api"
export STRAPI_API_TOKEN="your-production-token"
```

### 5.2 Build and Start

```bash
npm run build
npm start
```

### 5.3 Process Management (Optional)

Use PM2 for production process management:

```bash
npm install -g pm2
pm2 start dist/index.js --name "heaven-dolls-tracking"
pm2 startup
pm2 save
```

## Step 6: Integration with Frontend

### 6.1 User Activity Tracking

Add this to your frontend to track user activities:

```javascript
// Track page views
fetch('http://localhost:3001/webhooks/user', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    sessionId: 'session-456',
    type: 'page_view',
    page: '/products/luxury-collection',
    timestamp: new Date().toISOString()
  })
});

// Track product views
fetch('http://localhost:3001/webhooks/user', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    sessionId: 'session-456',
    type: 'product_view',
    productId: 'product-789',
    timestamp: new Date().toISOString()
  })
});
```

### 6.2 Order Tracking Integration

Configure your payment system to send webhooks:

```bash
# Example webhook endpoint
POST http://your-domain.com/webhooks/order
```

## Step 7: Strapi CMS Integration

### 7.1 Configure Strapi Webhooks

In your Strapi admin panel:

1. Go to Settings > Webhooks
2. Create webhooks for:
   - Orders: `http://your-domain.com/webhooks/strapi/order`
   - Products: `http://your-domain.com/webhooks/strapi/product`
3. Select relevant events (create, update, delete)

### 7.2 API Token Setup

1. Go to Settings > API Tokens
2. Create a new token with appropriate permissions
3. Add the token to your `.env` file

## Step 8: Team Access and Permissions

### 8.1 Share Google Sheets

1. Open each spreadsheet in Google Sheets
2. Click "Share" button
3. Add team members with appropriate permissions:
   - **View only**: For general staff
   - **Edit**: For managers and analysts
   - **Owner**: Transfer to main account if needed

### 8.2 Set Up Email Notifications

Configure email recipients in the code or via environment variables:
- Operations team: `operations@heaven-dolls.com`
- Management: `management@heaven-dolls.com`
- Technical team: `tech@heaven-dolls.com`

## Troubleshooting

### Common Issues

**1. Authentication Errors**
- Verify your service account key is correct
- Ensure the service account has proper permissions
- Check that APIs are enabled in Google Cloud Console

**2. Spreadsheet Creation Fails**
- Verify your Google account has sufficient storage
- Check if the service account has Drive API access
- Ensure you're not hitting API rate limits

**3. Email Notifications Not Working**
- Verify SMTP credentials
- Use an App Password for Gmail
- Check firewall rules for SMTP ports

**4. Webhook Signature Verification Fails**
- Ensure webhook secret matches in both systems
- Check that the signature is being sent correctly
- Verify the signature format (sha256= prefix)

### Debug Mode

Enable debug logging:
```env
LOG_LEVEL=debug
```

### Health Checks

Monitor system health:
```bash
curl http://localhost:3001/health
```

## Maintenance

### Regular Tasks

1. **Weekly**: Review Google Sheets for data accuracy
2. **Monthly**: Check storage usage and clean up old data
3. **Quarterly**: Review and update notification recipients

### Monitoring

Monitor these metrics:
- Sync success rates
- API response times
- Error rates in logs
- Email delivery rates

### Backup

Google Sheets provides automatic version history, but consider:
- Regular exports to CSV/Excel
- Database backups if using local storage
- Configuration backup (.env files)

## Support

For issues and questions:
1. Check the logs first: `tail -f logs/combined.log`
2. Review this documentation
3. Check Google Cloud Console for API quotas and errors
4. Contact the development team

## Security Considerations

1. **Never commit `.env` files** to version control
2. **Rotate service account keys** regularly
3. **Use strong webhook secrets**
4. **Monitor API usage** for suspicious activity
5. **Keep dependencies updated**
6. **Use HTTPS** in production
7. **Implement proper access controls** on Google Sheets

## Next Steps

After successful setup:
1. Configure custom dashboards in Google Sheets
2. Set up additional integrations (payment gateways, shipping providers)
3. Customize notification templates
4. Add custom business logic for your specific needs
5. Set up monitoring and alerting for production systems