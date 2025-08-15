#!/usr/bin/env node

const { spawn } = require('child_process');
const http = require('http');

console.log('🚀 Starting Heaven-Dolls Web Application...\n');

// Change to web directory and start the server
const webDir = './apps/web';
const nextProcess = spawn('npm', ['run', 'dev'], {
  cwd: webDir,
  stdio: 'inherit',
  shell: true
});

// Wait for server to start
setTimeout(() => {
  console.log('\n📱 Checking if landing page is accessible...\n');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`✅ Landing page status: ${res.statusCode}`);
    console.log(`📍 Access the application at: http://localhost:3000\n`);
    
    if (res.statusCode === 200) {
      console.log('🎉 Heaven-Dolls marketplace is running successfully!');
      console.log('\n📋 Available Pages:');
      console.log('  - Homepage: http://localhost:3000');
      console.log('  - Products: http://localhost:3000/products');
      console.log('  - Cart: http://localhost:3000/cart');
      console.log('  - Categories: http://localhost:3000/categories\n');
      
      console.log('💡 Admin Access:');
      console.log('  - Strapi CMS: http://localhost:1337/admin');
      console.log('    (Start with: cd apps/cms && npm run develop)\n');
    }
  });

  req.on('error', (error) => {
    console.error('❌ Error accessing landing page:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('  1. Check if port 3000 is already in use');
    console.log('  2. Run: cd apps/web && npm install');
    console.log('  3. Check for any build errors in the console');
  });

  req.end();
}, 5000);

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down Heaven-Dolls application...');
  nextProcess.kill();
  process.exit();
});