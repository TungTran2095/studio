#!/usr/bin/env python3
"""
Decision Tree Training Script - Compatible with model_trainer.py interface
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
from sklearn.tree import DecisionTreeRegressor
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
    """Prepare features for Decision Tree training"""
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
    parser = argparse.ArgumentParser(description='Decision Tree Training Script')
    parser.add_argument('--train_data', required=True, help='Path to training data JSON file')
    parser.add_argument('--test_data', required=True, help='Path to test data JSON file')
    parser.add_argument('--config', required=True, help='Path to training config JSON file')
    parser.add_argument('--model_id', required=True, help='Model ID')
    parser.add_argument('--output_dir', required=True, help='Output directory for saving model')
    
    args = parser.parse_args()
    
    try:
        log("🚀 Starting Decision Tree training process")
        
        # Load configuration
        log("📋 Loading configuration...")
        try:
            with open(args.config, 'r') as f:
                config = json.load(f)
        except Exception as e:
            log(f"⚠️ Failed to load config, using defaults: {e}", "WARNING")
            config = {}
        
        # Get Decision Tree parameters from config
        dt_params = {
            'max_depth': config.get('max_depth', 10),
            'min_samples_split': config.get('min_samples_split', 2),
            'min_samples_leaf': config.get('min_samples_leaf', 1),
            'criterion': config.get('criterion', 'squared_error'),
            'splitter': config.get('splitter', 'best'),
            'max_features': config.get('max_features', None),
            'random_state': config.get('random_state', 42)
        }
        
        log(f"⚙️ Decision Tree parameters: {dt_params}")
        
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
        
        # Initialize Decision Tree model
        log("🏗️ Initializing Decision Tree model...")
        model = DecisionTreeRegressor(**dt_params)
        
        # Train model
        log("🚀 Starting Decision Tree training...")
        start_time = datetime.now()
        
        model.fit(X_train, y_train)
        
        training_time = (datetime.now() - start_time).total_seconds()
        log(f"✅ Decision Tree training completed in {training_time:.2f}s")
        
        # Make predictions
        log("🔮 Generating predictions...")
        train_pred = model.predict(X_train)
        test_pred = model.predict(X_test)
        
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
        
        model_path = os.path.join(args.output_dir, f"decision_tree_model_{args.model_id}.pkl")
        with open(model_path, 'wb') as f:
            pickle.dump(model, f)
        
        # Save predictions
        predictions_path = os.path.join(args.output_dir, "predictions.csv")
        
        # Create separate DataFrames for train and test to avoid length mismatch
        train_pred_df = pd.DataFrame({
            'actual': y_train,
            'predicted': train_pred,
            'dataset': ['train'] * len(y_train)
        })
        
        test_pred_df = pd.DataFrame({
            'actual': y_test,
            'predicted': test_pred,
            'dataset': ['test'] * len(y_test)
        })
        
        # Combine predictions
        pred_df = pd.concat([train_pred_df, test_pred_df], ignore_index=True)
        pred_df.to_csv(predictions_path, index=False)
        
        # Get feature importances
        feature_importance = dict(zip(feature_cols, model.feature_importances_))
        
        # Save model info
        model_info = {
            'model_id': args.model_id,
            'algorithm': 'decision_tree',
            'training_time_seconds': training_time,
            'num_features': len(feature_cols),
            'feature_columns': feature_cols,
            'target_column': target_col,
            'parameters': dt_params,
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
            'training_samples': len(X_train),
            'test_samples': len(X_test),
            'feature_importance': feature_importance,
            'tree_info': {
                'max_depth': int(model.get_depth()),
                'n_leaves': int(model.get_n_leaves()),
                'n_node_samples': int(model.tree_.n_node_samples[0])
            }
        }
        
        model_info_path = os.path.join(args.output_dir, "model_info.json")
        with open(model_info_path, 'w') as f:
            json.dump(model_info, f, indent=2)
        
        log(f"💾 Model saved to: {model_path}")
        log(f"📊 Predictions saved to: {predictions_path}")
        log(f"📋 Model info saved to: {model_info_path}")
        
        # Final result
        result = {
            'success': True,
            'model_path': model_path,
            'metrics': model_info['metrics'],
            'training_time': training_time,
            'feature_importance': feature_importance,
            'message': 'Decision Tree training completed successfully'
        }
        
        # Output final JSON result
        print(json.dumps(result))
        
    except Exception as e:
        error_msg = f"❌ Decision Tree training failed: {str(e)}"
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