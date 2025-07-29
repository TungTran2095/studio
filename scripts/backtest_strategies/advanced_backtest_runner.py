#!/usr/bin/env python3
"""
Advanced Backtest Runner - Sử dụng logic đúng: chỉ bán khi có sell signal
"""

import pandas as pd
import numpy as np
import json
import os
import sys
import argparse
from datetime import datetime, timedelta
from typing import Dict, Any

# Add current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from rsi_strategy import RSIStrategy
from ma_crossover_strategy import MACrossoverStrategy
from macd_strategy import MACDStrategy
from bollinger_bands_strategy import BollingerBandsStrategy
from breakout_strategy import BreakoutStrategy

def generate_sample_data(days: int = 365) -> pd.DataFrame:
    """Generate sample OHLCV data for testing"""
    print(f"Generating {days} days of sample data...")
    
    # Generate dates
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    dates = pd.date_range(start=start_date, end=end_date, freq='1H')
    
    # Generate price data with some trend and volatility
    np.random.seed(42)  # For reproducible results
    
    # Start with a base price
    base_price = 50000  # BTC price around $50k
    
    # Generate price movements
    returns = np.random.normal(0.0001, 0.02, len(dates))  # Small positive drift, 2% volatility
    
    # Add some trend
    trend = np.linspace(0, 0.1, len(dates))  # 10% upward trend over the period
    returns += trend / len(dates)
    
    # Generate prices
    prices = [base_price]
    for ret in returns[1:]:
        prices.append(prices[-1] * (1 + ret))
    
    # Generate OHLCV data
    data = []
    for i, (date, price) in enumerate(zip(dates, prices)):
        # Generate OHLC from price
        volatility = 0.01  # 1% intraday volatility
        
        open_price = price * (1 + np.random.normal(0, volatility/4))
        high_price = max(open_price, price) * (1 + abs(np.random.normal(0, volatility/2)))
        low_price = min(open_price, price) * (1 - abs(np.random.normal(0, volatility/2)))
        close_price = price
        
        # Generate volume
        base_volume = 1000
        volume = base_volume * (1 + np.random.normal(0, 0.5))
        volume = max(volume, 100)  # Minimum volume
        
        data.append({
            'open_time': date,
            'open': open_price,
            'high': high_price,
            'low': low_price,
            'close': close_price,
            'volume': volume
        })
    
    df = pd.DataFrame(data)
    df.set_index('open_time', inplace=True)
    
    print(f"Generated {len(df)} data points")
    return df

def run_advanced_backtest(data: pd.DataFrame, config: Dict[str, Any]) -> Dict[str, Any]:
    """Run advanced backtest with correct logic: only sell on sell signal"""
    print("Running Advanced Backtest with correct logic...")
    
    # Strategy mapping
    strategy_map = {
        'rsi': RSIStrategy,
        'ma_crossover': MACrossoverStrategy,
        'macd': MACDStrategy,
        'bollinger_bands': BollingerBandsStrategy,
        'breakout': BreakoutStrategy
    }
    
    # Get strategy type
    strategy_type = config.get('strategy', {}).get('type', 'rsi')
    
    if strategy_type not in strategy_map:
        raise ValueError(f"Strategy type '{strategy_type}' not supported")
    
    # Initialize strategy
    StrategyClass = strategy_map[strategy_type]
    strategy = StrategyClass(config)
    
    # Run backtest using the corrected base_strategy logic
    results = strategy.run_backtest(data)
    
    # Add additional metrics
    results['strategy_type'] = strategy_type
    
    # Convert timestamps to strings for JSON serialization
    if 'trades' in results:
        for trade in results['trades']:
            if 'entry_time' in trade:
                trade['entry_time'] = str(trade['entry_time'])
            if 'exit_time' in trade:
                trade['exit_time'] = str(trade['exit_time'])
    
    return results

def main():
    parser = argparse.ArgumentParser(description='Advanced Backtest Runner')
    parser.add_argument('--experiment_id', required=True, help='Experiment ID')
    parser.add_argument('--config', required=True, help='Configuration JSON')
    parser.add_argument('--sample', action='store_true', help='Use sample configuration')
    
    args = parser.parse_args()
    
    try:
        # Parse config - check if it's a file path or JSON string
        if os.path.exists(args.config):
            with open(args.config, 'r') as f:
                config = json.load(f)
        else:
            config = json.loads(args.config)
        
        # Generate sample data
        data = generate_sample_data(365)
        
        # Run backtest
        results = run_advanced_backtest(data, config)
        
        # Print results as JSON
        print(json.dumps(results))
        
    except Exception as e:
        error_result = {
            'error': str(e),
            'experiment_id': args.experiment_id
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main() 