export default ({ env }) => ({
  // Documentation plugin configuration
  documentation: {
    enabled: true,
    config: {
      openapi: '3.0.0',
      info: {
        version: '1.0.0',
        title: 'Heaven Dolls CMS API',
        description: 'API documentation for Heaven Dolls marketplace CMS',
        termsOfService: 'YOUR_TERMS_OF_SERVICE_URL',
        contact: {
          name: 'Heaven Dolls Team',
          email: 'api@heaven-dolls.com',
          url: 'https://heaven-dolls.com'
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT'
        },
      },
      'x-strapi-config': {
        plugins: ['users-permissions', 'upload', 'i18n'],
        path: '/documentation',
      },
      servers: [
        {
          url: env('API_URL', 'http://localhost:1337/api'),
          description: 'Development server',
        },
      ],
      externalDocs: {
        description: 'Find out more',
        url: 'https://docs.strapi.io/developer-docs/latest/getting-started/introduction.html'
      },
      security: [
        {
          bearerAuth: []
        }
      ]
    }
  },

  // GraphQL plugin configuration
  graphql: {
    enabled: true,
    config: {
      endpoint: '/graphql',
      shadowCRUD: true,
      playgroundAlways: env.bool('GRAPHQL_PLAYGROUND', false),
      depthLimit: env.int('GRAPHQL_DEPTH_LIMIT', 10),
      amountLimit: env.int('GRAPHQL_AMOUNT_LIMIT', 100),
      apolloServer: {
        tracing: env.bool('GRAPHQL_TRACING', false),
        introspection: env.bool('GRAPHQL_INTROSPECTION', true),
      },
    }
  },

  // Upload plugin configuration
  upload: {
    enabled: true,
    config: {
      sizeLimit: env.int('MAX_FILE_SIZE', 200 * 1024 * 1024), // 200mb
      provider: env('UPLOAD_PROVIDER', 'local'),
      providerOptions: {
        ...(env('UPLOAD_PROVIDER') === 'aws-s3' && {
          accessKeyId: env('AWS_ACCESS_KEY_ID'),
          secretAccessKey: env('AWS_ACCESS_SECRET'),
          region: env('AWS_REGION'),
          bucket: env('AWS_BUCKET'),
          upload: {
            ACL: null,
          },
          delete: {
            Bucket: env('AWS_BUCKET'),
          },
        }),
        ...(env('UPLOAD_PROVIDER') === 'local' && {
          sizeLimit: env.int('MAX_FILE_SIZE', 200 * 1024 * 1024),
        }),
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      }
    }
  },

  // Internationalization plugin configuration
  i18n: {
    enabled: true,
    config: {
      defaultLocale: 'en',
      locales: ['en', 'fr', 'de', 'es', 'it', 'pt', 'ja', 'ko', 'zh'],
    }
  },

  // Users & Permissions plugin configuration
  'users-permissions': {
    enabled: true,
    config: {
      jwt: {
        expiresIn: '30d',
      },
      ratelimit: {
        enabled: true,
        max: 100,
        duration: 60000,
      },
    },
  },

  // Email plugin configuration
  email: {
    enabled: true,
    config: {
      provider: 'nodemailer',
      providerOptions: {
        host: env('SMTP_HOST', 'localhost'),
        port: env('SMTP_PORT', 587),
        auth: {
          user: env('SMTP_USERNAME'),
          pass: env('SMTP_PASSWORD'),
        },
      },
      settings: {
        defaultFrom: env('DEFAULT_FROM_EMAIL', 'noreply@heaven-dolls.com'),
        defaultReplyTo: env('DEFAULT_REPLY_TO_EMAIL', 'support@heaven-dolls.com'),
      },
    },
  },

  // Redis cache configuration
  redis: {
    enabled: env.bool('REDIS_ENABLED', false),
    config: {
      connections: {
        default: {
          connection: {
            host: env('REDIS_HOST', 'localhost'),
            port: env.int('REDIS_PORT', 6379),
            password: env('REDIS_PASSWORD'),
            database: env.int('REDIS_DATABASE', 0),
          },
          settings: {
            debug: env.bool('REDIS_DEBUG', false),
          },
        },
      },
    },
  },
});