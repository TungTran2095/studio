#!/usr/bin/env python3
"""
Test Script cho Urus Platform
Đây là script mẫu để test việc execute Python code trực tiếp
"""

import pandas as pd
import numpy as np
import json
import time
import sys
from datetime import datetime

def main():
    print("🚀 Bắt đầu test script...")
    print(f"📅 Thời gian: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🐍 Python version: {sys.version}")
    
    # Test pandas và numpy
    print("\n📊 Testing pandas và numpy...")
    data = pd.DataFrame({
        'timestamp': pd.date_range('2024-01-01', periods=100, freq='1H'),
        'price': 40000 + np.cumsum(np.random.randn(100) * 10),
        'volume': np.random.lognormal(5, 1, 100)
    })
    
    print(f"✅ Tạo DataFrame với {len(data)} rows")
    print(f"📈 Giá trung bình: ${data['price'].mean():.2f}")
    print(f"📊 Volume trung bình: {data['volume'].mean():.2f}")
    
    # Simulate training process
    print("\n🎯 Simulating model training...")
    for i in range(5):
        print(f"Epoch {i+1}/5 - loss: {0.1 - i*0.01:.3f}")
        time.sleep(0.5)  # Simulate processing time
    
    # Results
    results = {
        'success': True,
        'message': 'Test script completed successfully',
        'data_points': len(data),
        'avg_price': float(data['price'].mean()),
        'avg_volume': float(data['volume'].mean()),
        'training_epochs': 5,
        'final_loss': 0.06
    }
    
    print("\n✅ Test completed!")
    print("📋 Kết quả:")
    print(json.dumps(results, indent=2))
    
    # Output JSON cho API
    print(json.dumps(results))

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'message': f'Script failed: {str(e)}'
        }
        print(f"❌ Error: {str(e)}")
        print(json.dumps(error_result))
        sys.exit(1) 