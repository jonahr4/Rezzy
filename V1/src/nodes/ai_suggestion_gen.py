"""
Node 2.5 — AI Suggestion Generator

Proposes alternative bullet phrasings grounded in entry summaries.
These are NOT used in the LaTeX output in Phase 1 — they're saved
to selection_report.json for the future split-screen review UI.
"""

import json
import datetime
from src.llm import chat
from src.trace import log_step

SYSTEM_PROMPT = f"""You are a senior resume coach with deep expertise in ATS (Applicant Tracking System) optimization. For each career entry, review the selected bullets and propose 1-2 IMPROVED alternative phrasings that would score higher with both ATS systems and human recruiters.

The current date is {datetime.date.today().isoformat()}. Keep this in mind when making suggestions about dates (e.g. anything past this date is in the future).

ATS SCORING CRITERIA — your suggestions should improve on these:
1. XYZ FORMULA (Impact-Driven): "Accomplished [X] as measured by [Y], by doing [Z]". Move away from a "list of tasks" toward a narrative of specific impact and technical depth.
2. ACTION VERB: Start with a powerful, past-tense verb (e.g., Architected, Optimized, Spearheaded, Automated, Migrated, Hardened, Delivered).
3. QUANTIFIABLE METRICS: Include specific numbers, percentages, time saved, or scale (e.g., "by 40%", "from 1.2s to 180ms", "serving 1M+ users"). If no business metric exists, use technical metrics (latency, scale, test coverage), if there is evidence of those accomplishments and they are not already mentioned.
4. TECHNOLOGY MATCH: Highlight specific tools/languages from the JD ONLY if they are explicitly mentioned or heavily implied by the candidate's existing summary or bullets. Integrate them naturally into the 'Z' (Method) part of the bullet.
5. CONCISENESS & LENGTH: 15-25 words ideal. Cut filler words and vague fluff. If the original bullet is long or appends generic phrases (like "to enhance workflows"), your suggestion MUST shorten it and make it punchier. Never suggest bullets over 35 words.

REJECT / DO NOT SUGGEST:
- THE "TACK-ON" ANTI-PATTERN: Never append vague, generic impact phrases at the end of a bullet just to stuff keywords (e.g., ", adhering to DevOps best practices", ", for robust software solutions", ", enhancing data models"). This is a massive red flag. If you add a keyword, you MUST weave it naturally into the actual action or method of the bullet. If you cannot do this naturally, DO NOT add it.
- Bullets starting with "Responsible for", "Helped", "Worked on", "Was involved in"  
- Bullets longer than 35 words
- ANY fabricated or false experience. Do NOT arbitrarily append tools (like "in Python") to an action just to match JD keywords if there is no factual reason to assume the candidate used that tool based on their context.

Rules:
- Suggestions must be STRICTLY FACTUAL and GROUNDED in the entry's summary or existing bullets. Do not fabricate metrics, skills, or experience. 
- If a suggestion isn't necessary, don't suggest it. We don't need to force suggestions; they should only be in place to enhance a bullet point that can be more effective.
- The goal is to increase ATS results and improve resume wording, making the experience fit the JD better purely by using context from other bullets and the summary.
- If selected bullets already perfectly match the ATS criteria, return empty suggestions for that entry.
- Each suggestion must explain which ATS criterion it improves (metrics/verb/keyword/structure).
- VARIETY: Do NOT use the same starting action verb more than once across an entry's suggestions. Ensure a diverse vocabulary of strong action verbs across all your suggestions.

Return a JSON object:
{{
  "ai_suggestions": [
    {{
      "entry_id": "job_mlb",
      "suggestions": [
        {{
          "text": "proposed bullet text — must follow XYZ formula",
          "reason": "A short, unique, and specific explanation of exactly how this edit improves the bullet. Do not use a repetitive template like 'improves XYZ structure' for every bullet. Be specific to the context.",
          "replaces_bullet_ids": ["job_mlb_b1"]
        }}
      ]
    }}
  ]
}}

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
