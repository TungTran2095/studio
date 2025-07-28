const axios = require('axios');

const API_BASE_URL = 'http://localhost:9002';

// Bot ID cần dừng - thay đổi theo bot bạn muốn dừng
const BOT_ID = '06538c87-10e5-44a3-904b-ed0d13ca9166'; // Thay đổi ID này

async function stopSpecificBot() {
  try {
    console.log(`🛑 Stopping specific bot: ${BOT_ID}\n`);

    // 1. Kiểm tra bot có tồn tại không
    console.log('1. Checking bot existence...');
    const statusResponse = await axios.get(`${API_BASE_URL}/api/trading/bot/status?botId=${BOT_ID}`);
    const botInfo = statusResponse.data;
    
    console.log(`📋 Bot info:`);
    console.log(`   Name: ${botInfo.name}`);
    console.log(`   Status: ${botInfo.status}`);
    console.log(`   Total Trades: ${botInfo.totalTrades}`);
    console.log(`   Last Run: ${botInfo.lastRunAt || 'Never'}\n`);

    // 2. Nếu bot đang running, dừng nó
    if (botInfo.status === 'running') {
      console.log('2. Bot is running, stopping it...');
      
      const stopResponse = await axios.post(`${API_BASE_URL}/api/trading/bot/stop`, {
        botId: BOT_ID
      });
      
      console.log(`✅ Stop response: ${stopResponse.data.message}`);
      
      // Đợi một chút
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Kiểm tra status sau khi dừng
      const finalStatusResponse = await axios.get(`${API_BASE_URL}/api/trading/bot/status?botId=${BOT_ID}`);
      console.log(`📊 Status after stop: ${finalStatusResponse.data.status}`);
      
      if (finalStatusResponse.data.status === 'stopped') {
        console.log('✅ Bot successfully stopped!');
      } else {
        console.log(`⚠️  Bot status is still ${finalStatusResponse.data.status}`);
      }
      
    } else {
      console.log('2. Bot is not running, no action needed');
    }

    // 3. Kiểm tra logs gần đây
    console.log('\n3. Checking recent logs...');
    try {
      const logsResponse = await axios.get(`${API_BASE_URL}/api/trading/bot/logs?botId=${BOT_ID}`);
      const logs = logsResponse.data.logs || [];
      
      if (logs.length > 0) {
        console.log(`📝 Found ${logs.length} logs`);
        console.log('Recent logs:');
        logs.slice(-10).forEach(log => {
          const time = new Date(log.timestamp || log.created_at).toLocaleString('vi-VN');
          console.log(`   ${time}: ${log.message}`);
        });
      } else {
        console.log('📝 No logs found');
      }
    } catch (error) {
      console.log('⚠️  Could not fetch logs:', error.response?.data?.error || error.message);
    }

    // 4. Kiểm tra trades gần đây
    console.log('\n4. Checking recent trades...');
    try {
      const tradesResponse = await axios.get(`${API_BASE_URL}/api/trading/bot/trades?botId=${BOT_ID}`);
      const trades = tradesResponse.data.trades || [];
      
      if (trades.length > 0) {
        console.log(`💰 Found ${trades.length} trades`);
        console.log('Recent trades:');
        trades.slice(-5).forEach((trade, index) => {
          const time = new Date(trade.open_time).toLocaleString('vi-VN');
          console.log(`   ${index + 1}. ${trade.side} ${trade.quantity} ${trade.symbol} at ${trade.entry_price} (${trade.status}) - ${time}`);
        });
      } else {
        console.log('💰 No trades found');
      }
    } catch (error) {
      console.log('⚠️  Could not fetch trades:', error.response?.data?.error || error.message);
    }

    console.log('\n🎯 Bot stop operation completed!');

  } catch (error) {
    if (error.response?.status === 404) {
      console.error(`❌ Bot with ID ${BOT_ID} not found`);
    } else {
      console.error('❌ Error:', error.response?.data || error.message);
    }
  }
}

// Chạy script
stopSpecificBot(); 