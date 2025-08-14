export default {
  routes: [
    {
      method: 'GET',
      path: '/categories/tree',
      handler: 'category.tree',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/categories/featured',
      handler: 'category.featured',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};