import { z } from 'zod';

/**
 * Advanced AI Tools for Yinsen Workspace Integration
 * Bổ sung thêm AI capabilities mà không thay thế workspace tools hiện có
 */

// ===== SCHEMAS =====

const advancedSentimentAnalysisSchema = z.object({
  symbol: z.string().describe('Symbol crypto để phân tích sentiment'),
  includeEmotions: z.boolean().optional().default(true).describe('Bao gồm phân tích cảm xúc'),
  includeTrends: z.boolean().optional().default(false).describe('Bao gồm phân tích xu hướng sentiment')
});

const anomalyDetectionSchema = z.object({
  symbol: z.string().describe('Symbol crypto để phát hiện bất thường'),
  metrics: z.array(z.enum(['price', 'volume', 'sentiment'])).optional().default(['price', 'volume']).describe('Các metrics để phân tích'),
  sensitivity: z.enum(['low', 'medium', 'high']).optional().default('medium').describe('Độ nhạy phát hiện bất thường')
});

const smartAlertSetupSchema = z.object({
  symbols: z.array(z.string()).describe('Danh sách symbols để theo dõi'),
  tradingStyle: z.enum(['conservative', 'moderate', 'aggressive', 'scalper']).describe('Phong cách giao dịch'),
  alertTypes: z.array(z.enum(['price', 'volume', 'sentiment', 'anomaly'])).optional().default(['price', 'anomaly']).describe('Loại cảnh báo')
});

const batchAnalysisSchema = z.object({
  symbols: z.array(z.string()).describe('Danh sách symbols để phân tích'),
  analysisType: z.enum(['sentiment', 'anomaly', 'both']).describe('Loại phân tích'),
  includeRecommendations: z.boolean().optional().default(true).describe('Bao gồm khuyến nghị')
});

// ===== OUTPUT SCHEMAS =====

const advancedAIOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.any().optional(),
  recommendations: z.array(z.string()).optional(),
  confidence: z.number().optional(),
  timestamp: z.string()
});

// ===== TOOLS =====

