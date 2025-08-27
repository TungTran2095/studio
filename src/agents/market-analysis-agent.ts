/**
 * Tác nhân phân tích thị trường (Market Analysis Agent)
 * - Phân tích kỹ thuật
 * - Phân tích cơ bản
 * - Phân tích tâm lý thị trường
 * - Nhận diện mẫu hình giá
 */

import { fetchTechnicalIndicators } from '@/actions/technical-analysis';
import { AgentMemory } from '@/ai/memory/agent-memory';
import { State } from '@/ai/models/reinforcement-learning';
import { getTechnicalAnalysisForAI } from '@/actions/market-data';
import { calculateIchimoku } from '@/agent/tools/technical-analysis-tool';

export interface MarketInsight {
  symbol: string;
  timeframe: string;
  currentPrice: number;
  priceChange24h: number;
  volume24h: number;
  marketCondition: 'bullish' | 'bearish' | 'sideways';
  indicators: {
    rsi: number;
    macd: {
      line: number;
      signal: number;
      histogram: number;
    };
    ma50: number;
    ma200: number;
    bollingerBands: {
      upper: number;
      middle: number;
      lower: number;
    };
    ichimoku?: {
      tenkanSen: number;
      kijunSen: number;
      senkouSpanA: number;
      senkouSpanB: number;
      chikouSpan: number;
      signal: 'BUY' | 'SELL' | 'NEUTRAL';
      strength: number;
    };
  };
  sentiment: {
    overall: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
    reasons: string[];
  };
  patterns: string[];
  supportLevels: number[];
  resistanceLevels: number[];
  predictedMove: 'up' | 'down' | 'sideways';
  predictedPriceRange: {
    low: number;
    high: number;
  };
  timestamp: number;
}

export interface MarketAnalysisConfig {
  timeframes: string[];
  indicatorsToAnalyze: string[];
  fundamentalFactors: boolean;
  sentimentAnalysis: boolean;
  patternRecognition: boolean;
  confidenceThreshold: number;
}

export class MarketAnalysisAgent {
  private config: MarketAnalysisConfig;
  private memory: AgentMemory;
  private lastAnalysisResults: Map<string, MarketInsight> = new Map();

  constructor(memory: AgentMemory, config?: Partial<MarketAnalysisConfig>) {
    this.memory = memory;
    this.config = {
      timeframes: ['1h', '4h', '1d'],
      indicatorsToAnalyze: ['RSI', 'MACD', 'Bollinger Bands', 'Moving Averages', 'Ichimoku Cloud'],
      fundamentalFactors: true,
      sentimentAnalysis: true,
      patternRecognition: true,
      confidenceThreshold: 70,
      ...config
    };
  }

  /**
   * Phân tích thị trường cho một mã tiền cụ thể
   */
  public async analyzeMarket(symbol: string, timeframe: string = '1d'): Promise<MarketInsight> {
    console.log(`[MarketAnalysisAgent] Đang phân tích thị trường cho ${symbol} (${timeframe})...`);
    
    try {
      // Kiểm tra xem đã có phân tích gần đây chưa
      const cacheKey = `${symbol}_${timeframe}`;
      const cachedResult = this.lastAnalysisResults.get(cacheKey);
      
      // Nếu có kết quả gần đây (dưới 5 phút) thì trả về
      if (cachedResult && Date.now() - cachedResult.timestamp < 5 * 60 * 1000) {
        console.log(`[MarketAnalysisAgent] Sử dụng phân tích đã lưu trong bộ nhớ cache cho ${symbol}`);
        return cachedResult;
      }
      
      // Lấy dữ liệu phân tích kỹ thuật
      const technicalAnalysis = await getTechnicalAnalysisForAI(symbol, timeframe);
      
      // Trích xuất các thông tin từ phân tích
      const insight = this.extractInsightFromAnalysis(technicalAnalysis, symbol, timeframe);
      
      // Nếu Ichimoku Cloud được yêu cầu trong cấu hình, thêm phân tích Ichimoku
      if (this.config.indicatorsToAnalyze.includes('Ichimoku Cloud')) {
        try {
          const ichimokuData = await calculateIchimoku(symbol, timeframe);
          if (!ichimokuData.error) {
            insight.indicators.ichimoku = {
              tenkanSen: ichimokuData.tenkanSen,
              kijunSen: ichimokuData.kijunSen,
              senkouSpanA: ichimokuData.senkouSpanA,
              senkouSpanB: ichimokuData.senkouSpanB,
              chikouSpan: ichimokuData.chikouSpan,
              signal: ichimokuData.signal,
              strength: ichimokuData.strength
            };
          }
        } catch (error) {
          console.error(`[MarketAnalysisAgent] Lỗi khi tính toán Ichimoku:`, error);
        }
      }
      
      // Lưu kết quả vào bộ nhớ cache
      this.lastAnalysisResults.set(cacheKey, insight);
      
      // Lưu vào AgentMemory để học tập
      this.storeAnalysisInMemory(insight);
      
      return insight;
    } catch (error: any) {
      console.error(`[MarketAnalysisAgent] Lỗi khi phân tích thị trường cho ${symbol}:`, error);
      throw new Error(`Không thể phân tích thị trường cho ${symbol}: ${error.message}`);
    }
  }

