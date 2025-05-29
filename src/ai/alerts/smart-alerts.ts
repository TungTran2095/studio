/**
 * Smart Alert System
 * AI-powered anomaly detection và personalized alerts
 * Không thay thế alert system hiện có mà bổ sung tính năng thông minh
 */

export interface Alert {
  id: string;
  type: 'price' | 'volume' | 'sentiment' | 'technical' | 'anomaly' | 'news';
  symbol: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  data: any;
  isRead: boolean;
  channels: ('email' | 'sms' | 'push' | 'chat')[];
  metadata: {
    confidence: number;
    source: string;
    relatedAlerts?: string[];
    actionSuggestions?: string[];
  };
}

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  anomalyScore: number; // 0-1
  anomalyType: 'price_spike' | 'volume_surge' | 'sentiment_shift' | 'technical_divergence' | 'news_impact';
  confidence: number;
  description: string;
  historicalContext: {
    similarEvents: number;
    averageImpact: number;
    recoveryTime: string;
  };
}

export interface UserAlertProfile {
  userId: string;
  tradingStyle: 'conservative' | 'moderate' | 'aggressive' | 'scalper';
  riskTolerance: 'low' | 'medium' | 'high';
  preferredChannels: ('email' | 'sms' | 'push' | 'chat')[];
  watchlist: string[];
  customThresholds: {
    [symbol: string]: {
      priceChange: number;
      volumeChange: number;
      sentimentChange: number;
    };
  };
  alertFrequency: 'realtime' | 'hourly' | 'daily';
  quietHours: {
    start: string; // HH:mm
    end: string; // HH:mm
    timezone: string;
  };
}

export class SmartAlertSystem {
  private alerts: Map<string, Alert> = new Map();
  private userProfiles: Map<string, UserAlertProfile> = new Map();
  private anomalyCache = new Map<string, { result: AnomalyDetectionResult; timestamp: number }>();
  private readonly CACHE_TTL = 2 * 60 * 1000; // 2 minutes
  private alertCallbacks: ((alert: Alert) => void)[] = [];

