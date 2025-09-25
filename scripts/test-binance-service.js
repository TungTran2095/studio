#!/usr/bin/env node

/**
 * Script để test BinanceService với timestamp sync
 * Sử dụng: node scripts/test-binance-service.js
 */

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://your-supabase-url.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'your-service-role-key';

// Import BinanceService
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testBinanceService() {
  log('cyan', '🧪 Testing BinanceService với timestamp sync...\n');
  
  try {
    // Test với API key và secret giả (để test cấu hình)
    const testApiKey = 'test-api-key';
    const testApiSecret = 'test-api-secret';
    
    log('blue', '📝 Test cấu hình BinanceService...');
    log('yellow', 'API Key:', testApiKey.substring(0, 8) + '...');
    log('yellow', 'API Secret:', testApiSecret.substring(0, 8) + '...');
    log('yellow', 'Testnet:', false);
    
    // Test timestamp sync
    log('blue', '\n🕐 Testing timestamp sync...');
    
    const https = require('https');
    const http = require('http');
    
    function makeRequest(url) {
      return new Promise((resolve, reject) => {
        const client = url.startsWith('https:') ? https : http;
        
        const req = client.get(url, {
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              resolve(json);
            } catch (e) {
              reject(new Error('Invalid JSON response'));
            }
          });
        });
        
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });
      });
    }
    
    // Test Binance time endpoint
    const endpoints = [
      'https://api.binance.com/api/v3/time',
      'https://api1.binance.com/api/v3/time'
    ];
    
    for (const endpoint of endpoints) {
      try {
        log('yellow', `🔍 Testing ${endpoint}...`);
        const response = await makeRequest(endpoint);
        const serverTime = response.serverTime;
        const localTime = Date.now();
        const diff = localTime - serverTime;
        
        log('green', `  ✅ Success! Server time: ${new Date(serverTime).toISOString()}`);
        log('blue', `  📱 Local time: ${new Date(localTime).toISOString()}`);
        log('yellow', `  ⏰ Difference: ${diff}ms (${diff > 0 ? 'local ahead' : 'local behind'})`);
        
        // Test recvWindow calculation
        const recvWindow = 60000; // 60 seconds
        const safeTimestamp = serverTime - 10000; // 10 seconds before server time
        
        log('cyan', `  🛡️ Safe timestamp: ${new Date(safeTimestamp).toISOString()}`);
        log('cyan', `  📊 RecvWindow: ${recvWindow}ms`);
        
        const isWithinRecvWindow = Math.abs(localTime - serverTime) <= recvWindow;
        log(isWithinRecvWindow ? 'green' : 'red', `  ${isWithinRecvWindow ? '✅' : '❌'} Within recvWindow: ${isWithinRecvWindow}`);
        
        console.log();
        break; // Chỉ test endpoint đầu tiên thành công
        
      } catch (error) {
        log('red', `  ❌ Failed: ${error.message}`);
      }
    }
    
    // Test Binance client configuration
    log('blue', '🔧 Testing Binance client configuration...');
    
    const Binance = require('binance-api-node');
    
    const client = Binance({
      apiKey: testApiKey,
      apiSecret: testApiSecret,
      httpBase: 'https://api.binance.com',
      recvWindow: 60000,
      timeout: 30000,
      family: 4,
      useServerTime: true
    });
    
    log('green', '✅ Binance client created successfully');
    log('blue', '📊 Configuration:');
    log('yellow', '  - recvWindow: 60000ms');
    log('yellow', '  - timeout: 30000ms');
    log('yellow', '  - useServerTime: true');
    log('yellow', '  - family: 4 (IPv4)');
    
    log('cyan', '\n💡 Recommendations:');
    log('blue', '✅ Sử dụng useServerTime: true để tránh lỗi timestamp');
    log('blue', '✅ Tăng recvWindow lên 60000ms để an toàn hơn');
    log('blue', '✅ Implement retry logic với timestamp error handling');
    log('blue', '✅ Sync timestamp trước khi khởi tạo client');
    
  } catch (error) {
    log('red', '❌ Error testing BinanceService:', error.message);
  }
}

// Chạy test
testBinanceService().catch(console.error);

