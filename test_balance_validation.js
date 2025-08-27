// Script test để kiểm tra balance validation
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

async function testBalanceValidation() {
  try {
    console.log('🧪 Bắt đầu test Balance Validation...');
    
    // 1. Test các trường hợp balance khác nhau
    console.log('\n1️⃣ Test các trường hợp balance khác nhau...');
    
    const testCases = [
      {
        name: 'Balance đủ',
        usdtBalance: 1000,
        btcBalance: 0.01,
        btcPrice: 50000,
        positionSize: 50
      },
      {
        name: 'Balance thiếu USDT',
        usdtBalance: 100,
        btcBalance: 0.01,
        btcPrice: 50000,
        positionSize: 100
      },
      {
        name: 'Balance thiếu BTC',
        usdtBalance: 1000,
        btcBalance: 0.001,
        btcPrice: 50000,
        positionSize: 100
      },
      {
        name: 'Balance = 0',
        usdtBalance: 0,
        btcBalance: 0,
        btcPrice: 50000,
        positionSize: 100
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n📊 Test: ${testCase.name}`);
      console.log(`  USDT Balance: ${testCase.usdtBalance}`);
      console.log(`  BTC Balance: ${testCase.btcBalance}`);
      console.log(`  BTC Price: ${testCase.btcPrice}`);
      console.log(`  Position Size: ${testCase.positionSize}%`);
      
      // Test BUY
      const requiredUsdt = (testCase.positionSize / 100) * testCase.usdtBalance;
      const buyQuantity = requiredUsdt / testCase.btcPrice;
      
      if (testCase.usdtBalance <= 0) {
        console.log(`  BUY: ❌ Không thể BUY - USDT balance = 0`);
      } else if (requiredUsdt > testCase.usdtBalance) {
        console.log(`  BUY: ⚠️ Không đủ USDT - cần ${requiredUsdt.toFixed(2)}, có ${testCase.usdtBalance}`);
        console.log(`  BUY: 🔧 Điều chỉnh: sử dụng ${(testCase.usdtBalance * 0.99).toFixed(2)} USDT → ${((testCase.usdtBalance * 0.99) / testCase.btcPrice).toFixed(6)} BTC`);
      } else {
        console.log(`  BUY: ✅ Có thể BUY ${buyQuantity.toFixed(6)} BTC`);
      }
      
      // Test SELL
      const sellQuantity = (testCase.positionSize / 100) * testCase.btcBalance;
      
      if (testCase.btcBalance <= 0) {
        console.log(`  SELL: ❌ Không thể SELL - BTC balance = 0`);
      } else if (sellQuantity > testCase.btcBalance) {
        console.log(`  SELL: ⚠️ Không đủ BTC - cần bán ${sellQuantity.toFixed(6)}, có ${testCase.btcBalance}`);
        console.log(`  SELL: 🔧 Điều chỉnh: bán ${(testCase.btcBalance * 0.99).toFixed(6)} BTC`);
      } else {
        console.log(`  SELL: ✅ Có thể SELL ${sellQuantity.toFixed(6)} BTC`);
      }
    }
    
    // 2. Test edge cases
    console.log('\n2️⃣ Test edge cases...');
    
    // Test Position Size = 100% với balance nhỏ
    console.log('\n📊 Test Position Size = 100% với balance nhỏ:');
    const smallUsdtBalance = 10; // 10 USDT
    const smallBtcBalance = 0.0001; // 0.0001 BTC
    const btcPrice = 50000;
    
    const usdtNeeded = (100 / 100) * smallUsdtBalance;
    const btcNeeded = (100 / 100) * smallBtcBalance;
    
    console.log(`  USDT Balance: ${smallUsdtBalance}`);
    console.log(`  BTC Balance: ${smallBtcBalance}`);
    console.log(`  BTC Price: ${btcPrice}`);
    console.log(`  BUY: ${usdtNeeded} USDT → ${(usdtNeeded / btcPrice).toFixed(8)} BTC`);
    console.log(`  SELL: ${btcNeeded.toFixed(8)} BTC`);
    
    // 3. Test validation logic
    console.log('\n3️⃣ Test validation logic...');
    
    console.log('\n📊 Test quantity validation:');
    const testQuantities = [0, -1, NaN, 0.000001, 1, 100];
    
    for (const qty of testQuantities) {
      const isValid = qty > 0 && !isNaN(qty);
      console.log(`  Quantity ${qty}: ${isValid ? '✅ Hợp lệ' : '❌ Không hợp lệ'}`);
    }
    
    // 4. Test balance check trước order
    console.log('\n4️⃣ Test balance check trước order...');
    
    const finalTestCases = [
      {
        name: 'BUY - Đủ balance',
        signal: 'buy',
        quantity: 0.001,
        price: 50000,
        usdtBalance: 1000,
        btcBalance: 0.01
      },
      {
        name: 'BUY - Thiếu balance',
        signal: 'buy',
        quantity: 0.1,
        price: 50000,
        usdtBalance: 100,
        btcBalance: 0.01
      },
      {
        name: 'SELL - Đủ balance',
        signal: 'sell',
        quantity: 0.005,
        price: 50000,
        usdtBalance: 1000,
        btcBalance: 0.01
      },
      {
        name: 'SELL - Thiếu balance',
        signal: 'sell',
        quantity: 0.1,
        price: 50000,
        usdtBalance: 1000,
        btcBalance: 0.001
      }
    ];
    
    for (const testCase of finalTestCases) {
      console.log(`\n📊 ${testCase.name}:`);
      
      if (testCase.signal === 'buy') {
        const requiredUsdt = testCase.quantity * testCase.price;
        const hasEnoughUsdt = requiredUsdt <= testCase.usdtBalance;
        
        console.log(`  Quantity: ${testCase.quantity} BTC`);
        console.log(`  Price: ${testCase.price} USDT`);
        console.log(`  Required USDT: ${requiredUsdt.toFixed(2)}`);
        console.log(`  Available USDT: ${testCase.usdtBalance}`);
        console.log(`  Result: ${hasEnoughUsdt ? '✅ Có thể BUY' : '❌ Không đủ USDT'}`);
      } else {
        const hasEnoughBtc = testCase.quantity <= testCase.btcBalance;
        
        console.log(`  Quantity: ${testCase.quantity} BTC`);
        console.log(`  Available BTC: ${testCase.btcBalance}`);
        console.log(`  Result: ${hasEnoughBtc ? '✅ Có thể SELL' : '❌ Không đủ BTC'}`);
      }
    }
    
    console.log('\n🎉 Test hoàn thành!');
    console.log('\n📋 Hướng dẫn kiểm tra:');
    console.log('1. Vào ứng dụng và test Position Size = 100%');
    console.log('2. Kiểm tra xem có lỗi "insufficient balance" không');
    console.log('3. Xem console log để đảm bảo bot tự động điều chỉnh quantity');
    console.log('4. Kiểm tra cảnh báo về balance trong frontend');
    
  } catch (error) {
    console.error('❌ Lỗi trong quá trình test:', error);
  }
}

// Chạy test
testBalanceValidation();

