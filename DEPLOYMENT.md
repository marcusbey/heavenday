# 🚀 Deployment Guide - Heaven-Dolls Marketplace

## 🔥 Quick Deploy to Vercel

### **Option 1: Deploy Web App Only (Recommended)**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmarcusbey%2Fheavenday&project-name=heaven-dolls&root-directory=apps%2Fweb)

**OR manually:**

1. **Import in Vercel Dashboard:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Connect your GitHub: `https://github.com/marcusbey/heavenday`

2. **Configure Settings:**
   ```
   Project Name: heaven-dolls
   Framework: Next.js
   Root Directory: apps/web
   Build Command: npm run build
   Install Command: npm install --legacy-peer-deps
   ```

3. **Deploy:**
   - Click "Deploy"
   - Your landing page will be live at: `https://your-project.vercel.app`

### **Option 2: Manual Deployment**

```bash
# Clone the repository
git clone https://github.com/marcusbey/heavenday.git
cd heavenday

# Navigate to web app
cd apps/web

# Install dependencies
npm install --legacy-peer-deps

# Build for production
npm run build

# Start production server
npm start
```

## 🌐 What You'll Get

When deployed, your landing page includes:

✅ **Professional Homepage** at your main URL  
✅ **Hero Section** with Heaven-Dolls branding  
✅ **Product Showcases** (demo content without CMS)  
✅ **Category Navigation** and features  
✅ **Responsive Design** for all devices  
✅ **SEO Optimized** with proper meta tags  

## ⚙️ Environment Variables (Optional)

For full functionality, add these to your Vercel project:

```env
# Strapi CMS (optional)
NEXT_PUBLIC_API_URL=https://your-strapi-cms.com
STRAPI_TOKEN=your-strapi-token

# Google APIs (optional) 
GOOGLE_TRENDS_API_KEY=your-google-api-key
GOOGLE_SHEETS_CREDENTIALS=your-service-account-json

# Analytics (optional)
NEXT_PUBLIC_GA_ID=your-google-analytics-id
```

## 🔧 Troubleshooting

**Common Issues:**

1. **Workspace Dependencies Error:**
   - ✅ **Fixed** - Removed workspace protocols
   - Uses local file paths instead

2. **Build Timeout:**
   - Increase Vercel function timeout
   - Or deploy only the web app (apps/web)

3. **Missing Components:**
   - ✅ **Fixed** - UI components copied locally
   - No external workspace dependencies

## 🚀 Production Features

The deployed landing page includes:

- **Automated Product Showcases** (when CMS is connected)
- **Beautiful Hero Section** with call-to-action
- **Category Showcase** with navigation
- **Trust Signals** and feature highlights
- **Mobile-Responsive Design**
- **Fast Loading** with Next.js optimization

## 📱 Mobile-First Design

Your landing page is optimized for:
- 📱 **Mobile devices** (phones, tablets)
- 💻 **Desktop computers** 
- 🌐 **All browsers** (Chrome, Safari, Firefox, Edge)
- ♿ **Accessibility** (screen readers, keyboard navigation)

---

**🎉 Your Heaven-Dolls marketplace is ready for the world!**

*Built with [Claude Code](https://claude.ai/code) for rapid deployment and scaling.*