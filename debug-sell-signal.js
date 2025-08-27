const { createClient } = require('@supabase/supabase-js');

// Cấu hình Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugSellSignal() {
  console.log('🔍 Debugging SELL Signal Issue (100% Balance Logic)...\n');

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
    console.log(`   Position Size: ${bot.config?.positionSize || 'N/A'}% (sẽ sử dụng 100% balance)`);
    console.log('');

    // 2. Test balance API
    console.log('2️⃣ Testing balance API...');
    
    const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:9002';
    
    try {
      const balanceRes = await fetch(`${API_BASE_URL}/api/trading/binance/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: bot.config.account.apiKey,
          apiSecret: bot.config.account.apiSecret,
          isTestnet: bot.config.account.testnet,
        })
      });

      if (!balanceRes.ok) {
        console.error(`❌ Balance API failed: ${balanceRes.status} ${balanceRes.statusText}`);
        return;
      }

      const balanceData = await balanceRes.json();
      console.log('✅ Balance API response:');
      console.log(JSON.stringify(balanceData, null, 2));
      console.log('');

      // 3. Test price API
      console.log('3️⃣ Testing price API...');
      
      const priceRes = await fetch(`${API_BASE_URL}/api/trading/binance/price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: bot.config.trading.symbol,
          apiKey: bot.config.account.apiKey,
          apiSecret: bot.config.account.apiSecret,
          isTestnet: bot.config.account.testnet,
        })
      });

      if (!priceRes.ok) {
        console.error(`❌ Price API failed: ${priceRes.status} ${priceRes.statusText}`);
        return;
      }

      const priceData = await priceRes.json();
      console.log('✅ Price API response:');
      console.log(JSON.stringify(priceData, null, 2));
      console.log('');

      // 4. Phân tích SELL signal logic (100% balance)
      console.log('4️⃣ Analyzing SELL signal logic (100% BTC balance)...');
      
      const btcBalance = parseFloat(balanceData.BTC || '0');
      const currentPrice = parseFloat(priceData.price);
      
      console.log('📊 SELL Signal Analysis (100% BTC):');
      console.log(`   BTC Balance: ${btcBalance}`);
      console.log(`   Current Price: ${currentPrice} USDT`);
      console.log(`   Trading Logic: 100% BTC balance sẽ được sử dụng`);
      
      if (btcBalance > 0) {
        // Kiểm tra với 100% BTC balance
        const btcToSell = btcBalance * 0.99; // 99% để tránh lỗi
        const orderValue = btcToSell * currentPrice;
        const minNotional = 10; // Binance minimum 10 USDT
        
        console.log(`   BTC sẽ bán (100%): ${btcToSell.toFixed(6)}`);
        console.log(`   Order value: ${orderValue.toFixed(2)} USDT`);
        console.log(`   Minimum required: ${minNotional} USDT`);
        console.log(`   Can SELL: ${orderValue >= minNotional ? '✅ YES' : '❌ NO'}`);
        
        if (orderValue < minNotional) {
          console.log(`   ❌ REASON: Order value (${orderValue.toFixed(2)} USDT) < minimum (${minNotional} USDT)`);
          console.log(`   💡 SOLUTION: Wait for higher BTC price or accumulate more BTC`);
          
          // Tính BTC price cần thiết
          const requiredPrice = minNotional / btcToSell;
          console.log(`   📊 Required BTC price: ${requiredPrice.toFixed(2)} USDT (hiện tại: ${currentPrice} USDT)`);
        } else {
          console.log(`   ✅ SELL signal sẽ thực hiện với 100% BTC balance`);
        }
        
      } else {
        console.log(`   ❌ BTC Balance = 0 - Cannot SELL`);
      }
      
      // 5. Phân tích BUY signal logic (100% USDT balance)
      console.log('\n5️⃣ Analyzing BUY signal logic (100% USDT balance)...');
      
      const usdtBalance = parseFloat(balanceData.USDT || '0');
      
      console.log('📊 BUY Signal Analysis (100% USDT):');
      console.log(`   USDT Balance: ${usdtBalance}`);
      console.log(`   Current Price: ${currentPrice} USDT`);
      console.log(`   Trading Logic: 100% USDT balance sẽ được sử dụng`);
      
      if (usdtBalance > 0) {
        // Kiểm tra với 100% USDT balance
        const usdtToUse = usdtBalance * 0.99; // 99% để tránh lỗi
        const btcToBuy = usdtToUse / currentPrice;
        const minNotional = 10; // Binance minimum 10 USDT
        
        console.log(`   USDT sẽ sử dụng (100%): ${usdtToUse.toFixed(2)}`);
        console.log(`   BTC sẽ mua: ${btcToBuy.toFixed(6)}`);
        console.log(`   Order value: ${usdtToUse.toFixed(2)} USDT`);
        console.log(`   Minimum required: ${minNotional} USDT`);
        console.log(`   Can BUY: ${usdtToUse >= minNotional ? '✅ YES' : '❌ NO'}`);
        
        if (usdtToUse < minNotional) {
          console.log(`   ❌ REASON: USDT balance (${usdtToUse.toFixed(2)}) < minimum (${minNotional} USDT)`);
          console.log(`   💡 SOLUTION: Wait for more USDT or use smaller minimum`);
        } else {
          console.log(`   ✅ BUY signal sẽ thực hiện với 100% USDT balance`);
        }
        
      } else {
        console.log(`   ❌ USDT Balance = 0 - Cannot BUY`);
      }
      
      // 6. Kiểm tra tất cả balances
      if (balanceData.nonZeroBalances) {
        console.log('\n6️⃣ All non-zero balances:');
        balanceData.nonZeroBalances.forEach((balance, index) => {
          const free = parseFloat(balance.free);
          const locked = parseFloat(balance.locked);
          const total = free + locked;
          
          if (balance.asset === 'BTC') {
            const btcValue = total * currentPrice;
            console.log(`   ${index + 1}. ${balance.asset}:`);
            console.log(`      Free: ${free} (${(free * currentPrice).toFixed(2)} USDT)`);
            console.log(`      Locked: ${locked} (${(locked * currentPrice).toFixed(2)} USDT)`);
            console.log(`      Total: ${total} (${btcValue.toFixed(2)} USDT)`);
            console.log(`      Can SELL: ${btcValue >= 10 ? '✅ YES' : '❌ NO (too small)'}`);
          } else if (balance.asset === 'USDT') {
            console.log(`   ${index + 1}. ${balance.asset}:`);
            console.log(`      Free: ${free} USDT`);
            console.log(`      Locked: ${locked} USDT`);
            console.log(`      Total: ${total} USDT`);
            console.log(`      Can BUY: ${total >= 10 ? '✅ YES' : '❌ NO (too small)'}`);
          } else {
            console.log(`   ${index + 1}. ${balance.asset}: ${free} (free) / ${locked} (locked)`);
          }
        });
      }
      
      // 7. Kết luận và giải pháp
      console.log('\n7️⃣ Conclusion and Solutions (100% Balance Logic):');
      
      if (btcBalance > 0) {
        const btcToSell = btcBalance * 0.99;
        const orderValue = btcToSell * currentPrice;
        
        if (orderValue < 10) {
          console.log('❌ PROBLEM IDENTIFIED:');
          console.log(`   Bot cannot SELL because order value (${orderValue.toFixed(2)} USDT) < minimum (10 USDT)`);
          console.log('');
          console.log('🔍 Root causes:');
          console.log(`   1. BTC balance too small: ${btcBalance}`);
          console.log(`   2. BTC price too low: ${currentPrice} USDT`);
          console.log(`   3. Binance minimum notional requirement: 10 USDT`);
          console.log('');
          console.log('🛠️ Solutions:');
          console.log(`   1. Wait for BTC price to increase to ${(10 / btcToSell).toFixed(2)} USDT`);
          console.log(`   2. Accumulate more BTC to increase balance`);
          console.log(`   3. Check if there are other assets with higher value`);
          console.log(`   4. Bot sẽ tự động bỏ qua SELL signal và chờ signal tiếp theo`);
        } else {
          console.log('✅ No SELL signal issue detected');
          console.log('   Bot sẽ SELL 100% BTC balance khi có SELL signal');
        }
      } else {
        console.log('❌ No BTC balance available for SELL');
      }
      
      if (usdtBalance > 0) {
        const usdtToUse = usdtBalance * 0.99;
        
        if (usdtToUse < 10) {
          console.log('\n❌ BUY PROBLEM IDENTIFIED:');
          console.log(`   Bot cannot BUY because USDT balance (${usdtToUse.toFixed(2)}) < minimum (10 USDT)`);
          console.log('');
          console.log('🛠️ Solutions:');
          console.log(`   1. Wait for more USDT to accumulate`);
          console.log(`   2. Bot sẽ tự động bỏ qua BUY signal và chờ signal tiếp theo`);
        } else {
          console.log('\n✅ No BUY signal issue detected');
          console.log('   Bot sẽ BUY với 100% USDT balance khi có BUY signal');
        }
      } else {
        console.log('\n❌ No USDT balance available for BUY');
      }

    } catch (error) {
      console.error('❌ Error testing APIs:', error.message);
      console.error('Stack trace:', error.stack);
    }

  } catch (error) {
    console.error('❌ Error debugging SELL signal:', error.message);
  }
}

// Chạy script
if (require.main === module) {
  debugSellSignal().catch(console.error);
}

module.exports = { debugSellSignal };
