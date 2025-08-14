import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, 'playwright/.auth/user.json');

setup('authenticate user', async ({ page }) => {
  // Go to login page
  await page.goto('/auth/login');

  // Create test user or login with existing credentials
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Password').fill('Test123456!');
  
  // Try to login first
  await page.getByRole('button', { name: 'Sign In' }).click();
  
  // If login fails, try registration
  if (await page.getByText('Invalid credentials').isVisible()) {
    await page.getByRole('link', { name: 'Create account' }).click();
    
    await page.getByLabel('Name').fill('Test User');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('Test123456!');
    await page.getByLabel('Confirm Password').fill('Test123456!');
    
    await page.getByRole('button', { name: 'Create Account' }).click();
  }

  // Wait for successful authentication
  await expect(page).toHaveURL(/.*\/dashboard|.*\/profile|.*\/$/);
  
  // Check for user menu or profile indicator
  await expect(
    page.getByRole('button', { name: /user menu|profile|test user/i }).or(
      page.getByText('Welcome back')
    )
  ).toBeVisible();

  // Save signed-in state
  await page.context().storageState({ path: authFile });
});

setup('setup test data', async ({ request }) => {
  // Create test categories
  const categories = [
    { name: 'Wellness', slug: 'wellness', description: 'Wellness products' },
    { name: 'Adult', slug: 'adult', description: 'Adult products' },
    { name: 'Trending', slug: 'trending', description: 'Trending products' },
  ];

  for (const category of categories) {
    await request.post('http://localhost:1337/api/categories', {
      data: { data: category },
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Create test products
  const products = [
    {
      name: 'Premium Wellness Doll',
      slug: 'premium-wellness-doll',
      description: 'High-quality wellness doll for relaxation and therapy',
      price: 199.99,
      compareAtPrice: 249.99,
      sku: 'PWD-001',
      inventory: 50,
      status: 'active',
      featured: true,
      trendScore: 95,
      categories: [1],
    },
    {
      name: 'Budget Therapy Doll',
      slug: 'budget-therapy-doll',
      description: 'Affordable therapy doll for daily wellness',
      price: 79.99,
      compareAtPrice: 99.99,
      sku: 'BTD-001',
      inventory: 100,
      status: 'active',
      featured: false,
      trendScore: 70,
      categories: [1],
    },
    {
      name: 'Trending Adult Doll',
      slug: 'trending-adult-doll',
      description: 'Popular adult companionship doll',
      price: 299.99,
      compareAtPrice: 399.99,
      sku: 'TAD-001',
      inventory: 25,
      status: 'active',
      featured: true,
      trendScore: 90,
      categories: [2, 3],
    },
  ];

  for (const product of products) {
    await request.post('http://localhost:1337/api/products', {
      data: { data: product },
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
});