/**
 * `populate-defaults` middleware
 */

import { Strapi } from '@strapi/strapi';

export default (config, { strapi }: { strapi: Strapi }) => {
  return async (ctx, next) => {
    // Set default populate if not specified
    if (!ctx.query.populate) {
      ctx.query.populate = {
        mainImage: true,
        category: {
          populate: ['image']
        },
        brand: {
          populate: ['logo']
        },
      };
    }

    await next();
  };
};