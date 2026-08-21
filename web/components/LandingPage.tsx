'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════════
   PIPELINE DEMO DATA
   ═══════════════════════════════════════════════════════════ */

const DEMO_JD = `About the Role
We're looking for a Software Engineer to join our AI Platform team.
You'll build production ML pipelines, design APIs, and ship
features used by millions of users daily.

Requirements:
• 2+ years Python, TypeScript
• Experience with React, Next.js
• Familiarity with ML/AI tooling
• Strong communication skills`;

const DEMO_BULLETS = [
  { id: 1, text: 'Built real-time ML inference API serving 2M+ daily requests with <50ms p99 latency', selected: true },
  { id: 2, text: 'Designed React component library adopted across 3 product teams, reducing dev time by 40%', selected: true },
  { id: 3, text: 'Architected Next.js migration reducing bundle size by 62% and improving Core Web Vitals', selected: true },
  { id: 4, text: 'Led cross-functional sprint planning for 8-person engineering team', selected: false },
  { id: 5, text: 'Implemented CI/CD pipeline with automated testing achieving 94% code coverage', selected: true },
];

const DEMO_SUGGESTIONS = [
  { original: 'Built data processing scripts for analytics', improved: 'Engineered scalable data pipelines processing 500K+ events/day using Python and Apache Kafka' },
  { original: 'Worked on frontend features', improved: 'Shipped 12 user-facing features in React/Next.js, driving 23% increase in user engagement' },
];

/* ═══════════════════════════════════════════════════════════
   PIPELINE DEMO COMPONENT
   ═══════════════════════════════════════════════════════════ */

type DemoStage = 'paste' | 'parsing' | 'parsed' | 'bullets' | 'suggest' | 'pdf';

const STAGE_TIMING: Record<DemoStage, number> = {
  paste: 5500, parsing: 3500, parsed: 5000, bullets: 6000, suggest: 6000, pdf: 6000,
};

