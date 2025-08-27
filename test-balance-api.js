const fetch = require('node-fetch');

// Cấu hình
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:9002';
const API_KEY = process.env.BINANCE_API_KEY || 'your-api-key';
const API_SECRET = process.env.BINANCE_API_SECRET || 'your-api-secret';
const IS_TESTNET = process.env.BINANCE_TESTNET === 'true' || false;

async function testBalanceAPI() {
  console.log('🧪 Testing Balance API...\n');
  
  console.log('📋 Configuration:');
  console.log(`   API Base URL: ${API_BASE_URL}`);
  console.log(`   API Key: ${API_KEY.slice(0, 6)}...${API_KEY.slice(-4)}`);
  console.log(`   Testnet: ${IS_TESTNET}`);
  console.log('');

  try {
    // Test 1: Gọi API balance
    console.log('1️⃣ Testing Balance API call...');
    
    const balanceRes = await fetch(`${API_BASE_URL}/api/trading/binance/balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: API_KEY,
        apiSecret: API_SECRET,
        isTestnet: IS_TESTNET,
      })
    });

    if (!balanceRes.ok) {
      console.error(`❌ Balance API failed: ${balanceRes.status} ${balanceRes.statusText}`);
      const errorText = await balanceRes.text();
      console.error('Error details:', errorText);
      return;
    }

    const balanceData = await balanceRes.json();
    console.log('✅ Balance API response:');
    console.log(JSON.stringify(balanceData, null, 2));
    console.log('');

    // Test 2: Phân tích dữ liệu
    console.log('2️⃣ Analyzing balance data...');
    
    const usdtBalance = parseFloat(balanceData.USDT || '0');
    const btcBalance = parseFloat(balanceData.BTC || '0');
    
    console.log('📊 Balance Summary:');
    console.log(`   USDT: ${usdtBalance}`);
    console.log(`   BTC: ${btcBalance}`);
    console.log(`   Total balances: ${balanceData.balances?.length || 0}`);
    
    if (balanceData.nonZeroBalances) {
      console.log('\n💰 Non-zero balances:');
      balanceData.nonZeroBalances.forEach((balance, index) => {
        console.log(`   ${index + 1}. ${balance.asset}: ${balance.free} (free) / ${balance.locked} (locked)`);
      });
    }
    console.log('');

    // Test 3: Kiểm tra logic trading
    console.log('3️⃣ Testing trading logic...');
    
    const positionSizePercent = 10; // 10%
    
    // BUY logic
    console.log('🛒 BUY Signal Analysis:');
    if (usdtBalance > 0) {
      const usdtToUse = (positionSizePercent / 100) * usdtBalance;
      const canBuy = usdtToUse >= 10; // Minimum 10 USDT
      
      console.log(`   USDT Balance: ${usdtBalance}`);
      console.log(`   Position Size: ${positionSizePercent}%`);
      console.log(`   USDT needed: ${usdtToUse.toFixed(2)}`);
      console.log(`   Minimum required: 10 USDT`);
      console.log(`   Can BUY: ${canBuy ? '✅ YES' : '❌ NO'}`);
      
      if (!canBuy) {
        console.log(`   Reason: Insufficient USDT for minimum notional`);
      }
    } else {
      console.log(`   USDT Balance: ${usdtBalance} - Cannot BUY`);
    }
    console.log('');

    // SELL logic
    console.log('📈 SELL Signal Analysis:');
    if (btcBalance > 0) {
      const btcToSell = (positionSizePercent / 100) * btcBalance;
      const canSell = btcToSell >= 0.0001; // Minimum 0.0001 BTC
      
      console.log(`   BTC Balance: ${btcBalance}`);
      console.log(`   Position Size: ${positionSizePercent}%`);
      console.log(`   BTC to sell: ${btcToSell.toFixed(6)}`);
      console.log(`   Minimum required: 0.0001 BTC`);
      console.log(`   Can SELL: ${canSell ? '✅ YES' : '❌ NO'}`);
      
      if (!canSell) {
        console.log(`   Reason: Insufficient BTC for minimum notional`);
      }
    } else {
      console.log(`   BTC Balance: ${btcBalance} - Cannot SELL`);
    }
    console.log('');

    // Test 4: Kiểm tra tất cả balances
    if (balanceData.balances) {
      console.log('4️⃣ All account balances:');
      const significantBalances = balanceData.balances
        .filter(balance => parseFloat(balance.free) > 0 || parseFloat(balance.locked) > 0)
        .sort((a, b) => parseFloat(b.free) - parseFloat(a.free));
      
      significantBalances.forEach((balance, index) => {
        const free = parseFloat(balance.free);
        const locked = parseFloat(balance.locked);
        const total = free + locked;
        
        if (total > 0) {
          console.log(`   ${index + 1}. ${balance.asset}:`);
          console.log(`      Free: ${free}`);
          console.log(`      Locked: ${locked}`);
          console.log(`      Total: ${total}`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Error testing balance API:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Chạy script
if (require.main === module) {
  testBalanceAPI().catch(console.error);
}

module.exports = { testBalanceAPI };
