const { createClient } = require('@supabase/supabase-js');

// Cấu hình Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Thiếu cấu hình Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBotStatus() {
  try {
    console.log('🔍 Đang kiểm tra trạng thái bot...');
    
    // Lấy tất cả bot
    const { data: allBots, error } = await supabase
      .from('trading_bots')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Lỗi khi lấy danh sách bot:', error);
      return;
    }

    if (!allBots || allBots.length === 0) {
      console.log('📝 Không có bot nào trong hệ thống');
      return;
    }

    console.log(`📊 Tổng số bot: ${allBots.length}`);
    console.log('\n📋 Chi tiết từng bot:');
    console.log('─'.repeat(80));

    const statusCounts = {
      idle: 0,
      running: 0,
      stopped: 0,
      error: 0
    };

    allBots.forEach((bot, index) => {
      statusCounts[bot.status]++;
      
      console.log(`${index + 1}. ${bot.name}`);
      console.log(`   ID: ${bot.id}`);
      console.log(`   Status: ${bot.status}`);
      console.log(`   Tổng giao dịch: ${bot.total_trades || 0}`);
      console.log(`   Lợi nhuận: ${bot.total_profit || 0}%`);
      console.log(`   Tỷ lệ thắng: ${bot.win_rate || 0}%`);
      console.log(`   Lần chạy cuối: ${bot.last_run_at || 'Chưa chạy'}`);
      console.log(`   Cập nhật cuối: ${bot.updated_at}`);
      console.log(`   Tạo lúc: ${bot.created_at}`);
      console.log('');
    });

    console.log('📈 Thống kê theo trạng thái:');
    console.log(`   Idle: ${statusCounts.idle}`);
    console.log(`   Running: ${statusCounts.running}`);
    console.log(`   Stopped: ${statusCounts.stopped}`);
    console.log(`   Error: ${statusCounts.error}`);

    // Kiểm tra bot đang chạy
    const runningBots = allBots.filter(bot => bot.status === 'running');
    if (runningBots.length > 0) {
      console.log('\n⚠️ CẢNH BÁO: Có bot đang chạy!');
      console.log('Các bot đang chạy:');
      runningBots.forEach(bot => {
        console.log(`   - ${bot.name} (ID: ${bot.id})`);
      });
      console.log('\n💡 Gợi ý: Chạy script stop-all-bots.js để dừng tất cả bot');
    } else {
      console.log('\n✅ Không có bot nào đang chạy');
    }

    // Kiểm tra bot có lỗi
    const errorBots = allBots.filter(bot => bot.status === 'error');
    if (errorBots.length > 0) {
      console.log('\n❌ Có bot gặp lỗi:');
      errorBots.forEach(bot => {
        console.log(`   - ${bot.name} (ID: ${bot.id})`);
        if (bot.last_error) {
          console.log(`     Lỗi: ${bot.last_error}`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Lỗi:', error);
  }
}

// Chạy script
checkBotStatus().then(() => {
  console.log('\n🏁 Hoàn thành kiểm tra');
  process.exit(0);
}).catch(error => {
  console.error('❌ Lỗi:', error);
  process.exit(1);
}); 