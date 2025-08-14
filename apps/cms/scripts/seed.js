const fs = require('fs');
const path = require('path');

// Sample data for seeding
const sampleCategories = [
  {
    name: 'Electronics',
    description: 'Electronic devices and gadgets',
    isActive: true,
    isFeatured: true,
    sortOrder: 1,
  },
  {
    name: 'Fashion',
    description: 'Clothing, shoes, and accessories',
    isActive: true,
    isFeatured: true,
    sortOrder: 2,
  },
  {
    name: 'Home & Garden',
    description: 'Home improvement and garden supplies',
    isActive: true,
    isFeatured: false,
    sortOrder: 3,
  },
  {
    name: 'Sports & Outdoors',
    description: 'Sports equipment and outdoor gear',
    isActive: true,
    isFeatured: true,
    sortOrder: 4,
  },
  {
    name: 'Beauty & Personal Care',
    description: 'Beauty products and personal care items',
    isActive: true,
    isFeatured: true,
    sortOrder: 5,
  },
];

const sampleBrands = [
  {
    name: 'TechPro',
    description: 'Leading technology brand',
    isActive: true,
    isFeatured: true,
    country: 'USA',
    foundedYear: 2010,
  },
  {
    name: 'StyleMax',
    description: 'Premium fashion brand',
    isActive: true,
    isFeatured: true,
    country: 'Italy',
    foundedYear: 1995,
  },
  {
    name: 'HomeComfort',
    description: 'Quality home products',
    isActive: true,
    isFeatured: false,
    country: 'Germany',
    foundedYear: 2005,
  },
];

const sampleTags = [
  { name: 'Trending', color: '#ff6b6b', type: 'product' },
  { name: 'Best Seller', color: '#4ecdc4', type: 'product' },
  { name: 'New Arrival', color: '#45b7d1', type: 'product' },
  { name: 'Sale', color: '#f9ca24', type: 'product' },
  { name: 'Premium', color: '#6c5ce7', type: 'product' },
];

async function seedData() {
  console.log('🌱 Seeding Heaven Dolls CMS with sample data...');

  try {
    // Seed Categories
    console.log('📂 Creating categories...');
    const createdCategories = {};
    
    for (const categoryData of sampleCategories) {
      const category = await strapi.entityService.create('api::category.category', {
        data: categoryData,
      });
      createdCategories[categoryData.name] = category;
      console.log(`✅ Created category: ${categoryData.name}`);
    }

    // Seed Brands
    console.log('🏷️  Creating brands...');
    const createdBrands = {};
    
    for (const brandData of sampleBrands) {
      const brand = await strapi.entityService.create('api::brand.brand', {
        data: brandData,
      });
      createdBrands[brandData.name] = brand;
      console.log(`✅ Created brand: ${brandData.name}`);
    }

    // Seed Tags
    console.log('🏷️  Creating tags...');
    const createdTags = {};
    
    for (const tagData of sampleTags) {
      const tag = await strapi.entityService.create('api::tag.tag', {
        data: tagData,
      });
      createdTags[tagData.name] = tag;
      console.log(`✅ Created tag: ${tagData.name}`);
    }

    // Create sample products
    console.log('📦 Creating sample products...');
    
    const sampleProducts = [
      {
        name: 'Wireless Bluetooth Headphones',
        description: 'High-quality wireless headphones with noise cancellation',
        shortDescription: 'Premium wireless headphones for music lovers',
        price: 199.99,
        originalPrice: 249.99,
        sku: 'WBH-001',
        category: createdCategories['Electronics'].id,
        brand: createdBrands['TechPro'].id,
        status: 'active',
        featured: true,
        stockQuantity: 50,
        specifications: [
          { name: 'Battery Life', value: '30 hours', category: 'Power' },
          { name: 'Connectivity', value: 'Bluetooth 5.0', category: 'Connectivity' },
          { name: 'Weight', value: '250g', unit: 'g', category: 'Physical' },
        ],
        tags: [createdTags['Trending'].id, createdTags['Best Seller'].id],
      },
      {
        name: 'Stylish Summer Dress',
        description: 'Elegant summer dress perfect for any occasion',
        shortDescription: 'Comfortable and stylish summer dress',
        price: 89.99,
        originalPrice: 129.99,
        sku: 'SSD-001',
        category: createdCategories['Fashion'].id,
        brand: createdBrands['StyleMax'].id,
        status: 'active',
        featured: true,
        stockQuantity: 25,
        specifications: [
          { name: 'Material', value: '100% Cotton', category: 'Fabric' },
          { name: 'Care Instructions', value: 'Machine washable', category: 'Care' },
        ],
        tags: [createdTags['New Arrival'].id, createdTags['Sale'].id],
      },
      {
        name: 'Smart Home Security Camera',
        description: 'Advanced security camera with AI detection and cloud storage',
        shortDescription: 'Smart security camera for your home',
        price: 149.99,
        sku: 'SHSC-001',
        category: createdCategories['Electronics'].id,
        brand: createdBrands['TechPro'].id,
        status: 'active',
        featured: false,
        trending: true,
        stockQuantity: 100,
        specifications: [
          { name: 'Resolution', value: '4K Ultra HD', category: 'Video' },
          { name: 'Field of View', value: '130°', category: 'Video' },
          { name: 'Storage', value: 'Cloud + Local', category: 'Storage' },
        ],
        tags: [createdTags['Trending'].id, createdTags['Premium'].id],
      },
    ];

    for (const productData of sampleProducts) {
      const product = await strapi.entityService.create('api::product.product', {
        data: productData,
      });
      console.log(`✅ Created product: ${productData.name}`);
    }

    // Create sample reviews
    console.log('⭐ Creating sample reviews...');
    
    const products = await strapi.entityService.findMany('api::product.product', {
      pagination: { limit: 3 },
    });

    const sampleReviews = [
      {
        customerName: 'John Smith',
        customerEmail: 'john@example.com',
        rating: 5,
        title: 'Excellent quality!',
        comment: 'These headphones exceeded my expectations. Great sound quality and comfortable to wear.',
        status: 'approved',
        isVerifiedPurchase: true,
        product: products[0]?.id,
      },
      {
        customerName: 'Sarah Johnson',
        customerEmail: 'sarah@example.com',
        rating: 4,
        title: 'Love this dress',
        comment: 'Perfect fit and beautiful design. Great for summer events.',
        status: 'approved',
        isVerifiedPurchase: true,
        product: products[1]?.id,
      },
      {
        customerName: 'Mike Wilson',
        customerEmail: 'mike@example.com',
        rating: 5,
        title: 'Great security camera',
        comment: 'Easy to install and works perfectly. The AI detection is impressive.',
        status: 'approved',
        isVerifiedPurchase: true,
        product: products[2]?.id,
      },
    ];

    for (const reviewData of sampleReviews) {
      if (reviewData.product) {
        await strapi.entityService.create('api::review.review', {
          data: reviewData,
        });
        console.log(`✅ Created review for product: ${reviewData.title}`);
      }
    }

    console.log('\n🎉 Seeding completed successfully!');
    console.log('\nSample data created:');
    console.log(`- ${sampleCategories.length} categories`);
    console.log(`- ${sampleBrands.length} brands`);
    console.log(`- ${sampleTags.length} tags`);
    console.log(`- ${sampleProducts.length} products`);
    console.log(`- ${sampleReviews.length} reviews`);

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

module.exports = seedData;

// Run seeding if called directly
if (require.main === module) {
  // This would need to be run within Strapi context
  console.log('ℹ️  This script should be run within Strapi context');
  console.log('Usage: npm run seed');
}