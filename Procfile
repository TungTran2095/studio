# Procfile for Heroku deployment
# Web process for Flask/FastAPI backend
web: gunicorn backend.app:app --bind 0.0.0.0:$PORT --workers 4 --timeout 120

# Worker process for background tasks (optional)
# worker: python scripts/worker.py

# Release process for database migrations (optional)
# release: python scripts/migrate.py
