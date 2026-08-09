'use client';

import { useState, useCallback } from 'react';
import type { ResumeParseResult } from '@/app/api/parse-resume/route';

type ReviewTab = 'new' | 'duplicates';

interface Props {
  result: ResumeParseResult;
  onImport: (selected: ImportSelection) => Promise<void>;
  onClose: () => void;
}

export interface ImportSelection {
  entries: ResumeParseResult['new_entries'];
  education: ResumeParseResult['new_education'];
  skills: string[];
}

// Make TypeScript happy — pull types from result shape
type ParsedEntry    = ResumeParseResult['new_entries'][number];
type ParsedEducation = ResumeParseResult['new_education'][number];

export default function ResumeReviewModal({ result, onImport, onClose }: Props) {
  const [tab, setTab] = useState<ReviewTab>('new');
  const [importing, setImporting] = useState(false);

  // Selected state — default all new items to selected
  const [selectedEntries, setSelectedEntries]   = useState<Set<number>>(() =>
    new Set(result.new_entries.map((_, i) => i))
  );
  const [selectedEdu, setSelectedEdu]           = useState<Set<number>>(() =>
    new Set(result.new_education.map((_, i) => i))
  );
  const [selectedSkills, setSelectedSkills]     = useState<Set<string>>(() =>
    new Set(result.new_skills)
  );

  function toggleEntry(i: number) {
    setSelectedEntries(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });
  }
  function toggleEdu(i: number) {
    setSelectedEdu(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });
  }
  function toggleSkill(skill: string) {
    setSelectedSkills(s => { const n = new Set(s); n.has(skill) ? n.delete(skill) : n.add(skill); return n; });
  }

  const totalNew = result.new_entries.length + result.new_education.length + result.new_skills.length;
  const totalDupes = result.duplicate_entries.length + result.duplicate_education.length + result.duplicate_skills.length;
  const totalSelected = selectedEntries.size + selectedEdu.size + selectedSkills.size;

  async function handleImport() {
    setImporting(true);
    try {
      await onImport({
        entries: result.new_entries.filter((_, i) => selectedEntries.has(i)),
        education: result.new_education.filter((_, i) => selectedEdu.has(i)),
        skills: result.new_skills.filter(s => selectedSkills.has(s)),
      });
      onClose();
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="entry-modal" style={{ width: 'min(680px, 100vw)' }} role="dialog">
        {/* Header */}
        <div className="entry-modal-header">
          <div>
            <h2 className="entry-modal-title">Resume Import Review</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              {totalNew} new item{totalNew !== 1 ? 's' : ''} found
              {totalDupes > 0 ? ` · ${totalDupes} duplicate${totalDupes !== 1 ? 's' : ''} skipped` : ''}
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', padding: '0 24px' }}>
          {([
            { key: 'new',        label: `New (${totalNew})` },
            { key: 'duplicates', label: `Duplicates (${totalDupes})` },
          ] as { key: ReviewTab; label: string }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '12px 16px',
                fontSize: 13,
                fontWeight: 500,
                color: tab === t.key ? 'var(--accent)' : 'var(--text-muted)',
                borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1,
                transition: 'color 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="entry-modal-body">
          {tab === 'new' ? (
            <>
              {totalNew === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                  No new items found — everything already exists in your Source Bank.
                </div>
              ) : (
                <>
                  {/* New Entries */}
                  {result.new_entries.length > 0 && (
                    <Section title="Experience & Projects" count={result.new_entries.length}>
                      {result.new_entries.map((entry, i) => (
                        <ReviewEntryCard
                          key={i}
                          entry={entry}
                          selected={selectedEntries.has(i)}
                          onToggle={() => toggleEntry(i)}
                        />
                      ))}
                    </Section>
                  )}

                  {/* New Education */}
                  {result.new_education.length > 0 && (
                    <Section title="Education" count={result.new_education.length}>
                      {result.new_education.map((edu, i) => (
                        <ReviewEduCard
                          key={i}
                          edu={edu}
                          selected={selectedEdu.has(i)}
                          onToggle={() => toggleEdu(i)}
                        />
                      ))}
                    </Section>
                  )}

                  {/* New Skills */}
                  {result.new_skills.length > 0 && (
                    <Section title="Skills" count={result.new_skills.length}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {result.new_skills.map(skill => (
                          <button
                            key={skill}
                            onClick={() => toggleSkill(skill)}
                            className={selectedSkills.has(skill) ? 'skill-chip-removable' : 'skill-chip-unselected'}
                          >
                            {selectedSkills.has(skill) && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            )}
                            {skill}
                          </button>
                        ))}
                      </div>
                    </Section>
                  )}
                </>
              )}
            </>
          ) : (
            /* Duplicates tab */
            <>
              {totalDupes === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                  No duplicates detected.
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                    These items already exist in your Source Bank and were skipped.
                  </p>

                  {result.duplicate_entries.length > 0 && (
                    <Section title="Experience & Projects" count={result.duplicate_entries.length}>
                      {result.duplicate_entries.map((entry, i) => (
                        <ReviewEntryCard key={i} entry={entry} selected={false} duplicate />
                      ))}
                    </Section>
                  )}

                  {result.duplicate_education.length > 0 && (
                    <Section title="Education" count={result.duplicate_education.length}>
                      {result.duplicate_education.map((edu, i) => (
                        <ReviewEduCard key={i} edu={edu} selected={false} duplicate />
                      ))}
                    </Section>
                  )}

                  {result.duplicate_skills.length > 0 && (
                    <Section title="Skills" count={result.duplicate_skills.length}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {result.duplicate_skills.map(skill => (
                          <span key={skill} className="skill-chip-removable" style={{ opacity: 0.5 }}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </Section>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="entry-modal-footer" style={{ padding: '16px 24px' }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', marginRight: 'auto' }}>
            {totalSelected} item{totalSelected !== 1 ? 's' : ''} selected
          </span>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleImport}
            disabled={importing || totalSelected === 0}
          >
            {importing ? 'Importing…' : `Import ${totalSelected} Item${totalSelected !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Sub-components ── */

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        color: 'var(--text-muted)',
        marginBottom: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        {title}
        <span style={{ background: 'var(--bg-elevated)', padding: '1px 6px', borderRadius: 'var(--radius-full)' }}>
          {count}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children}
      </div>
    </div>
  );
}

function ReviewEntryCard({
  entry,
  selected,
  onToggle,
  duplicate,
}: {
  entry: ParsedEntry;
  selected: boolean;
  onToggle?: () => void;
  duplicate?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="entry-card"
      style={{
        opacity: duplicate ? 0.55 : 1,
        borderLeft: selected ? '3px solid var(--accent)' : undefined,
        cursor: duplicate ? 'default' : 'pointer',
      }}
      onClick={() => !duplicate && onToggle?.()}
    >
      <div className="entry-card-header" style={{ cursor: 'inherit' }}>
        {!duplicate && (
          <div style={{ flexShrink: 0, marginTop: 2 }}>
            <div style={{
              width: 18, height: 18,
              border: `2px solid ${selected ? 'var(--accent)' : 'var(--border-strong)'}`,
              borderRadius: 4,
              background: selected ? 'var(--accent)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}>
              {selected && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </div>
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className={`entry-type-badge ${entry.type === 'job' ? 'badge-job' : 'badge-project'}`}>
            {entry.type === 'job' ? 'Experience' : 'Project'}
          </span>
          <h3 className="entry-card-title">{entry.title}</h3>
          {entry.organization && <div className="entry-card-org">{entry.organization}</div>}
          <div className="entry-card-meta">
            {[entry.start_date, entry.end_date].filter(Boolean).join(' – ')}
            {entry.location && ` · ${entry.location}`}
            {entry.bullets.length > 0 && ` · ${entry.bullets.length} bullet${entry.bullets.length !== 1 ? 's' : ''}`}
          </div>
        </div>
        {entry.bullets.length > 0 && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
            style={{ color: 'var(--text-muted)', flexShrink: 0 }}
          >
            {expanded ? '▲' : '▼'}
          </button>
        )}
      </div>
      {entry.skills.length > 0 && (
        <div className="entry-skills-row">
          {entry.skills.map(s => <span key={s} className="entry-skill-chip">{s}</span>)}
        </div>
      )}
      {expanded && entry.bullets.length > 0 && (
        <div className="entry-card-body">
          <ul className="entry-bullets">
            {entry.bullets.map(b => <li key={b.id}>{b.text}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function ReviewEduCard({
  edu,
  selected,
  onToggle,
  duplicate,
}: {
  edu: ParsedEducation;
  selected: boolean;
  onToggle?: () => void;
  duplicate?: boolean;
}) {
  return (
    <div
      className="entry-card"
      style={{
        opacity: duplicate ? 0.55 : 1,
        borderLeft: selected ? '3px solid var(--accent)' : undefined,
        cursor: duplicate ? 'default' : 'pointer',
      }}
      onClick={() => !duplicate && onToggle?.()}
    >
      <div className="entry-card-header">
        {!duplicate && (
          <div style={{ flexShrink: 0, marginTop: 2 }}>
            <div style={{
              width: 18, height: 18,
              border: `2px solid ${selected ? 'var(--accent)' : 'var(--border-strong)'}`,
              borderRadius: 4,
              background: selected ? 'var(--accent)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}>
              {selected && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </div>
          </div>
        )}
        <div style={{ flex: 1 }}>
          <span className="entry-type-badge badge-education">Education</span>
          <h3 className="entry-card-title">{edu.institution}</h3>
          <div className="entry-card-org">{edu.degree}{edu.minor ? ` · Minor in ${edu.minor}` : ''}</div>
          <div className="entry-card-meta">
            {[edu.start_date, edu.end_date].filter(Boolean).join(' – ')}
            {edu.location && ` · ${edu.location}`}
            {edu.gpa && ` · GPA ${edu.gpa}`}
          </div>
        </div>
      </div>
    </div>
  );
}
