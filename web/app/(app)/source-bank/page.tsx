'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import EntryModal from '@/components/EntryModal';
import SkillsEditor, { makeDefaultGroups } from '@/components/SkillsEditor';
import ResumeReviewModal from '@/components/ResumeReviewModal';
import BulletGenerationModal from '@/components/BulletGenerationModal';
import type { ImportSelection } from '@/components/ResumeReviewModal';
import type { ResumeParseResult } from '@/app/api/parse-resume/route';
import {
  getEntries, createEntry, updateEntry, deleteEntry,
  getEducation, createEducation, updateEducation, deleteEducation,
  getSkillGroups, saveSkillGroups,
} from '@/lib/entries';
import type { Entry, EntryType, Education, SkillGroup } from '@/lib/entries';

type Tab = 'all' | 'job' | 'project' | 'education' | 'skills';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all',       label: 'All'        },
  { key: 'job',       label: 'Experience' },
  { key: 'project',   label: 'Project'    },
  { key: 'education', label: 'Education'  },
  { key: 'skills',    label: 'Skills'     },
];

/* ── Helpers ── */
function authHeaders(uid: string | undefined): HeadersInit {
  return uid ? { 'x-user-id': uid } : {};
}

/* ── Module-level SVG icons (must not be defined inside render) ── */
function JobIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  );
}
function ProjectIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
    </svg>
  );
}

