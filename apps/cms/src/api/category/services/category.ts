/**
 * category service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::category.category', ({ strapi }) => ({
  // Update product count for category
  async updateProductCount(categoryId: number) {
    const productCount = await strapi.db.query('api::product.product').count({
      where: {
        category: categoryId,
        publishedAt: { $notNull: true },
      },
    });

    await strapi.entityService.update('api::category.category', categoryId, {
      data: { productCount },
    });
  },

  // Build category path for breadcrumbs
  async buildPath(categoryId: number): Promise<string> {
    const category = await strapi.entityService.findOne('api::category.category', categoryId, {
      populate: ['parentCategory'],
    });

    if (!category) return '';

    const pathSegments = [category.name];
    let currentCategory = category;

    while (currentCategory.parentCategory) {
      currentCategory = await strapi.entityService.findOne('api::category.category', currentCategory.parentCategory.id, {
        populate: ['parentCategory'],
      });
      pathSegments.unshift(currentCategory.name);
    }

    return pathSegments.join(' > ');
  },

  // Get category hierarchy with all children
  async getHierarchy(categoryId?: number) {
    const filters: any = {
      isActive: true,
    };

    if (categoryId) {
      filters.parentCategory = categoryId;
    } else {
      filters.parentCategory = null;
    }

    const categories = await strapi.entityService.findMany('api::category.category', {
      filters,
      populate: {
        image: true,
        icon: true,
        childCategories: {
          populate: ['image', 'icon'],
          filters: { isActive: true },
          sort: ['sortOrder:asc', 'name:asc']
        }
      },
      sort: ['sortOrder:asc', 'name:asc'],
    });

    // Recursively populate children
    for (const category of categories) {
      if (category.childCategories?.length > 0) {
        for (const child of category.childCategories) {
          child.childCategories = await this.getHierarchy(child.id);
        }
      }
    }

    return categories;
  },
}));