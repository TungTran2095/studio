#!/usr/bin/env python3
"""
Test script để kiểm tra việc import các chiến lược mới
"""

import sys
import os

# Add parent directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

print("Testing imports...")

try:
    print("1. Testing base strategy import...")
    from backtest_strategies.base_strategy import BaseStrategy
    print("   ✅ BaseStrategy imported successfully")
except Exception as e:
    print(f"   ❌ Error importing BaseStrategy: {e}")

try:
    print("2. Testing ichimoku strategy import...")
    from backtest_strategies.ichimoku_strategy import IchimokuStrategy
    print("   ✅ IchimokuStrategy imported successfully")
except Exception as e:
    print(f"   ❌ Error importing IchimokuStrategy: {e}")

try:
    print("3. Testing stochastic strategy import...")
    from backtest_strategies.stochastic_strategy import StochasticStrategy
    print("   ✅ StochasticStrategy imported successfully")
except Exception as e:
    print(f"   ❌ Error importing StochasticStrategy: {e}")

try:
    print("4. Testing williams_r strategy import...")
    from backtest_strategies.williams_r_strategy import WilliamsRStrategy
    print("   ✅ WilliamsRStrategy imported successfully")
except Exception as e:
    print(f"   ❌ Error importing WilliamsRStrategy: {e}")

try:
    print("5. Testing adx strategy import...")
    from backtest_strategies.adx_strategy import ADXStrategy
    print("   ✅ ADXStrategy imported successfully")
except Exception as e:
    print(f"   ❌ Error importing ADXStrategy: {e}")

try:
    print("6. Testing parabolic_sar strategy import...")
    from backtest_strategies.parabolic_sar_strategy import ParabolicSARStrategy
    print("   ✅ ParabolicSARStrategy imported successfully")
except Exception as e:
    print(f"   ❌ Error importing ParabolicSARStrategy: {e}")

try:
    print("7. Testing keltner_channel strategy import...")
    from backtest_strategies.keltner_channel_strategy import KeltnerChannelStrategy
    print("   ✅ KeltnerChannelStrategy imported successfully")
except Exception as e:
    print(f"   ❌ Error importing KeltnerChannelStrategy: {e}")

try:
    print("8. Testing vwap strategy import...")
    from backtest_strategies.vwap_strategy import VWAPStrategy
    print("   ✅ VWAPStrategy imported successfully")
except Exception as e:
    print(f"   ❌ Error importing VWAPStrategy: {e}")

print("\nTesting strategy map...")
try:
    from backtest_strategies.backtest_runner import run_backtest
    print("✅ Backtest runner imported successfully")
    
    # Test strategy map
    strategy_map = {
        'stochastic': StochasticStrategy,
        'williams_r': WilliamsRStrategy,
        'adx': ADXStrategy,
        'ichimoku': IchimokuStrategy,
        'parabolic_sar': ParabolicSARStrategy,
        'keltner_channel': KeltnerChannelStrategy,
        'vwap': VWAPStrategy
    }
    
    print("✅ Strategy map created successfully")
    print(f"Available strategies: {list(strategy_map.keys())}")
    
except Exception as e:
    print(f"❌ Error testing strategy map: {e}")

print("\nImport test completed!")

