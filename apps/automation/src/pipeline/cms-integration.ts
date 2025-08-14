import axios from 'axios';
import { logger } from '../utils/logger';
import { ProductTrend, TrendAnalysisResult } from '../types/trends';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

export interface CMSProduct {
  title: string;
  description: string;
  content: string;
  price: number;
  images: string[];
  tags: string[];
  categories: string[];
  sourceUrl: string;
  trendScore: number;
  metadata: {
    amazonId?: string;
    rating?: number;
    reviewCount?: number;
    scrapedAt: string;
    lastUpdated: string;
  };
  seo: {
    metaTitle: string;
    metaDescription: string;
    slug: string;
  };
  status: 'draft' | 'published' | 'pending_review';
}

export interface CMSResponse {
  success: boolean;
  productId?: string;
  message: string;
  errors?: string[];
}

export class CMSIntegrationService {
  private cmsApiUrl: string;
  private cmsApiKey: string;
  private imagesPath: string;

  constructor() {
    this.cmsApiUrl = process.env.CMS_API_URL || 'http://localhost:3000/api';
    this.cmsApiKey = process.env.CMS_API_KEY || '';
    this.imagesPath = path.join(process.cwd(), 'data', 'images', 'products');
  }

  /**
   * Process trend analysis results and create CMS products
   */
  async processTrendAnalysisResults(results: TrendAnalysisResult): Promise<CMSResponse[]> {
    try {
      logger.info('🔄 Processing trend analysis results for CMS integration');

      const cmsResponses: CMSResponse[] = [];

      // Filter top products based on trend score and quality
      const topProducts = this.filterTopProducts(results.productOpportunities);
      logger.info(`📦 Found ${topProducts.length} high-quality products for CMS integration`);

      // Process each product
      for (const product of topProducts) {
        try {
          const cmsProduct = await this.convertProductToCMS(product, results);
          const response = await this.createCMSProduct(cmsProduct);
          cmsResponses.push(response);

          if (response.success) {
            logger.info(`✅ Successfully created CMS product: ${product.title.substring(0, 50)}...`);
          } else {
            logger.warn(`⚠️ Failed to create CMS product: ${response.message}`);
          }

          // Rate limiting
          await this.delay(1000);
        } catch (error) {
          logger.error(`❌ Error processing product ${product.id}:`, error);
          cmsResponses.push({
            success: false,
            message: `Error processing product: ${error.message}`,
            errors: [error.message]
          });
        }
      }

      logger.info(`🎯 CMS integration complete. ${cmsResponses.filter(r => r.success).length}/${cmsResponses.length} products created successfully`);
      return cmsResponses;

    } catch (error) {
      logger.error('❌ Error in CMS integration pipeline:', error);
      throw error;
    }
  }

  /**
   * Filter and select top products for CMS creation
   */
  private filterTopProducts(products: ProductTrend[]): ProductTrend[] {
    return products
      .filter(product => {
        // Quality filters
        if (product.trendScore < 70) return false;
        if (product.price < 10 || product.price > 500) return false;
        if (product.rating < 3.5 && product.reviewCount > 0) return false;
        if (!product.title || product.title.length < 10) return false;
        if (!product.imageUrl) return false;
        
        return true;
      })
      .sort((a, b) => b.trendScore - a.trendScore)
      .slice(0, 20); // Limit to top 20 products
  }

  /**
   * Convert ProductTrend to CMS-compatible format
   */
  private async convertProductToCMS(product: ProductTrend, results: TrendAnalysisResult): Promise<CMSProduct> {
    const processedImages = await this.processProductImages(product);
    const enhancedDescription = this.enhanceProductDescription(product, results);
    const seoData = this.generateSEOData(product);
    const categories = this.inferCategories(product);
    const tags = this.generateTags(product, results);

    return {
      title: this.cleanTitle(product.title),
      description: product.description,
      content: enhancedDescription,
      price: product.price,
      images: processedImages,
      tags,
      categories,
      sourceUrl: product.sourceUrl,
      trendScore: product.trendScore,
      metadata: {
        amazonId: product.id,
        rating: product.rating,
        reviewCount: product.reviewCount,
        scrapedAt: product.scrapedAt.toISOString(),
        lastUpdated: new Date().toISOString()
      },
      seo: seoData,
      status: product.trendScore >= 85 ? 'published' : 'draft'
    };
  }

