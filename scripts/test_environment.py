#!/usr/bin/env python3
"""
Test script to check Python environment and dependencies
"""

import sys
import json
from datetime import datetime

def test_imports():
    """Test importing required libraries"""
    results = {}
    
    # Core libraries
    try:
        import numpy as np
        results['numpy'] = {'status': 'OK', 'version': np.__version__}
    except ImportError as e:
        results['numpy'] = {'status': 'MISSING', 'error': str(e)}
    
    try:
        import pandas as pd
        results['pandas'] = {'status': 'OK', 'version': pd.__version__}
    except ImportError as e:
        results['pandas'] = {'status': 'MISSING', 'error': str(e)}
    
    try:
        import sklearn
        results['scikit-learn'] = {'status': 'OK', 'version': sklearn.__version__}
    except ImportError as e:
        results['scikit-learn'] = {'status': 'MISSING', 'error': str(e)}
    
    # Optional: Supabase
    try:
        from supabase import create_client
        results['supabase'] = {'status': 'OK', 'version': 'Available'}
    except ImportError as e:
        results['supabase'] = {'status': 'MISSING', 'error': str(e)}
    
    return results

def main():
    print(f"[{datetime.now().isoformat()}] [INFO] [test] 🐍 Testing Python environment...")
    
    # Test Python version
    python_version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    print(f"[{datetime.now().isoformat()}] [INFO] [test] Python version: {python_version}")
    
    # Test imports
    import_results = test_imports()
    
    for lib, result in import_results.items():
        status_icon = "✅" if result['status'] == 'OK' else "❌"
        version_info = f" (v{result['version']})" if result['status'] == 'OK' else f" - {result['error']}"
        print(f"[{datetime.now().isoformat()}] [INFO] [test] {status_icon} {lib}{version_info}")
    
    # Check if basic ML training would work
    missing_critical = [lib for lib, result in import_results.items() 
                       if result['status'] == 'MISSING' and lib in ['numpy', 'pandas', 'scikit-learn']]
    
    if missing_critical:
        print(f"[{datetime.now().isoformat()}] [ERROR] [test] ❌ Missing critical libraries: {missing_critical}")
        print(f"[{datetime.now().isoformat()}] [ERROR] [test] Install with: pip install {' '.join(missing_critical)}")
        result = {
            'success': False,
            'error': f'Missing critical libraries: {missing_critical}',
            'python_version': python_version,
            'import_results': import_results
        }
    else:
        print(f"[{datetime.now().isoformat()}] [INFO] [test] ✅ Environment check passed!")
        result = {
            'success': True,
            'message': 'Environment check passed',
            'python_version': python_version,
            'import_results': import_results
        }
    
    # Output final result as JSON (for API consumption)
    print(json.dumps(result))

if __name__ == "__main__":
    main() 