function PipelineDemo() {
  const [stage, setStage] = useState<DemoStage>('paste');
  const [typedChars, setTypedChars] = useState(0);
  const [bulletReveal, setBulletReveal] = useState(0);
  const [suggestReveal, setSuggestReveal] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const stages: DemoStage[] = ['paste', 'parsing', 'parsed', 'bullets', 'suggest', 'pdf'];
    const idx = stages.indexOf(stage);
    const timer = setTimeout(() => {
      const next = stages[(idx + 1) % stages.length];
      setStage(next);
      if (next === 'paste') { setTypedChars(0); setBulletReveal(0); setSuggestReveal(0); }
    }, STAGE_TIMING[stage]);
    return () => clearTimeout(timer);
  }, [stage]);

  useEffect(() => {
    if (stage === 'paste') {
      intervalRef.current = setInterval(() => {
        setTypedChars(prev => {
          if (prev >= DEMO_JD.length) { clearInterval(intervalRef.current!); return prev; }
          return prev + 2;
        });
      }, 25);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
  }, [stage]);

  useEffect(() => {
    if (stage === 'bullets') {
      let i = 0;
      const iv = setInterval(() => { i++; setBulletReveal(i); if (i >= DEMO_BULLETS.length) clearInterval(iv); }, 700);
      return () => clearInterval(iv);
    }
  }, [stage]);

  useEffect(() => {
    if (stage === 'suggest') {
      let i = 0;
      const iv = setInterval(() => { i++; setSuggestReveal(i); if (i >= DEMO_SUGGESTIONS.length) clearInterval(iv); }, 2200);
      return () => clearInterval(iv);
    }
  }, [stage]);

  const stageLabels: { key: DemoStage; label: string; icon: React.ReactNode }[] = [
    { key: 'paste', label: 'Input', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg> },
    { key: 'parsing', label: 'Parse', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
    { key: 'parsed', label: 'Experience', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
    { key: 'bullets', label: 'Bullets', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
    { key: 'suggest', label: 'Enhance', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> },
    { key: 'pdf', label: 'Export', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
  ];

  const stageIdx = stageLabels.findIndex(s => s.key === stage);

  return (
    <div className="demo-window">
      {/* Window chrome */}
      <div className="demo-titlebar">
        <div className="demo-dots">
          <span className="demo-dot red" /><span className="demo-dot yellow" /><span className="demo-dot green" />
        </div>
        <span className="demo-titlebar-text">rezzy, pipeline</span>
      </div>

      {/* Step tabs */}
      <div className="demo-tabs">
        {stageLabels.map((s, i) => (
          <div key={s.key} className={`demo-tab ${i <= stageIdx ? 'done' : ''} ${i === stageIdx ? 'active' : ''}`}>
            <span className="demo-tab-icon">{i < stageIdx ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg> : s.icon}</span>
            <span className="demo-tab-label">{s.label}</span>
          </div>
        ))}
        <div className="demo-tab-indicator" style={{ left: `${(stageIdx / 6) * 100}%`, width: `${100 / 6}%` }} />
      </div>

      {/* Stage content */}
      <div className="demo-body">
        {stage === 'paste' && (
          <div className="demo-stage demo-fade-in">
            <div className="demo-stage-label">Paste your job description</div>
            <div className="demo-code-block">
              <div className="demo-code-numbers">
                {DEMO_JD.slice(0, typedChars).split('\n').map((_, i) => <span key={i}>{i + 1}</span>)}
              </div>
              <div className="demo-code-content">
                {DEMO_JD.slice(0, typedChars)}
                <span className="demo-cursor" />
              </div>
            </div>
          </div>
        )}

        {stage === 'parsing' && (
          <div className="demo-stage demo-fade-in">
            <div className="demo-stage-label">Analyzing job requirements…</div>
            <div className="demo-loading-grid">
              <div className="demo-shimmer-line" style={{ width: '100%' }} />
              <div className="demo-shimmer-line" style={{ width: '72%' }} />
              <div className="demo-shimmer-line" style={{ width: '88%' }} />
              <div className="demo-shimmer-line" style={{ width: '55%' }} />
            </div>
          </div>
        )}

        {stage === 'parsed' && (
          <div className="demo-stage demo-fade-in">
            <div className="demo-stage-label">Select your experience to include</div>
            <div className="demo-experience-list">
              <div className="demo-exp-item selected">
                <div className="demo-exp-check on"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></div>
                <div className="demo-exp-info">
                  <div className="demo-exp-title">Software Engineer, Acme Corp</div>
                  <div className="demo-exp-detail">Built ML inference APIs, React component libraries, and CI/CD pipelines</div>
                </div>
              </div>
              <div className="demo-exp-item selected">
                <div className="demo-exp-check on"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></div>
                <div className="demo-exp-info">
                  <div className="demo-exp-title">Full Stack Intern, StartupXYZ</div>
                  <div className="demo-exp-detail">Shipped user-facing features in React/Next.js, data pipeline work</div>
                </div>
              </div>
              <div className="demo-exp-item excluded">
                <div className="demo-exp-check off" />
                <div className="demo-exp-info">
                  <div className="demo-exp-title">Research Assistant, University Lab</div>
                  <div className="demo-exp-detail">Academic research in computational biology, not relevant to this role</div>
                </div>
              </div>
              <div className="demo-exp-item selected">
                <div className="demo-exp-check on"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></div>
                <div className="demo-exp-info">
                  <div className="demo-exp-title">Personal Project: Cloud Dashboard</div>
                  <div className="demo-exp-detail">Next.js + TypeScript dashboard with real-time data visualization</div>
                </div>
              </div>
            </div>
            <div className="demo-exp-summary">3 of 4 experiences selected based on job requirements</div>
          </div>
        )}

        {stage === 'bullets' && (
          <div className="demo-stage demo-fade-in">
            <div className="demo-stage-label">Selecting bullet points from your experience</div>
            <div className="demo-bullet-list">
              {DEMO_BULLETS.map((b, i) => (
                <div key={b.id} className={`demo-bullet-row ${i < bulletReveal ? 'show' : ''} ${b.selected ? 'pass' : 'skip'}`}>
                  <div className={`demo-bullet-indicator ${b.selected ? 'pass' : 'skip'}`}>
                    {b.selected ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg> : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
                  </div>
                  <span className="demo-bullet-content">{b.text}</span>
                  <span className={`demo-bullet-badge ${b.selected ? 'pass' : 'skip'}`}>{b.selected ? 'MATCH' : 'SKIP'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {stage === 'suggest' && (
          <div className="demo-stage demo-fade-in">
            <div className="demo-stage-label">AI-enhanced bullet points</div>
            <div className="demo-diff-list">
              {DEMO_SUGGESTIONS.map((s, i) => (
                <div key={i} className={`demo-diff-block ${i < suggestReveal ? 'show' : ''}`}>
                  <div className="demo-diff-row remove">
                    <span className="demo-diff-sign">−</span>
                    <span>{s.original}</span>
                  </div>
                  <div className="demo-diff-row add">
                    <span className="demo-diff-sign">+</span>
                    <span>{s.improved}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {stage === 'pdf' && (
          <div className="demo-stage demo-fade-in">
            <div className="demo-stage-label">Resume compiled</div>
            <div className="demo-export">
              <div className="demo-pdf-mock">
                <div className="demo-pdf-mock-header">
                  <div className="dpdf-name" /><div className="dpdf-contact" />
                </div>
                <div className="demo-pdf-mock-section">
                  <div className="dpdf-title" /><div className="dpdf-bar" /><div className="dpdf-bar w80" /><div className="dpdf-bar" />
                </div>
                <div className="demo-pdf-mock-section">
                  <div className="dpdf-title" /><div className="dpdf-bar" /><div className="dpdf-bar w65" /><div className="dpdf-bar w80" /><div className="dpdf-bar w50" />
                </div>
                <div className="demo-pdf-mock-section">
                  <div className="dpdf-title" />
                  <div className="dpdf-chips"><span /><span /><span /><span /><span /></div>
                </div>
              </div>
              <div className="demo-export-meta">
                <div className="demo-export-stat">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  ATS-optimized
                </div>
                <div className="demo-export-stat">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  1 page, LaTeX
                </div>
                <div className="demo-export-stat">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Ready to download
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN LANDING PAGE
   ═══════════════════════════════════════════════════════════ */

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="landing">
      {/* ── Nav ── */}
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="landing-nav-inner">
          <Link href="/" className="landing-brand">
            <span>Rez<span className="accent">zy</span></span>
          </Link>
          <div className="landing-nav-links">
            <a href="#demo">Demo</a>
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
          </div>
          <div className="landing-nav-actions">
            <Link href="/login" className="landing-btn-ghost">Sign In</Link>
            <Link href="/signup" className="landing-btn-primary">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="landing-hero">
        <div className="landing-hero-grid" />
        <div className="landing-hero-glow" />
        <div className="landing-hero-content">
          <p className="landing-eyebrow">Resume tailoring, automated</p>
          <h1 className="landing-h1">
            One source of truth.<br />
            Every resume, tailored.
          </h1>
          <p className="landing-hero-sub">
            Rezzy stores your complete professional history, then uses AI to select,
            rewrite, and compile the perfect resume for every job, in seconds.
          </p>
          <div className="landing-hero-ctas">
            <Link href="/signup" className="landing-btn-primary large">
              Start building
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Demo ── */}
      <section className="landing-demo-section" id="demo">
        <div className="landing-container">
          <PipelineDemo />
        </div>
      </section>

      {/* ── Bento Features ── */}
      <section className="landing-section" id="features">
        <div className="landing-container">
          <div className="landing-section-intro">
            <p className="landing-eyebrow">Capabilities</p>
            <h2 className="landing-h2">Built for the modern job search</h2>
          </div>
          <div className="landing-bento">
            <div className="bento-card bento-wide">
              <div className="bento-card-inner">
                <div className="bento-card-label">Source Bank</div>
                <h3>Your career, structured</h3>
                <p>Every job, project, skill, and bullet point, stored in a searchable, organized bank.
                   Add once, reuse everywhere. No more digging through old resume files.</p>
              </div>
            </div>
            <div className="bento-card">
              <div className="bento-card-inner">
                <div className="bento-card-label">AI Tailoring</div>
                <h3>Smart selection & rewriting</h3>
                <p>AI matches your strongest bullets to each JD, rewrites weak ones, and optimizes for ATS keyword coverage.</p>
              </div>
            </div>
            <div className="bento-card">
              <div className="bento-card-inner">
                <div className="bento-card-label">LaTeX Export</div>
                <h3>Professional output</h3>
                <p>Every resume is compiled from LaTeX, precise formatting, clean typography, and
                   one-page optimization built in.</p>
              </div>
            </div>
            <div className="bento-card bento-wide">
              <div className="bento-card-inner">
                <div className="bento-card-label">Application Tracker</div>
                <h3>Track every application</h3>
                <p>Kanban board with status tracking from applied through offer. See your pipeline at a glance,
                   never forget to follow up.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="landing-section" id="how-it-works">
        <div className="landing-container">
          <div className="landing-section-intro">
            <p className="landing-eyebrow">Workflow</p>
            <h2 className="landing-h2">Paste, tailor, download</h2>
          </div>
          <div className="landing-workflow">
            <div className="workflow-step">
              <div className="workflow-num">1</div>
              <div className="workflow-content">
                <h3>Build your source bank</h3>
                <p>Add your work experience, projects, education, and skills. This is your single source of truth.</p>
              </div>
            </div>
            <div className="workflow-connector" />
            <div className="workflow-step">
              <div className="workflow-num">2</div>
              <div className="workflow-content">
                <h3>Paste any job description</h3>
                <p>Drop in a JD. The AI extracts required skills, seniority, tech stack, and role context in seconds.</p>
              </div>
            </div>
            <div className="workflow-connector" />
            <div className="workflow-step">
              <div className="workflow-num">3</div>
              <div className="workflow-content">
                <h3>AI selects & tailors</h3>
                <p>Your strongest bullets are selected, weak ones rewritten, and skills reordered, optimized for ATS.</p>
              </div>
            </div>
            <div className="workflow-connector" />
            <div className="workflow-step">
              <div className="workflow-num">4</div>
              <div className="workflow-content">
                <h3>Download your PDF</h3>
                <p>A polished, one-page resume compiled from LaTeX. Professional formatting, every time.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stack ── */}
      <section className="landing-section">
        <div className="landing-container">
          <div className="landing-stack-row">
            <div className="landing-stack-text">
              <p className="landing-eyebrow">Under the hood</p>
              <h2 className="landing-h2">Production-grade infrastructure</h2>
              <p className="landing-stack-sub">Full-stack application with AI pipeline, real-time processing, and cloud deployment.</p>
            </div>
            <div className="landing-stack-tags">
              {['Next.js', 'React', 'TypeScript', 'Python', 'FastAPI', 'LangChain', 'LaTeX', 'Firebase', 'PostgreSQL', 'Vercel', 'Azure'].map(t => (
                <span key={t} className="stack-tag">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="landing-cta">
        <div className="landing-container">
          <div className="landing-cta-box">
            <h2 className="landing-h2">Stop rewriting your resume from scratch</h2>
            <p>Build your source bank once. Tailor for every job, instantly.</p>
            <Link href="/signup" className="landing-btn-primary large">
              Get started free
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-inner">
            <span className="landing-footer-brand">Rez<span className="accent">zy</span></span>
            <div className="landing-footer-links">
              <a href="https://github.com/jonahr4/Rezzy" target="_blank" rel="noopener noreferrer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                GitHub
              </a>
              <span className="landing-footer-sep">·</span>
              <span>Built by Jonah Rothman</span>
            </div>
            <span className="landing-footer-copy">© 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
