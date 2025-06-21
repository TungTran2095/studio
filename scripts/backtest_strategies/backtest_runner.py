import pandas as pd
import numpy as np
import json
import os
import sys
from datetime import datetime
from typing import Dict, Any
import argparse
from supabase import create_client, Client

# Add parent directory to Python path để có thể import các module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import các strategy
from backtest_strategies.ma_crossover_strategy import MACrossoverStrategy
from backtest_strategies.rsi_strategy import RSIStrategy
from backtest_strategies.macd_strategy import MACDStrategy
from backtest_strategies.bollinger_bands_strategy import BollingerBandsStrategy
from backtest_strategies.breakout_strategy import BreakoutStrategy

# Khởi tạo Supabase client
supabase: Client = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL', ''),
    os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')
)

def load_data(symbol: str, timeframe: str, start_date: str, end_date: str) -> pd.DataFrame:
    """Load historical price data for backtesting from Supabase"""
    try:
        # Dựa trên thông tin từ người dùng, dữ liệu OHLCV nằm trong bảng cụ thể cho mỗi symbol.
        # Ví dụ: 'OHLCV_BTC_USDT_1m'.
        # Xây dựng tên bảng một cách động từ symbol, giả sử timeframe cơ sở là 1m.
        table_name = f"OHLCV_BTC_USDT_1m"
        print(f"INFO: Attempting to load data from table '{table_name}'")

        # Lấy dữ liệu từ bảng được xây dựng động
        response = supabase.table(table_name) \
            .select('*') \
            .gte('open_time', start_date) \
            .lte('open_time', end_date) \
            .order('open_time', desc=False) \
            .execute()
        
        if not response.data:
            raise ValueError(f"No data found for symbol {symbol} in table {table_name} between {start_date} and {end_date}")

        # Convert to DataFrame
        df = pd.DataFrame(response.data)

        # Đảm bảo các cột đúng chuẩn OHLCV
        # Nếu cần, có thể rename cho đồng nhất
        # Ở đây giả sử các cột đã đúng: open, high, low, close, volume

        # Chuyển đổi open_time thành datetime index
        df['open_time'] = pd.to_datetime(df['open_time'])
        df.set_index('open_time', inplace=True)

        # Resample data theo timeframe
        if timeframe != '1m':  # Nếu không phải 1 phút thì cần resample
            # Map timeframe to pandas offset string
            timeframe_map = {
                '1m': '1T',
                '3m': '3T',
                '5m': '5T',
                '15m': '15T',
                '30m': '30T',
                '1h': 'H',
                '2h': '2H',
                '4h': '4H',
                '6h': '6H',
                '8h': '8H',
                '12h': '12H',
                '1d': 'D',
                '3d': '3D',
                '1w': 'W',
                '1M': 'M'
            }
            
            rule = timeframe_map.get(timeframe)
            if not rule:
                raise ValueError(f"Invalid timeframe: {timeframe}")
            
            # Resample OHLCV data
            df = df.resample(rule).agg({
                'open': 'first',
                'high': 'max',
                'low': 'min',
                'close': 'last',
                'volume': 'sum'
            }).dropna()
        
        return df

    except Exception as e:
        print(f"Error loading data: {str(e)}")
        raise