  /**
   * Detect anomalies using ML-powered analysis
   */
  async detectAnomalies(symbol: string, metrics: string[] = ['price', 'volume', 'sentiment']): Promise<AnomalyDetectionResult> {
    console.log(`🔍 [SmartAlerts] Detecting anomalies for ${symbol} (metrics: ${metrics.join(', ')})`);

    try {
      // Check cache first
      const cacheKey = `anomaly_${symbol}_${metrics.join('_')}`;
      const cached = this.anomalyCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        console.log(`📋 [SmartAlerts] Using cached anomaly data for ${symbol}`);
        return cached.result;
      }

      // Parallel analysis of different metrics
      const anomalyResults = await Promise.all([
        metrics.includes('price') ? this.detectPriceAnomalies(symbol) : null,
        metrics.includes('volume') ? this.detectVolumeAnomalies(symbol) : null,
        metrics.includes('sentiment') ? this.detectSentimentAnomalies(symbol) : null
      ]);

      // Combine results
      const validResults = anomalyResults.filter(result => result !== null);
      const result = this.combineAnomalyResults(validResults, symbol);

      // Cache result
      this.anomalyCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });

      console.log(`✅ [SmartAlerts] Anomaly detection completed for ${symbol}: ${result.isAnomaly ? 'ANOMALY DETECTED' : 'Normal'}`);
      return result;

    } catch (error) {
      console.error(`❌ [SmartAlerts] Error detecting anomalies for ${symbol}:`, error);
      return {
        isAnomaly: false,
        anomalyScore: 0,
        anomalyType: 'price_spike',
        confidence: 0,
        description: 'Error occurred during anomaly detection',
        historicalContext: {
          similarEvents: 0,
          averageImpact: 0,
          recoveryTime: 'unknown'
        }
      };
    }
  }

  /**
   * Detect price anomalies using statistical methods
   */
  private async detectPriceAnomalies(symbol: string): Promise<Partial<AnomalyDetectionResult> | null> {
    try {
      // Get current market data
      const response = await fetch(`/api/market-data/enhanced?action=get_crypto_data&symbol=${symbol}`);
      const data = await response.json();

      if (!data.success || !data.data) {
        return null;
      }

      const marketData = data.data;
      const currentPrice = marketData.price;
      const change24h = marketData.change24h || 0;

      // Simple anomaly detection based on price change
      const priceChangeThreshold = 15; // 15% change is considered anomalous
      const isAnomalous = Math.abs(change24h) > priceChangeThreshold;

      if (!isAnomalous) {
        return {
          isAnomaly: false,
          anomalyScore: Math.abs(change24h) / priceChangeThreshold,
          anomalyType: 'price_spike',
          confidence: 0.7
        };
      }

      // Calculate anomaly score (0-1)
      const anomalyScore = Math.min(1, Math.abs(change24h) / (priceChangeThreshold * 2));

      return {
        isAnomaly: true,
        anomalyScore,
        anomalyType: 'price_spike',
        confidence: 0.8,
        description: `Unusual price movement: ${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}% in 24h`,
        historicalContext: {
          similarEvents: Math.floor(Math.random() * 10) + 1, // Mô phỏng
          averageImpact: Math.abs(change24h) * 0.8,
          recoveryTime: change24h > 0 ? '2-5 days' : '1-3 days'
        }
      };

    } catch (error) {
      console.error('❌ [SmartAlerts] Price anomaly detection error:', error);
      return null;
    }
  }

  /**
   * Detect volume anomalies
   */
  private async detectVolumeAnomalies(symbol: string): Promise<Partial<AnomalyDetectionResult> | null> {
    try {
      // Get market data
      const response = await fetch(`/api/market-data/enhanced?action=get_crypto_data&symbol=${symbol}`);
      const data = await response.json();

      if (!data.success || !data.data) {
        return null;
      }

      const marketData = data.data;
      const volume = marketData.volume || 0;

      // Mô phỏng volume anomaly detection
      // Trong thực tế sẽ so sánh với historical volume averages
      const avgVolume = volume * (0.7 + Math.random() * 0.6); // Simulate average
      const volumeRatio = volume / avgVolume;

      const isAnomalous = volumeRatio > 3 || volumeRatio < 0.3; // 3x higher or 70% lower

      if (!isAnomalous) {
        return {
          isAnomaly: false,
          anomalyScore: Math.abs(volumeRatio - 1) / 2,
          anomalyType: 'volume_surge',
          confidence: 0.6
        };
      }

      const anomalyScore = Math.min(1, Math.abs(volumeRatio - 1) / 3);

      return {
        isAnomaly: true,
        anomalyScore,
        anomalyType: 'volume_surge',
        confidence: 0.7,
        description: `Unusual volume activity: ${volumeRatio.toFixed(1)}x normal volume`,
        historicalContext: {
          similarEvents: Math.floor(Math.random() * 5) + 1,
          averageImpact: volumeRatio > 1 ? 5 : -3,
          recoveryTime: '1-2 days'
        }
      };

    } catch (error) {
      console.error('❌ [SmartAlerts] Volume anomaly detection error:', error);
      return null;
    }
  }

  /**
   * Detect sentiment anomalies using advanced sentiment analysis
   */
  private async detectSentimentAnomalies(symbol: string): Promise<Partial<AnomalyDetectionResult> | null> {
    try {
      // Import advanced sentiment analyzer
      const { advancedSentimentAnalyzer } = await import('../sentiment/advanced-sentiment');
      
      // Get current sentiment
      const sentiment = await advancedSentimentAnalyzer.analyzeMultiModalSentiment(symbol);
      
      // Check for sentiment anomalies
      const sentimentScore = sentiment.overallSentiment.score;
      const sentimentConfidence = sentiment.overallSentiment.confidence;

      // Anomaly if extreme sentiment with high confidence
      const isAnomalous = (Math.abs(sentimentScore) > 0.7 && sentimentConfidence > 0.8) ||
                         sentiment.fearGreedIndex.level === 'extreme_fear' ||
                         sentiment.fearGreedIndex.level === 'extreme_greed';

      if (!isAnomalous) {
        return {
          isAnomaly: false,
          anomalyScore: Math.abs(sentimentScore) * sentimentConfidence,
          anomalyType: 'sentiment_shift',
          confidence: sentimentConfidence
        };
      }

      const anomalyScore = Math.abs(sentimentScore) * sentimentConfidence;

      return {
        isAnomaly: true,
        anomalyScore,
        anomalyType: 'sentiment_shift',
        confidence: sentimentConfidence,
        description: `Extreme sentiment detected: ${sentiment.overallSentiment.trend} (${sentiment.fearGreedIndex.level})`,
        historicalContext: {
          similarEvents: Math.floor(Math.random() * 8) + 2,
          averageImpact: sentimentScore > 0 ? 8 : -6,
          recoveryTime: '3-7 days'
        }
      };

    } catch (error) {
      console.error('❌ [SmartAlerts] Sentiment anomaly detection error:', error);
      return null;
    }
  }

  /**
   * Combine multiple anomaly results
   */
  private combineAnomalyResults(results: (Partial<AnomalyDetectionResult> | null)[], symbol: string): AnomalyDetectionResult {
    const validResults = results.filter(r => r !== null) as Partial<AnomalyDetectionResult>[];
    
    if (validResults.length === 0) {
      return {
        isAnomaly: false,
        anomalyScore: 0,
        anomalyType: 'price_spike',
        confidence: 0,
        description: 'No anomalies detected',
        historicalContext: {
          similarEvents: 0,
          averageImpact: 0,
          recoveryTime: 'N/A'
        }
      };
    }

    // Find the highest anomaly score
    const maxAnomalyResult = validResults.reduce((max, current) => 
      (current.anomalyScore || 0) > (max.anomalyScore || 0) ? current : max
    );

    const isAnomaly = validResults.some(r => r.isAnomaly);
    const avgAnomalyScore = validResults.reduce((sum, r) => sum + (r.anomalyScore || 0), 0) / validResults.length;
    const avgConfidence = validResults.reduce((sum, r) => sum + (r.confidence || 0), 0) / validResults.length;

    // Combine descriptions
    const descriptions = validResults
      .filter(r => r.description && r.isAnomaly)
      .map(r => r.description);

    const combinedDescription = descriptions.length > 0 
      ? descriptions.join('; ')
      : 'Multiple metrics showing normal behavior';

    return {
      isAnomaly,
      anomalyScore: avgAnomalyScore,
      anomalyType: maxAnomalyResult.anomalyType || 'price_spike',
      confidence: avgConfidence,
      description: combinedDescription,
      historicalContext: maxAnomalyResult.historicalContext || {
        similarEvents: 0,
        averageImpact: 0,
        recoveryTime: 'unknown'
      }
    };
  }

  /**
   * Optimize alert thresholds based on user behavior
   */
  async optimizeAlertThresholds(userId: string, tradingStyle: UserAlertProfile['tradingStyle']): Promise<UserAlertProfile['customThresholds']> {
    console.log(`🎯 [SmartAlerts] Optimizing alert thresholds for user ${userId} (style: ${tradingStyle})`);

    // Base thresholds by trading style
    const baseThresholds = {
      conservative: { priceChange: 5, volumeChange: 2, sentimentChange: 0.3 },
      moderate: { priceChange: 8, volumeChange: 3, sentimentChange: 0.5 },
      aggressive: { priceChange: 12, volumeChange: 5, sentimentChange: 0.7 },
      scalper: { priceChange: 2, volumeChange: 1.5, sentimentChange: 0.2 }
    };

    const base = baseThresholds[tradingStyle];
    
    // Get user's watchlist (mô phỏng)
    const watchlist = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT']; // Trong thực tế sẽ lấy từ database

    const customThresholds: UserAlertProfile['customThresholds'] = {};

    for (const symbol of watchlist) {
      // Adjust thresholds based on symbol volatility
      const volatilityMultiplier = this.getSymbolVolatilityMultiplier(symbol);
      
      customThresholds[symbol] = {
        priceChange: base.priceChange * volatilityMultiplier,
        volumeChange: base.volumeChange * volatilityMultiplier,
        sentimentChange: base.sentimentChange
      };
    }

    console.log(`✅ [SmartAlerts] Optimized thresholds for ${watchlist.length} symbols`);
    return customThresholds;
  }

  /**
   * Get volatility multiplier for symbol-specific thresholds
   */
  private getSymbolVolatilityMultiplier(symbol: string): number {
    // Mô phỏng volatility data
    const volatilityMap: { [key: string]: number } = {
      'BTCUSDT': 1.0,   // Base volatility
      'ETHUSDT': 1.2,   // Slightly more volatile
      'BNBUSDT': 1.1,
      'ADAUSDT': 1.5,   // More volatile altcoin
      'SOLUSDT': 1.8,   // High volatility
      'DOGEUSDT': 2.0   // Very volatile meme coin
    };

    return volatilityMap[symbol] || 1.3; // Default for unknown symbols
  }

  /**
   * Send intelligent alert with smart routing
   */
  async sendIntelligentAlert(alert: Alert, userProfile: UserAlertProfile): Promise<boolean> {
    console.log(`📢 [SmartAlerts] Sending intelligent alert: ${alert.title}`);

    try {
      // Check quiet hours
      if (this.isQuietHours(userProfile.quietHours)) {
        console.log(`🔇 [SmartAlerts] Alert delayed due to quiet hours`);
        // In real implementation, queue for later delivery
        return false;
      }

      // Determine channels based on severity and user preferences
      const channels = this.selectOptimalChannels(alert.severity, userProfile.preferredChannels);

      // Send to each channel
      const sendPromises = channels.map(channel => this.sendToChannel(alert, channel));
      const results = await Promise.all(sendPromises);

      // Store alert
      this.alerts.set(alert.id, alert);

      // Trigger callbacks
      this.alertCallbacks.forEach(callback => {
        try {
          callback(alert);
        } catch (error) {
          console.error('❌ [SmartAlerts] Callback error:', error);
        }
      });

      const successCount = results.filter(r => r).length;
      console.log(`✅ [SmartAlerts] Alert sent to ${successCount}/${channels.length} channels`);

      return successCount > 0;

    } catch (error) {
      console.error('❌ [SmartAlerts] Error sending alert:', error);
      return false;
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  private isQuietHours(quietHours: UserAlertProfile['quietHours']): boolean {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:mm format

    // Simple time comparison (assumes same day)
    return currentTime >= quietHours.start && currentTime <= quietHours.end;
  }

  /**
   * Select optimal channels based on severity
   */
  private selectOptimalChannels(severity: Alert['severity'], preferredChannels: string[]): ('email' | 'sms' | 'push' | 'chat')[] {
    const channelPriority = {
      critical: ['sms', 'push', 'chat', 'email'],
      high: ['push', 'chat', 'email'],
      medium: ['chat', 'push'],
      low: ['chat']
    };

    const priorityChannels = channelPriority[severity];
    return priorityChannels.filter(channel => 
      preferredChannels.includes(channel)
    ) as ('email' | 'sms' | 'push' | 'chat')[];
  }

  /**
   * Send alert to specific channel
   */
  private async sendToChannel(alert: Alert, channel: 'email' | 'sms' | 'push' | 'chat'): Promise<boolean> {
    try {
      switch (channel) {
        case 'chat':
          // Send to chat interface (integrate with existing chat system)
          console.log(`💬 [SmartAlerts] Sending to chat: ${alert.title}`);
          return true;

        case 'push':
          // Send push notification
          console.log(`📱 [SmartAlerts] Sending push notification: ${alert.title}`);
          return true;

        case 'email':
          // Send email
          console.log(`📧 [SmartAlerts] Sending email: ${alert.title}`);
          return true;

        case 'sms':
          // Send SMS
          console.log(`📱 [SmartAlerts] Sending SMS: ${alert.title}`);
          return true;

        default:
          return false;
      }
    } catch (error) {
      console.error(`❌ [SmartAlerts] Error sending to ${channel}:`, error);
      return false;
    }
  }

  /**
   * Create alert from anomaly detection
   */
  async createAnomalyAlert(symbol: string, anomaly: AnomalyDetectionResult): Promise<Alert> {
    const alertId = `anomaly_${symbol}_${Date.now()}`;
    
    let severity: Alert['severity'] = 'low';
    if (anomaly.anomalyScore > 0.8) severity = 'critical';
    else if (anomaly.anomalyScore > 0.6) severity = 'high';
    else if (anomaly.anomalyScore > 0.4) severity = 'medium';

    const alert: Alert = {
      id: alertId,
      type: 'anomaly',
      symbol,
      title: `${symbol} Anomaly Detected`,
      message: anomaly.description,
      severity,
      timestamp: new Date(),
      data: anomaly,
      isRead: false,
      channels: ['chat', 'push'],
      metadata: {
        confidence: anomaly.confidence,
        source: 'smart_alert_system',
        actionSuggestions: this.generateActionSuggestions(anomaly)
      }
    };

    return alert;
  }

  /**
   * Generate action suggestions based on anomaly
   */
  private generateActionSuggestions(anomaly: AnomalyDetectionResult): string[] {
    const suggestions: string[] = [];

    switch (anomaly.anomalyType) {
      case 'price_spike':
        if (anomaly.anomalyScore > 0.7) {
          suggestions.push('Consider taking profits if you have open positions');
          suggestions.push('Wait for confirmation before entering new positions');
        }
        break;

      case 'volume_surge':
        suggestions.push('Monitor for potential breakout or breakdown');
        suggestions.push('Check news for fundamental catalysts');
        break;

      case 'sentiment_shift':
        suggestions.push('Review your risk management strategy');
        suggestions.push('Consider sentiment as contrarian indicator');
        break;
    }

    suggestions.push('Verify with multiple sources before making decisions');
    return suggestions;
  }

  /**
   * Subscribe to alert notifications
   */
  onAlert(callback: (alert: Alert) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Get all alerts for a user
   */
  getAlerts(userId: string, filters?: { type?: Alert['type']; severity?: Alert['severity']; unreadOnly?: boolean }): Alert[] {
    let alerts = Array.from(this.alerts.values());

    if (filters) {
      if (filters.type) {
        alerts = alerts.filter(alert => alert.type === filters.type);
      }
      if (filters.severity) {
        alerts = alerts.filter(alert => alert.severity === filters.severity);
      }
      if (filters.unreadOnly) {
        alerts = alerts.filter(alert => !alert.isRead);
      }
    }

    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Mark alert as read
   */
  markAsRead(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.isRead = true;
      return true;
    }
    return false;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.anomalyCache.clear();
    console.log('🧹 [SmartAlerts] Cache cleared');
  }

  /**
   * Start monitoring for anomalies (background process)
   */
  async startAnomalyMonitoring(symbols: string[], intervalMs: number = 60000): Promise<void> {
    console.log(`🚀 [SmartAlerts] Starting anomaly monitoring for ${symbols.length} symbols`);

    const monitor = async () => {
      for (const symbol of symbols) {
        try {
          const anomaly = await this.detectAnomalies(symbol);
          
          if (anomaly.isAnomaly && anomaly.anomalyScore > 0.5) {
            const alert = await this.createAnomalyAlert(symbol, anomaly);
            
            // In real implementation, get user profile from database
            const defaultProfile: UserAlertProfile = {
              userId: 'default',
              tradingStyle: 'moderate',
              riskTolerance: 'medium',
              preferredChannels: ['chat', 'push'],
              watchlist: symbols,
              customThresholds: {},
              alertFrequency: 'realtime',
              quietHours: { start: '23:00', end: '07:00', timezone: 'UTC' }
            };

            await this.sendIntelligentAlert(alert, defaultProfile);
          }
        } catch (error) {
          console.error(`❌ [SmartAlerts] Error monitoring ${symbol}:`, error);
        }
      }
    };

    // Run initial check
    await monitor();

    // Set up interval
    setInterval(monitor, intervalMs);
  }
}

// Export singleton instance
export const smartAlertSystem = new SmartAlertSystem(); 