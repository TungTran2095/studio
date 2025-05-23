// Market Data Types
export interface OHLCData {
  symbol: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  interval: string; // '1m', '5m', '1h', '1d', etc.
}

export interface VolumeData {
  symbol: string;
  timestamp: Date;
  volume: number;
  volumeUSD: number;
  tradeCount: number;
}

export interface AlternativeData {
  id: string;
  type: 'social_sentiment' | 'satellite' | 'credit_card' | 'news_sentiment';
  symbol?: string;
  timestamp: Date;
  value: number;
  metadata: Record<string, any>;
  source: string;
}

export interface MacroEconomicData {
  id: string;
  indicator: 'interest_rate' | 'inflation' | 'gdp' | 'unemployment' | 'fed_rate';
  country: string;
  timestamp: Date;
  value: number;
  unit: string;
  source: string;
}

export interface DataSource {
  id: string;
  name: string;
  type: 'api' | 'websocket' | 'file' | 'database';
  endpoint: string;
  isActive: boolean;
  status: 'connected' | 'disconnected' | 'error' | 'testing';
  isSecure?: boolean;
  lastSync?: Date;
  lastConnected?: Date;
  responseTime?: number;
  config: {
    rateLimit?: number;
    symbols?: string[];
    tables?: string[];
    apiKey?: string;
    [key: string]: any;
  };
}

export interface DataCollectionJob {
  id: string;
  name: string;
  description: string;
  dataType: 'ohlc' | 'volume' | 'alternative' | 'macro';
  source: string;
  symbols: string[];
  interval: string;
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
  config: Record<string, any>;
  status: 'idle' | 'running' | 'error' | 'completed';
}

export interface DataQualityMetrics {
  symbol: string;
  dataType: string;
  timestamp: Date;
  completeness: number; // 0-100%
  accuracy: number; // 0-100%
  consistency: number; // 0-100%
  timeliness: number; // 0-100%
  anomalies: number;
  missingPoints: number;
}

export interface DataProcessingPipeline {
  id: string;
  name: string;
  steps: ProcessingStep[];
  isActive: boolean;
  lastRun?: Date;
}

export interface ProcessingStep {
  id: string;
  name: string;
  type: 'clean' | 'normalize' | 'transform' | 'validate';
  config: Record<string, any>;
  order: number;
}

export interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  timestamp: Date;
}

export interface OHLCVData {
  symbol: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
} 