#!/usr/bin/env python3
"""
Test script để kiểm tra patch_backtest_runner với dữ liệu mock
"""

import sys
import os
import json
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Add parent directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def generate_mock_data():
    """Generate mock OHLCV data for testing"""
    dates = pd.date_range(start='2023-01-01', end='2023-01-02', freq='1H')
    np.random.seed(42)
    
    # Generate price data
    base_price = 50000
    returns = np.random.normal(0.0001, 0.02, len(dates))
    
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
            'low': low,
            'close': price,
            'volume': volume
        })
    
    df = pd.DataFrame(data)
    df.set_index('open_time', inplace=True)
    return df

def test_ichimoku_strategy_directly():
    """Test ichimoku strategy directly with mock data"""
    try:
        print("Testing Ichimoku Strategy Directly...")
        
        # Import strategy
        from backtest_strategies.ichimoku_strategy import IchimokuStrategy
        
        # Generate mock data
        data = generate_mock_data()
        print(f"Generated {len(data)} data points")
        
        # Create config
        config = {
            'strategy': {
                'type': 'ichimoku',
                'parameters': {
                    'tenkan_period': 9,
                    'kijun_period': 26
                }
            },
            'trading': {
                'symbol': 'BTCUSDT',
                'timeframe': '1h',
                'initialCapital': 10000,
                'positionSize': 1.0
            },
            'riskManagement': {
                'stopLoss': 2.0,
                'takeProfit': 4.0,
                'maxPositions': 1,
                'maxDrawdown': 10.0
            }
        }
        
        # Initialize strategy
        strategy = IchimokuStrategy(config)
        print("✅ Strategy initialized successfully")
        
        # Generate signals
        signals = strategy.generate_signals(data)
        print("✅ Signals generated successfully")
        
        # Check signals
        signal_counts = signals['signal'].value_counts()
        print(f"Signal distribution:\n{signal_counts}")
        
        # Check indicators
        print("\nIndicators available:")
        for col in signals.columns:
            if col not in ['open', 'high', 'low', 'close', 'volume', 'signal']:
                print(f"  - {col}: {signals[col].notna().sum()} values")
        
        print("\n✅ Ichimoku strategy test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error testing ichimoku strategy: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_ichimoku_strategy_directly()

