"""
Node 2 — Bullet Selector

For each confirmed entry, selects the best 2-4 bullets from the bullet bank
based on relevance to the parsed JD. Each bullet gets a reason.

If qa_feedback is present (retry loop), incorporates that feedback.
"""

import json
from src.llm import chat
from src.trace import log_step

SYSTEM_PROMPT = """You are a resume bullet point selector. For each career entry, choose the 2-4 BEST bullet points from the available options that are most relevant to the target job description.

You will receive:
1. The parsed job description (skills, responsibilities, keywords)
2. A list of confirmed entries, each with their full bullet bank
3. (Optional) QA feedback from a previous attempt to fix

Rules:
- Select 2-4 bullets per entry. Fewer for less relevant entries, more for highly relevant ones.
- Choose bullets that BEST match the target JD's required skills, responsibilities, and keywords
- When multiple bullets say similar things (variants), pick the BEST phrasing — don't pick duplicates
- Each selected bullet needs a "reason" (1 sentence explaining why it was chosen for this JD)
- The total resume must fit on ONE page. For jobs, aim for 3-4 bullets each. For projects, aim for 2-3.
- If QA feedback is provided, adjust your selections based on that feedback (usually means "pick fewer bullets")

Return a JSON object:
{
  "selected_content": [
    {
      "entry_id": "job_mlb",
      "selected_bullets": [
        {
          "id": "job_mlb_b1",
          "text": "exact bullet text from bank",
          "reason": "why this bullet matches the JD"
        }
      ]
    }
  ]
}

Return ONLY valid JSON."""


def bullet_selector(state: dict) -> dict:
    """Select the best bullets for each confirmed entry."""
    parsed_jd = state["parsed_jd"]
    source_bank = state["source_bank"]
    confirmed_ids = state["confirmed_entries"]
    qa_feedback = state.get("qa_feedback")
    entries = source_bank["entries"]

    print("\n🎯 [Node 2: Bullet Selector] Selecting bullets for each entry...")

    # Build the entries with their full bullet banks
    entries_for_llm = []
    for eid in confirmed_ids:
        entry = next((e for e in entries if e["id"] == eid), None)
        if not entry:
            continue
        entries_for_llm.append({
            "entry_id": entry["id"],
            "type": entry["type"],
            "title": entry["title"],
            "company": entry.get("company"),
            "bullets": [{"id": b["id"], "text": b["text"]} for b in entry["bullets"]],
        })

    user_msg = {
        "parsed_jd": parsed_jd,
        "confirmed_entries": entries_for_llm,
    }
    if qa_feedback:
        user_msg["qa_feedback"] = qa_feedback
        print(f"   ⚠ QA feedback from previous attempt: {qa_feedback[:100]}...")

    response = chat(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(user_msg, indent=2)},
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )

    result = json.loads(response)
    selected_content = result.get("selected_content", [])

    # Enrich selected_content with entry metadata for the assembler
    enriched = []
    for sel in selected_content:
        entry = next((e for e in entries if e["id"] == sel["entry_id"]), None)
        if not entry:
            continue
        enriched.append({
            "entry_id": sel["entry_id"],
            "type": entry["type"],
            "company": entry.get("company"),
            "title": entry["title"],
            "start_date": entry["start_date"],
            "end_date": entry.get("end_date", "Present"),
            "location": entry.get("location"),
            "tagline": entry.get("tagline", ""),
            "links": entry.get("links", {}),
            "selected_bullets": sel.get("selected_bullets", []),
        })

    # Print summary
    total_bullets = sum(len(s["selected_bullets"]) for s in enriched)
    print(f"   ✓ Selected {total_bullets} bullets across {len(enriched)} entries:")
    for s in enriched:
        name = s["company"] or s["title"]
        n = len(s["selected_bullets"])
        print(f"     • {name}: {n} bullets")

    # Trace
    bullet_details = {}
    for s in enriched:
        name = s["company"] or s["title"]
        bullet_details[name] = [
            {"id": b["id"], "text": b["text"][:100], "reason": b.get("reason", "")}
            for b in s["selected_bullets"]
        ]

    log_step(
        node="Bullet Selector",
        summary=f"Selected {total_bullets} bullets across {len(enriched)} entries",
        inputs_used={
            "confirmed_entries": [s["entry_id"] for s in enriched],
            "qa_feedback": qa_feedback or "(none)",
        },
        details=bullet_details,
        outputs={"total_bullets": total_bullets},
    )

    return {
        "selected_content": enriched,
        "status": f"[bullet_selector] {total_bullets} bullets across {len(enriched)} entries",
    }
