# Azure Deployment Guide — Rezzy Pipeline

This guide explains how the Azure infrastructure works and how to update the pipeline when you make code changes.

---

## Architecture Overview

```
┌─────────────────────┐         ┌──────────────────────────┐
│  Vercel (Frontend)  │────────▶│  Azure Container App     │
│  rezzy-eight.       │  HTTPS  │  rezzy-pipeline.         │
│  vercel.app         │         │  livelybay-96c41090.     │
│                     │         │  eastus.azurecontainer    │
│  Next.js API routes │         │  apps.io                 │
│  proxy all calls    │         │                          │
│  to Azure ──────────┼────────▶│  FastAPI (pipeline_api)  │
└─────────────────────┘         │  + Tectonic (LaTeX→PDF)  │
                                └──────────────────────────┘
                                         ▲
                                         │ Pulls image from
                                ┌────────┴─────────┐
                                │  Azure Container  │
                                │  Registry (ACR)   │
                                │  rezzyacr.        │
                                │  azurecr.io       │
                                └──────────────────┘
```

### How the pieces connect

| Component | What it does | URL |
|-----------|-------------|-----|
| **Vercel** | Hosts the Next.js frontend. API routes (`/api/pipeline/*`) proxy requests server-side to Azure. | `rezzy-eight.vercel.app` |
| **Azure Container App** | Runs the Python pipeline (FastAPI + Tectonic). | `rezzy-pipeline.livelybay-96c41090.eastus.azurecontainerapps.io` |
| **Azure Container Registry** | Stores Docker images. The Container App pulls from here. | `rezzyacr.azurecr.io` |

### Local vs Production

| | Local Dev | Production |
|---|-----------|-----------|
| Frontend | `npm run dev` → `localhost:3000` | Vercel |
| Pipeline API | `uvicorn pipeline_api:app --port 5001` → `localhost:5001` | Azure Container App |
| How they connect | `NEXT_PUBLIC_API_URL=http://localhost:5001` | `NEXT_PUBLIC_ACA_URL=https://rezzy-pipeline...` |

**Local never touches Azure.** The env var fallback chain in the API routes is:
```
PIPELINE_API_URL → NEXT_PUBLIC_API_URL → NEXT_PUBLIC_ACA_URL → localhost:5001
```
Locally, `NEXT_PUBLIC_API_URL` is set to `localhost:5001`, so it stops there.

---

## Updating the Pipeline (After Code Changes)

When you change files in `V1/` (like `pipeline_api.py`, `src/nodes/*.py`, templates, etc.), you need to rebuild and push the Docker image.

### Prerequisites (one-time)
```bash
# Install Azure CLI (if not already)
brew install azure-cli

# Install Docker Desktop (if not already)
brew install --cask docker
```

### Step-by-step update process

```bash
# 1. Log in to Azure (if session expired)
az login --use-device-code

# 2. Log in to the container registry
az acr login --name rezzyacr

# 3. Build the Docker image (from the Rezzy root directory)
cd /Users/jonahrothman/Developer/Workspace/Rezzy
docker build --platform linux/amd64 -t rezzyacr.azurecr.io/rezzy-pipeline:latest -f Dockerfile .

# 4. Push to the registry
docker push rezzyacr.azurecr.io/rezzy-pipeline:latest

# 5. Update the Container App to use the new image
az containerapp update \
  --name rezzy-pipeline \
  --resource-group Rezzy-rg \
  --image rezzyacr.azurecr.io/rezzy-pipeline:latest
```

**That's it.** The whole process takes ~5 minutes. Steps 3–5 are the only ones you repeat each time.

### Quick one-liner (after initial setup)
```bash
az acr login --name rezzyacr && docker build --platform linux/amd64 -t rezzyacr.azurecr.io/rezzy-pipeline:latest -f Dockerfile . && docker push rezzyacr.azurecr.io/rezzy-pipeline:latest && az containerapp update --name rezzy-pipeline --resource-group Rezzy-rg --image rezzyacr.azurecr.io/rezzy-pipeline:latest
```

---

## Checking Status on the Azure Portal

