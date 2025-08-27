export class BotLogger {
  private static instance: BotLogger;
  private logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' = 'DEBUG';
  private enableConsole: boolean = true;
  private enableFile: boolean = false;
  private logBuffer: string[] = [];
  private maxBufferSize: number = 1000;

  private constructor() {}

  static getInstance(): BotLogger {
    if (!BotLogger.instance) {
      BotLogger.instance = new BotLogger();
    }
    return BotLogger.instance;
  }

  setLogLevel(level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'): void {
    this.logLevel = level;
  }

  setConsoleLogging(enabled: boolean): void {
    this.enableConsole = enabled;
  }

  setFileLogging(enabled: boolean): void {
    this.enableFile = enabled;
  }

  private shouldLog(level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'): boolean {
    const levels = { 'DEBUG': 0, 'INFO': 1, 'WARN': 2, 'ERROR': 3 };
    return levels[level] >= levels[this.logLevel];
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const formattedData = data ? ` | Data: ${JSON.stringify(data, null, 2)}` : '';
    return `[${timestamp}] [${level}] ${message}${formattedData}`;
  }

  private addToBuffer(message: string): void {
    this.logBuffer.push(message);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog('DEBUG')) {
      const formattedMessage = this.formatMessage('DEBUG', message, data);
      if (this.enableConsole) {
        console.log(`🔍 ${formattedMessage}`);
      }
      this.addToBuffer(formattedMessage);
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog('INFO')) {
      const formattedMessage = this.formatMessage('INFO', message, data);
      if (this.enableConsole) {
        console.log(`ℹ️ ${formattedMessage}`);
      }
      this.addToBuffer(formattedMessage);
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog('WARN')) {
      const formattedMessage = this.formatMessage('WARN', message, data);
      if (this.enableConsole) {
        console.warn(`⚠️ ${formattedMessage}`);
      }
      this.addToBuffer(formattedMessage);
    }
  }

  error(message: string, data?: any): void {
    if (this.shouldLog('ERROR')) {
      const formattedMessage = this.formatMessage('ERROR', message, data);
      if (this.enableConsole) {
        console.error(`❌ ${formattedMessage}`);
      }
      this.addToBuffer(formattedMessage);
    }
  }

  // Bot-specific logging methods
  botStart(botName: string, botId: string, config: any): void {
    this.info(`🚀 Bot started`, { botName, botId, config });
  }

  botStop(botName: string, botId: string, reason?: string): void {
    this.info(`🛑 Bot stopped`, { botName, botId, reason });
  }

  botStatus(botName: string, botId: string, status: string): void {
    this.info(`📊 Bot status changed`, { botName, botId, status });
  }

  signalGenerated(botName: string, symbol: string, signal: string, data: any): void {
    this.info(`🎯 Signal generated`, { botName, symbol, signal, data });
  }

  tradeExecuted(botName: string, symbol: string, side: string, quantity: number, price: number): void {
    this.info(`💰 Trade executed`, { botName, symbol, side, quantity, price });
  }

  tradeFailed(botName: string, symbol: string, side: string, error: string): void {
    this.error(`💥 Trade failed`, { botName, symbol, side, error });
  }

  balanceUpdate(botName: string, symbol: string, balance: any): void {
    this.debug(`💵 Balance updated`, { botName, symbol, balance });
  }

  positionUpdate(botName: string, symbol: string, position: any): void {
    this.debug(`📈 Position updated`, { botName, symbol, position });
  }

  strategyExecution(botName: string, strategy: string, result: any): void {
    this.debug(`🧠 Strategy executed`, { botName, strategy, result });
  }

  apiCall(botName: string, endpoint: string, params: any, response: any): void {
    this.debug(`🌐 API call`, { botName, endpoint, params, response });
  }

  errorOccurred(botName: string, error: Error, context: string): void {
    this.error(`💥 Error occurred`, { botName, error: error.message, stack: error.stack, context });
  }

  // Get all logs
  getLogs(): string[] {
    return [...this.logBuffer];
  }

  // Clear logs
  clearLogs(): void {
    this.logBuffer = [];
  }

  // Export logs to string
  exportLogs(): string {
    return this.logBuffer.join('\n');
  }
}

export const botLogger = BotLogger.getInstance();
