<h1 align="center">ResumeGenie</h1>

<p align="center">
  <strong>AI-Powered Resume Tailor</strong><br/>
  Paste a job description → get a perfectly tailored 1-page resume
</p>

<p align="center">
  <img src="https://img.shields.io/badge/python-3.12+-3776AB?logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/LangGraph-1.2-0A0A0A?logo=langchain&logoColor=white" alt="LangGraph" />
  <img src="https://img.shields.io/badge/Next.js-16-000000?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/FastAPI-0.141-009688?logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Gemini_Flash_Lite-via_OpenRouter-4285F4?logo=google" alt="Gemini" />
  <img src="https://img.shields.io/badge/LaTeX-Tectonic-008080" alt="LaTeX" />
</p>

---

## How It Works

```
Paste JD  →  Parse  →  Select Entries  →  Select Bullets  →  AI Suggestions  →  Compile PDF
              ↑                                                                      ↓
              └──────────────────── QA Critic (retry if >1 page) ←──────────────────┘
```

ResumeGenie maintains a **source bank** of all your past jobs, projects, and bullet points. When you paste a job description, the LangGraph pipeline:

1. **Parses the JD** — extracts company, role, required skills, keywords, seniority
2. **Selects entries** — picks the best 5–6 jobs/projects based on JD relevance
3. **Selects bullets** — chooses 16–22 ATS-optimized bullets using the XYZ formula
4. **Generates AI suggestions** — proposes Grammarly-style improvements per bullet
5. **Compiles PDF** — renders LaTeX → PDF via Tectonic, enforcing a strict 1-page limit
6. **QA check** — if the PDF exceeds 1 page, it loops back and trims bullets

---

## Features

