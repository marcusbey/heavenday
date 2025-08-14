# Heaven Dolls - Automated Data Sourcing & Trend Analysis

This automation service provides comprehensive trend analysis and product sourcing for the Heaven Dolls marketplace, focusing on adult wellness products.

## 🚀 Features

### 📈 Trend Analysis
- **Google Trends Integration**: Real-time trend monitoring for adult product keywords
- **Social Media Trends**: TikTok and Instagram hashtag analysis
- **Geographic Insights**: Regional trend analysis for targeted marketing
- **Automated Scoring**: AI-powered trend score calculation

### 🛒 Product Scraping
- **Amazon Product Discovery**: Automated best-seller and keyword-based product discovery
- **Multi-platform Support**: Extensible architecture for additional marketplaces
- **Quality Filtering**: Automated product quality and appropriateness filtering
- **Image Processing**: Automatic image download and optimization

### ⏰ Scheduling & Automation
- **Daily Trend Analysis**: Automated daily trend monitoring (8 AM EST)
- **Product Scraping**: Scheduled product discovery (10 AM EST)  
- **Social Media Monitoring**: Regular social trend analysis (12 PM EST)
- **Data Cleanup**: Weekly maintenance and archival (Sunday 2 AM EST)

### 🔗 CMS Integration
- **Automatic Product Creation**: Direct integration with CMS for product listings
- **SEO Optimization**: Automatic meta tags and descriptions
- **Image Processing**: Multi-size image generation and optimization
- **Content Enhancement**: AI-enhanced product descriptions

### 🔔 Monitoring & Notifications
- **Webhook Notifications**: Real-time status updates via Slack/Discord
- **Error Alerting**: Automatic error detection and reporting
- **Health Monitoring**: System health checks every 15 minutes
- **Daily Summaries**: Comprehensive daily automation reports

## 🛠️ Installation

### Prerequisites
- Node.js 18+ 
- TypeScript 5+
- Chrome/Chromium (for web scraping)

### Setup
```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Build the project
npm run build

# Run tests
npm test
```

### Environment Configuration

Create a `.env` file with the following configuration:

```env
# Google APIs
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=your_cse_id_here

# Social Media APIs  
INSTAGRAM_USERNAME=your_instagram_username
INSTAGRAM_PASSWORD=your_instagram_password
TIKTOK_SESSION_ID=your_tiktok_session_id

# CMS Integration
CMS_API_URL=http://localhost:3000/api
CMS_API_KEY=your_cms_api_key

# Rate Limiting
REQUESTS_PER_MINUTE=30
SCRAPING_DELAY_MS=2000

# Filtering
MIN_TREND_SCORE=50
MAX_PRODUCTS_PER_TREND=20

# Notifications
WEBHOOK_URL=your_webhook_url_for_notifications

# Scheduling
TRENDS_CRON_SCHEDULE=0 8 * * *
SCRAPING_CRON_SCHEDULE=0 10 * * *
```

## 🚦 Usage

### Command Line Interface

```bash
# Run full automation pipeline once
npm run pipeline:full

# Start scheduled automation service
npm run scheduler:start

# Run specific components
npm run trends:google
npm run scrape:amazon  
npm run trends:social

# Check service status
node dist/index.js status
```

### Programmatic Usage

```typescript
import { runAutomation, startScheduler } from './src/index';

// Run pipeline once
const results = await runAutomation();
console.log(`Found ${results.productOpportunities.length} products`);

// Start scheduler
startScheduler();
```

## 📊 Data Flow

```
Google Trends API → Trend Analysis
        ↓
Social Media APIs → Social Trend Analysis  
        ↓
Amazon Scraping → Product Discovery
        ↓
Quality Filtering → Product Validation
        ↓
CMS Integration → Product Listings
        ↓
Notifications → Status Updates
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --testPathPattern=trends
npm test -- --testPathPattern=scraping
npm test -- --testPathPattern=scheduler

# Run tests with coverage
npm test -- --coverage

# Watch mode for development
npm run test:watch
```

## 🔧 Configuration

### Trend Analysis Settings

```typescript
const trendConfig = {
  minTrendScore: 50,        // Minimum score to consider trending
  maxProductsPerTrend: 20,  // Max products to scrape per trend
  geoTargeting: 'US',       // Geographic focus
  timeframe: 'today 1-m'    // Trend analysis timeframe
};
```

### Scraping Configuration

```typescript  
const scrapingConfig = {
  headless: true,           // Run browser in headless mode
  maxProducts: 50,          // Max products per keyword
  delayBetweenRequests: 3000, // Rate limiting delay
  timeout: 30000            // Request timeout
};
```

### CMS Integration

```typescript
const cmsConfig = {
  apiUrl: 'https://cms.heavendolls.com/api',
  autoPublish: false,       // Auto-publish high-score products
  imageOptimization: true,  // Process and optimize images
  seoGeneration: true       // Generate SEO metadata
};
```

## 📈 Monitoring & Analytics

### Health Endpoints

```bash
GET /health              # System health check
GET /status              # Detailed status information  
GET /metrics             # Performance metrics
```

### Log Files

- `logs/automation.log` - General automation logs
- `logs/error.log` - Error logs only
- `reports/trends/` - Daily trend analysis reports
- `reports/products/` - Product scraping reports

### Metrics Tracked

- **Trend Analysis**: Keywords found, average scores, processing time
- **Product Scraping**: Success rate, products processed, image downloads
- **CMS Integration**: Products created, success rate, errors
- **System Health**: Memory usage, response times, error rates

## 🚨 Error Handling

### Automatic Recovery
- **API Rate Limits**: Automatic backoff and retry
- **Network Errors**: Exponential backoff with jitter
- **Browser Crashes**: Automatic browser restart
- **Memory Leaks**: Periodic cleanup and monitoring

### Error Notifications
- **Critical Errors**: Immediate webhook notifications
- **API Failures**: Detailed error context and retry attempts
- **Data Quality Issues**: Validation errors and data cleanup

## 🔒 Security & Privacy

### Data Protection
- **No Personal Data**: Only public product and trend information
- **Secure API Keys**: Environment variable storage
- **Rate Limiting**: Respectful API usage
- **Content Filtering**: Appropriate content validation

### Compliance
- **Robots.txt Compliance**: Respects website scraping policies
- **API Terms of Service**: Follows platform guidelines
- **Privacy Regulations**: GDPR and CCPA compliant data handling

## 🚀 Deployment

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
CMD ["npm", "start"]
```

### Production Considerations

- **Load Balancing**: Multiple instance support
- **Database Scaling**: Optimized queries and indexing
- **Caching**: Redis for trend data caching
- **Monitoring**: Prometheus and Grafana integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For technical support or questions:
- **Email**: tech@heavendolls.com
- **Slack**: #automation-support
- **Documentation**: https://docs.heavendolls.com/automation

---

**⚠️ Important**: This automation system handles adult wellness products. Ensure compliance with local regulations and platform policies when deploying.