// Test script cho Patch-based Backtest API
const testPatchBacktest = async () => {
  const testConfig = {
    experimentId: 'test-' + Date.now(),
    config: {
      trading: {
        symbol: 'BTCUSDT',
        timeframe: '1h',
        startDate: '2024-01-01',
        endDate: '2024-01-10',
        initialCapital: 10000,
        positionSize: 1
      },
      riskManagement: {
        stopLoss: 2,
        takeProfit: 4
      },
      strategy: {
        type: 'ma_crossover',
        parameters: {
          fastPeriod: 10,
          slowPeriod: 20
        }
      },
      transaction_costs: {
        maker_fee: 0.1,
        taker_fee: 0.1
      },
      usePatchBacktest: true,
      patchDays: 3
    }
  };

  console.log('🧪 Testing Patch-based Backtest API...');
  console.log('Config:', JSON.stringify(testConfig, null, 2));

  try {
    const response = await fetch('http://localhost:3000/api/research/experiments/patch-backtest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testConfig)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Test PASSED!');
      console.log('Result:', JSON.stringify(result, null, 2));
    } else {
      console.log('❌ Test FAILED!');
      console.log('Error:', result);
    }
  } catch (error) {
    console.log('❌ Network Error:', error.message);
  }
};

// Chạy test
testPatchBacktest(); 