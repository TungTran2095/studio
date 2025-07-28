const axios = require('axios');

const API_BASE_URL = 'http://localhost:9002';

async function forceStopAllBots() {
  try {
    console.log('🛑 Force stopping all running bots...\n');

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

    // 2. Lấy danh sách tất cả bot
    console.log('2. Fetching all bots...');
    const botsResponse = await axios.get(`${API_BASE_URL}/api/trading/bot?projectId=${projectId}`);
    const bots = botsResponse.data;
    
    if (!bots || bots.length === 0) {
      console.log('❌ No bots found');
      return;
    }

    console.log(`📋 Found ${bots.length} bots total`);

    // 3. Tìm các bot đang running
    const runningBots = bots.filter(bot => bot.status === 'running');
    console.log(`🚨 Found ${runningBots.length} bots currently running:`);
    
    runningBots.forEach(bot => {
      console.log(`   - ${bot.name} (ID: ${bot.id})`);
    });

    if (runningBots.length === 0) {
      console.log('✅ No running bots found');
      return;
    }

    // 4. Force stop từng bot
    console.log('\n3. Force stopping each bot...');
    for (const bot of runningBots) {
      try {
        console.log(`\n🛑 Stopping bot: ${bot.name} (${bot.id})`);
        
        // Gọi API stop
        const stopResponse = await axios.post(`${API_BASE_URL}/api/trading/bot/stop`, {
          botId: bot.id
        });
        
        console.log(`✅ Stop response: ${stopResponse.data.message}`);
        
        // Đợi một chút
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Kiểm tra status
        const statusResponse = await axios.get(`${API_BASE_URL}/api/trading/bot/status?botId=${bot.id}`);
        console.log(`📊 Current status: ${statusResponse.data.status}`);
        
        if (statusResponse.data.status === 'stopped') {
          console.log(`✅ Bot ${bot.name} successfully stopped`);
        } else {
          console.log(`⚠️  Bot ${bot.name} status is still ${statusResponse.data.status}`);
        }
        
      } catch (error) {
        console.error(`❌ Error stopping bot ${bot.name}:`, error.response?.data || error.message);
      }
    }

    // 5. Kiểm tra final status
    console.log('\n4. Final status check...');
    const finalBotsResponse = await axios.get(`${API_BASE_URL}/api/trading/bot?projectId=${projectId}`);
    const finalBots = finalBotsResponse.data;
    
    const stillRunning = finalBots.filter(bot => bot.status === 'running');
    
    if (stillRunning.length === 0) {
      console.log('✅ All bots successfully stopped!');
    } else {
      console.log(`⚠️  ${stillRunning.length} bots are still running:`);
      stillRunning.forEach(bot => {
        console.log(`   - ${bot.name} (ID: ${bot.id})`);
      });
    }

    // 6. Hiển thị summary
    console.log('\n📊 Summary:');
    const statusCounts = {};
    finalBots.forEach(bot => {
      statusCounts[bot.status] = (statusCounts[bot.status] || 0) + 1;
    });
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} bots`);
    });

    console.log('\n🎯 Force stop operation completed!');

  } catch (error) {
    console.error('❌ Force stop failed:', error.response?.data || error.message);
  }
}

// Chạy force stop
forceStopAllBots(); 