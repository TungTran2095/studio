// Script test để kiểm tra bot có thực sự dừng không
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

async function testBotStopForce() {
  try {
    console.log('🧪 Bắt đầu test bot stop force...');
    
    // 1. Lấy danh sách bot
    console.log('\n1️⃣ Lấy danh sách bot...');
    const { data: bots, error: fetchError } = await supabase
      .from('trading_bots')
      .select('*')
      .limit(5);
    
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
      console.log(`  - ${bot.name} (ID: ${bot.id}) - Status: ${bot.status}`);
    });
    
    // 2. Force stop tất cả bot
    console.log('\n2️⃣ Force stop tất cả bot...');
    
    const { error: forceStopError } = await supabase
      .from('trading_bots')
      .update({ 
        status: 'stopped',
        updated_at: new Date().toISOString()
      })
      .in('id', bots.map(b => b.id));
    
    if (forceStopError) {
      console.error('❌ Lỗi khi force stop bots:', forceStopError);
    } else {
      console.log('✅ Đã force stop tất cả bot');
    }
    
    // 3. Kiểm tra lại status
    console.log('\n3️⃣ Kiểm tra lại status...');
    const { data: updatedBots, error: checkError } = await supabase
      .from('trading_bots')
      .select('id, name, status')
      .in('id', bots.map(b => b.id));
    
    if (checkError) {
      console.error('❌ Lỗi khi kiểm tra status:', checkError);
    } else {
      console.log('✅ Status sau khi force stop:');
      updatedBots.forEach(bot => {
        console.log(`  - ${bot.name}: ${bot.status}`);
      });
    }
    
    // 4. Test start một bot
    const testBot = bots[0];
    console.log(`\n4️⃣ Test start bot: ${testBot.name}`);
    
    const { error: startError } = await supabase
      .from('trading_bots')
      .update({ 
        status: 'running',
        updated_at: new Date().toISOString()
      })
      .eq('id', testBot.id);
    
    if (startError) {
      console.error('❌ Lỗi khi start bot:', startError);
    } else {
      console.log('✅ Đã start bot');
    }
    
    // 5. Test stop ngay lập tức
    console.log('\n5️⃣ Test stop ngay lập tức...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Đợi 1s
    
    const { error: stopError } = await supabase
      .from('trading_bots')
      .update({ 
        status: 'stopped',
        updated_at: new Date().toISOString()
      })
      .eq('id', testBot.id);
    
    if (stopError) {
      console.error('❌ Lỗi khi stop bot:', stopError);
    } else {
      console.log('✅ Đã stop bot ngay lập tức');
    }
    
    // 6. Kiểm tra final status
    console.log('\n6️⃣ Kiểm tra final status...');
    const { data: finalBot, error: finalError } = await supabase
      .from('trading_bots')
      .select('status')
      .eq('id', testBot.id)
      .single();
    
    if (finalError) {
      console.error('❌ Lỗi khi kiểm tra final status:', finalError);
    } else {
      console.log(`✅ Bot ${testBot.name} có final status: ${finalBot.status}`);
    }
    
    console.log('\n🎉 Test hoàn thành!');
    console.log('\n📋 Hướng dẫn kiểm tra:');
    console.log('1. Vào ứng dụng và kiểm tra xem bot có thực sự dừng không');
    console.log('2. Xem console log để đảm bảo bot dừng an toàn');
    console.log('3. Kiểm tra xem có còn API call nào không');
    
  } catch (error) {
    console.error('❌ Lỗi trong quá trình test:', error);
  }
}

// Chạy test
testBotStopForce();


