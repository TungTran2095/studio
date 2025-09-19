import { supabase } from '@/lib/supabase-client';

export type TradingBotStatus = 'idle' | 'running' | 'stopped' | 'error';

export interface TradingBotConfig {
  account: {
    apiKey: string;
    apiSecret: string;
    testnet: boolean;
  };
  strategy: {
    type: string;
    parameters: Record<string, any>;
  };
  riskManagement: {
    initialCapital: number;
    positionSize: number;
    stopLoss: number;
    takeProfit: number;
    maxDrawdown?: number;
    trailingStop?: boolean;
    trailingStopDistance?: number;
  };
}

export interface TradingBot {
  id: string;
  project_id: string;
  experiment_id: string;
  name: string;
  description?: string;
  config: Record<string, any>;
  status: TradingBotStatus;
  total_trades: number;
  total_profit: number;
  win_rate: number;
  last_run_at?: string;
  last_error?: string;
  created_at: string;
  updated_at: string;
  trades?: Trade[];
}

export interface TradingBotStats {
  total_trades: number;
  total_profit: number;
  win_rate: number;
}

export interface Position {
  symbol: string;
  side: 'buy' | 'sell';
  entryPrice: number;
  quantity: number;
  stopLoss: number;
  takeProfit: number;
  trailingStop?: boolean;
  trailingStopDistance?: number;
  currentPrice?: number;
  unrealizedPnL?: number;
  openTime: string;
}

export interface Trade {
  id: string;
  bot_id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  quantity: number;
  entry_price: number;
  exit_price?: number;
  stop_loss: number;
  take_profit: number;
  status: 'open' | 'closed';
  pnl?: number;
  open_time: string;
  close_time?: string;
  created_at: string;
  updated_at: string;
}

export interface TradingBotError {
  message: string;
  code?: string;
  timestamp: string;
}

