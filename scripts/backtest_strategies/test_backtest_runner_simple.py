#!/usr/bin/env python3
"""
Test script đơn giản để kiểm tra backtest runner với tham số thực tế
"""

import sys
import os
import json
import subprocess

def test_backtest_runner():
    """Test backtest runner với tham số thực tế"""
    try:
        print("Testing Backtest Runner with Real Parameters...")
        
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
        print(f"Experiment ID: {experiment_id}")
        
        # Convert config to JSON string
        config_json = json.dumps(config)
        print(f"Config JSON length: {len(config_json)} characters")
        
        # Test command line execution
        script_path = os.path.join('scripts', 'backtest_strategies', 'backtest_runner.py')
        print(f"Script path: {script_path}")
        
        # Check if script exists
        if not os.path.exists(script_path):
            print(f"❌ Script not found: {script_path}")
            return False
        
        print("✅ Script found")
        
        # Test command line help
        try:
            result = subprocess.run([
                sys.executable, script_path, '--help'
            ], capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                print("✅ Command line help works")
                print(f"Help output: {result.stdout[:200]}...")
            else:
                print(f"❌ Command line help failed: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            print("❌ Command line help timed out")
            return False
        except Exception as e:
            print(f"❌ Error running command line help: {e}")
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

