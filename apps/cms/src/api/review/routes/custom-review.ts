export default {
  routes: [
    {
      method: 'PUT',
      path: '/reviews/:id/helpful',
      handler: 'review.markHelpful',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/reviews/:id/not-helpful',
      handler: 'review.markNotHelpful',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/reviews/product/:productId',
      handler: 'review.byProduct',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/reviews/product/:productId/stats',
      handler: 'review.productStats',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};