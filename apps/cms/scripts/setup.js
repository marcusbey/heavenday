const fs = require('fs');
const path = require('path');

async function setupCMS() {
  console.log('🚀 Setting up Heaven Dolls CMS...');

  try {
    // Check if .env exists
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) {
      // Copy .env.example to .env
      const envExamplePath = path.join(__dirname, '..', '.env.example');
      if (fs.existsSync(envExamplePath)) {
        fs.copyFileSync(envExamplePath, envPath);
        console.log('✅ Created .env file from .env.example');
        console.log('⚠️  Please update the environment variables in .env file');
      } else {
        console.log('❌ .env.example file not found');
      }
    }

    // Create upload directories
    const uploadDirs = [
      'public/uploads',
      'public/uploads/images',
      'public/uploads/thumbnails',
      'public/uploads/documents'
    ];

    uploadDirs.forEach(dir => {
      const fullPath = path.join(__dirname, '..', dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
      }
    });

    // Create data directories
    const dataDirs = [
      'data/exports',
      'data/imports',
      'data/backups'
    ];

    dataDirs.forEach(dir => {
      const fullPath = path.join(__dirname, '..', dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
      }
    });

    console.log('\n🎉 CMS setup completed!');
    console.log('\nNext steps:');
    console.log('1. Update your .env file with the correct database credentials');
    console.log('2. Run "npm run develop" to start the development server');
    console.log('3. Navigate to http://localhost:1337/admin to create your admin user');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setupCMS();