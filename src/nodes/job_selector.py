"""
Node 1.5 — Job Selector

Takes parsed JD + full source bank, uses LLM to rank which jobs/projects
should appear on the resume. Pinned entries are always included.

Phase 1: auto-selects and prints to console (no human pause).
Phase 5: this becomes an interactive checkpoint.
"""

import json
from src.llm import chat
from src.trace import log_step

SYSTEM_PROMPT = """You are a resume strategist. Given a parsed job description and a list of career entries (jobs and projects), select which entries should appear on a one-page tailored resume.

You will receive:
1. The parsed job description (skills, responsibilities, keywords, seniority)
2. A list of career entries with their IDs, titles, companies, dates, summaries, and skills

PAGE BUDGET — use this math to select ENOUGH entries to fill the page:
- A one-page resume body holds roughly 580-650 words of content (after header ~30w, education ~50w, skills ~80w)
- Each JOB entry uses roughly: header (15w) + 3-4 bullets × 28w = 100-125 words
- Each PROJECT entry uses roughly: header (25w) + 3-4 bullets × 28w = 110-135 words
- Target: 2-3 JOBS + 3-4 PROJECTS = 5-6 total entries to fill the page properly
- Under-selecting leaves embarrassing whitespace. When in doubt, include more.

Rules:
- Select 5-6 entries total. AIM for 2-3 jobs AND 3-4 projects.
- Entries marked "pinned": true MUST always be included (they don't count against your minimum)
- Prefer recent entries over older ones when relevance is similar
- Consider skill overlap, responsibility match, and domain relevance
- For each selected entry, provide a one-line rationale
- Also list entries you considered but excluded, with a brief reason

Return a JSON object:
{
  "selected_entry_ids": ["id1", "id2", ...],
  "rationales": {
    "id1": "reason this entry is relevant",
    "id2": "reason..."
  },
  "excluded": {
    "id3": "reason for exclusion",
    "id4": "reason..."
  }
}

Return ONLY valid JSON."""


def job_selector(state: dict) -> dict:
    """Select which entries to include on the resume."""
    parsed_jd = state["parsed_jd"]
    source_bank = state["source_bank"]
    entries = source_bank["entries"]

    print("\n📋 [Node 1.5: Job Selector] Selecting entries for resume...")

    # Build entry summaries for the LLM
    entry_summaries = []
    for e in entries:
        entry_summaries.append({
            "id": e["id"],
            "type": e["type"],
            "title": e["title"],
            "company": e.get("company"),
            "start_date": e["start_date"],
            "end_date": e.get("end_date", "Present"),
            "pinned": e["pinned"],
            "summary": e.get("summary", "")[:300],  # truncate for token efficiency
            "skills": e.get("skills", []),
            "bullet_count": len(e["bullets"]),
        })

    user_msg = json.dumps({
        "parsed_jd": parsed_jd,
        "entries": entry_summaries,
    }, indent=2)

    response = chat(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )

    result = json.loads(response)
    selected_ids = result.get("selected_entry_ids", [])
    rationales = result.get("rationales", {})

    # Ensure pinned entries are included
    pinned_ids = [e["id"] for e in entries if e["pinned"]]
    for pid in pinned_ids:
        if pid not in selected_ids:
            selected_ids.insert(0, pid)
            rationales[pid] = "Pinned — always included"

    # Print selections
    print(f"   ✓ Selected {len(selected_ids)} entries:")
    for eid in selected_ids:
        entry = next((e for e in entries if e["id"] == eid), None)
        name = entry["company"] or entry["title"] if entry else eid
        pin_tag = " 📌" if entry and entry["pinned"] else ""
        reason = rationales.get(eid, "")
        print(f"     • {name}{pin_tag} — {reason}")

    # Print exclusions
    excluded = result.get("excluded", {})
    if excluded:
        print(f"   ✗ Excluded:")
        for eid, reason in excluded.items():
            entry = next((e for e in entries if e["id"] == eid), None)
            name = entry["company"] or entry["title"] if entry else eid
            print(f"     • {name} — {reason}")

    # Trace
    log_step(
        node="Job Selector",
        summary=f"Selected {len(selected_ids)} entries for resume",
        inputs_used={"total_entries": len(entries), "pinned": pinned_ids},
        details={
            "selected": rationales,
            "excluded": excluded,
        },
        outputs={"confirmed_entry_ids": selected_ids},
    )

    return {
        "confirmed_entries": selected_ids,
        "user_overrides": {},  # empty in Phase 1
        "status": f"[job_selector] Selected {len(selected_ids)} entries",
    }
