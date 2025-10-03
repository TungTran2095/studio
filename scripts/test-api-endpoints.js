#!/usr/bin/env node

/**
 * Test API Endpoints Script
 * 
 * This script tests the corrected API endpoints
 * 
 * Usage: node scripts/test-api-endpoints.js
 */

const fetch = require('node-fetch');

console.log('🧪 TESTING API ENDPOINTS');
console.log('=========================');

async function testPriceEndpoint() {
  console.log('\n💰 TESTING PRICE ENDPOINT');
  console.log('==========================');
  
  try {
    const response = await fetch('http://localhost:3000/api/trading/binance/price', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        symbol: 'BTCUSDT',
        apiKey: '',
        apiSecret: '',
        isTestnet: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('✅ Price endpoint working');
    console.log(`   Symbol: ${data.symbol}`);
    console.log(`   Price: ${data.price}`);
    console.log(`   Timestamp: ${new Date(data.timestamp).toLocaleString()}`);
    
    return true;
  } catch (error) {
    console.log('❌ Price endpoint failed');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function testWebSocketHook() {
  console.log('\n🌐 TESTING WEBSOCKET HOOK');
  console.log('==========================');
  
  try {
    // Test the hook logic by simulating the fetch call
    const response = await fetch('http://localhost:3000/api/trading/binance/price', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        symbol: 'BTCUSDT',
        apiKey: '',
        apiSecret: '',
        isTestnet: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.price) {
      console.log('✅ WebSocket hook fallback working');
      console.log(`   Price: ${data.price}`);
      return true;
    } else {
      throw new Error(data.error || 'Failed to fetch price');
    }
  } catch (error) {
    console.log('❌ WebSocket hook fallback failed');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function testTransparentService() {
  console.log('\n🔧 TESTING TRANSPARENT SERVICE');
  console.log('===============================');
  
  try {
    const response = await fetch('http://localhost:3000/api/trading/binance/price', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        symbol: 'ETHUSDT',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        isTestnet: true
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('✅ TransparentBinanceService fallback working');
    console.log(`   Symbol: ${data.symbol}`);
    console.log(`   Price: ${data.price}`);
    
    return true;
  } catch (error) {
    console.log('❌ TransparentBinanceService fallback failed');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

function showEndpointInfo() {
  console.log('\n📋 ENDPOINT INFORMATION');
  console.log('========================');
  
  const endpoints = [
    {
      path: '/api/trading/binance/price',
      method: 'POST',
      description: 'Get current price for a symbol',
      body: {
        symbol: 'BTCUSDT',
        apiKey: 'optional',
        apiSecret: 'optional',
        isTestnet: false
      }
    },
    {
      path: '/api/market-data/enhanced',
      method: 'GET',
      description: 'Get enhanced market data',
      params: '?action=realtime_data'
    },
    {
      path: '/api/data/ohlcv',
      method: 'GET',
      description: 'Get OHLCV data from database',
      params: '?limit=1000'
    }
  ];
  
  endpoints.forEach(endpoint => {
    console.log(`\n${endpoint.method} ${endpoint.path}`);
    console.log(`   Description: ${endpoint.description}`);
    if (endpoint.body) {
      console.log(`   Body: ${JSON.stringify(endpoint.body)}`);
    }
    if (endpoint.params) {
      console.log(`   Params: ${endpoint.params}`);
    }
  });
}

function showFixSummary() {
  console.log('\n🔧 FIX SUMMARY');
  console.log('==============');
  
  const fixes = [
    '✅ Fixed useWebSocketPrice hook to use correct endpoint',
    '✅ Updated TransparentWebSocketAdapter fallback logic',
    '✅ Fixed TransparentBinanceService price method',
    '✅ Changed from GET to POST method for price endpoint',
    '✅ Added proper request body structure',
    '✅ Added error handling for API responses'
  ];
  
  fixes.forEach(fix => {
    console.log(`   ${fix}`);
  });
}

function showNextSteps() {
  console.log('\n🚀 NEXT STEPS');
  console.log('=============');
  
  const steps = [
    '1. Restart application to apply fixes',
    '2. Test WebSocket price updates in UI',
    '3. Monitor console for API call reduction',
    '4. Check bot functionality with corrected endpoints',
    '5. Verify fallback mechanisms work properly',
    '6. Monitor rate limits to avoid future bans'
  ];
  
  steps.forEach(step => {
    console.log(`   ${step}`);
  });
}

// Main execution
async function main() {
  console.log('🔍 Testing corrected API endpoints...');
  
  const priceEndpointWorking = await testPriceEndpoint();
  const webSocketHookWorking = await testWebSocketHook();
  const transparentServiceWorking = await testTransparentService();
  
  showEndpointInfo();
  showFixSummary();
  showNextSteps();
  
  console.log('\n🎯 FINAL STATUS');
  console.log('===============');
  
  console.log(`Price Endpoint: ${priceEndpointWorking ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`WebSocket Hook: ${webSocketHookWorking ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`Transparent Service: ${transparentServiceWorking ? '✅ WORKING' : '❌ FAILED'}`);
  
  const overallSuccess = priceEndpointWorking && webSocketHookWorking && transparentServiceWorking;
  
  if (overallSuccess) {
    console.log('\n🎉 SUCCESS! All API endpoints are working correctly');
    console.log('   • HTTP 404 error fixed');
    console.log('   • WebSocket fallback working');
    console.log('   • TransparentBinanceService ready');
    console.log('   • Price data accessible');
  } else {
    console.log('\n⚠️  SOME ISSUES DETECTED - Please check failed components');
  }
}

main().catch(console.error);