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
    education = source_bank.get("education", [])
    skills = source_bank.get("skills", [])

    # Split selected content into jobs and projects (preserving selection order)
    jobs = [s for s in selected_content if s["type"] == "job"]
    projects = [s for s in selected_content if s["type"] == "project"]

    # Group skills into categories for the template
    skill_categories = _categorize_skills(skills)

    # Render template
    env = _get_template_env()
    template = env.get_template("resume.tex.j2")
    latex_source = template.render(
        personal=personal,
        education=education,
        skill_categories=skill_categories,
        jobs=jobs,
        projects=projects,
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


def _categorize_skills(skills: list[str]) -> list[dict]:
    """Group skills into resume categories. Hardcoded for Phase 1."""
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
            result.append({"label": label, "items": matched})
            categorized.update(matched)

    # Catch anything not categorized
    uncategorized = [s for s in skills if s not in categorized]
    if uncategorized:
        result.append({"label": "Other", "items": uncategorized})

    return result
