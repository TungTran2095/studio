/**
 * Advanced Sentiment Analysis
 * Nâng cấp từ basic sentiment analysis hiện có
 * Không thay thế mà bổ sung thêm tính năng
 */

export interface MultiModalSentiment {
  textSentiment: {
    score: number; // -1 to 1
    confidence: number; // 0 to 1
    keywords: string[];
    emotions: {
      fear: number;
      greed: number;
      optimism: number;
      pessimism: number;
    };
  };
  socialMetrics: {
    mentionVolume: number;
    engagementRate: number;
    influencerSentiment: number;
    trendingScore: number;
  };
  priceActionSentiment: {
    momentum: number;
    volatility: number;
    volumeProfile: number;
    technicalBias: 'bullish' | 'bearish' | 'neutral';
  };
  fearGreedIndex: {
    value: number; // 0-100
    level: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
    components: {
      volatility: number;
      marketMomentum: number;
      socialVolume: number;
      surveys: number;
      dominance: number;
    };
  };
  overallSentiment: {
    score: number; // -1 to 1
    confidence: number;
    trend: 'improving' | 'declining' | 'stable';
    signals: string[];
  };
}

export interface SentimentTrend {
  symbol: string;
  timeframe: string;
  dataPoints: {
    timestamp: Date;
    sentiment: number;
    volume: number;
    confidence: number;
  }[];
  momentum: number;
  volatility: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  strength: number;
}

