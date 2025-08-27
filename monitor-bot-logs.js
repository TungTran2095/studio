const { createClient } = require('@supabase/supabase-js');

// Cấu hình Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(supabaseUrl, supabaseKey);

let lastCheckTime = new Date();
let isMonitoring = true;

async function monitorBotLogs() {
  console.log('🔍 Bắt đầu theo dõi log real-time của bot...');
  console.log('📊 Nhấn Ctrl+C để dừng monitoring\n');

  // Theo dõi real-time changes
  const subscription = supabase
    .channel('bot-monitoring')
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'trading_bots' 
      }, 
      (payload) => {
        console.log(`🔄 [REAL-TIME] Bot ${payload.table} changed:`, payload.event);
        if (payload.new) {
          console.log(`   Bot: ${payload.new.name} (${payload.new.id})`);
          console.log(`   Status: ${payload.old?.status || 'N/A'} → ${payload.new.status}`);
          console.log(`   Total Trades: ${payload.new.total_trades || 0}`);
          console.log(`   Total Profit: ${payload.new.total_profit || 0}%`);
          console.log(`   Last Run: ${payload.new.last_run_at ? new Date(payload.new.last_run_at).toLocaleString('vi-VN') : 'Never'}`);
          if (payload.new.last_error) {
            console.log(`   Last Error: ${payload.new.last_error}`);
          }
          console.log('');
        }
      }
    )
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'trades' 
      }, 
      (payload) => {
        console.log(`💰 [REAL-TIME] Trade ${payload.table} changed:`, payload.event);
        if (payload.new) {
          console.log(`   Trade: ${payload.new.side} ${payload.new.quantity} ${payload.new.symbol}`);
          console.log(`   Entry Price: ${payload.new.entry_price}`);
          console.log(`   Status: ${payload.new.status}`);
          console.log(`   P&L: ${payload.new.pnl || 'N/A'}`);
          console.log(`   Time: ${new Date(payload.new.open_time).toLocaleString('vi-VN')}`);
          console.log('');
        }
      }
    )
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'bot_indicator_logs' 
      }, 
      (payload) => {
        console.log(`📊 [REAL-TIME] Indicator log ${payload.table} changed:`, payload.event);
        if (payload.new) {
          console.log(`   Bot ID: ${payload.new.bot_id}`);
          console.log(`   Symbol: ${payload.new.symbol}`);
          console.log(`   RSI: ${payload.new.rsi_value}`);
          console.log(`   Signal: ${payload.new.signal}`);
          console.log(`   Time: ${new Date(payload.new.created_at).toLocaleString('vi-VN')}`);
          console.log('');
        }
      }
    )
    .subscribe();

  // Polling để kiểm tra thay đổi định kỳ
  const pollInterval = setInterval(async () => {
    if (!isMonitoring) {
      clearInterval(pollInterval);
      return;
    }

    try {
      const now = new Date();
      const { data: bots, error } = await supabase
        .from('trading_bots')
        .select('id, name, status, total_trades, total_profit, last_run_at, last_error, updated_at')
        .gte('updated_at', lastCheckTime.toISOString());

      if (error) {
        console.error('❌ Lỗi khi polling bot status:', error.message);
        return;
      }

      if (bots && bots.length > 0) {
        console.log(`📊 [POLLING] Kiểm tra ${bots.length} bot(s) - ${now.toLocaleString('vi-VN')}`);
        
        bots.forEach(bot => {
          console.log(`   ${bot.name} (${bot.id}): ${bot.status}`);
          console.log(`      Trades: ${bot.total_trades || 0}, Profit: ${bot.total_profit || 0}%`);
          console.log(`      Last Run: ${bot.last_run_at ? new Date(bot.last_run_at).toLocaleString('vi-VN') : 'Never'}`);
          if (bot.last_error) {
            console.log(`      Last Error: ${bot.last_error}`);
          }
        });
        console.log('');
      }

      lastCheckTime = now;
    } catch (error) {
      console.error('❌ Lỗi trong polling:', error.message);
    }
  }, 10000); // Kiểm tra mỗi 10 giây

  // Xử lý tín hiệu dừng
  process.on('SIGINT', () => {
    console.log('\n🛑 Dừng monitoring...');
    isMonitoring = false;
    subscription.unsubscribe();
    clearInterval(pollInterval);
    process.exit(0);
  });

  // Xử lý lỗi
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
  });
}

// Chạy script
if (require.main === module) {
  monitorBotLogs().catch(console.error);
}

module.exports = { monitorBotLogs };
