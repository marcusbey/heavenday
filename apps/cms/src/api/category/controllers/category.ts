/**
 * category controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::category.category', ({ strapi }) => ({
  async find(ctx) {
    const { query } = ctx;
    
    const modifiedQuery = {
      ...query,
      populate: {
        image: true,
        icon: true,
        banner: true,
        parentCategory: true,
        childCategories: {
          populate: ['image', 'icon']
        },
        filters: true,
        ...query.populate,
      },
      sort: query.sort || ['sortOrder:asc', 'name:asc'],
    };

    ctx.query = modifiedQuery;
    return await super.find(ctx);
  },

  async findOne(ctx) {
    const { query } = ctx;
    
    const modifiedQuery = {
      ...query,
      populate: {
        image: true,
        icon: true,
        banner: true,
        parentCategory: true,
        childCategories: {
          populate: ['image', 'icon'],
          sort: ['sortOrder:asc', 'name:asc']
        },
        subCategories: {
          populate: ['image'],
          sort: ['sortOrder:asc', 'name:asc']
        },
        products: {
          populate: ['mainImage', 'brand'],
          filters: { publishedAt: { $notNull: true } },
          pagination: { limit: 12 }
        },
        filters: true,
        ...query.populate,
      },
    };

    ctx.query = modifiedQuery;
    return await super.findOne(ctx);
  },

  // Get category tree/hierarchy
  async tree(ctx) {
    const categories = await strapi.entityService.findMany('api::category.category', {
      filters: {
        parentCategory: null,
        isActive: true,
        showInNavigation: true,
      },
      populate: {
        image: true,
        icon: true,
        childCategories: {
          populate: ['image', 'icon', 'childCategories'],
          filters: { isActive: true },
          sort: ['sortOrder:asc', 'name:asc']
        }
      },
      sort: ['sortOrder:asc', 'name:asc'],
    });

    return ctx.send(categories);
  },

  // Get featured categories
  async featured(ctx) {
    const categories = await strapi.entityService.findMany('api::category.category', {
      filters: {
        isFeatured: true,
        isActive: true,
      },
      populate: {
        image: true,
        icon: true,
        banner: true,
      },
      sort: ['sortOrder:asc', 'name:asc'],
      pagination: {
        limit: ctx.query.limit || 10,
      },
    });

    return ctx.send(categories);
  },
}));