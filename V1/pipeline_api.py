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
import base64
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
from langsmith import traceable

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


def _encode_pdf(pdf_path: str | None) -> str | None:
    """Read a PDF file and return it as a base64 string."""
    if not pdf_path:
        return None
    try:
        with open(pdf_path, "rb") as f:
            return base64.b64encode(f.read()).decode("ascii")
    except Exception:
        return None


def _render_pdf_preview(pdf_path: str | None) -> str | None:
    """Render the first page of a PDF to a base64 PNG string."""
    if not pdf_path:
        return None
    try:
        import fitz
        doc = fitz.open(pdf_path)
        page = doc[0]
        pix = page.get_pixmap(dpi=150)  # Slightly lower DPI for faster SSE transfer
        img_bytes = pix.tobytes("png")
        doc.close()
        return base64.b64encode(img_bytes).decode("utf-8")
    except Exception as e:
        print(f"   ⚠ Preview render error: {e}")
        return None


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
    skill_rows: list[dict] | None = None


# ── Helpers ───────────────────────────────────────────────

def _load_bank() -> dict:
    """Load source bank from disk."""
    return load_source_bank("data/source_bank.json")


# ── Endpoints ─────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "model": os.getenv("OPENROUTER_MODEL")}


@app.post("/step/parse-jd")
@traceable(run_type="chain", name="web_parse_jd")
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


class SkillsRequest(BaseModel):
    parsed_jd: dict


@app.post("/step/skills")
@traceable(run_type="chain", name="web_skills")
def step_skills(req: SkillsRequest):
    """Step 1.5: Organize and suggest skills for the resume."""
    session = _get_or_create_session()
    bank = _load_bank()
    all_skills = bank.get("skills", [])

    from src.llm import chat

    prompt = f"""You are a resume skills organizer. Given a job description and a candidate's full skill list,
do THREE things:

1. **Categorize** the candidate's existing skills into 4-5 resume categories (e.g., "Languages", "Frameworks & Libraries", "Tools & DevOps", "Cloud & Databases", "AI/ML").
   - Sort skills within each category by relevance to the job description (most relevant first).
   - Only include skills that are RELEVANT to this role. Leave irrelevant ones out (they'll go to the "available" pool).

2. **Identify available skills** — skills from the candidate's bank that you did NOT place into any category. These are less relevant but the user can manually add them.

3. **Suggest 3-6 NEW skills** — skills the candidate likely has (inferable from their experience) but aren't explicitly listed, AND are important keywords for this specific job description. These should be the most impactful ATS keywords.

Job Description:
Company: {req.parsed_jd.get('company_name', 'Unknown')}
Role: {req.parsed_jd.get('role_title', 'Unknown')}
Required Skills: {', '.join(req.parsed_jd.get('required_skills', []))}
Nice to Have: {', '.join(req.parsed_jd.get('nice_to_have_skills', []))}
Keywords: {', '.join(req.parsed_jd.get('keywords', []))}

Candidate's Skills:
{', '.join(all_skills)}

Return JSON:
{{
  "skill_rows": [
    {{"id": "row_1", "label": "Languages", "items": ["Python", "JavaScript", ...]}},
    {{"id": "row_2", "label": "Frameworks & Libraries", "items": ["React", "Next.js", ...]}},
    ...
  ],
  "available_skills": ["OCaml", "Kotlin", ...],
  "suggested_skills": ["Docker", "Kubernetes", "GraphQL", ...]
}}"""

    response = chat(
        [{"role": "user", "content": prompt}],
        temperature=0.2,
        response_format={"type": "json_object"},
    )

    import json as _json
    data = _json.loads(response)

    log_step(
        node="skills_organizer",
        summary=f"Organized {sum(len(r['items']) for r in data['skill_rows'])} skills into {len(data['skill_rows'])} categories",
        outputs={
            "categories": [r["label"] for r in data["skill_rows"]],
            "available_count": len(data.get("available_skills", [])),
            "suggested_count": len(data.get("suggested_skills", [])),
        },
    )

    session["skill_rows"] = data["skill_rows"]
    return {
        "skill_rows": data["skill_rows"],
        "available_skills": data.get("available_skills", []),
        "suggested_skills": data.get("suggested_skills", []),
        "status": "[skills_organizer] OK",
    }


