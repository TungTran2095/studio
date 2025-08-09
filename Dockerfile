# syntax=docker/dockerfile:1

# ---- deps stage: install node deps ----
FROM node:20-bookworm AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ---- builder stage: build Next.js ----
FROM node:20-bookworm AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Ensure public dir exists even if repo doesn't have it to prevent copy errors later
RUN mkdir -p public
RUN npm run build

# ---- runtime stage ----
FROM node:20-bookworm AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Install Python for Flask backend (use venv to avoid PEP 668)
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-venv \
    && rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /opt/venv && /opt/venv/bin/python -m ensurepip --upgrade
ENV VIRTUAL_ENV=/opt/venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Copy runtime app artifacts
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/backend ./backend
# Optional: if your Python jobs/tools use root requirements
COPY --from=builder /app/requirements.txt ./requirements.txt

# Install production Node deps
RUN npm ci --omit=dev

# Install Python dependencies (backend + optional root) and gunicorn inside venv
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir gunicorn \
    && if [ -f backend/requirements.txt ]; then pip install --no-cache-dir -r backend/requirements.txt; fi \
    && if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi

# Create start script to run Flask (internal) + Next.js (public)
RUN printf '#!/usr/bin/env bash\nset -e\n# Render sets $PORT for the public web service.\n# Run Flask on a fixed internal port to avoid collision with $PORT.\nexport NEXT_PUBLIC_NODE_ENV=${NODE_ENV}\n( if command -v gunicorn >/dev/null 2>&1; then \
    gunicorn -w 1 -b 0.0.0.0:5001 backend.app:app; \
  else \
    PORT=5001 python backend/app.py; \
  fi ) &\nexec npx next start -H 0.0.0.0 -p "${PORT:-9002}"\n' > /start.sh \
    && chmod +x /start.sh

EXPOSE 9002
CMD ["/start.sh"] 