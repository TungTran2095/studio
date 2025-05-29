#!/usr/bin/env python3
"""
GRU Neural Network Training Script - Compatible with model_trainer.py interface
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
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.preprocessing import MinMaxScaler

# TensorFlow/Keras imports
try:
    import tensorflow as tf
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import GRU, Dense, Dropout
    from tensorflow.keras.optimizers import Adam
    from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False

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

def create_sequences(data, sequence_length):
    """Create sequences for GRU training"""
    X, y = [], []
    for i in range(len(data) - sequence_length):
        X.append(data[i:(i + sequence_length)])
        y.append(data[i + sequence_length])
    return np.array(X), np.array(y)

def prepare_data_for_gru(df, config):
    """Prepare data for GRU training"""
    # Default feature columns
    feature_cols = ['open_price', 'high_price', 'low_price', 'close_price', 'volume']
    target_col = 'close_price'
    sequence_length = config.get('sequence_length', 60)
    
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
    log(f"📏 Sequence length: {sequence_length}")
    
    # Prepare data
    data = df[available_cols + [target_col]].ffill().fillna(0)
    
    # Scale features
    feature_scaler = MinMaxScaler()
    target_scaler = MinMaxScaler()
    
    scaled_features = feature_scaler.fit_transform(data[available_cols])
    scaled_target = target_scaler.fit_transform(data[[target_col]])
    
    # Combine scaled data
    scaled_data = np.column_stack([scaled_features, scaled_target])
    
    # Create sequences
    X, y = create_sequences(scaled_data, sequence_length)
    
    # Split features and target
    X_features = X[:, :, :-1]  # All features except target
    y_target = y[:, -1]  # Target only
    
    return X_features, y_target, feature_scaler, target_scaler, available_cols, target_col

def build_gru_model(input_shape, config):
    """Build GRU neural network model"""
    hidden_units = config.get('hidden_units', 50)
    num_layers = config.get('num_layers', 2)
    dropout = config.get('dropout', 0.2)
    learning_rate = config.get('learning_rate', 0.001)
    
    model = Sequential()
    
    # First GRU layer
    model.add(GRU(hidden_units, 
                  return_sequences=True if num_layers > 1 else False,
                  input_shape=input_shape))
    model.add(Dropout(dropout))
    
    # Additional GRU layers
    for i in range(1, num_layers):
        return_seq = i < num_layers - 1
        model.add(GRU(hidden_units, return_sequences=return_seq))
        model.add(Dropout(dropout))
    
    # Output layer
    model.add(Dense(1))
    
    # Compile model
    optimizer = Adam(learning_rate=learning_rate)
    model.compile(optimizer=optimizer, loss='mse', metrics=['mae'])
    
    return model

def main():
    parser = argparse.ArgumentParser(description='GRU Neural Network Training Script')
    parser.add_argument('--train_data', required=True, help='Path to training data JSON file')
    parser.add_argument('--test_data', required=True, help='Path to test data JSON file')
    parser.add_argument('--config', required=True, help='Path to training config JSON file')
    parser.add_argument('--model_id', required=True, help='Model ID')
    parser.add_argument('--output_dir', required=True, help='Output directory for saving model')
    
    args = parser.parse_args()
    
    try:
        log("🚀 Starting GRU Neural Network training process")
        
        # Check TensorFlow availability
        if not TF_AVAILABLE:
            raise ImportError("TensorFlow is required for GRU training. Install with: pip install tensorflow")
        
        log(f"✅ TensorFlow version: {tf.__version__}")
        
        # Load configuration
        log("📋 Loading configuration...")
        try:
            with open(args.config, 'r') as f:
                config = json.load(f)
        except Exception as e:
            log(f"⚠️ Failed to load config, using defaults: {e}", "WARNING")
            config = {}
        
        # Get GRU parameters from config
        gru_params = {
            'sequence_length': config.get('sequence_length', 60),
            'hidden_units': config.get('hidden_units', 50),
            'num_layers': config.get('num_layers', 2),
            'epochs': config.get('epochs', 50),
            'batch_size': config.get('batch_size', 32),
            'dropout': config.get('dropout', 0.2),
            'learning_rate': config.get('learning_rate', 0.001),
            'validation_split': config.get('validation_split', 0.2),
            'early_stopping_patience': config.get('early_stopping_patience', 10)
        }
        
        log(f"⚙️ GRU parameters: {gru_params}")
        
        # Load training data
        log("📥 Loading training data...")
        train_df = load_json_data(args.train_data)
        log(f"📊 Training data shape: {train_df.shape}")
        
        # Load test data
        log("📥 Loading test data...")
        test_df = load_json_data(args.test_data)
        log(f"📊 Test data shape: {test_df.shape}")
        
        # Prepare data for GRU
        log("🔧 Preparing data for GRU...")
        X_train, y_train, feature_scaler, target_scaler, feature_cols, target_col = prepare_data_for_gru(train_df, gru_params)
        X_test, y_test, _, _, _, _ = prepare_data_for_gru(test_df, gru_params)
        
        log(f"✅ Data preparation completed")
        log(f"📊 Training sequences: {X_train.shape}, Test sequences: {X_test.shape}")
        
        # Build GRU model
        log("🏗️ Building GRU model...")
        input_shape = (X_train.shape[1], X_train.shape[2])
        model = build_gru_model(input_shape, gru_params)
        
        # Model summary
        model.summary()
        log(f"🏗️ Model built with {model.count_params()} parameters")
        
        # Prepare callbacks
        callbacks = [
            EarlyStopping(patience=gru_params['early_stopping_patience'], restore_best_weights=True),
            ReduceLROnPlateau(factor=0.5, patience=5, min_lr=1e-7)
        ]
        
        # Train model
        log("🚀 Starting GRU training...")
        start_time = datetime.now()
        
        history = model.fit(
            X_train, y_train,
            epochs=gru_params['epochs'],
            batch_size=gru_params['batch_size'],
            validation_split=gru_params['validation_split'],
            callbacks=callbacks,
            verbose=1
        )
        
        training_time = (datetime.now() - start_time).total_seconds()
        log(f"✅ GRU training completed in {training_time:.2f}s")
        
        # Make predictions
        log("🔮 Generating predictions...")
        train_pred_scaled = model.predict(X_train)
        test_pred_scaled = model.predict(X_test)
        
        # Inverse transform predictions
        train_pred = target_scaler.inverse_transform(train_pred_scaled).flatten()
        test_pred = target_scaler.inverse_transform(test_pred_scaled).flatten()
        
        # Inverse transform actual values
        y_train_actual = target_scaler.inverse_transform(y_train.reshape(-1, 1)).flatten()
        y_test_actual = target_scaler.inverse_transform(y_test.reshape(-1, 1)).flatten()
        
        # Calculate metrics
        log("📊 Calculating metrics...")
        
        # Training metrics
        train_rmse = np.sqrt(mean_squared_error(y_train_actual, train_pred))
        train_mae = mean_absolute_error(y_train_actual, train_pred)
        train_r2 = r2_score(y_train_actual, train_pred)
        
        # Test metrics
        test_rmse = np.sqrt(mean_squared_error(y_test_actual, test_pred))
        test_mae = mean_absolute_error(y_test_actual, test_pred)
        test_r2 = r2_score(y_test_actual, test_pred)
        
        log(f"📊 Training - RMSE: {train_rmse:.6f}, MAE: {train_mae:.6f}, R²: {train_r2:.6f}")
        log(f"📊 Test - RMSE: {test_rmse:.6f}, MAE: {test_mae:.6f}, R²: {test_r2:.6f}")
        
        # Save model
        log("💾 Saving model...")
        os.makedirs(args.output_dir, exist_ok=True)
        
        model_path = os.path.join(args.output_dir, f"gru_model_{args.model_id}.h5")
        model.save(model_path)
        
        # Save scalers
        scaler_path = os.path.join(args.output_dir, "scalers.pkl")
        with open(scaler_path, 'wb') as f:
            pickle.dump({
                'feature_scaler': feature_scaler,
                'target_scaler': target_scaler
            }, f)
        
        # Save predictions
        predictions_path = os.path.join(args.output_dir, "predictions.csv")
        pred_df = pd.DataFrame({
            'train_actual': y_train_actual,
            'train_predicted': train_pred,
            'test_actual': y_test_actual,
            'test_predicted': test_pred
        })
        pred_df.to_csv(predictions_path, index=False)
        
        # Save training history
        history_path = os.path.join(args.output_dir, "training_history.json")
        with open(history_path, 'w') as f:
            json.dump({
                'loss': [float(x) for x in history.history['loss']],
                'val_loss': [float(x) for x in history.history['val_loss']],
                'mae': [float(x) for x in history.history['mae']],
                'val_mae': [float(x) for x in history.history['val_mae']]
            }, f, indent=2)
        
        # Save model info
        model_info = {
            'model_id': args.model_id,
            'algorithm': 'gru',
            'training_time_seconds': training_time,
            'num_features': len(feature_cols),
            'feature_columns': feature_cols,
            'target_column': target_col,
            'sequence_length': gru_params['sequence_length'],
            'parameters': gru_params,
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
            'model_architecture': {
                'total_params': int(model.count_params()),
                'layers': len(model.layers),
                'hidden_units': gru_params['hidden_units'],
                'num_gru_layers': gru_params['num_layers']
            },
            'training_history': {
                'epochs_trained': len(history.history['loss']),
                'final_loss': float(history.history['loss'][-1]),
                'final_val_loss': float(history.history['val_loss'][-1])
            }
        }
        
        model_info_path = os.path.join(args.output_dir, "model_info.json")
        with open(model_info_path, 'w') as f:
            json.dump(model_info, f, indent=2)
        
        log(f"💾 Model saved to: {model_path}")
        log(f"📊 Predictions saved to: {predictions_path}")
        log(f"📈 Training history saved to: {history_path}")
        log(f"📋 Model info saved to: {model_info_path}")
        
        # Final result
        result = {
            'success': True,
            'model_path': model_path,
            'metrics': model_info['metrics'],
            'training_time': training_time,
            'model_architecture': model_info['model_architecture'],
            'message': 'GRU training completed successfully'
        }
        
        # Output final JSON result
        print(json.dumps(result))
        
    except Exception as e:
        error_msg = f"❌ GRU training failed: {str(e)}"
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