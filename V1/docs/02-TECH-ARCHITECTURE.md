# Technical Architecture — AI Resume Tailor

## Stack Overview

> **Note:** This is a living document. Technologies marked ✅ are implemented; others are planned.

| Technology | Role | Status |
|---|---|---|
| **Python 3.12+** | Primary language for the pipeline and API server | ✅ Implemented |
| **LangGraph** | Agent orchestration — defines the multi-node pipeline as a stateful directed graph with conditional edges | ✅ Implemented |
| **OpenRouter** | LLM gateway — access to many models through a single OpenAI-compatible API. Model swappable via env var | ✅ Implemented |
| **OpenAI Python SDK** | HTTP client for OpenRouter (not a direct OpenAI dependency) | ✅ Implemented |
| **Pydantic** | Data validation for graph state schema and LLM structured outputs | ✅ Implemented |
| **Jinja2** | LaTeX template engine — `.tex.j2` template with placeholders | ✅ Implemented |
| **Tectonic** | LaTeX-to-PDF compiler — lightweight single binary, no full TeX Live needed | ✅ Implemented |
| **PyMuPDF** | PDF page-count reading for QA node (replaced pypdf) | ✅ Implemented |
| **python-dotenv** | Loads `.env` file for API keys and configuration | ✅ Implemented |
| **FastAPI** | REST API server wrapping the pipeline with step-by-step endpoints | ✅ Implemented |
| **Neon PostgreSQL** | Persistent storage for user profiles, source bank entries, and bullets | ✅ Implemented |
| **Firebase Auth** | User authentication (email/password, Google OAuth) | ✅ Implemented |
| **Next.js 16 + Vercel** | Production frontend with SSR, deployed on Vercel | ✅ Implemented |
| **Azure Container Apps** | Hosts the pipeline Docker container in production (scales to zero) | ✅ Implemented |
| **Azure Container Registry** | Stores pipeline Docker images | ✅ Implemented |
| **Zustand** | Frontend state management for the pipeline wizard | ✅ Implemented |
| **LangSmith** | Pipeline tracing and debugging (optional) | ✅ Implemented |
| **pgvector** | Vector similarity search on bullet embeddings | 🔮 Planned |
| **rapidfuzz** | Fuzzy string matching for cross-resume deduplication | 🔮 Planned |

## Phase 1 Architecture Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│  CLI (main.py)│────▶│  LangGraph   │────▶│  Output          │
│  --jd <file>  │     │  Pipeline    │     │  resume.pdf      │
│               │     │  (graph.py)  │     │  selection_report │
└──────────────┘     └──────┬───────┘     └──────────────────┘
                           │
              ┌────────────┼────────────────┐
              ▼            ▼                ▼
        ┌──────────┐ ┌──────────┐    ┌──────────┐
        │ OpenRouter│ │ Tectonic │    │ Local FS │
        │ (LLM API)│ │ (LaTeX)  │    │ (data/)  │
        └──────────┘ └──────────┘    └──────────┘
```

## Data Access Abstraction

> **Design principle:** The source-of-truth data access sits behind a clean function interface so that swapping hardcoded JSON for a real database later is a small, localized change — not a rewrite of the graph logic.

In Phase 1, `source_bank.json` is loaded from disk and passed into the graph state. The graph nodes never read files directly; they receive data through the state schema. This means:

- **Phase 1:** A loader function reads `data/source_bank.json` and returns a Python dict. The graph receives this dict in its initial state.
- **Phase 2+:** The same loader function is replaced with a Supabase query. The graph nodes don't change at all — they still receive a dict through the state.

This is intentionally the simplest possible abstraction (a function that returns a dict), not a premature ORM or repository pattern. The contract is: "give me a dict shaped like the source bank schema, I don't care where it came from."

## Source Bank Schema

### Top-Level Source Bank Object

The source bank is a single object containing the user's personal information and all career entries:

```json
{
  "personal": {
    "name": "Alex Johnson",
    "email": "alex@example.com",
    "phone": "555-555-5555",
    "linkedin": "linkedin.com/in/alexjohnson",
    "github": "github.com/alexjohnson",
    "website": "alexjohnson.dev",
    "location": "San Francisco, CA"
  },
  "skills": [
    "Python", "TypeScript", "React", "PostgreSQL", "AWS", "Docker"
  ],
  "entries": [ ... ]
}
```

The top-level `skills` list is the user's **personal skills section** — a flat list that appears as its own section on the resume. It is separate from the per-entry `skills` tags (which are used for relevance matching, not necessarily displayed verbatim).

### Career Entry Schema

Each entry in `entries` represents a job, internship, or project:

```json
{
  "id": "job_1",
  "type": "job",
  "company": "Acme Corp",
  "title": "Software Engineer Intern",
  "start_date": "May 2024",
  "end_date": "Aug 2024",
  "location": "San Francisco, CA",
  "pinned": false,
  "summary": "Prose paragraph describing what happened at this role — the ground truth the AI draws from when generating suggestions. User-written or AI-assisted.",
  "skills": ["Python", "distributed systems", "Redis"],
  "bullets": [
    {
      "id": "job_1_bullet_1",
      "text": "Designed and implemented a distributed caching layer..."
    }
  ]
}
```

**Field notes:**
- `type`: `"job"` for jobs/internships, `"project"` for personal/academic projects. Future types (e.g., `"research"`, `"volunteer"`, `"publication"`) can be added without a schema break.
- `start_date` / `end_date`: separate string fields (e.g., `"May 2024"` / `"Aug 2024"` or `"Present"`). Not a combined string.
- `skills` per entry: used for relevance matching internally, not necessarily rendered as a separate list on the resume.
- `summary`: seeded in Phase 1 hardcoded data even though the onboarding flow that generates it isn't built yet — avoids a schema rework later.
- `pinned`: if `true`, this entry is always included on the resume regardless of relevance scoring.

### Resume Sections (Current Scope)

Phase 1 supports four sections, in order:
1. **Header** — personal info from `personal`
2. **Education** — hardcoded in the source bank under a separate `education` array (not part of `entries`)
3. **Experience** — entries where `type == "job"`
4. **Projects** — entries where `type == "project"`
5. **Skills** — the top-level `skills` list

> **Future:** The section system should eventually support additional types (research, publications, volunteer work, etc.) and user-defined ordering. Design the template with this in mind — don't hardcode section order in a way that's painful to change.

## LLM Client Configuration

The LLM client is initialized once in `src/llm.py` using the OpenAI Python SDK, configured to point at OpenRouter:

```python
# Pseudocode — actual implementation in src/llm.py
client = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1",
)
```

The model name is read from the `OPENROUTER_MODEL` env var (default: `deepseek/deepseek-chat`). This makes the model swappable without code changes — useful for comparing cost/quality tradeoffs across providers.

## LaTeX Compilation

Tectonic is invoked as a subprocess call:

```bash
tectonic input.tex
```

It produces a PDF in the same directory. If compilation fails, stderr is captured and surfaced as `qa_feedback` in the graph state for the QA critic to process.

Tectonic's key advantage for this project is zero-config: no `tlmgr`, no package management, no multi-gigabyte TeX Live install. It downloads only what the document needs on first run and caches it locally.
