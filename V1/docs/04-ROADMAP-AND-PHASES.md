# Roadmap & Phases — AI Resume Tailor

## Phase Overview

| Phase | Summary | Status |
|---|---|---|
| **Phase 1** | Local pipeline POC | 🔨 Current |
| Phase 2 | API service + persistence + auth | Planned |
| Phase 3 | Resume import & deduplication | Planned |
| Phase 4 | Deterministic ATS scoring & embedding pre-filter | Planned |
| Phase 5 | Production frontend | Planned |

---

## Phase 1 — Local Pipeline POC (Current)

A no-database, no-auth, no-frontend proof-of-concept. A Python CLI that takes hardcoded career data + a pasted job description and produces a tailored one-page LaTeX resume PDF via a LangGraph agent pipeline calling LLMs through OpenRouter.

**Success is defined by one thing:** given two different job descriptions, the pipeline must visibly choose different jobs and different bullets — proving the selection/ranking logic is real, not a static dump.

### Detailed Task Breakdown

#### Documentation (Deliverable A)
- [ ] `docs/01-PRODUCT-VISION.md` — product pitch, philosophy, data moat hypothesis
- [ ] `docs/02-TECH-ARCHITECTURE.md` — full stack overview with phase annotations
- [ ] `docs/03-PIPELINE-SPEC.md` — node-by-node LangGraph pipeline spec
- [ ] `docs/04-ROADMAP-AND-PHASES.md` — this file

#### Setup & Getting Started (Deliverable B)
- [ ] `GETTING_STARTED.md` — prerequisites, install, env config, run instructions
- [ ] `TODO.md` — acceptance criteria checklist

#### Repo Scaffold & Mock Data (Deliverable D)
- [ ] Project directory structure
- [ ] `data/source_bank.json` — oversupplied mock career data (4–6 jobs, 2–3 projects, 10–15 bullets each, plus a `summary` prose field per entry)
- [ ] `data/sample_jd_backend.txt` — backend/systems-focused sample job description
- [ ] `data/sample_jd_data_ml.txt` — data/ML-focused sample job description
- [ ] `src/templates/resume.tex.j2` — Jinja2-ized Jake Gutierrez LaTeX template
- [ ] `requirements.txt`, `.env.example`, `.gitignore`

#### Pipeline Implementation (Deliverable C)
- [ ] `src/state.py` — graph state schema (includes `confirmed_entries`, `user_overrides`, `ai_suggestions` fields)
- [ ] `src/llm.py` — OpenRouter client wrapper
- [ ] `src/nodes/jd_parser.py` — Node 1: JD parsing (LLM)
- [ ] `src/nodes/job_selector.py` — Node 1.5: job/experience selection with console printout (auto in Phase 1, interactive in Phase 5)
- [ ] `src/nodes/bullet_selector.py` — Node 2: bullet selection/ranking from confirmed entries (LLM, core node)
- [ ] `src/nodes/ai_suggestion_gen.py` — Node 2.5: AI-proposed phrasings grounded in entry summaries (LLM)
- [ ] `src/nodes/latex_assembler.py` — Node 3: Jinja2 template rendering (verbatim bullets only, deterministic)
- [ ] `src/nodes/compile_latex.py` — Node 4: Tectonic subprocess call (deterministic)
- [ ] `src/nodes/qa_critic.py` — Node 5: QA check + conditional retry routing
- [ ] `src/graph.py` — LangGraph StateGraph: Node 1 → 1.5 → 2 → 2.5 → 3 → 4 → 5, with QA→Node 2 retry edge
- [ ] `main.py` — CLI entrypoint (`--jd` argument, streaming output, PDF + `selection_report.json` with both `selected_content` and `ai_suggestions`)

