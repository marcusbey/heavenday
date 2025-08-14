/**
 * review controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::review.review', ({ strapi }) => ({
  async find(ctx) {
    const { query } = ctx;
    
    const modifiedQuery = {
      ...query,
      filters: {
        ...query.filters,
        status: query.filters?.status || 'approved',
      },
      populate: {
        product: {
          populate: ['mainImage']
        },
        images: true,
        videos: true,
        tags: true,
        ...query.populate,
      },
      sort: query.sort || ['createdAt:desc'],
    };

    ctx.query = modifiedQuery;
    return await super.find(ctx);
  },

  async create(ctx) {
    const { data } = ctx.request.body;

    // Set default values
    data.status = data.status || 'pending';
    data.helpfulCount = 0;
    data.notHelpfulCount = 0;
    data.reviewDate = data.reviewDate || new Date();

    ctx.request.body.data = data;
    const result = await super.create(ctx);

    // Update product average rating
    if (data.product) {
      await strapi.service('api::product.product').updateAverageRating(data.product);
    }

    return result;
  },

  async update(ctx) {
    const { id } = ctx.params;
    const { data } = ctx.request.body;

    const result = await super.update(ctx);

    // If status changed to approved, update product rating
    if (data.status === 'approved') {
      const review = await strapi.entityService.findOne('api::review.review', id, {
        populate: ['product'],
      });
      
      if (review?.product) {
        await strapi.service('api::product.product').updateAverageRating(review.product.id);
      }
    }

    return result;
  },

  // Mark review as helpful
  async markHelpful(ctx) {
    const { id } = ctx.params;
    
    const review = await strapi.entityService.findOne('api::review.review', id);
    if (!review) {
      return ctx.notFound('Review not found');
    }

    const updatedReview = await strapi.entityService.update('api::review.review', id, {
      data: {
        helpfulCount: (review.helpfulCount || 0) + 1,
      },
    });

    return ctx.send(updatedReview);
  },

  // Mark review as not helpful
  async markNotHelpful(ctx) {
    const { id } = ctx.params;
    
    const review = await strapi.entityService.findOne('api::review.review', id);
    if (!review) {
      return ctx.notFound('Review not found');
    }

    const updatedReview = await strapi.entityService.update('api::review.review', id, {
      data: {
        notHelpfulCount: (review.notHelpfulCount || 0) + 1,
      },
    });

    return ctx.send(updatedReview);
  },

  // Get reviews by product
  async byProduct(ctx) {
    const { productId } = ctx.params;
    const { query } = ctx;

    const reviews = await strapi.entityService.findMany('api::review.review', {
      filters: {
        product: productId,
        status: 'approved',
      },
      populate: {
        images: true,
        videos: true,
        tags: true,
      },
      sort: query.sort || ['isHighlighted:desc', 'helpfulCount:desc', 'createdAt:desc'],
      pagination: {
        page: query.page || 1,
        pageSize: query.pageSize || 10,
      },
    });

    return ctx.send(reviews);
  },

  // Get review statistics for a product
  async productStats(ctx) {
    const { productId } = ctx.params;

    const reviews = await strapi.entityService.findMany('api::review.review', {
      filters: {
        product: productId,
        status: 'approved',
      },
    });

    const stats = {
      total: reviews.length,
      average: 0,
      distribution: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      },
    };

    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      stats.average = Math.round((totalRating / reviews.length) * 10) / 10;

      reviews.forEach(review => {
        stats.distribution[review.rating]++;
      });
    }

    return ctx.send(stats);
  },
}));