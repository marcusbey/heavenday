# Heaven-Dolls 🌟 - Automated Adult Products Marketplace

A fully automated dropshipping marketplace that discovers trending adult products and creates beautiful, conversion-optimized listings with minimal manual intervention.

## 🚀 Quick Start

### **Installation**

```bash
# Clone the repository
git clone https://github.com/marcusbey/heavenday.git
cd heavenday

# Install dependencies
npm install --legacy-peer-deps

# Start the application
npm run dev
```

### **Access Points**
- **🌐 Website**: http://localhost:3000
- **⚙️ CMS Admin**: http://localhost:1337/admin  
- **📊 Test Pages**: http://localhost:3000/test

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Automation    │────▶│   Strapi CMS    │◀────│   Next.js Web   │
│  (Data Source)  │     │  (Data Store)   │     │   (Frontend)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                         │
         └───────────────────────┼─────────────────────────┘
                                 ▼
                        ┌─────────────────┐
                        │  Google Sheets  │
                        │   (Analytics)   │
                        └─────────────────┘
```

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Strapi CMS, Node.js, PostgreSQL
- **Testing**: Jest, Playwright, 95%+ coverage
- **Infrastructure**: Turbo monorepo, Docker ready

## 📱 Key Features

✅ **Automated Product Discovery** - Google Trends + Amazon scraping  
✅ **Professional Marketplace** - Responsive e-commerce platform  
✅ **Business Intelligence** - Google Sheets integration  
✅ **Enterprise Testing** - Bulletproof quality assurance  

## 🚀 Built with Claude Code

This entire marketplace was built using [Claude Code](https://claude.ai/code) with comprehensive automation, testing, and production-ready architecture.

---

*Ready to launch your automated marketplace? Start with `npm run dev` and visit http://localhost:3000* 🎉