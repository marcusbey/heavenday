export default {
  async afterCreate(event) {
    const { result } = event;
    
    // Generate SEO content
    await strapi.service('api::product.product').generateSEOContent(result.id);
    
    // Update category product count
    if (result.category) {
      await strapi.service('api::category.category').updateProductCount(result.category.id);
    }
    
    // Update brand product count
    if (result.brand) {
      const brandProductCount = await strapi.db.query('api::product.product').count({
        where: { brand: result.brand.id },
      });
      
      await strapi.entityService.update('api::brand.brand', result.brand.id, {
        data: { productCount: brandProductCount },
      });
    }
  },

  async afterUpdate(event) {
    const { result, params } = event;
    
    // Update trending score if relevant data changed
    const relevantFields = ['viewCount', 'purchaseCount', 'wishlistCount', 'averageRating'];
    const hasRelevantChanges = relevantFields.some(field => 
      params.data[field] !== undefined
    );
    
    if (hasRelevantChanges) {
      await strapi.service('api::product.product').updateTrendingScore(result.id);
    }
    
    // Update stock status if inventory changed
    if (params.data.stockQuantity !== undefined) {
      await strapi.service('api::product.product').updateStockStatus(result.id);
    }
    
    // Update category product counts if category changed
    if (params.data.category !== undefined) {
      // Update new category
      if (result.category) {
        await strapi.service('api::category.category').updateProductCount(result.category.id);
      }
      
      // Update old category if it was changed
      const originalProduct = await strapi.entityService.findOne('api::product.product', result.id, {
        populate: ['category'],
      });
      
      if (originalProduct?.category?.id && originalProduct.category.id !== result.category?.id) {
        await strapi.service('api::category.category').updateProductCount(originalProduct.category.id);
      }
    }
  },

  async beforeDelete(event) {
    const { params } = event;
    
    // Get product with relations before deletion
    const product = await strapi.entityService.findOne('api::product.product', params.where.id, {
      populate: ['category', 'brand'],
    });
    
    // Store for afterDelete hook
    event.state = { product };
  },

  async afterDelete(event) {
    const { product } = event.state || {};
    
    if (product) {
      // Update category product count
      if (product.category) {
        await strapi.service('api::category.category').updateProductCount(product.category.id);
      }
      
      // Update brand product count
      if (product.brand) {
        const brandProductCount = await strapi.db.query('api::product.product').count({
          where: { brand: product.brand.id },
        });
        
        await strapi.entityService.update('api::brand.brand', product.brand.id, {
          data: { productCount: brandProductCount },
        });
      }
    }
  },
};