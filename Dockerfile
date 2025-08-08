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
# Add environment variables for build stage
ENV NEXT_PUBLIC_SUPABASE_URL=""
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=""
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runtime stage ----
FROM node:20-bookworm AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Install Python for Flask backend
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip && rm -rf /var/lib/apt/lists/*

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

# Install Python dependencies (backend + optional root) and gunicorn
RUN pip3 install --no-cache-dir gunicorn \
    && if [ -f backend/requirements.txt ]; then pip3 install --no-cache-dir -r backend/requirements.txt; fi \
    && if [ -f requirements.txt ]; then pip3 install --no-cache-dir -r requirements.txt; fi

# Create start script to run Flask (internal) + Next.js (public)
RUN printf '#!/usr/bin/env bash\nset -e\n# Render sets $PORT for the public web service.\n# Run Flask on a fixed internal port to avoid collision with $PORT.\nexport NEXT_PUBLIC_NODE_ENV=${NODE_ENV}\n( if command -v gunicorn >/dev/null 2>&1; then \
    gunicorn -w 1 -b 0.0.0.0:5001 backend.app:app; \
  else \
    PORT=5001 python3 backend/app.py; \
  fi ) &\nexec npx next start -H 0.0.0.0 -p "${PORT:-9002}"\n' > /start.sh \
    && chmod +x /start.sh

EXPOSE 9002
CMD ["/start.sh"] 