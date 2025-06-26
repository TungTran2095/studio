import os
from flask import Flask, request, jsonify
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

@app.route('/run-bot', methods=['POST'])
def run_bot():
    """
    This endpoint receives bot configuration and starts the bot.
    For now, it just prints the configuration.
    """
    data = request.json
    print("Received request to run bot:")
    print(f"Bot Name: {data.get('name')}")
    print(f"Project ID: {data.get('projectId')}")
    print(f"Backtest ID: {data.get('backtestId')}")
    print("Account Config:", data.get('account'))
    print("Strategy Config:", data.get('config'))
    
    # Here you would add the logic to instantiate and run your bot
    # For example:
    # from bot_runner import BotRunner
    # bot_runner = BotRunner(data)
    # bot_runner.start()
    
    return jsonify({"status": "success", "message": "Bot execution started"}), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(debug=True, port=port) 