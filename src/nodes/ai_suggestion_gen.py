"""
Node 2.5 — AI Suggestion Generator

Proposes alternative bullet phrasings grounded in entry summaries.
These are NOT used in the LaTeX output in Phase 1 — they're saved
to selection_report.json for the future split-screen review UI.
"""

import json
from src.llm import chat
from src.trace import log_step

SYSTEM_PROMPT = """You are a resume writing assistant. For each career entry, review the selected bullets and the entry's prose summary, then propose 1-2 alternative bullet phrasings that might better match the target job description.

Rules:
- Suggestions must be GROUNDED in the entry's summary or existing bullets — don't invent experience
- Suggestions should emphasize skills/keywords from the target JD that the selected bullets don't fully capture
- Each suggestion includes: the proposed text, a reason why it might be better, and which bullet(s) it could replace
- If the selected bullets already perfectly match the JD, return an empty suggestions list for that entry
- Keep suggestions concise and resume-ready (one line each, action verb start, quantify where possible)

Return a JSON object:
{
  "ai_suggestions": [
    {
      "entry_id": "job_mlb",
      "suggestions": [
        {
          "text": "proposed bullet text",
          "reason": "why this phrasing better matches the JD",
          "replaces_bullet_ids": ["job_mlb_b1"]
        }
      ]
    }
  ]
}

Return ONLY valid JSON."""


def ai_suggestion_gen(state: dict) -> dict:
    """Generate AI-proposed alternative bullet phrasings."""
    parsed_jd = state["parsed_jd"]
    source_bank = state["source_bank"]
    selected_content = state["selected_content"]
    entries = source_bank["entries"]

    print("\n💡 [Node 2.5: AI Suggestions] Generating alternative phrasings...")

    # Build context for each selected entry
    entries_for_llm = []
    for sel in selected_content:
        entry = next((e for e in entries if e["id"] == sel["entry_id"]), None)
        if not entry:
            continue
        entries_for_llm.append({
            "entry_id": sel["entry_id"],
            "summary": entry.get("summary", ""),
            "selected_bullets": sel["selected_bullets"],
        })

    user_msg = json.dumps({
        "parsed_jd": parsed_jd,
        "entries_with_selections": entries_for_llm,
    }, indent=2)

    response = chat(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        temperature=0.4,
        response_format={"type": "json_object"},
    )

    result = json.loads(response)
    ai_suggestions = result.get("ai_suggestions", [])

    # Print summary
    total = sum(len(s.get("suggestions", [])) for s in ai_suggestions)
    print(f"   ✓ Generated {total} suggestions across {len(ai_suggestions)} entries")
    for s in ai_suggestions:
        n = len(s.get("suggestions", []))
        if n > 0:
            print(f"     • {s['entry_id']}: {n} suggestions")

    # Trace
    suggestion_details = {}
    for s in ai_suggestions:
        slist = s.get("suggestions", [])
        if slist:
            suggestion_details[s["entry_id"]] = [
                {"text": sg["text"][:100], "reason": sg.get("reason", "")}
                for sg in slist
            ]

    log_step(
        node="AI Suggestion Gen",
        summary=f"Generated {total} alternative phrasings",
        details=suggestion_details,
        outputs={"total_suggestions": total},
    )

    return {
        "ai_suggestions": ai_suggestions,
        "status": f"[ai_suggestion_gen] {total} suggestions generated",
    }
