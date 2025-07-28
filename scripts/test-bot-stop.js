const axios = require('axios');

const API_BASE_URL = 'http://localhost:9002';

async function testBotStop() {
  try {
    console.log('🧪 Testing bot stop functionality...\n');

    // 1. Lấy danh sách projects trước
    console.log('1. Fetching projects...');
    const projectsResponse = await axios.get(`${API_BASE_URL}/api/research/projects`);
    const projectsData = projectsResponse.data;
    const projects = projectsData.projects || [];
    
    if (!projects || projects.length === 0) {
      console.log('❌ No projects found');
      return;
    }

    const projectId = projects[0].id;
    console.log(`📋 Using project: ${projects[0].name} (ID: ${projectId})\n`);

    // 2. Lấy danh sách bot
    console.log('2. Fetching bot list...');
    const botsResponse = await axios.get(`${API_BASE_URL}/api/trading/bot?projectId=${projectId}`);
    const bots = botsResponse.data;
    
    if (!bots || bots.length === 0) {
      console.log('❌ No bots found');
      return;
    }

    const testBot = bots[0];
    console.log(`📋 Found bot: ${testBot.name} (ID: ${testBot.id})`);
    console.log(`   Status: ${testBot.status}\n`);

    // 3. Start bot nếu chưa running
    if (testBot.status !== 'running') {
      console.log('3. Starting bot...');
      const startResponse = await axios.post(`${API_BASE_URL}/api/trading/bot/start`, {
        botId: testBot.id
      });
      console.log(`✅ Bot started: ${startResponse.data.message}`);
      
      // Đợi một chút để bot bắt đầu và database được cập nhật
      console.log('   Waiting for bot to fully start...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    } else {
      console.log('3. Bot is already running\n');
    }

    // 4. Kiểm tra status sau khi start
    console.log('4. Checking bot status after start...');
    const statusResponse = await axios.get(`${API_BASE_URL}/api/trading/bot/status?botId=${testBot.id}`);
    console.log(`   Status: ${statusResponse.data.status}\n`);

    // 5. Stop bot
    console.log('5. Stopping bot...');
    try {
      const stopResponse = await axios.post(`${API_BASE_URL}/api/trading/bot/stop`, {
        botId: testBot.id
      });
      console.log(`✅ Bot stopped: ${stopResponse.data.message}\n`);
    } catch (error) {
      console.log(`⚠️  Stop error: ${error.response?.data?.error || error.message}`);
      console.log('   Bot might already be stopped or there was a delay in status update\n');
    }

    // 6. Đợi một chút và kiểm tra status
    console.log('6. Waiting 5 seconds and checking status...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const finalStatusResponse = await axios.get(`${API_BASE_URL}/api/trading/bot/status?botId=${testBot.id}`);
    console.log(`   Final Status: ${finalStatusResponse.data.status}`);

    // 7. Kiểm tra logs để xem bot có thực hiện giao dịch sau khi dừng không
    console.log('\n7. Checking bot logs...');
    const logsResponse = await axios.get(`${API_BASE_URL}/api/trading/bot/logs?botId=${testBot.id}`);
    const logs = logsResponse.data.logs || [];
    
    // Tìm logs sau thời điểm stop
    const stopTime = new Date();
    const recentLogs = logs.filter(log => {
      const logTime = new Date(log.timestamp || log.created_at);
      return logTime > stopTime;
    });

    if (recentLogs.length > 0) {
      console.log('⚠️  Found recent logs after stop:');
      recentLogs.slice(-5).forEach(log => {
        console.log(`   ${log.timestamp || log.created_at}: ${log.message}`);
      });
    } else {
      console.log('✅ No recent logs found after stop');
    }

    // 8. Kiểm tra trades gần đây
    console.log('\n8. Checking recent trades...');
    const tradesResponse = await axios.get(`${API_BASE_URL}/api/trading/bot/trades?botId=${testBot.id}`);
    const trades = tradesResponse.data.trades || [];
    
    if (trades.length > 0) {
      const recentTrade = trades[trades.length - 1];
      console.log(`   Latest trade: ${recentTrade.side} ${recentTrade.quantity} ${recentTrade.symbol} at ${recentTrade.entry_price}`);
      console.log(`   Trade time: ${recentTrade.open_time}`);
      console.log(`   Trade status: ${recentTrade.status}`);
    } else {
      console.log('   No trades found');
    }

    console.log('\n🎯 Test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Chạy test
testBotStop(); 