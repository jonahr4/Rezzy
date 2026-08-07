# Technical Architecture — AI Resume Tailor

## Stack Overview

> **Note:** This stack is a living document and not fully locked in. Specific choices (especially later-phase tools) will be revisited as we build — the goal is to capture intent and reasoning, not to over-commit to specifics we haven't built yet.

The table below lists every technology in the full target stack, its role, and which phase introduces it.

| Technology | Role | Phase |
|---|---|---|
| **Python 3.11+** | Primary language for the pipeline and API server | **Phase 1** |
| **LangGraph** | Agent orchestration — defines the multi-node pipeline as a stateful directed graph with conditional edges. Chosen for its streaming support (SSE step-updates in later phases) and ease of adding/tweaking agents over time. | **Phase 1** |
| **OpenRouter** | LLM gateway — provides access to many models (DeepSeek, Llama 4, GPT-4o, etc.) through a single OpenAI-compatible API. The model is swappable via a single env var, no code changes needed. | **Phase 1** |
| **OpenAI Python SDK** | Used as the HTTP client for OpenRouter (OpenRouter exposes an OpenAI-compatible endpoint). We point the SDK at OpenRouter's base URL — this is not a direct OpenAI dependency. | **Phase 1** |
| **Pydantic** | Data validation for the graph state schema and LLM structured outputs. | **Phase 1** |
| **Jinja2** | LaTeX template engine — the resume template is a `.tex.j2` file with Jinja2 placeholders that get filled with selected content programmatically. | **Phase 1** |
| **Tectonic** | LaTeX-to-PDF compiler — a lightweight, self-contained engine (single binary, no full TeX Live install needed). Downloads and caches only the packages the document actually needs. Invoked as a subprocess. | **Phase 1** |
| **pypdf** | PDF page-count reading — used by the QA node to verify the compiled resume is exactly one page. | **Phase 1** |
| **python-dotenv** | Loads `.env` file for API keys and configuration. | **Phase 1** |
| **FastAPI** | REST API server wrapping the pipeline, enabling frontend and third-party integrations. | Phase 2 |
| **Supabase (Postgres)** | Persistent storage for user profiles, career data, and bullet banks. | Phase 2 |
| **pgvector** | Vector similarity search on bullet embeddings — enables pre-filtering candidate bullets by semantic relevance before the LLM ranking step, cutting cost and latency. | Phase 4 |
| **Firebase Auth** | User authentication (email/password, Google OAuth, etc.). | Phase 2 |
| **rapidfuzz** | Fuzzy string matching for cross-resume company/job deduplication during resume import. | Phase 3 |
| **YAKE / KeyBERT** | Deterministic ATS keyword extraction and scoring — provides an LLM-free relevance signal as a complement to the LLM-based ranking. | Phase 4 |
| **Next.js + Vercel** | Production frontend with SSR, deployed on Vercel. Consumes the FastAPI backend and streams LangGraph step updates via SSE. | Phase 5 |
| **TipTap** | Headless rich text editor used as the foundation for the Grammarly-style suggestion UI. Supports custom marks/nodes to render inline accept/reject controls on AI-proposed bullet changes. | Phase 5 |
| **floating-ui** | Popover/tooltip positioning library — used to anchor the accept/reject suggestion popovers to highlighted text in the TipTap editor. | Phase 5 |
| **react-diff-viewer** | Side-by-side diff visualization — powers the split-screen "original vs. AI suggestions" view in the tailoring review UI. | Phase 5 |

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
