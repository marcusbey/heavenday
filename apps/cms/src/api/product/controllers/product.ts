/**
 * product controller
 */

import { factories } from '@strapi/strapi';
import { Context } from 'koa';

export default factories.createCoreController('api::product.product', ({ strapi }) => ({
  // Custom find method with advanced filtering
  async find(ctx: Context) {
    const { query } = ctx;
    
    // Add custom filters
    const filters = {
      ...query.filters,
      publishedAt: { $notNull: true },
    };

    // Handle trending products filter
    if (query.trending === 'true') {
      filters.trending = true;
    }

    // Handle featured products filter
    if (query.featured === 'true') {
      filters.featured = true;
    }

    // Handle status filter
    if (query.status) {
      filters.status = query.status;
    }

    // Handle price range filter
    if (query.priceMin || query.priceMax) {
      filters.price = {};
      if (query.priceMin) {
        filters.price.$gte = parseFloat(query.priceMin);
      }
      if (query.priceMax) {
        filters.price.$lte = parseFloat(query.priceMax);
      }
    }

    // Handle category filter
    if (query.category) {
      if (Array.isArray(query.category)) {
        filters.category = { id: { $in: query.category } };
      } else {
        filters.category = { id: query.category };
      }
    }

    // Handle brand filter
    if (query.brand) {
      if (Array.isArray(query.brand)) {
        filters.brand = { id: { $in: query.brand } };
      } else {
        filters.brand = { id: query.brand };
      }
    }

    // Handle search query
    if (query.search) {
      filters.$or = [
        { name: { $containsi: query.search } },
        { description: { $containsi: query.search } },
        { shortDescription: { $containsi: query.search } },
        { sku: { $containsi: query.search } },
      ];
    }

    const modifiedQuery = {
      ...query,
      filters,
      populate: {
        mainImage: true,
        images: true,
        category: {
          populate: ['image']
        },
        brand: {
          populate: ['logo']
        },
        variants: {
          populate: ['mainImage', 'images']
        },
        tags: true,
        trendingData: true,
        ...query.populate,
      },
      sort: query.sort || ['createdAt:desc'],
    };

    ctx.query = modifiedQuery;
    return await super.find(ctx);
  },

  // Custom findOne with full population
  async findOne(ctx: Context) {
    const { id } = ctx.params;
    const { query } = ctx;

    const modifiedQuery = {
      ...query,
      populate: {
        mainImage: true,
        images: true,
        videos: true,
        gallery: {
          populate: ['images', 'videos']
        },
        category: {
          populate: ['image', 'parentCategory']
        },
        subCategories: true,
        brand: {
          populate: ['logo', 'banner']
        },
        variants: {
          populate: ['mainImage', 'images', 'attributes']
        },
        tags: true,
        reviews: {
          populate: ['images'],
          filters: { status: 'approved' },
          sort: ['createdAt:desc'],
          pagination: { limit: 10 }
        },
        specifications: true,
        materials: true,
        dimensions: true,
        shippingInfo: true,
        trendingData: true,
        relatedProducts: {
          populate: ['mainImage', 'brand'],
          filters: { publishedAt: { $notNull: true } },
          pagination: { limit: 8 }
        },
        ...query.populate,
      },
    };

    ctx.query = modifiedQuery;
    
    // Increment view count
    const product = await strapi.entityService.findOne('api::product.product', id);
    if (product) {
      await strapi.entityService.update('api::product.product', id, {
        data: {
          viewCount: (product.viewCount || 0) + 1,
        },
      });
    }

    return await super.findOne(ctx);
  },

  // Custom create method with slug generation and validation
  async create(ctx: Context) {
    const { data } = ctx.request.body;

    // Generate slug if not provided
    if (!data.slug && data.name) {
      const slugify = require('slugify');
      data.slug = slugify(data.name, { lower: true, strict: true });
      
      // Ensure unique slug
      let counter = 1;
      let originalSlug = data.slug;
      while (true) {
        const existingProduct = await strapi.entityService.findMany('api::product.product', {
          filters: { slug: data.slug },
          pagination: { limit: 1 },
        });
        
        if (existingProduct.length === 0) break;
        data.slug = `${originalSlug}-${counter}`;
        counter++;
      }
    }

    // Set default values
    data.status = data.status || 'draft';
    data.trackInventory = data.trackInventory !== undefined ? data.trackInventory : true;
    data.stockQuantity = data.stockQuantity || 0;
    data.lowStockThreshold = data.lowStockThreshold || 10;
    data.viewCount = 0;
    data.purchaseCount = 0;
    data.wishlistCount = 0;
    data.reviewCount = 0;

    ctx.request.body.data = data;
    return await super.create(ctx);
  },

  // Custom update method with automatic calculations
  async update(ctx: Context) {
    const { id } = ctx.params;
    const { data } = ctx.request.body;

    // Calculate discount percentage if both prices are provided
    if (data.price && data.originalPrice) {
      data.discountPercentage = ((data.originalPrice - data.price) / data.originalPrice) * 100;
    }

    // Update slug if name changed
    if (data.name) {
      const slugify = require('slugify');
      const newSlug = slugify(data.name, { lower: true, strict: true });
      
      // Check if slug needs to be updated
      const currentProduct = await strapi.entityService.findOne('api::product.product', id);
      if (currentProduct?.slug !== newSlug) {
        data.slug = newSlug;
        
        // Ensure unique slug
        let counter = 1;
        let originalSlug = data.slug;
        while (true) {
          const existingProduct = await strapi.entityService.findMany('api::product.product', {
            filters: { 
              slug: data.slug,
              id: { $ne: id }
            },
            pagination: { limit: 1 },
          });
          
          if (existingProduct.length === 0) break;
          data.slug = `${originalSlug}-${counter}`;
          counter++;
        }
      }
    }

    ctx.request.body.data = data;
    return await super.update(ctx);
  },

  // Bulk operations
  async bulkCreate(ctx: Context) {
    const { data } = ctx.request.body;
    
    if (!Array.isArray(data)) {
      return ctx.badRequest('Data must be an array');
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      try {
        const productData = data[i];
        
        // Generate slug
        if (!productData.slug && productData.name) {
          const slugify = require('slugify');
          productData.slug = slugify(productData.name, { lower: true, strict: true });
        }

        const product = await strapi.entityService.create('api::product.product', {
          data: productData,
        });
        
        results.push({ index: i, id: product.id, success: true });
      } catch (error) {
        errors.push({ index: i, error: error.message });
      }
    }

    return ctx.send({
      results,
      errors,
      summary: {
        total: data.length,
        success: results.length,
        failed: errors.length,
      },
    });
  },

  // Search products
  async search(ctx: Context) {
    const { query } = ctx.query;
    
    if (!query) {
      return ctx.badRequest('Search query is required');
    }

    const products = await strapi.entityService.findMany('api::product.product', {
      filters: {
        $or: [
          { name: { $containsi: query } },
          { description: { $containsi: query } },
          { shortDescription: { $containsi: query } },
          { sku: { $containsi: query } },
        ],
        publishedAt: { $notNull: true },
        status: 'active',
      },
      populate: {
        mainImage: true,
        brand: {
          populate: ['logo']
        },
        category: true,
      },
      sort: ['trendingScore:desc', 'createdAt:desc'],
      pagination: {
        limit: ctx.query.limit || 20,
      },
    });

    return ctx.send(products);
  },

  // Get trending products
  async trending(ctx: Context) {
    const products = await strapi.entityService.findMany('api::product.product', {
      filters: {
        trending: true,
        publishedAt: { $notNull: true },
        status: 'active',
      },
      populate: {
        mainImage: true,
        brand: {
          populate: ['logo']
        },
        category: true,
        trendingData: true,
      },
      sort: ['trendingScore:desc'],
      pagination: {
        limit: ctx.query.limit || 50,
      },
    });

    return ctx.send(products);
  },

  // Get featured products
  async featured(ctx: Context) {
    const products = await strapi.entityService.findMany('api::product.product', {
      filters: {
        featured: true,
        publishedAt: { $notNull: true },
        status: 'active',
      },
      populate: {
        mainImage: true,
        brand: {
          populate: ['logo']
        },
        category: true,
      },
      sort: ['createdAt:desc'],
      pagination: {
        limit: ctx.query.limit || 20,
      },
    });

    return ctx.send(products);
  },
}));