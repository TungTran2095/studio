const { createClient } = require('@supabase/supabase-js');

// Khởi tạo Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugBot(botName = 'real2') {
  console.log(`🔍 Debugging bot: ${botName}`);
  
  try {
    // 1. Tìm bot theo tên
    const { data: bots, error: botError } = await supabase
      .from('trading_bots')
      .select('*')
      .ilike('name', `%${botName}%`);
    
    if (botError) {
      console.error('❌ Error finding bot:', botError);
      return;
    }
    
    if (!bots || bots.length === 0) {
      console.log('❌ No bot found with name:', botName);
      return;
    }
    
    const bot = bots[0];
    console.log('✅ Found bot:', {
      id: bot.id,
      name: bot.name,
      status: bot.status,
      total_trades: bot.total_trades,
      total_profit: bot.total_profit,
      win_rate: bot.win_rate,
      last_error: bot.last_error,
      last_run_at: bot.last_run_at
    });
    
    // 2. Kiểm tra config bot
    console.log('\n📋 Bot Config:');
    console.log(JSON.stringify(bot.config, null, 2));
    
    // 3. Kiểm tra logs indicator
    console.log('\n📊 Checking indicator logs...');
    try {
      const { data: logs, error: logsError } = await supabase
        .from('bot_indicator_logs')
        .select('*')
        .eq('bot_id', bot.id)
        .order('time', { ascending: false })
        .limit(10);
      
      if (logsError) {
        console.log('⚠️ bot_indicator_logs table does not exist');
      } else {
        console.log(`✅ Found ${logs.length} indicator logs`);
        if (logs.length > 0) {
          console.log('Latest logs:');
          logs.forEach((log, index) => {
            console.log(`  ${index + 1}. ${log.indicator}: ${log.value} at ${log.time}`);
          });
        }
      }
    } catch (err) {
      console.log('⚠️ bot_indicator_logs table does not exist yet');
    }
    
    // 4. Kiểm tra trades
    console.log('\n💰 Checking trades...');
    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('*')
      .eq('bot_id', bot.id)
      .order('open_time', { ascending: false })
      .limit(10);
    
    if (tradesError) {
      console.error('❌ Error fetching trades:', tradesError);
    } else {
      console.log(`✅ Found ${trades.length} trades`);
      if (trades.length > 0) {
        console.log('Latest trades:');
        trades.forEach((trade, index) => {
          console.log(`  ${index + 1}. ${trade.side} ${trade.quantity} ${trade.symbol} at ${trade.entry_price} (${trade.status})`);
        });
      }
    }
    
    // 5. Phân tích vấn đề
    console.log('\n🔍 Analysis:');
    
    if (bot.status === 'error') {
      console.log('❌ Bot is in ERROR status');
      console.log('Last error:', bot.last_error);
    } else if (bot.status === 'idle') {
      console.log('⚠️ Bot is IDLE - not running');
    } else if (bot.status === 'running') {
      console.log('✅ Bot is RUNNING');
      
      if (bot.total_trades === 0) {
        console.log('⚠️ Bot has 0 trades despite being running');
        console.log('Possible issues:');
        console.log('  - No signal generated yet');
        console.log('  - API key issues');
        console.log('  - Insufficient balance');
        console.log('  - Strategy parameters not triggering');
      }
    }
    
    // 6. Kiểm tra API key
    if (bot.config?.account) {
      console.log('\n🔑 API Key Info:');
      const account = bot.config.account;
      console.log('  - Has API Key:', !!account.apiKey);
      console.log('  - Has API Secret:', !!account.apiSecret);
      console.log('  - Is Testnet:', account.testnet);
      
      if (!account.apiKey || !account.apiSecret) {
        console.log('❌ Missing API credentials');
      }
    }
    
    // 7. Kiểm tra strategy
    if (bot.config?.config?.strategy) {
      console.log('\n📈 Strategy Info:');
      const strategy = bot.config.config.strategy;
      console.log('  - Type:', strategy.type);
      console.log('  - Parameters:', strategy.parameters);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Chạy debug
if (require.main === module) {
  const botName = process.argv[2] || 'real2';
  debugBot(botName);
}

module.exports = { debugBot }; 