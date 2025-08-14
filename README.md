# Heaven Dolls - Automated Marketplace

An AI-powered marketplace that automatically discovers trending products and creates a seamless shopping experience.

## Architecture

This is a monorepo built with:
- **Next.js 14+** with TypeScript and App Router
- **Tailwind CSS** with shadcn/ui components
- **tRPC** for type-safe APIs
- **Prisma** for database ORM
- **Turbo** for build orchestration

## Project Structure

```
heaven-dolls/
├── apps/
│   ├── web/                 # Next.js frontend
│   ├── cms/                 # Strapi CMS  
│   └── automation/          # Data sourcing scripts
├── packages/
│   ├── ui/                  # Shared UI components
│   ├── database/            # Prisma schema and utilities
│   └── types/               # Shared TypeScript types
├── scripts/
│   ├── trend-analysis/      # Google Trends automation
│   ├── product-scraping/    # Amazon/product sourcing
│   └── sheets-integration/  # Google Sheets tracking
└── tests/                   # E2E and integration tests
```

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Fill in your environment variables
   ```

3. **Set up the database:**
   ```bash
   npm run db:generate
   npm run db:push
   ```

4. **Start development:**
   ```bash
   npm run dev
   ```

## Available Commands

- `npm run dev` - Start all apps in development mode
- `npm run build` - Build all apps for production
- `npm run lint` - Lint all packages
- `npm run test` - Run all tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push database schema
- `npm run db:studio` - Open Prisma Studio

## Features

- 🔍 **Automated Trend Discovery** - AI-powered analysis of trending keywords
- 🛒 **Product Sourcing** - Automated scraping from major e-commerce platforms
- 📊 **Analytics Dashboard** - Real-time insights and performance tracking
- 🔗 **Google Sheets Integration** - Seamless data synchronization
- 🎨 **Modern UI** - Beautiful, responsive interface with shadcn/ui
- 🚀 **Type Safety** - End-to-end type safety with TypeScript and tRPC

## Development

Each app and package can be developed independently:

- **Web App**: `cd apps/web && npm run dev`
- **CMS**: `cd apps/cms && npm run develop`
- **Automation**: `cd apps/automation && npm run dev`

## Deployment

The project is configured for deployment on Vercel (frontend) and Railway/Heroku (backend services).

## License

MIT