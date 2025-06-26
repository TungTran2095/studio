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
  config: TradingBotConfig;
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
    if (!input.config || !input.config.strategy || !input.config.riskManagement) {
      throw new Error('The provided backtest configuration is incomplete.');
    }

    const fullConfig: TradingBotConfig = {
      account: input.account,
      strategy: input.config.strategy,
      riskManagement: input.config.riskManagement,
    };

    const { data, error } = await supabase
      .from('trading_bots')
      .insert([{
        project_id: projectId,
        experiment_id: input.backtestId,
        name: input.name,
        status: 'stopped',
        config: fullConfig,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating trading bot:', error);
    return null;
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