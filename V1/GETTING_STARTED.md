# Getting Started — Rezzy (AI Resume Tailor)

This guide walks you through running Rezzy locally for development.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| **Python** | 3.12+ | `brew install python` or [python.org](https://www.python.org/downloads/) |
| **Node.js** | 18+ | `brew install node` or [nodejs.org](https://nodejs.org/) |
| **Tectonic** | Latest | `brew install tectonic` |
| **Docker Desktop** | Latest | `brew install --cask docker` (only needed for Azure deploys) |

### API Keys

| Key | Where to get it |
|-----|----------------|
| **OpenRouter** | [openrouter.ai/keys](https://openrouter.ai/keys) — add ~$5 credits, each pipeline run costs < $0.01 |
| **LangSmith** (optional) | [smith.langchain.com](https://smith.langchain.com) — for pipeline tracing |

---

## Project Structure

```
Rezzy/
├── V1/                         # Python pipeline
│   ├── pipeline_api.py         # FastAPI server (step-by-step endpoints)
│   ├── main.py                 # CLI entry point
│   ├── langgraph.json          # LangGraph Studio config
│   ├── requirements.txt        # Python dependencies
│   ├── src/
│   │   ├── graph.py            # LangGraph DAG definition
│   │   ├── state.py            # ResumeState TypedDict
│   │   ├── llm.py              # OpenRouter client with auto-retry
│   │   ├── loader.py           # Source bank & JD loaders
│   │   ├── trace.py            # Pipeline audit logging
│   │   ├── templates/
│   │   │   └── resume.tex.j2   # Jinja2 LaTeX resume template
│   │   └── nodes/
│   │       ├── jd_parser.py    # Parse JD → skills, keywords, seniority
│   │       ├── job_selector.py # Select best entries for JD
│   │       ├── bullet_selector.py  # ATS-aware bullet ranking
│   │       ├── ai_suggestion_gen.py # Grammarly-style bullet improvements
│   │       ├── latex_assembler.py   # Render LaTeX from selections
│   │       ├── compile_latex.py     # Tectonic PDF compilation
│   │       └── qa_critic.py         # Page-count QA + retry routing
│   ├── data/
│   │   └── *.txt               # Sample job descriptions
│   └── output/                 # Generated runs (gitignored)
│
├── web/                        # Next.js frontend (V2 — current)
│   ├── app/
│   │   ├── page.tsx            # Dashboard
│   │   ├── source-bank/        # Source Bank viewer
│   │   ├── tailor/             # Interactive pipeline wizard
│   │   ├── login/              # Auth pages
│   │   ├── signup/
│   │   └── api/
│   │       ├── pipeline/       # Proxy routes to Python backend
│   │       │   ├── step/       # POST pipeline step calls
│   │       │   ├── health/     # Health check proxy
│   │       │   └── source-bank/ # Source bank assembly
│   │       ├── file/           # Serve output files (PDFs, etc.)
│   │       ├── entries/        # CRUD for source bank entries
│   │       ├── parse-resume/   # Resume PDF parser
│   │       └── profile/        # User profile
│   ├── components/
│   │   ├── Sidebar.tsx         # Navigation sidebar
│   │   ├── ContainerWakeup.tsx # Pre-warms Azure Container App
│   │   └── tailor/             # 7 wizard step components
│   │       ├── StepPasteJD.tsx
│   │       ├── StepSkills.tsx
│   │       ├── StepEntries.tsx
│   │       ├── StepBullets.tsx
│   │       ├── StepSuggestions.tsx
│   │       ├── StepPreview.tsx
│   │       ├── StepCompiling.tsx
│   │       └── WordBudget.tsx
│   ├── lib/
│   │   ├── tailorStore.ts      # Zustand store for wizard state
│   │   ├── firebase.ts         # Firebase Auth client
│   │   ├── auth-context.tsx    # Auth context provider
│   │   └── db.ts               # Neon PostgreSQL connection
│   └── .env.local              # Local env vars (not committed)
│
├── Dockerfile                  # Pipeline Docker image for Azure
├── .dockerignore               # Excludes node_modules, .venv, etc.
└── ui-guide/                   # V1 reference screenshots
```

---

## Setup

### 1. Clone and install Python deps

```bash
git clone https://github.com/jonahr4/ResumeGenie.git
cd ResumeGenie

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install pipeline dependencies
cd V1
pip install -r requirements.txt
cd ..
```

### 2. Install web dependencies

```bash
cd web
npm install
cd ..
```

### 3. Configure environment variables

**Python pipeline** — create `V1/.env`:
```env
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_MODEL=google/gemini-2.5-flash-lite

# Optional: LangSmith tracing
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_langsmith_key
LANGCHAIN_PROJECT=Rezzy
```

**Web app** — create `web/.env.local`:
```env
# Local pipeline API
NEXT_PUBLIC_API_URL=http://localhost:5001

# Azure pipeline (production only — used when NEXT_PUBLIC_API_URL is not set)
NEXT_PUBLIC_ACA_URL=https://rezzy-pipeline.livelybay-96c41090.eastus.azurecontainerapps.io

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://...

# Firebase Auth
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
```

---

## Running Locally

You need **3 terminals**:

### Terminal 1: Pipeline API (FastAPI)
```bash
source .venv/bin/activate
cd V1
uvicorn pipeline_api:app --port 5001 --reload
```
Runs on `http://localhost:5001`. Test: `curl http://localhost:5001/health`

### Terminal 2: LangGraph Dev Server (optional — for LangSmith Studio debugging)
```bash
source .venv/bin/activate
cd V1
langgraph dev
```
Opens LangGraph Studio at `http://127.0.0.1:2024`. This is a **dev-only tool** — not needed in production.

### Terminal 3: Web Frontend
```bash
cd web
npm run dev
```
Opens at `http://localhost:3000`

### Using the app
1. Go to `http://localhost:3000/tailor`
2. Paste a job description
3. Walk through the wizard: Skills → Entries → Bullets → Suggestions → Preview → Compile
4. The compiled PDF is delivered as base64 in the SSE stream and opened via blob URL (works both locally and on production)

---

## CLI Usage (Alternative)

You can also run the pipeline directly via CLI without the web UI:

```bash
source .venv/bin/activate
cd V1
python main.py --jd data/sample_jd_backend.txt
```

Output lands in `V1/output/run_YYYY-MM-DD_HH-MM-SS/`.

---

## Deploying to Production

- **Frontend (Vercel):** Push to GitHub — Vercel auto-deploys
- **Pipeline (Azure):** See [05-AZURE-DEPLOYMENT.md](docs/05-AZURE-DEPLOYMENT.md) for the full guide

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Pipeline** | LangGraph (StateGraph with conditional edges) |
| **LLM** | OpenRouter → Gemini 2.5 Flash Lite (configurable) |
| **PDF** | Tectonic (LaTeX compiler) + Jinja2 templates |
| **Backend API** | FastAPI (step-by-step pipeline execution) |
| **Frontend** | Next.js 16 + TypeScript + Zustand |
| **Database** | Neon PostgreSQL (source bank, user profiles) |
| **Auth** | Firebase Authentication |
| **Hosting** | Vercel (frontend) + Azure Container Apps (pipeline) |
| **Tracing** | LangSmith (optional) |

---

## Environment Variables Reference

### Pipeline (V1/.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENROUTER_API_KEY` | — | OpenRouter API key (required) |
| `OPENROUTER_MODEL` | `google/gemini-2.5-flash-lite` | LLM model |
| `OPENROUTER_MAX_TOKENS` | `16384` | Max tokens per LLM response |
| `OPENROUTER_MAX_RETRIES` | `3` | Auto-retry on truncated JSON |
| `LANGCHAIN_TRACING_V2` | `false` | Enable LangSmith tracing |
| `LANGCHAIN_API_KEY` | — | LangSmith API key |
| `LANGCHAIN_PROJECT` | `Rezzy` | LangSmith project name |

### Web (web/.env.local)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Local pipeline URL (`http://localhost:5001`) |
| `NEXT_PUBLIC_ACA_URL` | Azure pipeline URL (production) |
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase Auth configuration |

---

## Troubleshooting

| Problem | Solution |
|---------|---------|
| `tectonic: command not found` | `brew install tectonic` |
| `OPENROUTER_API_KEY not set` | Create `V1/.env` with your key |
| `Pipeline API unreachable` | Make sure Terminal 1 (uvicorn) is running |
| `404 on /api/file` | The PDF hasn't been generated yet, or the path is wrong |
| First run is slow | Tectonic downloads LaTeX packages on first use — cached after that |
| `Could not import module "pipeline_api"` | Make sure you're in the `V1/` directory when running uvicorn |
| `langgraph.json not found` | Make sure you're in the `V1/` directory when running `langgraph dev` |
