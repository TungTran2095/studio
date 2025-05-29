import { NextRequest, NextResponse } from 'next/server';
import { CorrelationTest, TTest, ANOVA } from '@/lib/research/statistical-tests';
import { BacktestingEngine, generateSampleMarketData } from '@/lib/research/backtesting-engine';
import { BacktestConfig } from '@/types/research-models';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const testType = searchParams.get('type');

  try {
    switch (testType) {
      case 'correlation':
        return await testCorrelation();
      
      case 't-test':
        return await testTTest();
      
      case 'anova':
        return await testANOVA();
      
      case 'backtest':
        return await testBacktest();
      
      default:
        return NextResponse.json({
          message: 'Research & Model Development Backend Test',
          availableTests: [
            'correlation - Test correlation analysis',
            't-test - Test independent samples t-test',
            'anova - Test one-way ANOVA',
            'backtest - Test momentum trading strategy'
          ],
          usage: 'Add ?type=correlation (or other test types) to test specific functionality'
        });
    }
  } catch (error) {
    console.error('Test Error:', error);
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

async function testCorrelation() {
  // Generate sample data: volume and price changes
  const volumeData = Array.from({ length: 100 }, () => 1000000 + Math.random() * 5000000);
  const priceChanges = volumeData.map(vol => {
    // Higher volume tends to correlate with larger price changes
    const baseChange = (Math.random() - 0.5) * 0.1;
    const volumeEffect = (vol - 3000000) / 10000000 * 0.05;
    return baseChange + volumeEffect;
  });

  const result = CorrelationTest.perform(volumeData, priceChanges);

  return NextResponse.json({
    test: 'Correlation Analysis',
    description: 'Analyzing correlation between volume and price changes',
    data: {
      volumeSample: volumeData.slice(0, 5),
      priceChangesSample: priceChanges.slice(0, 5),
      sampleSize: volumeData.length
    },
    result: {
      correlation: result.testStatistic,
      pValue: result.pValue,
      isSignificant: result.isSignificant,
      interpretation: result.interpretation,
      effectSize: result.effect_size
    }
  });
}

async function testTTest() {
  // Generate sample data: returns before and after news events
  const returnsBeforeNews = Array.from({ length: 50 }, () => (Math.random() - 0.5) * 0.08);
  const returnsAfterNews = Array.from({ length: 50 }, () => {
    // Slightly higher returns after positive news
    return (Math.random() - 0.45) * 0.08;
  });

  const result = TTest.independentSamples(returnsBeforeNews, returnsAfterNews);

  return NextResponse.json({
    test: 'Independent T-Test',
    description: 'Comparing returns before vs after news events',
    data: {
      beforeNewsSample: returnsBeforeNews.slice(0, 5),
      afterNewsSample: returnsAfterNews.slice(0, 5),
      group1Size: returnsBeforeNews.length,
      group2Size: returnsAfterNews.length
    },
    result: {
      tStatistic: result.testStatistic,
      pValue: result.pValue,
      isSignificant: result.isSignificant,
      interpretation: result.interpretation,
      effectSize: result.effect_size
    }
  });
}

async function testANOVA() {
  // Generate sample data: returns across different timeframes
  const timeframes = {
    '1h': Array.from({ length: 30 }, () => (Math.random() - 0.5) * 0.05),
    '4h': Array.from({ length: 30 }, () => (Math.random() - 0.48) * 0.08),
    '1d': Array.from({ length: 30 }, () => (Math.random() - 0.47) * 0.12)
  };

  const groups = [timeframes['1h'], timeframes['4h'], timeframes['1d']];
  const result = ANOVA.oneWay(groups);

  return NextResponse.json({
    test: 'One-Way ANOVA',
    description: 'Comparing returns across different timeframes (1h, 4h, 1d)',
    data: {
      timeframeSamples: {
        '1h': timeframes['1h'].slice(0, 5),
        '4h': timeframes['4h'].slice(0, 5),
        '1d': timeframes['1d'].slice(0, 5)
      },
      groupSizes: groups.map(g => g.length)
    },
    result: {
      fStatistic: result.testStatistic,
      pValue: result.pValue,
      isSignificant: result.isSignificant,
      interpretation: result.interpretation,
      effectSize: result.effect_size
    }
  });
}

async function testBacktest() {
  // Generate sample market data for 100 days
  const marketData = generateSampleMarketData(100);
  
  // Create backtest configuration
  const config: BacktestConfig = {
    modelId: 'test-model',
    strategy: {
      id: 'momentum',
      name: 'Simple Momentum Strategy',
      entryRules: [
        {
          id: 'price-up',
          condition: 'price_change > 0.02',
          operator: 'greater_than',
          value: 0.02,
          enabled: true
        }
      ],
      exitRules: [
        {
          id: 'price-down',
          condition: 'price_change < -0.01',
          operator: 'less_than',
          value: -0.01,
          enabled: true
        }
      ],
      positionSizing: {
        method: 'fixed_percentage',
        parameters: { percentage: 10 }
      },
      signals: []
    },
    period: {
      start: marketData[0].timestamp,
      end: marketData[marketData.length - 1].timestamp
    },
    initialCapital: 10000,
    commission: 0.1, // 0.1%
    slippage: 0.05, // 0.05%
    riskManagement: {
      maxPositionSize: 25,
      stopLoss: 3,
      takeProfit: 6,
      maxDrawdown: 20,
      maxConcurrentPositions: 1,
      riskPerTrade: 10
    }
  };

  // Run backtest
  const engine = new BacktestingEngine(marketData, config);
  const results = await engine.run();

  return NextResponse.json({
    test: 'Backtesting Engine',
    description: 'Testing momentum trading strategy on 100 days of simulated BTC data',
    config: {
      strategy: config.strategy.name,
      period: `${config.period.start} to ${config.period.end}`,
      initialCapital: config.initialCapital,
      riskPerTrade: config.riskManagement.riskPerTrade + '%'
    },
    data: {
      marketDataPoints: marketData.length,
      priceRange: {
        start: marketData[0].close,
        end: marketData[marketData.length - 1].close,
        min: Math.min(...marketData.map(d => d.close)),
        max: Math.max(...marketData.map(d => d.close))
      }
    },
    results: {
      performance: {
        totalReturn: results.performance.totalReturn.toFixed(2) + '%',
        sharpeRatio: results.performance.sharpeRatio.toFixed(3),
        maxDrawdown: results.performance.maxDrawdown.toFixed(2) + '%',
        winRate: results.performance.winRate.toFixed(1) + '%',
        totalTrades: results.performance.totalTrades,
        profitFactor: results.performance.profitFactor.toFixed(3)
      },
      trades: results.trades.slice(0, 5).map(trade => ({
        side: trade.side,
        entryPrice: trade.entryPrice.toFixed(2),
        exitPrice: trade.exitPrice.toFixed(2),
        pnl: trade.pnl.toFixed(2),
        pnlPercent: trade.pnlPercent.toFixed(2) + '%',
        holdingPeriod: trade.holdingPeriod.toFixed(1) + 'h'
      })),
      totalTrades: results.trades.length,
      equityPoints: results.equity.length
    }
  });
} 