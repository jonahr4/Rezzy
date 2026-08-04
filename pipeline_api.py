"""
Pipeline API — FastAPI sidecar for step-by-step pipeline execution.

Each endpoint runs ONE pipeline node and returns its output.
The Next.js frontend calls these sequentially, pausing for user input between steps.

All runs are:
- Traced via src.trace (same as CLI)
- Logged to output/runs_index.json (shows in Runs tab)
- Output files saved to timestamped run directory

Run: uvicorn pipeline_api:app --port 5001 --reload
"""

import json
import os
import shutil
import time
from pathlib import Path
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# Import pipeline nodes
from src.nodes.jd_parser import jd_parser
from src.nodes.job_selector import job_selector
from src.nodes.bullet_selector import bullet_selector
from src.nodes.ai_suggestion_gen import ai_suggestion_gen
from src.nodes.latex_assembler import latex_assembler
from src.nodes.compile_latex import compile_latex
from src.nodes.qa_critic import qa_critic
from src.loader import load_source_bank
from src.trace import start_pipeline, log_step, render_trace, finish_pipeline

app = FastAPI(title="ResumeGenie Pipeline API", version="0.1.0")

# CORS for Next.js dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Session state ─────────────────────────────────────────
# Tracks the current interactive run so trace/logging spans all steps.
_session: dict = {}


def _get_or_create_session():
    """Get the active session or create a new one."""
    if not _session.get("run_dir"):
        ts = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        run_dir = Path(f"output/run_{ts}")
        run_dir.mkdir(parents=True, exist_ok=True)
        _session["run_dir"] = run_dir
        _session["start_time"] = time.time()
        _session["jd_text"] = ""
        start_pipeline(run_dir=run_dir)
    return _session


def _reset_session():
    """Reset session for the next run."""
    _session.clear()


def _update_runs_index(run_dir: Path, jd_source: str, final_state: dict, elapsed: float):
    """Append this run to output/runs_index.json so the frontend can list all runs."""
    index_path = Path("output/runs_index.json")
    if index_path.exists():
        index = json.loads(index_path.read_text())
    else:
        index = {"runs": []}

    run_entry = {
        "id": run_dir.name,
        "dir": str(run_dir),
        "jd_file": jd_source,
        "started_at": datetime.now().isoformat(),
        "elapsed_s": round(elapsed, 1),
        "status": "complete" if final_state.get("pdf_path") else "failed",
        "pdf_path": final_state.get("pdf_path"),
        "page_count": final_state.get("page_count"),
        "retry_count": final_state.get("retry_count", 0),
        "company": final_state.get("parsed_jd", {}).get("company_name", "Unknown"),
        "role": final_state.get("parsed_jd", {}).get("role_title", "Unknown"),
    }

    index["runs"].insert(0, run_entry)  # newest first
    index_path.write_text(json.dumps(index, indent=2))


# ── Models ────────────────────────────────────────────────

class ParseJDRequest(BaseModel):
    jd_text: str

class SelectEntriesRequest(BaseModel):
    parsed_jd: dict

class SelectBulletsRequest(BaseModel):
    parsed_jd: dict
    confirmed_entries: list[str]

class SuggestRequest(BaseModel):
    parsed_jd: dict
    selected_content: list[dict]

class CompileRequest(BaseModel):
    selected_content: list[dict]
    parsed_jd: dict


# ── Helpers ───────────────────────────────────────────────

def _load_bank() -> dict:
    """Load source bank from disk."""
    return load_source_bank("data/source_bank.json")


# ── Endpoints ─────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "model": os.getenv("OPENROUTER_MODEL")}


@app.post("/step/parse-jd")
def step_parse_jd(req: ParseJDRequest):
    """Step 1: Parse the job description."""
    session = _get_or_create_session()
    session["jd_text"] = req.jd_text

    # Save JD to run directory
    jd_path = session["run_dir"] / "input_jd.txt"
    jd_path.write_text(req.jd_text)

    state = {
        "job_description_raw": req.jd_text,
        "source_bank": _load_bank(),
    }
    result = jd_parser(state)

    log_step(
        node="jd_parser",
        summary=f"{result['parsed_jd'].get('company_name', '?')} — {result['parsed_jd'].get('role_title', '?')}",
        outputs={
            "required_skills": len(result["parsed_jd"].get("required_skills", [])),
            "nice_to_have": len(result["parsed_jd"].get("nice_to_have_skills", [])),
            "keywords": len(result["parsed_jd"].get("keywords", [])),
        },
    )

    session["parsed_jd"] = result["parsed_jd"]
    return {
        "parsed_jd": result["parsed_jd"],
        "status": result["status"],
    }


@app.post("/step/select-entries")
def step_select_entries(req: SelectEntriesRequest):
    """Step 1.5: Select which entries to include."""
    session = _get_or_create_session()
    bank = _load_bank()
    state = {
        "parsed_jd": req.parsed_jd,
        "source_bank": bank,
    }
    result = job_selector(state)

    entries = bank["entries"]
    all_entries = []
    for entry in entries:
        is_selected = entry["id"] in result["confirmed_entries"]
        all_entries.append({
            "id": entry["id"],
            "type": entry["type"],
            "title": entry["title"],
            "company": entry.get("company"),
            "start_date": entry["start_date"],
            "end_date": entry.get("end_date", "Present"),
            "location": entry.get("location"),
            "pinned": entry.get("pinned", False),
            "selected": is_selected,
            "bullet_count": len(entry["bullets"]),
            "tags": entry.get("tags", []),
            "summary": entry.get("summary", ""),
        })

    log_step(
        node="job_selector",
        summary=f"Selected {len(result['confirmed_entries'])} entries",
        outputs={"confirmed_entries": result["confirmed_entries"]},
    )

    session["confirmed_entries"] = result["confirmed_entries"]
    return {
        "confirmed_entries": result["confirmed_entries"],
        "all_entries": all_entries,
        "status": result["status"],
    }


