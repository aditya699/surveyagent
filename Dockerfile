# ---- Stage 1: Build React frontend ----
FROM node:22-alpine AS frontend

WORKDIR /app/client

COPY client/package.json client/package-lock.json* ./
RUN npm ci

COPY client/ ./
RUN npm run build

# ---- Stage 2: Python backend + serve built SPA ----
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy backend source
COPY server/ ./server/
COPY scripts/ ./scripts/

# Copy built frontend from stage 1
COPY --from=frontend /app/client/dist ./client/dist

EXPOSE 8000

CMD ["gunicorn", "server.main:app", "-w", "2", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--timeout", "120"]
