# Product Vision — AI Resume Tailor

## The Problem

Tailoring a resume to a specific job posting is one of the highest-leverage activities in a job search, yet it's also one of the most tedious. People tend to fall into one of two failure modes:

1. **One-size-fits-all:** They maintain a single resume and blast it everywhere, leaving relevance points on the table.
2. **AI slop:** They paste their resume into ChatGPT with a job description and get back a technically-relevant but generically-worded document that no longer sounds like them — and that recruiters are increasingly learning to spot and penalize.

Both failure modes share a root cause: the person doesn't have a structured, persistent inventory of their career accomplishments to draw from, and existing tools either ignore this problem or "solve" it by replacing the user's voice entirely.

## The Core Philosophy: Your Voice First, AI Assists

AI Resume Tailor's differentiator is a layered approach to content:

1. **First: your words, selected and ranked.** The AI picks the strongest, most relevant bullets from your personal bank for the given job description. Your actual writing, chosen intelligently.
2. **Then: AI-proposed improvements, transparently shown.** The AI can also propose new or synthesized phrasings — drawn from the context of your source-of-truth prose summary — that might fit the role better than any single bullet you wrote. These are presented as opt-in suggestions, not forced substitutions.

The user always controls what ends up in the resume. The AI's job is to give you options and explain why, not to make the decision for you.

## The Tailoring Flow

When the user pastes a job description, the AI pipeline:

1. Parses the job description into structured requirements (skills, keywords, responsibilities, seniority level).
2. Selects which jobs and projects are most relevant to include.
3. Selects the strongest bullets from each included entry's oversupplied pool AND generates AI-proposed alternative/synthesized phrasings drawn from each entry's prose summary.
4. Presents the result in a **split-screen review UI**: original selected content on the left, AI suggestions highlighted with Grammarly-style inline accept/reject controls on the right.
5. Formats the accepted content into a polished, one-page LaTeX resume.
6. Reviews the output for page-fit and quality, looping back to trim if needed.

## The Split-Screen Suggestion UI

The review experience is modeled after Grammarly's suggestion workflow and VS Code's Copilot inline suggestions:

- **Left panel:** the resume as it would look using only your existing source-bank bullets (no AI edits).
- **Right panel:** the AI-proposed version, with changed/added phrases underlined or highlighted. Each suggestion shows:
  - A ✅ / ✗ accept/reject control
  - A short hover tooltip explaining why the AI made this suggestion (e.g., "contains keyword from job posting", "condenses two related points into one line")

This is intentionally transparent. The user knows exactly what the AI changed and why.

**Implementation approach (frontend, Phase 5):** Built on **TipTap** (headless rich text editor) with custom suggestion marks and **floating-ui** for popover positioning. No ready-made library covers the full use case out of the box; TipTap is the closest foundation. `react-diff-viewer` can power the side-by-side diff visualization layer.

## What the AI Can Propose (and What It Can't)

The AI suggestion layer has a deliberately constrained scope:

- ✅ **Select bullets from your bank** — always the primary output
- ✅ **Propose rephrased versions of your bullets** — drawing from the same job/project's prose summary and existing bullets, not hallucinating new experience
- ✅ **Propose condensed bullets** — if two bullets from the same job cover related points, the AI may suggest a single combined line. This is within-job only, never across jobs.
- ✅ **Propose bullets grounded in your prose summary** — if your bank's summary for a role describes something not yet captured in any bullet, the AI can suggest a new bullet derived from it
- ❌ **Cannot invent experience you haven't described** — all AI suggestions must be traceable back to content in your source bank or summary
- ❌ **Cannot rewrite bullets marked "verbatim lock"** — those appear in the left panel only and are never proposed as suggestions

## The Source-of-Truth / Bullet Bank Concept

The bullet bank is the heart of the product. Each entry (job, internship, project) contains:

- **Metadata:** company/org name, role title, dates, location.
- **Prose summary:** a paragraph describing what the role or project was and what you did. This is the "ground truth" the AI draws from when generating suggestions. It can be user-written or AI-generated (from your existing bullets), and the user always edits it to make it accurate.
- **Bullet pool:** 10–15+ resume-style accomplishment bullets per entry, varying in focus (technical depth, scale/impact, leadership, specific technologies). This deliberate over-supply is what makes intelligent selection possible.
- **Skills:** a tagged list of skills exercised in this role.
- **Pinned flag:** the user can pin certain entries to always be included regardless of relevance scoring.

The bank grows over time as the user adds new roles, refines existing bullets, and experiments with different phrasings. This creates a **compounding data moat**: the more a user invests in their bank, the more valuable and differentiated every tailored output becomes, and the harder it is to switch to a competitor that doesn't have this history.

## Source-of-Truth Onboarding Flow (Stretch Goal)

A guided onboarding flow for adding a new career entry:

1. **Describe the role:** The app prompts "What did you do at this job?" — the user free-writes a description. This becomes the initial prose summary.
2. **Add existing bullets:** "Do you have any existing resume bullet points for this role?" — the user pastes them in.
3. **AI fills gaps:** Based on the summary and any existing bullets, the AI suggests additional bullets the user might not have written yet, and refines the prose summary to be clean and accurate.
4. The user curates and accepts — the result is a seeded entry in the source bank, ready for tailoring.

This onboarding flow is a stretch goal, not a Phase 1 priority. The data shape (prose summary field) is seeded in Phase 1 to avoid a rework.

## Job Tracker (Future Feature)

When a user tailors a resume for a specific job, the app will automatically create a **job application record** tracking:

- Company name and logo (fetched from the domain in the JD)
- The job title and description (saved verbatim)
- The tailored resume PDF and the selection report for that application
- Application status (saved, applied, interviewing, offer, rejected) — Kanban-style
- Generated cover letter (when cover letter generation is added)

Think of it like Simplify's application tracker, but seeded automatically from the tailoring flow — no manual entry required. This is a frontend/Phase 5 feature and is purely documented here so it isn't forgotten.

## Future User Controls

The full product will give users fine-grained control over the tailoring process:

- **Pinning:** force-include specific jobs/projects regardless of AI relevance ranking.
- **Verbatim lock:** mark specific bullets as "do not propose changes" — the AI can select or skip them, but cannot rephrase them. They appear on the left panel only.
- **Full-auto vs. semi-manual:** choose between a single-click fully-automated tailoring pass and the interactive split-screen review flow.

## Retention & Data Moat Hypothesis

The product's retention thesis is that the bullet bank functions as a **career CRM** — a living document that happens to output resumes. Users who invest time curating their bank get better tailored output over time, creating switching costs that grow with usage. This is fundamentally different from tools that treat each generation as a stateless transaction.

## Business Model (Context)

Freemium: approximately 5 free tailored generations, then a paid tier (~$9–15/month or a lifetime option). Per-generation LLM cost is a fraction of a cent, so margins are strong at scale. The free tier is generous enough to demonstrate value; the paid tier unlocks unlimited generations and (eventually) advanced features like bulk tailoring and analytics.