export class AdvancedSentimentAnalyzer {
  private sentimentCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Phân tích sentiment đa chiều cho một symbol
   */
  async analyzeMultiModalSentiment(symbol: string): Promise<MultiModalSentiment> {
    console.log(`🧠 [AdvancedSentiment] Analyzing multi-modal sentiment for ${symbol}`);

    try {
      // Check cache first
      const cacheKey = `sentiment_${symbol}`;
      const cached = this.sentimentCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        console.log(`📋 [AdvancedSentiment] Using cached data for ${symbol}`);
        return cached.data;
      }

      // Parallel analysis của các components
      const [textSentiment, socialMetrics, priceActionSentiment, fearGreedIndex] = await Promise.all([
        this.analyzeTextSentiment(symbol),
        this.analyzeSocialMetrics(symbol),
        this.analyzePriceActionSentiment(symbol),
        this.calculateFearGreedIndex(symbol)
      ]);

      // Combine all sentiments
      const overallSentiment = this.combineMultiModalSentiments(
        textSentiment,
        socialMetrics,
        priceActionSentiment,
        fearGreedIndex
      );

      const result: MultiModalSentiment = {
        textSentiment,
        socialMetrics,
        priceActionSentiment,
        fearGreedIndex,
        overallSentiment
      };

      // Cache result
      this.sentimentCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      console.log(`✅ [AdvancedSentiment] Completed analysis for ${symbol}`);
      return result;

    } catch (error) {
      console.error(`❌ [AdvancedSentiment] Error analyzing ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Phân tích text sentiment nâng cao
   */
  private async analyzeTextSentiment(symbol: string) {
    try {
      // Sử dụng news data collector hiện có
      const newsResponse = await fetch('/api/market-data/news');
      const newsData = await newsResponse.json();

      if (!newsData.success) {
        throw new Error('Failed to fetch news data');
      }

      const articles = newsData.articles || [];
      const symbolArticles = articles.filter((article: any) => 
        article.title.toLowerCase().includes(symbol.toLowerCase()) ||
        article.summary?.toLowerCase().includes(symbol.toLowerCase())
      );

      if (symbolArticles.length === 0) {
        return {
          score: 0,
          confidence: 0.3,
          keywords: [],
          emotions: { fear: 0, greed: 0, optimism: 0, pessimism: 0 }
        };
      }

      // Advanced sentiment analysis
      let totalScore = 0;
      let totalConfidence = 0;
      const allKeywords: string[] = [];
      const emotions = { fear: 0, greed: 0, optimism: 0, pessimism: 0 };

      for (const article of symbolArticles) {
        const text = `${article.title} ${article.summary || ''}`;
        const sentiment = this.analyzeSentimentAdvanced(text);
        
        totalScore += sentiment.score;
        totalConfidence += sentiment.confidence;
        allKeywords.push(...sentiment.keywords);
        
        // Accumulate emotions
        emotions.fear += sentiment.emotions.fear;
        emotions.greed += sentiment.emotions.greed;
        emotions.optimism += sentiment.emotions.optimism;
        emotions.pessimism += sentiment.emotions.pessimism;
      }

      const avgScore = totalScore / symbolArticles.length;
      const avgConfidence = totalConfidence / symbolArticles.length;

      // Normalize emotions
      const emotionCount = symbolArticles.length;
      Object.keys(emotions).forEach(key => {
        emotions[key as keyof typeof emotions] /= emotionCount;
      });

      // Extract unique keywords
      const uniqueKeywords = [...new Set(allKeywords)].slice(0, 10);

      return {
        score: Math.max(-1, Math.min(1, avgScore)),
        confidence: Math.max(0, Math.min(1, avgConfidence)),
        keywords: uniqueKeywords,
        emotions
      };

    } catch (error) {
      console.error('❌ [AdvancedSentiment] Text sentiment error:', error);
      return {
        score: 0,
        confidence: 0.2,
        keywords: [],
        emotions: { fear: 0, greed: 0, optimism: 0, pessimism: 0 }
      };
    }
  }

  /**
   * Phân tích sentiment từ text với thuật toán nâng cao
   */
  private analyzeSentimentAdvanced(text: string) {
    const lowerText = text.toLowerCase();
    
    // Sentiment keywords với weights
    const positiveWords = {
      'bullish': 0.8, 'pump': 0.7, 'moon': 0.9, 'surge': 0.8, 'rally': 0.7,
      'breakout': 0.6, 'support': 0.5, 'buy': 0.6, 'long': 0.5, 'hodl': 0.6,
      'adoption': 0.7, 'partnership': 0.6, 'upgrade': 0.6, 'innovation': 0.5
    };

    const negativeWords = {
      'bearish': -0.8, 'dump': -0.7, 'crash': -0.9, 'drop': -0.6, 'fall': -0.5,
      'resistance': -0.4, 'sell': -0.6, 'short': -0.5, 'fud': -0.8, 'scam': -0.9,
      'hack': -0.9, 'regulation': -0.6, 'ban': -0.8, 'bubble': -0.7
    };

    // Emotion keywords
    const fearWords = ['fear', 'panic', 'crash', 'dump', 'liquidation', 'margin call'];
    const greedWords = ['fomo', 'moon', 'lambo', 'diamond hands', 'to the moon'];
    const optimismWords = ['bullish', 'pump', 'rally', 'breakout', 'adoption'];
    const pessimismWords = ['bearish', 'dump', 'crash', 'bubble', 'correction'];

    let score = 0;
    let confidence = 0.5;
    const foundKeywords: string[] = [];

    // Calculate sentiment score
    Object.entries(positiveWords).forEach(([word, weight]) => {
      if (lowerText.includes(word)) {
        score += weight;
        confidence += 0.1;
        foundKeywords.push(word);
      }
    });

    Object.entries(negativeWords).forEach(([word, weight]) => {
      if (lowerText.includes(word)) {
        score += weight;
        confidence += 0.1;
        foundKeywords.push(word);
      }
    });

    // Calculate emotions
    const emotions = {
      fear: fearWords.filter(word => lowerText.includes(word)).length / fearWords.length,
      greed: greedWords.filter(word => lowerText.includes(word)).length / greedWords.length,
      optimism: optimismWords.filter(word => lowerText.includes(word)).length / optimismWords.length,
      pessimism: pessimismWords.filter(word => lowerText.includes(word)).length / pessimismWords.length
    };

    return {
      score: Math.max(-1, Math.min(1, score)),
      confidence: Math.max(0.2, Math.min(1, confidence)),
      keywords: foundKeywords,
      emotions
    };
  }

  /**
   * Phân tích social metrics (mô phỏng)
   */
  private async analyzeSocialMetrics(symbol: string) {
    // Mô phỏng social metrics - trong thực tế sẽ integrate với Twitter API, Reddit API, etc.
    const baseMetrics = {
      mentionVolume: Math.random() * 1000,
      engagementRate: Math.random() * 0.1,
      influencerSentiment: (Math.random() - 0.5) * 2,
      trendingScore: Math.random() * 100
    };

    // Adjust based on symbol popularity
    const popularSymbols = ['BTC', 'ETH', 'BNB', 'SOL', 'ADA'];
    const multiplier = popularSymbols.includes(symbol.replace('USDT', '')) ? 2 : 1;

    return {
      mentionVolume: baseMetrics.mentionVolume * multiplier,
      engagementRate: baseMetrics.engagementRate * multiplier,
      influencerSentiment: baseMetrics.influencerSentiment,
      trendingScore: baseMetrics.trendingScore * multiplier
    };
  }

  /**
   * Phân tích sentiment từ price action
   */
  private async analyzePriceActionSentiment(symbol: string) {
    try {
      // Lấy market data từ API hiện có
      const response = await fetch(`/api/market-data/enhanced?action=get_crypto_data&symbol=${symbol}`);
      const data = await response.json();

      if (!data.success || !data.data) {
        throw new Error('Failed to fetch market data');
      }

      const marketData = data.data;
      const change24h = marketData.change24h || 0;
      const volume = marketData.volume || 0;

      // Calculate momentum
      const momentum = Math.max(-1, Math.min(1, change24h / 10)); // Normalize to -1 to 1

      // Calculate volatility (simplified)
      const volatility = Math.abs(change24h) / 100;

      // Volume profile (high volume = more conviction)
      const volumeProfile = Math.min(1, volume / 1000000000); // Normalize to billions

      // Technical bias based on price change
      let technicalBias: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (change24h > 5) technicalBias = 'bullish';
      else if (change24h < -5) technicalBias = 'bearish';

      return {
        momentum,
        volatility,
        volumeProfile,
        technicalBias
      };

    } catch (error) {
      console.error('❌ [AdvancedSentiment] Price action sentiment error:', error);
      return {
        momentum: 0,
        volatility: 0.5,
        volumeProfile: 0.5,
        technicalBias: 'neutral' as const
      };
    }
  }

  /**
   * Tính toán Fear & Greed Index
   */
  private async calculateFearGreedIndex(symbol: string) {
    try {
      // Simplified Fear & Greed calculation
      // Trong thực tế sẽ integrate với Alternative.me API hoặc tự tính

      const components = {
        volatility: Math.random() * 25, // 0-25 points
        marketMomentum: Math.random() * 25, // 0-25 points  
        socialVolume: Math.random() * 15, // 0-15 points
        surveys: Math.random() * 15, // 0-15 points
        dominance: Math.random() * 10 // 0-10 points
      };

      const value = Object.values(components).reduce((sum, val) => sum + val, 0);

      let level: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
      if (value <= 25) level = 'extreme_fear';
      else if (value <= 45) level = 'fear';
      else if (value <= 55) level = 'neutral';
      else if (value <= 75) level = 'greed';
      else level = 'extreme_greed';

      return {
        value: Math.round(value),
        level,
        components
      };

    } catch (error) {
      console.error('❌ [AdvancedSentiment] Fear & Greed calculation error:', error);
      return {
        value: 50,
        level: 'neutral' as const,
        components: {
          volatility: 12.5,
          marketMomentum: 12.5,
          socialVolume: 7.5,
          surveys: 7.5,
          dominance: 5
        }
      };
    }
  }

  /**
   * Kết hợp tất cả sentiment thành overall sentiment
   */
  private combineMultiModalSentiments(
    textSentiment: any,
    socialMetrics: any,
    priceActionSentiment: any,
    fearGreedIndex: any
  ) {
    // Weighted combination
    const weights = {
      text: 0.3,
      social: 0.2,
      priceAction: 0.3,
      fearGreed: 0.2
    };

    // Normalize fear & greed to -1 to 1 scale
    const normalizedFearGreed = (fearGreedIndex.value - 50) / 50;

    // Calculate weighted score
    const score = 
      textSentiment.score * weights.text +
      (socialMetrics.influencerSentiment * 0.5) * weights.social +
      priceActionSentiment.momentum * weights.priceAction +
      normalizedFearGreed * weights.fearGreed;

    // Calculate confidence
    const confidence = (
      textSentiment.confidence * weights.text +
      0.7 * weights.social + // Social metrics confidence
      0.8 * weights.priceAction + // Price action confidence
      0.6 * weights.fearGreed // Fear & greed confidence
    );

    // Determine trend
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (score > 0.2) trend = 'improving';
    else if (score < -0.2) trend = 'declining';

    // Generate signals
    const signals: string[] = [];
    if (textSentiment.score > 0.5) signals.push('Positive news sentiment');
    if (textSentiment.score < -0.5) signals.push('Negative news sentiment');
    if (priceActionSentiment.momentum > 0.3) signals.push('Strong price momentum');
    if (fearGreedIndex.level === 'extreme_fear') signals.push('Extreme fear - potential buying opportunity');
    if (fearGreedIndex.level === 'extreme_greed') signals.push('Extreme greed - potential selling opportunity');

    return {
      score: Math.max(-1, Math.min(1, score)),
      confidence: Math.max(0, Math.min(1, confidence)),
      trend,
      signals
    };
  }

  /**
   * Track sentiment trends over time
   */
  async trackSentimentTrends(symbol: string, timeWindow: string = '24h'): Promise<SentimentTrend> {
    console.log(`📈 [AdvancedSentiment] Tracking sentiment trends for ${symbol} (${timeWindow})`);

    try {
      // Mô phỏng historical sentiment data
      // Trong thực tế sẽ lưu vào database và query
      const dataPoints = [];
      const now = new Date();
      const hours = timeWindow === '24h' ? 24 : timeWindow === '7d' ? 168 : 24;

      for (let i = hours; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
        const sentiment = (Math.random() - 0.5) * 2; // -1 to 1
        const volume = Math.random() * 1000;
        const confidence = 0.5 + Math.random() * 0.5;

        dataPoints.push({
          timestamp,
          sentiment,
          volume,
          confidence
        });
      }

      // Calculate trend metrics
      const sentiments = dataPoints.map(dp => dp.sentiment);
      const momentum = this.calculateMomentum(sentiments);
      const volatility = this.calculateVolatility(sentiments);
      
      let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (momentum > 0.2) trend = 'bullish';
      else if (momentum < -0.2) trend = 'bearish';

      const strength = Math.abs(momentum);

      return {
        symbol,
        timeframe: timeWindow,
        dataPoints,
        momentum,
        volatility,
        trend,
        strength
      };

    } catch (error) {
      console.error(`❌ [AdvancedSentiment] Error tracking trends for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Calculate momentum from sentiment array
   */
  private calculateMomentum(sentiments: number[]): number {
    if (sentiments.length < 2) return 0;

    const recent = sentiments.slice(-Math.floor(sentiments.length / 3));
    const earlier = sentiments.slice(0, Math.floor(sentiments.length / 3));

    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, val) => sum + val, 0) / earlier.length;

    return recentAvg - earlierAvg;
  }

  /**
   * Calculate volatility from sentiment array
   */
  private calculateVolatility(sentiments: number[]): number {
    if (sentiments.length < 2) return 0;

    const mean = sentiments.reduce((sum, val) => sum + val, 0) / sentiments.length;
    const variance = sentiments.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / sentiments.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Clear cache (for testing or manual refresh)
   */
  clearCache(): void {
    this.sentimentCache.clear();
    console.log('🧹 [AdvancedSentiment] Cache cleared');
  }
}

// Export singleton instance
export const advancedSentimentAnalyzer = new AdvancedSentimentAnalyzer(); 