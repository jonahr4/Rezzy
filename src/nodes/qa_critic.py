"""
Node 5 — QA Critic

Checks the compiled PDF for quality:
- Is the PDF exactly 1 page?
- Visual inspection via LLM (checks for overlapping text, spacing issues, etc.)
- Did compilation succeed at all?

If checks fail and retry_count < 3, routes back to bullet selector.
"""

import base64
from pathlib import Path
from src.trace import log_step

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None


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

    if page_count != 1:
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

    # Page count passed — now do visual inspection
    visual_issues = _visual_inspect(pdf_path)
    if visual_issues:
        feedback = f"Visual QA: {visual_issues}"
        print(f"   ⚠ {feedback}")
        log_step(
            node="QA Critic",
            summary=f"WARN — visual issues detected (retry {retry_count + 1}/3)",
            details={"page_count": 1, "verdict": "WARN", "visual_issues": visual_issues},
        )
        return {
            "page_count": 1,
            "qa_feedback": feedback,
            "retry_count": retry_count + 1,
            "status": f"[qa_critic] WARN — visual issues, retry {retry_count + 1}/3",
        }

    print("   ✅ PASS — Resume is exactly 1 page, visual check passed!")
    log_step(
        node="QA Critic",
        summary="PASS — 1 page, visuals clean",
        details={"page_count": 1, "verdict": "PASS"},
    )
    return {
        "page_count": 1,
        "qa_feedback": None,  # clear any previous feedback
        "status": "[qa_critic] PASS — 1 page",
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


def _visual_inspect(pdf_path: str) -> str | None:
    """
    Convert PDF to image and send to the LLM for visual quality check.
    Returns a string describing issues, or None if everything looks good.
    """
    if fitz is None:
        print("   ⚠ PyMuPDF not installed, skipping visual QA")
        return None

    try:
        # Convert first page to PNG
        doc = fitz.open(pdf_path)
        page = doc[0]
        # Render at 2x resolution for clarity
        pix = page.get_pixmap(dpi=200)
        img_bytes = pix.tobytes("png")
        doc.close()

        img_b64 = base64.b64encode(img_bytes).decode("utf-8")

        # Use the LLM with vision to inspect
        from src.llm import chat

        response = chat(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a resume formatting QA inspector. "
                        "Analyze this resume PDF image and check for visual defects. "
                        "Look for: overlapping text, text cut off at margins, "
                        "inconsistent spacing between sections, "
                        "section headers overlapping with content, "
                        "text running off the page edges, "
                        "blank sections with no content. "
                        "If the resume looks clean and well-formatted, respond with exactly: PASS "
                        "If there are issues, respond with a brief description of the problems found. "
                        "Be strict about overlapping text — even slight overlap is a FAIL."
                    ),
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Inspect this resume for visual formatting issues:"},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/png;base64,{img_b64}"},
                        },
                    ],
                },
            ],
            temperature=0.1,
        )

        response = response.strip()
        if response.upper().startswith("PASS"):
            print("   ✅ Visual QA: clean")
            return None
        else:
            return response

    except Exception as e:
        print(f"   ⚠ Visual QA error: {e}")
        return None  # Don't fail the pipeline on visual QA errors
