
import os
import argparse
import json
import sys
import traceback
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
# NOTE: DLinear implementation usually requires a library like Darts or a custom PyTorch/TensorFlow implementation.
# This is a placeholder structure. Replace the model building/training part
# with your chosen DLinear implementation.
# For example, using Darts: from darts.models import DLinearModel
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# --- Argument Parsing for DLinear ---
parser = argparse.ArgumentParser(description='Train DLinear model for time series forecasting.')
# Model Architecture (Example DLinear params - adjust based on implementation, e.g., Darts)
parser.add_argument('--input_chunk_length', type=int, required=True, help='Lookback period.')
parser.add_argument('--output_chunk_length', type=int, required=True, help='Forecast horizon.')
parser.add_argument('--kernel_size', type=int, default=25, help='Kernel size for decomposition (Darts specific).')
parser.add_argument('--shared_weights', type=lambda x: (str(x).lower() == 'true'), default=False, help='Whether to share weights across the series (Darts specific).')
parser.add_argument('--const_init', type=lambda x: (str(x).lower() == 'true'), default=True, help='Whether to use constant initialization (Darts specific).')
# Training Parameters
parser.add_argument('--learning_rate', type=float, required=True, help='Optimizer learning rate.')
parser.add_argument('--batch_size', type=int, required=True, help='Training batch size.')
parser.add_argument('--epochs', type=int, required=True, help='Number of training epochs.')
# Data Parameters
parser.add_argument('--train_test_split_ratio', type=float, required=True, help='Ratio for training data split.')
parser.add_argument('--target_column', type=str, default='close', help='Column name to predict.')
parser.add_argument('--feature_columns', nargs='+', default=['open', 'high', 'low', 'close', 'volume'], help='List of feature columns.')

args = parser.parse_args()

