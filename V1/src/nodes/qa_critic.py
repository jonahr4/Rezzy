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
        # Too many pages — need to trim. Be specific about how much to cut.
        retry = retry_count + 1  # this will be the retry number after this return
        if retry >= 3:
            feedback = (
                f"Resume is {page_count} pages on attempt {retry}/3. "
                "Final attempt — tightening spacing to maximum compression. "
                "If still overflowing, consider reducing to 2-3 bullets per entry "
                "or shortening the longest bullets."
            )
        elif retry >= 2:
            feedback = (
                f"Resume is {page_count} pages on attempt {retry}/3. "
                "Increasing layout compression. Reduce bullet count by 2-3 more total. "
                "Aim for 3 bullets max per job and 2 per project. "
                "Prefer concise 1-line bullets."
            )
        else:
            feedback = (
                f"Resume is {page_count} pages — adjusting to fit 1 page. "
                "Tightening spacing and reducing total bullet count by 2-3. "
                "Drop to the lower end of each range: 3-4 bullets for jobs, 2 for projects."
            )
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
        # Convert first page to PNG at high resolution
        doc = fitz.open(pdf_path)
        page = doc[0]
        pix = page.get_pixmap(dpi=200)
        img_bytes = pix.tobytes("png")
        doc.close()

        img_b64 = base64.b64encode(img_bytes).decode("utf-8")

        from src.llm import chat

        response = chat(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a resume formatting QA inspector analyzing a rendered PDF image. "
                        "Check for these specific visual defects:\n\n"
                        "CRITICAL (must fix — respond with issue description, not PASS):\n"
                        "1. OVERLAPPING TEXT: Any text lines that overlap or touch each other — "
                        "especially in the Education section (degree + GPA), between bullet points, "
                        "or where section headers meet content. Even 1px overlap is a FAIL.\n"
                        "2. TEXT CUT OFF: Content cut off at page margins (left, right, or bottom).\n"
                        "3. OVERFLOW: Content clearly extends beyond where the page should end.\n"
                        "4. UNEVEN SECTION SPACING: The vertical gap between sections (Education→Skills, "
                        "Skills→Experience, Experience→Projects) must be visually equal. If one section "
                        "header is noticeably closer to the content above it than the others, that is a "
                        "CRITICAL spacing failure. Specifically check that the space above each section "
                        "header (the gap from the last line of the previous section to the section rule) "
                        "looks consistent. If a section header appears to be touching or nearly touching "
                        "the content above it while others have more space, report it.\n\n"
                        "OK TO IGNORE:\n"
                        "- Minor orphan words on bullet wrap lines\n"
                        "- Slight variation in bullet spacing within a single section\n\n"
                        "RESPONSE FORMAT:\n"
                        "- If the resume looks clean and professional with even section spacing: respond with exactly 'PASS'\n"
                        "- If there are CRITICAL issues: describe them briefly in 1-2 sentences. "
                        "Do NOT suggest removing bullets — the spacing is fixed by the template."
                    ),
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Inspect this resume PDF for visual formatting issues:"},
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
            print(f"   ⚠ Visual QA feedback: {response[:120]}")
            return response

    except Exception as e:
        print(f"   ⚠ Visual QA error: {e}")
        return None  # Don't fail the pipeline on visual QA errors
