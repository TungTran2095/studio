import { TradingBot } from './trading-bot';
import { supabase } from '@/lib/supabase-client';

interface BotExecutorConfig {
  symbol: string;
  strategy: {
    type: string;
    parameters: any;
  };
  riskManagement: {
    initialCapital: number;
    positionSize: number;
    stopLoss: number;
    takeProfit: number;
  };
}

export class BotExecutor {
  private bot: TradingBot;
  private config: BotExecutorConfig = {
    symbol: '',
    strategy: {
      type: '',
      parameters: {}
    },
    riskManagement: {
      initialCapital: 0,
      positionSize: 0,
      stopLoss: 0,
      takeProfit: 0
    }
  };
  private isRunning: boolean = false;
  private currentPosition: any = null;

  constructor(bot: TradingBot) {
    this.bot = bot;
  }

  async initialize() {
    try {
      // Lấy cấu hình backtest
      const { data: experiment } = await supabase
        .from('research_experiments')
        .select('*')
        .eq('id', this.bot.experiment_id)
        .single();

      if (!experiment) throw new Error('Không tìm thấy backtest');

      // Khởi tạo cấu hình bot từ backtest
      this.config = {
        symbol: experiment.config.symbol,
        strategy: experiment.config.strategy,
        riskManagement: {
          initialCapital: experiment.config.initialCapital,
          positionSize: experiment.config.positionSize,
          stopLoss: experiment.config.stopLoss,
          takeProfit: experiment.config.takeProfit
        }
      };

      // Kiểm tra kết nối bằng cách lấy thông tin tài khoản
      const accountRes = await fetch('/api/trading/binance/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: this.bot.config.account.apiKey,
          apiSecret: this.bot.config.account.apiSecret
        })
      });

      if (!accountRes.ok) throw new Error('Không thể kết nối tới tài khoản');
      return true;
    } catch (error) {
      console.error('Error initializing bot:', error);
      await this.handleError(error);
      return false;
    }
  }

  async start() {
    try {
      if (this.isRunning) return;
      
      const initialized = await this.initialize();
      if (!initialized) return;

      this.isRunning = true;
      await this.updateBotStatus('running');

      // Bắt đầu vòng lặp chính
      while (this.isRunning) {
        await this.executeStrategy();
        await new Promise(resolve => setTimeout(resolve, 10000)); // Đợi 10s giữa mỗi lần check
      }
    } catch (error) {
      console.error('Error running bot:', error);
      await this.handleError(error);
    }
  }

  async stop() {
    this.isRunning = false;
    await this.updateBotStatus('stopped');
  }

  private async executeStrategy() {
    try {
      // Lấy dữ liệu thị trường
      const candlesRes = await fetch('/api/trading/binance/candles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: this.config.symbol,
          interval: '1m',
          limit: 100,
          apiKey: this.bot.config.account.apiKey,
          apiSecret: this.bot.config.account.apiSecret
        })
      });

      if (!candlesRes.ok) throw new Error('Không thể lấy dữ liệu thị trường');
      const candles = await candlesRes.json();

      // Tính toán tín hiệu dựa trên loại chiến lược
      const signal = await this.calculateSignal(candles);

      // Thực hiện giao dịch nếu có tín hiệu
      if (signal) {
        await this.executeTrade(signal);
      }

      // Kiểm tra và quản lý vị thế hiện tại
      if (this.currentPosition) {
        await this.managePosition();
      }
    } catch (error) {
      console.error('Error executing strategy:', error);
      await this.handleError(error);
    }
  }

  private async calculateSignal(candles: any[]) {
    const closes = candles.map(c => parseFloat(c.close));
    const strategy = this.config.strategy;

    switch (strategy.type) {
      case 'ma_crossover':
        return this.calculateMACrossoverSignal(closes, strategy.parameters);
      case 'rsi':
        return this.calculateRSISignal(closes, strategy.parameters);
      case 'bollinger_bands':
        return this.calculateBollingerBandsSignal(closes, strategy.parameters);
      default:
        throw new Error(`Chiến lược không được hỗ trợ: ${strategy.type}`);
    }
  }

  private calculateMACrossoverSignal(closes: number[], params: any) {
    const fastMA = this.calculateSMA(closes, params.fastPeriod);
    const slowMA = this.calculateSMA(closes, params.slowPeriod);
    
    if (fastMA[fastMA.length - 2] <= slowMA[slowMA.length - 2] && 
        fastMA[fastMA.length - 1] > slowMA[slowMA.length - 1]) {
      return 'buy';
    }
    
    if (fastMA[fastMA.length - 2] >= slowMA[slowMA.length - 2] && 
        fastMA[fastMA.length - 1] < slowMA[slowMA.length - 1]) {
      return 'sell';
    }

    return null;
  }

  private calculateRSISignal(closes: number[], params: any) {
    const rsi = this.calculateRSI(closes, params.period);
    const lastRSI = rsi[rsi.length - 1];

    if (lastRSI <= params.oversold) return 'buy';
    if (lastRSI >= params.overbought) return 'sell';
    return null;
  }

  private calculateBollingerBandsSignal(closes: number[], params: any) {
    const period = params.period || 20;
    const stdDev = params.stdDev || 2;
    const sma = this.calculateSMA(closes, period);
    const middle = sma[sma.length - 1];
    const std = this.calculateStdDev(closes.slice(-period));
    const upper = middle + (std * stdDev);
    const lower = middle - (std * stdDev);
    const lastClose = closes[closes.length - 1];

    if (lastClose <= lower) return 'buy';
    if (lastClose >= upper) return 'sell';
    return null;
  }

  private calculateSMA(data: number[], period: number): number[] {
    const sma = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  private calculateRSI(data: number[], period: number): number[] {
    const rsi = [];
    let gains = 0;
    let losses = 0;

    // Tính toán giá trị đầu tiên
    for (let i = 1; i < period; i++) {
      const diff = data[i] - data[i - 1];
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period; i < data.length; i++) {
      const diff = data[i] - data[i - 1];
      if (diff >= 0) {
        avgGain = (avgGain * (period - 1) + diff) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) - diff) / period;
      }

      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }

    return rsi;
  }

  private calculateStdDev(data: number[]): number {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const squaredDiffs = data.map(x => Math.pow(x - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / data.length;
    return Math.sqrt(variance);
  }

  private async executeTrade(signal: 'buy' | 'sell') {
    try {
      if (this.currentPosition) return; // Không mở vị thế mới nếu đang có vị thế

      // Lấy thông tin tài khoản
      const accountRes = await fetch('/api/trading/binance/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: this.bot.config.account.apiKey,
          apiSecret: this.bot.config.account.apiSecret
        })
      });

      if (!accountRes.ok) throw new Error('Không thể lấy thông tin tài khoản');
      const accountInfo = await accountRes.json();
      const balance = parseFloat(accountInfo.balances.find((b: any) => b.asset === 'USDT')?.free || '0');
      
      if (balance < this.config.riskManagement.initialCapital) {
        throw new Error('Không đủ số dư để giao dịch');
      }

      // Lấy giá hiện tại
      const candlesRes = await fetch('/api/trading/binance/candles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: this.config.symbol,
          interval: '1m',
          limit: 1,
          apiKey: this.bot.config.account.apiKey,
          apiSecret: this.bot.config.account.apiSecret
        })
      });

      if (!candlesRes.ok) throw new Error('Không thể lấy giá hiện tại');
      const candles = await candlesRes.json();
      const currentPrice = parseFloat(candles[0].close);
      
      const positionSize = (balance * this.config.riskManagement.positionSize) / 100;
      const quantity = positionSize / currentPrice;

      // Tạo lệnh market
      const orderRes = await fetch('/api/trading/binance/order', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: this.config.symbol,
          side: signal.toUpperCase(),
          type: 'MARKET',
          quantity: quantity.toFixed(6),
          apiKey: this.bot.config.account.apiKey,
          apiSecret: this.bot.config.account.apiSecret
        })
      });

      if (!orderRes.ok) throw new Error('Không thể tạo lệnh giao dịch');
      const order = await orderRes.json();

      this.currentPosition = {
        entryPrice: parseFloat(order.fills[0].price),
        quantity: quantity,
        side: signal,
        stopLoss: signal === 'buy' 
          ? currentPrice * (1 - this.config.riskManagement.stopLoss / 100)
          : currentPrice * (1 + this.config.riskManagement.stopLoss / 100),
        takeProfit: signal === 'buy'
          ? currentPrice * (1 + this.config.riskManagement.takeProfit / 100)
          : currentPrice * (1 - this.config.riskManagement.takeProfit / 100)
      };

      // Cập nhật thống kê
      await this.updateBotStats({
        total_trades: this.bot.total_trades + 1,
        total_profit: this.bot.total_profit,
        win_rate: this.bot.win_rate
      });

    } catch (error) {
      console.error('Error executing trade:', error);
      await this.handleError(error);
    }
  }

  private async managePosition() {
    try {
      // Lấy giá hiện tại
      const candlesRes = await fetch('/api/trading/binance/candles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: this.config.symbol,
          interval: '1m',
          limit: 1,
          apiKey: this.bot.config.account.apiKey,
          apiSecret: this.bot.config.account.apiSecret
        })
      });

      if (!candlesRes.ok) throw new Error('Không thể lấy giá hiện tại');
      const candles = await candlesRes.json();
      const currentPrice = parseFloat(candles[0].close);

      if (!this.currentPosition) return;

      let shouldClose = false;
      let profit = 0;

      if (this.currentPosition.side === 'buy') {
        if (currentPrice <= this.currentPosition.stopLoss) {
          shouldClose = true;
          profit = (currentPrice - this.currentPosition.entryPrice) * this.currentPosition.quantity;
        } else if (currentPrice >= this.currentPosition.takeProfit) {
          shouldClose = true;
          profit = (currentPrice - this.currentPosition.entryPrice) * this.currentPosition.quantity;
        }
      } else {
        if (currentPrice >= this.currentPosition.stopLoss) {
          shouldClose = true;
          profit = (this.currentPosition.entryPrice - currentPrice) * this.currentPosition.quantity;
        } else if (currentPrice <= this.currentPosition.takeProfit) {
          shouldClose = true;
          profit = (this.currentPosition.entryPrice - currentPrice) * this.currentPosition.quantity;
        }
      }

      if (shouldClose) {
        // Đóng vị thế
        const orderRes = await fetch('/api/trading/binance/order', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: this.config.symbol,
            side: this.currentPosition.side === 'buy' ? 'SELL' : 'BUY',
            type: 'MARKET',
            quantity: this.currentPosition.quantity.toFixed(6),
            apiKey: this.bot.config.account.apiKey,
            apiSecret: this.bot.config.account.apiSecret
          })
        });

        if (!orderRes.ok) throw new Error('Không thể đóng vị thế');

        // Cập nhật thống kê
        const newTotalProfit = this.bot.total_profit + profit;
        const totalWins = profit > 0 ? this.bot.total_trades + 1 : this.bot.total_trades;
        const newWinRate = (totalWins / (this.bot.total_trades + 1)) * 100;

        await this.updateBotStats({
          total_trades: this.bot.total_trades,
          total_profit: newTotalProfit,
          win_rate: newWinRate
        });

        this.currentPosition = null;
      }
    } catch (error) {
      console.error('Error managing position:', error);
      await this.handleError(error);
    }
  }

  private async updateBotStatus(status: TradingBot['status']) {
    try {
      if (!supabase) {
        console.error('Supabase client not initialized');
        return;
      }
      const { error } = await supabase
        .from('trading_bots')
        .update({ 
          status,
          updated_at: new Date().toISOString(),
          ...(status === 'running' ? { last_run_at: new Date().toISOString() } : {})
        })
        .eq('id', this.bot.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating bot status:', error);
    }
  }

  private async updateBotStats(stats: Pick<TradingBot, 'total_trades' | 'total_profit' | 'win_rate'>) {
    try {
      if (!supabase) {
        console.error('Supabase client not initialized');
        return;
      }
      const { error } = await supabase
        .from('trading_bots')
        .update({
          ...stats,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.bot.id);

      if (error) throw error;

      // Cập nhật thông tin local
      this.bot = {
        ...this.bot,
        ...stats
      };
    } catch (error) {
      console.error('Error updating bot stats:', error);
    }
  }

  private async handleError(error: any) {
    try {
      if (!supabase) {
        console.error('Supabase client not initialized');
        return;
      }
      await supabase
        .from('trading_bots')
        .update({
          status: 'error',
          last_error: error.message || JSON.stringify(error),
          updated_at: new Date().toISOString()
        })
        .eq('id', this.bot.id);
    } catch (dbError) {
      console.error('Error handling bot error:', dbError);
    }
  }
} 