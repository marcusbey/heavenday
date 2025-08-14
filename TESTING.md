# Testing Guide for Heaven Dolls

This document provides comprehensive guidance on testing practices, tools, and conventions used in the Heaven Dolls marketplace project.

## Table of Contents

- [Overview](#overview)
- [Testing Strategy](#testing-strategy)
- [Tools and Technologies](#tools-and-technologies)
- [Test Types](#test-types)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Best Practices](#best-practices)
- [Continuous Integration](#continuous-integration)
- [Troubleshooting](#troubleshooting)

## Overview

Our testing infrastructure covers multiple layers:

- **Unit Tests**: Testing individual functions and components in isolation
- **Integration Tests**: Testing interactions between different parts of the system
- **End-to-End Tests**: Testing complete user workflows across the entire application
- **Performance Tests**: Ensuring the application meets performance benchmarks
- **API Tests**: Testing REST API endpoints and their contracts

## Testing Strategy

### Test Pyramid

We follow the testing pyramid principle:

```
    /\
   /  \  E2E Tests (Few, High-level)
  /____\
 /      \ Integration Tests (Some, Mid-level)
/________\
Unit Tests (Many, Low-level)
```

- **70%** Unit Tests - Fast, isolated, comprehensive coverage
- **20%** Integration Tests - Test component interactions
- **10%** E2E Tests - Critical user journeys only

### Coverage Goals

- **Unit Tests**: >85% coverage for automation pipeline, >75% for web components
- **Integration Tests**: All API endpoints and major workflows
- **E2E Tests**: Core user journeys (search, add to cart, checkout)

## Tools and Technologies

### Core Testing Frameworks

- **Jest**: Unit and integration testing
- **React Testing Library**: Component testing for React
- **Playwright**: End-to-end testing
- **Supertest**: API testing
- **Lighthouse CI**: Performance testing

### Additional Tools

- **Faker.js**: Test data generation
- **MSW**: API mocking
- **Codecov**: Coverage reporting
- **GitHub Actions**: CI/CD pipeline

## Test Types

### 1. Unit Tests

**Location**: `apps/*/src/**/*.test.{ts,tsx}`

Unit tests focus on testing individual functions, classes, or components in isolation.

#### Example: Testing a utility function

```typescript
// apps/automation/src/utils/__tests__/price-parser.test.ts
import { parsePrice } from '../price-parser';

describe('parsePrice', () => {
  it('parses standard price format', () => {
    expect(parsePrice('$29.99')).toBe(29.99);
  });

  it('handles comma separators', () => {
    expect(parsePrice('$1,299.99')).toBe(1299.99);
  });

  it('returns null for invalid input', () => {
    expect(parsePrice('invalid')).toBeNull();
  });
});
```

#### Example: Testing a React component

```typescript
// apps/web/components/products/__tests__/product-card.test.tsx
import { render, screen } from '../../../tests/utils/test-utils';
import { ProductCard } from '../product-card';
import { createProduct } from '../../../tests/factories';

describe('ProductCard', () => {
  it('displays product information', () => {
    const product = createProduct({
      attributes: { name: 'Test Product', price: 99.99 }
    });

    render(<ProductCard product={product} />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('$99.99')).toBeInTheDocument();
  });
});
```

### 2. Integration Tests

**Location**: `apps/*/tests/integration/**/*.test.ts`

Integration tests verify that different parts of the system work together correctly.

#### Example: API integration test

```typescript
// apps/cms/tests/api/integration/product.integration.test.ts
import request from 'supertest';
import { setupStrapi, cleanupStrapi } from '../../helpers/strapi';

describe('Product API Integration', () => {
  let app: any;

  beforeAll(async () => {
    app = await setupStrapi();
  });

  afterAll(async () => {
    await cleanupStrapi(app);
  });

  it('creates and retrieves a product', async () => {
    // Create product
    const response = await request(app.server)
      .post('/api/products')
      .send({
        data: {
          name: 'Test Product',
          price: 99.99,
          sku: 'TEST-001'
        }
      })
      .expect(200);

    const productId = response.body.data.id;

    // Retrieve product
    const getResponse = await request(app.server)
      .get(`/api/products/${productId}`)
      .expect(200);

    expect(getResponse.body.data.attributes.name).toBe('Test Product');
  });
});
```

### 3. End-to-End Tests

**Location**: `tests/e2e/**/*.spec.ts`

E2E tests simulate real user interactions across the entire application.

#### Example: Shopping cart flow

```typescript
// tests/e2e/shopping-cart.spec.ts
import { test, expect } from '@playwright/test';

test('user can add product to cart and checkout', async ({ page }) => {
  // Navigate to homepage
  await page.goto('/');

  // Search for product
  await page.getByPlaceholder(/search products/i).fill('wellness doll');
  await page.keyboard.press('Enter');

  // Add first product to cart
  await page.getByRole('button', { name: /add to cart/i }).first().click();

  // Open cart
  await page.getByRole('button', { name: /cart/i }).click();

  // Verify item in cart
  await expect(page.getByText(/wellness doll/i)).toBeVisible();

  // Proceed to checkout
  await page.getByRole('button', { name: /checkout/i }).click();

  // Should navigate to checkout
  await expect(page).toHaveURL(/.*\/checkout/);
});
```

### 4. Performance Tests

**Location**: `tests/e2e/performance.spec.ts` and `lighthouserc.js`

Performance tests ensure the application meets speed and Core Web Vitals requirements.

#### Example: Page load performance

```typescript
// tests/e2e/performance.spec.ts
import { test, expect } from '@playwright/test';

test('homepage loads within performance budget', async ({ page }) => {
  const startTime = Date.now();
  
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  const loadTime = Date.now() - startTime;
  
  // Should load within 3 seconds
  expect(loadTime).toBeLessThan(3000);
});
```

## Running Tests

### Local Development

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run performance tests
npm run test:performance

# Run specific workspace tests
npx turbo test --filter=@heaven-dolls/web

# Watch mode for unit tests
npm run test:watch
```

### Environment Setup

```bash
# Set up test environment
cp .env.example .env.test

# Install dependencies
npm ci

# Install Playwright browsers
npx playwright install
```

### Test Databases

Each test suite uses isolated databases:

- **Unit Tests**: In-memory SQLite
- **Integration Tests**: PostgreSQL test database
- **E2E Tests**: Separate PostgreSQL instance

## Writing Tests

### Test Structure

Follow the AAA pattern (Arrange, Act, Assert):

```typescript
describe('Component/Function Name', () => {
  it('should do something specific', () => {
    // Arrange: Set up test data and mocks
    const mockData = createMockProduct();
    
    // Act: Execute the code under test
    const result = processProduct(mockData);
    
    // Assert: Verify the expected outcome
    expect(result).toBe(expectedValue);
  });
});
```

### Using Test Factories

Use factories for consistent test data:

```typescript
import { createProduct, createUser } from '../../../tests/factories';

const product = createProduct({
  attributes: { 
    name: 'Custom Product',
    price: 150.00 
  }
});

const user = createUser({
  email: 'test@example.com'
});
```

### Mocking External Services

Mock external APIs and services:

```typescript
// Mock Google Trends API
jest.mock('google-trends-api', () => ({
  interestOverTime: jest.fn().mockResolvedValue({
    default: {
      timelineData: [/* mock data */]
    }
  })
}));
```

### Accessibility Testing

Include accessibility checks in component tests:

```typescript
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('component is accessible', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## Best Practices

### General Guidelines

1. **Write descriptive test names**: Use clear, specific descriptions
2. **Test behavior, not implementation**: Focus on what the code does, not how
3. **Keep tests isolated**: Each test should be independent
4. **Use appropriate test types**: Don't write E2E tests for unit-level logic
5. **Mock external dependencies**: Keep tests fast and reliable

### Naming Conventions

```typescript
// Good: Descriptive and specific
describe('ProductCard component', () => {
  it('displays product name and price', () => {});
  it('shows sold out badge when inventory is zero', () => {});
  it('navigates to product page on click', () => {});
});

// Bad: Vague and unclear
describe('ProductCard', () => {
  it('works', () => {});
  it('test product', () => {});
});
```

### Test Organization

```
tests/
├── factories/          # Test data factories
├── fixtures/           # Static test data
├── helpers/            # Test utilities
├── e2e/               # End-to-end tests
│   ├── auth/
│   ├── products/
│   └── performance/
└── setup.ts           # Global test setup
```

### Performance Considerations

- **Unit tests**: Should run in <2 seconds
- **Integration tests**: Should run in <30 seconds
- **E2E tests**: Should run in <5 minutes
- **Parallel execution**: Use Jest workers and Playwright parallel mode

## Continuous Integration

### GitHub Actions Workflow

Our CI pipeline runs tests in multiple stages:

1. **Lint and Format**: Code quality checks
2. **Unit Tests**: Fast feedback on code changes
3. **Integration Tests**: Database and API testing
4. **E2E Tests**: Critical user journey validation
5. **Performance Tests**: Lighthouse audits
6. **Security Scans**: Vulnerability detection

### Quality Gates

Tests must pass these criteria:

- ✅ All unit tests pass
- ✅ Integration tests pass
- ✅ E2E tests pass
- ✅ Coverage thresholds met (>80%)
- ✅ Performance budgets met
- ⚠️ Security scans (warning only)

### Branch Protection

- `main` branch requires passing tests
- Pull requests need approval + tests
- Automatic deployment on `main` after tests pass

## Troubleshooting

### Common Issues

#### Tests failing locally but passing in CI

```bash
# Clear cache and reinstall
npm run clean
rm -rf node_modules package-lock.json
npm ci

# Check Node version matches CI
node --version
```

#### E2E tests timing out

```typescript
// Increase timeout for specific tests
test.setTimeout(60000); // 60 seconds

// Wait for specific conditions
await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 });
```

#### Flaky tests

```typescript
// Use waitFor for async operations
await waitFor(() => {
  expect(screen.getByText('Loading complete')).toBeInTheDocument();
});

// Retry flaky E2E tests
test.describe.configure({ retries: 2 });
```

#### Coverage issues

```bash
# Check what's not covered
npm run test:coverage -- --verbose

# Exclude files from coverage
// In jest.config.js
collectCoverageFrom: [
  'src/**/*.ts',
  '!src/**/*.d.ts',
  '!src/**/*.test.ts'
]
```

### Debugging Tests

#### Jest debugging

```bash
# Debug specific test
npx jest --runInBand --detectOpenHandles path/to/test.ts

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

#### Playwright debugging

```bash
# Run tests in headed mode
npx playwright test --headed

# Debug mode with browser dev tools
npx playwright test --debug

# Generate test report
npx playwright show-report
```

### Performance Optimization

#### Faster test execution

```bash
# Run tests in parallel
npx jest --maxWorkers=4

# Run only changed files
npx jest --onlyChanged

# Skip E2E tests in development
npm test -- --testPathIgnorePatterns=e2e
```

## Contributing

When adding new features:

1. **Write tests first** (TDD approach)
2. **Ensure coverage** doesn't drop below thresholds
3. **Add E2E tests** for new user workflows
4. **Update documentation** if test patterns change
5. **Run full test suite** before submitting PR

### Test Review Checklist

- [ ] Tests cover happy path and edge cases
- [ ] Test names are descriptive and clear
- [ ] Tests are properly isolated and don't leak state
- [ ] Appropriate test type for the functionality
- [ ] Mocks are used appropriately
- [ ] Performance considerations addressed
- [ ] Accessibility testing included where relevant

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Web Performance Testing](https://web.dev/lighthouse-ci/)

---

For questions or improvements to this testing guide, please open an issue or submit a pull request.