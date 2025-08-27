// Script test để kiểm tra nút start/stop bot
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

async function testBotStartStop() {
  try {
    console.log('🧪 Bắt đầu test bot start/stop...');
    
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
    
    // 2. Test update status
    const testBot = bots[0];
    console.log(`\n2️⃣ Test update status cho bot: ${testBot.name}`);
    
    // Test update thành running
    console.log('🔄 Cập nhật status thành "running"...');
    const { error: updateRunningError } = await supabase
      .from('trading_bots')
      .update({ 
        status: 'running',
        updated_at: new Date().toISOString()
      })
      .eq('id', testBot.id);
    
    if (updateRunningError) {
      console.error('❌ Lỗi khi update status thành running:', updateRunningError);
    } else {
      console.log('✅ Đã update status thành running');
    }
    
    // Test update thành stopped
    console.log('🔄 Cập nhật status thành "stopped"...');
    const { error: updateStoppedError } = await supabase
      .from('trading_bots')
      .update({ 
        status: 'stopped',
        updated_at: new Date().toISOString()
      })
      .eq('id', testBot.id);
    
    if (updateStoppedError) {
      console.error('❌ Lỗi khi update status thành stopped:', updateStoppedError);
    } else {
      console.log('✅ Đã update status thành stopped');
    }
    
    // 3. Kiểm tra lại status
    console.log('\n3️⃣ Kiểm tra lại status...');
    const { data: updatedBot, error: checkError } = await supabase
      .from('trading_bots')
      .select('status')
      .eq('id', testBot.id)
      .single();
    
    if (checkError) {
      console.error('❌ Lỗi khi kiểm tra status:', checkError);
    } else {
      console.log(`✅ Bot ${testBot.name} có status: ${updatedBot.status}`);
    }
    
    console.log('\n🎉 Test hoàn thành!');
    
  } catch (error) {
    console.error('❌ Lỗi trong quá trình test:', error);
  }
}

// Chạy test
testBotStartStop();

