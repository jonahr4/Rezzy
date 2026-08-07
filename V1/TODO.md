# TODO — Phase 1 Acceptance Criteria

Checklist mirrors [Section 7 of the spec](docs/04-ROADMAP-AND-PHASES.md). Phase 1 is complete when every box is checked.

---

## Acceptance Criteria

- [ ] **AC-1: End-to-end run.**
  `python main.py --jd data/sample_jd_backend.txt` runs with no manual intervention and produces `output/resume.pdf`.

- [ ] **AC-2: One-page output.**
  The output PDF is exactly one page. If the QA/retry loop cannot achieve this within the retry cap (3 retries), the run clearly reports that in its final console summary rather than silently succeeding.

- [ ] **AC-3: Differentiated selection.**
  Running with `--jd data/sample_jd_data_ml.txt` produces a **visibly different** selection of jobs/projects and bullets. Compare the two `output/selection_report.json` outputs to confirm the selector is discriminating on relevance, not returning a fixed subset.

- [ ] **AC-4: Reason fields populated.**
  Every bullet in `selection_report.json` has a non-empty `reason` field.

- [ ] **AC-5: Streaming status log.**
  Console output shows a clear, ordered, per-node status log for the run (via LangGraph streaming), not just scattered print statements.

- [ ] **AC-6: Retry loop exercised.**
  The retry/critic loop is demonstrably exercised at least once during testing and successfully recovers to one page.

- [ ] **AC-7: No hardcoded secrets.**
  No API keys or secrets are hardcoded anywhere. Everything sensitive comes from `.env`, and `.env` is in `.gitignore`.

- [ ] **AC-8: Documentation complete.**
  All four `docs/` files, `GETTING_STARTED.md`, and this `TODO.md` exist and accurately reflect what was actually built (not just the kickoff prompt restated).

---

## Implementation Checklist

### Documentation
- [x] `docs/01-PRODUCT-VISION.md`
- [x] `docs/02-TECH-ARCHITECTURE.md`
- [x] `docs/03-PIPELINE-SPEC.md`
- [x] `docs/04-ROADMAP-AND-PHASES.md`
- [x] `GETTING_STARTED.md`
- [x] `TODO.md`

### Scaffold & Data
- [ ] Project directory structure
- [ ] `data/source_bank.json` (oversupplied mock data)
- [ ] `data/sample_jd_backend.txt`
- [ ] `data/sample_jd_data_ml.txt`
- [ ] `src/templates/resume.tex.j2`
- [ ] `requirements.txt`
- [ ] `.env.example`
- [ ] `.gitignore`

### Pipeline Nodes
- [ ] `src/state.py` — graph state schema
- [ ] `src/llm.py` — OpenRouter client wrapper
- [ ] `src/nodes/jd_parser.py` — Node 1
- [ ] `src/nodes/bullet_selector.py` — Node 2 (core)
- [ ] `src/nodes/latex_assembler.py` — Node 3
- [ ] `src/nodes/compile_latex.py` — Node 4
- [ ] `src/nodes/qa_critic.py` — Node 5

### Integration
- [ ] `src/graph.py` — full graph with conditional edges
- [ ] `main.py` — CLI entrypoint
