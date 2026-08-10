'use client';

import React, { useState } from 'react';
import type { ResumeParseResult, MergeEntry, ParsedBullet } from '@/app/api/parse-resume/route';

type ReviewTab = 'new' | 'merging' | 'duplicates';

interface Props {
  result: ResumeParseResult;
  onImport: (selected: ImportSelection) => Promise<void>;
  onClose: () => void;
}

export interface ImportSelection {
  entries: ResumeParseResult['new_entries'];
  education: ResumeParseResult['new_education'];
  skills: string[];
  merges: SelectedMerge[];
}

export interface SelectedMerge {
  existing_id: string;
  new_bullets: ParsedBullet[];
  new_skills: string[];
}

// Pull types from result shape
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

  // Merge selections — per merge entry, which new bullets are selected
  const mergeEntries = result.merge_entries ?? [];
  const [selectedMerges, setSelectedMerges] = useState<Map<number, Set<string>>>(() => {
    const m = new Map<number, Set<string>>();
    mergeEntries.forEach((me, i) => {
      m.set(i, new Set(me.new_bullets.map(b => b.id)));
    });
    return m;
  });

  function toggleEntry(i: number) {
    setSelectedEntries(s => { const n = new Set(s); if (n.has(i)) { n.delete(i); } else { n.add(i); } return n; });
  }
  function toggleEdu(i: number) {
    setSelectedEdu(s => { const n = new Set(s); if (n.has(i)) { n.delete(i); } else { n.add(i); } return n; });
  }
  function toggleSkill(skill: string) {
    setSelectedSkills(s => { const n = new Set(s); if (n.has(skill)) { n.delete(skill); } else { n.add(skill); } return n; });
  }
  function toggleMergeBullet(mergeIdx: number, bulletId: string) {
    setSelectedMerges(prev => {
      const next = new Map(prev);
      const set = new Set(next.get(mergeIdx) ?? []);
      if (set.has(bulletId)) { set.delete(bulletId); } else { set.add(bulletId); }
      next.set(mergeIdx, set);
      return next;
    });
  }
  function toggleMergeAll(mergeIdx: number) {
    setSelectedMerges(prev => {
      const next = new Map(prev);
      const current = next.get(mergeIdx) ?? new Set<string>();
      const allBullets = mergeEntries[mergeIdx].new_bullets.map(b => b.id);
      if (current.size === allBullets.length) {
        next.set(mergeIdx, new Set());
      } else {
        next.set(mergeIdx, new Set(allBullets));
      }
      return next;
    });
  }

  const totalNew    = result.new_entries.length + result.new_education.length + result.new_skills.length;
  const totalMerge  = mergeEntries.length;
  const totalDupes  = result.duplicate_entries.length + result.duplicate_education.length + result.duplicate_skills.length;

  // Count merge bullets selected
  let mergeBulletCount = 0;
  selectedMerges.forEach(set => { mergeBulletCount += set.size; });

  const totalSelected = selectedEntries.size + selectedEdu.size + selectedSkills.size + mergeBulletCount;

  // Auto-select default tab based on what's available
  const defaultTab = totalNew > 0 ? 'new' : totalMerge > 0 ? 'merging' : 'duplicates';
  if (tab === 'new' && totalNew === 0 && totalMerge > 0) {
    // Will show empty — switch to a better tab
  }

  async function handleImport() {
    setImporting(true);
    try {
      const merges: SelectedMerge[] = [];
      selectedMerges.forEach((bulletIds, idx) => {
        if (bulletIds.size > 0) {
          const me = mergeEntries[idx];
          merges.push({
            existing_id: me.existing_id,
            new_bullets: me.new_bullets.filter(b => bulletIds.has(b.id)),
            new_skills: me.new_skills, // always include new skills from merge
          });
        }
      });

      await onImport({
        entries: result.new_entries.filter((_, i) => selectedEntries.has(i)),
        education: result.new_education.filter((_, i) => selectedEdu.has(i)),
        skills: result.new_skills.filter(s => selectedSkills.has(s)),
        merges,
      });
      onClose();
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="review-modal" role="dialog">
        {/* Header */}
        <div className="entry-modal-header">
          <div>
            <h2 className="entry-modal-title">Resume Import Review</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              {totalNew + totalMerge > 0
                ? `${totalNew} new · ${totalMerge} to merge · ${totalDupes} duplicate${totalDupes !== 1 ? 's' : ''}`
                : `${totalDupes} duplicate${totalDupes !== 1 ? 's' : ''} — everything already exists`
              }
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
            { key: 'new' as ReviewTab,        label: `New (${totalNew})` },
            { key: 'merging' as ReviewTab,     label: `Merging (${totalMerge})` },
            { key: 'duplicates' as ReviewTab,  label: `Duplicates (${totalDupes})` },
          ]).map(t => (
            <button
              key={t.key}
              className={`review-tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="entry-modal-body">
          {tab === 'new' && (
            <>
              {totalNew === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                  No new items found — everything already exists in your Source Bank.
                  {totalMerge > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setTab('merging')}>
                        View {totalMerge} entries with new bullets →
                      </button>
                    </div>
                  )}
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
          )}

          {tab === 'merging' && (
            <>
              {totalMerge === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                  No entries to merge — all bullet points already exist.
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                    These entries already exist in your Source Bank, but the uploaded resume has <strong>new bullet points</strong> to add.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {mergeEntries.map((me, idx) => (
                      <MergeCard
                        key={idx}
                        merge={me}
                        selectedBullets={selectedMerges.get(idx) ?? new Set()}
                        onToggleBullet={(bulletId) => toggleMergeBullet(idx, bulletId)}
                        onToggleAll={() => toggleMergeAll(idx)}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {tab === 'duplicates' && (
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

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      style={{
        width: 18, height: 18,
        border: `2px solid ${checked ? 'var(--accent)' : 'var(--border-strong)'}`,
        borderRadius: 4,
        background: checked ? 'var(--accent)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      {checked && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      )}
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
            <Checkbox checked={selected} onChange={() => onToggle?.()} />
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

function MergeCard({
  merge,
  selectedBullets,
  onToggleBullet,
  onToggleAll,
}: {
  merge: MergeEntry;
  selectedBullets: Set<string>;
  onToggleBullet: (bulletId: string) => void;
  onToggleAll: () => void;
}) {
  const allSelected = selectedBullets.size === merge.new_bullets.length;

  return (
    <div className="merge-card">
      <div className="merge-card-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Checkbox checked={allSelected} onChange={onToggleAll} />
        <div style={{ flex: 1 }}>
          <h3 className="entry-card-title" style={{ marginBottom: 2 }}>{merge.existing_title}</h3>
          {merge.existing_org && (
            <div className="entry-card-org">{merge.existing_org}</div>
          )}
        </div>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--accent)',
          background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
          padding: '3px 10px',
          borderRadius: 'var(--radius-full)',
        }}>
          +{merge.new_bullets.length} bullet{merge.new_bullets.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="merge-card-body">
        <div className="merge-new-label">New bullets to add</div>
        {merge.new_bullets.map(b => (
          <div
            key={b.id}
            className="merge-bullet-new"
            style={{
              cursor: 'pointer',
              opacity: selectedBullets.has(b.id) ? 1 : 0.4,
            }}
            onClick={() => onToggleBullet(b.id)}
          >
            <Checkbox checked={selectedBullets.has(b.id)} onChange={() => onToggleBullet(b.id)} />
            <span style={{ flex: 1 }}>• {b.text}</span>
          </div>
        ))}
        {merge.new_skills.length > 0 && (
          <>
            <div className="merge-new-label">New skills</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 4 }}>
              {merge.new_skills.map(s => (
                <span key={s} className="entry-skill-chip">{s}</span>
              ))}
            </div>
          </>
        )}
      </div>
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
            <Checkbox checked={selected} onChange={() => onToggle?.()} />
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
