/**
 * product router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::product.product', {
  config: {
    find: {
      middlewares: ['api::product.populate-defaults'],
    },
    findOne: {
      middlewares: ['api::product.populate-defaults'],
    },
    create: {
      middlewares: ['api::product.validate-create'],
    },
    update: {
      middlewares: ['api::product.validate-update'],
    },
  },
});