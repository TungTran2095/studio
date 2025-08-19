const { createClient } = require('@supabase/supabase-js');

// Sử dụng environment variables từ .env.local
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase environment variables');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '***' : 'missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBotStatus() {
  try {
    console.log('🔍 Checking bot status from database...');
    
    // Lấy tất cả bot
    const { data: bots, error } = await supabase
      .from('trading_bots')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.log('❌ Database error:', error);
      return;
    }
    
    if (!bots || bots.length === 0) {
      console.log('📭 No bots found in database');
      return;
    }
    
    console.log(`📊 Found ${bots.length} bots:`);
    bots.forEach((bot, index) => {
      console.log(`\n${index + 1}. Bot: ${bot.name}`);
      console.log(`   ID: ${bot.id}`);
      console.log(`   Status: ${bot.status}`);
      console.log(`   Project ID: ${bot.project_id}`);
      console.log(`   Experiment ID: ${bot.experiment_id}`);
      console.log(`   Total Trades: ${bot.total_trades}`);
      console.log(`   Total Profit: ${bot.total_profit}`);
      console.log(`   Win Rate: ${bot.win_rate}%`);
      console.log(`   Created: ${bot.created_at}`);
      console.log(`   Updated: ${bot.updated_at}`);
    });
    
    // Kiểm tra bot có status 'running'
    const runningBots = bots.filter(bot => bot.status === 'running');
    if (runningBots.length > 0) {
      console.log(`\n🚀 ${runningBots.length} bot(s) are running:`);
      runningBots.forEach(bot => {
        console.log(`   - ${bot.name} (ID: ${bot.id})`);
      });
    } else {
      console.log('\n⏸️ No bots are currently running');
    }
    
    // Kiểm tra bot có status 'stopped'
    const stoppedBots = bots.filter(bot => bot.status === 'stopped');
    if (stoppedBots.length > 0) {
      console.log(`\n🛑 ${stoppedBots.length} bot(s) are stopped:`);
      stoppedBots.forEach(bot => {
        console.log(`   - ${bot.name} (ID: ${bot.id})`);
      });
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

checkBotStatus();
