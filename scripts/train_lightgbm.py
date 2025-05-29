#!/usr/bin/env python3
"""
LightGBM Training Script - Compatible with model_trainer.py interface
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
import lightgbm as lgb
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

def prepare_features(df, config):
    """Prepare features for LightGBM training"""
    # Default feature columns
    feature_cols = ['open_price', 'high_price', 'low_price', 'close_price', 'volume']
    target_col = 'close_price'
    
    # Use config if available
    if config:
        feature_cols = config.get('feature_columns', feature_cols)
        target_col = config.get('target_column', target_col)
    
    # Ensure columns exist
    available_cols = [col for col in feature_cols if col in df.columns]
    if not available_cols:
        log(f"❌ No valid feature columns found. Available: {list(df.columns)}", "ERROR")
        raise ValueError("No valid feature columns")
    
    # Check target column
    if target_col not in df.columns:
        log(f"⚠️ Target column '{target_col}' not found, using 'close_price'", "WARNING")
        target_col = 'close_price'
    
    log(f"📊 Using features: {available_cols}")
    log(f"🎯 Target column: {target_col}")
    
    # Create features and target
    X = df[available_cols].ffill().fillna(0)
    y = df[target_col].ffill().fillna(0)
    
    return X, y, available_cols, target_col

def main():
    parser = argparse.ArgumentParser(description='LightGBM Training Script')
    parser.add_argument('--train_data', required=True, help='Path to training data JSON file')
    parser.add_argument('--test_data', required=True, help='Path to test data JSON file')
    parser.add_argument('--config', required=True, help='Path to training config JSON file')
    parser.add_argument('--model_id', required=True, help='Model ID')
    parser.add_argument('--output_dir', required=True, help='Output directory for saving model')
    
    args = parser.parse_args()
    
    try:
        log("🚀 Starting LightGBM training process")
        
        # Load configuration
        log("📋 Loading configuration...")
        try:
            with open(args.config, 'r') as f:
                config = json.load(f)
        except Exception as e:
            log(f"⚠️ Failed to load config, using defaults: {e}", "WARNING")
            config = {}
        
        # Get LightGBM parameters from config
        lgb_params = {
            'objective': 'regression',
            'metric': ['rmse', 'mae'],
            'boosting_type': config.get('boosting_type', 'gbdt'),
            'num_leaves': config.get('num_leaves', 31),
            'learning_rate': config.get('learning_rate', 0.1),
            'feature_fraction': config.get('feature_fraction', 0.9),
            'bagging_fraction': config.get('bagging_fraction', 0.8),
            'bagging_freq': config.get('bagging_freq', 5),
            'verbose': -1,
            'random_state': config.get('random_state', 42)
        }
        
        num_boost_round = config.get('n_estimators', 100)
        early_stopping_rounds = config.get('early_stopping_rounds', 50)
        
        log(f"⚙️ LightGBM parameters: {lgb_params}")
        log(f"🔄 Boost rounds: {num_boost_round}, Early stopping: {early_stopping_rounds}")
        
        # Load training data
        log("📥 Loading training data...")
        train_df = load_json_data(args.train_data)
        log(f"📊 Training data shape: {train_df.shape}")
        
        # Load test data
        log("📥 Loading test data...")
        test_df = load_json_data(args.test_data)
        log(f"📊 Test data shape: {test_df.shape}")
        
        # Prepare features
        log("🔧 Preparing features...")
        X_train, y_train, feature_cols, target_col = prepare_features(train_df, config)
        X_test, y_test, _, _ = prepare_features(test_df, config)
        
        log(f"✅ Feature preparation completed")
        log(f"📊 Training set: {X_train.shape}, Test set: {X_test.shape}")
        
        # Create LightGBM datasets
        log("🏗️ Creating LightGBM datasets...")
        train_dataset = lgb.Dataset(X_train, label=y_train, feature_name=feature_cols)
        test_dataset = lgb.Dataset(X_test, label=y_test, reference=train_dataset, feature_name=feature_cols)
        
        # Train model
        log("🚀 Starting LightGBM training...")
        start_time = datetime.now()
        
        evals_result = {}
        model = lgb.train(
            params=lgb_params,
            train_set=train_dataset,
            num_boost_round=num_boost_round,
            valid_sets=[train_dataset, test_dataset],
            valid_names=['train', 'test'],
            callbacks=[
                lgb.early_stopping(stopping_rounds=early_stopping_rounds, verbose=False),
                lgb.log_evaluation(period=0),  # No verbose output
                lgb.record_evaluation(evals_result)
            ]
        )
        
        training_time = (datetime.now() - start_time).total_seconds()
        log(f"✅ LightGBM training completed in {training_time:.2f}s")
        
        # Make predictions
        log("🔮 Generating predictions...")
        train_pred = model.predict(X_train, num_iteration=model.best_iteration)
        test_pred = model.predict(X_test, num_iteration=model.best_iteration)
        
        # Calculate metrics
        log("📊 Calculating metrics...")
        
        # Training metrics
        train_rmse = np.sqrt(mean_squared_error(y_train, train_pred))
        train_mae = mean_absolute_error(y_train, train_pred)
        train_r2 = r2_score(y_train, train_pred)
        
        # Test metrics
        test_rmse = np.sqrt(mean_squared_error(y_test, test_pred))
        test_mae = mean_absolute_error(y_test, test_pred)
        test_r2 = r2_score(y_test, test_pred)
        
        log(f"📊 Training - RMSE: {train_rmse:.6f}, MAE: {train_mae:.6f}, R²: {train_r2:.6f}")
        log(f"📊 Test - RMSE: {test_rmse:.6f}, MAE: {test_mae:.6f}, R²: {test_r2:.6f}")
        
        # Save model
        log("💾 Saving model...")
        os.makedirs(args.output_dir, exist_ok=True)
        
        model_path = os.path.join(args.output_dir, f"lightgbm_model_{args.model_id}.pkl")
        with open(model_path, 'wb') as f:
            pickle.dump(model, f)
        
        # Save predictions
        predictions_path = os.path.join(args.output_dir, "predictions.csv")
        pred_df = pd.DataFrame({
            'train_actual': y_train,
            'train_predicted': train_pred,
            'test_actual': y_test,
            'test_predicted': test_pred
        })
        pred_df.to_csv(predictions_path, index=False)
        
        # Save model info
        model_info = {
            'model_id': args.model_id,
            'algorithm': 'lightgbm',
            'training_time_seconds': training_time,
            'best_iteration': int(model.best_iteration),
            'num_features': len(feature_cols),
            'feature_columns': feature_cols,
            'target_column': target_col,
            'parameters': lgb_params,
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
            'files': {
                'model': model_path,
                'predictions': predictions_path
            }
        }
        
        info_path = os.path.join(args.output_dir, "model_info.json")
        with open(info_path, 'w') as f:
            json.dump(model_info, f, indent=2)
        
        log(f"💾 Model saved to {model_path}")
        log(f"📄 Model info saved to {info_path}")
        log(f"📊 Predictions saved to {predictions_path}")
        
        # Output final result
        result = {
            'success': True,
            'message': 'LightGBM model trained successfully',
            'results': {
                'rmse': float(test_rmse),
                'mae': float(test_mae),
                'r2': float(test_r2),
                'model_path': model_path,
                'training_time_seconds': training_time,
                'lightgbm_info': {
                    'best_iteration': int(model.best_iteration),
                    'num_features': len(feature_cols),
                    'feature_importance': dict(zip(feature_cols, model.feature_importance().tolist()))
                }
            }
        }
        
        log("[COMPLETE] 🏁 LightGBM training completed successfully")
        print(json.dumps(result))
        
    except Exception as e:
        log(f"❌ Training failed: {str(e)}", "ERROR")
        
        result = {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }
        
        print(json.dumps(result))
        sys.exit(1)

if __name__ == "__main__":
    main()
