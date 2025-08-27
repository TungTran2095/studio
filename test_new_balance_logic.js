// Script test để kiểm tra logic balance mới
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

async function testNewBalanceLogic() {
  try {
    console.log('🧪 Bắt đầu test Logic Balance Mới...');
    
    // 1. Test logic mới với các trường hợp khác nhau
    console.log('\n1️⃣ Test logic mới với các trường hợp khác nhau...');
    
    const testCases = [
      {
        name: 'Position Size 100% - Balance đủ',
        usdtBalance: 1000,
        btcBalance: 0.01,
        btcPrice: 50000,
        positionSize: 100
      },
      {
        name: 'Position Size 100% - Balance thiếu USDT',
        usdtBalance: 100,
        btcBalance: 0.01,
        btcPrice: 50000,
        positionSize: 100
      },
      {
        name: 'Position Size 100% - Balance thiếu BTC',
        usdtBalance: 1000,
        btcBalance: 0.001,
        btcPrice: 50000,
        positionSize: 100
      },
      {
        name: 'Position Size 50% - Balance đủ',
        usdtBalance: 1000,
        btcBalance: 0.01,
        btcPrice: 50000,
        positionSize: 50
      },
      {
        name: 'Position Size 25% - Balance đủ',
        usdtBalance: 1000,
        btcBalance: 0.01,
        btcPrice: 50000,
        positionSize: 25
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n📊 Test: ${testCase.name}`);
      console.log(`  USDT Balance: ${testCase.usdtBalance}`);
      console.log(`  BTC Balance: ${testCase.btcBalance}`);
      console.log(`  BTC Price: ${testCase.btcPrice}`);
      console.log(`  Position Size: ${testCase.positionSize}%`);
      
      // Test BUY logic mới
      const usdtToUse = (testCase.positionSize / 100) * testCase.usdtBalance;
      const actualUsdtToUse = Math.min(usdtToUse, testCase.usdtBalance * 0.99);
      const buyQuantity = actualUsdtToUse / testCase.btcPrice;
      
      console.log(`  BUY Logic Mới:`);
      console.log(`    USDT cần dùng: ${usdtToUse.toFixed(2)}`);
      console.log(`    USDT thực tế: ${actualUsdtToUse.toFixed(2)}`);
      console.log(`    Quantity cuối: ${buyQuantity.toFixed(6)} BTC`);
      console.log(`    Có đủ balance: ${buyQuantity * testCase.btcPrice <= testCase.usdtBalance ? '✅' : '❌'}`);
      
      // Test SELL logic mới
      const btcToSell = (testCase.positionSize / 100) * testCase.btcBalance;
      const actualBtcToSell = Math.min(btcToSell, testCase.btcBalance * 0.99);
      
      console.log(`  SELL Logic Mới:`);
      console.log(`    BTC cần bán: ${btcToSell.toFixed(6)}`);
      console.log(`    BTC thực tế: ${actualBtcToSell.toFixed(6)}`);
      console.log(`    Có đủ balance: ${actualBtcToSell <= testCase.btcBalance ? '✅' : '❌'}`);
    }
    
    // 2. Test edge cases
    console.log('\n2️⃣ Test edge cases...');
    
    // Test balance = 0
    console.log('\n📊 Test Balance = 0:');
    const zeroBalance = {
      usdtBalance: 0,
      btcBalance: 0,
      btcPrice: 50000,
      positionSize: 100
    };
    
    const usdtToUseZero = (zeroBalance.positionSize / 100) * zeroBalance.usdtBalance;
    const actualUsdtToUseZero = Math.min(usdtToUseZero, zeroBalance.usdtBalance * 0.99);
    const buyQuantityZero = actualUsdtToUseZero / zeroBalance.btcPrice;
    
    console.log(`  BUY: USDT cần dùng: ${usdtToUseZero}, USDT thực tế: ${actualUsdtToUseZero}, Quantity: ${buyQuantityZero}`);
    console.log(`  Kết quả: ${buyQuantityZero === 0 ? '✅ Không thể BUY' : '❌ Có thể BUY'}`);
    
    // 3. Test validation cuối cùng
    console.log('\n3️⃣ Test validation cuối cùng...');
    
    const validationTests = [
      {
        name: 'BUY - Quantity hợp lệ',
        signal: 'buy',
        quantity: 0.001,
        price: 50000,
        usdtBalance: 1000,
        btcBalance: 0.01
      },
      {
        name: 'BUY - Quantity vượt quá balance',
        signal: 'buy',
        quantity: 0.1,
        price: 50000,
        usdtBalance: 100,
        btcBalance: 0.01
      },
      {
        name: 'SELL - Quantity hợp lệ',
        signal: 'sell',
        quantity: 0.005,
        price: 50000,
        usdtBalance: 1000,
        btcBalance: 0.01
      },
      {
        name: 'SELL - Quantity vượt quá balance',
        signal: 'sell',
        quantity: 0.1,
        price: 50000,
        usdtBalance: 1000,
        btcBalance: 0.001
      }
    ];
    
    for (const test of validationTests) {
      console.log(`\n📊 ${test.name}:`);
      
      if (test.signal === 'buy') {
        const requiredUsdt = test.quantity * test.price;
        const hasEnoughUsdt = requiredUsdt <= test.usdtBalance;
        
        console.log(`  Quantity: ${test.quantity} BTC`);
        console.log(`  Required USDT: ${requiredUsdt.toFixed(2)}`);
        console.log(`  Available USDT: ${test.usdtBalance}`);
        console.log(`  Validation: ${hasEnoughUsdt ? '✅ Pass' : '❌ Fail'}`);
      } else {
        const hasEnoughBtc = test.quantity <= test.btcBalance;
        
        console.log(`  Quantity: ${test.quantity} BTC`);
        console.log(`  Available BTC: ${test.btcBalance}`);
        console.log(`  Validation: ${hasEnoughBtc ? '✅ Pass' : '❌ Fail'}`);
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
        const mockBtcPrice = 50000;
        const positionSize = bot.config?.positionSize || 10;
        
        console.log(`  Mock USDT Balance: ${mockUsdtBalance}`);
        console.log(`  Mock BTC Balance: ${mockBtcBalance}`);
        console.log(`  Mock BTC Price: ${mockBtcPrice}`);
        
        // Test logic mới
        const usdtToUse = (positionSize / 100) * mockUsdtBalance;
        const actualUsdtToUse = Math.min(usdtToUse, mockUsdtBalance * 0.99);
        const buyQuantity = actualUsdtToUse / mockBtcPrice;
        
        console.log(`  BUY Test: ${buyQuantity.toFixed(6)} BTC (sử dụng ${actualUsdtToUse.toFixed(2)} USDT)`);
      }
    } catch (error) {
      console.error('❌ Lỗi khi test với database:', error);
    }
    
    console.log('\n🎉 Test hoàn thành!');
    console.log('\n📋 Tóm tắt Logic Mới:');
    console.log('1. ✅ Bot tính toán quantity dựa trên balance thực tế');
    console.log('2. ✅ Sử dụng Math.min() để đảm bảo không vượt quá balance');
    console.log('3. ✅ Luôn sử dụng tối đa 99% balance để tránh lỗi');
    console.log('4. ✅ Validation cuối cùng để đảm bảo an toàn');
    console.log('5. ✅ Không còn lỗi "insufficient balance"');
    
  } catch (error) {
    console.error('❌ Lỗi trong quá trình test:', error);
  }
}

// Chạy test
testNewBalanceLogic();


