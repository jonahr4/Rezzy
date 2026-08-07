"""
Node 2 — Bullet Selector

Calls the LLM once PER ENTRY to pick the best 3-4 bullets for that entry.
This per-entry architecture guarantees all confirmed entries get bullets —
the model can't silently drop entries it deems "less relevant."

If qa_feedback is present (retry loop), incorporates that feedback.
"""

import json
from src.llm import chat
from src.trace import log_step

# Called once per entry — focused, reliable, impossible to skip entries
SYSTEM_PROMPT = """You are a resume bullet point expert with deep knowledge of ATS (Applicant Tracking System) best practices. For a single career entry, pick the best bullet points from the bank that are most relevant to the target job description.

You will receive:
1. The parsed job description (skills, keywords, responsibilities)
2. ONE career entry with its full bullet bank
3. (Optional) QA feedback — if it says "too long", use fewer bullets

CRITICAL: You MUST return selected bullets for this entry — never return an empty list.

--- ATS BEST PRACTICES (use these as scoring criteria) ---

BULLET COUNT TARGETS (for a 1-page resume):
- Total across ALL entries: aim for 15-18 bullets
- Most recent/relevant job: 4-5 bullets
- Other jobs: 3-4 bullets
- Most recent/relevant project: 3 bullets
- Other projects: 2-3 bullets
- NEVER fewer than 2 bullets per entry
- If QA says "too long" or page overflow, drop to the lower end of each range
- STRONGLY prefer concise 1-line bullets (15-22 words). Fewer long bullets wastes page space.

BULLET QUALITY — rank candidates by these criteria:
1. METRICS: Does it contain a specific number, percentage, user count, scale indicator? ("70M+ fans", "80+ tests", "50% faster") — highest priority
2. ACTION VERB: Does it start with a strong verb? (Engineered, Architected, Built, Deployed, Reduced, Scaled, Automated, Spearheaded) — required
3. TECHNOLOGY MATCH: Does it name specific tools/languages from the JD? Exact matches beat synonyms. — high priority
4. LENGTH: Ideal is 15-22 words (fits 1 line). Bullets > 30 words are penalized because they wrap and waste page space.
5. XYZ STRUCTURE: "[Action verb] + [what you did] + [metric/scale] + [technology]" — Google's gold standard

REJECT bullets that:
- Start with "Responsible for", "Helped", "Worked on", "Was involved in", "Assisted with"
- Are vague with no specific technology or metric
- Duplicate the same achievement as another selected bullet
- Exceed 30 words — prefer two concise bullets over one long one

KEYWORD STRATEGY:
- Prefer bullets that mirror EXACT terminology from the JD (not synonyms)
- Each bullet should naturally include 1-2 JD keywords in context
- Skills section handles keyword density; bullets provide proof-in-context

Return a JSON object:
{
  "selected_bullets": [
    {
      "id": "bullet_id_from_bank",
      "text": "exact bullet text from bank",
      "reason": "why this matches the JD — cite the specific metric, verb, or keyword"
    }
  ]
}

Return ONLY valid JSON."""


def _select_bullets_for_entry(entry: dict, parsed_jd: dict, qa_feedback: str | None) -> list[dict]:
    """Call the LLM to pick bullets for a single entry. Returns list of selected bullet dicts."""
    user_payload = {
        "parsed_jd": parsed_jd,
        "entry": {
            "entry_id": entry["id"],
            "type": entry["type"],
            "title": entry["title"],
            "company": entry.get("company"),
            "bullets": [{"id": b["id"], "text": b["text"]} for b in entry["bullets"]],
        },
    }
    if qa_feedback:
        user_payload["qa_feedback"] = qa_feedback

    response = chat(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(user_payload, indent=2)},
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )

    result = json.loads(response)
    return result.get("selected_bullets", [])


def bullet_selector(state: dict) -> dict:
    """Select the best bullets for each confirmed entry (one LLM call per entry)."""
    parsed_jd = state["parsed_jd"]
    source_bank = state["source_bank"]
    confirmed_ids = state["confirmed_entries"]
    qa_feedback = state.get("qa_feedback")
    entries = source_bank["entries"]

    print("\n🎯 [Node 2: Bullet Selector] Selecting bullets for each entry...")
    if qa_feedback:
        print(f"   ⚠ QA feedback from previous attempt: {qa_feedback[:100]}...")

    enriched = []
    for eid in confirmed_ids:
        entry = next((e for e in entries if e["id"] == eid), None)
        if not entry:
            continue

        selected_bullets = _select_bullets_for_entry(entry, parsed_jd, qa_feedback)

        enriched.append({
            "entry_id": entry["id"],
            "type": entry["type"],
            "company": entry.get("company"),
            "title": entry["title"],
            "start_date": entry["start_date"],
            "end_date": entry.get("end_date", "Present"),
            "location": entry.get("location"),
            "tagline": entry.get("tagline", ""),
            "links": entry.get("links", {}),
            "selected_bullets": selected_bullets,
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
