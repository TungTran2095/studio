const { createClient } = require('@supabase/supabase-js');

// Cấu hình Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testBotLogging() {
  console.log('🧪 Testing BotExecutor logging system...\n');

  try {
    // 1. Kiểm tra cấu trúc logging
    console.log('1️⃣ Kiểm tra cấu trúc logging system...');
    
    const loggingFeatures = [
      '🔍 Strategy execution logging',
      '📊 Signal calculation logging', 
      '💰 Trade execution logging',
      '⚖️ Position management logging',
      '🌐 API call logging',
      '⏱️ Performance timing logging',
      '📈 Data analysis logging',
      '⚠️ Error and warning logging'
    ];
    
    loggingFeatures.forEach((feature, index) => {
      console.log(`   ${index + 1}. ${feature}`);
    });

    // 2. Kiểm tra bot hiện tại
    console.log('\n2️⃣ Kiểm tra bot hiện tại...');
    const { data: bots, error: botsError } = await supabase
      .from('trading_bots')
      .select('*')
      .limit(5);

    if (botsError) {
      console.error('❌ Lỗi khi lấy danh sách bot:', botsError.message);
      return;
    }

    if (!bots || bots.length === 0) {
      console.log('📭 Không có bot nào để test');
      return;
    }

    console.log(`✅ Tìm thấy ${bots.length} bot(s) để test logging:`);
    bots.forEach((bot, index) => {
      console.log(`   ${index + 1}. ${bot.name} (${bot.id})`);
      console.log(`      Status: ${bot.status}`);
      console.log(`      Strategy: ${bot.config?.strategy?.type || 'N/A'}`);
      console.log(`      Symbol: ${bot.config?.trading?.symbol || 'N/A'}`);
      console.log(`      Timeframe: ${bot.config?.trading?.timeframe || 'N/A'}`);
    });

    // 3. Kiểm tra logging configuration
    console.log('\n3️⃣ Kiểm tra logging configuration...');
    
    const loggingConfig = {
      logLevel: 'DEBUG',
      enableConsole: true,
      enableFile: false,
      maxBufferSize: 1000,
      timestampFormat: 'ISO',
      includePerformanceMetrics: true,
      includeDataAnalysis: true,
      includeAPIDetails: true
    };
    
    console.log('📋 Logging configuration:');
    Object.entries(loggingConfig).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });

    // 4. Kiểm tra các loại log sẽ được tạo
    console.log('\n4️⃣ Các loại log sẽ được tạo:');
    
    const logTypes = [
      {
        type: 'Strategy Execution',
        description: 'Chi tiết về quá trình thực thi chiến lược',
        includes: ['Input data', 'Strategy parameters', 'Execution time', 'Results']
      },
      {
        type: 'Signal Calculation',
        description: 'Chi tiết về tính toán signal',
        includes: ['Candles data', 'Technical indicators', 'Calculation time', 'Signal result']
      },
      {
        type: 'Trade Execution',
        description: 'Chi tiết về thực hiện giao dịch',
        includes: ['Price data', 'Balance check', 'Position size', 'Order details']
      },
      {
        type: 'Position Management',
        description: 'Chi tiết về quản lý vị thế',
        includes: ['Current position', 'Real position check', 'Position updates', 'Risk management']
      },
      {
        type: 'API Calls',
        description: 'Chi tiết về các API calls',
        includes: ['Endpoint', 'Parameters', 'Response time', 'Response data']
      },
      {
        type: 'Performance Metrics',
        description: 'Các chỉ số hiệu suất',
        includes: ['Execution time', 'API latency', 'Data processing time', 'Memory usage']
      },
      {
        type: 'Data Analysis',
        description: 'Phân tích dữ liệu chi tiết',
        includes: ['Price ranges', 'Volatility', 'Volume analysis', 'Trend analysis']
      },
      {
        type: 'Error Handling',
        description: 'Xử lý lỗi chi tiết',
        includes: ['Error context', 'Stack traces', 'Recovery actions', 'Fallback strategies']
      }
    ];
    
    logTypes.forEach((logType, index) => {
      console.log(`   ${index + 1}. ${logType.type}`);
      console.log(`      ${logType.description}`);
      console.log(`      Includes: ${logType.includes.join(', ')}`);
      console.log('');
    });

    // 5. Hướng dẫn sử dụng
    console.log('5️⃣ Hướng dẫn sử dụng logging system:');
    
    console.log('\n🚀 Để bật logging chi tiết:');
    console.log('   1. Chạy: node enable-bot-debug.js');
    console.log('   2. Khởi động bot');
    console.log('   3. Xem log real-time: node monitor-bot-logs.js');
    
    console.log('\n📊 Để xem log chi tiết:');
    console.log('   1. Xem tất cả log: node show-bot-logs.js');
    console.log('   2. Theo dõi real-time: node monitor-bot-logs.js');
    console.log('   3. Kiểm tra trạng thái: node check_bot_db.js');
    
    console.log('\n🔍 Các loại log có sẵn:');
    console.log('   - DEBUG: Thông tin chi tiết nhất');
    console.log('   - INFO: Thông tin quan trọng');
    console.log('   - WARN: Cảnh báo');
    console.log('   - ERROR: Lỗi');
    
    console.log('\n📈 Metrics được theo dõi:');
    console.log('   - Execution time cho mỗi bước');
    console.log('   - API response time');
    console.log('   - Data processing time');
    console.log('   - Memory usage');
    console.log('   - Error frequency');

    // 6. Test logging với bot cụ thể
    if (bots.length > 0) {
      const testBot = bots[0];
      console.log(`\n6️⃣ Test logging với bot: ${testBot.name}`);
      
      console.log('📋 Bot details:');
      console.log(`   ID: ${testBot.id}`);
      console.log(`   Name: ${testBot.name}`);
      console.log(`   Status: ${testBot.status}`);
      console.log(`   Strategy: ${testBot.config?.strategy?.type || 'N/A'}`);
      console.log(`   Symbol: ${testBot.config?.trading?.symbol || 'N/A'}`);
      console.log(`   Timeframe: ${testBot.config?.trading?.timeframe || 'N/A'}`);
      
      console.log('\n🔍 Logging sẽ hiển thị:');
      console.log(`   - Mọi thay đổi trạng thái của bot ${testBot.name}`);
      console.log(`   - Chi tiết về chiến lược ${testBot.config?.strategy?.type || 'N/A'}`);
      console.log(`   - Thông tin về symbol ${testBot.config?.trading?.symbol || 'N/A'}`);
      console.log(`   - Performance metrics cho mỗi operation`);
      console.log(`   - API calls và response times`);
      console.log(`   - Data analysis và signal calculations`);
    }

  } catch (error) {
    console.error('❌ Lỗi khi test logging system:', error.message);
  }
}

// Chạy script
if (require.main === module) {
  testBotLogging().catch(console.error);
}

module.exports = { testBotLogging };
