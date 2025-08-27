import { NextRequest, NextResponse } from 'next/server';
import { Asset } from '@/actions/binance';
import { fetchHistoricalPrices, fetchMarketBenchmarkData, calculateCorrelationMatrix, detectTrend } from '@/lib/market/historical-data';
import { RiskMetrics, calculatePortfolioRisk } from '@/lib/portfolio/risk-analysis';
import { optimizePortfolio, optimizeForMarketTrend, rebalancePortfolio } from '@/lib/portfolio/optimization';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credentials, assets, options } = body;
    
    if (!credentials || !assets || !Array.isArray(assets) || assets.length === 0) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ. Vui lòng cung cấp thông tin đăng nhập và danh sách tài sản.' },
        { status: 400 }
      );
    }
    
    const { apiKey, apiSecret, isTestnet, useDefault } = credentials;
    const { timeframe = '1d', period = 30, riskFreeRate = 0.02 } = options || {};
    
    // Lấy danh sách các ký hiệu tài sản
    const symbols = assets.map(asset => asset.asset);
    
    // Lấy dữ liệu lịch sử giá
    const historicalPrices = await fetchHistoricalPrices({
      apiKey,
      apiSecret,
      isTestnet,
      useDefault,
      symbols,
      interval: timeframe,
      limit: period
    });
    
    // Lấy dữ liệu chuẩn thị trường (BTC)
    const marketData = await fetchMarketBenchmarkData({
      apiKey,
      apiSecret,
      isTestnet,
      useDefault,
      interval: timeframe,
      limit: period
    });
    
    // Tính toán ma trận tương quan
    const correlationMatrix = calculateCorrelationMatrix(historicalPrices);
    
    // Phát hiện xu hướng thị trường tổng thể (dựa trên BTC)
    const marketTrend = historicalPrices['BTC'] ? detectTrend(historicalPrices['BTC']) : 'sideways';
    
    // Tính toán các chỉ số rủi ro
    const pricesAsNumbers = Object.fromEntries(
      Object.entries(historicalPrices).map(([symbol, priceData]) => [
        symbol,
        priceData.prices || []
      ])
    );
    
    const riskMetrics = await calculatePortfolioRisk(
      assets as Asset[],
      pricesAsNumbers,
      marketData
    );
    
    // Tối ưu hóa danh mục theo xu hướng thị trường
    const optimizedPortfolio = optimizeForMarketTrend(
      {
        assets: assets as Asset[],
        historicalPrices,
        riskFreeRate: riskFreeRate / 365 // Chuyển đổi sang lãi suất hàng ngày
      },
      marketTrend
    );
    
    // Tạo kế hoạch tái cân bằng
    const rebalancePlan = rebalancePortfolio(
      assets as Asset[],
      optimizedPortfolio.weights
    );
    
    // Tạo kết quả phân tích
    const result = {
      riskMetrics,
      correlationMatrix,
      marketTrend,
      optimizedPortfolio: {
        ...optimizedPortfolio,
        assets: assets.map((asset, index) => ({
          symbol: asset.asset,
          currentValue: asset.valueUsd,
          currentWeight: asset.valueUsd / assets.reduce((sum, a) => sum + a.valueUsd, 0),
          targetWeight: optimizedPortfolio.weights[index]
        }))
      },
      rebalancePlan
    };
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Lỗi khi phân tích danh mục:', error);
    return NextResponse.json(
      { error: `Lỗi khi phân tích danh mục: ${error instanceof Error ? error.message : 'Lỗi không xác định'}` },
      { status: 500 }
    );
  }
} 