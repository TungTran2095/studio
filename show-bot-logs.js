const { createClient } = require('@supabase/supabase-js');

// Cấu hình Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function showBotLogs() {
  console.log('🔍 Hiển thị tất cả log liên quan đến bot...\n');

  try {
    // 1. Lấy danh sách tất cả bot
    console.log('1️⃣ Lấy danh sách bot...');
    const { data: bots, error: botsError } = await supabase
      .from('trading_bots')
      .select('*')
      .order('created_at', { ascending: false });

    if (botsError) {
      console.error('❌ Lỗi khi lấy danh sách bot:', botsError.message);
      return;
    }

    if (!bots || bots.length === 0) {
      console.log('📭 Không có bot nào trong database');
      return;
    }

    console.log(`✅ Tìm thấy ${bots.length} bot(s):`);
    bots.forEach((bot, index) => {
      console.log(`   ${index + 1}. ${bot.name} (${bot.id})`);
      console.log(`      Status: ${bot.status}`);
      console.log(`      Total Trades: ${bot.total_trades || 0}`);
      console.log(`      Total Profit: ${bot.total_profit || 0}%`);
      console.log(`      Win Rate: ${bot.win_rate || 0}%`);
      console.log(`      Created: ${new Date(bot.created_at).toLocaleString('vi-VN')}`);
      console.log(`      Last Run: ${bot.last_run_at ? new Date(bot.last_run_at).toLocaleString('vi-VN') : 'Never'}`);
      console.log(`      Last Error: ${bot.last_error || 'None'}`);
      console.log('');
    });

    // 2. Lấy log từ bảng bot_logs nếu có
    console.log('2️⃣ Kiểm tra bảng bot_logs...');
    try {
      const { data: botLogs, error: logsError } = await supabase
        .from('bot_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (logsError) {
        console.log('⚠️ Bảng bot_logs không tồn tại hoặc có lỗi:', logsError.message);
      } else if (botLogs && botLogs.length > 0) {
        console.log(`✅ Tìm thấy ${botLogs.length} log entries:`);
        botLogs.forEach((log, index) => {
          console.log(`   ${index + 1}. [${new Date(log.created_at).toLocaleString('vi-VN')}] ${log.level}: ${log.message}`);
          if (log.data) {
            console.log(`      Data: ${JSON.stringify(log.data, null, 2)}`);
          }
        });
      } else {
        console.log('📭 Không có log entries trong bảng bot_logs');
      }
    } catch (error) {
      console.log('⚠️ Không thể truy cập bảng bot_logs:', error.message);
    }

    // 3. Lấy indicator logs
    console.log('\n3️⃣ Kiểm tra indicator logs...');
    try {
      const { data: indicatorLogs, error: indicatorError } = await supabase
        .from('bot_indicator_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (indicatorError) {
        console.log('⚠️ Bảng bot_indicator_logs không tồn tại hoặc có lỗi:', indicatorError.message);
      } else if (indicatorLogs && indicatorLogs.length > 0) {
        console.log(`✅ Tìm thấy ${indicatorLogs.length} indicator log entries:`);
        indicatorLogs.forEach((log, index) => {
          console.log(`   ${index + 1}. [${new Date(log.created_at).toLocaleString('vi-VN')}] Bot: ${log.bot_id}`);
          console.log(`      Symbol: ${log.symbol}, RSI: ${log.rsi_value}, Signal: ${log.signal}`);
        });
      } else {
        console.log('📭 Không có indicator log entries');
      }
    } catch (error) {
      console.log('⚠️ Không thể truy cập bảng bot_indicator_logs:', error.message);
    }

    // 4. Lấy trades gần đây
    console.log('\n4️⃣ Lấy trades gần đây...');
    try {
      const { data: trades, error: tradesError } = await supabase
        .from('trades')
        .select('*')
        .order('open_time', { ascending: false })
        .limit(20);

      if (tradesError) {
        console.log('⚠️ Bảng trades không tồn tại hoặc có lỗi:', tradesError.message);
      } else if (trades && trades.length > 0) {
        console.log(`✅ Tìm thấy ${trades.length} trades gần đây:`);
        trades.forEach((trade, index) => {
          console.log(`   ${index + 1}. ${trade.side} ${trade.quantity} ${trade.symbol}`);
          console.log(`      Entry Price: ${trade.entry_price}, Status: ${trade.status}`);
          console.log(`      Open Time: ${new Date(trade.open_time).toLocaleString('vi-VN')}`);
          console.log(`      P&L: ${trade.pnl || 'N/A'}`);
        });
      } else {
        console.log('📭 Không có trades nào');
      }
    } catch (error) {
      console.log('⚠️ Không thể truy cập bảng trades:', error.message);
    }

    // 5. Kiểm tra bot status real-time
    console.log('\n5️⃣ Kiểm tra trạng thái bot real-time...');
    const runningBots = bots.filter(bot => bot.status === 'running');
    const stoppedBots = bots.filter(bot => bot.status === 'stopped');
    const errorBots = bots.filter(bot => bot.status === 'error');

    console.log(`🚀 Running bots: ${runningBots.length}`);
    runningBots.forEach(bot => {
      console.log(`   - ${bot.name} (${bot.id}) - Last run: ${bot.last_run_at ? new Date(bot.last_run_at).toLocaleString('vi-VN') : 'Never'}`);
    });

    console.log(`⏸️ Stopped bots: ${stoppedBots.length}`);
    stoppedBots.forEach(bot => {
      console.log(`   - ${bot.name} (${bot.id}) - Last run: ${bot.last_run_at ? new Date(bot.last_run_at).toLocaleString('vi-VN') : 'Never'}`);
    });

    if (errorBots.length > 0) {
      console.log(`❌ Error bots: ${errorBots.length}`);
      errorBots.forEach(bot => {
        console.log(`   - ${bot.name} (${bot.id}) - Error: ${bot.last_error}`);
      });
    }

    // 6. Hiển thị thống kê tổng quan
    console.log('\n6️⃣ Thống kê tổng quan:');
    const totalTrades = bots.reduce((sum, bot) => sum + (bot.total_trades || 0), 0);
    const totalProfit = bots.reduce((sum, bot) => sum + (bot.total_profit || 0), 0);
    const avgWinRate = bots.reduce((sum, bot) => sum + (bot.win_rate || 0), 0) / bots.length;

    console.log(`📊 Tổng số trades: ${totalTrades}`);
    console.log(`💰 Tổng profit: ${totalProfit.toFixed(2)}%`);
    console.log(`🎯 Win rate trung bình: ${avgWinRate.toFixed(2)}%`);
    console.log(`🤖 Tổng số bot: ${bots.length}`);

  } catch (error) {
    console.error('❌ Lỗi khi hiển thị bot logs:', error.message);
  }
}

// Chạy script
if (require.main === module) {
  showBotLogs().catch(console.error);
}

module.exports = { showBotLogs };
