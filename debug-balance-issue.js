const { createClient } = require('@supabase/supabase-js');

// Cấu hình Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugBalanceIssue() {
  console.log('🔍 Debugging Balance Issue...\n');

  try {
    // 1. Lấy thông tin bot
    console.log('1️⃣ Getting bot information...');
    const { data: bots, error: botsError } = await supabase
      .from('trading_bots')
      .select('*')
      .limit(1);

    if (botsError || !bots || bots.length === 0) {
      console.error('❌ No bots found:', botsError?.message || 'No bots in database');
      return;
    }

    const bot = bots[0];
    console.log(`✅ Found bot: ${bot.name} (${bot.id})`);
    console.log(`   Status: ${bot.status}`);
    console.log(`   Strategy: ${bot.config?.strategy?.type || 'N/A'}`);
    console.log(`   Symbol: ${bot.config?.trading?.symbol || 'N/A'}`);
    console.log(`   Position Size: ${bot.config?.positionSize || 'N/A'}%`);
    console.log('');

    // 2. Kiểm tra cấu hình account
    console.log('2️⃣ Checking account configuration...');
    if (!bot.config?.account) {
      console.error('❌ No account configuration found');
      return;
    }

    const account = bot.config.account;
    console.log('📋 Account config:');
    console.log(`   API Key: ${account.apiKey ? `${account.apiKey.slice(0, 6)}...${account.apiKey.slice(-4)}` : 'Missing'}`);
    console.log(`   API Secret: ${account.apiSecret ? '***SET***' : 'Missing'}`);
    console.log(`   Testnet: ${account.testnet || false}`);
    console.log('');

    // 3. Test balance API trực tiếp
    console.log('3️⃣ Testing balance API directly...');
    
    const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:9002';
    
    try {
      const balanceRes = await fetch(`${API_BASE_URL}/api/trading/binance/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: account.apiKey,
          apiSecret: account.apiSecret,
          isTestnet: account.testnet,
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

      // 4. Phân tích vấn đề
      console.log('4️⃣ Analyzing the issue...');
      
      const usdtBalance = parseFloat(balanceData.USDT || '0');
      const btcBalance = parseFloat(balanceData.BTC || '0');
      
      console.log('📊 Balance Analysis:');
      console.log(`   USDT: ${usdtBalance}`);
      console.log(`   BTC: ${btcBalance}`);
      
      if (balanceData.nonZeroBalances) {
        console.log('\n💰 Non-zero balances found:');
        balanceData.nonZeroBalances.forEach((balance, index) => {
          console.log(`   ${index + 1}. ${balance.asset}: ${balance.free} (free) / ${balance.locked} (locked)`);
        });
      }
      
      // 5. Kiểm tra logic trading
      console.log('\n5️⃣ Trading logic analysis...');
      
      const positionSizePercent = bot.config?.positionSize || 10;
      
      // BUY logic
      console.log('🛒 BUY Signal Logic:');
      if (usdtBalance > 0) {
        const usdtToUse = (positionSizePercent / 100) * usdtBalance;
        const canBuy = usdtToUse >= 10;
        
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
      
      // SELL logic
      console.log('\n📈 SELL Signal Logic:');
      if (btcBalance > 0) {
        const btcToSell = (positionSizePercent / 100) * btcBalance;
        const canSell = btcToSell >= 0.0001;
        
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
        console.log(`   🔍 This is the issue! Bot thinks BTC balance = 0`);
      }
      
      // 6. Kiểm tra tất cả balances
      if (balanceData.balances) {
        console.log('\n6️⃣ All account balances:');
        const significantBalances = balanceData.balances
          .filter(balance => parseFloat(balance.free) > 0 || parseFloat(balance.locked) > 0)
          .sort((a, b) => parseFloat(b.free) - parseFloat(a.free));
        
        if (significantBalances.length > 0) {
          significantBalances.forEach((balance, index) => {
            const free = parseFloat(balance.free);
            const locked = parseFloat(balance.locked);
            const total = free + locked;
            
            console.log(`   ${index + 1}. ${balance.asset}:`);
            console.log(`      Free: ${free}`);
            console.log(`      Locked: ${locked}`);
            console.log(`      Total: ${total}`);
          });
        } else {
          console.log('   No balances with value > 0');
        }
      }
      
      // 7. Kết luận và giải pháp
      console.log('\n7️⃣ Conclusion and Solutions:');
      
      if (btcBalance === 0) {
        console.log('❌ PROBLEM IDENTIFIED:');
        console.log('   Bot thinks BTC balance = 0, but you say you have BTC');
        console.log('');
        console.log('🔍 Possible causes:');
        console.log('   1. API key/secret incorrect or expired');
        console.log('   2. Wrong testnet/mainnet setting');
        console.log('   3. BTC is in locked balance, not free balance');
        console.log('   4. Account has no trading permissions');
        console.log('   5. Binance API rate limit exceeded');
        console.log('');
        console.log('🛠️ Solutions:');
        console.log('   1. Check API key/secret in bot config');
        console.log('   2. Verify testnet/mainnet setting');
        console.log('   3. Check if BTC is locked in orders');
        console.log('   4. Verify account trading permissions');
        console.log('   5. Wait and retry (rate limit)');
      } else {
        console.log('✅ No balance issue detected');
        console.log('   Bot should be able to trade normally');
      }

    } catch (error) {
      console.error('❌ Error testing balance API:', error.message);
      console.error('Stack trace:', error.stack);
    }

  } catch (error) {
    console.error('❌ Error debugging balance issue:', error.message);
  }
}

// Chạy script
if (require.main === module) {
  debugBalanceIssue().catch(console.error);
}

module.exports = { debugBalanceIssue };
