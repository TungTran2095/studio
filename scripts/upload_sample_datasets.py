#!/usr/bin/env python3
"""
Upload Sample Datasets to Supabase
"""

import os
import pandas as pd
import psycopg2
from datetime import datetime
import json

def upload_datasets_to_supabase():
    """Upload sample datasets to Supabase research_datasets table"""
    
    # Database connection
    db_config = {
        'host': os.getenv('SUPABASE_DB_HOST'),
        'port': os.getenv('SUPABASE_DB_PORT', 5432),
        'database': os.getenv('SUPABASE_DB_NAME'),
        'user': os.getenv('SUPABASE_DB_USER'),
        'password': os.getenv('SUPABASE_DB_PASSWORD')
    }
    
    try:
        conn = psycopg2.connect(**db_config)
        cursor = conn.cursor()
        
        # Dataset 1: Crypto Price Data
        crypto_path = 'data/sample_datasets/crypto_price_data.csv'
        if os.path.exists(crypto_path):
            crypto_df = pd.read_csv(crypto_path)
            crypto_columns = crypto_df.columns.tolist()
            
            cursor.execute("""
                INSERT INTO research_datasets (
                    name, description, file_path, columns, rows, 
                    file_size, file_type, status, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (name) DO UPDATE SET
                    description = EXCLUDED.description,
                    columns = EXCLUDED.columns,
                    rows = EXCLUDED.rows,
                    updated_at = EXCLUDED.updated_at
            """, (
                'Crypto Price Data',
                'Historical cryptocurrency price data with technical indicators for LSTM training',
                crypto_path,
                json.dumps(crypto_columns),
                len(crypto_df),
                os.path.getsize(crypto_path),
                'csv',
                'processed',
                datetime.now().isoformat(),
                datetime.now().isoformat()
            ))
            
            print(f"✅ Uploaded Crypto Price Data: {len(crypto_df)} rows, {len(crypto_columns)} columns")
        
        # Dataset 2: Stock Features Data
        stock_path = 'data/sample_datasets/stock_features_data.csv'
        if os.path.exists(stock_path):
            stock_df = pd.read_csv(stock_path)
            stock_columns = stock_df.columns.tolist()
            
            cursor.execute("""
                INSERT INTO research_datasets (
                    name, description, file_path, columns, rows, 
                    file_size, file_type, status, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (name) DO UPDATE SET
                    description = EXCLUDED.description,
                    columns = EXCLUDED.columns,
                    rows = EXCLUDED.rows,
                    updated_at = EXCLUDED.updated_at
            """, (
                'Stock Features Data',
                'Stock market features with financial indicators for ML classification/regression',
                stock_path,
                json.dumps(stock_columns),
                len(stock_df),
                os.path.getsize(stock_path),
                'csv',
                'processed',
                datetime.now().isoformat(),
                datetime.now().isoformat()
            ))
            
            print(f"✅ Uploaded Stock Features Data: {len(stock_df)} rows, {len(stock_columns)} columns")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print("\n🎉 All datasets uploaded successfully to Supabase!")
        print("📊 Available datasets:")
        print("   1. Crypto Price Data - for LSTM/time series models")
        print("   2. Stock Features Data - for ML classification/regression")
        
    except Exception as e:
        print(f"❌ Error uploading datasets: {e}")

if __name__ == "__main__":
    upload_datasets_to_supabase() 