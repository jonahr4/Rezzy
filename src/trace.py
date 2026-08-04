"""
Pipeline trace — lightweight audit log with live status output.

Each node appends a step to the global trace. The trace also writes
a live status.json to the current run's output dir so the frontend
can poll for real-time progress.
"""

import json
import time
from datetime import datetime
from pathlib import Path

# Global trace state
_steps: list[dict] = []
_pipeline_start: float | None = None
_run_dir: Path | None = None


def start_pipeline(run_dir: str | Path | None = None):
    """Call at pipeline start to reset trace and set the output dir."""
    global _steps, _pipeline_start, _run_dir
    _steps = []
    _pipeline_start = time.time()
    _run_dir = Path(run_dir) if run_dir else None

    # Write initial status
    _write_live_status("running", "Pipeline started")


def get_run_dir() -> Path | None:
    """Return the current run's output directory."""
    return _run_dir


def log_step(
    node: str,
    summary: str,
    details: dict | None = None,
    inputs_used: dict | None = None,
    outputs: dict | None = None,
):
    """Log a pipeline step for auditing. Also updates live status."""
    step = {
        "node": node,
        "timestamp": datetime.now().isoformat(),
        "elapsed_s": round(time.time() - (_pipeline_start or time.time()), 2),
        "summary": summary,
        "details": details or {},
        "inputs_used": inputs_used or {},
        "outputs": outputs or {},
    }
    _steps.append(step)

    # Update live status for frontend polling
    _write_live_status("running", f"{node}: {summary}")


def get_steps() -> list[dict]:
    """Return all logged steps."""
    return _steps


def finish_pipeline(status: str, final_state: dict):
    """Mark pipeline as complete and write final status."""
    _write_live_status(
        status=status,
        message="Pipeline complete",
        extra={
            "pdf_path": final_state.get("pdf_path"),
            "page_count": final_state.get("page_count"),
            "retry_count": final_state.get("retry_count", 0),
        },
    )


def _write_live_status(status: str, message: str, extra: dict | None = None):
    """Write status.json to the run dir for frontend polling."""
    if not _run_dir:
        return

    _run_dir.mkdir(parents=True, exist_ok=True)

    data = {
        "status": status,
        "message": message,
        "steps": [
            {
                "node": s["node"],
                "summary": s["summary"],
                "elapsed_s": s["elapsed_s"],
                "timestamp": s["timestamp"],
            }
            for s in _steps
        ],
        "updated_at": datetime.now().isoformat(),
    }
    if extra:
        data.update(extra)

    status_path = _run_dir / "status.json"
    status_path.write_text(json.dumps(data, indent=2))


def render_trace() -> str:
    """Render the trace as a human-readable markdown string."""
    lines = []
    lines.append("# ResumeGenie — Pipeline Trace\n")
    lines.append(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    if _pipeline_start:
        total = round(time.time() - _pipeline_start, 1)
        lines.append(f"**Total time:** {total}s\n")

    lines.append(f"**Steps:** {len(_steps)}\n")
    lines.append("---\n")

    for i, step in enumerate(_steps):
        lines.append(f"## Step {i + 1}: {step['node']}\n")
        lines.append(f"**Time:** +{step['elapsed_s']}s  ")
        lines.append(f"**Summary:** {step['summary']}\n")

        # Inputs
        if step["inputs_used"]:
            lines.append("\n### Inputs Used\n")
            for k, v in step["inputs_used"].items():
                if isinstance(v, list):
                    lines.append(f"- **{k}:** {len(v)} items")
                    for item in v[:10]:
                        lines.append(f"  - `{item}`")
                elif isinstance(v, str) and len(v) > 200:
                    lines.append(f"- **{k}:** {v[:200]}…")
                else:
                    lines.append(f"- **{k}:** {v}")
            lines.append("")

        # Details (the reasoning/decisions)
        if step["details"]:
            lines.append("\n### Decisions\n")
            for k, v in step["details"].items():
                if isinstance(v, dict):
                    lines.append(f"**{k}:**")
                    for dk, dv in v.items():
                        lines.append(f"- `{dk}`: {dv}")
                elif isinstance(v, list):
                    lines.append(f"**{k}:**")
                    for item in v:
                        if isinstance(item, dict):
                            label = item.get("id") or item.get("entry_id") or str(item)
                            text = item.get("text") or item.get("reason") or ""
                            lines.append(f"- `{label}` — {text}")
                        else:
                            lines.append(f"- {item}")
                else:
                    lines.append(f"- **{k}:** {v}")
            lines.append("")

        # Outputs
        if step["outputs"]:
            lines.append("\n### Outputs\n")
            for k, v in step["outputs"].items():
                if isinstance(v, str) and len(v) > 300:
                    lines.append(f"- **{k}:** ({len(v)} chars)")
                elif isinstance(v, list):
                    lines.append(f"- **{k}:** {len(v)} items")
                else:
                    lines.append(f"- **{k}:** {v}")
            lines.append("")

        lines.append("\n---\n")

    return "\n".join(lines)
