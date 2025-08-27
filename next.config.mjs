/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static export for Heroku
  output: 'standalone',
  
  // Disable image optimization for Heroku
  images: {
    unoptimized: true,
  },
  
  // Enable experimental features - Fixed deprecated option
  experimental: {
    // serverComponentsExternalPackages đã được move thành serverExternalPackages
  },
  
  // Server external packages configuration
  serverExternalPackages: ['@supabase/supabase-js'],
  
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // API routes configuration
  async rewrites() {
    return [
      {
        source: '/api/python/:path*',
        destination: 'http://localhost:5000/:path*',
      },
    ];
  },
};

export default nextConfig; 