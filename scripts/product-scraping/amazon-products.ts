#!/usr/bin/env tsx

/**
 * Amazon Product Scraping Script
 * 
 * This script scrapes trending adult products from Amazon based on
 * keyword analysis and bestseller lists.
 */

import { amazonScraperService } from '../../apps/automation/src/scraping/amazon-scraper';
import { logger } from '../../apps/automation/src/utils/logger';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import axios from 'axios';

interface ProductScrapingReport {
  date: string;
  keywords_used: string[];
  products_found: number;
  products_processed: number;
  success_rate: number;
  products: Array<{
    id: string;
    title: string;
    price: number;
    rating: number;
    review_count: number;
    trend_score: number;
    image_url: string;
    source_url: string;
    keywords: string[];
    scraped_at: string;
  }>;
  top_performers: Array<{
    title: string;
    price: number;
    trend_score: number;
    reason: string;
  }>;
  market_insights: {
    average_price: number;
    average_rating: number;
    price_ranges: Record<string, number>;
    top_categories: string[];
  };
  duration_ms: number;
}

/**
 * Main function to run Amazon product scraping
 */
async function runAmazonProductScraping(): Promise<void> {
  const startTime = Date.now();
  
  try {
    logger.info('🛒 Starting Amazon product scraping');

    // Initialize the scraper
    await amazonScraperService.initialize();

    // Get keywords from latest trend analysis
    const keywords = await getScrapingKeywords();
    logger.info(`📋 Using keywords: ${keywords.join(', ')}`);

    // Scrape products based on trending keywords
    logger.info('🔍 Scraping products based on trending keywords...');
    const keywordProducts = await amazonScraperService.searchProducts(keywords);
    
    // Get bestselling products from relevant categories
    logger.info('🏆 Fetching bestselling products...');
    const bestsellerCategories = ['Health & Personal Care', 'Beauty & Personal Care', 'Sports & Outdoors'];
    const bestsellerProducts = await amazonScraperService.getBestsellers(bestsellerCategories);

    // Combine and process all products
    const allProducts = [...keywordProducts, ...bestsellerProducts];
    const processedProducts = await processProducts(allProducts);

    // Generate market insights
    const marketInsights = generateMarketInsights(processedProducts);

    // Identify top performers
    const topPerformers = identifyTopPerformers(processedProducts);

    // Create scraping report
    const report: ProductScrapingReport = {
      date: new Date().toISOString().split('T')[0],
      keywords_used: keywords,
      products_found: allProducts.length,
      products_processed: processedProducts.length,
      success_rate: (processedProducts.length / allProducts.length) * 100,
      products: processedProducts.map(p => ({
        id: p.id,
        title: p.title,
        price: p.price,
        rating: p.rating,
        review_count: p.reviewCount,
        trend_score: p.trendScore,
        image_url: p.imageUrl,
        source_url: p.sourceUrl,
        keywords: p.keywords,
        scraped_at: p.scrapedAt.toISOString()
      })),
      top_performers: topPerformers,
      market_insights: marketInsights,
      duration_ms: Date.now() - startTime
    };

    // Save report and data
    await saveScrapingReport(report);
    await downloadProductImages(processedProducts.slice(0, 20)); // Download top 20 images

    // Print summary
    printScrapingSummary(report);

    logger.info('✅ Amazon product scraping completed successfully');

  } catch (error) {
    logger.error('❌ Amazon product scraping failed:', error);
    throw error;
  } finally {
    await amazonScraperService.close();
  }
}

/**
 * Get keywords for scraping from trend analysis
 */
async function getScrapingKeywords(): Promise<string[]> {
  try {
    // Try to read from latest trend report
    const reportsDir = path.join(process.cwd(), 'reports', 'trends');
    const files = await fs.readdir(reportsDir).catch(() => []);
    
    const latestReport = files
      .filter(f => f.endsWith('.json'))
      .sort()
      .pop();

    if (latestReport) {
      const content = await fs.readFile(path.join(reportsDir, latestReport), 'utf-8');
      const trendData = JSON.parse(content);
      
      // Get top trending keywords
      const trendingKeywords = trendData.trending_keywords
        .slice(0, 8)
        .map((k: any) => k.keyword);
      
      return trendingKeywords.length > 0 ? trendingKeywords : getDefaultKeywords();
    }
    
    return getDefaultKeywords();
  } catch (error) {
    logger.warn('Could not load trending keywords, using defaults:', error);
    return getDefaultKeywords();
  }
}

/**
 * Get default keywords if trend data is not available
 */