@app.post("/step/select-bullets")
def step_select_bullets(req: SelectBulletsRequest):
    """Step 2: Select bullets for each confirmed entry."""
    session = _get_or_create_session()
    bank = _load_bank()
    state = {
        "parsed_jd": req.parsed_jd,
        "source_bank": bank,
        "confirmed_entries": req.confirmed_entries,
    }
    result = bullet_selector(state)

    entries_with_banks = []
    for sel in result["selected_content"]:
        entry = next((e for e in bank["entries"] if e["id"] == sel["entry_id"]), None)
        if entry:
            entries_with_banks.append({
                **sel,
                "all_bullets": [{"id": b["id"], "text": b["text"]} for b in entry["bullets"]],
            })

    total_bullets = sum(len(s["selected_bullets"]) for s in result["selected_content"])
    log_step(
        node="bullet_selector",
        summary=f"Selected {total_bullets} bullets across {len(result['selected_content'])} entries",
        outputs={e["entry_id"]: len(e["selected_bullets"]) for e in result["selected_content"]},
    )

    session["selected_content"] = result["selected_content"]
    return {
        "selected_content": entries_with_banks,
        "status": result["status"],
    }


@app.post("/step/suggest")
def step_suggest(req: SuggestRequest):
    """Step 2.5: Generate AI suggestions."""
    session = _get_or_create_session()
    bank = _load_bank()
    state = {
        "parsed_jd": req.parsed_jd,
        "source_bank": bank,
        "selected_content": req.selected_content,
    }
    result = ai_suggestion_gen(state)

    total_sugs = sum(len(s["suggestions"]) for s in result["ai_suggestions"])
    log_step(
        node="ai_suggestion_gen",
        summary=f"Generated {total_sugs} suggestions",
        outputs={s["entry_id"]: len(s["suggestions"]) for s in result["ai_suggestions"]},
    )

    session["ai_suggestions"] = result["ai_suggestions"]
    return {
        "ai_suggestions": result["ai_suggestions"],
        "status": result["status"],
    }


@app.post("/step/compile")
def step_compile(req: CompileRequest):
    """Steps 3-5: Assemble LaTeX, compile PDF, run QA. Then finalize the run."""
    session = _get_or_create_session()
    run_dir = session["run_dir"]

    # Assemble
    state: dict = {
        "selected_content": req.selected_content,
        "parsed_jd": req.parsed_jd,
        "source_bank": _load_bank(),
    }
    state.update(latex_assembler(state))

    log_step(
        node="latex_assembler",
        summary=f"Rendered {len(req.selected_content)} entries",
        outputs={"latex_chars": len(state.get("latex_source", ""))},
    )

    # Compile
    state["run_dir"] = str(run_dir)
    state.update(compile_latex(state))

    log_step(
        node="compile_latex",
        summary=f"PDF compiled ({state.get('page_count', '?')} page(s))",
        outputs={"pdf_path": state.get("pdf_path")},
    )

    # QA
    state.update(qa_critic(state))

    log_step(
        node="qa_critic",
        summary=state.get("status", ""),
        outputs={
            "page_count": state.get("page_count"),
            "qa_feedback": state.get("qa_feedback"),
        },
    )

    # If QA fails, retry once
    if state.get("qa_feedback") and state.get("retry_count", 0) < 1:
        state["retry_count"] = 1
        state.update(bullet_selector(state))
        state.update(latex_assembler(state))
        state.update(compile_latex(state))
        state.update(qa_critic(state))
        log_step(node="retry", summary="Retried with fewer bullets")

    # ── Save all output files (same as main.py) ──

    # Selection report
    report = {
        "parsed_jd": session.get("parsed_jd", req.parsed_jd),
        "confirmed_entries": session.get("confirmed_entries", []),
        "selected_content": req.selected_content,
        "ai_suggestions": session.get("ai_suggestions", []),
        "page_count": state.get("page_count"),
        "retry_count": state.get("retry_count", 0),
        "status": state.get("status", ""),
    }
    (run_dir / "selection_report.json").write_text(json.dumps(report, indent=2))

    # LaTeX source
    if state.get("latex_source"):
        (run_dir / "resume.tex").write_text(state["latex_source"])

    # Move PDF to run directory
    if state.get("pdf_path"):
        src_pdf = Path(state["pdf_path"])
        if src_pdf.exists():
            dst_pdf = run_dir / "resume.pdf"
            shutil.move(str(src_pdf), str(dst_pdf))
            state["pdf_path"] = str(dst_pdf)

    # Pipeline trace
    (run_dir / "pipeline_trace.md").write_text(render_trace())

    # Finalize status for frontend polling
    finish_pipeline(
        status="complete" if state.get("page_count") == 1 else "failed",
        final_state=state,
    )

    # Update runs index
    elapsed = time.time() - session.get("start_time", time.time())
    _update_runs_index(
        run_dir=run_dir,
        jd_source="[web] interactive",
        final_state={**state, "parsed_jd": session.get("parsed_jd", req.parsed_jd)},
        elapsed=elapsed,
    )

    # Reset session for next run
    _reset_session()

    return {
        "pdf_path": state.get("pdf_path"),
        "page_count": state.get("page_count"),
        "qa_feedback": state.get("qa_feedback"),
        "latex_source": state.get("latex_source", ""),
        "run_dir": str(run_dir),
        "status": state.get("status"),
    }


@app.get("/source-bank")
def get_source_bank():
    """Return the full source bank for the UI."""
    return _load_bank()
