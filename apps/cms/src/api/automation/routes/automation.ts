export default {
  routes: [
    {
      method: 'POST',
      path: '/automation/webhook',
      handler: 'automation.webhook',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/automation/bulk-import-products',
      handler: 'automation.bulkImportProducts',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/automation/update-trending-scores',
      handler: 'automation.updateTrendingScores',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/automation/sync-google-sheets',
      handler: 'automation.syncGoogleSheets',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/automation/status',
      handler: 'automation.status',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/automation/trigger-trend-analysis',
      handler: 'automation.triggerTrendAnalysis',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};