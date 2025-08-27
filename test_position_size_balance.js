// Script test để kiểm tra balance và Position Size
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

async function testPositionSizeBalance() {
  try {
    console.log('🧪 Bắt đầu test Position Size và Balance...');
    
    // 1. Lấy danh sách bot
    console.log('\n1️⃣ Lấy danh sách bot...');
    const { data: bots, error: fetchError } = await supabase
      .from('trading_bots')
      .select('*')
      .limit(3);
    
    if (fetchError) {
      console.error('❌ Lỗi khi lấy danh sách bot:', fetchError);
      return;
    }
    
    if (!bots || bots.length === 0) {
      console.log('ℹ️ Không có bot nào trong database');
      return;
    }
    
    console.log(`✅ Tìm thấy ${bots.length} bot:`);
    bots.forEach(bot => {
      console.log(`  - ${bot.name} (ID: ${bot.id})`);
      console.log(`    Status: ${bot.status}`);
      console.log(`    Position Size: ${bot.config?.positionSize || 'N/A'}%`);
      console.log(`    Account: ${bot.config?.account?.testnet ? 'Testnet' : 'Live'}`);
    });
    
    // 2. Test các Position Size khác nhau
    console.log('\n2️⃣ Test các Position Size khác nhau...');
    
    const testPositionSizes = [10, 25, 50, 80, 100];
    
    for (const positionSize of testPositionSizes) {
      console.log(`\n📊 Test Position Size: ${positionSize}%`);
      
      // Giả lập balance
      const mockUsdtBalance = 1000; // 1000 USDT
      const mockBtcBalance = 0.01; // 0.01 BTC
      const mockBtcPrice = 50000; // 50,000 USDT/BTC
      
      // Tính toán quantity
      const usdtToUse = (positionSize / 100) * mockUsdtBalance;
      const buyQuantity = usdtToUse / mockBtcPrice;
      const sellQuantity = (positionSize / 100) * mockBtcBalance;
      
      console.log(`  USDT Balance: ${mockUsdtBalance}`);
      console.log(`  BTC Balance: ${mockBtcBalance}`);
      console.log(`  BTC Price: ${mockBtcPrice}`);
      console.log(`  Buy: Sử dụng ${usdtToUse} USDT → ${buyQuantity.toFixed(6)} BTC`);
      console.log(`  Sell: Bán ${sellQuantity.toFixed(6)} BTC`);
      
      // Kiểm tra rủi ro
      if (positionSize > 80) {
        console.log(`  ⚠️  CẢNH BÁO: Position Size ${positionSize}% rất cao!`);
      }
    }
    
    // 3. Test edge cases
    console.log('\n3️⃣ Test edge cases...');
    
    // Test balance = 0
    console.log('\n📊 Test Balance = 0:');
    const zeroUsdtBalance = 0;
    const zeroBtcBalance = 0;
    const btcPrice = 50000;
    
    const buyQuantityZero = (100 / 100) * zeroUsdtBalance / btcPrice;
    const sellQuantityZero = (100 / 100) * zeroBtcBalance;
    
    console.log(`  USDT Balance: ${zeroUsdtBalance}`);
    console.log(`  BTC Balance: ${zeroBtcBalance}`);
    console.log(`  Buy Quantity (100%): ${buyQuantityZero}`);
    console.log(`  Sell Quantity (100%): ${sellQuantityZero}`);
    console.log(`  ⚠️  Kết quả: Không thể trade với balance = 0`);
    
    // 4. Test validation
    console.log('\n4️⃣ Test validation...');
    
    const invalidPositionSizes = [-1, 0, 101, 150];
    
    for (const invalidSize of invalidPositionSizes) {
      console.log(`  Position Size ${invalidSize}%: ${invalidSize < 1 || invalidSize > 100 ? '❌ Không hợp lệ' : '✅ Hợp lệ'}`);
    }
    
    // 5. Test cập nhật config
    if (bots.length > 0) {
      const testBot = bots[0];
      console.log(`\n5️⃣ Test cập nhật Position Size cho bot: ${testBot.name}`);
      
      const newPositionSize = 75;
      console.log(`  Cập nhật Position Size từ ${testBot.config?.positionSize || 'N/A'}% → ${newPositionSize}%`);
      
      // Giả lập cập nhật config
      const updatedConfig = {
        ...testBot.config,
        positionSize: newPositionSize
      };
      
      console.log(`  Config mới:`, JSON.stringify(updatedConfig, null, 2));
      
      if (newPositionSize > 80) {
        console.log(`  ⚠️  CẢNH BÁO: Position Size ${newPositionSize}% rất cao!`);
      }
    }
    
    console.log('\n🎉 Test hoàn thành!');
    console.log('\n📋 Hướng dẫn kiểm tra:');
    console.log('1. Vào ứng dụng và test Position Size = 100%');
    console.log('2. Kiểm tra xem có lỗi "Quantity không hợp lệ: 0" không');
    console.log('3. Xem console log để đảm bảo bot xử lý balance = 0 đúng cách');
    console.log('4. Kiểm tra cảnh báo khi Position Size > 80%');
    
  } catch (error) {
    console.error('❌ Lỗi trong quá trình test:', error);
  }
}

// Chạy test
testPositionSizeBalance();

