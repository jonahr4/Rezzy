import { readFileSync } from "fs";
import { join } from "path";
import type { SourceBank } from "@/lib/types";
import EntryCard from "@/components/EntryCard";

async function getSourceBank(): Promise<SourceBank> {
  const path = join(process.cwd(), "..", "data", "source_bank.json");
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw);
}

function categorizeSkills(skills: string[]) {
  const langs = ["Python", "TypeScript", "JavaScript", "Java", "Go", "Swift", "Kotlin", "SQL", "HTML", "CSS", "Dart", "R"];
  const frameworks = ["React", "Next.js", "React Native", "Flutter", "Flask", "FastAPI", "Spring Boot", "Node.js", "Express", "Redux", "LangChain", "LangGraph"];
  const testing = ["Jest", "Pytest", "Selenium", "XCTest", "Appium", "Detox", "Playwright", "GitHub Actions", "CI/CD", "Docker", "Kubernetes"];
  const cloud = ["Firebase", "Supabase", "PostgreSQL", "MongoDB", "Redis", "ClickHouse", "AWS", "GCP", "Vercel"];
  const aiml = ["OpenAI", "LangChain", "LangGraph", "Pinecone", "Pandas", "NumPy", "scikit-learn", "TensorFlow", "PyTorch"];

  const groups = [
    { label: "Languages", items: skills.filter((s) => langs.includes(s)) },
    { label: "Frameworks & Libraries", items: skills.filter((s) => frameworks.includes(s)) },
    { label: "Testing & DevOps", items: skills.filter((s) => testing.includes(s)) },
    { label: "Cloud & Databases", items: skills.filter((s) => cloud.includes(s)) },
    { label: "AI / ML & Data", items: skills.filter((s) => aiml.includes(s)) },
  ];

  const categorized = new Set(groups.flatMap((g) => g.items));
  const uncategorized = skills.filter((s) => !categorized.has(s));
  if (uncategorized.length) groups.push({ label: "Other", items: uncategorized });

  return groups.filter((g) => g.items.length > 0);
}

export default async function SourceBankPage() {
  const bank = await getSourceBank();
  const { personal, skills, education, entries } = bank;
  const skillGroups = categorizeSkills(skills);
  const nameParts = personal.name.split(" ");

  const contacts = [
    personal.email,
    personal.phone,
    personal.location,
    personal.linkedin && `linkedin.com/in/${personal.linkedin}`,
    personal.github && `github.com/${personal.github}`,
    personal.website,
  ].filter(Boolean) as string[];

  const jobs = entries.filter((e) => e.type === "job");
  const projects = entries.filter((e) => e.type === "project");
  const totalBullets = entries.reduce((sum, e) => sum + e.bullets.length, 0);

  return (
    <div className="container">
      {/* HERO */}
      <section className="grid-12 section" id="hero-section">
        <div className="sidebar sidebar-border">
          <div className="sidebar-label">
            <span className="label-icon" />
            <span className="label-text">Source Bank</span>
          </div>
        </div>
        <div className="main-col">
          <div className="hero">
            <h1 className="hero-headline">
              {nameParts.slice(0, -1).join(" ")}{" "}
              <span className="accent">{nameParts[nameParts.length - 1]}</span>
            </h1>
            <div className="hero-sub">
              <p className="hero-desc">
                Your complete career data bank. Every experience, every bullet
                variant, every skill — oversupplied and ready for AI-powered
                tailoring.
              </p>
              <div className="hero-stats">
                <div className="stat">
                  <span className="stat-num">{entries.length}</span>
                  <span className="stat-label">Entries</span>
                </div>
                <div className="stat">
                  <span className="stat-num">{totalBullets}</span>
                  <span className="stat-label">Bullets</span>
                </div>
                <div className="stat">
                  <span className="stat-num">{skills.length}</span>
                  <span className="stat-label">Skills</span>
                </div>
              </div>
            </div>
            <div className="contact-row">
              {contacts.map((c, i) => (
                <span key={i} className="contact-item">{c}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SKILLS */}
      <section className="grid-12 section" id="skills">
        <div className="sidebar sidebar-border">
          <div className="sidebar-label">
            <span className="label-icon" />
            <span className="label-text">Skills</span>
          </div>
        </div>
        <div className="main-col">
          <div className="skills-grid">
            {skillGroups.map((group) => (
              <div key={group.label} className="skill-category">
                <div className="skill-cat-label">{group.label}</div>
                <div className="skill-pills">
                  {group.items.map((s) => (
                    <span key={s} className="skill-pill">{s}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EDUCATION */}
      <section className="grid-12 section" id="education">
        <div className="sidebar sidebar-border">
          <div className="sidebar-label">
            <span className="label-icon" />
            <span className="label-text">Education</span>
          </div>
        </div>
        <div className="main-col">
          <div className="education-list">
            {education.map((edu, i) => (
              <div key={i} className="edu-item">
                <div className="edu-school">{edu.institution}</div>
                <div className="edu-degree">
                  {edu.degree} in {edu.field}
                </div>
                <div className="edu-meta">
                  <span>Graduating {edu.graduation}</span>
                  {edu.gpa && <span>GPA {edu.gpa}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ENTRIES */}
      <section className="grid-12 section" id="entries">
        <div className="sidebar sidebar-border">
          <div className="sidebar-label">
            <span className="label-icon" />
            <span className="label-text">
              Entries — {jobs.length}j / {projects.length}p
            </span>
          </div>
        </div>
        <div className="main-col">
          <div className="entries-list">
            {entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
