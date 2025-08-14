export default {
  // Customize collection types
  collections: {
    'api::product.product': {
      tableHeaders: [
        'name',
        'sku',
        'price',
        'category',
        'brand',
        'status',
        'trending',
        'stockQuantity',
        'updatedAt'
      ],
      settings: {
        bulkable: true,
        filterable: true,
        searchable: true,
        pageSize: 20,
      },
    },
    'api::review.review': {
      tableHeaders: [
        'customerName',
        'rating',
        'title',
        'product',
        'status',
        'reviewSource',
        'createdAt'
      ],
      settings: {
        bulkable: true,
        filterable: true,
        searchable: true,
        pageSize: 25,
      },
    },
    'api::category.category': {
      tableHeaders: [
        'name',
        'parentCategory',
        'level',
        'productCount',
        'isActive',
        'isFeatured',
        'sortOrder'
      ],
      settings: {
        bulkable: true,
        filterable: true,
        searchable: true,
        pageSize: 50,
      },
    },
    'api::brand.brand': {
      tableHeaders: [
        'name',
        'productCount',
        'country',
        'isActive',
        'isFeatured',
        'averageRating'
      ],
      settings: {
        bulkable: true,
        filterable: true,
        searchable: true,
        pageSize: 50,
      },
    },
  },
};