export default ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET', 'defaultSecret'),
  },
  apiToken: {
    salt: env('API_TOKEN_SALT', 'defaultSalt'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT', 'defaultTransferSalt'),
    },
  },
  flags: {
    nps: env.bool('FLAG_NPS', true),
    promoteEE: env.bool('FLAG_PROMOTE_EE', true),
  },
  url: env('ADMIN_URL', '/admin'),
  serveAdminPanel: env.bool('SERVE_ADMIN', true),
  forgotPassword: {
    emailTemplate: {
      subject: 'Reset password',
      text: 'Hello, Please follow this link to reset your password: <%= URL %>',
      html: '<p>Hello,</p><p>Please follow this link to reset your password: <a href="<%= URL %>">Reset Password</a></p>',
    },
  },
});