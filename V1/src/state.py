"""
AI Resume Tailor — Graph State Schema

All LangGraph nodes read from and write to this state.
The full source bank is passed in at invocation; nodes never load files directly.
"""

from typing import TypedDict


class ResumeState(TypedDict):
    # --- Inputs (set at invocation, never mutated) ---
    job_description_raw: str
    source_bank: dict  # full source_bank.json contents

    # --- Parsed JD (Node 1 output) ---
    parsed_jd: dict  # required_skills, nice_to_have_skills, key_responsibilities, keywords, seniority

    # --- Job selection (Node 1.5 output) ---
    confirmed_entries: list[str]  # list of entry IDs confirmed for this resume
    user_overrides: dict  # user-added/removed entries; empty dict in Phase 1 CLI

    # --- Bullet selection (Node 2 output) ---
    selected_content: list[dict]  # chosen entries + bullets (verbatim from bank)

    # --- AI suggestions (Node 2.5 output) ---
    ai_suggestions: list[dict]  # proposed alternative phrasings; not used in LaTeX in Phase 1

    # --- LaTeX / compilation (Nodes 3–4 output) ---
    latex_source: str
    pdf_path: str | None
    page_count: int | None

    # --- QA / retry (Node 5) ---
    qa_feedback: str | None  # critique from QA node; None if passing
    retry_count: int

    # --- Logging ---
    status: str  # short human-readable status updated by each node; forwarded to console
