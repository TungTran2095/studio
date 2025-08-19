const axios = require('axios');

async function checkBotStatus() {
  try {
    console.log('🔍 Checking bot status...');
    
    // Thử lấy danh sách bot từ database trực tiếp
    const response = await axios.get('http://localhost:9002/api/trading/bot?projectId=test');
    
    if (response.data) {
      console.log('✅ Bot list response:', response.data);
    }
  } catch (error) {
    console.log('❌ Error checking bot status:', error.message);
    
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

checkBotStatus();
