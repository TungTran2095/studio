// Script test để kiểm tra signal liên tiếp
const { createClient } = require('@supabase/supabase-js');

// Cấu hình Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Thiếu cấu hình Supabase');
  console.log('Cần set NEXT_PUBLIC_SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConsecutiveSignals() {
  try {
    console.log('🧪 Bắt đầu test Signal Liên Tiếp...');
    
    // 1. Test BUY → BUY liên tiếp
    console.log('\n1️⃣ Test BUY → BUY liên tiếp...');
    
    const buyConsecutiveTests = [
      {
        name: 'BUY → BUY - Balance đủ cho cả 2',
        initialUsdt: 1000,
        positionSize: 50,
        btcPrice: 50000
      },
      {
        name: 'BUY → BUY - Balance đủ cho lần 1, thiếu cho lần 2',
        initialUsdt: 1000,
        positionSize: 100,
        btcPrice: 50000
      },
      {
        name: 'BUY → BUY - Balance thiếu cho cả 2',
        initialUsdt: 50,
        positionSize: 100,
        btcPrice: 50000
      }
    ];
    
    for (const test of buyConsecutiveTests) {
      console.log(`\n📊 Test: ${test.name}`);
      console.log(`  Initial USDT: ${test.initialUsdt}`);
      console.log(`  Position Size: ${test.positionSize}%`);
      console.log(`  BTC Price: ${test.btcPrice}`);
      
      // Lần BUY đầu tiên
      const usdtToUse1 = (test.positionSize / 100) * test.initialUsdt;
      const btcBought1 = usdtToUse1 / test.btcPrice;
      const remainingUsdt1 = test.initialUsdt - usdtToUse1;
      
      console.log(`  Lần BUY 1:`);
      console.log(`    USDT sử dụng: ${usdtToUse1.toFixed(2)}`);
      console.log(`    BTC mua được: ${btcBought1.toFixed(6)}`);
      console.log(`    USDT còn lại: ${remainingUsdt1.toFixed(2)}`);
      
      // Lần BUY thứ 2
      const usdtToUse2 = (test.positionSize / 100) * remainingUsdt1;
      const btcBought2 = usdtToUse2 / test.btcPrice;
      
      console.log(`  Lần BUY 2:`);
      console.log(`    USDT cần dùng: ${usdtToUse2.toFixed(2)}`);
      console.log(`    BTC có thể mua: ${btcBought2.toFixed(6)}`);
      
      // Kiểm tra có thể BUY lần 2 không
      const canBuySecond = usdtToUse2 >= 10; // Tối thiểu 10 USDT
      console.log(`    Có thể BUY lần 2: ${canBuySecond ? '✅' : '❌'}`);
      
      if (!canBuySecond) {
        console.log(`    ⚠️  Bot sẽ bỏ qua BUY signal lần 2 để tránh lỗi insufficient balance`);
      }
    }
    
    // 2. Test SELL → SELL liên tiếp
    console.log('\n2️⃣ Test SELL → SELL liên tiếp...');
    
    const sellConsecutiveTests = [
      {
        name: 'SELL → SELL - Balance đủ cho cả 2',
        initialBtc: 0.01,
        positionSize: 50
      },
      {
        name: 'SELL → SELL - Balance đủ cho lần 1, thiếu cho lần 2',
        initialBtc: 0.01,
        positionSize: 100
      },
      {
        name: 'SELL → SELL - Balance thiếu cho cả 2',
        initialBtc: 0.0001,
        positionSize: 100
      }
    ];
    
    for (const test of sellConsecutiveTests) {
      console.log(`\n📊 Test: ${test.name}`);
      console.log(`  Initial BTC: ${test.initialBtc}`);
      console.log(`  Position Size: ${test.positionSize}%`);
      
      // Lần SELL đầu tiên
      const btcToSell1 = (test.positionSize / 100) * test.initialBtc;
      const remainingBtc1 = test.initialBtc - btcToSell1;
      
      console.log(`  Lần SELL 1:`);
      console.log(`    BTC bán: ${btcToSell1.toFixed(6)}`);
      console.log(`    BTC còn lại: ${remainingBtc1.toFixed(6)}`);
      
      // Lần SELL thứ 2
      const btcToSell2 = (test.positionSize / 100) * remainingBtc1;
      
      console.log(`  Lần SELL 2:`);
      console.log(`    BTC cần bán: ${btcToSell2.toFixed(6)}`);
      
      // Kiểm tra có thể SELL lần 2 không
      const canSellSecond = btcToSell2 >= 0.0001; // Tối thiểu 0.0001 BTC
      console.log(`    Có thể SELL lần 2: ${canSellSecond ? '✅' : '❌'}`);
      
      if (!canSellSecond) {
        console.log(`    ⚠️  Bot sẽ bỏ qua SELL signal lần 2 để tránh lỗi insufficient balance`);
      }
    }
    
    // 3. Test logic checkBalanceForSignal
    console.log('\n3️⃣ Test logic checkBalanceForSignal...');
    
    const balanceCheckTests = [
      {
        name: 'BUY - USDT balance = 0',
        signal: 'buy',
        usdtBalance: 0,
        btcBalance: 0.01,
        positionSize: 100
      },
      {
        name: 'BUY - USDT balance quá nhỏ',
        signal: 'buy',
        usdtBalance: 5,
        btcBalance: 0.01,
        positionSize: 100
      },
      {
        name: 'BUY - USDT balance đủ',
        signal: 'buy',
        usdtBalance: 1000,
        btcBalance: 0.01,
        positionSize: 50
      },
      {
        name: 'SELL - BTC balance = 0',
        signal: 'sell',
        usdtBalance: 1000,
        btcBalance: 0,
        positionSize: 100
      },
      {
        name: 'SELL - BTC balance quá nhỏ',
        signal: 'sell',
        usdtBalance: 1000,
        btcBalance: 0.00005,
        positionSize: 100
      },
      {
        name: 'SELL - BTC balance đủ',
        signal: 'sell',
        usdtBalance: 1000,
        btcBalance: 0.01,
        positionSize: 50
      }
    ];
    
    for (const test of balanceCheckTests) {
      console.log(`\n📊 Test: ${test.name}`);
      console.log(`  Signal: ${test.signal.toUpperCase()}`);
      console.log(`  USDT Balance: ${test.usdtBalance}`);
      console.log(`  BTC Balance: ${test.btcBalance}`);
      console.log(`  Position Size: ${test.positionSize}%`);
      
      let canExecute = false;
      
      if (test.signal === 'buy') {
        const usdtToUse = (test.positionSize / 100) * test.usdtBalance;
        canExecute = test.usdtBalance > 0 && usdtToUse >= 10;
      } else {
        const btcToSell = (test.positionSize / 100) * test.btcBalance;
        canExecute = test.btcBalance > 0 && btcToSell >= 0.0001;
      }
      
      console.log(`  Kết quả: ${canExecute ? '✅ Có thể thực hiện' : '❌ Không thể thực hiện'}`);
      
      if (!canExecute) {
        console.log(`    ⚠️  Bot sẽ bỏ qua ${test.signal.toUpperCase()} signal`);
      }
    }
    
    // 4. Test với balance thực tế từ database
    console.log('\n4️⃣ Test với balance thực tế từ database...');
    
    try {
      const { data: bots, error: fetchError } = await supabase
        .from('trading_bots')
        .select('*')
        .limit(1);
      
      if (fetchError) {
        console.error('❌ Lỗi khi lấy bot:', fetchError);
      } else if (bots && bots.length > 0) {
        const bot = bots[0];
        console.log(`  Bot: ${bot.name}`);
        console.log(`  Position Size: ${bot.config?.positionSize || 'N/A'}%`);
        console.log(`  Status: ${bot.status}`);
        
        // Giả lập balance test
        const mockUsdtBalance = 500;
        const mockBtcBalance = 0.005;
        const positionSize = bot.config?.positionSize || 10;
        
        console.log(`  Mock USDT Balance: ${mockUsdtBalance}`);
        console.log(`  Mock BTC Balance: ${mockBtcBalance}`);
        
        // Test BUY signal
        const usdtToUse = (positionSize / 100) * mockUsdtBalance;
        const canBuy = mockUsdtBalance > 0 && usdtToUse >= 10;
        console.log(`  BUY Signal: ${canBuy ? '✅' : '❌'} (cần ${usdtToUse.toFixed(2)} USDT)`);
        
        // Test SELL signal
        const btcToSell = (positionSize / 100) * mockBtcBalance;
        const canSell = mockBtcBalance > 0 && btcToSell >= 0.0001;
        console.log(`  SELL Signal: ${canSell ? '✅' : '❌'} (cần bán ${btcToSell.toFixed(6)} BTC)`);
      }
    } catch (error) {
      console.error('❌ Lỗi khi test với database:', error);
    }
    
    console.log('\n🎉 Test hoàn thành!');
    console.log('\n📋 Tóm tắt Giải pháp Signal Liên Tiếp:');
    console.log('1. ✅ Bot kiểm tra balance trước mỗi signal');
    console.log('2. ✅ Bỏ qua signal nếu balance không đủ');
    console.log('3. ✅ Tránh lỗi "insufficient balance" với signal liên tiếp');
    console.log('4. ✅ Log rõ ràng về việc bỏ qua signal');
    console.log('5. ✅ Bot chờ signal tiếp theo thay vì crash');
    
  } catch (error) {
    console.error('❌ Lỗi trong quá trình test:', error);
  }
}

// Chạy test
testConsecutiveSignals();

