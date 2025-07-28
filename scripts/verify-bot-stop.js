const axios = require('axios');

const API_BASE_URL = 'http://localhost:9002';

async function verifyBotStop() {
  try {
    console.log('🔍 Verifying bot stop functionality...\n');

    // 1. Lấy danh sách projects
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
    console.log('2. Fetching bots...');
    const botsResponse = await axios.get(`${API_BASE_URL}/api/trading/bot?projectId=${projectId}`);
    const bots = botsResponse.data;
    
    if (!bots || bots.length === 0) {
      console.log('❌ No bots found');
      return;
    }

    console.log(`📋 Found ${bots.length} bots`);

    // 3. Kiểm tra từng bot
    for (const bot of bots) {
      console.log(`\n🔍 Checking bot: ${bot.name} (${bot.id})`);
      console.log(`   Current status: ${bot.status}`);
      
      // Kiểm tra status từ API
      try {
        const statusResponse = await axios.get(`${API_BASE_URL}/api/trading/bot/status?botId=${bot.id}`);
        const apiStatus = statusResponse.data.status;
        console.log(`   API status: ${apiStatus}`);
        
        if (bot.status !== apiStatus) {
          console.log(`   ⚠️  Status mismatch: DB=${bot.status}, API=${apiStatus}`);
        }
      } catch (error) {
        console.log(`   ❌ Error checking API status: ${error.response?.data?.error || error.message}`);
      }

      // Kiểm tra logs gần đây
      try {
        const logsResponse = await axios.get(`${API_BASE_URL}/api/trading/bot/logs?botId=${bot.id}`);
        const logs = logsResponse.data.logs || [];
        
        if (logs.length > 0) {
          const recentLogs = logs.slice(-5);
          console.log(`   📝 Recent logs (${recentLogs.length}):`);
          recentLogs.forEach(log => {
            const time = new Date(log.timestamp || log.created_at).toLocaleString('vi-VN');
            console.log(`      ${time}: ${log.message}`);
          });
        } else {
          console.log(`   📝 No logs found`);
        }
      } catch (error) {
        console.log(`   ❌ Error checking logs: ${error.response?.data?.error || error.message}`);
      }

      // Kiểm tra trades gần đây
      try {
        const tradesResponse = await axios.get(`${API_BASE_URL}/api/trading/bot/trades?botId=${bot.id}`);
        const trades = tradesResponse.data.trades || [];
        
        if (trades.length > 0) {
          const recentTrades = trades.slice(-3);
          console.log(`   💰 Recent trades (${recentTrades.length}):`);
          recentTrades.forEach((trade, index) => {
            const time = new Date(trade.open_time).toLocaleString('vi-VN');
            console.log(`      ${index + 1}. ${trade.side} ${trade.quantity} ${trade.symbol} at ${trade.entry_price} (${trade.status}) - ${time}`);
          });
        } else {
          console.log(`   💰 No trades found`);
        }
      } catch (error) {
        console.log(`   ❌ Error checking trades: ${error.response?.data?.error || error.message}`);
      }

      // Kiểm tra xem bot có đang chạy thực sự không
      if (bot.status === 'running') {
        console.log(`   🚨 WARNING: Bot ${bot.name} is marked as running!`);
        console.log(`   💡 Consider stopping this bot manually`);
      } else {
        console.log(`   ✅ Bot ${bot.name} is properly stopped`);
      }
    }

    // 4. Summary
    console.log('\n📊 Summary:');
    const statusCounts = {};
    bots.forEach(bot => {
      statusCounts[bot.status] = (statusCounts[bot.status] || 0) + 1;
    });
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} bots`);
    });

    const runningBots = bots.filter(bot => bot.status === 'running');
    if (runningBots.length > 0) {
      console.log(`\n⚠️  ${runningBots.length} bots are still running:`);
      runningBots.forEach(bot => {
        console.log(`   - ${bot.name} (${bot.id})`);
      });
      console.log('\n💡 Run "node scripts/force-stop-all-bots.js" to stop all running bots');
    } else {
      console.log('\n✅ All bots are properly stopped!');
    }

    console.log('\n🎯 Verification completed!');

  } catch (error) {
    console.error('❌ Verification failed:', error.response?.data || error.message);
  }
}

// Chạy verification
verifyBotStop(); 