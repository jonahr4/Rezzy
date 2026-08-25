'use client';

import { useState, useEffect, useRef } from 'react';
import type { Entry, EntryType, Bullet } from '@/lib/entries';
import BulletGenerationModal from './BulletGenerationModal';
import MonthYearPicker from './MonthYearPicker';

interface Props {
  entry?: Entry | null;
  onSave: (data: Partial<Entry>) => Promise<void>;
  onClose: () => void;
}

const ENTRY_TYPES: { key: EntryType; label: string; icon: string }[] = [
  { key: 'job',     label: 'Experience', icon: '💼' },
  { key: 'project', label: 'Project',    icon: '🚀' },
];

function newBullet(): Bullet {
  return { id: crypto.randomUUID(), text: '' };
}

export default function EntryModal({ entry, onSave, onClose }: Props) {
  const [type, setType]               = useState<EntryType>(entry?.type ?? 'job');
  const [title, setTitle]             = useState(entry?.title ?? '');
  const [org, setOrg]                 = useState(entry?.organization ?? '');
  const [startDate, setStartDate]     = useState(entry?.start_date ?? '');
  const [endDate, setEndDate]         = useState(entry?.end_date ?? '');
  const [location, setLocation]       = useState(entry?.location ?? '');
  const [pinned, setPinned]           = useState(entry?.pinned ?? false);
  const [summary, setSummary]         = useState(entry?.summary ?? '');
  const [tagline, setTagline]         = useState(entry?.tagline ?? '');
  const [bullets, setBullets]         = useState<Bullet[]>(entry?.bullets?.length ? entry.bullets : [newBullet()]);
  const [skillInput, setSkillInput]   = useState('');
  const [skills, setSkills]           = useState<string[]>(entry?.skills ?? []);

  // Map existing entry.links to our new custom links array
  const initialLinks = Object.entries(entry?.links || {})
    .filter(([_, v]) => !!v)
    .map(([k, v]) => ({ id: crypto.randomUUID(), label: k, url: v }));
  if (initialLinks.length === 0) {
    initialLinks.push({ id: crypto.randomUUID(), label: '', url: '' });
  }
  const [projectLinks, setProjectLinks] = useState(initialLinks);

  const [saving, setSaving]           = useState(false);
  const [generating, setGenerating]   = useState(false);
  const [error, setError]             = useState('');

  async function handleGenerateBullets() {
    if (!summary || summary.trim().split(/\s+/).length < 10) {
      setError('Not enough information. Add a detailed summary to generate bullets.');
      return;
    }
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/generate-bullets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, organization: org, summary })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate');
      
      const newBs = data.bullets.map((text: string) => ({ id: crypto.randomUUID(), text }));
      const existing = bullets.filter(b => b.text.trim());
      setBullets([...existing, ...newBs]);
    } catch (e: any) {
      setError(e.message || 'An error occurred generating bullets');
    } finally {
      setGenerating(false);
    }
  }


  const firstInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { firstInputRef.current?.focus(); }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  /* ── Bullet helpers ── */
  function updateBullet(id: string, text: string) {
    setBullets(bs => bs.map(b => b.id === id ? { ...b, text } : b));
  }
  function addBullet(afterId?: string) {
    const nb = newBullet();
    if (!afterId) { setBullets(bs => [...bs, nb]); return; }
    setBullets(bs => {
      const idx = bs.findIndex(b => b.id === afterId);
      const next = [...bs];
      next.splice(idx + 1, 0, nb);
      return next;
    });
    setTimeout(() => document.getElementById(`bullet-${nb.id}`)?.focus(), 50);
  }
  function removeBullet(id: string) {
    setBullets(bs => bs.filter(b => b.id !== id));
  }

  /* ── Skill helpers ── */
  function addSkill(raw: string) {
    const s = raw.trim();
    if (s && !skills.includes(s)) setSkills(sk => [...sk, s]);
    setSkillInput('');
  }
  function removeSkill(s: string) {
    setSkills(sk => sk.filter(x => x !== s));
  }

  /* ── Submit ── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');
    try {
      const links: Record<string, string> = {};
      if (type === 'project') {
        projectLinks.forEach(pl => {
          if (pl.label.trim() && pl.url.trim()) {
            links[pl.label.trim()] = pl.url.trim();
          }
        });
      } else {
        // If it's a job, fallback to the first link if available
        const firstLink = projectLinks.find(pl => pl.url.trim());
        if (firstLink) links['link'] = firstLink.url.trim();
      }

      await onSave({
        type,
        title: title.trim(),
        organization: org.trim() || null,
        start_date: startDate.trim() || null,
        end_date: endDate.trim() || null,
        location: location.trim() || null,
        pinned,
        summary: summary.trim() || null,
        tagline: tagline.trim() || null,
        bullets: bullets.filter(b => b.text.trim()),
        skills,
        links,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  const isProject = type === 'project';

  return (
    <>
      <BulletGenerationModal isOpen={generating} />
      {/* Backdrop */}
      <div className="modal-backdrop" onClick={onClose} />

      {/* Drawer */}
      <div className="entry-modal" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="entry-modal-header">
          <div>
            <h2 className="entry-modal-title">
              {entry ? 'Edit' : 'Add'} {ENTRY_TYPES.find(t => t.key === type)?.label}
            </h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="entry-modal-body">
          {/* Type selector */}
          <div className="input-group">
            <label className="input-label">Type</label>
            <div className="tab-pills" style={{ width: 'fit-content' }}>
              {ENTRY_TYPES.map(t => (
                <button
                  key={t.key}
                  type="button"
                  className={`tab-pill ${type === t.key ? 'active' : ''}`}
                  onClick={() => setType(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="input-group">
            <label className="input-label">{isProject ? 'Project Name' : 'Role / Title'} <span style={{ color: 'var(--accent)' }}>*</span></label>
            <input
              ref={firstInputRef}
              className="input-field"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={isProject ? 'e.g. TaskApp' : 'e.g. Software Engineer Intern'}
              required
            />
          </div>


          {/* Tagline (projects only) */}
          {isProject && (
            <div className="input-group">
              <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span>Tagline (optional)</span>
                <span style={{ color: tagline.length >= 105 ? 'var(--danger)' : 'var(--text-muted)', fontSize: 11, fontWeight: 'normal' }}>
                  {tagline.length}/105
                </span>
              </label>
              <input
                className="input-field"
                value={tagline}
                onChange={e => setTagline(e.target.value.slice(0, 105))}
                placeholder="Brief one-liner describing the project"
                maxLength={105}
              />
            </div>
          )}
          {/* Organization + Location row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="input-group">
              <label className="input-label">
                {isProject ? 'Organization (optional)' : 'Company'}
              </label>
              <input
                className="input-field"
                value={org}
                onChange={e => setOrg(e.target.value)}
                placeholder={isProject ? 'e.g. BU Spark! (leave blank for personal)' : 'e.g. Major League Baseball'}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Location (optional)</label>
              <input className="input-field" value={location} onChange={e => setLocation(e.target.value)} placeholder="New York, NY" />
            </div>
          </div>

          {/* Dates row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="input-group">
              <label className="input-label">Start</label>
              <MonthYearPicker value={startDate} onChange={setStartDate} />
            </div>
            <div className="input-group">
              <label className="input-label">End</label>
              <MonthYearPicker value={endDate} onChange={setEndDate} allowPresent />
            </div>
          </div>

          {/* URLs (project) */}
          {isProject && (
            <div className="input-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label className="input-label" style={{ marginBottom: 0 }}>Project Links (Up to 3)</label>
                {projectLinks.length < 3 && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setProjectLinks([...projectLinks, { id: crypto.randomUUID(), label: '', url: '' }])}
                    style={{ fontSize: 12 }}
                  >
                    + Add link
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {projectLinks.map((pl, i) => (
                  <div key={pl.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <input
                      className="input-field"
                      value={pl.label}
                      onChange={e => setProjectLinks(links => links.map(l => l.id === pl.id ? { ...l, label: e.target.value } : l))}
                      placeholder="Label (e.g. Web Repo)"
                      style={{ width: '140px', flexShrink: 0 }}
                    />
                    <input
                      className="input-field"
                      value={pl.url}
                      onChange={e => setProjectLinks(links => links.map(l => l.id === pl.id ? { ...l, url: e.target.value } : l))}
                      placeholder="https://..."
                      type="url"
                    />
                    <button
                      type="button"
                      onClick={() => setProjectLinks(links => links.filter(l => l.id !== pl.id))}
                      style={{ padding: '8px 4px', color: 'var(--text-muted)', flexShrink: 0 }}
                      aria-label="Remove link"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="input-group">
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              Summary (optional)
              <span className="info-tooltip-wrap">
                <span className="info-tooltip-icon">i</span>
                <span className="info-tooltip-text">
                  The AI uses this context to fill in gaps and tailor your resume more effectively.
                  Describe what the role/project involved, technologies used, or impact made.
                </span>
              </span>
            </label>
            <textarea
              className="input-field"
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="Brief description of what you did..."
              rows={3}
            />
          </div>

          {/* Bullets */}
          <div className="input-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label className="input-label" style={{ marginBottom: 0 }}>Bullet Points</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {summary && summary.trim().split(/\s+/).length >= 10 && (
                  <button type="button" className="btn btn-outline btn-sm" onClick={handleGenerateBullets} disabled={generating} style={{ fontSize: 12 }}>
                    Generate from summary
                  </button>
                )}
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => addBullet()} style={{ fontSize: 12 }}>
                  + Add bullet
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {bullets.map((b, i) => (
                <div key={b.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ paddingTop: 10, color: 'var(--text-muted)', fontSize: 12, flexShrink: 0, fontFamily: 'var(--font-mono)' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <input
                    id={`bullet-${b.id}`}
                    className="input-field"
                    value={b.text}
                    onChange={e => updateBullet(b.id, e.target.value)}
                    placeholder="Describe what you accomplished..."
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); addBullet(b.id); }
                      if (e.key === 'Backspace' && !b.text && bullets.length > 1) removeBullet(b.id);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeBullet(b.id)}
                    style={{ padding: '8px 4px', color: 'var(--text-muted)', flexShrink: 0 }}
                    aria-label="Remove bullet"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Skills */}
          <div className="input-group">
            <label className="input-label">Skills / Tags</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {skills.map(s => (
                <span key={s} className="skill-chip-removable">
                  {s}
                  <button type="button" onClick={() => removeSkill(s)} aria-label={`Remove ${s}`}>×</button>
                </span>
              ))}
            </div>
            <input
              className="input-field"
              value={skillInput}
              onChange={e => setSkillInput(e.target.value)}
              placeholder="Type skill + Enter to add (e.g. React, Python, CI/CD)"
              onKeyDown={e => {
                if ((e.key === 'Enter' || e.key === ',') && skillInput.trim()) {
                  e.preventDefault();
                  addSkill(skillInput);
                }
              }}
            />
          </div>

          {/* Pinned */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
            <input
              type="checkbox"
              checked={pinned}
              onChange={e => setPinned(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
            />
            <span>Pin to top of list</span>
          </label>

          {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}

          {/* Footer */}
          <div className="entry-modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : (entry ? 'Save Changes' : 'Add Entry')}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
