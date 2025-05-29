#!/usr/bin/env python3
"""
Exponential Smoothing Training Script - Compatible with model_trainer.py interface
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
from statsmodels.tsa.holtwinters import ExponentialSmoothing
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

def prepare_time_series_data(df, config):
    """Prepare time series data for Exponential Smoothing"""
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
    
    if timestamp_col:
        # Convert to datetime and sort
        df = df.copy()
        df[timestamp_col] = pd.to_datetime(df[timestamp_col])
        df = df.sort_values(timestamp_col)
        df = df.set_index(timestamp_col)
    else:
        # Create artificial timestamp index
        log("⚠️ No timestamp column found, creating artificial timestamps", "WARNING")
        df.index = pd.date_range(start='2020-01-01', periods=len(df), freq='H')
    
    # Extract target series
    ts_data = df[target_col].dropna()
    
    log(f"📊 Time series shape: {ts_data.shape}")
    log(f"📅 Date range: {ts_data.index.min()} to {ts_data.index.max()}")
    log(f"🎯 Target column: {target_col}")
    
    return ts_data, target_col

def main():
    parser = argparse.ArgumentParser(description='Exponential Smoothing Training Script')
    parser.add_argument('--train_data', required=True, help='Path to training data JSON file')
    parser.add_argument('--test_data', required=True, help='Path to test data JSON file')
    parser.add_argument('--config', required=True, help='Path to training config JSON file')
    parser.add_argument('--model_id', required=True, help='Model ID')
    parser.add_argument('--output_dir', required=True, help='Output directory for saving model')
    
    args = parser.parse_args()
    
    try:
        log("🚀 Starting Exponential Smoothing training process")
        
        # Load configuration
        log("📋 Loading configuration...")
        try:
            with open(args.config, 'r') as f:
                config = json.load(f)
        except Exception as e:
            log(f"⚠️ Failed to load config, using defaults: {e}", "WARNING")
            config = {}
        
        # Get Exponential Smoothing parameters from config
        exp_smooth_params = {
            'trend': config.get('trend', 'add'),  # None, 'add', 'mul'
            'seasonal': config.get('seasonal', 'add'),  # None, 'add', 'mul'
            'seasonal_periods': config.get('seasonal_periods', 12),
            'damped_trend': config.get('damped_trend', False),
            'initialization_method': config.get('initialization_method', 'estimated'),
            'use_boxcox': config.get('use_boxcox', False)
        }
        
        log(f"⚙️ Exponential Smoothing parameters: {exp_smooth_params}")
        
        # Load training data
        log("📥 Loading training data...")
        train_df = load_json_data(args.train_data)
        log(f"📊 Training data shape: {train_df.shape}")
        
        # Load test data
        log("📥 Loading test data...")
        test_df = load_json_data(args.test_data)
        log(f"📊 Test data shape: {test_df.shape}")
        
        # Prepare time series data
        log("🔧 Preparing time series data...")
        train_ts, target_col = prepare_time_series_data(train_df, config)
        test_ts, _ = prepare_time_series_data(test_df, config)
        
        log(f"✅ Data preparation completed")
        log(f"📊 Training set: {train_ts.shape}, Test set: {test_ts.shape}")
        
        # Initialize Exponential Smoothing model
        log("🏗️ Initializing Exponential Smoothing model...")
        
        # Handle seasonal parameters
        seasonal = exp_smooth_params['seasonal']
        seasonal_periods = exp_smooth_params['seasonal_periods']
        
        # If seasonal is None, set seasonal_periods to None too
        if seasonal is None:
            seasonal_periods = None
        
        model = ExponentialSmoothing(
            train_ts,
            trend=exp_smooth_params['trend'],
            seasonal=seasonal,
            seasonal_periods=seasonal_periods,
            damped_trend=exp_smooth_params['damped_trend'],
            initialization_method=exp_smooth_params['initialization_method'],
            use_boxcox=exp_smooth_params['use_boxcox']
        )
        
        # Train model
        log("🚀 Starting Exponential Smoothing training...")
        start_time = datetime.now()
        
        fitted_model = model.fit()
        
        training_time = (datetime.now() - start_time).total_seconds()
        log(f"✅ Exponential Smoothing training completed in {training_time:.2f}s")
        
        # Make predictions
        log("🔮 Generating predictions...")
        
        # In-sample predictions (training)
        train_pred = fitted_model.fittedvalues
        
        # Out-of-sample predictions (test)
        forecast_steps = len(test_ts)
        test_pred = fitted_model.forecast(steps=forecast_steps)
        
        # Ensure predictions align with actual data
        if len(train_pred) != len(train_ts):
            # Handle case where fitted values might be shorter due to initialization
            min_len = min(len(train_pred), len(train_ts))
            train_pred = train_pred[-min_len:]
            train_actual = train_ts[-min_len:]
        else:
            train_actual = train_ts
        
        test_actual = test_ts
        
        # Calculate metrics
        log("📊 Calculating metrics...")
        
        # Training metrics
        train_rmse = np.sqrt(mean_squared_error(train_actual, train_pred))
        train_mae = mean_absolute_error(train_actual, train_pred)
        train_r2 = r2_score(train_actual, train_pred)
        
        # Test metrics
        test_rmse = np.sqrt(mean_squared_error(test_actual, test_pred))
        test_mae = mean_absolute_error(test_actual, test_pred)
        test_r2 = r2_score(test_actual, test_pred)
        
        log(f"📊 Training - RMSE: {train_rmse:.6f}, MAE: {train_mae:.6f}, R²: {train_r2:.6f}")
        log(f"📊 Test - RMSE: {test_rmse:.6f}, MAE: {test_mae:.6f}, R²: {test_r2:.6f}")
        
        # Save model
        log("💾 Saving model...")
        os.makedirs(args.output_dir, exist_ok=True)
        
        model_path = os.path.join(args.output_dir, f"exp_smoothing_model_{args.model_id}.pkl")
        with open(model_path, 'wb') as f:
            pickle.dump(fitted_model, f)
        
        # Save predictions
        predictions_path = os.path.join(args.output_dir, "predictions.csv")
        pred_df = pd.DataFrame({
            'timestamp': train_actual.index.tolist() + test_actual.index.tolist(),
            'actual': train_actual.values.tolist() + test_actual.values.tolist(),
            'predicted': train_pred.values.tolist() + test_pred.values.tolist(),
            'dataset': ['train'] * len(train_actual) + ['test'] * len(test_actual)
        })
        pred_df.to_csv(predictions_path, index=False)
        
        # Save model summary
        summary_path = os.path.join(args.output_dir, "model_summary.txt")
        with open(summary_path, 'w') as f:
            f.write(str(fitted_model.summary()))
        
        # Get model information
        model_components = {
            'trend': exp_smooth_params['trend'],
            'seasonal': exp_smooth_params['seasonal'],
            'damped_trend': exp_smooth_params['damped_trend'],
            'alpha': float(fitted_model.params['smoothing_level']) if 'smoothing_level' in fitted_model.params else None,
            'beta': float(fitted_model.params['smoothing_trend']) if 'smoothing_trend' in fitted_model.params else None,
            'gamma': float(fitted_model.params['smoothing_seasonal']) if 'smoothing_seasonal' in fitted_model.params else None,
            'phi': float(fitted_model.params['damping_trend']) if 'damping_trend' in fitted_model.params else None
        }
        
        # Save model info
        model_info = {
            'model_id': args.model_id,
            'algorithm': 'exponential_smoothing',
            'training_time_seconds': training_time,
            'target_column': target_col,
            'parameters': exp_smooth_params,
            'fitted_parameters': model_components,
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
            'training_samples': len(train_actual),
            'test_samples': len(test_actual),
            'model_components': model_components,
            'aic': float(fitted_model.aic) if hasattr(fitted_model, 'aic') else None,
            'bic': float(fitted_model.bic) if hasattr(fitted_model, 'bic') else None
        }
        
        model_info_path = os.path.join(args.output_dir, "model_info.json")
        with open(model_info_path, 'w') as f:
            json.dump(model_info, f, indent=2)
        
        log(f"💾 Model saved to: {model_path}")
        log(f"📊 Predictions saved to: {predictions_path}")
        log(f"📋 Model summary saved to: {summary_path}")
        log(f"📋 Model info saved to: {model_info_path}")
        
        # Final result
        result = {
            'success': True,
            'model_path': model_path,
            'metrics': model_info['metrics'],
            'training_time': training_time,
            'message': 'Exponential Smoothing training completed successfully'
        }
        
        # Output final JSON result
        print(json.dumps(result))
        
    except Exception as e:
        error_msg = f"❌ Exponential Smoothing training failed: {str(e)}"
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