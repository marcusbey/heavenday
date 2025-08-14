export default {
  routes: [
    {
      method: 'POST',
      path: '/products/bulk-create',
      handler: 'product.bulkCreate',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/products/search',
      handler: 'product.search',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/products/trending',
      handler: 'product.trending',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/products/featured',
      handler: 'product.featured',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/products/:id/increment-view',
      handler: 'product.incrementView',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/products/:id/increment-purchase',
      handler: 'product.incrementPurchase',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/products/:id/increment-wishlist',
      handler: 'product.incrementWishlist',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};