"""
Node 1 — JD Parser

Takes raw job description text and extracts structured info via one LLM call.
Output: parsed_jd dict with skills, responsibilities, keywords, seniority.
"""

import json
from src.llm import chat
from src.trace import log_step

SYSTEM_PROMPT = """You are a job description parser. Extract structured information from the given job description.

Return a JSON object with EXACTLY these fields:
{
  "required_skills": ["skill1", "skill2", ...],
  "nice_to_have_skills": ["skill1", "skill2", ...],
  "key_responsibilities": ["responsibility1", "responsibility2", ...],
  "keywords": ["keyword1", "keyword2", ...],
  "seniority": "entry-level | mid-level | senior | staff",
  "company_name": "Company Name",
  "role_title": "Role Title"
}

Rules:
- required_skills: Skills explicitly listed as required or mandatory
- nice_to_have_skills: Skills listed as preferred, bonus, or nice-to-have
- key_responsibilities: Core duties and tasks described in the role
- keywords: Important domain terms, technologies, frameworks, and concepts mentioned
- seniority: Your best guess at seniority level based on the JD language
- company_name: The company name if mentioned
- role_title: The job title

Return ONLY valid JSON. No markdown, no explanation."""


def jd_parser(state: dict) -> dict:
    """Parse a raw job description into structured fields."""
    raw_jd = state["job_description_raw"]

    print("\n🔍 [Node 1: JD Parser] Parsing job description...")

    response = chat(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": raw_jd},
        ],
        temperature=0.1,
        response_format={"type": "json_object"},
    )

    parsed = json.loads(response)

    # Print summary
    n_req = len(parsed.get("required_skills", []))
    n_nice = len(parsed.get("nice_to_have_skills", []))
    n_kw = len(parsed.get("keywords", []))
    seniority = parsed.get("seniority", "unknown")
    company = parsed.get("company_name", "Unknown")
    title = parsed.get("role_title", "Unknown")
    print(f"   ✓ {company} — {title}")
    print(f"   ✓ {n_req} required skills, {n_nice} nice-to-have, {n_kw} keywords, seniority={seniority}")

    # Trace
    log_step(
        node="JD Parser",
        summary=f"Parsed JD for {company} — {title}",
        inputs_used={"jd_length": f"{len(raw_jd)} chars"},
        details={
            "company": company,
            "role_title": title,
            "seniority": seniority,
            "required_skills": parsed.get("required_skills", []),
            "nice_to_have_skills": parsed.get("nice_to_have_skills", []),
            "keywords": parsed.get("keywords", []),
            "key_responsibilities": parsed.get("key_responsibilities", []),
        },
        outputs={"parsed_jd": f"{n_req} required, {n_nice} nice-to-have, {n_kw} keywords"},
    )

    return {
        "parsed_jd": parsed,
        "status": f"[jd_parser] Parsed: {n_req} required skills, {n_kw} keywords",
    }

