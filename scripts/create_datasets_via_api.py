#!/usr/bin/env python3
"""
Create Sample Datasets via API
"""

import requests
import pandas as pd
import os
import json

def create_datasets_via_api():
    """Create sample datasets via API"""
    
    base_url = "http://localhost:9002"
    
    # Dataset 1: Crypto Price Data
    crypto_path = 'data/sample_datasets/crypto_price_data.csv'
    if os.path.exists(crypto_path):
        crypto_df = pd.read_csv(crypto_path)
        crypto_columns = crypto_df.columns.tolist()
        
        crypto_payload = {
            "name": "Crypto Price Data",
            "description": "Historical cryptocurrency price data with technical indicators for LSTM training",
            "file_path": crypto_path,
            "columns": crypto_columns,
            "rows": len(crypto_df),
            "file_size": os.path.getsize(crypto_path),
            "file_type": "csv"
        }
        
        try:
            response = requests.post(f"{base_url}/api/research/datasets", json=crypto_payload)
            if response.status_code == 200:
                print(f"✅ Created Crypto Price Data: {len(crypto_df)} rows, {len(crypto_columns)} columns")
            else:
                print(f"❌ Failed to create Crypto dataset: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"❌ Error creating Crypto dataset: {e}")
    
    # Dataset 2: Stock Features Data
    stock_path = 'data/sample_datasets/stock_features_data.csv'
    if os.path.exists(stock_path):
        stock_df = pd.read_csv(stock_path)
        stock_columns = stock_df.columns.tolist()
        
        stock_payload = {
            "name": "Stock Features Data",
            "description": "Stock market features with financial indicators for ML classification/regression",
            "file_path": stock_path,
            "columns": stock_columns,
            "rows": len(stock_df),
            "file_size": os.path.getsize(stock_path),
            "file_type": "csv"
        }
        
        try:
            response = requests.post(f"{base_url}/api/research/datasets", json=stock_payload)
            if response.status_code == 200:
                print(f"✅ Created Stock Features Data: {len(stock_df)} rows, {len(stock_columns)} columns")
            else:
                print(f"❌ Failed to create Stock dataset: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"❌ Error creating Stock dataset: {e}")
    
    # Test GET API
    try:
        response = requests.get(f"{base_url}/api/research/datasets")
        if response.status_code == 200:
            data = response.json()
            print(f"\n📊 Total datasets available: {data.get('count', 0)}")
            for dataset in data.get('datasets', []):
                print(f"   - {dataset['name']}: {dataset['rows']} rows, {len(dataset['columns'])} columns")
        else:
            print(f"❌ Failed to fetch datasets: {response.status_code}")
    except Exception as e:
        print(f"❌ Error fetching datasets: {e}")

if __name__ == "__main__":
    create_datasets_via_api() 