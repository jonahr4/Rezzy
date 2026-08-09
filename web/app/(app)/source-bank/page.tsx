'use client';

import { useState } from 'react';
import Link from 'next/link';

type Tab = 'entries' | 'skills' | 'education';

const TABS: { key: Tab; label: string }[] = [
  { key: 'entries',   label: 'Entries' },
  { key: 'skills',    label: 'Skills' },
  { key: 'education', label: 'Education' },
];

/* ── Empty state per tab ─────────────────────────────── */
function EmptyEntries() {
  return (
    <div className="card" style={{ padding: '60px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block' }}>
          <rect x="2" y="3" width="20" height="18" rx="3" />
          <line x1="8" y1="9" x2="16" y2="9" />
          <line x1="8" y1="13" x2="14" y2="13" />
          <line x1="8" y1="17" x2="12" y2="17" />
        </svg>
      </div>
      <div className="text-mono text-muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 8 }}>
        No entries yet
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, maxWidth: 360, margin: '0 auto 20px' }}>
        Add your work experience, projects, research, and volunteer roles. These become the building blocks for every tailored resume.
      </p>
      <button className="btn btn-primary" id="btn-add-first-entry">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add your first entry
      </button>
    </div>
  );
}

function EmptySkills() {
  return (
    <div className="card" style={{ padding: '60px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block' }}>
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
          <line x1="14" y1="4" x2="10" y2="20" />
        </svg>
      </div>
      <div className="text-mono text-muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 8 }}>
        No skills added
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, maxWidth: 360, margin: '0 auto 20px' }}>
        Build your master skills list — languages, frameworks, tools, certifications. The pipeline selects the most relevant ones for each role.
      </p>
      <button className="btn btn-primary" id="btn-add-first-skill">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add skills
      </button>
    </div>
  );
}

function EmptyEducation() {
  return (
    <div className="card" style={{ padding: '60px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block' }}>
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" />
        </svg>
      </div>
      <div className="text-mono text-muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 8 }}>
        No education added
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, maxWidth: 360, margin: '0 auto 20px' }}>
        Add your degrees, schools, GPAs, and relevant coursework. These appear in the Education section of your tailored resume.
      </p>
      <button className="btn btn-primary" id="btn-add-first-edu">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add education
      </button>
    </div>
  );
}

const TAB_CONTENT: Record<Tab, React.ReactNode> = {
  entries:   <EmptyEntries />,
  skills:    <EmptySkills />,
  education: <EmptyEducation />,
};

export default function SourceBankPage() {
  const [activeTab, setActiveTab] = useState<Tab>('entries');

  return (
    <>
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-eyebrow">Source Bank</div>
          <h1 className="page-title">Your Resume Content</h1>
          <p className="page-desc">
            Manage all your experience entries, skills, and education in one place. The pipeline pulls from these when tailoring.
          </p>
        </div>
      </div>

      <div className="page-content">
        {/* Pill Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div className="tab-pills">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                className={`tab-pill ${activeTab === key ? 'active' : ''}`}
                onClick={() => setActiveTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <button className="btn btn-primary btn-sm" id="btn-add-new">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add {activeTab === 'entries' ? 'Entry' : activeTab === 'skills' ? 'Skill' : 'Education'}
          </button>
        </div>

        {/* Tab content */}
        {TAB_CONTENT[activeTab]}
      </div>
    </>
  );
}
