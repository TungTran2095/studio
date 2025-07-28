const { createClient } = require('@supabase/supabase-js');

// Cấu hình Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Thiếu cấu hình Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function stopAllRunningBots() {
  try {
    console.log('🔄 Đang tìm tất cả bot đang chạy...');
    
    // Lấy tất cả bot có status 'running'
    const { data: runningBots, error } = await supabase
      .from('trading_bots')
      .select('*')
      .eq('status', 'running');

    if (error) {
      console.error('❌ Lỗi khi lấy danh sách bot:', error);
      return;
    }

    if (!runningBots || runningBots.length === 0) {
      console.log('✅ Không có bot nào đang chạy');
      return;
    }

    console.log(`📊 Tìm thấy ${runningBots.length} bot đang chạy:`);
    runningBots.forEach(bot => {
      console.log(`  - ${bot.name} (ID: ${bot.id})`);
    });

    // Cập nhật tất cả bot về status 'stopped'
    const { error: updateError } = await supabase
      .from('trading_bots')
      .update({ 
        status: 'stopped',
        updated_at: new Date().toISOString()
      })
      .eq('status', 'running');

    if (updateError) {
      console.error('❌ Lỗi khi cập nhật status bot:', updateError);
      return;
    }

    console.log('✅ Đã dừng tất cả bot đang chạy');

    // Kiểm tra lại
    const { data: remainingRunningBots } = await supabase
      .from('trading_bots')
      .select('*')
      .eq('status', 'running');

    if (remainingRunningBots && remainingRunningBots.length > 0) {
      console.log(`⚠️ Vẫn còn ${remainingRunningBots.length} bot đang chạy`);
    } else {
      console.log('✅ Tất cả bot đã được dừng thành công');
    }

  } catch (error) {
    console.error('❌ Lỗi:', error);
  }
}

// Chạy script
stopAllRunningBots().then(() => {
  console.log('🏁 Hoàn thành');
  process.exit(0);
}).catch(error => {
  console.error('❌ Lỗi:', error);
  process.exit(1);
}); 