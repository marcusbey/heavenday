/**
 * `validate-create` middleware
 */

import { Strapi } from '@strapi/strapi';
import slugify from 'slugify';

export default (config, { strapi }: { strapi: Strapi }) => {
  return async (ctx, next) => {
    const { data } = ctx.request.body;

    // Validate required fields
    if (!data.name) {
      return ctx.badRequest('Product name is required');
    }

    if (!data.price || data.price <= 0) {
      return ctx.badRequest('Valid product price is required');
    }

    if (!data.sku) {
      return ctx.badRequest('Product SKU is required');
    }

    // Check for duplicate SKU
    const existingProduct = await strapi.entityService.findMany('api::product.product', {
      filters: { sku: data.sku },
      pagination: { limit: 1 },
    });

    if (existingProduct.length > 0) {
      return ctx.badRequest('Product with this SKU already exists');
    }

    // Generate slug if not provided
    if (!data.slug) {
      data.slug = slugify(data.name, { lower: true, strict: true });
      
      // Ensure unique slug
      let counter = 1;
      let originalSlug = data.slug;
      while (true) {
        const existingSlug = await strapi.entityService.findMany('api::product.product', {
          filters: { slug: data.slug },
          pagination: { limit: 1 },
        });
        
        if (existingSlug.length === 0) break;
        data.slug = `${originalSlug}-${counter}`;
        counter++;
      }
    }

    ctx.request.body.data = data;
    await next();
  };
};