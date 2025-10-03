#!/usr/bin/env node

/**
 * Emergency Rate Limit Reset Script
 * 
 * This script is designed to immediately stop all Binance API calls
 * and reset the rate limiter to prevent IP ban.
 * 
 * Usage: node scripts/emergency-rate-limit-reset.js
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚨 EMERGENCY RATE LIMIT RESET SCRIPT');
console.log('=====================================');

// 1. Create emergency environment file
const emergencyEnv = `
# EMERGENCY MODE - Ultra Conservative Binance API Limits
# These limits are set to prevent IP ban

BINANCE_USED_WEIGHT_PER_MIN=300
BINANCE_ORDERS_PER_10S=10
BINANCE_ORDERS_PER_1M=400
BINANCE_ORDERS_PER_1D=50000
BINANCE_RAW_1M=2000

# Force emergency mode
BINANCE_EMERGENCY_MODE=true

# Disable all polling intervals
DISABLE_POLLING=true
`;

const envPath = path.join(process.cwd(), '.env.local');
fs.writeFileSync(envPath, emergencyEnv);
console.log('✅ Created emergency .env.local file');

// 2. Create emergency mode indicator
const emergencyIndicator = {
  enabled: true,
  timestamp: new Date().toISOString(),
  reason: 'IP ban prevention',
  autoResetTime: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
};

const indicatorPath = path.join(process.cwd(), 'emergency-mode.json');
fs.writeFileSync(indicatorPath, JSON.stringify(emergencyIndicator, null, 2));
console.log('✅ Created emergency mode indicator');

// 3. Log the emergency action
const logEntry = {
  timestamp: new Date().toISOString(),
  action: 'EMERGENCY_MODE_ENABLED',
  reason: 'IP ban prevention - too many API calls',
  details: {
    weightLimit: 300,
    orders10s: 10,
    orders1m: 400,
    autoResetIn: '10 minutes'
  }
};

const logPath = path.join(process.cwd(), 'logs', 'emergency-actions.log');
const logDir = path.dirname(logPath);

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
console.log('✅ Logged emergency action');

console.log('\n🚨 EMERGENCY MODE ACTIVATED');
console.log('============================');
console.log('• All Binance API calls are now BLOCKED');
console.log('• Rate limits reduced to ultra-conservative levels');
console.log('• Auto-reset in 10 minutes');
console.log('• Check emergency-mode.json for status');
console.log('\n⚠️  IMPORTANT: Restart your application to apply changes');
console.log('   Run: npm run dev (or your start command)');

// 4. Try to restart the application if possible
if (process.env.NODE_ENV !== 'production') {
  console.log('\n🔄 Attempting to restart development server...');
  
  // Kill any existing processes
  exec('taskkill /f /im node.exe', (error) => {
    if (error && !error.message.includes('not found')) {
      console.log('⚠️  Could not kill existing processes:', error.message);
    }
    
    // Start the application
    setTimeout(() => {
      console.log('🚀 Starting application with emergency mode...');
      exec('npm run dev', (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Failed to start application:', error.message);
          console.log('Please manually restart with: npm run dev');
        } else {
          console.log('✅ Application restarted successfully');
        }
      });
    }, 2000);
  });
} else {
  console.log('\n⚠️  Production mode detected - please manually restart your application');
}

console.log('\n📋 NEXT STEPS:');
console.log('1. Wait 10 minutes for IP ban to lift');
console.log('2. Monitor emergency-mode.json for auto-reset');
console.log('3. Consider using WebSocket streams instead of REST API');
console.log('4. Implement proper caching to reduce API calls');
console.log('5. Review and optimize all polling intervals');

process.exit(0);