# --- Helper Functions ---
def create_sequences(data, target_col_index, timesteps):
    # Adjust sequence creation if needed for the specific DLinear library
    X, y = [], []
    for i in range(len(data) - timesteps - args.output_chunk_length + 1): # Adjust for forecast horizon
        X.append(data[i:(i + timesteps)])
        # DLinear often predicts multiple steps ahead
        y.append(data[i + timesteps : i + timesteps + args.output_chunk_length, target_col_index])
    if not X:
        raise ValueError("Not enough data to create sequences with the given input/output lengths.")
    return np.array(X), np.array(y)

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
    print("[Python Script - DLinear] Connecting to Supabase...", file=sys.stderr)
    supabase: Client = create_client(supabase_url, supabase_key)
    print("[Python Script - DLinear] Supabase client created.", file=sys.stderr)

    # --- 2. Fetch Data ---
    print(f"[Python Script - DLinear] Fetching data...", file=sys.stderr)
    response = supabase.table("OHLCV_BTC_USDT_1m").select("*").order("open_time", desc=False).execute()
    print(f"[Python Script - DLinear] Fetched {len(response.data)} records.", file=sys.stderr)
    if not response.data:
        raise ValueError("No data fetched.")

    df = pd.DataFrame(response.data)
    df['open_time'] = pd.to_datetime(df['open_time'])
    df = df.sort_values('open_time').set_index('open_time')

    # --- 3. Preprocess Data ---
    all_cols = list(dict.fromkeys([args.target_column] + args.feature_columns))
    if not all(col in df.columns for col in all_cols):
        missing_cols = [col for col in all_cols if col not in df.columns]
        raise ValueError(f"Missing columns: {', '.join(missing_cols)}")

    print(f"[Python Script - DLinear] Using features: {all_cols}", file=sys.stderr)
    data_to_process = df[all_cols].astype(float).values
    target_col_index_in_features = all_cols.index(args.target_column)

    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_data = scaler.fit_transform(data_to_process)
    print(f"[Python Script - DLinear] Scaled data shape: {scaled_data.shape}", file=sys.stderr)

    # Create sequences (adjust if using Darts or similar library)
    print(f"[Python Script - DLinear] Creating sequences (Input: {args.input_chunk_length}, Output: {args.output_chunk_length})...", file=sys.stderr)
    # Note: Libraries like Darts handle sequence creation differently (using TimeSeries objects)
    X, y = create_sequences(scaled_data, target_col_index_in_features, args.input_chunk_length)
    print(f"[Python Script - DLinear] Created sequences: X shape={X.shape}, y shape={y.shape}", file=sys.stderr)

    # --- 4. Split Data ---
    print(f"[Python Script - DLinear] Splitting data (Train ratio: {args.train_test_split_ratio})...", file=sys.stderr)
    X_train, X_temp, y_train, y_temp = train_test_split(X, y, train_size=args.train_test_split_ratio, shuffle=False)
    X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.5, shuffle=False)
    print(f"[Python Script - DLinear] Split sizes: Train={len(X_train)}, Val={len(X_val)}, Test={len(X_test)}", file=sys.stderr)

    if len(X_train) == 0 or len(X_val) == 0 or len(X_test) == 0:
        raise ValueError("Data split resulted in empty sets.")

    # --- 5. Build DLinear Model (Placeholder) ---
    print(f"[Python Script - DLinear] Building DLinear model (Placeholder)...", file=sys.stderr)
    # Example using Darts (requires installing darts: pip install darts)
    # from darts import TimeSeries
    # from darts.models import DLinearModel
    #
    # # Convert numpy arrays to Darts TimeSeries objects (requires timestamps)
    # # This step needs careful handling of train/val/test splits with TimeSeries
    # train_series = TimeSeries.from_values(y_train) # Example, needs proper creation
    # val_series = TimeSeries.from_values(y_val) # Example
    #
    # model = DLinearModel(
    #     input_chunk_length=args.input_chunk_length,
    #     output_chunk_length=args.output_chunk_length,
    #     kernel_size=args.kernel_size,
    #     shared_weights=args.shared_weights,
    #     const_init=args.const_init,
    #     n_epochs=args.epochs,
    #     batch_size=args.batch_size,
    #     optimizer_kwargs={'lr': args.learning_rate},
    #     # Add other necessary Darts DLinear parameters
    #     model_name="dlinear_btc_model",
    #     log_tensorboard=False, # Or configure TensorBoard
    #     force_reset=True,
    #     save_checkpoints=False,
    # )

    # --- 6. Compile Model (Placeholder - depends on implementation) ---
    print(f"[Python Script - DLinear] Compiling model (Placeholder)...", file=sys.stderr)
    # If using TensorFlow/Keras DLinear, compile here: model.compile(...)

    # --- 7. Train Model (Placeholder) ---
    print(f"[Python Script - DLinear] Starting training (Placeholder: {args.epochs} epochs)...", file=sys.stderr)
    # Example using Darts:
    # model.fit(train_series, val_series=val_series, verbose=True)

    # Placeholder success simulation
    print("[Python Script - DLinear] Placeholder Training finished.", file=sys.stderr)
    history = {'val_loss': [0.08, 0.04]} # Dummy history

    # --- 8. Evaluate Model (Placeholder) ---
    print("[Python Script - DLinear] Evaluating model (Placeholder)...", file=sys.stderr)
    # Example using Darts:
    # predictions = model.predict(n=len(X_test), series=train_series) # Needs test series input
    # Calculate metrics based on predictions vs y_test (needs reshaping/alignment)
    # rmse = np.sqrt(mean_squared_error(y_test.flatten(), predictions.values().flatten()))
    # mae = mean_absolute_error(y_test.flatten(), predictions.values().flatten())
    from sklearn.metrics import mean_squared_error, mean_absolute_error # Import for placeholder
    # Placeholder evaluation results
    loss = 0.04 # Dummy loss
    mae = 0.07 # Dummy mae
    rmse = np.sqrt(loss)
    print(f"[Python Script - DLinear] Placeholder Eval Results - RMSE: {rmse:.4f}, MAE: {mae:.4f}", file=sys.stderr)


    # --- 9. Output Results ---
    final_message = f"DLinear Training completed (Placeholder). Final Val Loss: {history['val_loss'][-1]:.4f}"
    print_json_output(success=True, message=final_message, rmse=rmse, mae=mae)

except Exception as e:
    print(f"[Python Script ERROR - DLinear] An error occurred: {str(e)}", file=sys.stderr)
    traceback.print_exc(file=sys.stderr)
    print_json_output(success=False, message=f"DLinear Training failed: {str(e)}")
    sys.exit(1)
