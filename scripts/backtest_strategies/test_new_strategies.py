#!/usr/bin/env python3
"""
Test script để kiểm tra các chiến lược backtest mới
"""

import pandas as pd
import numpy as np
import sys
import os
from datetime import datetime, timedelta

# Add parent directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import các chiến lược
from backtest_strategies import (
    StochasticStrategy, WilliamsRStrategy, ADXStrategy, 
    IchimokuStrategy, ParabolicSARStrategy, KeltnerChannelStrategy, VWAPStrategy
)

def create_sample_data(n_days=100):
    """Tạo dữ liệu mẫu để test"""
    np.random.seed(42)
    
    # Tạo dữ liệu OHLCV mẫu
    dates = pd.date_range(start='2023-01-01', periods=n_days, freq='D')
    
    # Tạo giá mẫu với xu hướng tăng
    base_price = 100
    returns = np.random.normal(0.001, 0.02, n_days)
    prices = [base_price]
    
    for ret in returns[1:]:
        prices.append(prices[-1] * (1 + ret))
    
    # Tạo OHLCV
    data = []
    for i, (date, close) in enumerate(zip(dates, prices)):
        # Tạo high, low, open từ close
        volatility = abs(returns[i]) * 2
        high = close * (1 + volatility)
        low = close * (1 - volatility)
        open_price = prices[i-1] if i > 0 else close
        
        # Tạo volume
        volume = np.random.randint(1000, 10000)
        
        data.append({
            'open': open_price,
            'high': high,
            'low': low,
            'close': close,
            'volume': volume
        })
    
    df = pd.DataFrame(data, index=dates)
    return df

def test_strategy(strategy_class, strategy_name, config):
    """Test một chiến lược cụ thể"""
    print(f"\n{'='*50}")
    print(f"Testing {strategy_name}")
    print(f"{'='*50}")
    
    try:
        # Tạo dữ liệu mẫu
        data = create_sample_data(50)
        print(f"Created sample data: {len(data)} records")
        
        # Khởi tạo chiến lược
        strategy = strategy_class(config)
        print(f"Strategy initialized: {strategy.__class__.__name__}")
        
        # Generate signals
        signals = strategy.generate_signals(data)
        print(f"Signals generated: {len(signals)} records")
        
        # Kiểm tra signals
        buy_signals = (signals['signal'] == 1).sum()
        sell_signals = (signals['signal'] == -1).sum()
        print(f"Buy signals: {buy_signals}, Sell signals: {sell_signals}")
        
        # Chạy backtest
        results = strategy.run_backtest(data)
        print(f"Backtest completed")
        
        # Hiển thị kết quả
        performance = results['performance']
        print(f"Total return: {performance['total_return']:.2f}%")
        print(f"Sharpe ratio: {performance['sharpe_ratio']:.2f}")
        print(f"Max drawdown: {performance['max_drawdown']:.2f}%")
        print(f"Total trades: {performance['total_trades']}")
        print(f"Win rate: {performance['win_rate']:.2f}%")
        
        return True
        
    except Exception as e:
        print(f"Error testing {strategy_name}: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Test tất cả các chiến lược mới"""
    print("Testing New Backtest Strategies")
    print("="*50)
    
    # Cấu hình cơ bản
    base_config = {
        'trading': {
            'symbol': 'BTCUSDT',
            'timeframe': '1d',
            'initialCapital': 10000,
            'positionSize': 0.1
        },
        'riskManagement': {
            'stopLoss': 2.0,
            'takeProfit': 4.0,
            'maxPositions': 1,
            'maxDrawdown': 10.0,
            'trailingStop': True,
            'trailingStopDistance': 1.0,
            'prioritizeStoploss': True,
            'useTakeProfit': True
        },
        'strategy': {}
    }
    
    # Danh sách các chiến lược để test
    strategies_to_test = [
        (StochasticStrategy, 'Stochastic Strategy', {
            **base_config,
            'strategy': {
                'k_period': 14,
                'd_period': 3,
                'overbought': 80,
                'oversold': 20,
                'smooth_k': 3,
                'smooth_d': 3
            }
        }),
        (WilliamsRStrategy, 'Williams %R Strategy', {
            **base_config,
            'strategy': {
                'period': 14,
                'overbought': -20,
                'oversold': -80,
                'confirmation_periods': 2
            }
        }),
        (ADXStrategy, 'ADX Strategy', {
            **base_config,
            'strategy': {
                'adx_period': 14,
                'di_period': 14,
                'adx_threshold': 25,
                'trend_strength': 30
            }
        }),
        (IchimokuStrategy, 'Ichimoku Strategy', {
            **base_config,
            'strategy': {
                'tenkan_period': 9,
                'kijun_period': 26,
                'senkou_span_b_period': 52,
                'displacement': 26,
                'confirmation_periods': 2
            }
        }),
        (ParabolicSARStrategy, 'Parabolic SAR Strategy', {
            **base_config,
            'strategy': {
                'acceleration': 0.02,
                'maximum': 0.2,
                'confirmation_periods': 1
            }
        }),
        (KeltnerChannelStrategy, 'Keltner Channel Strategy', {
            **base_config,
            'strategy': {
                'ema_period': 20,
                'atr_period': 10,
                'multiplier': 2.0,
                'confirmation_periods': 2
            }
        }),
        (VWAPStrategy, 'VWAP Strategy', {
            **base_config,
            'strategy': {
                'vwap_period': 20,
                'std_dev_multiplier': 2.0,
                'volume_threshold': 1.5,
                'confirmation_periods': 2
            }
        })
    ]
    
    # Test từng chiến lược
    results = []
    for strategy_class, strategy_name, config in strategies_to_test:
        success = test_strategy(strategy_class, strategy_name, config)
        results.append((strategy_name, success))
    
    # Tóm tắt kết quả
    print(f"\n{'='*50}")
    print("TEST SUMMARY")
    print(f"{'='*50}")
    
    successful = sum(1 for _, success in results if success)
    total = len(results)
    
    for strategy_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{strategy_name}: {status}")
    
    print(f"\nOverall: {successful}/{total} strategies passed")
    
    if successful == total:
        print("🎉 All strategies are working correctly!")
    else:
        print("⚠️  Some strategies have issues. Check the logs above.")

if __name__ == "__main__":
    main()

