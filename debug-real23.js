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

async function debugReal23() {
  try {
    console.log('🔍 Debugging bot Real23...');
    
    const url = 'http://localhost:9002/api/trading/bot/debug?botName=real23';
    const result = await makeRequest(url);
    
    console.log('\n📋 Bot Info:');
    console.log('ID:', result.bot.id);
    console.log('Name:', result.bot.name);
    console.log('Status:', result.bot.status);
    console.log('Total Trades:', result.bot.total_trades);
    console.log('Total Profit:', result.bot.total_profit);
    console.log('Win Rate:', result.bot.win_rate);
    console.log('Last Run:', result.bot.last_run_at);
    console.log('Last Error:', result.bot.last_error);
    
    console.log('\n🔍 Analysis:');
    console.log('Status:', result.analysis.status);
    console.log('Issues:', result.analysis.issues);
    console.log('Recommendations:', result.analysis.recommendations);
    
    console.log('\n🔑 API Key Info:');
    if (result.apiKeyInfo) {
      console.log('Has API Key:', result.apiKeyInfo.hasApiKey);
      console.log('Has API Secret:', result.apiKeyInfo.hasApiSecret);
      console.log('Is Testnet:', result.apiKeyInfo.isTestnet);
      console.log('Issues:', result.apiKeyInfo.issues);
    } else {
      console.log('No API key info available');
    }
    
    console.log('\n📈 Strategy Info:');
    if (result.strategyInfo) {
      console.log('Type:', result.strategyInfo.type);
      console.log('Parameters:', JSON.stringify(result.strategyInfo.parameters, null, 2));
    } else {
      console.log('No strategy info available');
    }
    
    console.log('\n📊 Indicator Logs:', result.indicator_logs.length);
    if (result.indicator_logs.length > 0) {
      console.log('Latest logs:');
      result.indicator_logs.slice(0, 5).forEach((log, index) => {
        console.log(`  ${index + 1}. ${log.indicator}: ${log.value} at ${log.time}`);
      });
    }
    
    console.log('\n💰 Trades:', result.trades.length);
    if (result.trades.length > 0) {
      console.log('Latest trades:');
      result.trades.slice(0, 5).forEach((trade, index) => {
        console.log(`  ${index + 1}. ${trade.side} ${trade.quantity} ${trade.symbol} at ${trade.entry_price} (${trade.status})`);
      });
    }
    
    console.log('\n📋 Summary:');
    console.log('Has Indicator Logs:', result.summary.has_indicator_logs);
    console.log('Has Trades:', result.summary.has_trades);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugReal23(); 