import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  CorrelationTest, 
  TTest, 
  ANOVA, 
  ChiSquareTest,
  StatTestConfig 
} from '@/lib/research/statistical-tests';

// Khởi tạo Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  let experimentId = '';
  
  try {
    const { experimentId: id, config } = await req.json();
    experimentId = id;
    
    // Cập nhật trạng thái experiment
    await supabase
      .from('research_experiments')
      .update({ 
        status: 'running',
        progress: 10,
        started_at: new Date().toISOString()
      })
      .eq('id', experimentId);

    // Lấy dữ liệu thị trường dựa trên cấu hình
    const { data: marketData, error: dataError } = await supabase
      .from('OHLCV_BTC_USDT_1m')
      .select('*')
      .gte('open_time', config.startDate)
      .lte('open_time', config.endDate)
      .order('open_time', { ascending: true });

    if (dataError) throw dataError;

    // Chuẩn bị dữ liệu cho kiểm định
    const returns = calculateReturns(marketData);
    const volumes = marketData.map(d => d.volume);
    const volatilities = calculateVolatilities(marketData, config.windowSize || 20);

    // Cập nhật tiến độ
    await supabase
      .from('research_experiments')
      .update({ progress: 30 })
      .eq('id', experimentId);

    let testResult;
    const testConfig: StatTestConfig = {
      confidenceLevel: config.confidenceLevel || 0.95,
      alternative: config.alternative || 'two-sided',
      sampleSize: marketData.length
    };
    
    // Thực hiện kiểm định dựa trên loại test
    switch (config.testType) {
      case 'correlation':
        // Kiểm định tương quan giữa lợi nhuận và khối lượng
        testResult = CorrelationTest.perform(returns, volumes, testConfig);
        break;
        
      case 't_test':
        // Kiểm định sự khác biệt về lợi nhuận giữa các nhóm biến động
        const highVolGroup = returns.filter((_, i) => volatilities[i] > config.volatilityThreshold);
        const lowVolGroup = returns.filter((_, i) => volatilities[i] <= config.volatilityThreshold);
        testResult = TTest.independentSamples(highVolGroup, lowVolGroup, testConfig);
        break;
        
      case 'anova':
        // Phân tích phương sai cho lợi nhuận theo các nhóm thời gian
        const timeGroups = splitByTimeGroups(marketData, returns, config.timeGroups || 4);
        testResult = ANOVA.oneWay(timeGroups, testConfig);
        break;
        
      case 'chi_square':
        // Kiểm định Chi-square cho phân phối lợi nhuận
        const observed = createReturnDistribution(returns, config.bins || 10);
        testResult = ChiSquareTest.independence(observed, testConfig);
        break;
        
      default:
        throw new Error('Unsupported test type');
    }

    // Cập nhật tiến độ
    await supabase
      .from('research_experiments')
      .update({ progress: 90 })
      .eq('id', experimentId);

    // Lưu kết quả
    const results = {
      testType: config.testType,
      testResult,
      marketData: {
        startDate: config.startDate,
        endDate: config.endDate,
        sampleSize: marketData.length,
        variables: {
          returns: {
            mean: calculateMean(returns),
            std: calculateStd(returns),
            min: Math.min(...returns),
            max: Math.max(...returns)
          },
          volume: {
            mean: calculateMean(volumes),
            std: calculateStd(volumes),
            min: Math.min(...volumes),
            max: Math.max(...volumes)
          },
          volatility: {
            mean: calculateMean(volatilities),
            std: calculateStd(volatilities),
            min: Math.min(...volatilities),
            max: Math.max(...volatilities)
          }
        }
      }
    };

    // Cập nhật experiment với kết quả
    await supabase
      .from('research_experiments')
      .update({ 
        status: 'completed',
        progress: 100,
        results,
        completed_at: new Date().toISOString()
      })
      .eq('id', experimentId);

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Error running hypothesis test:', error);
    
    // Cập nhật trạng thái lỗi
    if (experimentId) {
      await supabase
        .from('research_experiments')
        .update({ 
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', experimentId);
    }

    return NextResponse.json(
      { error: 'Failed to run hypothesis test' },
      { status: 500 }
    );
  }
}

// Utility functions
function calculateReturns(data: any[]): number[] {
  return data.map((d, i) => {
    if (i === 0) return 0;
    return (d.close_price - data[i-1].close_price) / data[i-1].close_price;
  });
}

function calculateVolatilities(data: any[], windowSize: number): number[] {
  const returns = calculateReturns(data);
  return returns.map((_, i) => {
    if (i < windowSize) return 0;
    const window = returns.slice(i - windowSize, i);
    return calculateStd(window);
  });
}

function splitByTimeGroups(data: any[], returns: number[], numGroups: number): number[][] {
  const groupSize = Math.floor(data.length / numGroups);
  const groups: number[][] = [];
  
  for (let i = 0; i < numGroups; i++) {
    const start = i * groupSize;
    const end = i === numGroups - 1 ? data.length : (i + 1) * groupSize;
    groups.push(returns.slice(start, end));
  }
  
  return groups;
}

function createReturnDistribution(returns: number[], numBins: number): number[][] {
  const min = Math.min(...returns);
  const max = Math.max(...returns);
  const binSize = (max - min) / numBins;
  
  const distribution = Array(numBins).fill(0).map(() => Array(numBins).fill(0));
  
  returns.forEach(r => {
    const binX = Math.min(Math.floor((r - min) / binSize), numBins - 1);
    const binY = Math.min(Math.floor((r - min) / binSize), numBins - 1);
    distribution[binX][binY]++;
  });
  
  return distribution;
}

function calculateMean(data: number[]): number {
  return data.reduce((sum, val) => sum + val, 0) / data.length;
}

function calculateStd(data: number[]): number {
  const mean = calculateMean(data);
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (data.length - 1);
  return Math.sqrt(variance);
} 