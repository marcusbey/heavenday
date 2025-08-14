# Integration Tests

Comprehensive integration testing suite for the Heaven Dolls marketplace, ensuring seamless operation across all systems.

## Overview

This test suite validates cross-system communication, data flows, and service interactions to ensure zero integration failures in production.

## Test Categories

### 1. Frontend ↔ CMS Integration (`frontend-cms.integration.test.ts`)
- tRPC API calls from Next.js to Strapi
- Product data fetching with complex queries
- Real-time updates and cache invalidation
- Authentication flow between systems
- Error handling for CMS downtime
- Image/media loading from CMS CDN

### 2. Automation ↔ CMS Integration (`automation-cms.integration.test.ts`)
- Automated product creation from scraped data
- Webhook data ingestion and processing
- Bulk product updates and modifications
- Media upload and processing pipeline
- SEO content generation and publishing
- Error handling for malformed automation data

### 3. Tracking ↔ All Systems Integration (`tracking-systems.integration.test.ts`)
- Google Sheets integration with order data
- User journey tracking across all touchpoints
- Webhook delivery from multiple sources
- Data synchronization accuracy and timing
- Analytics pipeline and reporting
- Notification system integration

### 4. Database Integration (`database.integration.test.ts`)
- Prisma ORM across all applications
- Database transaction consistency
- Concurrent data access patterns
- Data migration and schema updates
- Backup and recovery procedures
- Connection pooling and performance

### 5. End-to-End Data Flow (`end-to-end-flows.integration.test.ts`)
- Complete product journey from scraping to display
- User order lifecycle from cart to fulfillment tracking
- Inventory management across all systems
- Customer support workflow integration
- Analytics data collection and reporting

### 6. Performance Integration (`performance.integration.test.ts`)
- System performance under concurrent load
- Database query optimization across services
- API response time under load
- Memory usage across service boundaries
- Network latency and timeout handling

### 7. Error Handling and Recovery (`error-handling.integration.test.ts`)
- Graceful degradation when services are down
- Retry mechanisms and circuit breakers
- Error logging and alerting across systems
- Data consistency during partial failures
- Rollback procedures for failed operations

### 8. Security Integration (`security.integration.test.ts`)
- Authentication tokens across service boundaries
- API security and input validation
- SSL/TLS certificate validation
- Sensitive data encryption in transit
- Webhook signature verification
- CORS configuration and security headers

## Prerequisites

### System Requirements
- Node.js 18+
- Docker and Docker Compose
- Chrome/Chromium (for Selenium tests)
- 8GB+ RAM (for running all services)
- 10GB+ disk space

### Environment Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Setup Environment Variables**
   ```bash
   cp .env.example .env.test
   # Edit .env.test with test-specific values
   ```

3. **Google Sheets Test Setup**
   ```bash
   # Create test service account key
   cp test-service-account.json.example test-service-account.json
   # Add your test Google Sheets credentials
   ```

## Running Tests

### Quick Start
```bash
# Setup and run all integration tests
npm run setup
npm test
npm run cleanup
```

### Individual Test Suites
```bash
# Frontend ↔ CMS integration
npm run test:frontend-cms

# Automation ↔ CMS integration
npm run test:automation-cms

# Tracking system integration
npm run test:tracking

# Database integration
npm run test:database

# End-to-end data flows
npm run test:e2e-flows

# Performance tests
npm run test:performance

# Security tests
npm run test:security

# Error handling tests
npm run test:error-handling
```

### Docker Management
```bash
# Start all services
npm run docker:up

# View logs
npm run docker:logs

# Stop all services
npm run docker:down
```

