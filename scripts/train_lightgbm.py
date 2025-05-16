
import os
import argparse
import json
import sys
import traceback
import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# --- Argument Parsing for LightGBM ---
parser = argparse.ArgumentParser(description='Train LightGBM model for time series forecasting.')
# Model Parameters (Example LightGBM params)
parser.add_argument('--num_leaves', type=int, default=31, help='Maximum number of leaves in one tree.')
parser.add_argument('--learning_rate', type=float, required=True, help='Boosting learning rate.')
parser.add_argument('--feature_fraction', type=float, default=0.9, help='Fraction of features to be considered for each tree.')
parser.add_argument('--bagging_fraction', type=float, default=0.8, help='Fraction of data to be used for bagging.')
parser.add_argument('--bagging_freq', type=int, default=5, help='Frequency for bagging.')
parser.add_argument('--boosting_type', type=str, default='gbdt', choices=['gbdt', 'dart', 'goss'], help='Boosting type.')
parser.add_argument('--num_iterations', type=int, required=True, help='Number of boosting iterations (trees).')
# Data Parameters
parser.add_argument('--train_test_split_ratio', type=float, required=True, help='Ratio for training data split.')
parser.add_argument('--target_column', type=str, default='close', help='Column name to predict.')
parser.add_argument('--feature_columns', nargs='+', default=['open', 'high', 'low', 'close', 'volume'], help='List of base feature columns.')
parser.add_argument('--lags', type=int, default=5, help='Number of lag features to create.')
parser.add_argument('--forecast_horizon', type=int, default=1, help='Number of steps ahead to predict.')

args = parser.parse_args()

# --- Helper Functions ---
def create_lag_features(df, lags, cols):
    """Creates lag features for specified columns."""
    df_lagged = df.copy()
    for col in cols:
        for lag in range(1, lags + 1):
            df_lagged[f'{col}_lag_{lag}'] = df_lagged[col].shift(lag)
    return df_lagged

def print_json_output(success, message=None, rmse=None, mae=None):
    output = {"success": success}
    if message:
        output["message"] = message
    if rmse is not None:
        if "results" not in output: output["results"] = {}
        output["results"]["rmse"] = rmse
    if mae is not None:
        if "results" not in output: output["results"] = {}
        output["results"]["mae"] = mae
    print(json.dumps(output))
    sys.stdout.flush()