export interface MarketData {
  symbol: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Signal {
  type: 'buy' | 'sell' | 'close';
  symbol: string;
  price: number;
  timestamp: number;
  confidence?: number;
  metadata?: Record<string, any>;
}

export interface StrategyResult {
  signal?: Signal;
  indicators?: Record<string, number[]>;
  metadata?: Record<string, any>;
}

export interface CreateTradingBotInput {
  name: string;
  backtestId: string;
  account: {
    apiKey: string;
    apiSecret: string;
    testnet: boolean;
  };
  config: any; // The full backtest config
}

export async function createTradingBot(projectId: string, input: CreateTradingBotInput): Promise<TradingBot | null> {
  if (!supabase) throw new Error("Supabase client is not initialized.");
  try {
    // Debug logging
    console.log('🔍 Debug createTradingBot input:', JSON.stringify(input, null, 2));
    
    // Validate config structure - support both flat and nested structures
    const config = input.config?.config || input.config;
    console.log('🔍 Debug config structure:', JSON.stringify(config, null, 2));
    
    if (!config) {
      throw new Error('The provided backtest configuration is missing.');
    }

    // Check for nested structure (new format)
    const hasNestedStructure = config.strategy && config.riskManagement;
    console.log('🔍 hasNestedStructure:', hasNestedStructure, 'strategy:', !!config.strategy, 'riskManagement:', !!config.riskManagement);
    
    // Check for flat structure (legacy format) - at least need strategy type and risk management params
    const hasFlatStructure = config.strategyType && config.stopLoss !== undefined && config.takeProfit !== undefined;
    console.log('🔍 hasFlatStructure:', hasFlatStructure, 'strategyType:', config.strategyType, 'stopLoss:', config.stopLoss, 'takeProfit:', config.takeProfit);
    
    // Debug: Log all available keys in config
    console.log('🔍 Available config keys:', Object.keys(config));
    
    // More flexible validation - check if we have any strategy-related fields
    const hasAnyStrategyInfo = hasNestedStructure || hasFlatStructure || 
      config.strategyType || config.type || 
      (config.stopLoss !== undefined || config.takeProfit !== undefined) ||
      Object.keys(config).some(key => key.toLowerCase().includes('strategy'));
    
    console.log('🔍 hasAnyStrategyInfo:', hasAnyStrategyInfo);
    
    if (!hasAnyStrategyInfo) {
      throw new Error('The provided backtest configuration is incomplete. Missing strategy or risk management parameters.');
    }

    // Normalize config structure for consistent storage
    let normalizedConfig;
    if (hasNestedStructure) {
      // Already in nested format
      normalizedConfig = config;
    } else {
      // Convert flat structure or any other structure to nested format
      normalizedConfig = {
        trading: {
          symbol: config.symbol || config.trading?.symbol || 'BTCUSDT',
          timeframe: config.timeframe || config.trading?.timeframe || '1h',
          initialCapital: config.initialCapital || config.trading?.initialCapital || 10000,
          positionSize: config.positionSize || config.trading?.positionSize || 1.0,
          startDate: config.startDate || config.trading?.startDate,
          endDate: config.endDate || config.trading?.endDate,
          maker_fee: config.maker_fee || config.trading?.maker_fee || 0.1,
          taker_fee: config.taker_fee || config.trading?.taker_fee || 0.1,
        },
        strategy: {
          type: config.strategyType || config.type || config.strategy?.type || 'simple_momentum',
          parameters: {
            fastPeriod: config.fastPeriod,
            slowPeriod: config.slowPeriod,
            rsiPeriod: config.rsiPeriod,
            overbought: config.overbought,
            oversold: config.oversold,
            fastEMA: config.fastEMA,
            slowEMA: config.slowEMA,
            signalPeriod: config.signalPeriod,
            period: config.period,
            stdDev: config.stdDev,
            bbPeriod: config.bbPeriod,
            bbStdDev: config.bbStdDev,
            multiplier: config.multiplier,
            channelPeriod: config.channelPeriod,
            ...config.strategy?.parameters
          }
        },
        riskManagement: {
          stopLoss: config.stopLoss || config.riskManagement?.stopLoss || 2.0,
          takeProfit: config.takeProfit || config.riskManagement?.takeProfit || 4.0,
          maxPositions: config.maxPositions || config.riskManagement?.maxPositions || 1,
          maxDrawdown: config.maxDrawdown || config.riskManagement?.maxDrawdown || 10.0,
          trailingStop: config.trailingStop !== undefined ? config.trailingStop : 
                       config.riskManagement?.trailingStop !== undefined ? config.riskManagement.trailingStop : true,
          trailingStopDistance: config.trailingStopDistance || config.riskManagement?.trailingStopDistance || 1.0,
          prioritizeStoploss: config.prioritizeStoploss !== undefined ? config.prioritizeStoploss : 
                             config.riskManagement?.prioritizeStoploss !== undefined ? config.riskManagement.prioritizeStoploss : true,
          useTakeProfit: config.useTakeProfit !== undefined ? config.useTakeProfit : 
                        config.riskManagement?.useTakeProfit !== undefined ? config.riskManagement.useTakeProfit : true,
        }
      };
    }

    const botConfigToSave = {
      ...input.config,
      config: normalizedConfig,
      account: input.account,
    };

    const { data, error } = await supabase
      .from('trading_bots')
      .insert([{
        project_id: projectId,
        experiment_id: input.backtestId,
        name: input.name,
        status: 'stopped',
        config: botConfigToSave,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating trading bot:', error);
    throw error;
  }
}

export async function fetchTradingBots(projectId: string): Promise<TradingBot[]> {
  if (!supabase) throw new Error("Supabase client is not initialized.");
  try {
    const { data, error } = await supabase
      .from('trading_bots')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching trading bots:', error);
    return [];
  }
}

export async function updateTradingBotStatus(botId: string, status: TradingBot['status']): Promise<boolean> {
  if (!supabase) throw new Error("Supabase client is not initialized.");
  try {
    const { error } = await supabase
      .from('trading_bots')
      .update({ 
        status,
        updated_at: new Date().toISOString(),
        ...(status === 'running' ? { last_run_at: new Date().toISOString() } : {})
      })
      .eq('id', botId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating trading bot status:', error);
    return false;
  }
}

export async function updateTradingBotStats(
  botId: string, 
  stats: Pick<TradingBot, 'total_trades' | 'total_profit' | 'win_rate'>
): Promise<boolean> {
  if (!supabase) throw new Error("Supabase client is not initialized.");
  try {
    const { error } = await supabase
      .from('trading_bots')
      .update({
        ...stats,
        updated_at: new Date().toISOString()
      })
      .eq('id', botId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating trading bot stats:', error);
    return false;
  }
}

export async function deleteTradingBot(botId: string): Promise<boolean> {
  if (!supabase) throw new Error("Supabase client is not initialized.");
  try {
    const { error } = await supabase
      .from('trading_bots')
      .delete()
      .eq('id', botId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting trading bot:', error);
    return false;
  }
} 