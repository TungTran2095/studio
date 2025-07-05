const https = require('https');
const http = require('http');

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (e) {
          resolve(data);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function checkPosition() {
  try {
    console.log('🔍 Checking position for bot Real23...');
    
    // 1. Kiểm tra debug info
    const debugUrl = 'http://localhost:9002/api/trading/bot/debug?botName=real23';
    const debugResult = await makeRequest(debugUrl);
    
    console.log('\n📋 Bot Status:');
    console.log('Status:', debugResult.bot.status);
    console.log('Total Trades:', debugResult.bot.total_trades);
    console.log('Has Trades:', debugResult.summary.has_trades);
    
    if (debugResult.trades.length > 0) {
      console.log('\n💰 Recent Trades:');
      debugResult.trades.forEach((trade, index) => {
        console.log(`  ${index + 1}. ${trade.side} ${trade.quantity} ${trade.symbol} at ${trade.entry_price} (${trade.status})`);
        if (trade.status === 'open') {
          console.log(`     Entry Price: ${trade.entry_price}`);
          console.log(`     Stop Loss: ${trade.stop_loss}`);
          console.log(`     Take Profit: ${trade.take_profit}`);
          console.log(`     Open Time: ${new Date(trade.open_time).toLocaleString('vi-VN')}`);
        }
      });
    } else {
      console.log('\n💰 No trades found');
    }
    
    // 2. Kiểm tra RSI hiện tại
    const botId = '7cb1750a-3357-4c74-aa3c-b92abf23764e';
    const rsiUrl = `http://localhost:9002/api/trading/bot/indicator-history?botId=${botId}`;
    const rsiResult = await makeRequest(rsiUrl);
    
    if (rsiResult.history && rsiResult.history.length > 0) {
      const latest = rsiResult.history[rsiResult.history.length - 1];
      console.log('\n📊 Current RSI Analysis:');
      console.log('Current RSI:', latest.value);
      console.log('Oversold threshold:', rsiResult.oversold);
      console.log('Overbought threshold:', rsiResult.triggerValue);
      
      if (latest.value <= rsiResult.oversold) {
        console.log('✅ RSI đã đạt điều kiện OVERSOLD - nên MUA');
      } else if (latest.value >= rsiResult.triggerValue) {
        console.log('✅ RSI đã đạt điều kiện OVERBOUGHT - nên BÁN');
      } else {
        console.log('⏳ RSI đang trong khoảng trung tính');
      }
    }
    
    // 3. Phân tích vấn đề
    console.log('\n🔍 Problem Analysis:');
    
    if (debugResult.bot.status === 'running' && debugResult.bot.total_trades === 0) {
      console.log('❌ Bot đang chạy nhưng chưa có giao dịch nào');
      
      if (rsiResult.history && rsiResult.history.length > 0) {
        const latest = rsiResult.history[rsiResult.history.length - 1];
        if (latest.value <= rsiResult.oversold || latest.value >= rsiResult.triggerValue) {
          console.log('⚠️ RSI đã đạt điều kiện trigger nhưng bot không giao dịch');
          console.log('   Có thể do:');
          console.log('   - Bot đang có vị thế mở (currentPosition !== null)');
          console.log('   - Lỗi khi gọi API Binance');
          console.log('   - Không đủ số dư');
          console.log('   - Lỗi trong logic BotExecutor');
          console.log('   - Bot không ghi log indicator (indicator_logs: 0)');
        } else {
          console.log('✅ RSI chưa đạt điều kiện trigger');
        }
      }
    }
    
    // 4. Kiểm tra API key
    if (debugResult.apiKeyInfo) {
      console.log('\n🔑 API Key Status:');
      console.log('Has API Key:', debugResult.apiKeyInfo.hasApiKey);
      console.log('Has API Secret:', debugResult.apiKeyInfo.hasApiSecret);
      console.log('Is Testnet:', debugResult.apiKeyInfo.isTestnet);
      if (debugResult.apiKeyInfo.issues.length > 0) {
        console.log('Issues:', debugResult.apiKeyInfo.issues);
      }
    }
    
    // 5. Kiểm tra strategy config
    if (debugResult.strategyInfo) {
      console.log('\n📈 Strategy Config:');
      console.log('Type:', debugResult.strategyInfo.type);
      console.log('Parameters:', JSON.stringify(debugResult.strategyInfo.parameters, null, 2));
    }
    
    // 6. Kiểm tra indicator logs
    console.log('\n📊 Indicator Logs:');
    console.log('Has Indicator Logs:', debugResult.summary.has_indicator_logs);
    console.log('Indicator Logs Count:', debugResult.indicator_logs.length);
    
    if (debugResult.indicator_logs.length === 0) {
      console.log('⚠️ Không có indicator logs - có thể bảng bot_indicator_logs chưa được tạo');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkPosition(); 