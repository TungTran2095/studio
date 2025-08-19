const axios = require('axios');

async function checkBotStatusViaAPI() {
  try {
    console.log('🔍 Checking bot status via API...');
    
    const botId = '2fedeffb-6a94-4dad-a32c-85bb50e59b14';
    
    // Sử dụng API endpoint /api/trading/bot/status
    const response = await axios.get(`http://localhost:9002/api/trading/bot/status?botId=${botId}`);
    
    console.log('✅ Bot status API response:', response.data);
    
  } catch (error) {
    console.log('❌ Error checking bot status via API:', error.message);
    
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

checkBotStatusViaAPI();