function getDefaultKeywords(): string[] {
  return [
    'personal care products',
    'wellness accessories',
    'intimate health',
    'adult wellness',
    'personal massage',
    'health and wellness',
    'self care products',
    'bedroom accessories'
  ];
}

/**
 * Process and validate scraped products
 */
async function processProducts(products: any[]): Promise<any[]> {
  const processed: any[] = [];
  
  for (const product of products) {
    try {
      // Basic validation
      if (!product.title || !product.sourceUrl || product.price <= 0) {
        continue;
      }

      // Content filtering
      if (!isAppropriateProduct(product.title, product.description)) {
        continue;
      }

      // Price validation (reasonable range)
      if (product.price > 1000 || product.price < 5) {
        continue;
      }

      // Enhanced trend score calculation
      product.trendScore = calculateEnhancedTrendScore(product);

      processed.push(product);
    } catch (error) {
      logger.warn(`Error processing product ${product.id}:`, error);
    }
  }

  return processed.sort((a, b) => b.trendScore - a.trendScore);
}

/**
 * Check if product is appropriate for the marketplace
 */
function isAppropriateProduct(title: string, description: string): boolean {
  const titleLower = title.toLowerCase();
  const descLower = description.toLowerCase();
  
  // Exclude inappropriate terms
  const excludeTerms = [
    'child', 'kid', 'baby', 'minor', 'teen', 'underage',
    'illegal', 'drug', 'prescription', 'medical device'
  ];
  
  if (excludeTerms.some(term => titleLower.includes(term) || descLower.includes(term))) {
    return false;
  }

  // Include appropriate adult wellness terms
  const includeTerms = [
    'adult', 'wellness', 'personal', 'care', 'intimate', 'health',
    'massage', 'relaxation', 'spa', 'aromatherapy', 'supplement'
  ];
  
  return includeTerms.some(term => titleLower.includes(term) || descLower.includes(term));
}

/**
 * Calculate enhanced trend score
 */
function calculateEnhancedTrendScore(product: any): number {
  const ratingWeight = 0.3;
  const reviewWeight = 0.3;
  const priceWeight = 0.2;
  const availabilityWeight = 0.2;

  const normalizedRating = product.rating / 5;
  const normalizedReviews = Math.min(product.reviewCount / 500, 1);
  const normalizedPrice = Math.max(0, 1 - product.price / 200);
  const availabilityScore = 1; // Assume available if scraped

  return Math.round(
    (normalizedRating * ratingWeight +
     normalizedReviews * reviewWeight +
     normalizedPrice * priceWeight +
     availabilityScore * availabilityWeight) * 100
  );
}

/**
 * Generate market insights from scraped data
 */
function generateMarketInsights(products: any[]): any {
  const prices = products.map(p => p.price).filter(p => p > 0);
  const ratings = products.map(p => p.rating).filter(r => r > 0);
  
  // Price range analysis
  const priceRanges = {
    'Under $25': prices.filter(p => p < 25).length,
    '$25-50': prices.filter(p => p >= 25 && p < 50).length,
    '$50-100': prices.filter(p => p >= 50 && p < 100).length,
    'Over $100': prices.filter(p => p >= 100).length
  };

  // Top categories analysis
  const categoryCount = new Map<string, number>();
  products.forEach(product => {
    product.keywords.forEach((keyword: string) => {
      categoryCount.set(keyword, (categoryCount.get(keyword) || 0) + 1);
    });
  });

  const topCategories = Array.from(categoryCount.entries())
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([category]) => category);

  return {
    average_price: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
    average_rating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
    price_ranges: priceRanges,
    top_categories: topCategories
  };
}

/**
 * Identify top performing products
 */
function identifyTopPerformers(products: any[]): Array<any> {
  const topPerformers: Array<any> = [];

  // Best value products (high rating, low price)
  const bestValue = products
    .filter(p => p.rating >= 4.0 && p.price < 50)
    .sort((a, b) => (b.rating / b.price) - (a.rating / a.price))
    .slice(0, 3);

  bestValue.forEach(product => {
    topPerformers.push({
      title: product.title,
      price: product.price,
      trend_score: product.trendScore,
      reason: 'Best value - high rating, affordable price'
    });
  });

  // Trending products (high trend score)
  const trending = products
    .filter(p => p.trendScore >= 80)
    .slice(0, 3);

  trending.forEach(product => {
    topPerformers.push({
      title: product.title,
      price: product.price,
      trend_score: product.trendScore,
      reason: 'High trend momentum'
    });
  });

  // High-rated premium products
  const premium = products
    .filter(p => p.rating >= 4.5 && p.reviewCount >= 100)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 2);

  premium.forEach(product => {
    topPerformers.push({
      title: product.title,
      price: product.price,
      trend_score: product.trendScore,
      reason: 'Premium quality - high ratings and reviews'
    });
  });

  return topPerformers;
}

