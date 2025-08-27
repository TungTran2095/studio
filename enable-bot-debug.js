const fs = require('fs');
const path = require('path');

// Các file cần bật debug log
const filesToEnable = [
  'src/lib/trading/bot-executor.ts',
  'src/lib/trading/bot-manager.ts',
  'src/actions/binance.ts',
  'src/actions/trade.ts'
];

// Các pattern để tìm và bật log
const debugPatterns = [
  {
    pattern: /\/\/ console\.log\(/g,
    replacement: 'console.log('
  },
  {
    pattern: /\/\/ console\.warn\(/g,
    replacement: 'console.warn('
  },
  {
    pattern: /\/\/ console\.error\(/g,
    replacement: 'console.error('
  },
  {
    pattern: /\/\/ console\.info\(/g,
    replacement: 'console.info('
  }
];

function enableDebugLogs() {
  console.log('🔍 Bật tất cả log debugging cho bot...\n');

  let totalChanges = 0;

  filesToEnable.forEach(filePath => {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ File không tồn tại: ${filePath}`);
      return;
    }

    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let fileChanges = 0;

      // Bật tất cả log đã bị comment
      debugPatterns.forEach(pattern => {
        const matches = content.match(pattern.pattern);
        if (matches) {
          content = content.replace(pattern.pattern, pattern.replacement);
          fileChanges += matches.length;
        }
      });

      // Bật thêm một số log debugging quan trọng
      const additionalLogs = [
        // BotExecutor logs
        {
          search: 'console.log(\'[BotExecutor] 🎯 Executing strategy...\');',
          addAfter: `console.log('[BotExecutor] 🔍 DEBUG: Strategy execution started at ${new Date().toISOString()}');`
        },
        {
          search: 'console.log(\'[BotExecutor] Calculated signal:\', signal);',
          addAfter: `console.log('[BotExecutor] 🔍 DEBUG: Signal calculation details:', { signal, timestamp: new Date().toISOString() });`
        },
        {
          search: 'console.log(\'[BotExecutor] 🚀 Executing ${signal.toUpperCase()} trade...\');',
          addAfter: `console.log('[BotExecutor] 🔍 DEBUG: Trade execution started:', { signal, timestamp: new Date().toISOString() });`
        },
        // BotManager logs
        {
          search: 'console.log(\'[BotManager] 🚀 Bắt đầu start bot:\', botName, \'(\', botId, \')\');',
          addAfter: `console.log('[BotManager] 🔍 DEBUG: Bot start process initiated:', { botName, botId, timestamp: new Date().toISOString() });`
        },
        {
          search: 'console.log(\'[BotManager] 🛑 Dừng bot:\', botId);',
          addAfter: `console.log('[BotManager] 🔍 DEBUG: Bot stop process initiated:', { botId, timestamp: new Date().toISOString() });`
        }
      ];

      additionalLogs.forEach(log => {
        if (content.includes(log.search)) {
          content = content.replace(log.search, `${log.search}\n        ${log.addAfter}`);
          fileChanges++;
        }
      });

      if (fileChanges > 0) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ ${filePath}: Bật ${fileChanges} log entries`);
        totalChanges += fileChanges;
      } else {
        console.log(`ℹ️ ${filePath}: Không có thay đổi cần thiết`);
      }

    } catch (error) {
      console.error(`❌ Lỗi khi xử lý file ${filePath}:`, error.message);
    }
  });

  console.log(`\n🎉 Hoàn thành! Đã bật tổng cộng ${totalChanges} log entries`);
  console.log('\n📋 Các loại log đã được bật:');
  console.log('   🔍 Debug logs - Chi tiết về quá trình thực thi');
  console.log('   📊 Strategy logs - Thông tin về chiến lược giao dịch');
  console.log('   💰 Trade logs - Chi tiết về các giao dịch');
  console.log('   ⚠️ Warning logs - Cảnh báo và lỗi');
  console.log('   🌐 API logs - Thông tin về API calls');
  console.log('   📈 Performance logs - Hiệu suất và timing');

  console.log('\n🚀 Để xem log chi tiết, chạy:');
  console.log('   node show-bot-logs.js          # Xem tất cả log');
  console.log('   node monitor-bot-logs.js       # Theo dõi real-time');
  console.log('   node check_bot_db.js           # Kiểm tra trạng thái bot');
}

// Chạy script
if (require.main === module) {
  enableDebugLogs();
}

module.exports = { enableDebugLogs };