### Coverage Reports
```bash
# Run tests with coverage
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

## Test Environment

### Docker Services
- **PostgreSQL** (port 5433) - Test database
- **Redis** (port 6380) - Caching and sessions
- **CMS** (port 1338) - Strapi CMS
- **Web** (port 3001) - Next.js frontend
- **Automation** (port 3002) - Automation service
- **Tracking** (port 3003) - Tracking service
- **MinIO** (port 9000) - S3-compatible storage
- **Nginx** (port 8080) - Load balancer
- **Mailhog** (port 8025) - Email testing

### Test Data Management
- Automatic setup and teardown
- Isolated test data per suite
- Database migrations and seeding
- Mock external services when needed

## Continuous Integration

### GitHub Actions Workflow
The integration tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests
- Daily scheduled runs (2 AM UTC)
- Manual workflow dispatch

### Test Artifacts
- Test results (JUnit XML)
- Coverage reports (LCOV)
- Performance metrics
- Security scan results
- Docker logs (on failure)

## Performance Benchmarks

### Expected Performance Metrics
- **API Response Time**: < 500ms (95th percentile)
- **Database Queries**: < 100ms (95th percentile)
- **Image Processing**: < 2s per image
- **Order Processing**: < 5s end-to-end
- **Data Sync**: < 3s across systems

### Load Testing Targets
- **Concurrent Users**: 500+
- **Requests per Second**: 1000+
- **Data Throughput**: 100MB/s
- **Memory Usage**: < 4GB per service
- **CPU Usage**: < 80% sustained

## Troubleshooting

### Common Issues

1. **Services Not Starting**
   ```bash
   # Check Docker daemon
   docker info
   
   # View service logs
   npm run docker:logs
   
   # Restart services
   npm run docker:down && npm run docker:up
   ```

2. **Database Connection Issues**
   ```bash
   # Verify PostgreSQL is running
   docker exec -it heaven-dolls-integration-postgres-integration-1 pg_isready
   
   # Check connection string
   echo $DATABASE_URL
   ```

3. **Test Timeouts**
   ```bash
   # Increase timeout in jest.config.js
   testTimeout: 180000 // 3 minutes
   
   # Run specific test with more time
   npx jest --testTimeout=300000 frontend-cms.integration.test.ts
   ```

4. **Memory Issues**
   ```bash
   # Increase Docker memory limit
   # Docker Desktop > Settings > Resources > Memory: 8GB
   
   # Run tests with fewer workers
   npm test -- --maxWorkers=1
   ```

### Debug Mode
```bash
# Enable verbose logging
DEBUG=* npm test

# Run single test with logs
npm test -- --testNamePattern="should handle complete order flow" --verbose
```

## Contributing

### Adding New Integration Tests

1. **Create Test File**
   ```typescript
   // tests/integration/new-feature.integration.test.ts
   import { describe, it, expect } from '@jest/globals';
   
   describe('New Feature Integration', () => {
     it('should integrate properly', async () => {
       // Test implementation
     });
   });
   ```

2. **Update Test Suite**
   ```bash
   # Add to package.json scripts
   "test:new-feature": "jest --testNamePattern='New Feature'"
   ```

3. **Documentation**
   - Update this README
   - Add to CI workflow if needed
   - Document any new environment variables

### Best Practices

1. **Test Isolation**
   - Each test should be independent
   - Clean up test data after each test
   - Use unique identifiers (timestamps)

2. **Error Handling**
   - Test both success and failure scenarios
   - Verify error messages and codes
   - Test recovery mechanisms

3. **Performance**
   - Set realistic timeouts
   - Monitor resource usage
   - Test with realistic data volumes

4. **Maintenance**
   - Keep tests updated with system changes
   - Regular dependency updates
   - Monitor test execution times

## Monitoring and Alerts

### Test Failure Notifications
- Slack alerts for CI failures
- Email notifications for critical issues
- Performance regression alerts

### Metrics Collection
- Test execution times
- Success/failure rates
- Coverage trends
- Performance benchmarks

## Security Considerations

### Sensitive Data
- No production data in tests
- Mock external API keys
- Secure test credentials storage
- Regular security updates

### Access Control
- Limited test environment access
- Secure CI/CD pipeline
- Audit logging enabled
- Regular security reviews

---

For questions or issues with integration tests, please contact the development team or create an issue in the repository.