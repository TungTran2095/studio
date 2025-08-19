const axios = require('axios');

async function startBotViaStartAPI() {
  try {
    console.log('🚀 Starting bot via start API...');
    
    const botId = '2fedeffb-6a94-4dad-a32c-85bb50e59b14';
    
    // Sử dụng API endpoint /api/trading/bot/start
    const response = await axios.post(`http://localhost:9002/api/trading/bot/start`, {
      botId: botId
    });
    
    console.log('✅ API response:', response.data);
    
  } catch (error) {
    console.log('❌ Error starting bot via start API:', error.message);
    
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

startBotViaStartAPI();
