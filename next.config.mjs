import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fix for Render.com deployment
  outputFileTracingRoot: path.join(__dirname, '../../'),
  
  // Experimental features for better compatibility
  experimental: {
    serverComponentsExternalPackages: ['binance-api-node'],
    esmExternals: 'loose'
  },
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    
    return config;
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Disable static optimization for dynamic pages
  trailingSlash: true,
  
  // Image optimization
  images: {
    domains: ['api.binance.com', 'testnet.binance.vision'],
  },
};

export default nextConfig;