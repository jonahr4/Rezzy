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
  ],
  "excluded_bullets": [
    {
      "id": "bullet_id_from_bank",
      "reason": "brief reason why this bullet was NOT selected"
    }
  ]
}

CRITICAL: You MUST provide a reason in `excluded_bullets` for EVERY SINGLE bullet that you did not select. Do not skip any.
Return ONLY valid JSON."""


def _select_bullets_for_entry(entry: dict, parsed_jd: dict, qa_feedback: str | None) -> dict:
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
    return {
        "selected": result.get("selected_bullets", []),
        "excluded": result.get("excluded_bullets", [])
    }


def bullet_selector(state: dict) -> dict:
    """Select the best bullets for each confirmed entry (one LLM call per entry)."""
    parsed_jd = state["parsed_jd"]
    source_bank = state["source_bank"]
    confirmed_ids = state["confirmed_entries"]
    qa_feedback = state.get("qa_feedback")
    retry_count = state.get("retry_count", 0)
    entries = source_bank["entries"]

    print("\n🎯 [Node 2: Bullet Selector] Selecting bullets for each entry...")
    if qa_feedback:
        print(f"   ⚠ QA feedback (retry {retry_count}/3): {qa_feedback[:120]}...")
    
    # On retries, prepend explicit bullet count caps to qa_feedback
    if retry_count >= 2:
        cap_msg = (
            "HARD LIMIT: You are on retry 3 — maximum compression. "
            "Return AT MOST 2 bullets per entry. Prefer the shortest bullets (under 20 words). "
            "If you still exceed 1 page, the pipeline will fail. "
        )
        qa_feedback = cap_msg + (qa_feedback or "")
    elif retry_count >= 1:
        cap_msg = (
            "IMPORTANT: This is a retry — the previous selection was too long. "
            "Return AT MOST 3 bullets per job entry and 2 per project entry. "
            "Strongly prefer short 1-line bullets (under 22 words). "
        )
        qa_feedback = cap_msg + (qa_feedback or "")

    enriched = []
    for eid in confirmed_ids:
        entry = next((e for e in entries if e["id"] == eid), None)
        if not entry:
            continue

        # Bypass LLM if bullet bank is completely empty
        if not entry.get("bullets"):
            print(f"   ⚠️ Entry {entry.get('title')} has no bullets. Bypassing AI generation.")
            bullet_selection = {"selected": [], "excluded": []}
        else:
            bullet_selection = _select_bullets_for_entry(entry, parsed_jd, qa_feedback)

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
            "selected_bullets": bullet_selection.get("selected", []),
            "excluded_bullets": bullet_selection.get("excluded", []),
        })

    # Sort entries reverse-chronologically (most recent first) as default order
    import calendar as _cal
    def _parse_date(d):
        if not d or d.lower() in ("present", "current"):
            return (9999, 12)
        parts = d.strip().replace(',', '').split()
        if len(parts) == 1:
            try: return (int(parts[0]), 12)
            except ValueError: return (0, 0)
        elif len(parts) >= 2:
            m_str = parts[0][:3].capitalize()
            try:
                m = list(_cal.month_abbr).index(m_str)
                return (int(parts[-1]), m)
            except (ValueError, IndexError):
                pass
        return (0, 0)
    enriched.sort(key=lambda s: _parse_date(s.get("end_date", "")), reverse=True)

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
