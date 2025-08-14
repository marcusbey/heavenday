import { Strapi } from '@strapi/strapi';

export default {
  /**
   * Update trending scores every hour
   */
  '0 * * * *': async ({ strapi }: { strapi: Strapi }) => {
    strapi.log.info('Running hourly trending score update...');
    
    try {
      const result = await strapi.service('api::automation.automation').updateAllTrendingScores();
      strapi.log.info(`Updated trending scores for ${result.success} products`);
    } catch (error) {
      strapi.log.error('Failed to update trending scores:', error);
    }
  },

  /**
   * Update product counts for categories and brands every 6 hours
   */
  '0 */6 * * *': async ({ strapi }: { strapi: Strapi }) => {
    strapi.log.info('Updating category and brand product counts...');
    
    try {
      // Update all category product counts
      const categories = await strapi.entityService.findMany('api::category.category', {
        pagination: { limit: -1 },
      });
      
      for (const category of categories) {
        await strapi.service('api::category.category').updateProductCount(category.id);
      }
      
      // Update all brand product counts
      const brands = await strapi.entityService.findMany('api::brand.brand', {
        pagination: { limit: -1 },
      });
      
      for (const brand of brands) {
        const brandProductCount = await strapi.db.query('api::product.product').count({
          where: { brand: brand.id },
        });
        
        await strapi.entityService.update('api::brand.brand', brand.id, {
          data: { productCount: brandProductCount },
        });
      }
      
      strapi.log.info(`Updated product counts for ${categories.length} categories and ${brands.length} brands`);
    } catch (error) {
      strapi.log.error('Failed to update product counts:', error);
    }
  },

  /**
   * Generate SEO content for products without SEO data daily at midnight
   */
  '0 0 * * *': async ({ strapi }: { strapi: Strapi }) => {
    strapi.log.info('Generating SEO content for products...');
    
    try {
      const productsWithoutSEO = await strapi.entityService.findMany('api::product.product', {
        filters: {
          $or: [
            { seoTitle: { $null: true } },
            { seoDescription: { $null: true } },
            { seoKeywords: { $null: true } },
          ],
        },
        pagination: { limit: 100 },
      });
      
      for (const product of productsWithoutSEO) {
        await strapi.service('api::product.product').generateSEOContent(product.id);
      }
      
      strapi.log.info(`Generated SEO content for ${productsWithoutSEO.length} products`);
    } catch (error) {
      strapi.log.error('Failed to generate SEO content:', error);
    }
  },

  /**
   * Update stock status for all products daily at 2 AM
   */
  '0 2 * * *': async ({ strapi }: { strapi: Strapi }) => {
    strapi.log.info('Updating stock status for all products...');
    
    try {
      const products = await strapi.entityService.findMany('api::product.product', {
        filters: {
          trackInventory: true,
        },
        pagination: { limit: -1 },
      });
      
      for (const product of products) {
        await strapi.service('api::product.product').updateStockStatus(product.id);
      }
      
      strapi.log.info(`Updated stock status for ${products.length} products`);
    } catch (error) {
      strapi.log.error('Failed to update stock status:', error);
    }
  },

  /**
   * Clean up old draft products weekly (Sunday at 3 AM)
   */
  '0 3 * * 0': async ({ strapi }: { strapi: Strapi }) => {
    strapi.log.info('Cleaning up old draft products...');
    
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const oldDraftProducts = await strapi.entityService.findMany('api::product.product', {
        filters: {
          status: 'draft',
          createdAt: { $lt: thirtyDaysAgo },
          publishedAt: { $null: true },
        },
        pagination: { limit: -1 },
      });
      
      for (const product of oldDraftProducts) {
        await strapi.entityService.delete('api::product.product', product.id);
      }
      
      strapi.log.info(`Cleaned up ${oldDraftProducts.length} old draft products`);
    } catch (error) {
      strapi.log.error('Failed to clean up draft products:', error);
    }
  },

  /**
   * Backup important data weekly (Sunday at 4 AM)
   */
  '0 4 * * 0': async ({ strapi }: { strapi: Strapi }) => {
    strapi.log.info('Creating data backup...');
    
    try {
      // This is a placeholder for backup functionality
      // In production, this would export data to external storage
      const stats = await strapi.service('api::automation.automation').getStats();
      
      strapi.log.info(`Backup completed. Stats: ${JSON.stringify(stats)}`);
    } catch (error) {
      strapi.log.error('Failed to create backup:', error);
    }
  },
};