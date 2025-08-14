export default ({ env }) => ({
  upload: {
    enabled: true,
    config: {
      provider: 'aws-s3',
      providerOptions: {
        accessKeyId: env('AWS_ACCESS_KEY_ID'),
        secretAccessKey: env('AWS_ACCESS_SECRET'),
        region: env('AWS_REGION'),
        bucket: env('AWS_BUCKET'),
        upload: {
          ACL: 'public-read',
        },
        delete: {
          Bucket: env('AWS_BUCKET'),
        },
      },
      actionOptions: {
        upload: {
          ACL: 'public-read',
        },
        uploadStream: {
          ACL: 'public-read',
        },
        delete: {},
      },
    },
  },
});