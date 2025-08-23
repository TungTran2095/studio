#!/usr/bin/env python3
"""
WSGI entry point for Heroku deployment
"""
import os
import sys

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

# Import the Flask app from backend
from backend.app import app

# For Heroku, we need to expose the app variable
if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
