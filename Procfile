# Procfile for Heroku deployment - Python Backend Only
# Web process for Flask/FastAPI backend
web: gunicorn backend.app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120