/* ── Entry Card ── */
function EntryCard({ entry, onEdit, onDelete, onGenerateBullets, isGenerating }: {
  entry: Entry;
  onEdit: () => void;
  onDelete: () => void;
  onGenerateBullets: (id: string) => void;
  isGenerating: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const dateStr = [entry.start_date, entry.end_date].filter(Boolean).join(' – ') || null;
  const isJob = entry.type === 'job';

  return (
    <div className={`entry-card ${entry.pinned ? 'pinned' : ''}`}>
      <div className="entry-card-header" onClick={() => setExpanded(e => !e)}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className={`entry-type-badge ${isJob ? 'badge-job' : 'badge-project'}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {isJob ? <JobIcon /> : <ProjectIcon />}
              {isJob ? 'Experience' : 'Project'}
            </span>
            {(!entry.bullets || entry.bullets.length === 0) && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                </svg>
                <span style={{ color: 'var(--danger)', fontSize: 11, fontWeight: 700, textTransform: 'lowercase', fontFamily: 'var(--font-mono)', letterSpacing: '0.02em' }}>
                  error
                </span>
              </span>
            )}
            {entry.pinned && (
              <span className="entry-pin-badge" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <path d="M12 2a5 5 0 0 1 5 5c0 2.4-1.6 4.4-3.8 5.2L14 21H10l.8-8.8C8.6 11.4 7 9.4 7 7a5 5 0 0 1 5-5z"/>
                </svg>
                Pinned
              </span>
            )}
          </div>
          <h3 className="entry-card-title">{entry.title}</h3>
          {entry.organization && (
            <div className="entry-card-org">{entry.organization}</div>
          )}
          <div className="entry-card-meta">
            {dateStr && <span>{dateStr}</span>}
            {entry.location && <span>· {entry.location}</span>}
            {entry.bullets?.length > 0 && (
              <span>· {entry.bullets.length} bullet{entry.bullets.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>

        <div className="entry-card-actions" onClick={e => e.stopPropagation()}>
          <button className="btn btn-ghost btn-sm" onClick={onEdit} title="Edit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onDelete} style={{ color: 'var(--danger)' }} title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
            </svg>
            Delete
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setExpanded(e => !e)}
            style={{ color: 'var(--text-muted)' }}
          >
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Skill chips always visible */}
      {entry.skills?.length > 0 && (
        <div className="entry-skills-row">
          {entry.skills.map(s => (
            <span key={s} className="entry-skill-chip">{s}</span>
          ))}
        </div>
      )}

      {/* Expanded: bullets + summary */}
      {expanded && (
        <div className="entry-card-body">
          {entry.summary && (
            <p className="entry-summary">{entry.summary}</p>
          )}

          {(!entry.bullets || entry.bullets.length === 0) && (
            <div style={{ marginTop: 16, padding: 20, borderRadius: 8, background: 'var(--bg-elevated)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <span style={{ color: 'var(--text)', fontWeight: 700, fontSize: 13 }}>
                  No bullet points found
                </span>
                <span style={{ color: 'var(--danger)', fontWeight: 600, fontSize: 12, textTransform: 'capitalize' }}>
                  Error
                </span>
                <div style={{ width: 8, height: 8, background: 'var(--warning)' }}></div>
              </div>

              
              {(!entry.summary || entry.summary.trim().split(/\s+/).length < 10) ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  (Add a longer summary in edit mode to auto-generate bullets)
                </div>
              ) : (
                <button
                  className="btn btn-outline"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => onGenerateBullets(entry.id)}
                  disabled={isGenerating}
                >
                  {isGenerating ? 'Generating...' : 'Generate bullets from summary'}
                </button>
              )}
            </div>
          )}
          {entry.bullets?.length > 0 && (
            <ul className="entry-bullets">
              {entry.bullets.filter(b => b.text?.trim()).map(b => (
                <li key={b.id}>{b.text}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Education Card ── */
function EducationCard({ edu, onEdit, onDelete }: {
  edu: Education;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const dateStr = [edu.start_date, edu.end_date].filter(Boolean).join(' – ') || null;
  return (
    <div className="entry-card">
      <div className="entry-card-header">
        <div style={{ flex: 1 }}>
          <span className="entry-type-badge badge-education" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
              Education
            </span>
          <h3 className="entry-card-title">{edu.institution}</h3>
          <div className="entry-card-org">{edu.degree}{edu.minor ? ` · Minor in ${edu.minor}` : ''}</div>
          <div className="entry-card-meta">
            {dateStr && <span>{dateStr}</span>}
            {edu.location && <span>· {edu.location}</span>}
            {edu.gpa && <span>· GPA: {edu.gpa}</span>}
          </div>
          {edu.honors && <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 4 }}>{edu.honors}</div>}
        </div>
        <div className="entry-card-actions">
          <button className="btn btn-ghost btn-sm" onClick={onEdit}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onDelete} style={{ color: 'var(--danger)' }}>Delete</button>
        </div>
      </div>
      {edu.relevant_coursework?.length > 0 && (
        <div className="entry-skills-row">
          {edu.relevant_coursework.map(c => (
            <span key={c} className="entry-skill-chip">{c}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Education Modal ── */
function EducationModal({ edu, onSave, onClose }: {
  edu?: Education | null;
  onSave: (data: Partial<Education>) => Promise<void>;
  onClose: () => void;
}) {
  const [institution, setInstitution] = useState(edu?.institution ?? '');
  const [degree, setDegree]           = useState(edu?.degree ?? '');
  const [minor, setMinor]             = useState(edu?.minor ?? '');
  const [location, setLocation]       = useState(edu?.location ?? '');
  const [startDate, setStartDate]     = useState(edu?.start_date ?? '');
  const [endDate, setEndDate]         = useState(edu?.end_date ?? '');
  const [gpa, setGpa]                 = useState(edu?.gpa ?? '');
  const [honors, setHonors]           = useState(edu?.honors ?? '');
  const [coursework, setCoursework]   = useState(edu?.relevant_coursework?.join(', ') ?? '');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!institution.trim() || !degree.trim()) { setError('Institution and degree are required'); return; }
    setSaving(true);
    try {
      await onSave({
        institution: institution.trim(),
        degree: degree.trim(),
        minor: minor.trim() || null,
        location: location.trim() || null,
        start_date: startDate.trim() || null,
        end_date: endDate.trim() || null,
        gpa: gpa.trim() || null,
        honors: honors.trim() || null,
        relevant_coursework: coursework.split(',').map(s => s.trim()).filter(Boolean),
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="entry-modal" role="dialog">
        <div className="entry-modal-header">
          <h2 className="entry-modal-title">{edu ? 'Edit' : 'Add'} Education</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="entry-modal-body">
          <div className="input-group">
            <label className="input-label">Institution *</label>
            <input className="input-field" value={institution} onChange={e => setInstitution(e.target.value)} placeholder="e.g. Boston University" required />
          </div>
          <div className="input-group">
            <label className="input-label">Degree *</label>
            <input className="input-field" value={degree} onChange={e => setDegree(e.target.value)} placeholder="e.g. BS in Computer Science" required />
          </div>
          <div className="input-group">
            <label className="input-label">Minor (optional)</label>
            <input className="input-field" value={minor} onChange={e => setMinor(e.target.value)} placeholder="e.g. Economics" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="input-group">
              <label className="input-label">Start</label>
              <input className="input-field" value={startDate} onChange={e => setStartDate(e.target.value)} placeholder="Sep 2022" />
            </div>
            <div className="input-group">
              <label className="input-label">End</label>
              <input className="input-field" value={endDate} onChange={e => setEndDate(e.target.value)} placeholder="May 2026" />
            </div>
            <div className="input-group">
              <label className="input-label">Location</label>
              <input className="input-field" value={location} onChange={e => setLocation(e.target.value)} placeholder="Boston, MA" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="input-group">
              <label className="input-label">GPA (optional)</label>
              <input className="input-field" value={gpa} onChange={e => setGpa(e.target.value)} placeholder="3.85" />
            </div>
            <div className="input-group">
              <label className="input-label">Honors (optional)</label>
              <input className="input-field" value={honors} onChange={e => setHonors(e.target.value)} placeholder="Dean's List" />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Relevant Coursework (comma-separated)</label>
            <textarea
              className="input-field"
              value={coursework}
              onChange={e => setCoursework(e.target.value)}
              placeholder="Machine Learning, Algorithms, Distributed Systems..."
              rows={3}
            />
          </div>
          {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}
          <div className="entry-modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : (edu ? 'Save Changes' : 'Add Education')}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

/* ── Main Page ── */
export default function SourceBankPage() {
  const { user } = useAuth();
  const uid = user?.uid;

  
  const [activeTab, setActiveTab]       = useState<Tab>('all');
  const [generatingBulletsId, setGeneratingBulletsId] = useState<string | null>(null);

  async function handleGenerateBullets(id: string) {
    if (!user) return;
    setGeneratingBulletsId(id);
    try {
      const res = await fetch(`/api/entries/${id}/generate-bullets`, {
        method: 'POST',
        headers: authHeaders(user.uid),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate bullets');
      }
      const updated = await res.json();
      setEntries(prev => prev.map(e => (e.id === id ? updated : e)));
    } catch (e: any) {
      alert(e.message || 'An error occurred while generating bullets.');
    } finally {
      setGeneratingBulletsId(null);
    }
  }

  const [entries, setEntries]           = useState<Entry[]>([]);
  const [education, setEducation]       = useState<Education[]>([]);
  const [skillGroups, setSkillGroups]   = useState<SkillGroup[]>([]);
  const [loading, setLoading]           = useState(true);
  const [skillsSaving, setSkillsSaving] = useState(false);

  // Modal state
  const [entryModal, setEntryModal]   = useState<{ open: boolean; entry?: Entry }>({ open: false });
  const [eduModal, setEduModal]       = useState<{ open: boolean; edu?: Education }>({ open: false });

  // Upload & review state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading]         = useState(false);
  const [uploadStatus, setUploadStatus]   = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError]     = useState('');
  const [reviewResult, setReviewResult]   = useState<ResumeParseResult | null>(null);

  /* ── Load data ── */
  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const headers = authHeaders(uid);
      const [ent, edu, skills] = await Promise.all([
        fetch('/api/entries', { headers }).then(r => r.json()),
        fetch('/api/education', { headers }).then(r => r.json()),
        fetch('/api/skills', { headers }).then(r => r.json()),
      ]);
      setEntries(Array.isArray(ent) ? ent : []);
      setEducation(Array.isArray(edu) ? edu : []);
      // Auto-init default skill groups if none exist
      if (Array.isArray(skills) && skills.length === 0) {
        const defaults = makeDefaultGroups();
        setSkillGroups(defaults);
        // Persist them immediately
        fetch('/api/skills', {
          method: 'POST',
          headers: { ...authHeaders(uid), 'Content-Type': 'application/json' } as HeadersInit,
          body: JSON.stringify({ groups: defaults }),
        }).catch(console.error);
      } else {
        setSkillGroups(Array.isArray(skills) ? skills : []);
      }
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [uid]);

  /* ── Entry CRUD ── */
  async function handleSaveEntry(data: Partial<Entry>) {
    const headers = { ...authHeaders(uid), 'Content-Type': 'application/json' };
    if (entryModal.entry) {
      const res = await fetch(`/api/entries/${entryModal.entry.id}`, {
        method: 'PATCH', headers, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setEntries(es => es.map(e => e.id === updated.id ? updated : e));
    } else {
      const res = await fetch('/api/entries', {
        method: 'POST', headers, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json();
      setEntries(es => [created, ...es]);
    }
  }

  async function handleDeleteEntry(id: string) {
    if (!confirm('Delete this entry?')) return;
    await fetch(`/api/entries/${id}`, { method: 'DELETE', headers: authHeaders(uid) });
    setEntries(es => es.filter(e => e.id !== id));
  }

  /* ── Education CRUD ── */
  async function handleSaveEdu(data: Partial<Education>) {
    const headers = { ...authHeaders(uid), 'Content-Type': 'application/json' };
    if (eduModal.edu) {
      const res = await fetch(`/api/education/${eduModal.edu.id}`, {
        method: 'PATCH', headers, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setEducation(es => es.map(e => e.id === updated.id ? updated : e));
    } else {
      const res = await fetch('/api/education', {
        method: 'POST', headers, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json();
      setEducation(es => [...es, created]);
    }
  }

  async function handleDeleteEdu(id: string) {
    if (!confirm('Delete this education entry?')) return;
    await fetch(`/api/education/${id}`, { method: 'DELETE', headers: authHeaders(uid) });
    setEducation(es => es.filter(e => e.id !== id));
  }

  /* ── Skills save ── */
  async function handleSaveSkills() {
    setSkillsSaving(true);
    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { ...authHeaders(uid), 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups: skillGroups }),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved = await res.json();
      setSkillGroups(saved);
    } finally {
      setSkillsSaving(false);
    }
  }

  /* ── Resume Upload (multi-file) ── */
  async function handleUpload(files: FileList) {
    const pdfs = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.pdf')).slice(0, 5);
    if (pdfs.length === 0) { setUploadError('Please select PDF files.'); return; }

    setUploading(true);
    setUploadError('');
    setUploadProgress(10);
    setUploadStatus(`Extracting text from ${pdfs.length} PDF${pdfs.length > 1 ? 's' : ''}...`);

    try {
      const form = new FormData();
      for (const f of pdfs) form.append('file', f);

      setUploadProgress(25);
      setUploadStatus('Analyzing resume content...');

      const res = await fetch('/api/parse-resume', {
        method: 'POST',
        headers: authHeaders(uid),
        body: form,
      });

      setUploadProgress(80);
      setUploadStatus('Checking for duplicates...');

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? `Error ${res.status}`);
      }
      const result: ResumeParseResult = await res.json();

      setUploadProgress(100);
      setUploadStatus('Done!');
      setReviewResult(result);
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadStatus('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  /* ── Import confirmed items from review ── */
  async function handleImport(selection: ImportSelection) {
    const headers = { ...authHeaders(uid), 'Content-Type': 'application/json' } as HeadersInit;

    // 1. Import new entries
    for (const entry of selection.entries) {
      await fetch('/api/entries', { method: 'POST', headers, body: JSON.stringify(entry) });
    }
    // 2. Import new education
    for (const edu of selection.education) {
      await fetch('/api/education', { method: 'POST', headers, body: JSON.stringify(edu) });
    }
    // 3. Merge bullets into existing entries
    if (selection.merges) {
      for (const merge of selection.merges) {
        // PATCH the entry with appended bullets and skills
        const currentEntry = entries.find(e => e.id === merge.existing_id);
        if (currentEntry) {
          const mergedBullets = [
            ...(currentEntry.bullets ?? []),
            ...merge.new_bullets,
          ];
          const existingSkills: string[] = Array.isArray(currentEntry.skills) ? currentEntry.skills : [];
          const mergedSkills = [
            ...existingSkills,
            ...merge.new_skills.filter(s => !existingSkills.some(es => es.toLowerCase() === s.toLowerCase())),
          ];
          await fetch(`/api/entries/${merge.existing_id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ bullets: mergedBullets, skills: mergedSkills }),
          });
        }
      }
    }
    // 4. Import skills — merge into existing groups
    if (selection.skills.length > 0) {
      const otherGroup = skillGroups.find(g => g.label.toLowerCase() === 'other') ?? skillGroups[skillGroups.length - 1];
      if (otherGroup) {
        const updated = skillGroups.map(g =>
          g.id === otherGroup.id
            ? { ...g, skills: [...g.skills, ...selection.skills.filter(s => !g.skills.includes(s))] }
            : g
        );
        await fetch('/api/skills', { method: 'POST', headers, body: JSON.stringify({ groups: updated }) });
      }
    }
    // 5. Reload everything
    await load();
  }

  /* ── Filtered entries for display ── */
  const filteredEntries = activeTab === 'all' || activeTab === 'education' || activeTab === 'skills'
    ? entries
    : entries.filter(e => e.type === activeTab as EntryType);

  /* ── Sort entries: pinned first, then oldest → newest by start_date ── */
  function parseDate(d: string | null | undefined): number {
    if (!d) return Infinity; // no date → sort to end
    const t = Date.parse(d);
    return isNaN(t) ? Infinity : t;
  }
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    // Pinned always first
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    // Newest start_date first
    return parseDate(b.start_date) - parseDate(a.start_date);
  });

  /* ── Counts for tab badges ── */
  const counts = {
    all:       entries.length + education.length,
    job:       entries.filter(e => e.type === 'job').length,
    project:   entries.filter(e => e.type === 'project').length,
    education: education.length,
    skills:    skillGroups.reduce((sum, g) => sum + g.skills.length, 0),
  };

  /* ── Add button label ── */
  const addLabel = activeTab === 'education' ? 'Add Education'
    : activeTab === 'skills' ? null
    : activeTab === 'project' ? 'Add Project'
    : 'Add Entry';

  return (
    <>
      {/* Hidden file input — multi-file, up to 5 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        multiple
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files; if (f && f.length > 0) handleUpload(f); }}
      />

      {/* Modals */}
      {entryModal.open && (
        <EntryModal
          entry={entryModal.entry}
          onSave={handleSaveEntry}
          onClose={() => setEntryModal({ open: false })}
        />
      )}
      {eduModal.open && (
        <EducationModal
          edu={eduModal.edu}
          onSave={handleSaveEdu}
          onClose={() => setEduModal({ open: false })}
        />
      )}
      {reviewResult && (
        <ResumeReviewModal
          result={reviewResult}
          onImport={handleImport}
          onClose={() => setReviewResult(null)}
        />
      )}

      {/* Page header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-eyebrow">Source Bank</div>
          <h1 className="page-title">Your Resume Content</h1>
          <p className="page-desc">
            All your experience, projects, education, and skills in one place. The pipeline pulls from these when tailoring.
          </p>
        </div>
        {/* Upload button + progress in header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, minWidth: 200 }}>
          <button
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Upload Resume{uploading ? '…' : 's'}
          </button>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Up to 5 PDFs at once</span>

          {/* Progress indicator */}
          {uploading && (
            <div className="upload-progress" style={{ width: '100%' }}>
              <div className="upload-progress-status">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                {uploadStatus}
              </div>
              <div className="upload-progress-bar">
                <div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          {uploadError && <p style={{ fontSize: 12, color: 'var(--danger)' }}>{uploadError}</p>}
        </div>
      </div>

      <div className="page-content">
        {/* Tab bar + Add button */}
        <div className="source-bank-toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
          <div className="tab-pills">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                className={`tab-pill ${activeTab === key ? 'active' : ''}`}
                onClick={() => setActiveTab(key)}
              >
                {label}
                {counts[key] > 0 && (
                  <span className="tab-pill-count">{counts[key]}</span>
                )}
              </button>
            ))}
          </div>

          {addLabel && (
            <button
              className="btn btn-primary btn-sm"
              style={{ flexShrink: 0 }}
              onClick={() => {
                if (activeTab === 'education') {
                  setEduModal({ open: true });
                } else {
                  setEntryModal({ open: true, entry: undefined });
                }
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              {addLabel}
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton-card" />
            ))}
          </div>
        ) : (
          <>
            {/* Skills tab */}
            {activeTab === 'skills' && (
              <SkillsEditor
                groups={skillGroups}
                onChange={setSkillGroups}
                saving={skillsSaving}
                onSave={handleSaveSkills}
              />
            )}

            {/* Education tab */}
            {activeTab === 'education' && (
              <>
                {education.length === 0 ? (
                  <div className="card" style={{ padding: '60px 24px', textAlign: 'center' }}>
                    <div style={{ marginBottom: 16, opacity: 0.25, display: 'flex', justifyContent: 'center' }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
                      </svg>
                    </div>
                    <div className="text-mono text-muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 8 }}>No education yet</div>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Add your degrees and academic background.</p>
                    <button className="btn btn-primary" onClick={() => setEduModal({ open: true })}>Add Education</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {education.map(edu => (
                      <EducationCard
                        key={edu.id}
                        edu={edu}
                        onEdit={() => setEduModal({ open: true, edu })}
                        onDelete={() => handleDeleteEdu(edu.id)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Entries (all / job / project) */}
            {activeTab !== 'skills' && activeTab !== 'education' && (
              <>
                {/* All tab: show education cards too */}
                {activeTab === 'all' && education.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div className="sidebar-section-label" style={{ marginBottom: 8 }}>Education</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {education.map(edu => (
                        <EducationCard
                          key={edu.id}
                          edu={edu}
                          onEdit={() => setEduModal({ open: true, edu })}
                          onDelete={() => handleDeleteEdu(edu.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {sortedEntries.length === 0 ? (
                  <div className="card" style={{ padding: '60px 24px', textAlign: 'center' }}>
                    <div style={{ marginBottom: 16, opacity: 0.25, display: 'flex', justifyContent: 'center' }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                        {activeTab === 'project'
                          ? <><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></>
                          : <><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></>}
                      </svg>
                    </div>
                    <div className="text-mono text-muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 8 }}>
                      {activeTab === 'all' ? 'No entries yet' : `No ${activeTab === 'project' ? 'projects' : 'experience'} yet`}
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, maxWidth: 360, margin: '0 auto 20px' }}>
                      {activeTab === 'project'
                        ? 'Add your personal and course projects — each one is a bullet-point building block.'
                        : 'Add your work experience, internships, and research roles.'}
                    </p>
                    <button className="btn btn-primary" onClick={() => setEntryModal({ open: true })}>
                      Add {activeTab === 'project' ? 'Project' : 'Entry'}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {activeTab === 'all' && sortedEntries.length > 0 && (
                      <div className="sidebar-section-label" style={{ marginBottom: 4 }}>Entries</div>
                    )}
                    {sortedEntries.map(entry => (
                      <EntryCard
                        key={entry.id}
                        entry={entry}
                        onEdit={() => setEntryModal({ open: true, entry })}
                        onDelete={() => handleDeleteEntry(entry.id)}
                        onGenerateBullets={handleGenerateBullets}
                        isGenerating={generatingBulletsId === entry.id}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
