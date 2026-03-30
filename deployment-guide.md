# SurveyAgent — Azure Web Apps Deployment Guide

This guide walks you through deploying SurveyAgent on **Azure Web App for Containers** using Docker.

---

## Architecture Overview

SurveyAgent runs as a **single Docker container** that serves both the FastAPI backend and the React frontend:

```
┌──────────────────────────────────────────────┐
│  Azure Web App for Containers               │
│  ┌────────────────────────────────────────┐  │
│  │  Docker Container                      │  │
│  │                                        │  │
│  │  Gunicorn + Uvicorn Workers            │  │
│  │  ├── FastAPI API  (/api/v1/*)          │  │
│  │  └── React SPA    (/* catch-all)       │  │
│  │       served from client/dist/         │  │
│  └────────────────────────────────────────┘  │
│            port 8000                         │
└──────────────────────────────────────────────┘
        │                          │
        ▼                          ▼
  MongoDB Atlas             External APIs
  (database)           (OpenAI, Resend, etc.)
```

**Why this approach?**

- `server/main.py` already serves the built React SPA from `client/dist/` — no need for a separate web server or container.
- Gunicorn with Uvicorn workers gives you production-grade ASGI serving with multiple worker processes.
- Single container = simpler deployment, no inter-container networking.

---

## Prerequisites

Before you begin, make sure you have:

| Requirement | Why |
|---|---|
| **Azure account** | To create the Web App and Container Registry |
| **Azure CLI** (`az`) | To run all Azure commands from your terminal |
| **Docker Desktop** | To build and test the container image locally |
| **MongoDB Atlas cluster** | SurveyAgent uses MongoDB — Atlas is the easiest managed option |
| **OpenAI API key** | Required for AI interviews, question generation, TTS |
| **Resend API key** | Required for email OTP verification and invite emails |

Install Azure CLI if you don't have it:

```bash
# macOS
brew install azure-cli

# Windows (winget)
winget install Microsoft.AzureCLI

# Or download from https://learn.microsoft.com/en-us/cli/azure/install-azure-cli
```

Log in:

```bash
az login
```

---

## Step 1: Understand the Dockerfile

The project includes a multi-stage `Dockerfile` at the repo root:

```dockerfile
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
RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn
COPY server/ ./server/
COPY scripts/ ./scripts/
COPY --from=frontend /app/client/dist ./client/dist
EXPOSE 8000
CMD ["gunicorn", "server.main:app", "-w", "2", "-k", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", "--timeout", "120"]
```

**What each stage does:**

| Stage | Purpose |
|---|---|
| **Stage 1 (Node)** | Installs npm deps, runs `npm run build` to produce `client/dist/` (static SPA files). This stage is thrown away after build — Node.js is NOT in the final image. |
| **Stage 2 (Python)** | Installs Python deps + Gunicorn, copies backend source and the built frontend from Stage 1. The final image only contains Python + your app. |

**Why Gunicorn + Uvicorn?**

- FastAPI is an ASGI app — it needs an ASGI server (Uvicorn).
- Gunicorn manages multiple Uvicorn worker processes for better concurrency.
- `--timeout 120` accommodates long-running SSE streaming responses (AI interviews can stream for 60+ seconds).
- 2 workers (`-w 2`) is a good starting point for a B1/B2 App Service plan. Scale up for higher plans.

---

## Step 2: Test the Build Locally

Before pushing to Azure, verify the image works:

```bash
# Build the image
docker build -t surveyagent:latest .

# Run it (pass required env vars)
docker run -p 8000:8000 \
  -e MONGO_URI="mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority" \
  -e MONGO_DB_NAME="surveyagent" \
  -e JWT_SECRET_KEY="your-secret-key-minimum-32-characters-long" \
  -e OPENAI_API_KEY="sk-..." \
  -e RESEND_API_KEY="re_..." \
  -e FRONTEND_URL="http://localhost:8000" \
  -e ENABLE_DOCS="false" \
  surveyagent:latest
```

Open `http://localhost:8000` — you should see the SurveyAgent landing page.
Open `http://localhost:8000/health` — should return `{"status": "healthy"}`.

---

## Step 3: Create an Azure Container Registry (ACR)

**Why do we need ACR?**

Azure Web Apps pull Docker images from a container registry. ACR is Azure's private registry — it integrates natively with Web Apps (no extra auth setup), keeps your images within Azure's network, and is faster than pulling from Docker Hub.

```bash
# Set your variables
RESOURCE_GROUP="surveyagent-rg"
LOCATION="eastus"                    # Pick a region close to your users
ACR_NAME="surveyagentacr"           # Must be globally unique, lowercase, alphanumeric only

# Create a resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create the container registry (Basic SKU is fine for small projects)
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic \
  --admin-enabled true
```

**ACR SKUs:**

