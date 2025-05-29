#!/usr/bin/env python3
"""
Facebook Prophet Training Script - Compatible with model_trainer.py interface
"""

import os
import sys
import json
import argparse
import traceback
import pickle
from datetime import datetime
import numpy as np
import pandas as pd
from prophet import Prophet
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

def log(message, level="INFO"):
    """Log with timestamp"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [{level}] {message}")
    sys.stdout.flush()

def load_json_data(file_path):
    """Load data from JSON file"""
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        return pd.DataFrame(data)
    except Exception as e:
        log(f"❌ Failed to load data from {file_path}: {e}", "ERROR")
        raise

def prepare_prophet_data(df, config):
    """Prepare data for Prophet training"""
    # Prophet requires 'ds' (date) and 'y' (target) columns
    
    # Default target column
    target_col = config.get('target_column', 'close_price')
    
    # Check if target column exists
    if target_col not in df.columns:
        log(f"⚠️ Target column '{target_col}' not found, using 'close_price'", "WARNING")
        target_col = 'close_price'
    
    # Try to find timestamp column
    timestamp_col = None
    possible_timestamp_cols = ['timestamp', 'date', 'datetime', 'time', 'created_at']
    for col in possible_timestamp_cols:
        if col in df.columns:
            timestamp_col = col
            break
    
    if not timestamp_col:
        # Create artificial timestamp
        log("⚠️ No timestamp column found, creating artificial timestamps", "WARNING")
        df['ds'] = pd.date_range(start='2020-01-01', periods=len(df), freq='H')
    else:
        # Convert timestamp to datetime
        df['ds'] = pd.to_datetime(df[timestamp_col])
    
    # Prepare Prophet format
    prophet_df = df[['ds', target_col]].copy()
    prophet_df = prophet_df.rename(columns={target_col: 'y'})
    prophet_df = prophet_df.dropna()
    
    log(f"📊 Prophet data shape: {prophet_df.shape}")
    log(f"📅 Date range: {prophet_df['ds'].min()} to {prophet_df['ds'].max()}")
    log(f"🎯 Target column: {target_col}")
    
    return prophet_df, target_col

def main():
    parser = argparse.ArgumentParser(description='Facebook Prophet Training Script')
    parser.add_argument('--train_data', required=True, help='Path to training data JSON file')
    parser.add_argument('--test_data', required=True, help='Path to test data JSON file')
    parser.add_argument('--config', required=True, help='Path to training config JSON file')
    parser.add_argument('--model_id', required=True, help='Model ID')
    parser.add_argument('--output_dir', required=True, help='Output directory for saving model')
    
    args = parser.parse_args()
    
    try:
        log("🚀 Starting Facebook Prophet training process")
        
        # Load configuration
        log("📋 Loading configuration...")
        try:
            with open(args.config, 'r') as f:
                config = json.load(f)
        except Exception as e:
            log(f"⚠️ Failed to load config, using defaults: {e}", "WARNING")
            config = {}
        
        # Get Prophet parameters from config
        prophet_params = {
            'yearly_seasonality': config.get('yearly_seasonality', True),
            'weekly_seasonality': config.get('weekly_seasonality', True),
            'daily_seasonality': config.get('daily_seasonality', False),
            'seasonality_mode': config.get('seasonality_mode', 'additive'),
            'changepoint_prior_scale': config.get('changepoint_prior_scale', 0.05),
            'seasonality_prior_scale': config.get('seasonality_prior_scale', 10.0),
            'holidays_prior_scale': config.get('holidays_prior_scale', 10.0),
            'mcmc_samples': config.get('mcmc_samples', 0),
            'interval_width': config.get('interval_width', 0.8),
            'uncertainty_samples': config.get('uncertainty_samples', 1000)
        }
        
        log(f"⚙️ Prophet parameters: {prophet_params}")
        
        # Load training data
        log("📥 Loading training data...")
        train_df = load_json_data(args.train_data)
        log(f"📊 Training data shape: {train_df.shape}")
        
        # Load test data
        log("📥 Loading test data...")
        test_df = load_json_data(args.test_data)
        log(f"📊 Test data shape: {test_df.shape}")
        
        # Prepare Prophet data
        log("🔧 Preparing Prophet data...")
        train_prophet, target_col = prepare_prophet_data(train_df, config)
        test_prophet, _ = prepare_prophet_data(test_df, config)
        
        log(f"✅ Data preparation completed")
        log(f"📊 Training set: {train_prophet.shape}, Test set: {test_prophet.shape}")
        
        # Initialize Prophet model
        log("🏗️ Initializing Prophet model...")
        model = Prophet(**prophet_params)
        
        # Add custom seasonalities if specified
        if config.get('add_hourly_seasonality', False):
            model.add_seasonality(name='hourly', period=24, fourier_order=3)
        if config.get('add_monthly_seasonality', False):
            model.add_seasonality(name='monthly', period=30.5, fourier_order=5)
        
        # Train model
        log("🚀 Starting Prophet training...")
        start_time = datetime.now()
        
        model.fit(train_prophet)
        
        training_time = (datetime.now() - start_time).total_seconds()
        log(f"✅ Prophet training completed in {training_time:.2f}s")
        
        # Make predictions
        log("🔮 Generating predictions...")
        
        # Training predictions
        train_forecast = model.predict(train_prophet[['ds']])
        train_pred = train_forecast['yhat'].values
        
        # Test predictions
        test_forecast = model.predict(test_prophet[['ds']])
        test_pred = test_forecast['yhat'].values
        
        # Calculate metrics
        log("📊 Calculating metrics...")
        
        # Training metrics
        train_rmse = np.sqrt(mean_squared_error(train_prophet['y'], train_pred))
        train_mae = mean_absolute_error(train_prophet['y'], train_pred)
        train_r2 = r2_score(train_prophet['y'], train_pred)
        
        # Test metrics
        test_rmse = np.sqrt(mean_squared_error(test_prophet['y'], test_pred))
        test_mae = mean_absolute_error(test_prophet['y'], test_pred)
        test_r2 = r2_score(test_prophet['y'], test_pred)
        
        log(f"📊 Training - RMSE: {train_rmse:.6f}, MAE: {train_mae:.6f}, R²: {train_r2:.6f}")
        log(f"📊 Test - RMSE: {test_rmse:.6f}, MAE: {test_mae:.6f}, R²: {test_r2:.6f}")
        
        # Save model
        log("💾 Saving model...")
        os.makedirs(args.output_dir, exist_ok=True)
        
        model_path = os.path.join(args.output_dir, f"prophet_model_{args.model_id}.pkl")
        with open(model_path, 'wb') as f:
            pickle.dump(model, f)
        
        # Save predictions
        predictions_path = os.path.join(args.output_dir, "predictions.csv")
        pred_df = pd.DataFrame({
            'ds': train_prophet['ds'].tolist() + test_prophet['ds'].tolist(),
            'actual': train_prophet['y'].tolist() + test_prophet['y'].tolist(),
            'predicted': train_pred.tolist() + test_pred.tolist(),
            'dataset': ['train'] * len(train_prophet) + ['test'] * len(test_prophet)
        })
        pred_df.to_csv(predictions_path, index=False)
        
        # Save full forecast with confidence intervals
        forecast_path = os.path.join(args.output_dir, "forecast.csv")
        full_forecast = pd.concat([train_forecast, test_forecast], ignore_index=True)
        full_forecast.to_csv(forecast_path, index=False)
        
        # Save model info
        model_info = {
            'model_id': args.model_id,
            'algorithm': 'prophet',
            'training_time_seconds': training_time,
            'target_column': target_col,
            'parameters': prophet_params,
            'metrics': {
                'train': {
                    'rmse': float(train_rmse),
                    'mae': float(train_mae),
                    'r2': float(train_r2)
                },
                'test': {
                    'rmse': float(test_rmse),
                    'mae': float(test_mae),
                    'r2': float(test_r2)
                }
            },
            'training_samples': len(train_prophet),
            'test_samples': len(test_prophet),
            'model_components': {
                'trend': True,
                'yearly_seasonality': prophet_params['yearly_seasonality'],
                'weekly_seasonality': prophet_params['weekly_seasonality'],
                'daily_seasonality': prophet_params['daily_seasonality']
            }
        }
        
        model_info_path = os.path.join(args.output_dir, "model_info.json")
        with open(model_info_path, 'w') as f:
            json.dump(model_info, f, indent=2)
        
        log(f"💾 Model saved to: {model_path}")
        log(f"📊 Predictions saved to: {predictions_path}")
        log(f"📈 Forecast saved to: {forecast_path}")
        log(f"📋 Model info saved to: {model_info_path}")
        
        # Final result
        result = {
            'success': True,
            'model_path': model_path,
            'metrics': model_info['metrics'],
            'training_time': training_time,
            'message': 'Prophet training completed successfully'
        }
        
        # Output final JSON result
        print(json.dumps(result))
        
    except Exception as e:
        error_msg = f"❌ Prophet training failed: {str(e)}"
        log(error_msg, "ERROR")
        log(traceback.format_exc(), "ERROR")
        
        result = {
            'success': False,
            'error': error_msg,
            'traceback': traceback.format_exc()
        }
        
        print(json.dumps(result))
        sys.exit(1)

if __name__ == "__main__":
    main() 