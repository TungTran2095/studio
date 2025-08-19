const axios = require('axios');

async function checkBotLogs() {
  try {
    console.log('🔍 Checking bot logs...');
    
    const botId = '2fedeffb-6a94-4dad-a32c-85bb50e59b14';
    
    // Kiểm tra log của bot
    const response = await axios.get(`http://localhost:9002/api/trading/bot/logs?botId=${botId}`);
    
    console.log('✅ Bot logs response:', response.data);
    
  } catch (error) {
    console.log('❌ Error checking bot logs:', error.message);
    
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

checkBotLogs();
