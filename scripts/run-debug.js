require('dotenv').config();
const { debugBot } = require('./debug-bot');

// Lấy tên bot từ command line argument hoặc dùng mặc định
const botName = process.argv[2] || 'real2';

console.log(`🔍 Starting debug for bot: ${botName}`);
console.log('=====================================');

debugBot(botName)
  .then(() => {
    console.log('\n✅ Debug completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Debug failed:', error);
    process.exit(1);
  }); 