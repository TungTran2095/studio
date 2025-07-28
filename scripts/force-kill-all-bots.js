const axios = require('axios');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const API_BASE_URL = 'http://localhost:9002';

async function forceKillAllBots() {
  try {
    console.log('💀 FORCE KILLING ALL BOTS...\n');

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

    // 3. Force stop từng bot
    console.log('\n3. Force stopping each bot...');
    for (const bot of bots) {
      try {
        console.log(`\n🛑 Force stopping bot: ${bot.name} (${bot.id})`);
        
        // Gọi API stop
        const stopResponse = await axios.post(`${API_BASE_URL}/api/trading/bot/stop`, {
          botId: bot.id
        });
        
        console.log(`✅ Stop response: ${stopResponse.data.message}`);
        
        // Đợi một chút
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.log(`⚠️  Error stopping bot ${bot.name}: ${error.response?.data?.error || error.message}`);
      }
    }

    // 4. Đợi thêm thời gian để đảm bảo bot dừng
    console.log('\n4. Waiting for bots to stop...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 5. Kiểm tra final status
    console.log('\n5. Final status check...');
    const finalBotsResponse = await axios.get(`${API_BASE_URL}/api/trading/bot?projectId=${projectId}`);
    const finalBots = finalBotsResponse.data;
    
    const stillRunning = finalBots.filter(bot => bot.status === 'running');
    
    if (stillRunning.length > 0) {
      console.log(`⚠️  ${stillRunning.length} bots are still running, will force kill server`);
      
      // 6. Force kill server nếu vẫn có bot running
      console.log('\n6. Force killing server...');
      try {
        // Tìm và kill process trên port 9002
        console.log('🔪 Finding processes on port 9002...');
        const { stdout: netstatOutput } = await execAsync('netstat -ano | findstr :9002');
        const lines = netstatOutput.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5) {
            const pid = parts[4];
            if (pid && pid !== '0') {
              console.log(`🔪 Killing process PID: ${pid}`);
              try {
                await execAsync(`taskkill /PID ${pid} /F`);
                console.log(`✅ Killed process ${pid}`);
              } catch (killError) {
                console.log(`⚠️  Could not kill process ${pid}: ${killError.message}`);
              }
            }
          }
        }
      } catch (netstatError) {
        console.log('⚠️  Could not find processes on port 9002:', netstatError.message);
      }
      
      // 7. Đợi và restart server
      console.log('\n7. Waiting before restart...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('🚀 Restarting server...');
      try {
        await execAsync('npm run dev');
        console.log('✅ Server restarted');
      } catch (restartError) {
        console.log('⚠️  Could not restart server:', restartError.message);
        console.log('💡 Please restart server manually with: npm run dev');
      }
      
    } else {
      console.log('✅ All bots successfully stopped!');
    }

    console.log('\n🎯 Force kill operation completed!');

  } catch (error) {
    console.error('❌ Force kill failed:', error.response?.data || error.message);
  }
}

// Chạy force kill
forceKillAllBots(); 