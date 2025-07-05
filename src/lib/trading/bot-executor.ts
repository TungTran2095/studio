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
  timeframe: string;
}

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:9002';

// Helper function để chuyển đổi timeframe thành milliseconds
function timeframeToMs(timeframe: string): number {
  const match = timeframe.match(/^([0-9]+)([mhdw])$/i);
  if (!match) return 60000; // Default 1m
  
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  switch (unit) {
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 'w': return value * 7 * 24 * 60 * 60 * 1000;
    default: return 60000;
  }
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
    },
    timeframe: '1m'
  };
  private isRunning: boolean = false;
  private currentPosition: any = null;
  private lastExecutionTime: number = 0;

  constructor(bot: TradingBot) {
    this.bot = bot;
    // Lấy đúng các trường từ cấu trúc config lồng
    const config = (this.bot.config as any);
    
    // Sửa logic lấy account - kiểm tra cả 2 vị trí có thể
    if (config.account) {
      this.bot.config.account = config.account;
    } else if (config.config?.account) {
      this.bot.config.account = config.config.account;
    }
    
    // Đảm bảo testnet được set đúng
    if (this.bot.config.account.testnet === undefined) {
      this.bot.config.account.testnet = false;
    }
    
    this.config = {
      symbol: config.config?.trading?.symbol || 'BTCUSDT',
      strategy: config.config?.strategy,
      riskManagement: {
        initialCapital: config.config?.trading?.initialCapital,
        positionSize: config.config?.trading?.positionSize,
        stopLoss: config.config?.riskManagement?.stopLoss,
        takeProfit: config.config?.riskManagement?.takeProfit
      },
      timeframe: config.config?.trading?.timeframe || '1m'
    };
    
    // Log để debug account config
    console.log('[BotExecutor] Raw bot config:', JSON.stringify(this.bot.config, null, 2));
    
    // Thêm log để kiểm tra
    console.log('BotExecutor config:', this.config);
    console.log('[BotExecutor] Account config:', {
      apiKey: this.bot.config.account.apiKey ? `${this.bot.config.account.apiKey.slice(0, 6)}...${this.bot.config.account.apiKey.slice(-4)}` : 'undefined',
      testnet: this.bot.config.account.testnet
    });
  }

  async initialize() {
    try {
      // The config is already initialized in the constructor.
      // We just need to check the API connection.
      
      // Reset current position khi khởi tạo bot
      this.currentPosition = null;
      console.log('[BotExecutor] Reset current position to null');
      
      // Check API connection by fetching account info
      const accountRes = await fetch(`${API_BASE_URL}/api/trading/binance/account`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: this.bot.config.account.apiKey,
          apiSecret: this.bot.config.account.apiSecret,
          isTestnet: this.bot.config.account.testnet,
        })
      });

      if (!accountRes.ok) {
        const errorText = await accountRes.text();
        throw new Error(`Failed to connect to account: ${errorText}`);
      }
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
      console.log('[BotExecutor] Bắt đầu start() cho bot:', this.bot?.name);
      console.log('[BotExecutor] Timeframe:', this.config.timeframe);
      const initialized = await this.initialize();
      if (!initialized) return;

      this.isRunning = true;
      await this.updateBotStatus('running');

      // Tính toán interval dựa trên timeframe
      const intervalMs = timeframeToMs(this.config.timeframe);
      console.log(`[BotExecutor] Chạy với interval: ${intervalMs}ms (${this.config.timeframe})`);

      // Bắt đầu vòng lặp chính
      while (this.isRunning) {
        console.log('[BotExecutor] Vòng lặp chính executeStrategy()...');
        await this.executeStrategy();
        
        // Đợi theo đúng timeframe thay vì cố định 10s
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    } catch (error) {
      console.error('[BotExecutor] Error running bot:', error);
      await this.handleError(error);
    }
  }

  async stop() {
    this.isRunning = false;
    await this.updateBotStatus('stopped');
  }

  private async executeStrategy() {
    try {
      console.log('[BotExecutor] Executing strategy...');
      
      // Lấy dữ liệu candles
      const candlesRes = await fetch(`${API_BASE_URL}/api/trading/binance/candles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: this.config.symbol,
          interval: this.config.timeframe,
          limit: 100,
          apiKey: this.bot.config.account.apiKey,
          apiSecret: this.bot.config.account.apiSecret,
          isTestnet: this.bot.config.account.testnet,
        })
      });

      if (!candlesRes.ok) {
        const errorText = await candlesRes.text();
        console.error('[BotExecutor] Error fetching candles:', errorText);
        throw new Error(`Không thể lấy dữ liệu candles: ${candlesRes.status}`);
      }

      const candlesData = await candlesRes.json();
      
      // Kiểm tra format dữ liệu trả về
      if (!candlesData.candles || !Array.isArray(candlesData.candles) || candlesData.candles.length === 0) {
        throw new Error('Dữ liệu candles không hợp lệ hoặc rỗng');
      }

      console.log(`[BotExecutor] Fetched ${candlesData.candles.length} candles`);

      // Format dữ liệu candles từ Binance API
      const formattedCandles = candlesData.candles.map((candle: any[]) => ({
        openTime: candle[0],
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5]),
        closeTime: candle[6]
      }));

      // Tính toán signal
      const signal = await this.calculateSignal(formattedCandles);
      console.log('[BotExecutor] Calculated signal:', signal);
      console.log('[BotExecutor] Current position:', this.currentPosition);

      // Kiểm tra position thực tế từ Binance
      const hasRealPosition = await this.checkRealPosition();
      console.log('[BotExecutor] Has real position from Binance:', hasRealPosition);

      // Clear currentPosition nếu không có position thực tế trên Binance
      if (this.currentPosition && !hasRealPosition) {
        console.log('[BotExecutor] Clearing currentPosition because no real position exists');
        this.currentPosition = null;
      }

      if (signal === 'buy' && !this.currentPosition && !hasRealPosition) {
        console.log('[BotExecutor] Executing BUY signal');
        await this.executeTrade('buy');
      } else if (signal === 'sell' && !this.currentPosition && !hasRealPosition) {
        console.log('[BotExecutor] Executing SELL signal');
        await this.executeTrade('sell');
      } else if (this.currentPosition || hasRealPosition) {
        console.log('[BotExecutor] Managing existing position');
        await this.managePosition();
      } else {
        console.log('[BotExecutor] No action needed');
      }

      // Cập nhật thời gian thực thi cuối
      this.lastExecutionTime = Date.now();

    } catch (error) {
      console.error('[BotExecutor] Error executing strategy:', error);
      await this.handleError(error);
    }
  }

  private async calculateSignal(candles: any[]): Promise<'buy' | 'sell' | null> {
    try {
      console.log('[BotExecutor] Calculate Signal Debug - Starting signal calculation');
      console.log('[BotExecutor] Calculate Signal Debug - Candles length:', candles.length);
      
      if (candles.length < 50) {
        console.log('[BotExecutor] Calculate Signal Debug - Not enough data for signal calculation');
        return null;
      }

      const closes = candles.map(c => c.close);
      console.log('[BotExecutor] Calculate Signal Debug - Extracted closes length:', closes.length);
      console.log('[BotExecutor] Calculate Signal Debug - First 5 closes:', closes.slice(0, 5));
      console.log('[BotExecutor] Calculate Signal Debug - Last 5 closes:', closes.slice(-5));
      
      const strategy = this.config.strategy;
      console.log('[BotExecutor] Calculate Signal Debug - Strategy:', strategy);

      switch (strategy.type.toLowerCase()) {
        case 'ma_crossover':
        case 'ma_cross':
          console.log('[BotExecutor] Calculate Signal Debug - Using MA_CROSSOVER strategy');
          return this.calculateMACrossoverSignal(closes, strategy.parameters);
        case 'rsi':
          console.log('[BotExecutor] Calculate Signal Debug - Using RSI strategy');
          return this.calculateRSISignal(closes, strategy.parameters);
        case 'bollinger_bands':
        case 'bollinger':
        case 'bb':
          console.log('[BotExecutor] Calculate Signal Debug - Using BOLLINGER_BANDS strategy');
          return this.calculateBollingerBandsSignal(closes, strategy.parameters);
        default:
          console.warn('[BotExecutor] Calculate Signal Debug - Unknown strategy type:', strategy.type);
          console.log('[BotExecutor] Calculate Signal Debug - Supported types: ma_crossover, rsi, bollinger_bands');
          return null;
      }
    } catch (error) {
      console.error('[BotExecutor] Calculate Signal Debug - Error calculating signal:', error);
      return null;
    }
  }

  private calculateMACrossoverSignal(closes: number[], params: any): 'buy' | 'sell' | null {
    const fastPeriod = params.fastPeriod || 10;
    const slowPeriod = params.slowPeriod || 20;
    
    const fastMA = this.calculateSMA(closes, fastPeriod);
    const slowMA = this.calculateSMA(closes, slowPeriod);
    
    if (fastMA.length < 2 || slowMA.length < 2) return null;
    
    const currentFast = fastMA[fastMA.length - 1];
    const previousFast = fastMA[fastMA.length - 2];
    const currentSlow = slowMA[slowMA.length - 1];
    const previousSlow = slowMA[slowMA.length - 2];
    
    // Golden cross: fast MA crosses above slow MA
    if (previousFast <= previousSlow && currentFast > currentSlow) {
      return 'buy';
    }
    
    // Death cross: fast MA crosses below slow MA
    if (previousFast >= previousSlow && currentFast < currentSlow) {
      return 'sell';
    }
    
    return null;
  }

  private calculateRSISignal(closes: number[], params: any): 'buy' | 'sell' | null {
    console.log('[BotExecutor] RSI Signal Debug - Starting calculation');
    console.log('[BotExecutor] RSI Signal Debug - Parameters:', params);
    console.log('[BotExecutor] RSI Signal Debug - Closes length:', closes.length);
    
    const period = params.period || 14;
    const oversold = params.oversold || 30;
    const overbought = params.overbought || 70;
    
    console.log(`[BotExecutor] RSI Signal Debug - Using period: ${period}, oversold: ${oversold}, overbought: ${overbought}`);
    
    const rsi = this.calculateRSI(closes, period);
    console.log('[BotExecutor] RSI Signal Debug - RSI calculation result length:', rsi.length);
    
    if (rsi.length === 0) {
      console.log('[BotExecutor] RSI Signal Debug - No RSI values calculated, returning null');
      return null;
    }
    
    const currentRSI = rsi[rsi.length - 1];
    console.log(`[BotExecutor] RSI Signal Debug - Current RSI: ${currentRSI}`);
    
    if (currentRSI < oversold) {
      console.log(`[BotExecutor] RSI Signal Debug - RSI ${currentRSI} < ${oversold}, returning BUY signal`);
      return 'buy';
    } else if (currentRSI > overbought) {
      console.log(`[BotExecutor] RSI Signal Debug - RSI ${currentRSI} > ${overbought}, returning SELL signal`);
      return 'sell';
    } else {
      console.log(`[BotExecutor] RSI Signal Debug - RSI ${currentRSI} in neutral range, returning null`);
      return null;
    }
  }

  private calculateBollingerBandsSignal(closes: number[], params: any): 'buy' | 'sell' | null {
    const period = params.period || 20;
    const stdDev = params.stdDev || 2;
    
    if (closes.length < period) return null;
    
    const sma = this.calculateSMA(closes, period);
    const middle = sma[sma.length - 1];
    const std = this.calculateStdDev(closes.slice(-period));
    const upper = middle + (std * stdDev);
    const lower = middle - (std * stdDev);
    
    const currentPrice = closes[closes.length - 1];
    
    if (currentPrice <= lower) {
      return 'buy';
    } else if (currentPrice >= upper) {
      return 'sell';
    }
    
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
    console.log(`[BotExecutor] RSI Debug - Input data length: ${data.length}, period: ${period}`);
    console.log(`[BotExecutor] RSI Debug - First 5 prices:`, data.slice(0, 5));
    console.log(`[BotExecutor] RSI Debug - Last 5 prices:`, data.slice(-5));
    
    if (data.length < period + 1) {
      console.error(`[BotExecutor] RSI Error - Not enough data. Need ${period + 1}, got ${data.length}`);
      return [];
    }

    // Kiểm tra dữ liệu đầu vào
    if (data.some(price => isNaN(price) || price <= 0)) {
      console.error('[BotExecutor] RSI Error - Invalid price data detected');
      return [];
    }

    const rsi = [];
    let gains = 0;
    let losses = 0;

    // Tính toán giá trị đầu tiên - sửa logic
    for (let i = 1; i <= period; i++) {
      const diff = data[i] - data[i - 1];
      if (diff >= 0) {
        gains += diff;
      } else {
        losses += Math.abs(diff);
      }
    }

    console.log(`[BotExecutor] RSI Debug - Initial gains: ${gains}, losses: ${losses}`);

    let avgGain = gains / period;
    let avgLoss = losses / period;

    console.log(`[BotExecutor] RSI Debug - Initial avgGain: ${avgGain}, avgLoss: ${avgLoss}`);

    // Tính RSI cho các giá trị tiếp theo
    for (let i = period + 1; i < data.length; i++) {
      const diff = data[i] - data[i - 1];
      
      if (diff >= 0) {
        avgGain = (avgGain * (period - 1) + diff) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) + Math.abs(diff)) / period;
      }

      // Xử lý trường hợp avgLoss = 0 để tránh NaN
      let rs;
      if (avgLoss === 0) {
        rs = avgGain > 0 ? 100 : 0; // Nếu không có loss, RSI = 100 hoặc 0
      } else {
        rs = avgGain / avgLoss;
      }

      const rsiValue = 100 - (100 / (1 + rs));
      
      // Kiểm tra giá trị RSI hợp lệ
      if (isNaN(rsiValue) || !isFinite(rsiValue)) {
        console.error(`[BotExecutor] RSI Error - Invalid RSI value: ${rsiValue} at index ${i}`);
        rsi.push(50); // Giá trị mặc định
      } else {
        rsi.push(rsiValue);
      }
    }

    console.log(`[BotExecutor] RSI Debug - Final avgGain: ${avgGain}, avgLoss: ${avgLoss}`);
    console.log(`[BotExecutor] RSI Debug - RSI array length: ${rsi.length}`);
    if (rsi.length > 0) {
      console.log(`[BotExecutor] RSI Debug - Last RSI: ${rsi[rsi.length - 1]}`);
      console.log(`[BotExecutor] RSI Debug - Last 5 RSI values:`, rsi.slice(-5));
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
      // Lấy số dư USDT
      const balanceRes = await fetch(`${API_BASE_URL}/api/trading/binance/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: this.bot.config.account.apiKey,
          apiSecret: this.bot.config.account.apiSecret,
          isTestnet: this.bot.config.account.testnet,
        })
      });

      if (!balanceRes.ok) throw new Error('Không thể lấy số dư');
      const balanceData = await balanceRes.json();
      const balance = parseFloat(balanceData.USDT || '0');
      console.log('[BotExecutor] USDT Balance:', balance);

      if (balance < 10) {
        console.log('[BotExecutor] Insufficient balance for trading');
        return;
      }

      // Lấy giá hiện tại
      const candlesRes = await fetch(`${API_BASE_URL}/api/trading/binance/candles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: this.config.symbol,
          interval: '1m',
          limit: 1,
          apiKey: this.bot.config.account.apiKey,
          apiSecret: this.bot.config.account.apiSecret,
          isTestnet: this.bot.config.account.testnet,
        })
      });

      if (!candlesRes.ok) throw new Error('Không thể lấy giá hiện tại');
      const candlesData = await candlesRes.json();
      
      // Kiểm tra format dữ liệu trả về
      if (!candlesData.candles || !Array.isArray(candlesData.candles) || candlesData.candles.length === 0) {
        throw new Error('Dữ liệu candles không hợp lệ hoặc rỗng');
      }
      
      // Format dữ liệu candles từ Binance API
      // Binance API trả về: [openTime, open, high, low, close, volume, closeTime, ...]
      const candle = candlesData.candles[0];
      if (!Array.isArray(candle) || candle.length < 5) {
        throw new Error('Format dữ liệu candle không hợp lệ');
      }
      
      const currentPrice = parseFloat(candle[4]); // close price ở index 4
      console.log('[BotExecutor] Current price:', currentPrice);
      
      const positionSize = (balance * this.config.riskManagement.positionSize) / 100;
      let quantity = positionSize / currentPrice;
      
      // Đảm bảo quantity tối thiểu (ít nhất 10 USDT)
      const minPositionSize = 10; // 10 USDT tối thiểu
      if (positionSize < minPositionSize) {
        quantity = minPositionSize / currentPrice;
      }

      // Tạo lệnh market
      const orderRes = await fetch(`${API_BASE_URL}/api/trading/binance/order`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: this.config.symbol,
          side: signal.toUpperCase(),
          type: 'MARKET',
          quantity: quantity.toFixed(6),
          apiKey: this.bot.config.account.apiKey,
          apiSecret: this.bot.config.account.apiSecret,
          isTestnet: this.bot.config.account.testnet,
        })
      });

      console.log('[BotExecutor] Order API response status:', orderRes.status);
      const orderBody = await orderRes.text();
      console.log('[BotExecutor] Order API response body:', orderBody);

      if (!orderRes.ok) throw new Error('Không thể tạo lệnh giao dịch: ' + orderBody);
      const order = JSON.parse(orderBody);

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

      // Lưu giao dịch vào database
      await this.saveTrade({
        symbol: this.config.symbol,
        side: signal,
        type: 'market',
        quantity: quantity,
        entry_price: parseFloat(order.fills[0].price),
        stop_loss: this.currentPosition.stopLoss,
        take_profit: this.currentPosition.takeProfit,
        status: 'open',
        open_time: new Date().toISOString()
      });

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
      const candlesRes = await fetch(`${API_BASE_URL}/api/trading/binance/candles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: this.config.symbol,
          interval: '1m',
          limit: 1,
          apiKey: this.bot.config.account.apiKey,
          apiSecret: this.bot.config.account.apiSecret,
          isTestnet: this.bot.config.account.testnet,
        })
      });

      if (!candlesRes.ok) throw new Error('Không thể lấy giá hiện tại');
      const candlesData = await candlesRes.json();
      
      // Kiểm tra format dữ liệu trả về
      if (!candlesData.candles || !Array.isArray(candlesData.candles) || candlesData.candles.length === 0) {
        throw new Error('Dữ liệu candles không hợp lệ hoặc rỗng');
      }
      
      // Format dữ liệu candles từ Binance API
      const candle = candlesData.candles[0];
      if (!Array.isArray(candle) || candle.length < 5) {
        throw new Error('Format dữ liệu candle không hợp lệ');
      }
      
      const currentPrice = parseFloat(candle[4]); // close price ở index 4

      if (!this.currentPosition) {
        console.log('[BotExecutor] No current position to manage');
        return;
      }

      // Kiểm tra position thực tế trước khi manage
      const hasRealPosition = await this.checkRealPosition();
      if (!hasRealPosition) {
        console.log('[BotExecutor] No real position exists, clearing currentPosition');
        this.currentPosition = null;
        return;
      }

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
        const orderRes = await fetch(`${API_BASE_URL}/api/trading/binance/order`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: this.config.symbol,
            side: this.currentPosition.side === 'buy' ? 'SELL' : 'BUY',
            type: 'MARKET',
            quantity: this.currentPosition.quantity.toFixed(6),
            apiKey: this.bot.config.account.apiKey,
            apiSecret: this.bot.config.account.apiSecret,
            isTestnet: this.bot.config.account.testnet,
          })
        });

        if (!orderRes.ok) throw new Error('Không thể đóng vị thế');

        const closeOrder = JSON.parse(await orderRes.text());
        const exitPrice = parseFloat(closeOrder.fills[0].price);

        // Cập nhật giao dịch đã đóng
        await this.updateLastTrade({
          exit_price: exitPrice,
          status: 'closed',
          close_time: new Date().toISOString(),
          pnl: profit
        });

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
      if (!this.bot.id) {
        console.error('Bot id is undefined, cannot update status');
        return;
      }
      console.log('Update bot status:', { id: this.bot.id, status });
      const { error } = await supabase
        .from('trading_bots')
        .update({ 
          status,
          updated_at: new Date().toISOString(),
          ...(status === 'running' ? { last_run_at: new Date().toISOString() } : {})
        })
        .eq('id', this.bot.id);

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }
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
      
      // Chỉ update các trường cơ bản để tránh lỗi schema
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      
      // Chỉ thêm các trường nếu chúng tồn tại
      if (stats.total_trades !== undefined) {
        updateData.total_trades = stats.total_trades;
      }
      if (stats.total_profit !== undefined) {
        updateData.total_profit = stats.total_profit;
      }
      if (stats.win_rate !== undefined) {
        updateData.win_rate = stats.win_rate;
      }
      
      const { error } = await supabase
        .from('trading_bots')
        .update(updateData)
        .eq('id', this.bot.id);

      if (error) {
        console.error('Supabase update error:', error);
        // Nếu lỗi schema, chỉ update status
        await supabase
          .from('trading_bots')
          .update({ 
            status: this.bot.status,
            updated_at: new Date().toISOString()
          })
          .eq('id', this.bot.id);
        return;
      }

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

  private async saveTrade(tradeData: {
    symbol: string;
    side: string;
    type: string;
    quantity: number;
    entry_price: number;
    stop_loss: number;
    take_profit: number;
    status: string;
    open_time: string;
  }) {
    try {
      if (!supabase) {
        console.error('Supabase client not initialized');
        return;
      }
      
      console.log('[BotExecutor] Saving trade to database:', tradeData);
      
      const { data, error } = await supabase
        .from('trades')
        .insert({
          bot_id: this.bot.id,
          ...tradeData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('[BotExecutor] Error saving trade:', error);
      } else {
        console.log('[BotExecutor] Trade saved successfully:', data);
      }
    } catch (error) {
      console.error('[BotExecutor] Error saving trade:', error);
    }
  }

  private async updateLastTrade(updateData: {
    exit_price?: number;
    status: string;
    close_time?: string;
    pnl?: number;
  }) {
    try {
      if (!supabase) {
        console.error('Supabase client not initialized');
        return;
      }
      
      console.log('[BotExecutor] Updating last trade:', updateData);
      
      // Tìm giao dịch mở cuối cùng của bot này
      const { data: lastTrade, error: fetchError } = await supabase
        .from('trades')
        .select('*')
        .eq('bot_id', this.bot.id)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !lastTrade) {
        console.error('[BotExecutor] No open trade found to update:', fetchError);
        return;
      }

      // Cập nhật giao dịch
      const { error: updateError } = await supabase
        .from('trades')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', lastTrade.id);

      if (updateError) {
        console.error('[BotExecutor] Error updating trade:', updateError);
      } else {
        console.log('[BotExecutor] Trade updated successfully');
      }
    } catch (error) {
      console.error('[BotExecutor] Error updating trade:', error);
    }
  }

  private async checkRealPosition(): Promise<boolean> {
    try {
      // Lấy thông tin position từ Binance
      const balanceRes = await fetch(`${API_BASE_URL}/api/trading/binance/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: this.bot.config.account.apiKey,
          apiSecret: this.bot.config.account.apiSecret,
          isTestnet: this.bot.config.account.testnet,
        })
      });

      if (!balanceRes.ok) return false;
      
      const balanceData = await balanceRes.json();
      const btcBalance = parseFloat(balanceData.BTC || '0');
      
      console.log('[BotExecutor] BTC balance from Binance:', btcBalance);
      return btcBalance > 0.0001; // Có position nếu BTC > 0.0001
      
    } catch (error) {
      console.error('[BotExecutor] Error checking real position:', error);
      return false;
    }
  }

  // Thêm hàm log indicator
  private async logIndicator(indicator: string, value: number) {
    if (!this.bot?.id) return;
    try {
      console.log('[BotExecutor] Ghi log indicator:', indicator, value);
      if (!supabase) {
        console.error('Supabase client not initialized');
        return;
      }
      await supabase
        .from('bot_indicator_logs')
        .insert({
          bot_id: this.bot.id,
          indicator,
          value,
          time: new Date().toISOString()
        });
    } catch (err) {
      console.error('[BotExecutor] Lỗi ghi log indicator:', err);
    }
  }
} 