import type { StrapiApp } from '@strapi/strapi/admin';

export default {
  config: {
    auth: {
      logo: '/admin/logo.png',
    },
    head: {
      favicon: '/admin/favicon.ico',
    },
    locales: [
      'en',
      'fr',
      'de',
      'es',
    ],
    translations: {
      en: {
        'app.components.HomePage.welcome': 'Welcome to Heaven Dolls CMS!',
        'app.components.HomePage.welcome.again': 'Welcome back to Heaven Dolls CMS',
        'Auth.form.welcome.title': 'Welcome to Heaven Dolls',
        'Auth.form.welcome.subtitle': 'Manage your marketplace content',
        'global.content-manager': 'Content Manager',
        'HomePage.head.title': 'Heaven Dolls CMS',
      },
    },
    menu: {
      logo: '/admin/logo-mini.png',
    },
    tutorials: false,
    notifications: { releases: false },
  },
  
  bootstrap(app: StrapiApp) {
    console.log('Heaven Dolls CMS Admin loaded successfully!');
  },
};