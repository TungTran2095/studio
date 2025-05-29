#!/usr/bin/env python3
"""
Sample Dataset Creator - Urus Platform
Tạo sample datasets để test training functionality
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os

def create_crypto_price_dataset():
    """Tạo dataset giá crypto mẫu cho LSTM/time series models"""
    
    # Tạo 2 năm dữ liệu hàng giờ
    start_date = datetime.now() - timedelta(days=730)
    dates = pd.date_range(start_date, periods=17520, freq='1H')  # 730 days * 24 hours
    
    np.random.seed(42)
    
    # Simulate crypto price với trend và seasonality
    base_price = 40000
    trend = np.cumsum(np.random.normal(0, 0.001, len(dates))) * base_price
    seasonal = 1000 * np.sin(2 * np.pi * np.arange(len(dates)) / (24 * 7))  # Weekly seasonality
    noise = np.random.normal(0, 500, len(dates))
    
    price = base_price + trend + seasonal + noise
    price = np.maximum(price, 1000)  # Minimum price $1000
    
    # Tạo volume (correlation với price changes)
    price_changes = np.abs(np.diff(price, prepend=price[0]))
    volume = np.random.lognormal(10, 1, len(dates)) * (1 + price_changes / price * 10)
    
    # Tạo additional features
    high = price * (1 + np.random.uniform(0, 0.02, len(dates)))
    low = price * (1 - np.random.uniform(0, 0.02, len(dates)))
    open_price = price + np.random.normal(0, 100, len(dates))
    
    # Technical indicators
    returns = np.diff(price, prepend=price[0]) / price
    volatility = pd.Series(returns).rolling(24).std().fillna(0)  # 24h volatility
    price_series = pd.Series(price)
    sma_24h = price_series.rolling(24).mean().bfill()
    ema_12h = price_series.ewm(span=12).mean()
    
    # RSI (Relative Strength Index)
    delta = price_series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    rsi = rsi.fillna(50)
    
    # MACD
    ema_12 = price_series.ewm(span=12).mean()
    ema_26 = price_series.ewm(span=26).mean()
    macd = ema_12 - ema_26
    
    dataset = pd.DataFrame({
        'timestamp': dates,
        'open': open_price.round(2),
        'high': high.round(2),
        'low': low.round(2),
        'close': price.round(2),
        'volume': volume.round(0),
        'returns': returns.round(6),
        'volatility': volatility.round(6),
        'sma_24h': sma_24h.round(2),
        'ema_12h': ema_12h.round(2),
        'rsi': rsi.round(2),
        'macd': macd.round(2),
        'hour': dates.hour,
        'day_of_week': dates.dayofweek,
        'month': dates.month
    })
    
    return dataset

def create_stock_features_dataset():
    """Tạo dataset stock features cho ML models"""
    
    np.random.seed(42)
    n_samples = 5000
    
    # Fundamental features
    pe_ratio = np.random.lognormal(2.5, 0.8, n_samples)  # P/E ratio
    debt_to_equity = np.random.lognormal(0.5, 0.6, n_samples)
    roe = np.random.normal(0.12, 0.08, n_samples)  # Return on Equity
    revenue_growth = np.random.normal(0.08, 0.15, n_samples)
    
    # Technical features
    rsi = np.random.uniform(0, 100, n_samples)
    macd_signal = np.random.normal(0, 2, n_samples)
    bollinger_position = np.random.uniform(0, 1, n_samples)
    volume_ratio = np.random.lognormal(0, 0.5, n_samples)
    
    # Market features
    market_cap = np.random.lognormal(9, 2, n_samples)  # Billions
    sector = np.random.choice(['Technology', 'Healthcare', 'Finance', 'Energy', 'Consumer'], n_samples)
    
    # Sentiment features
    news_sentiment = np.random.normal(0, 1, n_samples)
    analyst_rating = np.random.uniform(1, 5, n_samples)
    
    # Target: Future return (5-day)
    # Correlation với features
    target_base = (
        0.3 * (roe - 0.12) +
        0.2 * (revenue_growth - 0.08) +
        -0.1 * (pe_ratio - 15) / 15 +
        0.2 * news_sentiment +
        0.1 * (analyst_rating - 3) +
        0.2 * np.random.normal(0, 0.05, n_samples)  # noise
    )
    
    future_return = np.clip(target_base, -0.3, 0.3)  # Clip extreme values
    
    dataset = pd.DataFrame({
        'pe_ratio': pe_ratio.round(2),
        'debt_to_equity': debt_to_equity.round(2),
        'roe': roe.round(4),
        'revenue_growth': revenue_growth.round(4),
        'rsi': rsi.round(2),
        'macd_signal': macd_signal.round(4),
        'bollinger_position': bollinger_position.round(4),
        'volume_ratio': volume_ratio.round(2),
        'market_cap': market_cap.round(2),
        'sector': sector,
        'news_sentiment': news_sentiment.round(4),
        'analyst_rating': analyst_rating.round(2),
        'future_return': future_return.round(4)
    })
    
    return dataset

def main():
    """Tạo sample datasets"""
    
    print("📊 Creating sample datasets for Urus Platform...")
    
    # Tạo thư mục data
    data_dir = "data/sample_datasets"
    os.makedirs(data_dir, exist_ok=True)
    
    # 1. Crypto price dataset cho LSTM
    print("🔸 Creating crypto price dataset...")
    crypto_data = create_crypto_price_dataset()
    crypto_path = f"{data_dir}/crypto_price_data.csv"
    crypto_data.to_csv(crypto_path, index=False)
    print(f"✅ Crypto dataset saved: {crypto_path}")
    print(f"   - Shape: {crypto_data.shape}")
    print(f"   - Target column: 'close' (closing price)")
    print(f"   - Features: {list(crypto_data.columns)}")
    
    # 2. Stock features dataset cho ML
    print("\n🔸 Creating stock features dataset...")
    stock_data = create_stock_features_dataset()
    stock_path = f"{data_dir}/stock_features_data.csv"
    stock_data.to_csv(stock_path, index=False)
    print(f"✅ Stock dataset saved: {stock_path}")
    print(f"   - Shape: {stock_data.shape}")
    print(f"   - Target column: 'future_return'")
    print(f"   - Features: {list(stock_data.columns)}")
    
    print(f"\n🎉 Sample datasets created successfully!")
    print(f"📁 Location: {data_dir}")
    print(f"\nĐể sử dụng:")
    print(f"1. Upload datasets này vào Supabase research_datasets table")
    print(f"2. Chọn dataset khi tạo model")
    print(f"3. Chọn target column: 'close' hoặc 'future_return'")
    print(f"4. Training sẽ tự động load data từ Supabase")

if __name__ == "__main__":
    main() 