  /**
   * Create product in CMS
   */
  private async createCMSProduct(product: CMSProduct): Promise<CMSResponse> {
    try {
      if (!this.cmsApiUrl || !this.cmsApiKey) {
        return {
          success: false,
          message: 'CMS API configuration missing'
        };
      }

      const response = await axios.post(
        `${this.cmsApiUrl}/products`,
        product,
        {
          headers: {
            'Authorization': `Bearer ${this.cmsApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return {
        success: true,
        productId: response.data.id,
        message: 'Product created successfully'
      };

    } catch (error: any) {
      logger.error('Error creating CMS product:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || error.message,
        errors: error.response?.data?.errors || [error.message]
      };
    }
  }

  /**
   * Process and optimize product images
   */
  private async processProductImages(product: ProductTrend): Promise<string[]> {
    try {
      const processedImages: string[] = [];
      
      if (!product.imageUrl) {
        return processedImages;
      }

      // Download and process main image
      const imageResponse = await axios.get(product.imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }).catch(() => null);

      if (imageResponse?.data) {
        // Create multiple sizes
        const sizes = [
          { suffix: 'thumb', width: 150, height: 150 },
          { suffix: 'medium', width: 400, height: 400 },
          { suffix: 'large', width: 800, height: 800 }
        ];

        for (const size of sizes) {
          try {
            const processedImage = await sharp(imageResponse.data)
              .resize(size.width, size.height, { 
                fit: 'inside', 
                withoutEnlargement: true,
                background: { r: 255, g: 255, b: 255, alpha: 1 }
              })
              .jpeg({ quality: 85 })
              .toBuffer();

            const fileName = `${product.id}-${size.suffix}.jpg`;
            const filePath = path.join(this.imagesPath, fileName);
            
            await fs.mkdir(this.imagesPath, { recursive: true });
            await fs.writeFile(filePath, processedImage);
            
            // Return relative URL for CMS
            processedImages.push(`/images/products/${fileName}`);
          } catch (sizeError) {
            logger.warn(`Error processing ${size.suffix} image for ${product.id}:`, sizeError);
          }
        }
      }

      return processedImages;

    } catch (error) {
      logger.warn(`Error processing images for product ${product.id}:`, error);
      return [];
    }
  }

  /**
   * Enhance product description with trend context
   */
  private enhanceProductDescription(product: ProductTrend, results: TrendAnalysisResult): string {
    const trendContext = this.getTrendContext(product, results);
    const features = this.extractFeatures(product.title);
    const benefits = this.generateBenefits(product);

    return `
      <div class="product-content">
        ${trendContext ? `<div class="trend-highlight">${trendContext}</div>` : ''}
        
        <div class="product-description">
          <p>${product.description}</p>
        </div>

        ${features.length > 0 ? `
          <div class="product-features">
            <h3>Key Features:</h3>
            <ul>
              ${features.map(feature => `<li>${feature}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${benefits.length > 0 ? `
          <div class="product-benefits">
            <h3>Benefits:</h3>
            <ul>
              ${benefits.map(benefit => `<li>${benefit}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <div class="product-meta">
          <p><strong>Trend Score:</strong> ${product.trendScore}/100</p>
          ${product.rating > 0 ? `<p><strong>Rating:</strong> ${product.rating}/5 (${product.reviewCount} reviews)</p>` : ''}
        </div>
      </div>
    `.trim();
  }

  /**
   * Get trend context for product
   */
  private getTrendContext(product: ProductTrend, results: TrendAnalysisResult): string | null {
    const relatedTrends = results.googleTrends.keywords.filter(keyword =>
      product.keywords.some(pk => 
        pk.toLowerCase().includes(keyword.keyword.toLowerCase()) ||
        keyword.keyword.toLowerCase().includes(pk.toLowerCase())
      )
    );

    if (relatedTrends.length > 0) {
      const topTrend = relatedTrends[0];
      return `🔥 Trending Now: This product aligns with the current trend "${topTrend.keyword}" (Score: ${topTrend.score})`;
    }

    return null;
  }

  /**
   * Extract features from product title
   */
  private extractFeatures(title: string): string[] {
    const featureKeywords = [
      'waterproof', 'rechargeable', 'silicone', 'wireless', 'portable',
      'premium', 'medical grade', 'quiet', 'powerful', 'ergonomic',
      'discreet', 'safe', 'hygienic', 'durable', 'flexible'
    ];

    const titleLower = title.toLowerCase();
    return featureKeywords.filter(keyword => titleLower.includes(keyword))
      .map(keyword => keyword.charAt(0).toUpperCase() + keyword.slice(1));
  }

  /**
   * Generate benefits from product information
   */
  private generateBenefits(product: ProductTrend): string[] {
    const benefits = [];

    if (product.rating >= 4.0) {
      benefits.push('Highly rated by customers');
    }

    if (product.reviewCount >= 100) {
      benefits.push('Proven customer satisfaction');
    }

    if (product.price < 50) {
      benefits.push('Affordable quality');
    } else if (product.price > 100) {
      benefits.push('Premium quality construction');
    }

    if (product.trendScore >= 80) {
      benefits.push('Currently trending product');
    }

    return benefits;
  }

  /**
   * Generate SEO data for product
   */
  private generateSEOData(product: ProductTrend): CMSProduct['seo'] {
    const cleanTitle = this.cleanTitle(product.title);
    const slug = this.generateSlug(cleanTitle);

    return {
      metaTitle: `${cleanTitle} - Premium Adult Wellness Products`,
      metaDescription: `Discover ${cleanTitle.toLowerCase()}. High-quality adult wellness products with ${product.rating}/5 rating. Trending now with ${product.trendScore}% trend score.`,
      slug
    };
  }

  /**
   * Infer product categories
   */
  private inferCategories(product: ProductTrend): string[] {
    const categories = [];
    const titleLower = product.title.toLowerCase();
    const keywordsLower = product.keywords.map(k => k.toLowerCase()).join(' ');

    if (titleLower.includes('wellness') || keywordsLower.includes('wellness')) {
      categories.push('Wellness');
    }

    if (titleLower.includes('care') || keywordsLower.includes('personal care')) {
      categories.push('Personal Care');
    }

    if (titleLower.includes('health') || keywordsLower.includes('health')) {
      categories.push('Health');
    }

    if (titleLower.includes('massage') || keywordsLower.includes('massage')) {
      categories.push('Massage & Relaxation');
    }

    if (titleLower.includes('intimate') || keywordsLower.includes('intimate')) {
      categories.push('Intimate Care');
    }

    // Default category if none matched
    if (categories.length === 0) {
      categories.push('Adult Products');
    }

    return categories;
  }

  /**
   * Generate product tags
   */
  private generateTags(product: ProductTrend, results: TrendAnalysisResult): string[] {
    const tags = new Set<string>();

    // Add product keywords
    product.keywords.forEach(keyword => {
      tags.add(keyword.toLowerCase());
    });

    // Add trending keywords
    results.googleTrends.keywords.slice(0, 5).forEach(trend => {
      tags.add(trend.keyword.toLowerCase());
    });

    // Add quality tags
    if (product.rating >= 4.5) tags.add('premium');
    if (product.reviewCount >= 200) tags.add('popular');
    if (product.trendScore >= 85) tags.add('trending');
    if (product.price < 30) tags.add('affordable');

    return Array.from(tags).slice(0, 10);
  }

  /**
   * Clean and optimize product title
   */
  private cleanTitle(title: string): string {
    return title
      .replace(/\b(Amazon|eBay|Etsy)\b/gi, '') // Remove platform names
      .replace(/\s+/g, ' ') // Multiple spaces to single
      .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
      .trim()
      .substring(0, 80); // Limit length
  }

  /**
   * Generate URL-friendly slug
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .substring(0, 50);
  }

  /**
   * Update existing CMS products based on new trend data
   */
  async updateExistingProducts(results: TrendAnalysisResult): Promise<CMSResponse[]> {
    try {
      logger.info('🔄 Updating existing CMS products with latest trend data');

      // This would fetch existing products from CMS and update their trend scores
      // Implementation depends on CMS API structure
      
      const responses: CMSResponse[] = [];
      
      // Placeholder for actual implementation
      logger.info('📝 Product updates feature to be implemented based on CMS structure');
      
      return responses;
    } catch (error) {
      logger.error('Error updating existing products:', error);
      throw error;
    }
  }

  /**
   * Rate limiting delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get CMS integration status
   */
  getStatus() {
    return {
      cmsApiUrl: this.cmsApiUrl,
      configured: !!(this.cmsApiUrl && this.cmsApiKey),
      imagesPath: this.imagesPath
    };
  }
}

// Export singleton instance
export const cmsIntegrationService = new CMSIntegrationService();