/**
 * Save scraping report
 */
async function saveScrapingReport(report: ProductScrapingReport): Promise<void> {
  try {
    const reportsDir = path.join(process.cwd(), 'reports', 'products');
    await fs.mkdir(reportsDir, { recursive: true });

    const fileName = `amazon-scraping-${report.date}.json`;
    const filePath = path.join(reportsDir, fileName);

    await fs.writeFile(filePath, JSON.stringify(report, null, 2));
    logger.info(`📄 Scraping report saved to: ${filePath}`);

    // Save CSV for easy analysis
    await saveProductsCsv(report, reportsDir);

  } catch (error) {
    logger.error('Error saving scraping report:', error);
    throw error;
  }
}

/**
 * Save products as CSV
 */
async function saveProductsCsv(report: ProductScrapingReport, reportsDir: string): Promise<void> {
  const csvFileName = `products-${report.date}.csv`;
  const csvPath = path.join(reportsDir, csvFileName);

  const csvContent = [
    'ID,Title,Price,Rating,Reviews,Trend Score,Source URL',
    ...report.products.map(p =>
      `"${p.id}","${p.title.replace(/"/g, '""')}",${p.price},${p.rating},${p.review_count},${p.trend_score},"${p.source_url}"`
    )
  ].join('\n');

  await fs.writeFile(csvPath, csvContent);
  logger.info(`📊 Products CSV saved to: ${csvPath}`);
}

/**
 * Download and optimize product images
 */
async function downloadProductImages(products: any[]): Promise<void> {
  const imagesDir = path.join(process.cwd(), 'data', 'images', 'products');
  await fs.mkdir(imagesDir, { recursive: true });

  let downloaded = 0;
  for (const product of products.slice(0, 20)) { // Limit to top 20
    try {
      if (!product.imageUrl || !product.imageUrl.startsWith('http')) continue;

      const response = await axios.get(product.imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.data) {
        // Optimize image with Sharp
        const optimizedImage = await sharp(response.data)
          .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer();

        const fileName = `${product.id}.jpg`;
        const filePath = path.join(imagesDir, fileName);
        
        await fs.writeFile(filePath, optimizedImage);
        downloaded++;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      logger.warn(`Could not download image for product ${product.id}:`, error);
    }
  }

  logger.info(`📸 Downloaded and optimized ${downloaded} product images`);
}

/**
 * Print scraping summary
 */
function printScrapingSummary(report: ProductScrapingReport): void {
  console.log('\n🛒 PRODUCT SCRAPING SUMMARY');
  console.log('='.repeat(50));
  console.log(`📅 Date: ${report.date}`);
  console.log(`🔍 Keywords Used: ${report.keywords_used.join(', ')}`);
  console.log(`📦 Products Found: ${report.products_found}`);
  console.log(`✅ Products Processed: ${report.products_processed}`);
  console.log(`📊 Success Rate: ${report.success_rate.toFixed(1)}%`);
  console.log(`⏱️  Duration: ${(report.duration_ms / 1000).toFixed(2)}s`);

  if (report.top_performers.length > 0) {
    console.log('\n🏆 TOP PERFORMERS:');
    report.top_performers.slice(0, 5).forEach((product, index) => {
      console.log(`${index + 1}. ${product.title.substring(0, 60)}...`);
      console.log(`   💰 Price: $${product.price} | 📈 Score: ${product.trend_score} | 💡 ${product.reason}`);
    });
  }

  console.log('\n💰 MARKET INSIGHTS:');
  console.log(`Average Price: $${report.market_insights.average_price.toFixed(2)}`);
  console.log(`Average Rating: ${report.market_insights.average_rating.toFixed(1)}/5`);
  console.log('Price Distribution:', Object.entries(report.market_insights.price_ranges)
    .map(([range, count]) => `${range}: ${count}`)
    .join(', '));

  if (report.market_insights.top_categories.length > 0) {
    console.log(`Top Categories: ${report.market_insights.top_categories.slice(0, 5).join(', ')}`);
  }

  console.log('\n' + '='.repeat(50));
}

// CLI execution
if (require.main === module) {
  runAmazonProductScraping()
    .catch(error => {
      logger.error('Script execution failed:', error);
      process.exit(1);
    });
}

export { runAmazonProductScraping };