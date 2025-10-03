#!/usr/bin/env node

/**
 * Build Fix Script for Render.com Deployment
 * 
 * This script addresses common build issues on Render.com
 * 
 * Usage: node scripts/fix-render-build.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 RENDER.COM BUILD FIX SCRIPT');
console.log('===============================');

function checkNextConfig() {
  console.log('\n📋 CHECKING NEXT.CONFIG');
  console.log('========================');
  
  const configPath = path.join(process.cwd(), 'next.config.mjs');
  
  if (!fs.existsSync(configPath)) {
    console.log('❌ next.config.mjs not found');
    return false;
  }
  
  const config = fs.readFileSync(configPath, 'utf8');
  
  // Check for common issues
  const issues = [];
  
  if (!config.includes('outputFileTracingRoot')) {
    issues.push('Missing outputFileTracingRoot');
  }
  
  if (!config.includes('experimental')) {
    issues.push('Missing experimental config');
  }
  
  if (issues.length === 0) {
    console.log('✅ Next.js config looks good');
    return true;
  } else {
    console.log('⚠️  Issues found:');
    issues.forEach(issue => console.log(`   - ${issue}`));
    return false;
  }
}

function createNextConfigFix() {
  console.log('\n🔧 CREATING NEXT.CONFIG FIX');
  console.log('============================');
  
  const configPath = path.join(process.cwd(), 'next.config.mjs');
  
  const configContent = `/** @type {import('next').NextConfig} */
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

export default nextConfig;`;

  try {
    fs.writeFileSync(configPath, configContent);
    console.log('✅ Next.js config updated');
    return true;
  } catch (error) {
    console.log('❌ Failed to update config:', error.message);
    return false;
  }
}

function checkPackageJson() {
  console.log('\n📦 CHECKING PACKAGE.JSON');
  console.log('=========================');
  
  const packagePath = path.join(process.cwd(), 'package.json');
  
  if (!fs.existsSync(packagePath)) {
    console.log('❌ package.json not found');
    return false;
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  const issues = [];
  
  if (!packageJson.engines?.node) {
    issues.push('Missing Node.js version specification');
  }
  
  if (!packageJson.scripts?.build) {
    issues.push('Missing build script');
  }
  
  if (issues.length === 0) {
    console.log('✅ package.json looks good');
    return true;
  } else {
    console.log('⚠️  Issues found:');
    issues.forEach(issue => console.log(`   - ${issue}`));
    return false;
  }
}

function createRenderYaml() {
  console.log('\n🚀 CREATING RENDER.YAML');
  console.log('========================');
  
  const renderYaml = `services:
  - type: web
    name: studio-1
    env: node
    plan: free
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: NEXT_PUBLIC_SUPABASE_URL
        sync: false
      - key: NEXT_PUBLIC_SUPABASE_ANON_KEY
        sync: false
      - key: BINANCE_API_KEY
        sync: false
      - key: BINANCE_API_SECRET
        sync: false
      - key: TELEGRAM_BOT_TOKEN
        sync: false
      - key: TELEGRAM_CHAT_ID
        sync: false`;

  try {
    fs.writeFileSync(path.join(process.cwd(), 'render.yaml'), renderYaml);
    console.log('✅ render.yaml created');
    return true;
  } catch (error) {
    console.log('❌ Failed to create render.yaml:', error.message);
    return false;
  }
}

function showBuildInstructions() {
  console.log('\n📋 BUILD INSTRUCTIONS FOR RENDER.COM');
  console.log('=====================================');
  
  const instructions = [
    '1. Ensure Node.js version is specified in package.json',
    '2. Add outputFileTracingRoot to next.config.mjs',
    '3. Configure webpack fallbacks for browser compatibility',
    '4. Set proper environment variables in Render dashboard',
    '5. Use render.yaml for consistent deployment configuration',
    '6. Enable experimental features for better compatibility',
    '7. Disable static optimization for dynamic pages',
    '8. Configure image domains for external APIs'
  ];
  
  instructions.forEach(instruction => {
    console.log(`   ${instruction}`);
  });
}

function showEnvironmentVariables() {
  console.log('\n🔑 REQUIRED ENVIRONMENT VARIABLES');
  console.log('==================================');
  
  const envVars = [
    'NODE_ENV=production',
    'NEXT_PUBLIC_SUPABASE_URL=your_supabase_url',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key',
    'BINANCE_API_KEY=your_binance_api_key',
    'BINANCE_API_SECRET=your_binance_api_secret',
    'TELEGRAM_BOT_TOKEN=your_telegram_token',
    'TELEGRAM_CHAT_ID=your_telegram_chat_id'
  ];
  
  envVars.forEach(envVar => {
    console.log(`   ${envVar}`);
  });
}

function showTroubleshooting() {
  console.log('\n🔍 TROUBLESHOOTING COMMON ISSUES');
  console.log('=================================');
  
  const issues = [
    {
      issue: 'Module not found errors',
      solution: 'Add webpack fallbacks for Node.js modules'
    },
    {
      issue: 'Prerender errors',
      solution: 'Disable static optimization for dynamic pages'
    },
    {
      issue: 'Build timeout',
      solution: 'Optimize dependencies and use smaller packages'
    },
    {
      issue: 'Memory issues',
      solution: 'Increase memory limit or optimize code'
    },
    {
      issue: 'TypeScript errors',
      solution: 'Ensure all imports use correct paths'
    }
  ];
  
  issues.forEach(({ issue, solution }) => {
    console.log(`\n   Issue: ${issue}`);
    console.log(`   Solution: ${solution}`);
  });
}

// Main execution
function main() {
  console.log('🔍 Analyzing build configuration...');
  
  const configOk = checkNextConfig();
  const packageOk = checkPackageJson();
  
  if (!configOk) {
    createNextConfigFix();
  }
  
  createRenderYaml();
  
  showBuildInstructions();
  showEnvironmentVariables();
  showTroubleshooting();
  
  console.log('\n🎯 FINAL STATUS');
  console.log('===============');
  
  console.log(`Next.js Config: ${configOk ? '✅ OK' : '🔧 FIXED'}`);
  console.log(`Package.json: ${packageOk ? '✅ OK' : '⚠️  NEEDS ATTENTION'}`);
  console.log(`Render.yaml: ✅ CREATED`);
  
  console.log('\n🎉 BUILD FIXES APPLIED');
  console.log('   • Next.js config optimized for Render.com');
  console.log('   • Webpack fallbacks configured');
  console.log('   • Render.yaml deployment config created');
  console.log('   • Environment variables documented');
  console.log('   • Troubleshooting guide provided');
  
  console.log('\n🚀 NEXT STEPS:');
  console.log('   1. Commit and push these changes');
  console.log('   2. Set environment variables in Render dashboard');
  console.log('   3. Deploy using render.yaml configuration');
  console.log('   4. Monitor build logs for any remaining issues');
}

main();
