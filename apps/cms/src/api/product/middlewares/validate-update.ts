/**
 * `validate-update` middleware
 */

import { Strapi } from '@strapi/strapi';
import slugify from 'slugify';

export default (config, { strapi }: { strapi: Strapi }) => {
  return async (ctx, next) => {
    const { id } = ctx.params;
    const { data } = ctx.request.body;

    // Validate price if provided
    if (data.price !== undefined && data.price <= 0) {
      return ctx.badRequest('Valid product price is required');
    }

    // Check for duplicate SKU if SKU is being updated
    if (data.sku) {
      const existingProduct = await strapi.entityService.findMany('api::product.product', {
        filters: { 
          sku: data.sku,
          id: { $ne: id }
        },
        pagination: { limit: 1 },
      });

      if (existingProduct.length > 0) {
        return ctx.badRequest('Product with this SKU already exists');
      }
    }

    // Update slug if name is being updated
    if (data.name) {
      const newSlug = slugify(data.name, { lower: true, strict: true });
      
      // Check if slug needs to be updated
      const currentProduct = await strapi.entityService.findOne('api::product.product', id);
      if (currentProduct?.slug !== newSlug) {
        data.slug = newSlug;
        
        // Ensure unique slug
        let counter = 1;
        let originalSlug = data.slug;
        while (true) {
          const existingSlug = await strapi.entityService.findMany('api::product.product', {
            filters: { 
              slug: data.slug,
              id: { $ne: id }
            },
            pagination: { limit: 1 },
          });
          
          if (existingSlug.length === 0) break;
          data.slug = `${originalSlug}-${counter}`;
          counter++;
        }
      }
    }

    ctx.request.body.data = data;
    await next();
  };
};