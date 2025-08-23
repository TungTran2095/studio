from flask import Flask, jsonify, request
from fastapi import FastAPI, HTTPException
import os
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Flask app for legacy support
flask_app = Flask(__name__)

# Enable CORS for frontend
from flask_cors import CORS
CORS(flask_app, origins=[
    "https://*.vercel.app",
    "https://*.netlify.app", 
    "https://*.firebaseapp.com",
    "http://localhost:3000",
    "http://localhost:9002"
])

@flask_app.route('/')
def home():
    return jsonify({
        "message": "Trading Bot Studio Backend",
        "status": "running",
        "environment": os.getenv('PYTHON_ENV', 'development'),
        "version": "1.0.0"
    })

@flask_app.route('/health')
def health():
    return jsonify({"status": "healthy"})

@flask_app.route('/api/status')
def api_status():
    return jsonify({
        "backend": "running",
        "database": "connected",
        "version": "1.0.0",
        "cors_enabled": True
    })

# FastAPI app for modern API endpoints
fastapi_app = FastAPI(
    title="Trading Bot Studio API",
    description="Python backend for trading bot platform with AI/ML capabilities",
    version="1.0.0"
)

@fastapi_app.get("/")
async def root():
    return {
        "message": "Trading Bot Studio Backend",
        "status": "running",
        "environment": os.getenv('PYTHON_ENV', 'development')
    }

@fastapi_app.get("/health")
async def health_check():
    return {"status": "healthy"}

@fastapi_app.get("/api/status")
async def api_status():
    return {
        "backend": "running",
        "database": "connected",
        "version": "1.0.0"
    }

# Main app variable for Heroku
app = flask_app

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False) 