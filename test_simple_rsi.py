#!/usr/bin/env python3
"""
Test case đơn giản để kiểm tra RSI strategy
"""

import pandas as pd
import numpy as np
import sys
import os

# Add scripts directory to Python path
sys.path.append('scripts')

from backtest_strategies.rsi_strategy import RSIStrategy

def create_simple_test_data():
    """Tạo dữ liệu test đơn giản với RSI pattern rõ ràng"""
    dates = pd.date_range('2024-01-01', periods=50, freq='1H')
    
    # Tạo giá với pattern: giảm -> tăng -> giảm
    prices = []
    for i in range(50):
        if i < 20:
            prices.append(100 - i * 1)  # Giảm dần -> RSI thấp
        elif i < 35:
            prices.append(80 + (i - 20) * 2)  # Tăng dần -> RSI cao
        else:
            prices.append(110 - (i - 35) * 1.5)  # Giảm lại -> RSI thấp
    
    data = pd.DataFrame({
        'open': prices,
        'high': [p + 0.5 for p in prices],
        'low': [p - 0.5 for p in prices],
        'close': prices,
        'volume': [1000] * 50
    }, index=dates)
    
    return data

def test_simple_rsi():
    """Test RSI Strategy với dữ liệu đơn giản"""
    print("=== Testing Simple RSI Strategy ===")
    
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
    
    print(f"Data shape: {signals.shape}")
    print(f"Columns: {signals.columns.tolist()}")
    
    # Show RSI values
    print(f"\nRSI Values:")
    for i in range(len(signals)):
        if not pd.isna(signals.iloc[i]['rsi']):
            print(f"  {i}: {signals.iloc[i]['rsi']:.2f}")
    
    # Show signal distribution
    buy_signals = signals[signals['signal'] == 1]
    sell_signals = signals[signals['signal'] == -1]
    
    print(f"\nSignal distribution:")
    print(f"Buy signals: {len(buy_signals)}")
    print(f"Sell signals: {len(sell_signals)}")
    
    if len(buy_signals) > 0:
        print(f"\nBuy signals:")
        for idx in buy_signals.index:
            rsi_val = buy_signals.loc[idx, 'rsi']
            print(f"  {idx}: RSI = {rsi_val:.2f}")
    
    if len(sell_signals) > 0:
        print(f"\nSell signals:")
        for idx in sell_signals.index:
            rsi_val = sell_signals.loc[idx, 'rsi']
            print(f"  {idx}: RSI = {rsi_val:.2f}")
    
    # Show signal order
    all_signals = signals[signals['signal'] != 0]
    print(f"\nSignal order:")
    for idx in all_signals.index:
        signal_type = "BUY" if all_signals.loc[idx, 'signal'] == 1 else "SELL"
        rsi_val = all_signals.loc[idx, 'rsi']
        print(f"  {idx}: {signal_type} (RSI = {rsi_val:.2f})")
    
    # Test backtest
    result = strategy.run_backtest(data)
    
    print(f"\n=== BACKTEST RESULTS ===")
    print(f"Total trades: {result['performance']['total_trades']}")
    print(f"Win rate: {result['performance']['win_rate']:.2f}%")
    print(f"Total return: {result['performance']['total_return']:.2f}%")
    
    # Show trades
    if result['trades']:
        print(f"\n=== TRADES ===")
        for i, trade in enumerate(result['trades']):
            print(f"Trade {i+1}:")
            print(f"  Entry Time: {trade['entry_time']}")
            print(f"  Exit Time: {trade['exit_time']}")
            print(f"  Entry: {trade['entry_price']:.2f}")
            print(f"  Exit: {trade['exit_price']:.2f}")
            print(f"  P&L: {trade['pnl']:.2f}")
            print(f"  Reason: {trade['exit_reason']}")
            # Check for RSI values
            entry_rsi = trade.get('entry_rsi', 'N/A')
            exit_rsi = trade.get('exit_rsi', 'N/A')
            print(f"  Entry RSI: {entry_rsi}")
            print(f"  Exit RSI: {exit_rsi}")
            print()
    else:
        print(f"\nNo trades generated!")
    
    return result

if __name__ == "__main__":
    test_simple_rsi() 