# Pipeline Specification — AI Resume Tailor (Phase 1)

This is the definitive spec for the LangGraph pipeline. Every node, edge, and state field is documented here. Implementation should follow this document exactly.

---

## 1. Graph State Schema

The graph state is a `TypedDict` (or Pydantic model) with the following fields:

| Field | Type | Description |
|---|---|---|
| `job_description_raw` | `str` | The raw text of the pasted/loaded job description. Set at graph invocation. |
| `parsed_jd` | `dict` | Structured output of the JD parser: required skills, nice-to-have skills, key responsibilities/keywords, inferred seniority level. |
| `source_bank` | `dict` | The full oversupplied bullet bank (all jobs, projects, personal skills). Each entry includes a `summary` prose field (ground truth for AI suggestions), a `bullets` list, and metadata. Nodes read from this but never mutate it. |
| `confirmed_entries` | `list[str]` | The list of entry IDs confirmed for inclusion after the Job Selector step. Set by Node 1.5. In Phase 1 (CLI) this is set automatically; in Phase 5 it reflects user choices from the interactive checkpoint. |
| `user_overrides` | `dict` | Any edits or additions the user made during the Job Selector review (e.g., "also include job_3", "remove project_2"). Passed into the Bullet Selector as additional context. Empty dict in Phase 1. |
| `selected_content` | `list[dict]` | The chosen jobs/projects and selected bullets from the source bank. Each bullet carries: `text` (verbatim from bank), `reason` (short tooltip-style explanation), `source_bullet_id` (trace back to bank), and `is_ai_suggested` (always `false` here — `true` only for entries in `ai_suggestions`). |
| `ai_suggestions` | `list[dict]` | AI-proposed alternative or synthesized bullets, one list per included job/project. Each suggestion carries: `source_id` (which job/project it's for), `text` (the proposed new phrasing), `reason` (tooltip explanation), `replaces_bullet_ids` (list of source bullet IDs this synthesizes from, if any — empty for net-new suggestions grounded in the summary). This list is the input for the split-screen review UI in Phase 5. |
| `latex_source` | `str` | The fully rendered LaTeX source string, ready for compilation. |
| `pdf_path` | `str \| None` | Absolute path to the compiled PDF, or `None` if compilation hasn't run / failed. |
| `page_count` | `int \| None` | Number of pages in the compiled PDF, as read by `pypdf`. |
| `qa_feedback` | `str \| None` | Critique notes from the QA node if the output doesn't pass. Fed back to the Bullet Selector on retry. `None` if the output passed. |
| `retry_count` | `int` | Number of QA→Selector retry loops executed so far. Initialized to `0`. |
| `status` | `str` | A short human-readable status string updated by each node. Used for console logging and (in later phases) SSE streaming. |

---

## 2. Pipeline Graph

```
START
  │
  ▼
┌─────────────┐
│  JD Parser   │  (Node 1 — LLM)
└──────┬──────┘
       │
       ▼
┌───────────────────┐
│  Job Selector        │  (Node 1.5 — LLM + ⏸ human checkpoint)
└──────┬────────────┘
       │   ┌───────────────────────────────────────┐
       │   │ user edits selection (Phase 5 only)          │
       ▼   ┘                                             │
┌─────────────────┐◀─────────────────────────┐
│  Bullet Selector  │  (Node 2 — LLM)                 │
└──────┬──────────┘                          (QA retry)
       │
       ▼
┌─────────────────────┐
│  AI Suggestion Gen   │  (Node 2.5 — LLM)
└──────┬──────────────┘
       │
       ▼
┌─────────────────┐  ―――― deterministic (no LLM) ――――
│  LaTeX Assembler │  (Node 3)
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Compile LaTeX   │  (Node 4 — subprocess)
└──────┬──────────┘
       │
       ▼
┌─────────────────┐     retry_count < 3 ───► back to Node 2
│  QA Critic       │
└──────┬──────────┘
       │ pass OR retries exhausted
       ▼
      END
```

> **Phase boundary notes:**
> - **Job Selector (Node 1.5):** In Phase 1 (CLI), the job selection is performed automatically by the LLM and printed to console — no pause for user input. In Phase 5, this becomes an interactive step where the user can accept, edit, or override the AI's job selection before the pipeline continues.
> - **LaTeX Assembler + Compile (Nodes 3–4):** These are fully deterministic, non-AI steps. They sit inside the LangGraph state machine for observability/retry purposes only. No LLM is called.
> - **`ai_suggestions`:** Computed by Node 2.5 and included in `selection_report.json`, but not used by the LaTeX assembler in Phase 1. The split-screen accept/reject UI consuming these is Phase 5.

---

## 3. Node Specifications

### Node 1 — JD Parser

| | |
|---|---|
| **Type** | LLM call (structured output) |
| **Input from state** | `job_description_raw` |
| **Output to state** | `parsed_jd`, `status` |
| **LLM config** | Low temperature (~0.1). Uses the default configured model. |

**Behavior:**

The JD Parser receives the raw job description text and extracts structured information via a single LLM call with a strict output schema. The prompt instructs the model to extract:

- **`required_skills`** (`list[str]`): Skills explicitly listed as required.
- **`nice_to_have_skills`** (`list[str]`): Skills listed as preferred/nice-to-have.
- **`key_responsibilities`** (`list[str]`): Core responsibilities or duties described in the role.
- **`keywords`** (`list[str]`): Important domain-specific terms, technologies, and frameworks mentioned.
- **`seniority`** (`str`): Inferred seniority level (e.g., "entry-level", "mid-level", "senior", "staff").

The output is validated against a Pydantic model. If the LLM returns malformed JSON, the node retries once with a corrective prompt before raising an error.

**Status message:** `[jd_parser] Parsed JD: {len(required_skills)} required skills, {len(keywords)} keywords, seniority={seniority}`

---

### Node 1.5 — Job Selector (Human Checkpoint)

| | |
|---|---|
| **Type** | LLM call + human-in-the-loop checkpoint |
| **Input from state** | `parsed_jd`, `source_bank` |
| **Output to state** | `confirmed_entries`, `user_overrides`, `status` |
| **LLM config** | Low temperature (~0.2). Uses the default configured model. |

**Behavior:**

This node is the first decision point the user sees. It determines which jobs, internships, and projects to include on the resume — and surfaces that decision for user review before the pipeline proceeds to bullet selection.

**Step 1 — AI selection:**
The LLM ranks all entries in `source_bank` by relevance to `parsed_jd`. Entries marked `pinned: true` are always included. The LLM selects a shortlist of the most relevant remaining entries (typically 3–5 total between jobs and projects) and outputs:
- The selected entry IDs
- A one-line rationale for each included entry (e.g., "backend API experience matches core job requirement")
- Any entries it considered but excluded, and why

**Step 2 — User confirmation (phase-dependent):**
- **Phase 1 (CLI):** The selection is printed to console with rationales. The run proceeds automatically without pausing. `confirmed_entries` is set to the AI's selection. `user_overrides` is empty.
- **Phase 5 (frontend):** The pipeline pauses and presents the selection to the user as a checkpoint UI — "Here are the experiences we plan to include. Want to add or remove any?" The user can toggle entries, add ones the AI missed, or remove ones they don't want. Their changes are captured in `user_overrides` and merged into `confirmed_entries`.

**Why a separate node?** Separating job selection from bullet selection makes the pipeline's decision-making legible and interceptable. It also means the retry loop (QA → Bullet Selector) doesn't re-run job selection — those are fixed once confirmed.

**Status message:** `[job_selector] Selected {n} entries: {entry_names} (pinned: {pinned_names})`

---

### Node 2 — Bullet Selector/Ranker

| | |
|---|---|
| **Type** | LLM call (structured output) — **the core node** |
| **Input from state** | `parsed_jd`, `source_bank`, `qa_feedback` (if retrying) |
| **Output to state** | `selected_content`, `status` |
| **LLM config** | Moderate temperature (~0.3). Uses the default configured model. |

**Behavior:**

This node decides *what goes on the resume* — which jobs/projects, and which specific bullets from each entry's oversupplied pool. It outputs only verbatim source-bank selections. AI-proposed alternatives are handled by Node 2.5.

**Selection logic:**

1. **Job/project inclusion:** The node decides which entries from `source_bank` to include on the resume. Entries marked `pinned: true` are always included. Remaining entries are ranked by relevance to `parsed_jd` and selected until enough content is available to fill (but not overflow) a one-page resume.

2. **Bullet selection:** For each included entry, the node selects a targeted subset of bullets from that entry's candidate pool (roughly 3–5 per entry as a starting heuristic, but adjustable based on total entry count and the one-page constraint). Bullets marked `verbatim_lock: true` in the bank are included if selected and excluded from the AI suggestion pass. The selection criteria are relevance to the parsed JD (skill matches, keyword overlap, responsibility alignment) and impact strength.

3. **Reason attachment:** Every selected bullet gets a short `reason` string — terse, tooltip-style (e.g., "matches required skill: distributed systems", "quantifies impact relevant to role scale", "demonstrates leadership in cross-functional context"). These are previewing a future hover tooltip feature.

4. **Retry handling:** If `qa_feedback` is non-null (meaning the QA node rejected a prior pass), the selector uses the feedback to trim further — e.g., dropping the weakest bullet from the least relevant entry, or removing a marginal job/project entirely. It does *not* start from scratch; it refines the previous selection.

**The differentiation test:** Given two meaningfully different job descriptions (e.g., one backend-focused, one data/ML-focused), this node must produce genuinely different selections — different jobs included, different bullets chosen, different reasons attached. If it returns the same output for both, the node is broken.

**Output shape (`selected_content`):**

```json
[
  {
    "source_id": "job_1",
    "type": "job",
    "company": "Acme Corp",
    "title": "Software Engineer Intern",
    "dates": "May 2024 – Aug 2024",
    "location": "San Francisco, CA",
    "bullets": [
      {
        "text": "Designed and implemented a distributed caching layer...",
        "reason": "matches required skill: distributed systems",
        "source_bullet_id": "job_1_bullet_3",
        "verbatim_lock": false,
        "is_ai_suggested": false
      }
    ]
  }
]
```

**Status message:** `[bullet_selector] Selected {n_jobs} jobs/{n_projects} projects, {n_bullets} bullets total (retry {retry_count})`

---

### Node 2.5 — AI Suggestion Generator

| | |
|---|---|
| **Type** | LLM call (structured output) |
| **Input from state** | `selected_content`, `source_bank` (for prose summaries), `parsed_jd` |
| **Output to state** | `ai_suggestions`, `status` |
| **LLM config** | Moderate temperature (~0.4). Uses the default configured model. |

**Behavior:**

For each job/project in `selected_content`, this node proposes alternative or supplementary bullets that might be stronger or more tailored than the verbatim source-bank selections. It is strictly grounded — it can only draw from:

- The prose `summary` field of the entry in `source_bank`
- The full bullet pool of that entry (including bullets not selected by Node 2)

It cannot invent experience not described in either of those sources.

**What it can propose:**

1. **Rephrased bullets:** A tighter or more impactful version of a selected bullet, using keywords from `parsed_jd`.
2. **Condensed bullets (within-job only):** If two bullets from the same entry cover related points, the AI may propose a single merged line — but only within the same job, never across jobs.
3. **Summary-grounded bullets:** If the entry's `summary` describes something not yet captured in any existing bullet, the AI can propose a new bullet derived from it.

Bullets with `verbatim_lock: true` are never included in this pass.

**Output shape (`ai_suggestions`):**

```json
[
  {
    "source_id": "job_1",
    "suggestions": [
      {
        "text": "Reduced cache miss rate by 40% by implementing a distributed caching layer...",
        "reason": "tighter version of bullet 3 — adds quantified impact for this senior-level role",
        "replaces_bullet_ids": ["job_1_bullet_3"],
        "is_ai_suggested": true
      },
      {
        "text": "Led migration of legacy batch processing pipeline to event-driven architecture...",
        "reason": "grounded in role summary — not yet captured as a bullet; directly matches key responsibility",
        "replaces_bullet_ids": [],
        "is_ai_suggested": true
      }
    ]
  }
]
```

> **Phase 1 behavior:** `ai_suggestions` is computed and included in `output/selection_report.json`, but the CLI does not use it in the assembled resume — the LaTeX assembler uses `selected_content` (verbatim bullets) only. The interactive accept/deny UI is a Phase 5 feature.

**Status message:** `[ai_suggestion_gen] Generated {n_suggestions} suggestions across {n_entries} entries`

---

### Node 3 — LaTeX Assembler

| | |
|---|---|
| **Type** | Deterministic (Jinja2 template rendering) |
| **Input from state** | `selected_content`, `source_bank` (for header info like name/contact) |
| **Output to state** | `latex_source`, `status` |

**Behavior:**

Fills the Jinja2-templated Jake Gutierrez resume template with the selected content. This node does **not** use an LLM and does **not** rewrite bullet text — it inserts the user's bullets verbatim, consistent with the "your words, not the AI's words" philosophy.

The only text transformations applied are:
- **LaTeX special character escaping:** `&`, `%`, `$`, `#`, `_`, `{`, `}`, `~`, `^` → their LaTeX-safe equivalents.
- **Whitespace normalization:** trimming trailing whitespace, collapsing multiple blank lines.

The Jinja2 template (`src/templates/resume.tex.j2`) is a modified Jake Gutierrez–style template with placeholders for:
- Header (name, email, phone, LinkedIn, GitHub, website)
- Education section
- Experience section (iterated from `selected_content` where `type == "job"`)
- Projects section (iterated from `selected_content` where `type == "project"`)
- Skills section (aggregated from selected entries)

**Status message:** `[latex_assembler] Rendered LaTeX: {len(latex_source)} chars`

---

### Node 4 — Compile LaTeX

| | |
|---|---|
| **Type** | Deterministic (subprocess call to Tectonic) |
| **Input from state** | `latex_source` |
| **Output to state** | `pdf_path`, `page_count`, `qa_feedback` (on compile failure), `status` |

**Behavior:**

1. Writes `latex_source` to a temporary `.tex` file in the `output/` directory.
2. Invokes Tectonic as a subprocess: `tectonic output/resume.tex`
3. If compilation succeeds:
   - Sets `pdf_path` to the resulting PDF path.
   - Uses `pypdf.PdfReader` to count pages → sets `page_count`.
   - Clears `qa_feedback` (the QA node will set it if there's a problem).
4. If compilation fails:
   - Sets `pdf_path = None`, `page_count = None`.
   - Sets `qa_feedback` to the captured stderr from Tectonic (the compile error message).

**Status message:** `[compile_latex] Compilation {"succeeded" | "failed"}, {page_count} page(s)` or `[compile_latex] Compilation failed: {first line of error}`

---

### Node 5 — QA Critic

| | |
|---|---|
| **Type** | Mostly deterministic; optional LLM call for borderline cases |
| **Input from state** | `pdf_path`, `page_count`, `qa_feedback` (from compile step), `retry_count` |
| **Output to state** | `qa_feedback`, `retry_count`, `status` |
| **Conditional edge** | Routes to Node 2 (Bullet Selector) on failure; routes to END on pass or retries exhausted. |

**Behavior:**

1. **Deterministic check — did it compile?**
   - If `pdf_path is None` (compilation failed), set `qa_feedback` to the compile error, increment `retry_count`, and route back to Node 2 (if retries remain).

2. **Deterministic check — is it exactly one page?**
   - If `page_count == 1`, the resume passes. Set `qa_feedback = None`, set `status` to a success message, and route to END.
   - If `page_count != 1`, proceed to the optional LLM critique.

3. **Optional LLM critique (only if page count ≠ 1):**
   - Make one cheap LLM call to produce a short, specific, actionable critique (e.g., "Resume is 2 pages; drop the weakest bullet from the least relevant project, or remove the 'TechCorp Hackathon' project entirely").
   - Set this as `qa_feedback` and increment `retry_count`.

4. **Retry routing:**
   - If `retry_count < 3` and the check failed → route back to **Node 2** (not Node 1 — the JD doesn't need re-parsing).
   - If `retry_count >= 3` and the check still fails → route to END, but set `status` to a clear warning (e.g., `"best_effort: page_count={page_count} after {retry_count} retries"`). Do not silently pretend it succeeded.

**Status message:** `[qa_critic] {"PASS: 1 page" | "FAIL: {page_count} pages, retrying ({retry_count}/3)" | "BEST EFFORT: {page_count} pages after 3 retries"}`

---

## 4. Conditional Edges Summary

| From | To | Condition |
|---|---|---|
| START | JD Parser | Always |
| JD Parser | Job Selector | Always |
| Job Selector | Bullet Selector | Always (auto in Phase 1; after user confirmation in Phase 5) |
| Bullet Selector | AI Suggestion Gen | Always |
| AI Suggestion Gen | LaTeX Assembler | Always |
| LaTeX Assembler | Compile LaTeX | Always |
| Compile LaTeX | QA Critic | Always |
| QA Critic | Bullet Selector | `page_count != 1` AND `retry_count < 3` |
| QA Critic | END | `page_count == 1` OR `retry_count >= 3` |

---

## 5. Streaming & Logging

Each node updates the `status` field with a short, structured message as documented above. The graph is invoked using LangGraph's `.stream()` method, which yields state updates after each node completes. The CLI (`main.py`) prints each status update to the console as it arrives:

```
[jd_parser] Parsed JD: 8 required skills, 12 keywords, seniority=mid-level
[bullet_selector] Selected 4 jobs/1 projects, 17 bullets total (retry 0)
[latex_assembler] Rendered LaTeX: 4823 chars
[compile_latex] Compilation succeeded, 2 page(s)
[qa_critic] FAIL: 2 pages, retrying (1/3)
[bullet_selector] Selected 4 jobs/1 projects, 14 bullets total (retry 1)
[latex_assembler] Rendered LaTeX: 4102 chars
[compile_latex] Compilation succeeded, 1 page(s)
[qa_critic] PASS: 1 page
```

These status messages are intentionally short and structured enough that they could later be forwarded as-is over SSE to a frontend step-progress UI. No special formatting is needed now — just `print()` in the CLI loop.
