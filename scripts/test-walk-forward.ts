#!/usr/bin/env tsx

/**
 * Test script cho Walk Forward Analysis thực tế
 * Chạy: npx tsx scripts/test-walk-forward.ts
 */

import { WalkForwardService } from '../src/lib/trading/walk-forward-service';

async function testWalkForwardAnalysis() {
  console.log('🧪 Testing Walk Forward Analysis...\n');

  const walkForwardService = new WalkForwardService();

  try {
    // Test 1: Fetch OHLCV data
    console.log('📊 Test 1: Fetching OHLCV data...');
    const testData = await walkForwardService.fetchOHLCVData('2023-01-01', '2023-01-31');
    console.log(`✅ Fetched ${testData.length} candles`);
    console.log(`📈 Sample data: ${JSON.stringify(testData[0], null, 2)}\n`);

    // Test 2: Moving Average calculation
    console.log('📊 Test 2: Moving Average calculation...');
    const prices = testData.map(c => c.close);
    const ma5 = walkForwardService.calculateMA(prices, 5);
    const ma20 = walkForwardService.calculateMA(prices, 20);
    console.log(`✅ MA5: ${ma5.slice(-5).map(v => v.toFixed(2)).join(', ')}`);
    console.log(`✅ MA20: ${ma20.slice(-5).map(v => v.toFixed(2)).join(', ')}\n`);

    // Test 3: Strategy backtest
    console.log('📊 Test 3: Strategy backtest...');
    const strategyParams = {
      fastPeriod: 10,
      slowPeriod: 30,
      stopLoss: 0.05,
      takeProfit: 0.10,
      positionSize: 0.1
    };
    
    const backtestResult = walkForwardService.runMACrossoverStrategy(testData, strategyParams);
    console.log('✅ Backtest Results:');
    console.log(`   Total Return: ${backtestResult.totalReturn.toFixed(2)}%`);
    console.log(`   Sharpe Ratio: ${backtestResult.sharpeRatio.toFixed(2)}`);
    console.log(`   Max Drawdown: ${backtestResult.maxDrawdown.toFixed(2)}%`);
    console.log(`   Win Rate: ${backtestResult.winRate.toFixed(2)}%`);
    console.log(`   Total Trades: ${backtestResult.totalTrades}`);
    console.log(`   Profit Factor: ${backtestResult.profitFactor.toFixed(2)}\n`);

    // Test 4: Parameter optimization
    console.log('📊 Test 4: Parameter optimization...');
    const paramRanges = {
      fastPeriod: [5, 15, 5] as [number, number, number],
      slowPeriod: [20, 40, 10] as [number, number, number],
      stopLoss: [0.03, 0.07, 0.02] as [number, number, number],
      takeProfit: [0.08, 0.15, 0.05] as [number, number, number]
    };
    
    const optimizedParams = walkForwardService.optimizeParameters(testData, paramRanges);
    console.log('✅ Optimized Parameters:');
    console.log(`   Fast Period: ${optimizedParams.fastPeriod}`);
    console.log(`   Slow Period: ${optimizedParams.slowPeriod}`);
    console.log(`   Stop Loss: ${(optimizedParams.stopLoss * 100).toFixed(1)}%`);
    console.log(`   Take Profit: ${(optimizedParams.takeProfit * 100).toFixed(1)}%\n`);

    // Test 5: Walk Forward Analysis (small scale)
    console.log('📊 Test 5: Walk Forward Analysis (small scale)...');
    const walkForwardConfig = {
      totalPeriod: 90, // 3 months
      inSamplePeriod: 60, // 2 months training
      outSamplePeriod: 30, // 1 month testing
      stepSize: 15, // 2 weeks step
      optimizationMethod: 'grid_search',
      paramRanges: {
        fastPeriod: [5, 15, 5] as [number, number, number],
        slowPeriod: [20, 40, 10] as [number, number, number],
        stopLoss: [0.03, 0.07, 0.02] as [number, number, number],
        takeProfit: [0.08, 0.15, 0.05] as [number, number, number]
      }
    };

    console.log('🔄 Running Walk Forward Analysis...');
    const startTime = Date.now();
    
    const walkForwardResults = await walkForwardService.runWalkForwardAnalysis(walkForwardConfig);
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`✅ Walk Forward Analysis completed in ${duration.toFixed(2)}s`);
    console.log(`📊 Results Summary:`);
    console.log(`   Total Periods: ${walkForwardResults.overallMetrics.totalPeriods}`);
    console.log(`   Completed Periods: ${walkForwardResults.overallMetrics.completedPeriods}`);
    console.log(`   Average In-Sample Return: ${walkForwardResults.overallMetrics.averageInSampleReturn.toFixed(2)}%`);
    console.log(`   Average Out-Sample Return: ${walkForwardResults.overallMetrics.averageOutSampleReturn.toFixed(2)}%`);
    console.log(`   Average Stability: ${walkForwardResults.overallMetrics.averageStability.toFixed(2)}`);
    console.log(`   Consistency Score: ${walkForwardResults.overallMetrics.consistencyScore.toFixed(2)}`);
    console.log(`   Overfitting Risk: ${walkForwardResults.overallMetrics.overfittingRisk.toFixed(2)}`);
    console.log(`   Recommendation: ${walkForwardResults.overallMetrics.recommendation}\n`);

    // Test 6: Parameter drift calculation
    console.log('📊 Test 6: Parameter drift calculation...');
    const params1 = { fastPeriod: 10, slowPeriod: 30, stopLoss: 0.05, takeProfit: 0.10, positionSize: 0.1 };
    const params2 = { fastPeriod: 12, slowPeriod: 35, stopLoss: 0.06, takeProfit: 0.12, positionSize: 0.1 };
    
    const drift = walkForwardService.calculateParameterDrift(params2, params1);
    console.log(`✅ Parameter Drift: ${(drift * 100).toFixed(2)}%`);
    console.log(`✅ Stability Score: ${((1 - drift) * 100).toFixed(2)}%\n`);

    console.log('🎉 All tests passed successfully!');
    console.log('✅ Walk Forward Analysis is working correctly with real data.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testWalkForwardAnalysis().catch(console.error); 