| Feature | Description |
|---------|-------------|
| **LangGraph Pipeline** | 7-node DAG with conditional retry loop — fully traceable via LangSmith |
| **Interactive Tailor Tab** | Step-by-step wizard in the browser — review and override AI decisions at each stage |
| **Source Bank Viewer** | Browse all entries and bullets in a modernist Swiss-style grid |
| **ATS-Optimized** | XYZ bullet formula, keyword mirroring, single-column LaTeX, no tables/graphics |
| **Auto-Retry** | Truncated LLM responses are automatically retried up to 3 times |
| **Run History** | Every run (CLI or web) saves a timestamped directory with PDF, LaTeX, trace, and selection report |
| **Model Flexible** | Swap models via `.env` — defaults to Gemini 2.5 Flash Lite via OpenRouter |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Pipeline** | [LangGraph](https://github.com/langchain-ai/langgraph) (StateGraph with conditional edges) |
| **LLM** | [OpenRouter](https://openrouter.ai/) → Gemini 2.5 Flash Lite (configurable) |
| **PDF** | [Tectonic](https://tectonic-typesetting.github.io/) (LaTeX compiler) + Jinja2 templates |
| **Backend API** | [FastAPI](https://fastapi.tiangolo.com/) (step-by-step pipeline execution) |
| **Frontend** | [Next.js 16](https://nextjs.org/) + TypeScript + Zustand + TanStack Query |
| **Tracing** | [LangSmith](https://smith.langchain.com/) (optional, via env vars) |
| **Language** | Python 3.12+ (pipeline) · TypeScript (web) |

---

## Architecture

```
├── src/                        # Python pipeline
│   ├── graph.py                # LangGraph DAG definition
│   ├── state.py                # ResumeState TypedDict
│   ├── llm.py                  # OpenRouter client with auto-retry
│   ├── loader.py               # Source bank & JD loaders
│   ├── trace.py                # Pipeline audit logging + live status
│   ├── templates/
│   │   └── resume.tex.j2       # Jinja2 LaTeX template
│   └── nodes/
│       ├── jd_parser.py        # Extract skills, keywords, seniority from JD
│       ├── job_selector.py     # Select best entries for the JD
│       ├── bullet_selector.py  # ATS-aware bullet ranking per entry
│       ├── ai_suggestion_gen.py # Grammarly-style bullet improvements
│       ├── latex_assembler.py  # Render LaTeX from selections
│       ├── compile_latex.py    # Tectonic PDF compilation
│       └── qa_critic.py       # Page-count QA + retry routing
├── pipeline_api.py             # FastAPI sidecar (step-by-step endpoints)
├── main.py                     # CLI entry point
├── data/
│   ├── source_bank.json        # Your master resume data (entries + bullets)
│   └── *.txt                   # Sample job descriptions
├── web/                        # Next.js frontend
│   ├── app/
│   │   ├── page.tsx            # Source Bank viewer
│   │   ├── runs/page.tsx       # Pipeline run history
│   │   ├── tailor/page.tsx     # Interactive pipeline wizard
│   │   └── api/                # API routes (proxy to FastAPI)
│   ├── components/
│   │   ├── Nav.tsx             # Navigation (Source Bank | Runs | Tailor)
│   │   └── tailor/             # 7 wizard step components
│   └── lib/
│       └── tailorStore.ts      # Zustand store for wizard state
├── output/                     # Generated runs (gitignored)
│   ├── runs_index.json         # Run manifest for frontend
│   └── run_YYYY-MM-DD_HH-MM-SS/
│       ├── resume.pdf
│       ├── resume.tex
│       ├── selection_report.json
│       ├── pipeline_trace.md
│       └── status.json
└── langgraph.json              # LangGraph Studio config
```

---

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 18+
- [Tectonic](https://tectonic-typesetting.github.io/en-US/install.html) (LaTeX compiler)
- An [OpenRouter](https://openrouter.ai/) API key

### Setup

```bash
# Clone the repo
git clone https://github.com/jonahr4/ResumeGenie.git
cd ResumeGenie

# Install Python dependencies
pip install -r requirements.txt

# Create your .env file
cp .env.example .env
# Add your OPENROUTER_API_KEY

# Install web dependencies
cd web && npm install && cd ..
```

### Run via CLI

```bash
python main.py --jd data/boston_dynamics.txt
```

Output lands in `output/run_YYYY-MM-DD_HH-MM-SS/` with the PDF, LaTeX, trace, and selection report.

### Run via Web

```bash
# Terminal 1: Start the pipeline API
uvicorn pipeline_api:app --port 5001 --reload

# Terminal 2: Start the frontend
cd web && npm run dev
```

Open [localhost:3000/tailor](http://localhost:3000/tailor) → paste a JD → walk through the wizard.

### LangSmith Tracing (optional)

Add to your `.env`:

```bash
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_langsmith_key
LANGCHAIN_PROJECT=ResumeGenie
```

Every LLM call will appear at [smith.langchain.com](https://smith.langchain.com) with full prompts, responses, and timing.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENROUTER_API_KEY` | OpenRouter API key (required) |
| `OPENROUTER_MODEL` | Model to use (default: `google/gemini-2.5-flash-lite`) |
| `OPENROUTER_MAX_TOKENS` | Max tokens per response (default: `16384`) |
| `OPENROUTER_MAX_RETRIES` | Auto-retry attempts on truncated JSON (default: `3`) |
| `LANGCHAIN_TRACING_V2` | Enable LangSmith tracing (optional) |
| `LANGCHAIN_API_KEY` | LangSmith API key (optional) |
| `LANGCHAIN_PROJECT` | LangSmith project name (optional) |

---

## Pipeline Nodes

| Node | Input | Output |
|------|-------|--------|
| **jd_parser** | Raw JD text | Structured JD (company, role, skills, keywords, seniority) |
| **job_selector** | Parsed JD + source bank | 5–6 confirmed entry IDs with rationales |
| **bullet_selector** | Parsed JD + confirmed entries | 16–22 selected bullets with ATS scoring |
| **ai_suggestion_gen** | Parsed JD + selected bullets | Per-bullet improvement suggestions |
| **latex_assembler** | Selected content + template | Rendered LaTeX source |
| **compile_latex** | LaTeX source | Compiled PDF |
| **qa_critic** | PDF | Pass/fail + retry routing |

---

## License

MIT © [Jonah Rothman](https://github.com/jonahr4)
