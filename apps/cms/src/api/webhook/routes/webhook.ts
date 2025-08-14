export default {
  routes: [
    {
      method: 'POST',
      path: '/webhooks/products',
      handler: 'webhook.productWebhook',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/webhooks/reviews',
      handler: 'webhook.reviewWebhook',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/webhooks/health',
      handler: 'webhook.healthCheck',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};