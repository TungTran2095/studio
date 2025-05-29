import os
import argparse
import json
import sys
import traceback
import time
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import joblib
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()

# --- Argument Parsing ---
parser = argparse.ArgumentParser(description='Train Linear Regression model for time series forecasting.')
# New arguments for API integration
parser.add_argument('--train_data', type=str, help='Path to training data JSON file')
parser.add_argument('--test_data', type=str, help='Path to test data JSON file')
parser.add_argument('--config', type=str, help='Path to configuration JSON file')
parser.add_argument('--model_id', type=str, help='Model ID for tracking')
parser.add_argument('--output_dir', type=str, help='Output directory for model files')

# Linear Regression parameters (with defaults)
parser.add_argument('--fit_intercept', type=bool, default=True, help='Whether to calculate intercept')
parser.add_argument('--copy_X', type=bool, default=True, help='Whether to copy X or overwrite')
parser.add_argument('--n_jobs', type=int, default=None, help='Number of jobs for computation')
parser.add_argument('--positive', type=bool, default=False, help='Force coefficients to be positive')

# Data parameters
parser.add_argument('--target_column', type=str, default='close', help='Column name to predict.')
parser.add_argument('--feature_columns', nargs='+', default=['open', 'high', 'low', 'close', 'volume'], help='List of feature columns to use.')
parser.add_argument('--lookback_window', type=int, default=10, help='Number of previous time steps to use as features')

args = parser.parse_args()

