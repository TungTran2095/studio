const { createClient } = require('@supabase/supabase-js');

// Sử dụng environment variables từ .env.local
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BOT_ID = '2fedeffb-6a94-4dad-a32c-85bb50e59b14';

async function startBot() {
  try {
    console.log('🚀 Starting bot...');
    
    // Cập nhật status bot thành 'running'
    const { error } = await supabase
      .from('trading_bots')
      .update({ 
        status: 'running',
        updated_at: new Date().toISOString()
      })
      .eq('id', BOT_ID);
    
    if (error) {
      console.log('❌ Error updating bot status:', error);
      return;
    }
    
    console.log('✅ Bot status updated to running');
    
    // Kiểm tra lại status
    const { data: checkBot, error: checkError } = await supabase
      .from('trading_bots')
      .select('*')
      .eq('id', BOT_ID)
      .single();
    
    if (checkError) {
      console.log('❌ Error checking bot status:', checkError);
      return;
    }
    
    console.log('\n📊 Current bot status:');
    console.log('Status:', checkBot.status);
    console.log('Total Trades:', checkBot.total_trades);
    console.log('Total Profit:', checkBot.total_profit);
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

startBot();
