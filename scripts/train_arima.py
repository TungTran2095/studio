import os
import argparse
import json
import sys
import traceback
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.stattools import adfuller
from statsmodels.graphics.tsaplots import plot_acf, plot_pacf
import warnings
import joblib
from dotenv import load_dotenv

# Suppress warnings
warnings.filterwarnings('ignore')

# Load environment variables
load_dotenv()

# --- Argument Parsing ---
parser = argparse.ArgumentParser(description='Train ARIMA model for time series forecasting.')
# New arguments for API integration
parser.add_argument('--train_data', type=str, help='Path to training data JSON file')
parser.add_argument('--test_data', type=str, help='Path to test data JSON file')
parser.add_argument('--config', type=str, help='Path to configuration JSON file')
parser.add_argument('--model_id', type=str, help='Model ID for tracking')
parser.add_argument('--output_dir', type=str, help='Output directory for model files')

# ARIMA parameters (with defaults)
parser.add_argument('--p', type=int, default=1, help='Order of autoregression (AR)')
parser.add_argument('--d', type=int, default=1, help='Degree of differencing (I)')
parser.add_argument('--q', type=int, default=1, help='Order of moving average (MA)')
parser.add_argument('--seasonal_p', type=int, default=0, help='Seasonal AR order')
parser.add_argument('--seasonal_d', type=int, default=0, help='Seasonal differencing order')
parser.add_argument('--seasonal_q', type=int, default=0, help='Seasonal MA order')
parser.add_argument('--seasonal_periods', type=int, default=12, help='Number of periods in season')
parser.add_argument('--auto_arima', type=bool, default=False, help='Use auto ARIMA for parameter selection')

# Data parameters
parser.add_argument('--target_column', type=str, default='close', help='Column name to predict.')
parser.add_argument('--feature_columns', nargs='+', default=['close'], help='List of feature columns to use.')

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

def check_stationarity(timeseries):
    """Check if time series is stationary using Augmented Dickey-Fuller test"""
    result = adfuller(timeseries.dropna())
    print(f'ADF Statistic: {result[0]:.6f}')
    print(f'p-value: {result[1]:.6f}')
    
    if result[1] <= 0.05:
        print("Series is stationary")
        return True
    else:
        print("Series is not stationary")
        return False

def make_stationary(timeseries, max_diff=2):
    """Make time series stationary by differencing"""
    diff_series = timeseries.copy()
    d = 0
    
    for i in range(max_diff):
        if check_stationarity(diff_series):
            break
        diff_series = diff_series.diff().dropna()
        d += 1
        print(f"Applied differencing {d} time(s)")
    
    return diff_series, d

def print_json_output(success, message=None, rmse=None, mae=None, aic=None, bic=None, model_path=None):
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
    if aic is not None:
         if "results" not in output: output["results"] = {}
         output["results"]["aic"] = aic
    if bic is not None:
         if "results" not in output: output["results"] = {}
         output["results"]["bic"] = bic
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

    # Select target column
    if args.target_column not in df.columns:
        raise ValueError(f"Target column '{args.target_column}' not found in data")

    print(f"Using target column: {args.target_column}")
    
    # Prepare time series data
    ts_data = df[args.target_column].astype(float)
    
    # Split data
    train_ts = ts_data[:train_size]
    test_ts = ts_data[train_size:]
    
    print(f"Time series split: Train={len(train_ts)}, Test={len(test_ts)}")

    if len(train_ts) < 10:
        raise ValueError("Not enough training data for ARIMA model")

    # --- Check and Make Stationary ---
    print("Checking stationarity of training data...")
    if not check_stationarity(train_ts):
        print("Making series stationary...")
        stationary_ts, d_auto = make_stationary(train_ts)
        if args.d == 1 and d_auto != 1:  # Update d if auto-detected
            args.d = d_auto
            print(f"Updated differencing order to d={args.d}")

    # --- Build and Train ARIMA Model ---
    print(f"Building ARIMA model with order ({args.p}, {args.d}, {args.q})")
    
    if args.seasonal_p > 0 or args.seasonal_d > 0 or args.seasonal_q > 0:
        # SARIMA model
        seasonal_order = (args.seasonal_p, args.seasonal_d, args.seasonal_q, args.seasonal_periods)
        print(f"Using seasonal order: {seasonal_order}")
        model = ARIMA(train_ts, order=(args.p, args.d, args.q), seasonal_order=seasonal_order)
    else:
        # Regular ARIMA model
        model = ARIMA(train_ts, order=(args.p, args.d, args.q))

    print("Training ARIMA model...")
    fitted_model = model.fit()
    print("Training finished.")

    # Print model summary
    print(f"AIC: {fitted_model.aic:.4f}")
    print(f"BIC: {fitted_model.bic:.4f}")

    # --- Make Predictions ---
    print("Making predictions on test set...")
    
    # Forecast
    forecast_steps = len(test_ts)
    forecast = fitted_model.forecast(steps=forecast_steps)
    
    # Calculate metrics
    test_rmse = np.sqrt(mean_squared_error(test_ts, forecast))
    test_mae = mean_absolute_error(test_ts, forecast)
    
    print(f"Test Results - RMSE: {test_rmse:.4f}, MAE: {test_mae:.4f}")
    print(f"Model AIC: {fitted_model.aic:.4f}, BIC: {fitted_model.bic:.4f}")

    # --- Save Model ---
    model_path = None
    if args.output_dir and args.model_id:
        os.makedirs(args.output_dir, exist_ok=True)
        model_path = os.path.join(args.output_dir, f'arima_model_{args.model_id}.joblib')
        print(f"Saving model to {model_path}")
        
        # Save model and metadata
        model_data = {
            'fitted_model': fitted_model,
            'target_column': args.target_column,
            'order': (args.p, args.d, args.q),
            'seasonal_order': (args.seasonal_p, args.seasonal_d, args.seasonal_q, args.seasonal_periods) if args.seasonal_p > 0 or args.seasonal_d > 0 or args.seasonal_q > 0 else None,
            'train_data_tail': train_ts.tail(50).tolist(),  # Save last 50 points for future forecasting
            'aic': fitted_model.aic,
            'bic': fitted_model.bic
        }
        joblib.dump(model_data, model_path)

    # --- Output Results ---
    final_message = f"ARIMA training completed successfully. Test RMSE: {test_rmse:.4f}, Test MAE: {test_mae:.4f}, AIC: {fitted_model.aic:.4f}"
    print_json_output(
        success=True, 
        message=final_message, 
        rmse=test_rmse, 
        mae=test_mae, 
        aic=fitted_model.aic,
        bic=fitted_model.bic,
        model_path=model_path
    )

except Exception as e:
    print(f"An error occurred during training: {str(e)}")
    traceback.print_exc(file=sys.stderr)
    print_json_output(success=False, message=f"Training failed: {str(e)}")
    sys.exit(1) 