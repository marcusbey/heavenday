# Heaven Dolls CMS

A comprehensive Strapi-based Content Management System for the Heaven Dolls marketplace, designed to handle product management, automation integration, and advanced e-commerce features.

## Features

### Core CMS Functionality
- **Product Management**: Comprehensive product schema with variants, specifications, and media
- **Category Hierarchy**: Multi-level category system with filters and SEO optimization
- **Brand Management**: Brand profiles with social media integration and analytics
- **Review System**: Customer reviews with moderation, sentiment analysis, and helpfulness tracking
- **Media Management**: Optimized image handling with automatic thumbnails and CDN integration

### Automation Integration
- **Pipeline Integration**: Seamless connection with data sourcing automation
- **Bulk Operations**: Import/export functionality for large datasets
- **Trending Analysis**: Automated trending score calculation based on multiple metrics
- **SEO Generation**: Automatic SEO content generation for products and categories

### Advanced Features
- **Multi-language Support**: I18n support for global marketplace
- **GraphQL API**: Advanced querying capabilities alongside REST API
- **Webhook System**: Real-time notifications to external services
- **Cron Jobs**: Automated maintenance and data updates
- **Admin Customization**: Custom admin interface tailored for marketplace needs

## Installation

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- Redis (optional, for caching)

### Setup

1. **Install dependencies**:
   ```bash
   cd apps/cms
   npm install
   ```

2. **Environment Configuration**:
   Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```

   Key environment variables:
   ```env
   # Database
   DATABASE_URL=postgresql://user:password@localhost:5432/heaven_dolls_cms
   
   # Security
   APP_KEYS=your_app_keys_here
   ADMIN_JWT_SECRET=your_admin_jwt_secret
   API_TOKEN_SALT=your_api_token_salt
   
   # Upload (AWS S3)
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_ACCESS_SECRET=your_aws_secret
   AWS_REGION=us-east-1
   AWS_BUCKET=your_bucket_name
   ```

3. **Database Setup**:
   ```bash
   npm run strapi build
   npm run develop
   ```

4. **Create Admin User**:
   Navigate to `http://localhost:1337/admin` and create your first admin user.

## Content Models

### Product Schema
Comprehensive product model with:
- Basic information (name, description, price, SKU)
- Media (images, videos, 360° views)
- Variants (size, color, material options)
- SEO metadata
- Trending analytics
- Inventory tracking
- Shipping information

### Category Schema
Hierarchical category system with:
- Parent/child relationships
- Custom filters for products
- SEO optimization
- Product counts
- Navigation controls

### Brand Schema
Brand management with:
- Company information
- Social media links
- Product portfolio
- Analytics and ratings

### Review Schema
Customer review system with:
- Rating and comments
- Image/video attachments
- Moderation workflow
- Helpfulness voting
- Sentiment analysis

## API Endpoints

### Products API
- `GET /api/products` - List products with filtering
- `GET /api/products/:id` - Get single product
- `GET /api/products/search?q=term` - Search products
- `GET /api/products/trending` - Get trending products
- `GET /api/products/featured` - Get featured products
- `POST /api/products/bulk-create` - Bulk import products

### Categories API
- `GET /api/categories` - List categories
- `GET /api/categories/tree` - Get category hierarchy
- `GET /api/categories/featured` - Get featured categories

### Reviews API
- `GET /api/reviews/product/:id` - Get product reviews
- `GET /api/reviews/product/:id/stats` - Get review statistics
- `PUT /api/reviews/:id/helpful` - Mark review as helpful

### Automation API
- `POST /api/automation/webhook` - Automation pipeline webhook
- `POST /api/automation/bulk-import-products` - Bulk import
- `GET /api/automation/status` - Get automation statistics
- `POST /api/automation/trigger-trend-analysis` - Trigger trending analysis

## Automation Integration

The CMS integrates seamlessly with the automation pipeline through:

### Webhook Endpoints
- Product data ingestion from scrapers
- Trending data updates
- Review imports from external sources
- Category and brand synchronization

### Data Processing
- Automatic slug generation
- Image optimization and thumbnails
- SEO content generation
- Trending score calculation

### Scheduled Jobs
- Hourly trending score updates
- Daily SEO content generation
- Weekly data cleanup
- Product count synchronization

## Admin Customization

### Custom Dashboard
- Marketplace analytics overview
- Trending products monitoring
- Review moderation queue
- Automation pipeline status

### Enhanced List Views
- Custom table headers for each model
- Advanced filtering options
- Bulk operation capabilities
- Export functionality

### Media Management
- Automatic image optimization
- Thumbnail generation
- Bulk media operations
- CDN integration

## Development

### Project Structure
```
apps/cms/
├── config/           # Strapi configuration
├── src/
│   ├── api/         # API routes, controllers, services
│   ├── components/  # Reusable components
│   ├── extensions/  # Plugin extensions
│   ├── plugins/     # Custom plugins
│   └── admin/       # Admin customizations
├── public/          # Static files
└── data/           # Export/import data
```

### Custom Services
- **Product Service**: Advanced product operations
- **Automation Service**: Pipeline integration logic
- **Media Optimization**: Image processing
- **SEO Generation**: Automated content creation

### Lifecycle Hooks
- Automatic rating calculations
- Product count updates
- Trending score maintenance
- Stock status management

## Deployment

### Production Environment

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Database Migration**:
   ```bash
   npm run strapi deploy
   ```

3. **Environment Variables**:
   Set production environment variables for:
   - Database connection
   - AWS S3 credentials
   - Webhook URLs
   - API keys

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 1337
CMD ["npm", "start"]
```

## API Documentation

Full API documentation is available at `/documentation` when the documentation plugin is enabled.

### Authentication
Most endpoints require authentication via:
- JWT tokens for API access
- Admin session for admin operations
- API tokens for automation

### Rate Limiting
- 100 requests per minute for authenticated users
- 20 requests per minute for public endpoints
- Higher limits for automation webhooks

## Monitoring and Logging

### Health Checks
- `/api/webhooks/health` - System health status
- Database connectivity monitoring
- External service integration status

### Logging
- Structured logging with levels (error, warn, info, debug)
- Automation event tracking
- Performance monitoring
- Error alerting

## Security

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF tokens

### Access Control
- Role-based permissions
- API token management
- Webhook signature verification
- Rate limiting

## Support and Maintenance

### Regular Tasks
- Database optimization
- Image cleanup
- Cache management
- Security updates

### Backup Strategy
- Daily database backups
- Media file synchronization
- Configuration backups
- Disaster recovery procedures

## Contributing

### Development Guidelines
- TypeScript for all new code
- Comprehensive error handling
- Unit tests for services
- Documentation updates

### Code Style
- ESLint configuration
- Prettier formatting
- Consistent naming conventions
- API versioning strategy

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

For support and questions:
- Email: dev@heaven-dolls.com
- Documentation: https://docs.heaven-dolls.com
- Issues: GitHub Issues