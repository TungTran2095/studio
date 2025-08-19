const axios = require('axios');

async function runBotViaAPI() {
  try {
    console.log('🚀 Running bot via run-bot API...');
    
    const botId = '2fedeffb-6a94-4dad-a32c-85bb50e59b14';
    
    // Sử dụng API endpoint /api/trading/run-bot
    const response = await axios.post(`http://localhost:9002/api/trading/run-bot`, {
      botId: botId
    });
    
    console.log('✅ API response:', response.data);
    
  } catch (error) {
    console.log('❌ Error running bot via run-bot API:', error.message);
    
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

runBotViaAPI();
