// src/types/indicators.ts

// Define the structure for the indicator data
export interface IndicatorsData {
    // Trend Indicators
    "Moving Average (50)": string;
    "Moving Average (200)": string;
    "EMA (21)": string;
    "Ichimoku Cloud": string;
    "ADX (14)": string;
    "Parabolic SAR": string;
    
    // Momentum Indicators
    "RSI (14)": string;
    "Stochastic (14,3)": string;
    "MACD": string;
    "CCI (20)": string;
    
    // Volatility Indicators
    "Bollinger Bands": string;
    "ATR (14)": string;
    
    // Volume Indicators
    "OBV": string;
    "Volume MA (20)": string;
    
    // Support/Resistance
    "Fibonacci Levels": string;
    "Pivot Points": string;
    
    // Other
    "Price Trend": string;
    lastUpdated: string; // Add timestamp for last update
    
    // Cho phép truy cập bằng chuỗi (index signature)
    [key: string]: string;
}

// Define a type for indicator categories for UI organization
export const indicatorCategories = {
    "Trend": ["Moving Average (50)", "Moving Average (200)", "EMA (21)", "Ichimoku Cloud", "ADX (14)", "Parabolic SAR"],
    "Momentum": ["RSI (14)", "Stochastic (14,3)", "MACD", "CCI (20)"],
    "Volatility": ["Bollinger Bands", "ATR (14)"],
    "Volume": ["OBV", "Volume MA (20)"],
    "Support/Resistance": ["Fibonacci Levels", "Pivot Points"],
    "Other": ["Price Trend"]
}; 

// Định nghĩa cấu trúc dữ liệu cho nến (OHLCV)
export interface Candle {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

// Định nghĩa cấu trúc dữ liệu cho Bollinger Bands
export interface BollingerBands {
    upper: number;
    middle: number;
    lower: number;
    bandwidth: number;
    isSqueezing: boolean;
}

// Định nghĩa cấu trúc dữ liệu cho MACD
export interface MACD {
    macd: number;
    signal: number;
    histogram: number;
    trend: 'bullish' | 'bearish' | 'neutral';
}

// Định nghĩa cấu trúc dữ liệu cho mô hình giá
export interface PricePattern {
    pattern: string;
    reliability: number; // 0-100%
    potentialProfit: number; // Tiềm năng lợi nhuận ước tính
    stopLoss: number; // Mức cắt lỗ đề xuất
    takeProfit: number; // Mức chốt lời đề xuất
}

// Định nghĩa cấu trúc cho kết quả phân tích kỹ thuật
export interface TechnicalAnalysisResult {
    symbol: string;
    timeframe: string;
    timestamp: string;
    price: number;
    indicators: {
        rsi: number;
        macd: MACD;
        bollingerBands: BollingerBands;
        ema20: number;
        ema50: number;
        ema200: number;
    };
    patterns: PricePattern[];
    signals: Array<{
        indicator: string;
        action: 'buy' | 'sell' | 'hold';
        strength: number; // 0-100%
        reason: string;
    }>;
    summary: {
        recommendation: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
        score: number; // -100 đến 100
        description: string;
    };
}

// Định nghĩa cấu trúc cho kết quả backtesting
export interface BacktestResult {
    symbol: string;
    timeframe: string;
    startDate: string;
    endDate: string;
    initialCapital: number;
    finalCapital: number;
    profitLoss: number;
    profitLossPercentage: number;
    maxDrawdown: number;
    maxDrawdownPercentage: number;
    winRate: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    averageWin: number;
    averageLoss: number;
    sharpeRatio: number;
    trades: Array<{
        type: 'buy' | 'sell';
        entryDate: string;
        entryPrice: number;
        exitDate: string;
        exitPrice: number;
        profitLoss: number;
        profitLossPercentage: number;
        reason: string;
    }>;
    chart: {
        equityCurve: Array<{date: string, value: number}>;
        drawdownCurve: Array<{date: string, value: number}>;
    };
}

// Định nghĩa cấu trúc dữ liệu cho danh mục đầu tư
export interface PortfolioAsset {
    symbol: string;
    weight: number;
    expectedReturn: number;
    volatility: number; // Độ biến động/rủi ro
    correlation: Record<string, number>; // Tương quan với các tài sản khác
}

export interface OptimizedPortfolio {
    assets: PortfolioAsset[];
    expectedReturn: number;
    expectedRisk: number;
    sharpeRatio: number;
    diversificationScore: number; // 0-100%
    recommendation: string;
    allocationSummary: string;
} 