def run_backtest(config: Dict[str, Any], experiment_id: str) -> Dict[str, Any]:
    """Run backtest with specified strategy and parameters"""
    # Create results directory if it doesn't exist
    results_dir = os.path.join('results', 'backtests', experiment_id)
    os.makedirs(results_dir, exist_ok=True)

    # Load data
    symbol = config['trading']['symbol']
    timeframe = config['trading']['timeframe']
    start_date = config['trading'].get('startDate', '2023-01-01')
    end_date = config['trading'].get('endDate', '2023-12-31')
    
    data = load_data(symbol, timeframe, start_date, end_date)

    # Strategy mapping
    strategy_map = {
        'ma_crossover': MACrossoverStrategy,
        'rsi': RSIStrategy,
        'macd': MACDStrategy,
        'bollinger_bands': BollingerBandsStrategy,
        'breakout': BreakoutStrategy
    }

    # Get strategy class
    strategy_type = config['strategy']['type']
    if strategy_type not in strategy_map:
        raise ValueError(f"Strategy type '{strategy_type}' not supported")

    StrategyClass = strategy_map[strategy_type]

    # Initialize strategy
    strategy = StrategyClass(config)

    # Run backtest
    results = strategy.run_backtest(data)
    
    # Lấy dữ liệu indicator từ strategy
    signals_data = strategy.generate_signals(data)
    
    # Chuẩn bị dữ liệu indicator cho chart
    indicators_data = {
        'timestamps': (signals_data.index.astype(np.int64) // 10**6).tolist(),  # Convert to milliseconds
        'close_prices': signals_data['close'].tolist(),
        'indicators': {}
    }
    
    # Thêm các indicator tùy theo loại strategy
    if strategy_type == 'rsi':
        indicators_data['indicators']['rsi'] = [convert_datetime(x) for x in signals_data['rsi'].tolist()]
    elif strategy_type == 'macd':
        indicators_data['indicators']['macd'] = [convert_datetime(x) for x in signals_data['macd'].tolist()]
        indicators_data['indicators']['signal'] = [convert_datetime(x) for x in signals_data['signal'].tolist()]
        indicators_data['indicators']['histogram'] = [convert_datetime(x) for x in signals_data['histogram'].tolist()]
    elif strategy_type == 'ma_crossover':
        indicators_data['indicators']['fast_ma'] = [convert_datetime(x) for x in signals_data['fast_ma'].tolist()]
        indicators_data['indicators']['slow_ma'] = [convert_datetime(x) for x in signals_data['slow_ma'].tolist()]
    elif strategy_type == 'bollinger_bands':
        indicators_data['indicators']['upper'] = [convert_datetime(x) for x in signals_data['upper'].tolist()]
        indicators_data['indicators']['middle'] = [convert_datetime(x) for x in signals_data['middle'].tolist()]
        indicators_data['indicators']['lower'] = [convert_datetime(x) for x in signals_data['lower'].tolist()]

    # Save results
    save_results(results, results_dir, strategy_type)

    # Thêm indicators data vào results
    results['indicators'] = indicators_data

    return results

def save_results(results: Dict[str, Any], results_dir: str, strategy_type: str):
    """Save backtest results to file"""
    # Create unique filename with timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"{strategy_type}_{timestamp}"

    # Save performance metrics
    metrics_file = os.path.join(results_dir, f"{filename}_metrics.json")
    with open(metrics_file, 'w') as f:
        json.dump(results['performance'], f, indent=4)

    # Save trades
    trades_file = os.path.join(results_dir, f"{filename}_trades.csv")
    trades_df = pd.DataFrame(results['trades'])
    trades_df.to_csv(trades_file, index=False)

    # Save equity curve
    equity_file = os.path.join(results_dir, f"{filename}_equity.csv")
    equity_df = pd.DataFrame({'equity': results['equity_curve']})
    equity_df.to_csv(equity_file, index=False)

    print(f"Results saved to {results_dir}/{filename}_*")

def convert_datetime(obj):
    """Convert various data types to JSON serializable format"""
    if isinstance(obj, (pd.Timestamp, datetime)):
        return obj.isoformat()
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, (np.floating, float)):
        # Xử lý NaN values
        if pd.isna(obj) or np.isnan(obj):
            return None
        return float(obj)
    if isinstance(obj, np.ndarray):
        # Xử lý numpy arrays với NaN values
        return [None if pd.isna(x) or np.isnan(x) else float(x) for x in obj.tolist()]
    if isinstance(obj, pd.Series):
        # Xử lý pandas Series với NaN values
        return [None if pd.isna(x) or np.isnan(x) else float(x) for x in obj.tolist()]
    if isinstance(obj, dict):
        # Xử lý nested dictionaries
        return {k: convert_datetime(v) for k, v in obj.items()}
    if isinstance(obj, list):
        # Xử lý lists
        return [convert_datetime(item) for item in obj]
    if isinstance(obj, (str, int, bool, type(None))):
        # Các kiểu dữ liệu cơ bản đã JSON serializable
        return obj
    # Xử lý các kiểu numpy khác
    if hasattr(obj, 'item'):
        try:
            return obj.item()
        except:
            pass
    # Nếu không xử lý được, chuyển thành string
    return str(obj)

if __name__ == '__main__':
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Run backtest strategy')
    parser.add_argument('--experiment_id', type=str, required=True, help='Experiment ID')
    parser.add_argument('--config', type=str, required=True, help='Backtest configuration in JSON format')
    args = parser.parse_args()

    # Parse config from JSON string
    config = json.loads(args.config)

    try:
        # Run backtest
        results = run_backtest(config, args.experiment_id)

        # In riêng từng phần cho API/backend dễ lấy
        if results:
            print(json.dumps({"trades": results.get("trades", [])}, default=convert_datetime))  # Dành cho cột trades
            print(json.dumps(results.get("performance", {}), default=convert_datetime))           # Dành cho cột results (summary)
            # In dữ liệu indicator cho chart
            if "indicators" in results:
                print(json.dumps({"indicators": results["indicators"]}, default=convert_datetime))
            # Nếu muốn in full để debug:
            # print(json.dumps(results, default=convert_datetime))
        else:
            print(json.dumps({'error': 'No results returned from backtest'}))

        exit(0)
    except Exception as e:
        print(json.dumps({'error': f'Error running backtest: {str(e)}'}))
        exit(1) 