| SKU | Storage | Use case |
|-----|---------|----------|
| Basic | 10 GB | Side projects, small teams |
| Standard | 100 GB | Production apps |
| Premium | 500 GB | Geo-replication, private endpoints |

---

## Step 4: Build & Push the Image to ACR

```bash
# Log in to ACR
az acr login --name $ACR_NAME

# Tag and push (replace with your ACR name)
docker tag surveyagent:latest $ACR_NAME.azurecr.io/surveyagent:latest
docker push $ACR_NAME.azurecr.io/surveyagent:latest
```

**Alternative: Build directly in ACR** (no local Docker needed):

```bash
az acr build --registry $ACR_NAME --image surveyagent:latest .
```

This uploads your source to ACR and builds the image in the cloud. Useful if you don't have Docker Desktop or are on a CI machine.

---

## Step 5: Create the Azure Web App

```bash
APP_NAME="surveyagent-app"          # Must be globally unique — becomes <name>.azurewebsites.net
APP_PLAN="surveyagent-plan"

# Create an App Service Plan (Linux, B1 is the minimum for containers)
az appservice plan create \
  --name $APP_PLAN \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --is-linux \
  --sku B1

# Create the Web App pointing to your ACR image
az webapp create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --plan $APP_PLAN \
  --container-image-name $ACR_NAME.azurecr.io/surveyagent:latest
```

**App Service Plan tiers:**

| Tier | vCPUs | RAM | Best for |
|------|-------|-----|----------|
| B1 | 1 | 1.75 GB | Dev/testing, low traffic |
| B2 | 2 | 3.5 GB | Small production workloads |
| P1v3 | 2 | 8 GB | Production, autoscale |
| P2v3 | 4 | 16 GB | High traffic |

**Connect ACR credentials to the Web App:**

```bash
# Get ACR credentials
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query "username" -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)

az webapp config container set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --container-image-name $ACR_NAME.azurecr.io/surveyagent:latest \
  --container-registry-url https://$ACR_NAME.azurecr.io \
  --container-registry-user $ACR_USERNAME \
  --container-registry-password $ACR_PASSWORD
```

---

## Step 6: Configure Environment Variables

Azure Web Apps use **App Settings** as environment variables. Set all required vars:

```bash
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    MONGO_URI="mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority" \
    MONGO_DB_NAME="surveyagent" \
    JWT_SECRET_KEY="generate-a-random-64-char-string-here" \
    OPENAI_API_KEY="sk-..." \
    RESEND_API_KEY="re_..." \
    FRONTEND_URL="https://$APP_NAME.azurewebsites.net" \
    ENABLE_DOCS="false" \
    WEBSITES_PORT="8000"
```

**Important settings explained:**

| Variable | Why |
|---|---|
| `WEBSITES_PORT=8000` | Tells Azure which port your container listens on. Without this, Azure defaults to port 80 and your app won't respond. |
| `FRONTEND_URL` | Used in CORS, email templates, and invite links. Must match your actual domain. |
| `ENABLE_DOCS=false` | Disables `/docs` and `/redoc` in production (security best practice). |
| `JWT_SECRET_KEY` | Must be a strong random string (32+ chars). Generate one with `openssl rand -hex 32`. |

**Optional settings** (add if using these providers):

```bash
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    ANTHROPIC_API_KEY="sk-ant-..." \
    GEMINI_API_KEY="..."
```

**Survey limits** (recommended for hosted/production deployments):

```bash
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    MAX_SURVEYS_PER_USER="1" \
    BYPASS_LIMIT_EMAILS="admin@example.com"
```

| Variable | Why |
|---|---|
| `MAX_SURVEYS_PER_USER` | Limits survey creation per user to prevent LLM API abuse. `0` = unlimited (default). Set to `1` for production. |
| `BYPASS_LIMIT_EMAILS` | Comma-separated emails that skip the limit (e.g., platform admins). |

---

## Step 7: Configure Networking

### MongoDB Atlas Whitelist

If your MongoDB Atlas cluster uses IP whitelisting, you need to allow Azure's outbound IPs:

```bash
# Get the Web App's outbound IPs
az webapp show \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "outboundIpAddresses" \
  -o tsv
```

Add each IP to your Atlas cluster's Network Access list. Alternatively, allow `0.0.0.0/0` in Atlas (less secure but simpler for development).

### Enable WebSocket support (needed for SSE streaming)

```bash
az webapp config set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --web-sockets-enabled true
```

### Always-On (prevents cold starts)

```bash
az webapp config set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --always-on true
```

> Note: Always-On requires B1 tier or higher (not available on Free/Shared).

---

## Step 8: Deploy & Verify

```bash
# Restart the app to pull the latest image
az webapp restart --name $APP_NAME --resource-group $RESOURCE_GROUP

# Check logs to verify startup
az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP
```

