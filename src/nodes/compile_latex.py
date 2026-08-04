"""
Node 4 — Compile LaTeX (deterministic, no LLM)

Writes the LaTeX source to a file and invokes Tectonic to compile to PDF.
Captures stderr for the QA node if compilation fails.
"""

import subprocess
from pathlib import Path
from src.trace import log_step, get_run_dir


def compile_latex(state: dict) -> dict:
    """Compile LaTeX source to PDF using Tectonic."""
    latex_source = state["latex_source"]

    print("\n🔨 [Node 4: Compile LaTeX] Compiling PDF with Tectonic...")

    # Use the run directory, fallback to output/
    output_dir = get_run_dir() or Path("output")
    output_dir.mkdir(parents=True, exist_ok=True)

    # Write .tex file
    tex_path = output_dir / "resume.tex"
    tex_path.write_text(latex_source)
    print(f"   ✓ Wrote {tex_path} ({len(latex_source)} chars)")

    # Run Tectonic
    try:
        result = subprocess.run(
            ["tectonic", str(tex_path)],
            capture_output=True,
            text=True,
            timeout=60,
        )

        if result.returncode == 0:
            pdf_path = output_dir / "resume.pdf"
            if pdf_path.exists():
                size_kb = pdf_path.stat().st_size / 1024
                print(f"   ✓ PDF compiled: {pdf_path} ({size_kb:.1f} KB)")
                log_step(
                    node="Compile LaTeX",
                    summary=f"PDF compiled successfully ({size_kb:.1f} KB)",
                    outputs={"pdf_path": str(pdf_path), "size_kb": round(size_kb, 1)},
                )
                return {
                    "pdf_path": str(pdf_path),
                    "status": "[compile_latex] PDF compiled successfully",
                }

        # Compilation failed
        error_msg = result.stderr or result.stdout or "Unknown compilation error"
        print(f"   ✗ Tectonic failed:\n{error_msg[:500]}")
        return {
            "pdf_path": None,
            "qa_feedback": f"LaTeX compilation failed: {error_msg[:500]}",
            "status": "[compile_latex] Compilation failed",
        }

    except FileNotFoundError:
        msg = "Tectonic is not installed. Install it: brew install tectonic (macOS) or cargo install tectonic"
        print(f"   ✗ {msg}")
        return {
            "pdf_path": None,
            "qa_feedback": msg,
            "status": "[compile_latex] Tectonic not found",
        }
    except subprocess.TimeoutExpired:
        msg = "Tectonic timed out after 60 seconds"
        print(f"   ✗ {msg}")
        return {
            "pdf_path": None,
            "qa_feedback": msg,
            "status": "[compile_latex] Tectonic timeout",
        }
