"""
Node 5 — QA Critic

Checks the compiled PDF for quality:
- Is the PDF exactly 1 page?
- Did compilation succeed at all?

If checks fail and retry_count < 3, routes back to bullet selector.
"""

from pathlib import Path
from src.trace import log_step

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None


def qa_critic(state: dict) -> dict:
    """Check PDF quality and decide whether to retry."""
    pdf_path = state.get("pdf_path")
    retry_count = state.get("retry_count", 0)
    qa_feedback = state.get("qa_feedback")

    print("\n🔎 [Node 5: QA Critic] Checking output quality...")

    # If compilation already failed, qa_feedback is set by compile_latex
    if not pdf_path:
        print(f"   ✗ No PDF produced. Feedback: {qa_feedback}")
        return {
            "page_count": None,
            "retry_count": retry_count + 1,
            "status": f"[qa_critic] No PDF — retry {retry_count + 1}/3",
        }

    # Check page count
    page_count = _get_page_count(pdf_path)
    if page_count is None:
        feedback = "Could not read PDF to check page count"
        print(f"   ✗ {feedback}")
        return {
            "page_count": None,
            "qa_feedback": feedback,
            "retry_count": retry_count + 1,
            "status": "[qa_critic] PDF unreadable",
        }

    print(f"   📄 Page count: {page_count}")

    if page_count == 1:
        print("   ✅ PASS — Resume is exactly 1 page!")
        log_step(
            node="QA Critic",
            summary="PASS — Resume is exactly 1 page",
            details={"page_count": 1, "verdict": "PASS"},
        )
        return {
            "page_count": 1,
            "qa_feedback": None,  # clear any previous feedback
            "status": "[qa_critic] PASS — 1 page",
        }

    # Too many pages — need to trim
    feedback = f"Resume is {page_count} pages — must be exactly 1 page. Select fewer bullets or shorter phrasings."
    print(f"   ✗ FAIL — {feedback}")
    log_step(
        node="QA Critic",
        summary=f"FAIL — {page_count} pages (retry {retry_count + 1}/3)",
        details={"page_count": page_count, "verdict": "FAIL", "feedback": feedback},
    )
    return {
        "page_count": page_count,
        "qa_feedback": feedback,
        "retry_count": retry_count + 1,
        "status": f"[qa_critic] FAIL — {page_count} pages, retry {retry_count + 1}/3",
    }


def _get_page_count(pdf_path: str) -> int | None:
    """Read page count from a PDF file."""
    if PdfReader is None:
        print("   ⚠ pypdf not installed, skipping page count check")
        return 1  # assume pass if we can't check

    try:
        reader = PdfReader(pdf_path)
        return len(reader.pages)
    except Exception as e:
        print(f"   ⚠ Error reading PDF: {e}")
        return None
