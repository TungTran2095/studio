const axios = require('axios');

async function startBotViaStartAPIDebug() {
  try {
    console.log('🚀 Starting bot via start API (debug mode)...');
    
    const botId = '2fedeffb-6a94-4dad-a32c-85bb50e59b14';
    
    console.log('1. Sending request to start bot...');
    console.log('   Bot ID:', botId);
    console.log('   Endpoint: /api/trading/bot/start');
    
    // Sử dụng API endpoint /api/trading/bot/start
    const response = await axios.post(`http://localhost:9002/api/trading/bot/start`, {
      botId: botId
    });
    
    console.log('2. API response received:');
    console.log('   Status:', response.status);
    console.log('   Data:', response.data);
    
    // Kiểm tra trạng thái bot sau khi start
    console.log('\n3. Checking bot status after start...');
    
    // Đợi một chút để bot có thời gian khởi động
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const statusResponse = await axios.get(`http://localhost:9002/api/trading/bot/status?botId=${botId}`);
    
    console.log('4. Bot status after start:');
    console.log('   Status:', statusResponse.data.status);
    console.log('   Updated At:', statusResponse.data.updatedAt);
    
    // Kiểm tra database trực tiếp
    console.log('\n5. Checking database directly...');
    
    const { createClient } = require('@supabase/supabase-js');
    require('dotenv').config({ path: '.env.local' });
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { data: bot, error } = await supabase
        .from('trading_bots')
        .select('*')
        .eq('id', botId)
        .single();
      
      if (error) {
        console.log('   ❌ Database error:', error.message);
      } else {
        console.log('   Database status:', bot.status);
        console.log('   Database updated_at:', bot.updated_at);
      }
    } else {
      console.log('   ⚠️ Cannot check database directly (missing env vars)');
    }
    
  } catch (error) {
    console.log('❌ Error starting bot via start API:', error.message);
    
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

startBotViaStartAPIDebug();
