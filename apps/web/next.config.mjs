/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  transpilePackages: ['@heaven-dolls/ui', '@heaven-dolls/types'],
  trailingSlash: false,
  
  // Ensure homepage is always accessible
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/',
      },
    ];
  },
  
  // Optimize for production build
  images: {
    domains: ['localhost', 'via.placeholder.com'],
    formats: ['image/webp', 'image/avif'],
  },
}

export default nextConfig