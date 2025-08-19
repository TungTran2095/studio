#!/usr/bin/env python3
"""
Test script đơn giản để kiểm tra việc import các chiến lược
"""

import sys
import os

print("Current working directory:", os.getcwd())
print("Python path:", sys.path)

try:
    print("\n1. Testing base strategy import...")
    from base_strategy import BaseStrategy
    print("   ✅ BaseStrategy imported successfully")
except Exception as e:
    print(f"   ❌ Error importing BaseStrategy: {e}")

try:
    print("\n2. Testing ichimoku strategy import...")
    from ichimoku_strategy import IchimokuStrategy
    print("   ✅ IchimokuStrategy imported successfully")
except Exception as e:
    print(f"   ❌ Error importing IchimokuStrategy: {e}")

try:
    print("\n3. Testing stochastic strategy import...")
    from stochastic_strategy import StochasticStrategy
    print("   ✅ StochasticStrategy imported successfully")
except Exception as e:
    print(f"   ❌ Error importing StochasticStrategy: {e}")

try:
    print("\n4. Testing rsi strategy import...")
    from rsi_strategy import RSIStrategy
    print("   ✅ RSIStrategy imported successfully")
except Exception as e:
    print(f"   ❌ Error importing RSIStrategy: {e}")

print("\nImport test completed!")

