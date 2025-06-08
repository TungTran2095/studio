import { Strategy, Signal, OHLCV } from '../types';

export class MACrossover implements Strategy {
  public name = 'Moving Average Crossover';
  public parameters: Record<string, any>;

  private fastPeriod: number;
  private slowPeriod: number;
  private quantity: number;

  constructor(fastPeriod: number = 10, slowPeriod: number = 20, quantity: number = 1) {
    this.fastPeriod = fastPeriod;
    this.slowPeriod = slowPeriod;
    this.quantity = quantity;
    this.parameters = {
      fastPeriod,
      slowPeriod,
      quantity
    };
  }

  private calculateMA(data: number[], period: number): number[] {
    const ma: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        ma.push(0);
        continue;
      }
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      ma.push(sum / period);
    }
    return ma;
  }

  public calculateSignals(data: OHLCV[]): Signal[] {
    const signals: Signal[] = [];
    const closes = data.map(d => d.close);
    
    const fastMA = this.calculateMA(closes, this.fastPeriod);
    const slowMA = this.calculateMA(closes, this.slowPeriod);

    let position = 0;

    for (let i = this.slowPeriod; i < data.length; i++) {
      const currentFastMA = fastMA[i];
      const currentSlowMA = slowMA[i];
      const previousFastMA = fastMA[i - 1];
      const previousSlowMA = slowMA[i - 1];

      // Buy signal: Fast MA crosses above Slow MA
      if (previousFastMA <= previousSlowMA && currentFastMA > currentSlowMA) {
        if (position <= 0) {
          signals.push({
            timestamp: data[i].timestamp,
            type: 'BUY',
            price: data[i].close,
            quantity: this.quantity
          });
          position = 1;
        }
      }
      // Sell signal: Fast MA crosses below Slow MA
      else if (previousFastMA >= previousSlowMA && currentFastMA < currentSlowMA) {
        if (position >= 0) {
          signals.push({
            timestamp: data[i].timestamp,
            type: 'SELL',
            price: data[i].close,
            quantity: this.quantity
          });
          position = -1;
        }
      }
    }

    return signals;
  }
} 