You should see:
```
SurveyAgent API starting up...
MongoDB connection verified
```

Visit your app:
- Landing page: `https://<APP_NAME>.azurewebsites.net`
- Health check: `https://<APP_NAME>.azurewebsites.net/health`

---

## Step 9: Run Database Migration

If this is a fresh deployment or you're migrating from a pre-multi-tenant setup, run the migration script. You can do this from your local machine (it only needs the `MONGO_URI`):

```bash
# From your local project directory, with .env configured
python -m scripts.migrate_multi_tenant
```

This creates organizations for existing admins, sets default visibility on surveys, and creates all required MongoDB indexes.

---

## Step 10: Set Up Continuous Deployment (Optional)

### Option A: ACR Webhook (auto-deploy on image push)

```bash
# Enable continuous deployment
az webapp deployment container config \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --enable-cd true
```

This gives you a webhook URL. Register it in ACR:

```bash
WEBHOOK_URL=$(az webapp deployment container show-cd-url \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "CI_CD_URL" -o tsv)

az acr webhook create \
  --name deployWebhook \
  --registry $ACR_NAME \
  --uri $WEBHOOK_URL \
  --actions push \
  --scope surveyagent:latest
```

Now every `docker push` to ACR automatically redeploys the Web App.

### Option B: GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Build and Deploy to Azure

on:
  push:
    branches: [main]

env:
  ACR_NAME: surveyagentacr
  APP_NAME: surveyagent-app
  RESOURCE_GROUP: surveyagent-rg

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Log in to ACR
        uses: azure/docker-login@v2
        with:
          login-server: ${{ env.ACR_NAME }}.azurecr.io
          username: ${{ secrets.ACR_USERNAME }}
          password: ${{ secrets.ACR_PASSWORD }}

      - name: Build and push image
        run: |
          docker build -t ${{ env.ACR_NAME }}.azurecr.io/surveyagent:${{ github.sha }} .
          docker build -t ${{ env.ACR_NAME }}.azurecr.io/surveyagent:latest .
          docker push ${{ env.ACR_NAME }}.azurecr.io/surveyagent:${{ github.sha }}
          docker push ${{ env.ACR_NAME }}.azurecr.io/surveyagent:latest

      - name: Deploy to Azure Web App
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ env.APP_NAME }}
          images: ${{ env.ACR_NAME }}.azurecr.io/surveyagent:${{ github.sha }}
```

**Required GitHub Secrets:**
- `ACR_USERNAME` — from `az acr credential show`
- `ACR_PASSWORD` — from `az acr credential show`

---

## Custom Domain (Optional)

```bash
# Add custom domain
az webapp config hostname add \
  --webapp-name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --hostname yourdomain.com

# Enable managed SSL certificate (free)
az webapp config ssl create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --hostname yourdomain.com

az webapp config ssl bind \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --certificate-thumbprint <THUMBPRINT> \
  --ssl-type SNI
```

After adding a custom domain, update `FRONTEND_URL` in App Settings to match.

---

## Troubleshooting

### Container won't start

```bash
# Check container logs
az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP

# Check if the port is correct
az webapp config appsettings list --name $APP_NAME --resource-group $RESOURCE_GROUP | grep WEBSITES_PORT
```

Common causes:
- Missing `WEBSITES_PORT=8000` — Azure doesn't know which port to forward to
- Missing or wrong `MONGO_URI` — app crashes on startup when MongoDB ping fails
- Missing API keys — OpenAI/Resend keys not set

### App loads but API calls fail

- Check `FRONTEND_URL` matches your actual domain (affects CORS)
- For production, update CORS in `server/main.py` from `allow_origins=["*"]` to your specific domain

### MongoDB connection timeout

- Ensure Azure outbound IPs are whitelisted in MongoDB Atlas
- Check `MONGO_URI` includes `retryWrites=true&w=majority`

### SSE streaming cuts off

- Enable WebSockets: `az webapp config set --web-sockets-enabled true`
- The `--timeout 120` in Gunicorn should handle most streaming responses
- If interviews still time out, increase to `--timeout 300` in the Dockerfile CMD

### Cold starts are slow

- Enable Always-On (requires B1+ tier)
- The multi-stage Dockerfile keeps the image small (~200 MB), which helps pull speed

---

## Cost Estimate

| Resource | SKU | Approximate Monthly Cost |
|---|---|---|
| App Service Plan | B1 (1 core, 1.75 GB) | ~$13 |
| Container Registry | Basic (10 GB) | ~$5 |
| MongoDB Atlas | M0 (free) / M10 | Free / ~$57 |
| **Total (minimum)** | | **~$18/month** |

Scale up the App Service Plan as traffic grows. MongoDB Atlas M0 (free tier) works for development but has a 512 MB storage limit.
