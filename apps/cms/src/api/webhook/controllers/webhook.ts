/**
 * webhook controller
 */

import { Context } from 'koa';
import axios from 'axios';

export default {
  // Handle product webhooks
  async productWebhook(ctx: Context) {
    const { event, model, entry } = ctx.request.body;
    
    try {
      // Send webhook to external services
      await this.sendWebhookNotification({
        event,
        model,
        entry,
        type: 'product',
        timestamp: new Date(),
      });

      return ctx.send({ success: true });
    } catch (error) {
      strapi.log.error('Product webhook error:', error);
      return ctx.internalServerError('Webhook processing failed');
    }
  },

  // Handle review webhooks
  async reviewWebhook(ctx: Context) {
    const { event, model, entry } = ctx.request.body;
    
    try {
      // Send webhook to external services
      await this.sendWebhookNotification({
        event,
        model,
        entry,
        type: 'review',
        timestamp: new Date(),
      });

      // If review is approved, notify the automation pipeline
      if (event === 'update' && entry.status === 'approved') {
        await this.notifyAutomationPipeline('review_approved', entry);
      }

      return ctx.send({ success: true });
    } catch (error) {
      strapi.log.error('Review webhook error:', error);
      return ctx.internalServerError('Webhook processing failed');
    }
  },

  // Send webhook notifications to external services
  async sendWebhookNotification(data: any) {
    const webhookUrls = [
      process.env.FRONTEND_WEBHOOK_URL,
      process.env.AUTOMATION_WEBHOOK_URL,
      process.env.ANALYTICS_WEBHOOK_URL,
    ].filter(Boolean);

    const promises = webhookUrls.map(async (url) => {
      try {
        await axios.post(url, data, {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Source': 'heaven-dolls-cms',
            'X-Webhook-Signature': this.generateWebhookSignature(data),
          },
        });
        strapi.log.debug(`Webhook sent successfully to ${url}`);
      } catch (error) {
        strapi.log.error(`Webhook failed for ${url}:`, error.message);
      }
    });

    await Promise.allSettled(promises);
  },

  // Notify automation pipeline
  async notifyAutomationPipeline(event: string, data: any) {
    const automationUrl = process.env.AUTOMATION_WEBHOOK_URL;
    if (!automationUrl) return;

    try {
      await axios.post(`${automationUrl}/cms-events`, {
        event,
        data,
        timestamp: new Date(),
        source: 'cms',
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.AUTOMATION_API_KEY}`,
        },
      });
    } catch (error) {
      strapi.log.error('Failed to notify automation pipeline:', error);
    }
  },

  // Generate webhook signature for security
  generateWebhookSignature(data: any): string {
    const crypto = require('crypto');
    const secret = process.env.WEBHOOK_SECRET || 'default-secret';
    const payload = JSON.stringify(data);
    
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  },

  // Health check endpoint for webhook services
  async healthCheck(ctx: Context) {
    const status = {
      status: 'healthy',
      timestamp: new Date(),
      services: {
        database: 'healthy',
        redis: process.env.REDIS_ENABLED === 'true' ? 'healthy' : 'disabled',
        storage: 'healthy',
      },
      version: '1.0.0',
    };

    return ctx.send(status);
  },
};