export const advancedSentimentAnalysisTool = {
  schema: {
    name: 'advanced_sentiment_analysis',
    description: 'Phân tích sentiment đa chiều với AI nâng cao cho crypto',
    parameters: advancedSentimentAnalysisSchema,
    returnType: advancedAIOutputSchema,
  },
  execute: async (input: z.infer<typeof advancedSentimentAnalysisSchema>) => {
    try {
      console.log(`🧠 [AdvancedAI-Tools] Advanced sentiment analysis for ${input.symbol}`);
      
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
      const response = await fetch(`${baseUrl}/api/ai/advanced-sentiment?symbol=${input.symbol}&action=analyze`);
      const result = await response.json();

      if (!result.success) {
        return {
          success: false,
          message: `❌ Không thể phân tích sentiment cho ${input.symbol}: ${result.error}`,
          timestamp: new Date().toISOString()
        };
      }

      const sentiment = result.data;
      let message = `🧠 **Phân tích Sentiment Nâng cao cho ${input.symbol}**\n\n`;

      // Overall sentiment
      const overallScore = sentiment.overallSentiment.score;
      const overallTrend = sentiment.overallSentiment.trend;
      const confidence = sentiment.overallSentiment.confidence;

      message += `📊 **Tổng quan Sentiment:**\n`;
      message += `- Điểm số: ${overallScore.toFixed(2)} (${overallScore > 0.3 ? '🟢 Tích cực' : overallScore < -0.3 ? '🔴 Tiêu cực' : '⚪ Trung tính'})\n`;
      message += `- Xu hướng: ${overallTrend === 'improving' ? '📈 Cải thiện' : overallTrend === 'declining' ? '📉 Suy giảm' : '➡️ Ổn định'}\n`;
      message += `- Độ tin cậy: ${(confidence * 100).toFixed(0)}%\n\n`;

      // Text sentiment
      message += `📰 **Sentiment từ Tin tức:**\n`;
      message += `- Điểm số: ${sentiment.textSentiment.score.toFixed(2)}\n`;
      message += `- Keywords: ${sentiment.textSentiment.keywords.slice(0, 5).join(', ')}\n\n`;

      // Fear & Greed Index
      message += `😨😍 **Chỉ số Fear & Greed:**\n`;
      message += `- Giá trị: ${sentiment.fearGreedIndex.value}/100\n`;
      message += `- Mức độ: ${sentiment.fearGreedIndex.level.replace('_', ' ').toUpperCase()}\n\n`;

      // Price action sentiment
      message += `💹 **Sentiment từ Price Action:**\n`;
      message += `- Momentum: ${sentiment.priceActionSentiment.momentum.toFixed(2)}\n`;
      message += `- Technical Bias: ${sentiment.priceActionSentiment.technicalBias.toUpperCase()}\n\n`;

      // Emotions (if requested)
      if (input.includeEmotions) {
        const emotions = sentiment.textSentiment.emotions;
        message += `🎭 **Phân tích Cảm xúc:**\n`;
        message += `- Fear: ${(emotions.fear * 100).toFixed(0)}%\n`;
        message += `- Greed: ${(emotions.greed * 100).toFixed(0)}%\n`;
        message += `- Optimism: ${(emotions.optimism * 100).toFixed(0)}%\n`;
        message += `- Pessimism: ${(emotions.pessimism * 100).toFixed(0)}%\n\n`;
      }

      // Signals
      if (sentiment.overallSentiment.signals.length > 0) {
        message += `🎯 **Tín hiệu:**\n`;
        sentiment.overallSentiment.signals.forEach((signal: string) => {
          message += `- ${signal}\n`;
        });
        message += '\n';
      }

      // Get trends if requested
      if (input.includeTrends) {
        const trendsResponse = await fetch(`${baseUrl}/api/ai/advanced-sentiment?symbol=${input.symbol}&action=trends&timeWindow=24h`);
        const trendsResult = await trendsResponse.json();
        
        if (trendsResult.success) {
          const trends = trendsResult.data;
          message += `📈 **Xu hướng Sentiment (24h):**\n`;
          message += `- Momentum: ${trends.momentum.toFixed(3)}\n`;
          message += `- Volatility: ${trends.volatility.toFixed(3)}\n`;
          message += `- Trend: ${trends.trend.toUpperCase()}\n`;
          message += `- Strength: ${(trends.strength * 100).toFixed(0)}%\n\n`;
        }
      }

      // Generate recommendations
      const recommendations = [];
      if (overallScore > 0.5 && confidence > 0.7) {
        recommendations.push('Sentiment rất tích cực - cân nhắc mua vào');
      } else if (overallScore < -0.5 && confidence > 0.7) {
        recommendations.push('Sentiment rất tiêu cực - cân nhắc chốt lời hoặc tránh mua');
      }
      
      if (sentiment.fearGreedIndex.level === 'extreme_fear') {
        recommendations.push('Extreme Fear - có thể là cơ hội mua vào tốt');
      } else if (sentiment.fearGreedIndex.level === 'extreme_greed') {
        recommendations.push('Extreme Greed - cân nhắc chốt lời');
      }

      return {
        success: true,
        message,
        data: sentiment,
        recommendations,
        confidence,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      console.error('❌ [AdvancedAI-Tools] Sentiment analysis error:', error);
      return {
        success: false,
        message: '❌ Lỗi khi phân tích sentiment nâng cao.',
        timestamp: new Date().toISOString()
      };
    }
  }
};

export const anomalyDetectionTool = {
  schema: {
    name: 'anomaly_detection',
    description: 'Phát hiện bất thường trong dữ liệu crypto bằng AI',
    parameters: anomalyDetectionSchema,
    returnType: advancedAIOutputSchema,
  },
  execute: async (input: z.infer<typeof anomalyDetectionSchema>) => {
    try {
      console.log(`🔍 [AdvancedAI-Tools] Anomaly detection for ${input.symbol}`);
      
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
      const metricsParam = input.metrics.join(',');
      const response = await fetch(`${baseUrl}/api/ai/smart-alerts?symbol=${input.symbol}&action=detect_anomalies&metrics=${metricsParam}`);
      const result = await response.json();

      if (!result.success) {
        return {
          success: false,
          message: `❌ Không thể phát hiện bất thường cho ${input.symbol}: ${result.error}`,
          timestamp: new Date().toISOString()
        };
      }

      const anomaly = result.data;
      let message = `🔍 **Phát hiện Bất thường cho ${input.symbol}**\n\n`;

      if (!anomaly.isAnomaly) {
        message += `✅ **Không phát hiện bất thường**\n`;
        message += `- Điểm bất thường: ${(anomaly.anomalyScore * 100).toFixed(0)}%\n`;
        message += `- Độ tin cậy: ${(anomaly.confidence * 100).toFixed(0)}%\n`;
        message += `- Mô tả: ${anomaly.description}\n\n`;
        message += `📊 Tất cả metrics đang hoạt động trong phạm vi bình thường.`;
      } else {
        const severity = anomaly.anomalyScore > 0.8 ? '🚨 NGHIÊM TRỌNG' : 
                        anomaly.anomalyScore > 0.6 ? '⚠️ CAO' : 
                        anomaly.anomalyScore > 0.4 ? '🟡 TRUNG BÌNH' : '🟢 THẤP';

        message += `🚨 **BẤT THƯỜNG PHÁT HIỆN** - Mức độ: ${severity}\n\n`;
        message += `📊 **Chi tiết:**\n`;
        message += `- Loại bất thường: ${anomaly.anomalyType.replace('_', ' ').toUpperCase()}\n`;
        message += `- Điểm bất thường: ${(anomaly.anomalyScore * 100).toFixed(0)}%\n`;
        message += `- Độ tin cậy: ${(anomaly.confidence * 100).toFixed(0)}%\n`;
        message += `- Mô tả: ${anomaly.description}\n\n`;

        // Historical context
        if (anomaly.historicalContext) {
          message += `📈 **Bối cảnh Lịch sử:**\n`;
          message += `- Sự kiện tương tự: ${anomaly.historicalContext.similarEvents} lần\n`;
          message += `- Tác động trung bình: ${anomaly.historicalContext.averageImpact.toFixed(1)}%\n`;
          message += `- Thời gian phục hồi: ${anomaly.historicalContext.recoveryTime}\n\n`;
        }
      }

      // Generate recommendations based on anomaly
      const recommendations = [];
      if (anomaly.isAnomaly) {
        switch (anomaly.anomalyType) {
          case 'price_spike':
            if (anomaly.anomalyScore > 0.7) {
              recommendations.push('Biến động giá bất thường - cân nhắc chốt lời nếu đang hold');
              recommendations.push('Chờ xác nhận trước khi vào lệnh mới');
            }
            break;
          case 'volume_surge':
            recommendations.push('Khối lượng bất thường - theo dõi breakout/breakdown');
            recommendations.push('Kiểm tra tin tức để tìm nguyên nhân');
            break;
          case 'sentiment_shift':
            recommendations.push('Sentiment thay đổi đột ngột - xem xét điều chỉnh chiến lược');
            recommendations.push('Có thể sử dụng như tín hiệu contrarian');
            break;
        }
        recommendations.push('Luôn xác minh với nhiều nguồn trước khi quyết định');
      } else {
        recommendations.push('Thị trường đang hoạt động bình thường');
        recommendations.push('Có thể tiếp tục theo chiến lược hiện tại');
      }

      return {
        success: true,
        message,
        data: anomaly,
        recommendations,
        confidence: anomaly.confidence,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      console.error('❌ [AdvancedAI-Tools] Anomaly detection error:', error);
      return {
        success: false,
        message: '❌ Lỗi khi phát hiện bất thường.',
        timestamp: new Date().toISOString()
      };
    }
  }
};

export const smartAlertSetupTool = {
  schema: {
    name: 'smart_alert_setup',
    description: 'Thiết lập hệ thống cảnh báo thông minh với AI',
    parameters: smartAlertSetupSchema,
    returnType: advancedAIOutputSchema,
  },
  execute: async (input: z.infer<typeof smartAlertSetupSchema>) => {
    try {
      console.log(`🔔 [AdvancedAI-Tools] Setting up smart alerts for ${input.symbols.length} symbols`);
      
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
      
      // Optimize thresholds based on trading style
      const thresholdsResponse = await fetch(`${baseUrl}/api/ai/smart-alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'optimize_thresholds',
          userId: 'default',
          tradingStyle: input.tradingStyle
        })
      });

      const thresholdsResult = await thresholdsResponse.json();
      
      if (!thresholdsResult.success) {
        return {
          success: false,
          message: `❌ Không thể tối ưu ngưỡng cảnh báo: ${thresholdsResult.error}`,
          timestamp: new Date().toISOString()
        };
      }

      // Start monitoring
      const monitoringResponse = await fetch(`${baseUrl}/api/ai/smart-alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_monitoring',
          symbols: input.symbols,
          intervalMs: 60000 // 1 minute
        })
      });

      const monitoringResult = await monitoringResponse.json();

      let message = `🔔 **Thiết lập Cảnh báo Thông minh**\n\n`;
      message += `✅ **Đã thiết lập thành công:**\n`;
      message += `- Symbols theo dõi: ${input.symbols.join(', ')}\n`;
      message += `- Phong cách giao dịch: ${input.tradingStyle.toUpperCase()}\n`;
      message += `- Loại cảnh báo: ${input.alertTypes.join(', ')}\n`;
      message += `- Tần suất kiểm tra: Mỗi 1 phút\n\n`;

      // Show optimized thresholds
      const thresholds = thresholdsResult.data;
      message += `🎯 **Ngưỡng Cảnh báo Tối ưu:**\n`;
      for (const symbol of input.symbols) {
        if (thresholds[symbol]) {
          message += `- ${symbol}:\n`;
          message += `  • Thay đổi giá: ±${thresholds[symbol].priceChange}%\n`;
          message += `  • Thay đổi volume: ${thresholds[symbol].volumeChange}x\n`;
          message += `  • Thay đổi sentiment: ±${thresholds[symbol].sentimentChange}\n`;
        }
      }
      message += '\n';

      message += `🤖 **AI sẽ tự động:**\n`;
      message += `- Phát hiện bất thường trong price, volume, sentiment\n`;
      message += `- Gửi cảnh báo qua chat khi có anomaly\n`;
      message += `- Đưa ra khuyến nghị hành động\n`;
      message += `- Điều chỉnh ngưỡng dựa trên hành vi người dùng\n\n`;

      const recommendations = [
        'Hệ thống đã được thiết lập và đang hoạt động',
        'Bạn sẽ nhận được cảnh báo khi có bất thường',
        'Có thể điều chỉnh ngưỡng bằng cách thay đổi trading style',
        'Kiểm tra tab Alerts để xem lịch sử cảnh báo'
      ];

      return {
        success: true,
        message,
        data: {
          symbols: input.symbols,
          thresholds: thresholds,
          monitoring: monitoringResult.success
        },
        recommendations,
        confidence: 0.9,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      console.error('❌ [AdvancedAI-Tools] Smart alert setup error:', error);
      return {
        success: false,
        message: '❌ Lỗi khi thiết lập cảnh báo thông minh.',
        timestamp: new Date().toISOString()
      };
    }
  }
};