def log_with_timestamp(message, level="INFO"):
    """Log message with timestamp"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [{level}] {message}")
    sys.stdout.flush()

# --- Helper Functions ---
def load_config_and_override_args():
    """Load configuration from JSON file and override command line arguments"""
    if args.config and os.path.exists(args.config):
        log_with_timestamp(f"Loading config from {args.config}")
        with open(args.config, 'r') as f:
            config = json.load(f)
        
        # Override args with config parameters if available
        if 'parameters' in config:
            params = config['parameters']
            for key, value in params.items():
                if hasattr(args, key):
                    old_value = getattr(args, key)
                    setattr(args, key, value)
                    log_with_timestamp(f"Parameter {key}: {old_value} -> {value}")

def load_data_from_files():
    """Load training and test data from JSON files"""
    train_data = None
    test_data = None
    
    if args.train_data and os.path.exists(args.train_data):
        log_with_timestamp(f"Loading training data from {args.train_data}")
        start_time = time.time()
        with open(args.train_data, 'r') as f:
            train_data = json.load(f)
        load_time = time.time() - start_time
        log_with_timestamp(f"Loaded {len(train_data)} training records in {load_time:.2f}s")
    
    if args.test_data and os.path.exists(args.test_data):
        log_with_timestamp(f"Loading test data from {args.test_data}")
        start_time = time.time()
        with open(args.test_data, 'r') as f:
            test_data = json.load(f)
        load_time = time.time() - start_time
        log_with_timestamp(f"Loaded {len(test_data)} test records in {load_time:.2f}s")
    
    return train_data, test_data

def create_features(data, target_col_index, lookback_window):
    """Create features using lookback window approach"""
    log_with_timestamp(f"Creating features with lookback window of {lookback_window}")
    start_time = time.time()
    
    X, y = [], []
    total_samples = len(data) - lookback_window
    
    for i in range(lookback_window, len(data)):
        # Use previous lookback_window time steps as features
        features = data[i-lookback_window:i].flatten()
        target = data[i, target_col_index]
        X.append(features)
        y.append(target)
        
        # Progress logging for large datasets
        if (i - lookback_window + 1) % max(1, total_samples // 10) == 0:
            progress = ((i - lookback_window + 1) / total_samples) * 100
            log_with_timestamp(f"Feature creation progress: {progress:.1f}%")
    
    creation_time = time.time() - start_time
    log_with_timestamp(f"Feature creation completed in {creation_time:.2f}s")
    
    if not X:
        raise ValueError("Not enough data to create features with the given lookback window.")
    return np.array(X), np.array(y)

def print_json_output(success, message=None, rmse=None, mae=None, r2=None, model_path=None, training_time=None):
    """Prints results or errors as JSON to stdout."""
    output = {"success": success}
    if message:
        output["message"] = message
    if rmse is not None:
         if "results" not in output: output["results"] = {}
         output["results"]["rmse"] = rmse
    if mae is not None:
         if "results" not in output: output["results"] = {}
         output["results"]["mae"] = mae
    if r2 is not None:
         if "results" not in output: output["results"] = {}
         output["results"]["r2"] = r2
    if model_path:
         if "results" not in output: output["results"] = {}
         output["results"]["model_path"] = model_path
    if training_time:
         if "results" not in output: output["results"] = {}
         output["results"]["training_time_seconds"] = training_time
    print(json.dumps(output))
    sys.stdout.flush()

# --- Main Training Logic ---
try:
    overall_start_time = time.time()
    log_with_timestamp("🚀 Starting Linear Regression training process", "START")
    
    # Load configuration and override arguments
    log_with_timestamp("📋 Loading configuration...")
    load_config_and_override_args()
    
    # Try to load data from files first (new API method)
    log_with_timestamp("📊 Loading training data...")
    train_data, test_data = load_data_from_files()
    
    if train_data and test_data:
        log_with_timestamp("✅ Using data from API files")
        # Combine train and test data
        data_combine_start = time.time()
        all_data = train_data + test_data
        df = pd.DataFrame(all_data)
        
        # Convert timestamp column
        if 'open_time' in df.columns:
            df['open_time'] = pd.to_datetime(df['open_time'])
            df = df.sort_values('open_time').set_index('open_time')
        
        data_combine_time = time.time() - data_combine_start
        log_with_timestamp(f"📈 Data combined in {data_combine_time:.2f}s")
        
        # Use the original train/test split from API
        train_size = len(train_data)
        log_with_timestamp(f"📊 Using API train/test split: {train_size}/{len(test_data)}")
        
    else:
        raise ValueError("No training data provided. Please provide train_data and test_data files.")

    # Select features and target
    if args.target_column not in args.feature_columns:
        all_cols = list(dict.fromkeys([args.target_column] + args.feature_columns))
    else:
        all_cols = args.feature_columns

    if not all(col in df.columns for col in all_cols):
        missing_cols = [col for col in all_cols if col not in df.columns]
        raise ValueError(f"Missing required columns in data: {', '.join(missing_cols)}")

    log_with_timestamp(f"🔧 Using features: {all_cols}")
    log_with_timestamp(f"🎯 Target column: {args.target_column}")
    
    preprocessing_start = time.time()
    data_to_process = df[all_cols].astype(float).values
    target_col_index_in_features = all_cols.index(args.target_column)
    log_with_timestamp(f"📊 Raw data shape: {data_to_process.shape}")

    # --- Preprocess Data ---
    log_with_timestamp("⚙️  Scaling data...")
    scale_start = time.time()
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_data = scaler.fit_transform(data_to_process)
    scale_time = time.time() - scale_start
    log_with_timestamp(f"✅ Data scaled in {scale_time:.2f}s. Shape: {scaled_data.shape}")

    # Create features using lookback window
    X, y = create_features(scaled_data, target_col_index_in_features, args.lookback_window)
    log_with_timestamp(f"🔧 Final features: X shape={X.shape}, y shape={y.shape}")
    
    preprocessing_time = time.time() - preprocessing_start
    log_with_timestamp(f"⚙️  Total preprocessing time: {preprocessing_time:.2f}s")

    # --- Split Data ---
    log_with_timestamp("✂️  Splitting data...")
    split_start = time.time()
    
    if train_data and test_data:
        # Use API-provided split
        train_end_idx = int(len(X) * len(train_data) / (len(train_data) + len(test_data)))
        X_train_full = X[:train_end_idx]
        y_train_full = y[:train_end_idx]
        X_test = X[train_end_idx:]
        y_test = y[train_end_idx:]
        
        # Split training data into train/validation
        X_train, X_val, y_train, y_val = train_test_split(
            X_train_full, y_train_full, test_size=0.2, shuffle=False
        )
    else:
        # Fallback split
        X_train, X_temp, y_train, y_temp = train_test_split(
            X, y, train_size=0.8, shuffle=False
        )
        X_val, X_test, y_val, y_test = train_test_split(
            X_temp, y_temp, test_size=0.5, shuffle=False
        )
    
    split_time = time.time() - split_start
    log_with_timestamp(f"✅ Data split completed in {split_time:.2f}s")
    log_with_timestamp(f"📊 Split sizes: Train={len(X_train)}, Val={len(X_val)}, Test={len(X_test)}")

    if len(X_train) == 0 or len(X_val) == 0 or len(X_test) == 0:
        raise ValueError("Data split resulted in empty sets.")

    # --- Build and Train Linear Regression Model ---
    log_with_timestamp("🏗️  Building Linear Regression model...")
    
    model = LinearRegression(
        fit_intercept=args.fit_intercept,
        copy_X=args.copy_X,
        n_jobs=args.n_jobs,
        positive=args.positive
    )

    log_with_timestamp("🎯 Starting model training...")
    train_start = time.time()
    
    # Linear Regression training is very fast, but let's add some artificial delay to show progress
    model.fit(X_train, y_train)
    
    train_time = time.time() - train_start
    log_with_timestamp(f"✅ Model training completed in {train_time:.4f}s")
    log_with_timestamp(f"📊 Model coefficients shape: {model.coef_.shape}")
    log_with_timestamp(f"📊 Model intercept: {model.intercept_:.6f}")

    # --- Evaluate Model ---
    log_with_timestamp("📈 Evaluating model...")
    eval_start = time.time()
    
    # Validation predictions
    log_with_timestamp("🔍 Computing validation predictions...")
    y_val_pred = model.predict(X_val)
    val_rmse = np.sqrt(mean_squared_error(y_val, y_val_pred))
    val_mae = mean_absolute_error(y_val, y_val_pred)
    val_r2 = r2_score(y_val, y_val_pred)
    
    # Test predictions
    log_with_timestamp("🔍 Computing test predictions...")
    y_test_pred = model.predict(X_test)
    test_rmse = np.sqrt(mean_squared_error(y_test, y_test_pred))
    test_mae = mean_absolute_error(y_test, y_test_pred)
    test_r2 = r2_score(y_test, y_test_pred)
    
    eval_time = time.time() - eval_start
    log_with_timestamp(f"✅ Model evaluation completed in {eval_time:.2f}s")

    log_with_timestamp(f"📊 Validation Metrics - RMSE: {val_rmse:.6f}, MAE: {val_mae:.6f}, R²: {val_r2:.6f}")
    log_with_timestamp(f"📊 Test Metrics - RMSE: {test_rmse:.6f}, MAE: {test_mae:.6f}, R²: {test_r2:.6f}")

    # --- Save Model ---
    if args.output_dir:
        log_with_timestamp("💾 Saving model...")
        save_start = time.time()
        
        os.makedirs(args.output_dir, exist_ok=True)
        model_path = os.path.join(args.output_dir, 'linear_regression_model.pkl')
        scaler_path = os.path.join(args.output_dir, 'scaler.pkl')
        
        log_with_timestamp(f"💾 Saving model to {model_path}")
        joblib.dump(model, model_path)
        joblib.dump(scaler, scaler_path)
        
        # Save model info
        model_info = {
            'model_type': 'Linear Regression',
            'parameters': {
                'fit_intercept': args.fit_intercept,
                'copy_X': args.copy_X,
                'n_jobs': args.n_jobs,
                'positive': args.positive,
                'lookback_window': args.lookback_window
            },
            'features': all_cols,
            'target_column': args.target_column,
            'training_info': {
                'train_samples': len(X_train),
                'val_samples': len(X_val),
                'test_samples': len(X_test),
                'feature_count': X_train.shape[1],
                'training_time_seconds': train_time,
                'total_time_seconds': time.time() - overall_start_time
            },
            'metrics': {
                'validation': {
                    'rmse': float(val_rmse),
                    'mae': float(val_mae),
                    'r2': float(val_r2)
                },
                'test': {
                    'rmse': float(test_rmse),
                    'mae': float(test_mae),
                    'r2': float(test_r2)
                }
            }
        }
        
        info_path = os.path.join(args.output_dir, 'model_info.json')
        with open(info_path, 'w') as f:
            json.dump(model_info, f, indent=2)
        
        save_time = time.time() - save_start
        log_with_timestamp(f"✅ Model saved in {save_time:.2f}s")
        log_with_timestamp(f"📄 Model info saved to {info_path}")
        
        total_time = time.time() - overall_start_time
        log_with_timestamp(f"🏁 Total training time: {total_time:.2f}s", "COMPLETE")
        
        print_json_output(
            success=True, 
            message="Linear Regression model trained successfully", 
            rmse=test_rmse, 
            mae=test_mae, 
            r2=test_r2, 
            model_path=model_path,
            training_time=total_time
        )
    else:
        total_time = time.time() - overall_start_time
        log_with_timestamp(f"🏁 Total training time: {total_time:.2f}s", "COMPLETE")
        
        print_json_output(
            success=True, 
            message="Linear Regression model trained successfully", 
            rmse=test_rmse, 
            mae=test_mae, 
            r2=test_r2,
            training_time=total_time
        )

except Exception as e:
    error_msg = f"Error in Linear Regression training: {str(e)}"
    log_with_timestamp(f"❌ {error_msg}", "ERROR")
    traceback.print_exc()
    print_json_output(success=False, message=error_msg)
    sys.exit(1) 