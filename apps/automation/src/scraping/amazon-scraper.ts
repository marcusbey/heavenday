import puppeteer, { Browser, Page } from 'puppeteer';
import cheerio from 'cheerio';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { ProductTrend } from '../types/trends';

// Product validation schema
const ProductSchema = z.object({
  title: z.string(),
  description: z.string(),
  imageUrl: z.string().url(),
  sourceUrl: z.string().url(),
  price: z.number(),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().min(0),
  trendScore: z.number(),
  keywords: z.array(z.string()),
});

interface AmazonScrapingOptions {
  headless?: boolean;
  maxProducts?: number;
  delayBetweenRequests?: number;
  userAgent?: string;
}

export class AmazonScraperService {
  private browser: Browser | null = null;
  private options: AmazonScrapingOptions;

  constructor(options: AmazonScrapingOptions = {}) {
    this.options = {
      headless: true,
      maxProducts: 50,
      delayBetweenRequests: 3000,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      ...options
    };
  }

  /**
   * Initialize the browser
   */
  async initialize(): Promise<void> {
    try {
      this.browser = await puppeteer.launch({
        headless: this.options.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-dev-shm-usage'
        ],
      });
      logger.info('Amazon scraper browser initialized');
    } catch (error) {
      logger.error('Error initializing browser:', error);
      throw error;
    }
  }

  /**
   * Close the browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('Amazon scraper browser closed');
    }
  }

  /**
   * Search for products based on trending keywords
   */
  async searchProducts(keywords: string[]): Promise<ProductTrend[]> {
    if (!this.browser) {
      await this.initialize();
    }

    const allProducts: ProductTrend[] = [];

    try {
      for (const keyword of keywords) {
        logger.info(`Searching Amazon for keyword: ${keyword}`);
        const products = await this.searchByKeyword(keyword);
        allProducts.push(...products);

        // Delay between searches to avoid rate limiting
        await this.delay(this.options.delayBetweenRequests!);
      }

      return this.deduplicateProducts(allProducts);
    } catch (error) {
      logger.error('Error searching products:', error);
      throw error;
    }
  }

  /**
   * Search products by a specific keyword
   */
  private async searchByKeyword(keyword: string): Promise<ProductTrend[]> {
    const page = await this.browser!.newPage();
    
    try {
      await page.setUserAgent(this.options.userAgent!);
      await page.setViewport({ width: 1366, height: 768 });

      // Navigate to Amazon search
      const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(keyword)}&ref=sr_pg_1`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });

      // Wait for products to load
      await page.waitForSelector('[data-component-type="s-search-result"]', { timeout: 10000 });

      const products = await this.extractProductsFromPage(page, keyword);
      logger.info(`Found ${products.length} products for keyword: ${keyword}`);

      return products;
    } catch (error) {
      logger.error(`Error searching for keyword ${keyword}:`, error);
      return [];
    } finally {
      await page.close();
    }
  }

  /**
   * Extract product information from the current page
   */
  private async extractProductsFromPage(page: Page, searchKeyword: string): Promise<ProductTrend[]> {
    const html = await page.content();
    const $ = cheerio.load(html);
    const products: ProductTrend[] = [];

    $('[data-component-type="s-search-result"]').each((index, element) => {
      if (products.length >= this.options.maxProducts!) return false;

      try {
        const $el = $(element);
        
        // Extract basic product information
        const titleElement = $el.find('h2 a span').first();
        const title = titleElement.text().trim();
        
        if (!title) return true; // Skip if no title

        const linkElement = $el.find('h2 a');
        const relativeUrl = linkElement.attr('href');
        const sourceUrl = relativeUrl ? `https://www.amazon.com${relativeUrl}` : '';

        const imageElement = $el.find('img').first();
        const imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';

        // Extract price
        const priceElement = $el.find('.a-price .a-offscreen').first();
        const priceText = priceElement.text().replace(/[^\d.]/g, '');
        const price = parseFloat(priceText) || 0;

        // Extract rating
        const ratingElement = $el.find('span.a-icon-alt');
        const ratingText = ratingElement.text();
        const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
        const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

        // Extract review count
        const reviewElement = $el.find('a span[aria-label]');
        const reviewText = reviewElement.attr('aria-label') || '';
        const reviewMatch = reviewText.match(/(\d+)/);
        const reviewCount = reviewMatch ? parseInt(reviewMatch[1]) : 0;

        // Only include products that meet basic criteria
        if (title && sourceUrl && price > 0) {
          const product: ProductTrend = {
            id: this.generateProductId(sourceUrl),
            title,
            description: this.generateDescription(title),
            imageUrl,
            sourceUrl,
            platform: 'amazon',
            price,
            rating,
            reviewCount,
            trendScore: this.calculateTrendScore(rating, reviewCount, price),
            keywords: [searchKeyword, ...this.extractKeywordsFromTitle(title)],
            scrapedAt: new Date(),
          };

          // Validate the product data
          if (this.validateProduct(product)) {
            products.push(product);
          }
        }
      } catch (error) {
        logger.warn(`Error extracting product at index ${index}:`, error);
      }
    });

    return products;
  }

  /**
   * Get bestselling products from Amazon categories
   */
  async getBestsellers(categories: string[] = ['Health & Personal Care', 'Beauty']): Promise<ProductTrend[]> {
    if (!this.browser) {
      await this.initialize();
    }

    const allProducts: ProductTrend[] = [];

    try {
      for (const category of categories) {
        logger.info(`Fetching bestsellers for category: ${category}`);
        const products = await this.getBestsellersForCategory(category);
        allProducts.push(...products);

        await this.delay(this.options.delayBetweenRequests!);
      }

      return this.deduplicateProducts(allProducts);
    } catch (error) {
      logger.error('Error fetching bestsellers:', error);
      throw error;
    }
  }

  /**
   * Get bestsellers for a specific category
   */
  private async getBestsellersForCategory(category: string): Promise<ProductTrend[]> {
    const page = await this.browser!.newPage();
    
    try {
      await page.setUserAgent(this.options.userAgent!);
      
      // Navigate to Amazon bestsellers
      const categoryUrl = `https://www.amazon.com/gp/bestsellers/${category.toLowerCase().replace(/\s+/g, '-')}/ref=zg_bs_nav_0`;
      await page.goto(categoryUrl, { waitUntil: 'networkidle2' });

      await page.waitForSelector('.zg-grid-general-faceout', { timeout: 10000 });

      return await this.extractProductsFromBestsellerPage(page, category);
    } catch (error) {
      logger.error(`Error fetching bestsellers for ${category}:`, error);
      return [];
    } finally {
      await page.close();
    }
  }

  /**
   * Extract products from bestseller page
   */
  private async extractProductsFromBestsellerPage(page: Page, category: string): Promise<ProductTrend[]> {
    const html = await page.content();
    const $ = cheerio.load(html);
    const products: ProductTrend[] = [];

    $('.zg-grid-general-faceout').each((index, element) => {
      if (products.length >= this.options.maxProducts!) return false;

      try {
        const $el = $(element);
        
        const titleElement = $el.find('.p13n-sc-truncate-desktop-type2');
        const title = titleElement.text().trim();

        const linkElement = $el.find('a').first();
        const relativeUrl = linkElement.attr('href');
        const sourceUrl = relativeUrl ? `https://www.amazon.com${relativeUrl}` : '';

        const imageElement = $el.find('img').first();
        const imageUrl = imageElement.attr('src') || '';

        // Extract bestseller rank
        const rankElement = $el.find('.zg-bdg-text');
        const rankText = rankElement.text();
        const rank = parseInt(rankText.replace(/[^\d]/g, '')) || (index + 1);

        if (title && sourceUrl) {
          const product: ProductTrend = {
            id: this.generateProductId(sourceUrl),
            title,
            description: this.generateDescription(title),
            imageUrl,
            sourceUrl,
            platform: 'amazon',
            price: 0, // Price will be fetched later if needed
            rating: 0, // Rating will be fetched later if needed
            reviewCount: 0,
            trendScore: this.calculateBestsellerTrendScore(rank),
            keywords: [category, ...this.extractKeywordsFromTitle(title)],
            scrapedAt: new Date(),
          };

          products.push(product);
        }
      } catch (error) {
        logger.warn(`Error extracting bestseller product at index ${index}:`, error);
      }
    });

    return products;
  }

  /**
   * Calculate trend score based on rating and review count
   */
  private calculateTrendScore(rating: number, reviewCount: number, price: number): number {
    const ratingWeight = 0.4;
    const reviewWeight = 0.4;
    const priceWeight = 0.2;

    const normalizedRating = rating / 5;
    const normalizedReviews = Math.min(reviewCount / 1000, 1);
    const normalizedPrice = Math.max(0, 1 - price / 200); // Prefer lower-priced items

    return Math.round(
      (normalizedRating * ratingWeight + 
       normalizedReviews * reviewWeight + 
       normalizedPrice * priceWeight) * 100
    );
  }

  /**
   * Calculate trend score for bestseller products
   */
  private calculateBestsellerTrendScore(rank: number): number {
    // Higher score for better rank
    return Math.max(0, 100 - rank);
  }

  /**
   * Generate product description from title
   */
  private generateDescription(title: string): string {
    return `${title} - Premium quality product available on Amazon.`;
  }

  /**
   * Extract keywords from product title
   */
  private extractKeywordsFromTitle(title: string): string[] {
    const words = title.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    return [...new Set(words)].slice(0, 5);
  }

  /**
   * Generate unique product ID
   */
  private generateProductId(url: string): string {
    const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/);
    return asinMatch ? asinMatch[1] : `amazon-${Date.now()}`;
  }

  /**
   * Validate product data
   */
  private validateProduct(product: ProductTrend): boolean {
    try {
      ProductSchema.parse(product);
      return true;
    } catch (error) {
      logger.warn('Invalid product data:', error);
      return false;
    }
  }

  /**
   * Remove duplicate products
   */
  private deduplicateProducts(products: ProductTrend[]): ProductTrend[] {
    const seen = new Set<string>();
    return products.filter(product => {
      if (seen.has(product.id)) {
        return false;
      }
      seen.add(product.id);
      return true;
    });
  }

  /**
   * Rate limiting delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const amazonScraperService = new AmazonScraperService();

// CLI execution
if (require.main === module) {
  const scraper = new AmazonScraperService({ headless: false });
  
  scraper.searchProducts(['wellness products', 'personal care'])
    .then(products => {
      logger.info(`Scraped ${products.length} products`);
      console.log(JSON.stringify(products.slice(0, 5), null, 2));
    })
    .catch(logger.error)
    .finally(() => scraper.close());
}