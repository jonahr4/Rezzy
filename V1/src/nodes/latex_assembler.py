"""
Node 3 — LaTeX Assembler (deterministic, no LLM)

Takes selected_content + source_bank personal info and renders
a Jinja2 LaTeX template into a complete .tex source string.
"""

import re
import jinja2
from pathlib import Path
from src.trace import log_step


# LaTeX special chars that need escaping
_LATEX_ESCAPE_MAP = {
    '&': r'\&',
    '%': r'\%',
    '$': r'\$',
    '#': r'\#',
    '_': r'\_',
    '{': r'\{',
    '}': r'\}',
    '~': r'\textasciitilde{}',
    '^': r'\textasciicircum{}',
}
_LATEX_ESCAPE_RE = re.compile('|'.join(re.escape(k) for k in _LATEX_ESCAPE_MAP.keys()))


def _escape_latex(text: str) -> str:
    """Escape LaTeX special characters in plain text."""
    return _LATEX_ESCAPE_RE.sub(lambda m: _LATEX_ESCAPE_MAP[m.group()], text)


def _get_template_env() -> jinja2.Environment:
    """Create a Jinja2 environment with LaTeX-safe delimiters."""
    template_dir = Path(__file__).parent.parent / "templates"
    env = jinja2.Environment(
        block_start_string='(%',
        block_end_string='%)',
        variable_start_string='((',
        variable_end_string='))',
        comment_start_string='(#',
        comment_end_string='#)',
        loader=jinja2.FileSystemLoader(str(template_dir)),
        autoescape=False,
        trim_blocks=True,
        lstrip_blocks=True,
    )
    env.filters['latex'] = _escape_latex
    return env


def latex_assembler(state: dict) -> dict:
    """Render the LaTeX resume from selected content."""
    source_bank = state["source_bank"]
    selected_content = state["selected_content"]

    print("\n📄 [Node 3: LaTeX Assembler] Rendering template...")

    personal = source_bank["personal"]
    
    # Strip protocols so template href formatting works correctly
    for field in ['website', 'linkedin', 'github']:
        if personal.get(field):
            personal[field] = personal[field].replace('https://', '').replace('http://', '').strip('/')
            
    education = source_bank.get("education", [])
    skills = source_bank.get("skills", [])

    # Split selected content into jobs and projects (preserving user-arranged order)
    # Filter out empty/placeholder bullets that would render as lone dots in LaTeX
    def _clean_bullets(entries):
        cleaned = []
        for e in entries:
            e["selected_bullets"] = [
                b for b in e["selected_bullets"]
                if b.get("text", "").strip()
                and b["text"].strip() != "New bullet point — click to edit"
            ]
            if len(e["selected_bullets"]) > 0:
                cleaned.append(e)
        return cleaned

    jobs = _clean_bullets([s for s in selected_content if s["type"] == "job"])
    projects = _clean_bullets([s for s in selected_content if s["type"] == "project"])

    # Group skills into categories for the template
    # Use user-arranged skill_rows from the UI if available, else fall back to hardcoded categories
    if "skill_rows" in state and state["skill_rows"]:
        # Convert from UI format to template format (they're already {label, items})
        skill_categories = [
            {"label": r["label"].replace("&", "\\&"), "items": r["items"]}
            for r in state["skill_rows"]
            if r["items"]  # skip empty rows
        ]
    else:
        skills = source_bank.get("skills", [])
        parsed_jd = state.get("parsed_jd") or {}
        jd_skills = parsed_jd.get("required_skills") or parsed_jd.get("skills") or []
        skill_categories = _categorize_skills(skills, jd_skills)

    # Determine spacing tier based on retry count
    # Tier 0 = default spacing, Tier 1 = tighter, Tier 2 = maximum compression
    retry_count = state.get("retry_count", 0)
    spacing_tier = min(retry_count, 2)  # 0, 1, or 2
    if spacing_tier > 0:
        print(f"   ⚡ Spacing tier {spacing_tier} (retry {retry_count}) — tightening layout")

    # Render template
    env = _get_template_env()
    template = env.get_template("resume.tex.j2")
    latex_source = template.render(
        personal=personal,
        education=education,
        skill_categories=skill_categories,
        jobs=jobs,
        projects=projects,
        spacing_tier=spacing_tier,
        escape=_escape_latex,
    )

    total_bullets = sum(len(s["selected_bullets"]) for s in selected_content)
    print(f"   ✓ Rendered: {len(jobs)} jobs, {len(projects)} projects, {total_bullets} bullets")
    print(f"   ✓ LaTeX source: {len(latex_source)} chars")

    # Trace
    log_step(
        node="LaTeX Assembler",
        summary=f"Rendered {len(jobs)} jobs, {len(projects)} projects, {total_bullets} bullets",
        inputs_used={
            "skill_categories": [c["label"] for c in skill_categories],
        },
        outputs={
            "latex_source_length": f"{len(latex_source)} chars",
            "jobs": [j["company"] for j in jobs],
            "projects": [p["title"] for p in projects],
        },
    )

    return {
        "latex_source": latex_source,
        "status": f"[latex_assembler] Rendered {total_bullets} bullets",
    }


def _categorize_skills(skills: list[str], jd_skills: list[str] = None) -> list[dict]:
    """Group skills into resume categories, prioritizing JD matches and capping line length."""
    jd_skills_lower = [s.lower() for s in (jd_skills or [])]

    def _sort_and_limit(matched: list[str], target_len: int = 80) -> list[str]:
        # Sort so JD matching skills appear first
        sorted_skills = sorted(matched, key=lambda x: 0 if x.lower() in jd_skills_lower else 1)
        selected = []
        current_len = 0
        for s in sorted_skills:
            selected.append(s)
            current_len += len(s) + 2  # account for ", "
            if current_len >= target_len:
                break
        return selected

    categories = {
        "Languages": [
            "Java", "Python", "C/C++", "JavaScript", "TypeScript",
            "SQL", "HTML/CSS", "Kotlin", "Swift", "OCaml",
        ],
        "Frameworks \\& Libraries": [
            "React", "React Native", "Next.js", "Node.js", "Express.js",
            "Expo", "TailwindCSS", "Vite", "Mongoose", "Flask", "Jetpack Compose",
        ],
        "Testing \\& DevOps": [
            "Playwright", "Cypress", "Selenium", "Jest", "Maestro",
            "GitHub Actions", "Azure DevOps", "Git", "Jira", "Confluence",
            "CI/CD", "EAS Build",
        ],
        "Cloud \\& Databases": [
            "AWS", "Microsoft Azure", "Azure Blob Storage", "Azure OpenAI",
            "Firebase", "Firestore", "MongoDB Atlas", "PostgreSQL",
            "Supabase", "Vercel", "DigitalOcean", "Neon",
        ],
        "AI/ML": [
            "PyTorch", "scikit-learn", "pandas", "NumPy", "Matplotlib",
            "OpenAI API", "Claude API", "RAG", "prompt engineering",
            "embeddings", "LLM ranking",
        ],
    }

    result = []
    categorized = set()
    for label, known in categories.items():
        matched = [s for s in skills if s in known]
        if matched:
            selected = _sort_and_limit(matched)
            result.append({"label": label, "items": selected})
            categorized.update(matched)  # mark all known as categorized so they don't leak into Other

    # Catch anything not categorized
    uncategorized = [s for s in skills if s not in categorized]
    if uncategorized:
        selected = _sort_and_limit(uncategorized)
        result.append({"label": "Other", "items": selected})

    return result
