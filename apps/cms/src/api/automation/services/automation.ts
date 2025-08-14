/**
 * automation service
 */

import axios from 'axios';
import slugify from 'slugify';

export default {
  // Process product data from automation pipeline
  async processProductData(productsData: any[]) {
    const results = [];
    const errors = [];

    for (let i = 0; i < productsData.length; i++) {
      try {
        const productData = productsData[i];
        
        // Transform data to match Strapi schema
        const transformedData = await this.transformProductData(productData);
        
        // Check if product already exists
        let existingProduct = null;
        if (transformedData.sku) {
          const existing = await strapi.entityService.findMany('api::product.product', {
            filters: { sku: transformedData.sku },
            pagination: { limit: 1 },
          });
          existingProduct = existing[0];
        }

        if (transformedData.externalId && !existingProduct) {
          const existing = await strapi.entityService.findMany('api::product.product', {
            filters: { externalId: transformedData.externalId },
            pagination: { limit: 1 },
          });
          existingProduct = existing[0];
        }

        let product;
        if (existingProduct) {
          // Update existing product
          product = await strapi.entityService.update('api::product.product', existingProduct.id, {
            data: {
              ...transformedData,
              lastScrapedAt: new Date(),
            },
          });
        } else {
          // Create new product
          product = await strapi.entityService.create('api::product.product', {
            data: {
              ...transformedData,
              lastScrapedAt: new Date(),
            },
          });
        }

        // Update trending score
        await strapi.service('api::product.product').updateTrendingScore(product.id);

        results.push({ 
          index: i, 
          id: product.id, 
          action: existingProduct ? 'updated' : 'created',
          success: true 
        });
      } catch (error) {
        errors.push({ index: i, error: error.message });
      }
    }

    return { results, errors };
  },

  // Process trending data updates
  async processTrendingData(trendingData: any[]) {
    const results = [];
    const errors = [];

    for (const data of trendingData) {
      try {
        const { productId, externalId, sku, trendingScore, searchVolume, socialMentions } = data;
        
        // Find product by ID, externalId, or SKU
        let product = null;
        if (productId) {
          product = await strapi.entityService.findOne('api::product.product', productId);
        } else if (externalId) {
          const products = await strapi.entityService.findMany('api::product.product', {
            filters: { externalId },
            pagination: { limit: 1 },
          });
          product = products[0];
        } else if (sku) {
          const products = await strapi.entityService.findMany('api::product.product', {
            filters: { sku },
            pagination: { limit: 1 },
          });
          product = products[0];
        }

        if (!product) {
          errors.push({ data, error: 'Product not found' });
          continue;
        }

        // Update trending data
        await strapi.entityService.update('api::product.product', product.id, {
          data: {
            trendingData: {
              trendingScore,
              searchVolume,
              socialMentions,
              lastUpdated: new Date(),
              dataSource: 'automation_pipeline',
            },
            trending: trendingScore >= 50,
          },
        });

        results.push({ productId: product.id, success: true });
      } catch (error) {
        errors.push({ data, error: error.message });
      }
    }

    return { results, errors };
  },

  // Process review data from external sources
  async processReviewData(reviewsData: any[]) {
    const results = [];
    const errors = [];

    for (const reviewData of reviewsData) {
      try {
        // Find product
        let product = null;
        if (reviewData.productSku) {
          const products = await strapi.entityService.findMany('api::product.product', {
            filters: { sku: reviewData.productSku },
            pagination: { limit: 1 },
          });
          product = products[0];
        }

        if (!product) {
          errors.push({ reviewData, error: 'Product not found' });
          continue;
        }

        // Check if review already exists
        const existingReview = await strapi.entityService.findMany('api::review.review', {
          filters: { 
            product: product.id,
            externalId: reviewData.externalId
          },
          pagination: { limit: 1 },
        });

        if (existingReview.length > 0) {
          results.push({ reviewId: existingReview[0].id, action: 'skipped' });
          continue;
        }

        // Create review
        const review = await strapi.entityService.create('api::review.review', {
          data: {
            product: product.id,
            customerName: reviewData.customerName,
            customerEmail: reviewData.customerEmail || 'anonymous@example.com',
            rating: reviewData.rating,
            title: reviewData.title,
            comment: reviewData.comment,
            reviewSource: reviewData.source || 'imported',
            externalId: reviewData.externalId,
            reviewDate: reviewData.reviewDate || new Date(),
            status: reviewData.verified ? 'approved' : 'pending',
            isVerifiedPurchase: reviewData.verified || false,
          },
        });

        // Update product average rating
        await strapi.service('api::product.product').updateAverageRating(product.id);

        results.push({ reviewId: review.id, action: 'created', success: true });
      } catch (error) {
        errors.push({ reviewData, error: error.message });
      }
    }

    return { results, errors };
  },

  // Process category data
  async processCategoryData(categoriesData: any[]) {
    const results = [];
    const errors = [];

    for (const categoryData of categoriesData) {
      try {
        // Check if category exists
        const existingCategory = await strapi.entityService.findMany('api::category.category', {
          filters: { slug: slugify(categoryData.name, { lower: true, strict: true }) },
          pagination: { limit: 1 },
        });

        let category;
        if (existingCategory.length > 0) {
          category = await strapi.entityService.update('api::category.category', existingCategory[0].id, {
            data: categoryData,
          });
          results.push({ id: category.id, action: 'updated' });
        } else {
          category = await strapi.entityService.create('api::category.category', {
            data: {
              ...categoryData,
              slug: slugify(categoryData.name, { lower: true, strict: true }),
            },
          });
          results.push({ id: category.id, action: 'created' });
        }
      } catch (error) {
        errors.push({ categoryData, error: error.message });
      }
    }

    return { results, errors };
  },

  // Process brand data
  async processBrandData(brandsData: any[]) {
    const results = [];
    const errors = [];

    for (const brandData of brandsData) {
      try {
        const existingBrand = await strapi.entityService.findMany('api::brand.brand', {
          filters: { slug: slugify(brandData.name, { lower: true, strict: true }) },
          pagination: { limit: 1 },
        });

        let brand;
        if (existingBrand.length > 0) {
          brand = await strapi.entityService.update('api::brand.brand', existingBrand[0].id, {
            data: brandData,
          });
          results.push({ id: brand.id, action: 'updated' });
        } else {
          brand = await strapi.entityService.create('api::brand.brand', {
            data: {
              ...brandData,
              slug: slugify(brandData.name, { lower: true, strict: true }),
            },
          });
          results.push({ id: brand.id, action: 'created' });
        }
      } catch (error) {
        errors.push({ brandData, error: error.message });
      }
    }

    return { results, errors };
  },

  // Transform product data from automation pipeline to Strapi format
  async transformProductData(rawData: any) {
    const transformed: any = {
      name: rawData.title || rawData.name,
      description: rawData.description,
      shortDescription: rawData.shortDescription || rawData.description?.substring(0, 500),
      price: parseFloat(rawData.price),
      originalPrice: rawData.originalPrice ? parseFloat(rawData.originalPrice) : null,
      sku: rawData.sku || rawData.asin || rawData.id,
      sourceUrl: rawData.url || rawData.sourceUrl,
      sourceMarketplace: rawData.marketplace || 'custom',
      externalId: rawData.externalId || rawData.asin || rawData.id,
      status: 'draft',
    };

    // Generate slug
    if (!transformed.slug) {
      transformed.slug = slugify(transformed.name, { lower: true, strict: true });
    }

    // Handle category mapping
    if (rawData.category) {
      const category = await this.findOrCreateCategory(rawData.category);
      transformed.category = category.id;
    }

    // Handle brand mapping
    if (rawData.brand) {
      const brand = await this.findOrCreateBrand(rawData.brand);
      transformed.brand = brand.id;
    }

    // Handle specifications
    if (rawData.specifications && Array.isArray(rawData.specifications)) {
      transformed.specifications = rawData.specifications.map(spec => ({
        name: spec.name,
        value: spec.value,
        unit: spec.unit,
        category: spec.category,
      }));
    }

    // Handle dimensions
    if (rawData.dimensions) {
      transformed.dimensions = {
        length: rawData.dimensions.length,
        width: rawData.dimensions.width,
        height: rawData.dimensions.height,
        unit: rawData.dimensions.unit || 'cm',
      };
    }

    return transformed;
  },

  // Find or create category
  async findOrCreateCategory(categoryName: string) {
    const slug = slugify(categoryName, { lower: true, strict: true });
    
    const existing = await strapi.entityService.findMany('api::category.category', {
      filters: { slug },
      pagination: { limit: 1 },
    });

    if (existing.length > 0) {
      return existing[0];
    }

    return await strapi.entityService.create('api::category.category', {
      data: {
        name: categoryName,
        slug,
        isActive: true,
      },
    });
  },

  // Find or create brand
  async findOrCreateBrand(brandName: string) {
    const slug = slugify(brandName, { lower: true, strict: true });
    
    const existing = await strapi.entityService.findMany('api::brand.brand', {
      filters: { slug },
      pagination: { limit: 1 },
    });

    if (existing.length > 0) {
      return existing[0];
    }

    return await strapi.entityService.create('api::brand.brand', {
      data: {
        name: brandName,
        slug,
        isActive: true,
      },
    });
  },

  // Bulk import products
  async bulkImportProducts(productsData: any[]) {
    return await this.processProductData(productsData);
  },

  // Update all trending scores
  async updateAllTrendingScores() {
    const products = await strapi.entityService.findMany('api::product.product', {
      filters: { publishedAt: { $notNull: true } },
      pagination: { limit: -1 }, // Get all products
    });

    const results = [];
    
    for (const product of products) {
      try {
        await strapi.service('api::product.product').updateTrendingScore(product.id);
        results.push({ productId: product.id, success: true });
      } catch (error) {
        results.push({ productId: product.id, error: error.message });
      }
    }

    return {
      total: products.length,
      success: results.filter(r => r.success).length,
      errors: results.filter(r => r.error).length,
    };
  },

  // Sync with Google Sheets
  async syncGoogleSheets(sheetId: string, range?: string) {
    // This would integrate with Google Sheets API
    // For now, return a placeholder implementation
    return {
      message: 'Google Sheets sync functionality to be implemented',
      sheetId,
      range: range || 'A:Z',
    };
  },

  // Get automation statistics
  async getStats() {
    const totalProducts = await strapi.db.query('api::product.product').count();
    const trendingProducts = await strapi.db.query('api::product.product').count({
      where: { trending: true },
    });
    const featuredProducts = await strapi.db.query('api::product.product').count({
      where: { featured: true },
    });
    const totalReviews = await strapi.db.query('api::review.review').count();
    const approvedReviews = await strapi.db.query('api::review.review').count({
      where: { status: 'approved' },
    });

    // Get products scraped in last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const recentlyScraped = await strapi.db.query('api::product.product').count({
      where: {
        lastScrapedAt: { $gte: yesterday },
      },
    });

    return {
      products: {
        total: totalProducts,
        trending: trendingProducts,
        featured: featuredProducts,
        recentlyScraped,
      },
      reviews: {
        total: totalReviews,
        approved: approvedReviews,
        pending: totalReviews - approvedReviews,
      },
      lastSync: new Date(),
    };
  },

  // Trigger trend analysis
  async triggerTrendAnalysis() {
    // This would trigger the external automation pipeline
    // For now, return a placeholder
    try {
      const automationUrl = process.env.AUTOMATION_WEBHOOK_URL;
      if (automationUrl) {
        await axios.post(`${automationUrl}/trigger-trends`, {
          timestamp: new Date(),
          source: 'cms',
        });
      }

      return {
        success: true,
        message: 'Trend analysis triggered successfully',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  },
};