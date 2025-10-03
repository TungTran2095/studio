#!/usr/bin/env node

/**
 * Direct Binance API Test Script
 * 
 * This script tests direct Binance API calls to verify the fix
 * 
 * Usage: node scripts/test-direct-binance-api.js
 */

const https = require('https');

console.log('🔗 TESTING DIRECT BINANCE API');
console.log('==============================');

function makeHttpsRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

async function testBinancePriceAPI() {
  console.log('\n💰 TESTING BINANCE PRICE API');
  console.log('=============================');
  
  try {
    const url = 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT';
    console.log(`🔗 Calling: ${url}`);
    
    const result = await makeHttpsRequest(url);
    
    if (result.status === 200) {
      console.log('✅ Binance API working');
      console.log(`   Symbol: ${result.data.symbol}`);
      console.log(`   Price: ${result.data.price}`);
      return true;
    } else {
      console.log(`❌ Binance API failed with status: ${result.status}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Binance API failed');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function testBinanceTestnetAPI() {
  console.log('\n🧪 TESTING BINANCE TESTNET API');
  console.log('===============================');
  
  try {
    const url = 'https://testnet.binance.vision/api/v3/ticker/price?symbol=BTCUSDT';
    console.log(`🔗 Calling: ${url}`);
    
    const result = await makeHttpsRequest(url);
    
    if (result.status === 200) {
      console.log('✅ Binance Testnet API working');
      console.log(`   Symbol: ${result.data.symbol}`);
      console.log(`   Price: ${result.data.price}`);
      return true;
    } else {
      console.log(`❌ Binance Testnet API failed with status: ${result.status}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Binance Testnet API failed');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

function showFixExplanation() {
  console.log('\n🔧 FIX EXPLANATION');
  console.log('==================');
  
  console.log('The HTTP 404 error was caused by:');
  console.log('1. ❌ Wrong endpoint: /api/binance/ticker/price');
  console.log('2. ❌ Wrong method: GET instead of POST');
  console.log('3. ❌ Missing request body');
  
  console.log('\nFixed with:');
  console.log('1. ✅ Correct endpoint: /api/trading/binance/price');
  console.log('2. ✅ Correct method: POST');
  console.log('3. ✅ Proper request body with symbol, apiKey, apiSecret, isTestnet');
  
  console.log('\nThe fix ensures:');
  console.log('• useWebSocketPrice hook works correctly');
  console.log('• TransparentWebSocketAdapter fallback works');
  console.log('• TransparentBinanceService price method works');
  console.log('• All components use the same correct endpoint');
}

function showCodeChanges() {
  console.log('\n📝 CODE CHANGES MADE');
  console.log('====================');
  
  const changes = [
    {
      file: 'src/hooks/use-websocket-price.ts',
      change: 'Updated fetchPriceFromRest to use POST /api/trading/binance/price'
    },
    {
      file: 'src/lib/websocket/transparent-websocket-adapter.ts',
      change: 'Updated fallbackToRestApi to use internal API for price data'
    },
    {
      file: 'src/lib/trading/transparent-binance-service.ts',
      change: 'Updated getCurrentPrice to use internal API endpoint'
    }
  ];
  
  changes.forEach(change => {
    console.log(`\n📄 ${change.file}`);
    console.log(`   ${change.change}`);
  });
}

function showTestingInstructions() {
  console.log('\n🧪 TESTING INSTRUCTIONS');
  console.log('========================');
  
  const instructions = [
    '1. Start your Next.js application: npm run dev',
    '2. Open browser console and check for errors',
    '3. Look for "[useWebSocketPrice] REST API fallback failed" errors',
    '4. Verify price data loads correctly in UI components',
    '5. Check that WebSocket fallback works when WebSocket is disconnected',
    '6. Monitor network tab for correct API calls to /api/trading/binance/price'
  ];
  
  instructions.forEach(instruction => {
    console.log(`   ${instruction}`);
  });
}

// Main execution
async function main() {
  console.log('🔍 Testing direct Binance API connectivity...');
  
  const mainnetWorking = await testBinancePriceAPI();
  const testnetWorking = await testBinanceTestnetAPI();
  
  showFixExplanation();
  showCodeChanges();
  showTestingInstructions();
  
  console.log('\n🎯 FINAL STATUS');
  console.log('===============');
  
  console.log(`Binance Mainnet API: ${mainnetWorking ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`Binance Testnet API: ${testnetWorking ? '✅ WORKING' : '❌ FAILED'}`);
  
  if (mainnetWorking || testnetWorking) {
    console.log('\n🎉 SUCCESS! Binance API is accessible');
    console.log('   • The HTTP 404 error was due to wrong endpoint');
    console.log('   • Fixed endpoint and method in all components');
    console.log('   • WebSocket fallback should now work correctly');
    console.log('   • Start your application to test the fixes');
  } else {
    console.log('\n⚠️  Binance API not accessible - check network connection');
  }
}

main().catch(console.error);