export const batchAnalysisTool = {
  schema: {
    name: 'batch_analysis',
    description: 'Phân tích hàng loạt nhiều crypto với AI',
    parameters: batchAnalysisSchema,
    returnType: advancedAIOutputSchema,
  },
  execute: async (input: z.infer<typeof batchAnalysisSchema>) => {
    try {
      console.log(`📊 [AdvancedAI-Tools] Batch analysis for ${input.symbols.length} symbols`);
      
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
      const results = [];

      // Parallel analysis
      if (input.analysisType === 'sentiment' || input.analysisType === 'both') {
        const sentimentResponse = await fetch(`${baseUrl}/api/ai/advanced-sentiment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'batch_analyze',
            symbols: input.symbols
          })
        });
        const sentimentResult = await sentimentResponse.json();
        if (sentimentResult.success) {
          results.push({ type: 'sentiment', data: sentimentResult.data });
        }
      }

      if (input.analysisType === 'anomaly' || input.analysisType === 'both') {
        const anomalyResponse = await fetch(`${baseUrl}/api/ai/smart-alerts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'batch_detect_anomalies',
            symbols: input.symbols,
            metrics: ['price', 'volume', 'sentiment']
          })
        });
        const anomalyResult = await anomalyResponse.json();
        if (anomalyResult.success) {
          results.push({ type: 'anomaly', data: anomalyResult.data });
        }
      }

      let message = `📊 **Phân tích Hàng loạt ${input.symbols.length} Symbols**\n\n`;

      // Process sentiment results
      const sentimentData = results.find(r => r.type === 'sentiment')?.data;
      if (sentimentData) {
        message += `🧠 **Kết quả Sentiment Analysis:**\n`;
        sentimentData.forEach((item: any) => {
          if (item.success) {
            const score = item.sentiment.overallSentiment.score;
            const emoji = score > 0.3 ? '🟢' : score < -0.3 ? '🔴' : '⚪';
            message += `${emoji} ${item.symbol}: ${score.toFixed(2)} (${item.sentiment.overallSentiment.trend})\n`;
          } else {
            message += `❌ ${item.symbol}: Error\n`;
          }
        });
        message += '\n';
      }

      // Process anomaly results
      const anomalyData = results.find(r => r.type === 'anomaly')?.data;
      if (anomalyData) {
        message += `🔍 **Kết quả Anomaly Detection:**\n`;
        anomalyData.forEach((item: any) => {
          if (item.success) {
            const isAnomaly = item.anomaly.isAnomaly;
            const score = item.anomaly.anomalyScore;
            const emoji = isAnomaly ? (score > 0.7 ? '🚨' : '⚠️') : '✅';
            message += `${emoji} ${item.symbol}: ${isAnomaly ? 'ANOMALY' : 'Normal'} (${(score * 100).toFixed(0)}%)\n`;
          } else {
            message += `❌ ${item.symbol}: Error\n`;
          }
        });
        message += '\n';
      }

      // Generate recommendations if requested
      const recommendations = [];
      if (input.includeRecommendations) {
        // Sentiment-based recommendations
        if (sentimentData) {
          const positiveSymbols = sentimentData.filter((item: any) => 
            item.success && item.sentiment.overallSentiment.score > 0.5
          ).map((item: any) => item.symbol);
          
          const negativeSymbols = sentimentData.filter((item: any) => 
            item.success && item.sentiment.overallSentiment.score < -0.5
          ).map((item: any) => item.symbol);

          if (positiveSymbols.length > 0) {
            recommendations.push(`Sentiment tích cực: ${positiveSymbols.join(', ')} - cân nhắc mua vào`);
          }
          if (negativeSymbols.length > 0) {
            recommendations.push(`Sentiment tiêu cực: ${negativeSymbols.join(', ')} - cân nhắc tránh hoặc chốt lời`);
          }
        }

        // Anomaly-based recommendations
        if (anomalyData) {
          const anomalySymbols = anomalyData.filter((item: any) => 
            item.success && item.anomaly.isAnomaly && item.anomaly.anomalyScore > 0.6
          ).map((item: any) => item.symbol);

          if (anomalySymbols.length > 0) {
            recommendations.push(`Phát hiện bất thường: ${anomalySymbols.join(', ')} - cần theo dõi sát`);
          }
        }

        if (recommendations.length === 0) {
          recommendations.push('Tất cả symbols đang hoạt động bình thường');
        }
      }

      message += `📈 **Tổng kết:**\n`;
      message += `- Đã phân tích: ${input.symbols.length} symbols\n`;
      message += `- Loại phân tích: ${input.analysisType.toUpperCase()}\n`;
      message += `- Thời gian: ${new Date().toLocaleTimeString('vi-VN')}\n`;

      return {
        success: true,
        message,
        data: results,
        recommendations,
        confidence: 0.85,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      console.error('❌ [AdvancedAI-Tools] Batch analysis error:', error);
      return {
        success: false,
        message: '❌ Lỗi khi thực hiện phân tích hàng loạt.',
        timestamp: new Date().toISOString()
      };
    }
  }
};

// Export all tools
export const advancedAITools = {
  advancedSentimentAnalysisTool,
  anomalyDetectionTool,
  smartAlertSetupTool,
  batchAnalysisTool
}; 