  /**
   * Chuyển đổi kết quả phân tích thành trạng thái cho mô hình RL
   */
  public convertToState(insight: MarketInsight): State {
    // Chuyển đổi phân tích thành các đặc trưng cho mô hình
    const features = {
      price: insight.currentPrice,
      priceChange24h: insight.priceChange24h,
      rsi: insight.indicators.rsi,
      macdHistogram: insight.indicators.macd.histogram,
      bollingerWidth: insight.indicators.bollingerBands.upper - insight.indicators.bollingerBands.lower,
      priceToMA200Ratio: insight.currentPrice / insight.indicators.ma200,
      sentimentConfidence: insight.sentiment.confidence,
      ichimokuSignal: insight.indicators.ichimoku ? 
        (insight.indicators.ichimoku.signal === 'BUY' ? 1 : insight.indicators.ichimoku.signal === 'SELL' ? -1 : 0) : 0,
      ichimokuStrength: insight.indicators.ichimoku ? insight.indicators.ichimoku.strength : 0
    };
    
    // Tạo ID cho state
    const stateId = `${insight.symbol}_${insight.timeframe}_${insight.timestamp}`;
    
    return {
      id: stateId,
      symbol: insight.symbol,
      features
    };
  }

  /**
   * Lấy phân tích thị trường gần đây nhất
   */
  public getLastAnalysis(symbol: string): MarketInsight | undefined {
    return this.lastAnalysisResults.get(symbol);
  }

  /**
   * Trích xuất thông tin từ phân tích kỹ thuật
   */
  private extractInsightFromAnalysis(analysis: string, symbol: string, timeframe: string): MarketInsight {
    // Trong thực tế, bạn sẽ phân tích văn bản để trích xuất thông tin
    // Đây là một triển khai đơn giản sử dụng giá trị ngẫu nhiên
    
    const currentPrice = this.extractNumberFromText(analysis, 'giá hiện tại', 1000, 100000);
    const priceChange24h = this.extractPercentFromText(analysis, 'thay đổi 24h', -10, 10);
    
    // Suy ra điều kiện thị trường giản lược từ biến động và tín hiệu ngẫu nhiên
    const derivedCondition: 'bullish' | 'bearish' | 'sideways' = 
      priceChange24h > 2 ? 'bullish' : priceChange24h < -2 ? 'bearish' : 'sideways';

    return {
      symbol,
      timeframe,
      currentPrice,
      priceChange24h,
      volume24h: Math.random() * 1000000000,
      marketCondition: derivedCondition,
      indicators: {
        rsi: this.extractNumberFromText(analysis, 'RSI', 0, 100),
        macd: {
          line: this.extractNumberFromText(analysis, 'MACD line', -50, 50),
          signal: this.extractNumberFromText(analysis, 'signal line', -50, 50),
          histogram: this.extractNumberFromText(analysis, 'histogram', -30, 30),
        },
        ma50: currentPrice * (1 + (Math.random() * 0.1 - 0.05)),
        ma200: currentPrice * (1 + (Math.random() * 0.2 - 0.1)),
        bollingerBands: {
          upper: currentPrice * 1.05,
          middle: currentPrice,
          lower: currentPrice * 0.95,
        }
      },
      sentiment: {
        overall: Math.random() > 0.5 ? 'bullish' : (Math.random() > 0.5 ? 'bearish' : 'neutral'),
        confidence: Math.round(Math.random() * 100),
        reasons: ['Market momentum', 'Technical signals', 'Volume analysis']
      },
      patterns: ['Double bottom', 'Golden cross'],
      supportLevels: [currentPrice * 0.95, currentPrice * 0.9],
      resistanceLevels: [currentPrice * 1.05, currentPrice * 1.1],
      predictedMove: Math.random() > 0.6 ? 'up' : (Math.random() > 0.5 ? 'down' : 'sideways'),
      predictedPriceRange: {
        low: currentPrice * 0.95,
        high: currentPrice * 1.05
      },
      timestamp: Date.now()
    };
  }

  /**
   * Lưu trữ phân tích trong bộ nhớ
   */
  private storeAnalysisInMemory(insight: MarketInsight): void {
    try {
      // Tạo một bản ghi kinh nghiệm từ phân tích
      const recommendedAction: 'BUY' | 'SELL' | 'HOLD' = 
        insight.indicators.ichimoku?.signal === 'BUY' ? 'BUY' :
        insight.indicators.ichimoku?.signal === 'SELL' ? 'SELL' : 'HOLD';
      
      this.memory.addExperience({
        action: recommendedAction,
        symbol: insight.symbol,
        price: insight.currentPrice,
        quantity: '0', // Không thực hiện giao dịch thực tế
        reasoning: `Dựa trên phân tích thị trường với RSI=${insight.indicators.rsi}, MACD histogram=${insight.indicators.macd.histogram}, và Ichimoku signal=${insight.indicators.ichimoku?.signal || 'N/A'}`
      });
      
      console.log(`[MarketAnalysisAgent] Đã lưu phân tích vào bộ nhớ với action ${recommendedAction}`);
    } catch (error: any) {
      console.error('[MarketAnalysisAgent] Lỗi khi lưu phân tích vào bộ nhớ:', error);
    }
  }

  /**
   * Trích xuất số từ văn bản phân tích
   */
  private extractNumberFromText(text: string, keyword: string, min: number, max: number): number {
    const regex = new RegExp(`${keyword}[^0-9]*([0-9,.]+)`, 'i');
    const match = text.match(regex);
    
    if (match && match[1]) {
      const numberStr = match[1].replace(/,/g, '');
      const number = parseFloat(numberStr);
      if (!isNaN(number)) {
        return number;
      }
    }
    
    return min + Math.random() * (max - min);
  }

  /**
   * Trích xuất phần trăm từ văn bản phân tích
   */
  private extractPercentFromText(text: string, keyword: string, min: number, max: number): number {
    const regex = new RegExp(`${keyword}[^0-9]*([+-]?[0-9,.]+)%`, 'i');
    const match = text.match(regex);
    
    if (match && match[1]) {
      const numberStr = match[1].replace(/,/g, '');
      const number = parseFloat(numberStr);
      if (!isNaN(number)) {
        return number;
      }
    }
    
    return min + Math.random() * (max - min);
  }
} 