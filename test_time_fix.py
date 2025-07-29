#!/usr/bin/env python3
"""
Test đơn giản để kiểm tra thời gian entry/exit
"""

import pandas as pd
import numpy as np
import sys
import os

# Add scripts directory to Python path
sys.path.append('scripts')

from backtest_strategies.rsi_strategy import RSIStrategy

def create_simple_test_data():
    """Tạo dữ liệu test đơn giản"""
    dates = pd.date_range('2024-01-01', periods=40, freq='1H')
    
    # Tạo giá với pattern: giảm -> tăng -> giảm
    prices = []
    for i in range(40):
        if i < 20:
            prices.append(100 - i * 1.5)  # Giảm dần -> RSI thấp
        elif i < 30:
            prices.append(70 + (i - 20) * 2.5)  # Tăng dần -> RSI cao
        else:
            prices.append(95 - (i - 30) * 1.2)  # Giảm lại -> RSI thấp
    
    data = pd.DataFrame({
        'open': prices,
        'high': [p + 0.5 for p in prices],
        'low': [p - 0.5 for p in prices],
        'close': prices,
        'volume': [1000] * 40
    }, index=dates)
    
    return data

def test_time_fix():
    """Test thời gian entry/exit"""
    print("=== Testing Time Fix ===")
    
    data = create_simple_test_data()
    
    config = {
        'strategy': {
            'parameters': {
                'period': 14,
                'overbought': 70,
                'oversold': 30
            }
        },
        'trading': {
            'symbol': 'BTCUSDT',
            'timeframe': '1h',
            'initialCapital': 10000,
            'positionSize': 1
        },
        'riskManagement': {
            'stopLoss': 2,
            'takeProfit': 4,
            'maxPositions': 1
        }
    }
    
    strategy = RSIStrategy(config)
    
    # Generate signals
    signals = strategy.generate_signals(data)
    
    # Show signal order
    all_signals = signals[signals['signal'] != 0]
    print(f"Signal order:")
    for idx in all_signals.index:
        signal_type = "BUY" if all_signals.loc[idx, 'signal'] == 1 else "SELL"
        rsi_val = all_signals.loc[idx, 'rsi']
        print(f"  {idx}: {signal_type} (RSI = {rsi_val:.2f})")
    
    # Test backtest
    result = strategy.run_backtest(data)
    
    print(f"\nTotal trades: {result['performance']['total_trades']}")
    
    # Show trades
    if result['trades']:
        print(f"\nTrades:")
        for i, trade in enumerate(result['trades']):
            print(f"Trade {i+1}:")
            print(f"  Entry Time: {trade['entry_time']}")
            print(f"  Exit Time: {trade['exit_time']}")
            print(f"  Entry Price: {trade['entry_price']:.2f}")
            print(f"  Exit Price: {trade['exit_price']:.2f}")
            print(f"  Entry RSI: {trade.get('entry_rsi', 'N/A')}")
            print(f"  Exit RSI: {trade.get('exit_rsi', 'N/A')}")
            print(f"  Reason: {trade['exit_reason']}")
            print()
    else:
        print(f"\nNo trades generated!")
    
    return result

if __name__ == "__main__":
    test_time_fix() 