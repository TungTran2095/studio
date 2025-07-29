#!/usr/bin/env python3
"""
Test script để kiểm tra RSI strategy với indicator values
"""

import pandas as pd
import numpy as np
import sys
import os

# Add scripts directory to Python path
sys.path.append('scripts')

from backtest_strategies.rsi_strategy import RSIStrategy

def create_test_data():
    """Tạo dữ liệu test với RSI values rõ ràng"""
    dates = pd.date_range('2024-01-01', periods=100, freq='1H')
    
    # Tạo giá với RSI pattern rõ ràng
    prices = []
    for i in range(100):
        if i < 30:
            prices.append(100 - i * 0.5)  # Giảm dần -> RSI thấp
        elif i < 60:
            prices.append(85 + (i - 30) * 0.8)  # Tăng dần -> RSI cao
        else:
            prices.append(109 - (i - 60) * 0.6)  # Giảm lại -> RSI thấp
    
    data = pd.DataFrame({
        'open': prices,
        'high': [p + np.random.uniform(0, 1) for p in prices],
        'low': [p - np.random.uniform(0, 1) for p in prices],
        'close': prices,
        'volume': np.random.uniform(1000, 5000, 100)
    }, index=dates)
    
    return data

def test_rsi_strategy():
    """Test RSI Strategy với indicator values"""
    print("=== Testing RSI Strategy with Indicator Values ===")
    
    data = create_test_data()
    
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
    
    print(f"Data shape: {signals.shape}")
    print(f"Columns: {signals.columns.tolist()}")
    
    # Show RSI values
    print(f"\nRSI Values (first 20):")
    for i in range(20):
        if not pd.isna(signals.iloc[i]['rsi']):
            print(f"  {i}: {signals.iloc[i]['rsi']:.2f}")
    
    # Show signal distribution
    buy_signals = signals[signals['signal'] == 1]
    sell_signals = signals[signals['signal'] == -1]
    
    print(f"\nSignal distribution:")
    print(f"Buy signals: {len(buy_signals)}")
    print(f"Sell signals: {len(sell_signals)}")
    print(f"Total signals: {len(signals[signals['signal'] != 0])}")
    
    # Show RSI range
    rsi_values = signals['rsi'].dropna()
    print(f"RSI range: {rsi_values.min():.2f} - {rsi_values.max():.2f}")
    print(f"RSI values below 30: {len(rsi_values[rsi_values < 30])}")
    print(f"RSI values above 70: {len(rsi_values[rsi_values > 70])}")
    
    # Show signal details with RSI values
    if len(buy_signals) > 0:
        print(f"\nBuy signals with RSI values:")
        for idx in buy_signals.index:
            rsi_val = buy_signals.loc[idx, 'rsi']
            print(f"  {idx}: RSI = {rsi_val:.2f}")
    
    if len(sell_signals) > 0:
        print(f"\nSell signals with RSI values:")
        for idx in sell_signals.index:
            rsi_val = sell_signals.loc[idx, 'rsi']
            print(f"  {idx}: RSI = {rsi_val:.2f}")
    else:
        print(f"\nNo sell signals found!")
    
    # Test backtest
    result = strategy.run_backtest(data)
    
    print(f"\n=== BACKTEST RESULTS ===")
    print(f"Total trades: {result['performance']['total_trades']}")
    print(f"Win rate: {result['performance']['win_rate']:.2f}%")
    print(f"Total return: {result['performance']['total_return']:.2f}%")
    print(f"Max drawdown: {result['performance']['max_drawdown']:.2f}%")
    print(f"Final capital: {result['performance']['final_capital']:.2f}")
    
    # Show trades with RSI values
    if result['trades']:
        print(f"\n=== TRADES WITH RSI VALUES ===")
        for i, trade in enumerate(result['trades']):
            print(f"Trade {i+1}:")
            print(f"  Entry: {trade['entry_price']:.2f}")
            print(f"  Exit: {trade['exit_price']:.2f}")
            print(f"  P&L: {trade['pnl']:.2f}")
            print(f"  Reason: {trade['exit_reason']}")
            print(f"  All trade keys: {list(trade.keys())}")
            # Check for RSI values
            for key, value in trade.items():
                if 'rsi' in key.lower():
                    print(f"  {key}: {value}")
            # Show all values for debugging
            print(f"  All values:")
            for key, value in trade.items():
                print(f"    {key}: {value}")
            print()
    else:
        print(f"\nNo trades generated!")
    
    return result

if __name__ == "__main__":
    test_rsi_strategy() 