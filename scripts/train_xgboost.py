import os
import argparse
import json
import sys
import traceback
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import xgboost as xgb
import joblib
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# --- Argument Parsing ---
parser = argparse.ArgumentParser(description='Train XGBoost model for time series forecasting.')
# New arguments for API integration
parser.add_argument('--train_data', type=str, help='Path to training data JSON file')
parser.add_argument('--test_data', type=str, help='Path to test data JSON file')
parser.add_argument('--config', type=str, help='Path to configuration JSON file')
parser.add_argument('--model_id', type=str, help='Model ID for tracking')
parser.add_argument('--output_dir', type=str, help='Output directory for model files')

# XGBoost parameters (with defaults)
parser.add_argument('--n_estimators', type=int, default=100, help='Number of boosting rounds')
parser.add_argument('--max_depth', type=int, default=6, help='Maximum depth of trees')
parser.add_argument('--learning_rate', type=float, default=0.1, help='Learning rate')
parser.add_argument('--subsample', type=float, default=1.0, help='Subsample ratio of training instances')
parser.add_argument('--colsample_bytree', type=float, default=1.0, help='Subsample ratio of columns')
parser.add_argument('--reg_alpha', type=float, default=0, help='L1 regularization term')
parser.add_argument('--reg_lambda', type=float, default=1, help='L2 regularization term')
parser.add_argument('--random_state', type=int, default=42, help='Random state for reproducibility')
parser.add_argument('--n_jobs', type=int, default=-1, help='Number of jobs for parallel computation')
parser.add_argument('--early_stopping_rounds', type=int, default=10, help='Early stopping rounds')

# Data parameters
parser.add_argument('--target_column', type=str, default='close', help='Column name to predict.')
parser.add_argument('--feature_columns', nargs='+', default=['open', 'high', 'low', 'close', 'volume'], help='List of feature columns to use.')
parser.add_argument('--lookback_window', type=int, default=10, help='Number of previous time steps to use as features')

args = parser.parse_args()

# --- Helper Functions ---
def load_config_and_override_args():
    """Load configuration from JSON file and override command line arguments"""
    if args.config and os.path.exists(args.config):
        print(f"Loading config from {args.config}")
        with open(args.config, 'r') as f:
            config = json.load(f)
        
        # Override args with config parameters if available
        if 'parameters' in config:
            params = config['parameters']
            for key, value in params.items():
                if hasattr(args, key):
                    setattr(args, key, value)

def load_data_from_files():
    """Load training and test data from JSON files"""
    train_data = None
    test_data = None
    
    if args.train_data and os.path.exists(args.train_data):
        print(f"Loading training data from {args.train_data}")
        with open(args.train_data, 'r') as f:
            train_data = json.load(f)
        print(f"Loaded {len(train_data)} training records")
    
    if args.test_data and os.path.exists(args.test_data):
        print(f"Loading test data from {args.test_data}")
        with open(args.test_data, 'r') as f:
            test_data = json.load(f)
        print(f"Loaded {len(test_data)} test records")
    
    return train_data, test_data

def create_features(data, target_col_index, lookback_window):
    """Create features using lookback window approach"""
    X, y = [], []
    for i in range(lookback_window, len(data)):
        # Use previous lookback_window time steps as features
        features = data[i-lookback_window:i].flatten()
        target = data[i, target_col_index]
        X.append(features)
        y.append(target)
    
    if not X:
        raise ValueError("Not enough data to create features with the given lookback window.")
    return np.array(X), np.array(y)

def print_json_output(success, message=None, rmse=None, mae=None, r2=None, model_path=None):
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
    print(json.dumps(output))
    sys.stdout.flush()

