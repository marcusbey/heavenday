/**
 * product service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::product.product', ({ strapi }) => ({
  // Calculate average rating based on reviews
  async updateAverageRating(productId: number) {
    const reviews = await strapi.entityService.findMany('api::review.review', {
      filters: {
        product: productId,
        status: 'approved',
      },
    });

    if (reviews.length === 0) {
      await strapi.entityService.update('api::product.product', productId, {
        data: {
          averageRating: null,
          reviewCount: 0,
        },
      });
      return;
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    await strapi.entityService.update('api::product.product', productId, {
      data: {
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
        reviewCount: reviews.length,
      },
    });
  },

  // Update trending score based on various metrics
  async updateTrendingScore(productId: number) {
    const product = await strapi.entityService.findOne('api::product.product', productId, {
      populate: ['reviews', 'trendingData'],
    });

    if (!product) return;

    let trendingScore = 0;

    // View count contribution (0-25 points)
    const viewScore = Math.min((product.viewCount || 0) / 1000 * 25, 25);
    trendingScore += viewScore;

    // Purchase count contribution (0-30 points)
    const purchaseScore = Math.min((product.purchaseCount || 0) / 100 * 30, 30);
    trendingScore += purchaseScore;

    // Wishlist count contribution (0-15 points)
    const wishlistScore = Math.min((product.wishlistCount || 0) / 200 * 15, 15);
    trendingScore += wishlistScore;

    // Rating contribution (0-15 points)
    if (product.averageRating) {
      const ratingScore = (product.averageRating / 5) * 15;
      trendingScore += ratingScore;
    }

    // Recent activity boost (0-15 points)
    const now = new Date();
    const createdAt = new Date(product.createdAt);
    const daysDiff = (now.getTime() - createdAt.getTime()) / (1000 * 3600 * 24);
    const recencyScore = Math.max(15 - (daysDiff / 30) * 15, 0);
    trendingScore += recencyScore;

    // External trending data (if available)
    if (product.trendingData?.demandScore) {
      trendingScore = (trendingScore + product.trendingData.demandScore) / 2;
    }

    // Update trending status
    const trending = trendingScore >= 50;

    await strapi.entityService.update('api::product.product', productId, {
      data: {
        trendingScore: Math.round(trendingScore * 10) / 10,
        trending,
      },
    });
  },

  // Update stock status based on quantity
  async updateStockStatus(productId: number) {
    const product = await strapi.entityService.findOne('api::product.product', productId);
    
    if (!product) return;

    let newStatus = product.status;

    if (product.trackInventory && product.stockQuantity <= 0) {
      newStatus = 'out_of_stock';
    } else if (product.status === 'out_of_stock' && product.stockQuantity > 0) {
      newStatus = 'active';
    }

    if (newStatus !== product.status) {
      await strapi.entityService.update('api::product.product', productId, {
        data: { status: newStatus },
      });
    }
  },

  // Get related products based on category, brand, and tags
  async getRelatedProducts(productId: number, limit = 8) {
    const product = await strapi.entityService.findOne('api::product.product', productId, {
      populate: ['category', 'brand', 'tags'],
    });

    if (!product) return [];

    const filters: any = {
      id: { $ne: productId },
      publishedAt: { $notNull: true },
      status: 'active',
    };

    // Priority: same category and brand
    let relatedProducts = await strapi.entityService.findMany('api::product.product', {
      filters: {
        ...filters,
        category: product.category?.id,
        brand: product.brand?.id,
      },
      populate: ['mainImage', 'brand'],
      pagination: { limit: Math.ceil(limit / 2) },
      sort: ['trendingScore:desc'],
    });

    // If not enough, add products from same category
    if (relatedProducts.length < limit && product.category) {
      const categoryProducts = await strapi.entityService.findMany('api::product.product', {
        filters: {
          ...filters,
          category: product.category.id,
          id: { $notIn: [productId, ...relatedProducts.map(p => p.id)] },
        },
        populate: ['mainImage', 'brand'],
        pagination: { limit: limit - relatedProducts.length },
        sort: ['trendingScore:desc'],
      });
      
      relatedProducts = [...relatedProducts, ...categoryProducts];
    }

    // If still not enough, add products with similar tags
    if (relatedProducts.length < limit && product.tags?.length > 0) {
      const taggedProducts = await strapi.entityService.findMany('api::product.product', {
        filters: {
          ...filters,
          tags: { id: { $in: product.tags.map(tag => tag.id) } },
          id: { $notIn: [productId, ...relatedProducts.map(p => p.id)] },
        },
        populate: ['mainImage', 'brand'],
        pagination: { limit: limit - relatedProducts.length },
        sort: ['trendingScore:desc'],
      });
      
      relatedProducts = [...relatedProducts, ...taggedProducts];
    }

    return relatedProducts.slice(0, limit);
  },

  // Bulk import products from external sources
  async bulkImport(productsData: any[], options = {}) {
    const results = [];
    const errors = [];

    for (let i = 0; i < productsData.length; i++) {
      try {
        const productData = productsData[i];
        
        // Check if product already exists by SKU or external ID
        let existingProduct = null;
        if (productData.sku) {
          existingProduct = await strapi.entityService.findMany('api::product.product', {
            filters: { sku: productData.sku },
            pagination: { limit: 1 },
          });
        }

        if (productData.externalId && !existingProduct?.length) {
          existingProduct = await strapi.entityService.findMany('api::product.product', {
            filters: { externalId: productData.externalId },
            pagination: { limit: 1 },
          });
        }

        let product;
        if (existingProduct?.length > 0) {
          // Update existing product
          product = await strapi.entityService.update('api::product.product', existingProduct[0].id, {
            data: {
              ...productData,
              lastScrapedAt: new Date(),
            },
          });
        } else {
          // Create new product
          product = await strapi.entityService.create('api::product.product', {
            data: {
              ...productData,
              lastScrapedAt: new Date(),
              status: productData.status || 'draft',
            },
          });
        }

        results.push({ 
          index: i, 
          id: product.id, 
          action: existingProduct?.length > 0 ? 'updated' : 'created',
          success: true 
        });
      } catch (error) {
        errors.push({ index: i, error: error.message });
      }
    }

    return {
      results,
      errors,
      summary: {
        total: productsData.length,
        created: results.filter(r => r.action === 'created').length,
        updated: results.filter(r => r.action === 'updated').length,
        failed: errors.length,
      },
    };
  },

  // Generate SEO content automatically
  async generateSEOContent(productId: number) {
    const product = await strapi.entityService.findOne('api::product.product', productId, {
      populate: ['category', 'brand', 'tags'],
    });

    if (!product) return;

    const updateData: any = {};

    // Generate SEO title if not exists
    if (!product.seoTitle) {
      let seoTitle = product.name;
      if (product.brand?.name) {
        seoTitle += ` - ${product.brand.name}`;
      }
      if (product.category?.name) {
        seoTitle += ` | ${product.category.name}`;
      }
      updateData.seoTitle = seoTitle.substring(0, 60);
    }

    // Generate SEO description if not exists
    if (!product.seoDescription) {
      let seoDescription = product.shortDescription || product.description;
      if (seoDescription) {
        // Strip HTML and limit to 160 characters
        seoDescription = seoDescription.replace(/<[^>]*>/g, '');
        updateData.seoDescription = seoDescription.substring(0, 160);
      }
    }

    // Generate SEO keywords if not exists
    if (!product.seoKeywords) {
      const keywords = [];
      keywords.push(product.name);
      if (product.brand?.name) keywords.push(product.brand.name);
      if (product.category?.name) keywords.push(product.category.name);
      if (product.tags?.length > 0) {
        keywords.push(...product.tags.map(tag => tag.name));
      }
      updateData.seoKeywords = keywords.join(', ');
    }

    if (Object.keys(updateData).length > 0) {
      await strapi.entityService.update('api::product.product', productId, {
        data: updateData,
      });
    }
  },
}));