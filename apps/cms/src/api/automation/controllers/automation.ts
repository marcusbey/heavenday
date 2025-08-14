/**
 * automation controller
 */

import { Context } from 'koa';

export default {
  // Webhook endpoint for automation pipeline
  async webhook(ctx: Context) {
    const { body } = ctx.request;
    const { type, data } = body;

    try {
      switch (type) {
        case 'product_data':
          await strapi.service('api::automation.automation').processProductData(data);
          break;
        case 'trending_data':
          await strapi.service('api::automation.automation').processTrendingData(data);
          break;
        case 'review_data':
          await strapi.service('api::automation.automation').processReviewData(data);
          break;
        case 'category_data':
          await strapi.service('api::automation.automation').processCategoryData(data);
          break;
        case 'brand_data':
          await strapi.service('api::automation.automation').processBrandData(data);
          break;
        default:
          return ctx.badRequest(`Unknown webhook type: ${type}`);
      }

      return ctx.send({ success: true, message: 'Data processed successfully' });
    } catch (error) {
      strapi.log.error('Automation webhook error:', error);
      return ctx.internalServerError('Failed to process automation data');
    }
  },

  // Bulk import products from automation pipeline
  async bulkImportProducts(ctx: Context) {
    const { products } = ctx.request.body;

    if (!Array.isArray(products)) {
      return ctx.badRequest('Products must be an array');
    }

    try {
      const result = await strapi.service('api::automation.automation').bulkImportProducts(products);
      return ctx.send(result);
    } catch (error) {
      strapi.log.error('Bulk import error:', error);
      return ctx.internalServerError('Failed to import products');
    }
  },

  // Update trending scores for all products
  async updateTrendingScores(ctx: Context) {
    try {
      const result = await strapi.service('api::automation.automation').updateAllTrendingScores();
      return ctx.send(result);
    } catch (error) {
      strapi.log.error('Update trending scores error:', error);
      return ctx.internalServerError('Failed to update trending scores');
    }
  },

  // Sync with Google Sheets
  async syncGoogleSheets(ctx: Context) {
    const { sheetId, range } = ctx.request.body;

    if (!sheetId) {
      return ctx.badRequest('Sheet ID is required');
    }

    try {
      const result = await strapi.service('api::automation.automation').syncGoogleSheets(sheetId, range);
      return ctx.send(result);
    } catch (error) {
      strapi.log.error('Google Sheets sync error:', error);
      return ctx.internalServerError('Failed to sync with Google Sheets');
    }
  },

  // Get automation status and statistics
  async status(ctx: Context) {
    try {
      const stats = await strapi.service('api::automation.automation').getStats();
      return ctx.send(stats);
    } catch (error) {
      strapi.log.error('Get automation status error:', error);
      return ctx.internalServerError('Failed to get automation status');
    }
  },

  // Manual trigger for trend analysis
  async triggerTrendAnalysis(ctx: Context) {
    try {
      const result = await strapi.service('api::automation.automation').triggerTrendAnalysis();
      return ctx.send(result);
    } catch (error) {
      strapi.log.error('Trend analysis trigger error:', error);
      return ctx.internalServerError('Failed to trigger trend analysis');
    }
  },
};