1. Go to [portal.azure.com](https://portal.azure.com)
2. Search **"rezzy-pipeline"** in the top bar

### Key sections in the Container App

| Section (left sidebar) | What it shows |
|------------------------|--------------|
| **Overview** | Status (Running/Failed), URL, resource group |
| **Containers** | Which Docker image is currently deployed, CPU/memory |
| **Revisions** | History of deployments — each update creates a new revision |
| **Log stream** | **Live logs** — watch uvicorn output in real-time |
| **Console** | SSH into the running container |
| **Environment variables** | View/edit env vars (API keys, etc.) |

### Testing the live API

| URL | Expected response |
|-----|-------------------|
| `.../health` | `{"status": "ok"}` |
| `.../docs` | FastAPI interactive API documentation |

---

## Environment Variables

### On Vercel (Frontend)

Set these in Vercel Dashboard → Settings → Environment Variables:

| Variable | Value | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_ACA_URL` | `https://rezzy-pipeline.livelybay-96c41090.eastus.azurecontainerapps.io` | Azure pipeline URL for production API calls |

### On Azure Container App

Set these in Azure Portal → rezzy-pipeline → Environment Variables:

| Variable | Value | Purpose |
|----------|-------|---------|
| `OPENROUTER_API_KEY` | `sk-or-...` | LLM API key |
| `OPENROUTER_MODEL` | `google/gemini-2.5-flash-lite` | Which model to use |
| `LANGCHAIN_TRACING_V2` | `true` (optional) | Enable LangSmith tracing |
| `LANGCHAIN_API_KEY` | (optional) | LangSmith API key |

---

## Azure Resources

| Resource | Type | Resource Group | Region |
|----------|------|---------------|--------|
| `rezzy-pipeline` | Container App | Rezzy-rg | East US |
| `rezzyacr` | Container Registry (Basic) | Rezzy-rg | East US |
| `managedEnvironment-Rezzyrg-92bf` | Container Apps Environment | Rezzy-rg | East US |

### Costs
- **Container Registry (Basic):** ~$5/month
- **Container App:** Pay-per-use. Scales to zero when idle (no cost when not in use). When running, ~$0.01/hour for the default 0.5 CPU / 1GB RAM profile.

---

## Dockerfile

The Dockerfile at the repo root packages:
- Python 3.12 + all pip dependencies
- Tectonic (LaTeX→PDF compiler) + pre-warmed cache
- Pipeline code from `V1/src/` and `V1/pipeline_api.py`
- Data files from `V1/data/`

**Port:** Uvicorn listens on port **8000** (configured in the Dockerfile CMD). The Azure Container App ingress routes external HTTPS traffic to this port. If you recreate the app, use `--target-port 8000`.

The `.dockerignore` excludes `node_modules`, `.venv`, `.git`, and other heavy directories to keep the build context small (~5 MB).

---

## Recreating the Container App from Scratch

If the app gets stuck or you need to start fresh:

```bash
# Delete the old app
az containerapp delete --name rezzy-pipeline --resource-group Rezzy-rg --yes

# Recreate with the correct image, port, and env vars
az containerapp create \
  --name rezzy-pipeline \
  --resource-group Rezzy-rg \
  --environment managedEnvironment-Rezzyrg-92bf \
  --image rezzyacr.azurecr.io/rezzy-pipeline:latest \
  --registry-server rezzyacr.azurecr.io \
  --registry-username rezzyacr \
  --registry-password "$(az acr credential show --name rezzyacr --query 'passwords[0].value' -o tsv)" \
  --target-port 8000 \
  --ingress external \
  --cpu 0.5 --memory 1.0Gi \
  --min-replicas 0 --max-replicas 1 \
  --env-vars OPENROUTER_API_KEY=<your-key> OPENROUTER_MODEL=google/gemini-2.5-flash-lite

# Verify
curl https://rezzy-pipeline.livelybay-96c41090.eastus.azurecontainerapps.io/health
```

---

## Troubleshooting

### "authentication required" when pushing to ACR
Your Docker registry login expired. Re-authenticate:
```bash
az acr login --name rezzyacr
```
Then retry the push. ACR tokens expire after ~3 hours.

### "ACR Tasks requests are not permitted"
Your subscription doesn't support `az acr build` (cloud builds). Use local Docker builds instead:
```bash
docker build --platform linux/amd64 ...
docker push ...
```

### Container App shows "Hello World" page
The pipeline image hasn't been deployed yet. Run the update process above.

### Container App stuck in "InProgress" provisioning
A previous update is still running. Wait 5-10 minutes and check:
```bash
az containerapp show --name rezzy-pipeline --resource-group Rezzy-rg --query "properties.provisioningState" -o tsv
```
If stuck for >15 min, delete and recreate:
```bash
az containerapp delete --name rezzy-pipeline --resource-group Rezzy-rg --yes
# Then run the full create command from the "Recreating from scratch" section
```

### 404 on `/step/parse-jd`
The Container App is running an old or wrong image. Check which image is deployed in Azure Portal → Containers, then redeploy.

### Logs show import errors
A Python dependency is missing from `requirements.txt` or the Dockerfile's extra pip install list. Update and rebuild.

### PDF not loading on production
The pipeline returns the compiled PDF as base64 in the `done` SSE event. The frontend creates a blob URL from it. If the pipeline was deployed before this change, redeploy with the latest image.
