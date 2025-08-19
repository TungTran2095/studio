const axios = require('axios');

async function startBotViaAPI() {
  try {
    console.log('🚀 Starting bot via API...');
    
    const botId = '2fedeffb-6a94-4dad-a32c-85bb50e59b14';
    
    // Sử dụng API endpoint để khởi động bot
    const response = await axios.put(`http://localhost:9002/api/trading/bot/${botId}`, {
      botId: botId,
      action: 'start'
    });
    
    console.log('✅ API response:', response.data);
    
  } catch (error) {
    console.log('❌ Error starting bot via API:', error.message);
    
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

startBotViaAPI();
