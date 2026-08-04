"""
main.py — CLI entry point for the AI Resume Tailor pipeline.

Usage:
    python main.py --jd data/sample_jd_backend.txt
    python main.py --jd data/sample_jd_data_ml.txt
    python main.py --jd path/to/any/jd.txt --bank data/source_bank.json
"""

import argparse
import json
import shutil
import time
from datetime import datetime
from pathlib import Path

from src.loader import load_source_bank, load_jd
from src.graph import app
from src.trace import start_pipeline, render_trace, finish_pipeline


def _create_run_dir() -> Path:
    """Create a timestamped run directory."""
    ts = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    run_dir = Path(f"output/run_{ts}")
    run_dir.mkdir(parents=True, exist_ok=True)
    return run_dir


def _update_runs_index(run_dir: Path, jd_file: str, final_state: dict, elapsed: float):
    """Append this run to output/runs_index.json so the frontend can list all runs."""
    index_path = Path("output/runs_index.json")
    if index_path.exists():
        index = json.loads(index_path.read_text())
    else:
        index = {"runs": []}

    run_entry = {
        "id": run_dir.name,
        "dir": str(run_dir),
        "jd_file": jd_file,
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


def main():
    parser = argparse.ArgumentParser(description="AI Resume Tailor — generate a tailored resume PDF")
    parser.add_argument("--jd", required=True, help="Path to job description text file")
    parser.add_argument("--bank", default="data/source_bank.json", help="Path to source_bank.json")
    args = parser.parse_args()

    # Create timestamped run directory
    run_dir = _create_run_dir()

    # Banner
    print("=" * 60)
    print("  🧞 ResumeGenie — AI Resume Tailor Pipeline")
    print(f"  📁 Run: {run_dir}")
    print("=" * 60)

    # Load inputs
    print(f"\n📂 Loading source bank: {args.bank}")
    source_bank = load_source_bank(args.bank)
    n_entries = len(source_bank["entries"])
    n_bullets = sum(len(e["bullets"]) for e in source_bank["entries"])
    print(f"   ✓ {n_entries} entries, {n_bullets} bullets")

    print(f"\n📝 Loading job description: {args.jd}")
    jd_raw = load_jd(args.jd)
    print(f"   ✓ {len(jd_raw)} chars")

    # Copy JD to run dir for reference
    shutil.copy2(args.jd, run_dir / "input_jd.txt")

    # Initial state
    initial_state = {
        "job_description_raw": jd_raw,
        "source_bank": source_bank,
        "parsed_jd": {},
        "confirmed_entries": [],
        "user_overrides": {},
        "selected_content": [],
        "ai_suggestions": [],
        "latex_source": "",
        "pdf_path": None,
        "page_count": None,
        "qa_feedback": None,
        "retry_count": 0,
        "status": "initialized",
    }

    # Run pipeline
    start_pipeline(run_dir=run_dir)
    start = time.time()
    print("\n" + "─" * 60)
    print("  PIPELINE START")
    print("─" * 60)

    final_state = app.invoke(initial_state)

    elapsed = time.time() - start

    # Results
    print("\n" + "─" * 60)
    print("  PIPELINE COMPLETE")
    print("─" * 60)
    print(f"\n⏱  Total time: {elapsed:.1f}s")
    print(f"📊 Status: {final_state.get('status', 'unknown')}")

    # Save outputs to the run directory
    # Selection report
    report = {
        "parsed_jd": final_state.get("parsed_jd", {}),
        "confirmed_entries": final_state.get("confirmed_entries", []),
        "selected_content": final_state.get("selected_content", []),
        "ai_suggestions": final_state.get("ai_suggestions", []),
        "page_count": final_state.get("page_count"),
        "retry_count": final_state.get("retry_count", 0),
        "status": final_state.get("status", ""),
    }
    report_path = run_dir / "selection_report.json"
    report_path.write_text(json.dumps(report, indent=2))
    print(f"📋 Report: {report_path}")

    # LaTeX source
    if final_state.get("latex_source"):
        tex_path = run_dir / "resume.tex"
        tex_path.write_text(final_state["latex_source"])
        print(f"📝 LaTeX: {tex_path}")

    # PDF (move from wherever compile_latex put it)
    if final_state.get("pdf_path"):
        src_pdf = Path(final_state["pdf_path"])
        if src_pdf.exists():
            dst_pdf = run_dir / "resume.pdf"
            shutil.move(str(src_pdf), str(dst_pdf))
            final_state["pdf_path"] = str(dst_pdf)
            print(f"📄 PDF: {dst_pdf}")

    # Pipeline trace
    trace_path = run_dir / "pipeline_trace.md"
    trace_path.write_text(render_trace())
    print(f"🔍 Trace: {trace_path}")

    # Finalize status for frontend
    finish_pipeline(
        status="complete" if final_state.get("pdf_path") else "failed",
        final_state=final_state,
    )

    # Update runs index
    _update_runs_index(run_dir, args.jd, final_state, elapsed)

    if final_state.get("pdf_path"):
        print(f"\n📄 PDF: {final_state['pdf_path']}")
    else:
        print("\n⚠️  No PDF produced. Check trace for errors.")

    print(f"\n✅ Done! All outputs in {run_dir}/")


if __name__ == "__main__":
    main()