# --- Main Training Logic ---
try:
    # Load configuration and override arguments
    load_config_and_override_args()
    
    # Try to load data from files first (new API method)
    train_data, test_data = load_data_from_files()
    
    if train_data and test_data:
        print("Using data from API files")
        # Combine train and test data
        all_data = train_data + test_data
        df = pd.DataFrame(all_data)
        
        # Convert timestamp column
        if 'open_time' in df.columns:
            df['open_time'] = pd.to_datetime(df['open_time'])
            df = df.sort_values('open_time').set_index('open_time')
        
        # Use the original train/test split from API
        train_size = len(train_data)
        print(f"Using API train/test split: {train_size}/{len(test_data)}")
        
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

    print(f"Using features: {all_cols}")
    data_to_process = df[all_cols].astype(float).values
    target_col_index_in_features = all_cols.index(args.target_column)

    # --- Preprocess Data ---
    print("Scaling data...")
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_data = scaler.fit_transform(data_to_process)
    print(f"Scaled data shape: {scaled_data.shape}")

    # Create features using lookback window
    print(f"Creating features with {args.lookback_window} lookback window...")
    X, y = create_features(scaled_data, target_col_index_in_features, args.lookback_window)
    print(f"Created features: X shape={X.shape}, y shape={y.shape}")

    # --- Split Data ---
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
    
    print(f"Split sizes: Train={len(X_train)}, Val={len(X_val)}, Test={len(X_test)}")

    if len(X_train) == 0 or len(X_val) == 0 or len(X_test) == 0:
        raise ValueError("Data split resulted in empty sets.")

    # --- Build and Train XGBoost Model ---
    print(f"Building XGBoost model...")
    
    model = xgb.XGBRegressor(
        n_estimators=args.n_estimators,
        max_depth=args.max_depth,
        learning_rate=args.learning_rate,
        subsample=args.subsample,
        colsample_bytree=args.colsample_bytree,
        reg_alpha=args.reg_alpha,
        reg_lambda=args.reg_lambda,
        random_state=args.random_state,
        n_jobs=args.n_jobs
    )

    print(f"Training XGBoost model...")
    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        early_stopping_rounds=args.early_stopping_rounds,
        verbose=False
    )
    print("Training finished.")

    # --- Evaluate Model ---
    print("Evaluating model on validation set...")
    y_val_pred = model.predict(X_val)
    val_mse = mean_squared_error(y_val, y_val_pred)
    val_rmse = np.sqrt(val_mse)
    val_mae = mean_absolute_error(y_val, y_val_pred)
    val_r2 = r2_score(y_val, y_val_pred)
    
    print("Evaluating model on test set...")
    y_test_pred = model.predict(X_test)
    test_mse = mean_squared_error(y_test, y_test_pred)
    test_rmse = np.sqrt(test_mse)
    test_mae = mean_absolute_error(y_test, y_test_pred)
    test_r2 = r2_score(y_test, y_test_pred)
    
    print(f"Validation Results - RMSE: {val_rmse:.4f}, MAE: {val_mae:.4f}, R²: {val_r2:.4f}")
    print(f"Test Results - RMSE: {test_rmse:.4f}, MAE: {test_mae:.4f}, R²: {test_r2:.4f}")

    # Feature importance
    feature_importance = model.feature_importances_
    print(f"Feature importance shape: {feature_importance.shape}")

    # --- Save Model ---
    model_path = None
    if args.output_dir and args.model_id:
        os.makedirs(args.output_dir, exist_ok=True)
        model_path = os.path.join(args.output_dir, f'xgboost_model_{args.model_id}.joblib')
        print(f"Saving model to {model_path}")
        
        # Save model and scaler
        model_data = {
            'model': model,
            'scaler': scaler,
            'feature_columns': all_cols,
            'target_column': args.target_column,
            'lookback_window': args.lookback_window,
            'feature_importance': feature_importance
        }
        joblib.dump(model_data, model_path)

    # --- Output Results ---
    final_message = f"XGBoost training completed successfully. Test RMSE: {test_rmse:.4f}, Test MAE: {test_mae:.4f}, Test R²: {test_r2:.4f}"
    print_json_output(success=True, message=final_message, rmse=test_rmse, mae=test_mae, r2=test_r2, model_path=model_path)

except Exception as e:
    print(f"An error occurred during training: {str(e)}")
    traceback.print_exc(file=sys.stderr)
    print_json_output(success=False, message=f"Training failed: {str(e)}")
    sys.exit(1) 