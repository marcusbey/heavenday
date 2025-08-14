export default {
  async afterCreate(event) {
    const { result } = event;
    
    // Update product average rating if review is approved
    if (result.status === 'approved' && result.product) {
      await strapi.service('api::product.product').updateAverageRating(result.product.id);
    }
  },

  async afterUpdate(event) {
    const { result, params } = event;
    
    // Update product average rating if status changed to approved/rejected
    if (params.data.status && result.product) {
      await strapi.service('api::product.product').updateAverageRating(result.product.id);
    }
  },

  async afterDelete(event) {
    const { params } = event;
    
    // Get review with product relation before deletion
    const review = await strapi.entityService.findOne('api::review.review', params.where.id, {
      populate: ['product'],
    });
    
    // Update product average rating
    if (review?.product) {
      await strapi.service('api::product.product').updateAverageRating(review.product.id);
    }
  },
};