#### Acceptance Criteria Verification
- [ ] `python main.py --jd data/sample_jd_backend.txt` runs end-to-end → `output/resume.pdf`
- [ ] Output PDF is exactly one page (or clearly reports failure)
- [ ] Running with `sample_jd_data_ml.txt` produces visibly different selections
- [ ] Every bullet in `selection_report.json` has a non-empty `reason`
- [ ] Console shows ordered per-node status log (LangGraph streaming)
- [ ] Retry/critic loop demonstrably exercises and recovers
- [ ] No hardcoded API keys — everything from `.env`
- [ ] All docs exist and reflect what was actually built

---

## Phase 2 — API Service + Persistence + Auth

Wraps the Phase 1 pipeline in a **FastAPI** service and adds real data persistence. The hardcoded JSON source bank is replaced with **Supabase** (Postgres) for storing user profiles, career history, and bullet banks. **Firebase Auth** handles user authentication (email/password, Google OAuth). The LangGraph pipeline itself is largely unchanged — only the data-loading interface is swapped from "read JSON file" to "query Supabase." This phase also introduces basic user management: creating an account, adding/editing career entries and bullets, and triggering a tailoring run via API.

---

## Phase 3 — Resume Import & Deduplication

Adds the ability to **import an existing resume** (PDF or DOCX) and extract structured career data from it using LLM-based parsing. The extracted entries are matched against the user's existing source bank using **rapidfuzz** for fuzzy string matching on company names, job titles, and dates — preventing duplicates when a user imports multiple versions of their resume or adds entries manually that overlap with imported ones. This phase makes onboarding dramatically faster: instead of building a bullet bank from scratch, users upload their current resume and get a pre-populated bank to curate.

---

## Phase 4 — Deterministic ATS Scoring & Embedding Pre-Filter

Introduces two LLM-cost-saving optimizations that run *before* the main bullet-selection LLM call:

1. **YAKE/KeyBERT keyword extraction:** Deterministic (no LLM needed) extraction of ATS-relevant keywords from the job description. These are compared against bullet text to produce a fast, cheap relevance signal.
2. **pgvector embedding search:** Bullet points are embedded on write (when a user creates/edits them) and stored in Supabase via pgvector. At tailoring time, a vector similarity search shortlists the most semantically relevant bullets before the LLM ranking node sees them — dramatically reducing the token count (and therefore cost and latency) of the core selection call.

Together, these turn the Phase 1 approach of "send everything to the LLM" into a funnel: deterministic keyword match → embedding similarity → LLM final ranking. The LLM only sees the top candidates.

---

## Phase 5+ — Production Frontend & Beyond

The **Next.js** frontend, deployed on **Vercel**, provides the full user experience:

- Dashboard for managing the source-of-truth bullet bank (CRUD on career entries and bullets, with the guided onboarding flow for new entries)
- Job description paste + one-click tailoring with SSE streaming of LangGraph step-by-step progress
- **Split-screen suggestion review UI:** left panel shows the resume with verbatim source-bank bullets; right panel shows AI-proposed alternatives highlighted with Grammarly-style inline accept/reject controls (built on TipTap + floating-ui, with react-diff-viewer for the side-by-side diff). Hovering a suggestion shows the `reason` tooltip seeded by the pipeline. Users can accept, reject, or edit each suggestion before finalizing the PDF.
- **Job application tracker:** when a user tailors a resume, the app automatically creates an application record with the company name/logo, saved job description, tailored PDF, and selection report. Status tracking (saved, applied, interviewing, offer, rejected) in a Kanban-style board. Cover letter generation attached to each application record. Modeled on Simplify's tracker UX but seeded automatically from the tailoring flow — no manual entry.
- PDF preview and download
- Pinning, verbatim lock, and full-auto vs. semi-manual tailoring controls
- Usage tracking and billing integration (Stripe)

Beyond Phase 5, potential directions include: batch tailoring (generate resumes for multiple JDs at once), cover letter generation, interview prep based on the same career data, and analytics on which bullet phrasings correlate with callback rates.
