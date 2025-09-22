const { createClient } = require('@supabase/supabase-js');

// Cấu hình Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRunningBots() {
  try {
    const { data: bots, error } = await supabase
      .from('trading_bots')
      .select('id, name, status, last_run_at')
      .eq('status', 'running');

    if (error) {
      console.error('❌ Lỗi khi lấy danh sách bot:', error.message);
      return;
    }

    if (!bots || bots.length === 0) {
      console.log('📭 Không có bot nào đang chạy');
      return;
    }

    console.log(`🚀 Có ${bots.length} bot đang chạy:`);
    bots.forEach((bot, idx) => {
      console.log(`   ${idx + 1}. ${bot.name} (${bot.id}) - Last run: ${bot.last_run_at ? new Date(bot.last_run_at).toLocaleString('vi-VN') : 'Never'}`);
    });
  } catch (err) {
    console.error('❌ Lỗi khi kiểm tra bot:', err.message);
  }
}

if (require.main === module) {
  checkRunningBots();
}