@app.post("/step/select-entries")
@traceable(run_type="chain", name="web_select_entries")
def step_select_entries(req: SelectEntriesRequest):
    """Step 1.5: Select which entries to include."""
    session = _get_or_create_session()
    bank = _load_bank()
    state = {
        "parsed_jd": req.parsed_jd,
        "source_bank": bank,
    }
    result = job_selector(state)

    rationales = result.get("rationales", {})
    excluded_reasons = result.get("excluded", {})

    entries = bank["entries"]
    all_entries = []
    for entry in entries:
        is_selected = entry["id"] in result["confirmed_entries"]
        rationale = rationales.get(entry["id"], "") if is_selected else excluded_reasons.get(entry["id"], "")
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
            "summary": rationale,
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
@traceable(run_type="chain", name="web_select_bullets")
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
@traceable(run_type="chain", name="web_suggest")
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
@traceable(run_type="chain", name="web_compile")
def step_compile(req: CompileRequest):
    """Steps 3-5: Assemble LaTeX, compile PDF, run QA with SSE progress."""
    from starlette.responses import StreamingResponse

    def generate():
        def send_event(event: str, data: dict | str = ""):
            payload = json.dumps(data) if isinstance(data, dict) else data
            yield f"event: {event}\ndata: {payload}\n\n"

        session = _get_or_create_session()
        run_dir = session["run_dir"]

        # Assemble
        yield from send_event("progress", {"stage": "assembling", "message": "Assembling LaTeX..."})
        skill_rows = req.skill_rows or session.get("skill_rows")
        state: dict = {
            "selected_content": req.selected_content,
            "parsed_jd": req.parsed_jd,
            "source_bank": _load_bank(),
            "confirmed_entries": session.get("confirmed_entries", [e["entry_id"] for e in req.selected_content]),
        }
        if skill_rows:
            state["skill_rows"] = skill_rows
        state.update(latex_assembler(state))

        log_step(
            node="latex_assembler",
            summary=f"Rendered {len(req.selected_content)} entries",
            outputs={"latex_chars": len(state.get("latex_source", ""))},
        )

        # Compile
        yield from send_event("progress", {"stage": "compiling", "message": "Compiling PDF..."})
        state["run_dir"] = str(run_dir)
        state.update(compile_latex(state))

        log_step(
            node="compile_latex",
            summary=f"PDF compiled ({state.get('page_count', '?')} page(s))",
            outputs={"pdf_path": state.get("pdf_path")},
        )

        # QA feedback loop
        max_retries = 3
        for attempt in range(max_retries):
            yield from send_event("progress", {
                "stage": "qa_checking",
                "message": f"QA critic reviewing (attempt {attempt + 1}/{max_retries})...",
                "attempt": attempt + 1,
            })
            state.update(qa_critic(state))

            log_step(
                node="qa_critic",
                summary=state.get("status", ""),
                outputs={
                    "page_count": state.get("page_count"),
                    "qa_feedback": state.get("qa_feedback"),
                    "attempt": attempt + 1,
                },
            )

            # Send the rendered PDF preview to the frontend
            preview_b64 = _render_pdf_preview(state.get("pdf_path"))
            qa_fb = state.get("qa_feedback")

            if not qa_fb:
                yield from send_event("qa_result", {
                    "stage": "qa_pass",
                    "message": "QA passed ✓",
                    "attempt": attempt + 1,
                    "verdict": "PASS",
                    "preview": preview_b64,
                })
                break

            if attempt < max_retries - 1:
                yield from send_event("qa_result", {
                    "stage": "qa_retry",
                    "message": f"QA found issues (attempt {attempt + 1}/{max_retries})",
                    "feedback": qa_fb,
                    "attempt": attempt + 1,
                    "verdict": "FAIL",
                    "preview": preview_b64,
                })
                state["retry_count"] = attempt + 1
                state["qa_fix_instructions"] = state["qa_feedback"]
                yield from send_event("progress", {
                    "stage": "qa_fixing",
                    "message": f"Fixing issues and recompiling (attempt {attempt + 2}/{max_retries})...",
                    "attempt": attempt + 2,
                })
                state.update(bullet_selector(state))
                state.update(latex_assembler(state))
                state.update(compile_latex(state))
                log_step(
                    node="retry",
                    summary=f"Retry {attempt + 1}/{max_retries}: {state.get('qa_feedback', '')[:80]}",
                )
            else:
                # Final attempt failed
                yield from send_event("qa_result", {
                    "stage": "qa_fail",
                    "message": f"QA issues remain after {max_retries} attempts",
                    "feedback": qa_fb,
                    "attempt": attempt + 1,
                    "verdict": "WARN",
                    "preview": preview_b64,
                })

        # Save all output files
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

        if state.get("latex_source"):
            (run_dir / "resume.tex").write_text(state["latex_source"])

        if state.get("pdf_path"):
            src_pdf = Path(state["pdf_path"])
            if src_pdf.exists():
                dst_pdf = run_dir / "resume.pdf"
                shutil.move(str(src_pdf), str(dst_pdf))
                state["pdf_path"] = str(dst_pdf)

        (run_dir / "pipeline_trace.md").write_text(render_trace())

        finish_pipeline(
            status="complete" if state.get("page_count") == 1 else "failed",
            final_state=state,
        )

        elapsed = time.time() - session.get("start_time", time.time())
        _update_runs_index(
            run_dir=run_dir,
            jd_source="[web] interactive",
            final_state={**state, "parsed_jd": session.get("parsed_jd", req.parsed_jd)},
            elapsed=elapsed,
        )

        _reset_session()

        # Final done event with result data
        yield from send_event("done", {
            "pdf_path": state.get("pdf_path"),
            "page_count": state.get("page_count"),
            "qa_feedback": state.get("qa_feedback"),
            "latex_source": state.get("latex_source", ""),
            "run_dir": str(run_dir),
            "status": state.get("status"),
            "pdf_base64": _encode_pdf(state.get("pdf_path")),
        })

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.get("/source-bank")
def get_source_bank():
    """Return the full source bank for the UI."""
    return _load_bank()