# --- Main Training Logic ---
try:
    # --- 1. Connect to Supabase ---
    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    if not supabase_url or not supabase_key:
        raise ValueError("Missing Supabase URL or Key.")
    print("[Python Script - LightGBM] Connecting to Supabase...", file=sys.stderr)
    supabase: Client = create_client(supabase_url, supabase_key)
    print("[Python Script - LightGBM] Supabase client created.", file=sys.stderr)

    # --- 2. Fetch Data ---
    print(f"[Python Script - LightGBM] Fetching data...", file=sys.stderr)
    response = supabase.table("OHLCV_BTC_USDT_1m").select("*").order("open_time", desc=False).execute()
    print(f"[Python Script - LightGBM] Fetched {len(response.data)} records.", file=sys.stderr)
    if not response.data:
        raise ValueError("No data fetched.")

    df = pd.DataFrame(response.data)
    df['open_time'] = pd.to_datetime(df['open_time'])
    df = df.sort_values('open_time').set_index('open_time')

    # --- 3. Feature Engineering ---
    base_cols = args.feature_columns
    if not all(col in df.columns for col in base_cols):
        missing_cols = [col for col in base_cols if col not in df.columns]
        raise ValueError(f"Missing base columns: {', '.join(missing_cols)}")

    print(f"[Python Script - LightGBM] Creating {args.lags} lag features for {base_cols}...", file=sys.stderr)
    df_processed = create_lag_features(df[base_cols], args.lags, base_cols)

    # Create target variable (shifted future value)
    df_processed['target'] = df_processed[args.target_column].shift(-args.forecast_horizon)

    # Drop rows with NaN values created by shifting/lagging
    df_processed = df_processed.dropna()

    if df_processed.empty:
        raise ValueError("Not enough data after creating lag features and target.")

    print(f"[Python Script - LightGBM] Processed data shape: {df_processed.shape}", file=sys.stderr)
    # Define features (X) and target (y)
    feature_names = [col for col in df_processed.columns if col != 'target']
    X = df_processed[feature_names]
    y = df_processed['target']

    # --- 4. Split Data ---
    print(f"[Python Script - LightGBM] Splitting data (Train ratio: {args.train_test_split_ratio})...", file=sys.stderr)
    X_train, X_temp, y_train, y_temp = train_test_split(X, y, train_size=args.train_test_split_ratio, shuffle=False) # No shuffle for time series
    X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.5, shuffle=False)
    print(f"[Python Script - LightGBM] Split sizes: Train={len(X_train)}, Val={len(X_val)}, Test={len(X_test)}", file=sys.stderr)

    if len(X_train) == 0 or len(X_val) == 0 or len(X_test) == 0:
        raise ValueError("Data split resulted in empty sets.")

    # --- 5. Prepare LightGBM Datasets ---
    print("[Python Script - LightGBM] Creating LightGBM datasets...", file=sys.stderr)
    lgb_train = lgb.Dataset(X_train, y_train, feature_name=feature_names)
    lgb_val = lgb.Dataset(X_val, y_val, reference=lgb_train, feature_name=feature_names)

    # --- 6. Define LightGBM Parameters ---
    params = {
        'objective': 'regression_l1', # MAE loss, good for financial data
        'metric': ['mae', 'rmse'], # Evaluate using MAE and RMSE
        'boosting_type': args.boosting_type,
        'num_leaves': args.num_leaves,
        'learning_rate': args.learning_rate,
        'feature_fraction': args.feature_fraction,
        'bagging_fraction': args.bagging_fraction,
        'bagging_freq': args.bagging_freq,
        'verbose': -1, # Suppress verbose output during training
        'n_jobs': -1, # Use all available cores
        'seed': 42,
        'force_col_wise': True, # Often faster for large number of features
    }
    print("[Python Script - LightGBM] LightGBM Parameters:", params, file=sys.stderr)

    # --- 7. Train Model ---
    print(f"[Python Script - LightGBM] Starting training ({args.num_iterations} iterations)...", file=sys.stderr)
    evals_result = {} # To store evaluation results
    gbm = lgb.train(
        params,
        lgb_train,
        num_boost_round=args.num_iterations,
        valid_sets=[lgb_train, lgb_val],
        callbacks=[
            lgb.early_stopping(stopping_rounds=20, verbose=True), # Increased verbosity for callback
            lgb.log_evaluation(period=10), # Log every 10 rounds
            lgb.record_evaluation(evals_result) # Store metrics
        ]
    )
    print("[Python Script - LightGBM] Training finished.", file=sys.stderr)

    # --- 8. Evaluate Model ---
    print("[Python Script - LightGBM] Evaluating model on test set...", file=sys.stderr)
    y_pred_test = gbm.predict(X_test, num_iteration=gbm.best_iteration)

    rmse = np.sqrt(mean_squared_error(y_test, y_pred_test))
    mae = mean_absolute_error(y_test, y_pred_test)
    print(f"[Python Script - LightGBM] Evaluation Results - RMSE: {rmse:.4f}, MAE: {mae:.4f}", file=sys.stderr)

    # Get validation metrics from the best iteration
    try:
        best_iter_index = gbm.best_iteration - 1 if gbm.best_iteration > 0 else 0
        val_rmse = evals_result['valid_1']['rmse'][best_iter_index]
        val_mae = evals_result['valid_1']['mae'][best_iter_index]
        final_val_loss_message = f"Best Iteration: {gbm.best_iteration}, Val RMSE: {val_rmse:.4f}, Val MAE: {val_mae:.4f}"
    except (IndexError, KeyError) as e:
         print(f"[Python Script - LightGBM] Warning: Could not retrieve validation metrics from evals_result. Error: {e}", file=sys.stderr)
         final_val_loss_message = f"Training Completed. Best Iteration: {gbm.best_iteration} (Validation metrics retrieval failed)"


    # --- 9. Output Results ---
    final_message = f"LightGBM Training completed. {final_val_loss_message}"
    # Output test set metrics
    print_json_output(success=True, message=final_message, rmse=rmse, mae=mae)

except Exception as e:
    print(f"[Python Script ERROR - LightGBM] An error occurred: {str(e)}", file=sys.stderr)
    traceback.print_exc(file=sys.stderr)
    print_json_output(success=False, message=f"LightGBM Training failed: {str(e)}")
    sys.exit(1)
