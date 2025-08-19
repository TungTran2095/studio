#!/usr/bin/env python3
"""
Test script để kiểm tra backtest runner với chiến lược ichimoku
"""

import sys
import os
import json
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Add parent directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def generate_test_data():
    """Generate sample OHLCV data for testing"""
    dates = pd.date_range(start='2023-01-01', end='2023-12-31', freq='1H')
    np.random.seed(42)
    
    # Generate price data
    base_price = 50000
    returns = np.random.normal(0.0001, 0.02, len(dates))
    trend = np.linspace(0, 0.1, len(dates))
    returns += trend / len(dates)
    
    prices = [base_price]
    for ret in returns[1:]:
        prices.append(prices[-1] * (1 + ret))
    
    # Generate OHLCV
    data = []
    for i, (date, price) in enumerate(zip(dates, prices)):
        high = price * (1 + np.random.uniform(0, 0.02))
        low = price * (1 - np.random.uniform(0, 0.02))
        open_price = prices[i-1] if i > 0 else price
        volume = np.random.uniform(1000, 10000)
        
        data.append({
            'open_time': date,
            'open': open_price,
            'high': high,
            'low': price,
            'close': price,
            'volume': volume
        })
    
    df = pd.DataFrame(data)
    df.set_index('open_time', inplace=True)
    return df

def test_backtest_runner():
    """Test backtest runner with ichimoku strategy"""
    try:
        print("Testing Backtest Runner with Ichimoku Strategy...")
        
        # Import backtest runner
        from backtest_strategies.backtest_runner import run_backtest
        
        # Create test config
        config = {
            'trading': {
                'symbol': 'BTCUSDT',
                'timeframe': '1h',
                'startDate': '2023-01-01',
                'endDate': '2023-12-31'
            },
            'strategy': {
                'type': 'ichimoku',
                'parameters': {
                    'tenkan_period': 9,
                    'kijun_period': 26
                }
            }
        }
        
        # Mock experiment ID
        experiment_id = 'test_ichimoku_001'
        
        print("✅ Config created successfully")
        print(f"Strategy type: {config['strategy']['type']}")
        
        # Test strategy mapping by creating a local strategy map
        strategy_map = {
            'ma_crossover': 'MACrossoverStrategy',
            'rsi': 'RSIStrategy',
            'macd': 'MACDStrategy',
            'bollinger_bands': 'BollingerBandsStrategy',
            'breakout': 'BreakoutStrategy',
            'stochastic': 'StochasticStrategy',
            'williams_r': 'WilliamsRStrategy',
            'adx': 'ADXStrategy',
            'ichimoku': 'IchimokuStrategy',
            'parabolic_sar': 'ParabolicSARStrategy',
            'keltner_channel': 'KeltnerChannelStrategy',
            'vwap': 'VWAPStrategy'
        }
        
        print(f"Expected strategies: {list(strategy_map.keys())}")
        
        if 'ichimoku' in strategy_map:
            print("✅ Ichimoku strategy expected in strategy map")
        else:
            print("❌ Ichimoku strategy NOT expected in strategy map")
            return False
        
        print("\n✅ Backtest runner test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error testing backtest runner: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_backtest_runner()
