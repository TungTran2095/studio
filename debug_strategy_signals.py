#!/usr/bin/env python3
"""
Debug script để kiểm tra cách strategy tạo signals
"""

import pandas as pd
import numpy as np
import sys
import os

# Add scripts directory to Python path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'scripts'))

from backtest_strategies.rsi_strategy import RSIStrategy
from backtest_strategies.ma_crossover_strategy import MACrossoverStrategy
from backtest_strategies.macd_strategy import MACDStrategy

def generate_test_data():
    """Generate test data with known patterns"""
    dates = pd.date_range('2025-01-01', periods=100, freq='1H')
    
    # Create price data with clear trends
    base_price = 50000
    prices = []
    
    for i in range(len(dates)):
        # Create a clear trend
        if i < 30:
            price = base_price + i * 100  # Upward trend
        elif i < 60:
            price = base_price + 3000 - (i - 30) * 100  # Downward trend
        else:
            price = base_price + (i - 60) * 50  # Sideways with small uptrend
        
        prices.append(price)
    
    df = pd.DataFrame({
        'open': prices,
        'high': [p * 1.01 for p in prices],
        'low': [p * 0.99 for p in prices],
        'close': prices,
        'volume': [1000] * len(prices)
    }, index=dates)
    
    return df

def test_strategy_signals():
    """Test how strategies generate signals"""
    print("=== Testing Strategy Signal Generation ===")
    
    # Generate test data
    data = generate_test_data()
    print(f"Generated {len(data)} data points")
    print(f"Date range: {data.index[0]} to {data.index[-1]}")
    
    # Test RSI Strategy
    print("\n--- Testing RSI Strategy ---")
    rsi_config = {
        'strategy': {
            'parameters': {
                'period': 14,
                'overbought': 70,
                'oversold': 30
            }
        }
    }
    
    rsi_strategy = RSIStrategy(rsi_config)
    rsi_signals = rsi_strategy.generate_signals(data)
    
    # Count signals
    buy_signals = (rsi_signals['signal'] == 1).sum()
    sell_signals = (rsi_signals['signal'] == -1).sum()
    
    print(f"RSI Buy signals: {buy_signals}")
    print(f"RSI Sell signals: {sell_signals}")
    
    # Show first few signals
    signal_points = rsi_signals[rsi_signals['signal'] != 0]
    print(f"First 5 signal points:")
    for i, (idx, row) in enumerate(signal_points.head().iterrows()):
        print(f"  {i+1}. {idx}: Signal={row['signal']}, Price={row['close']:.2f}, RSI={row['rsi']:.2f}")
    
    # Test MA Crossover Strategy
    print("\n--- Testing MA Crossover Strategy ---")
    ma_config = {
        'strategy': {
            'parameters': {
                'fastPeriod': 5,
                'slowPeriod': 10
            }
        }
    }
    
    ma_strategy = MACrossoverStrategy(ma_config)
    ma_signals = ma_strategy.generate_signals(data)
    
    # Count signals
    buy_signals = (ma_signals['signal'] == 1).sum()
    sell_signals = (ma_signals['signal'] == -1).sum()
    
    print(f"MA Buy signals: {buy_signals}")
    print(f"MA Sell signals: {sell_signals}")
    
    # Show first few signals
    signal_points = ma_signals[ma_signals['signal'] != 0]
    print(f"First 5 signal points:")
    for i, (idx, row) in enumerate(signal_points.head().iterrows()):
        print(f"  {i+1}. {idx}: Signal={row['signal']}, Price={row['close']:.2f}, Fast MA={row['fast_ma']:.2f}, Slow MA={row['slow_ma']:.2f}")
    
    # Test MACD Strategy
    print("\n--- Testing MACD Strategy ---")
    macd_config = {
        'strategy': {
            'parameters': {
                'fastEMA': 12,
                'slowEMA': 26,
                'signalPeriod': 9
            }
        }
    }
    
    macd_strategy = MACDStrategy(macd_config)
    macd_signals = macd_strategy.generate_signals(data)
    
    # Count signals
    buy_signals = (macd_signals['signal'] == 1).sum()
    sell_signals = (macd_signals['signal'] == -1).sum()
    
    print(f"MACD Buy signals: {buy_signals}")
    print(f"MACD Sell signals: {sell_signals}")
    
    # Show first few signals
    signal_points = macd_signals[macd_signals['signal'] != 0]
    print(f"First 5 signal points:")
    for i, (idx, row) in enumerate(signal_points.head().iterrows()):
        print(f"  {i+1}. {idx}: Signal={row['signal']}, Price={row['close']:.2f}, MACD={row['macd']:.2f}, Signal={row['signal']:.2f}")

if __name__ == "__main__":
    test_strategy_signals() 