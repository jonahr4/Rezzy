'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

interface Run {
  id: string;
  company: string | null;
  role: string | null;
  status: string;
  page_count: number | null;
  retry_count: number;
  pdf_url: string | null;
  has_pdf: boolean;
  jd_text: string | null;
  parsed_jd: Record<string, unknown> | null;
  selected_content: Array<{ title: string; company: string; selected_bullets: Array<{ text: string }> }> | null;
  skill_rows: Array<{ name: string; items: Array<{ label: string }> }> | null;
  created_at: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function RunDetailPanel({ run, onClose, onTrack, isTracked, isTracking, uid }: {
  run: Run;
  onClose: () => void;
  onTrack: (run: Run) => void;
  isTracked: boolean;
  isTracking: boolean;
  uid: string | undefined;
}) {
  const skills = run.parsed_jd
    ? ((run.parsed_jd.required_skills as string[] | undefined) ?? (run.parsed_jd.skills as string[] | undefined) ?? [])
    : [];
  const bulletTotal = run.selected_content?.reduce((s, e) => s + (e.selected_bullets?.length ?? 0), 0) ?? 0;
  const qaFailed = (run.page_count ?? 0) > 1;

  return (
    <div className="detail-panel">
      <div className="detail-panel-header">
        <div className="detail-panel-title-block">
          <div className="detail-panel-company">{run.company ?? 'Unknown Company'}</div>
          <div className="detail-panel-role">{run.role ?? 'Unknown Role'}</div>
        </div>
        <button className="detail-panel-close" onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div className="detail-panel-body">

        {/* Meta chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="run-meta-chip">{formatDate(run.created_at)}</span>
          {run.page_count != null && (
            <span className="run-meta-chip" style={{ color: qaFailed ? '#dc2626' : '#059669', borderColor: qaFailed ? 'rgba(220,38,38,0.3)' : 'rgba(5,150,105,0.3)' }}>
              {run.page_count} page{run.page_count !== 1 ? 's' : ''}{qaFailed ? ' — QA failed' : ''}
            </span>
          )}
          {run.retry_count > 0 && <span className="run-meta-chip">{run.retry_count} retr{run.retry_count === 1 ? 'y' : 'ies'}</span>}
          {run.selected_content && <span className="run-meta-chip">{run.selected_content.length} entries · {bulletTotal} bullets</span>}
        </div>

        {/* PDF actions */}
        {(run.has_pdf || run.pdf_url) && (() => {
          // Always serve via our API route (blob store is private, needs proxy)
          const pdfSrc = `/api/pipeline/${run.id}/pdf${uid ? `?uid=${uid}` : ''}`;
          return (
            <div className="detail-section">
              <div className="detail-section-label">
                Resume PDF
                <div className="detail-pdf-actions">
                  <a href={pdfSrc} target="_blank" rel="noopener noreferrer" className="detail-pdf-action-btn">View</a>
                  <a href={pdfSrc} download="resume.pdf" className="detail-pdf-action-btn">Download</a>
                </div>
              </div>
              <div className="detail-pdf-frame">
                <iframe src={pdfSrc} title="Resume PDF" className="detail-pdf-iframe" />
              </div>
            </div>
          );
        })()}

        {/* Skills */}
        {skills.length > 0 && (
          <div className="detail-section">
            <div className="detail-section-label">Matched Skills</div>
            <div className="detail-skills-wrap">
              {skills.slice(0, 24).map((s: string) => (
                <span key={s} className="detail-skill-chip">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Selected entries */}
        {run.selected_content && run.selected_content.length > 0 && (
          <div className="detail-section">
            <div className="detail-section-label">{run.selected_content.length} Entries Used</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {run.selected_content.map((entry, i) => (
                <div key={i} className="run-entry-card">
                  <div className="run-entry-header">
                    {entry.title}{entry.company ? ` — ${entry.company}` : ''}
                  </div>
                  <ul className="run-entry-bullets">
                    {entry.selected_bullets?.map((b, bi) => (
                      <li key={bi}>
                        <span className="run-bullet-dot">•</span>
                        {b.text}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skill rows */}
        {run.skill_rows && run.skill_rows.length > 0 && (
          <div className="detail-section">
            <div className="detail-section-label">Skills Section</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {run.skill_rows.map((row, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', marginRight: 4 }}>{row.name}:</span>
                  {row.items?.map(it => it.label).join(', ')}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* JD preview */}
        {run.jd_text && (
          <div className="detail-section">
            <div className="detail-section-label">Job Description</div>
            <div className="detail-jd-text" style={{ maxHeight: 120 }}>
              {run.jd_text.slice(0, 500)}{run.jd_text.length > 500 ? '…' : ''}
            </div>
          </div>
        )}

        {/* Footer: Track button */}
        <div className="detail-section detail-footer">
          {isTracked ? (
            <Link href="/applications" style={{ fontSize: 12, color: '#059669', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Saved to Tracker → View
            </Link>
          ) : (
            <button
              onClick={() => onTrack(run)}
              disabled={isTracking}
              className="done-track-btn"
              style={{ opacity: isTracking ? 0.6 : 1 }}
            >
              {isTracking ? 'Saving…' : '+ Track as Application'}
            </button>
          )}
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {run.id.slice(0, 8)}…
          </span>
        </div>
      </div>
    </div>
  );
}

export default function RunsPage() {
  const { user } = useAuth();
  const uid = user?.uid;
  const authH = useCallback((): HeadersInit => uid ? { 'x-user-id': uid } : {}, [uid]);

  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Run | null>(null);
  const [trackedRunIds, setTrackedRunIds] = useState<Set<string>>(new Set());
  const [tracking, setTracking] = useState<string | null>(null);

  const loadRuns = useCallback(async () => {
    try {
      const res = await fetch('/api/pipeline', { headers: authH() });
      if (res.ok) setRuns(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, [authH]);

  useEffect(() => { if (uid) loadRuns(); }, [uid, loadRuns]);

  useEffect(() => {
    if (!uid || runs.length === 0) return;
    fetch('/api/applications', { headers: { 'x-user-id': uid } })
      .then(r => r.json())
      .then(data => {
        const apps = data.applications ?? [];
        const tracked = new Set<string>();
        for (const run of runs) {
          if (run.jd_text && apps.some((a: { jd_text: string | null }) => a.jd_text === run.jd_text)) {
            tracked.add(run.id);
          }
        }
        setTrackedRunIds(tracked);
      }).catch(() => {});
  }, [uid, runs]);

  async function trackRun(run: Run) {
    if (!uid) return;
    setTracking(run.id);
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': uid },
        body: JSON.stringify({
          company: run.company ?? 'Unknown',
          role: run.role ?? 'Unknown',
          status: 'applied',
          date_applied: new Date(run.created_at).toISOString().split('T')[0],
          jd_text: run.jd_text ?? null,
          parsed_jd: run.parsed_jd ?? null,
          run_id: run.id,
        }),
      });
      if (res.ok) setTrackedRunIds(prev => new Set(prev).add(run.id));
    } finally {
      setTracking(null);
    }
  }

  const qaFailed = (run: Run) => (run.page_count ?? 0) > 1;

  return (
    <div className={`kanban-shell ${selected ? 'detail-open' : ''}`}>
      <div className="kanban-header">
        <div>
          <h1 className="page-title" style={{ marginBottom: 2 }}>Run History</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            {runs.length} run{runs.length !== 1 ? 's' : ''} · click any run to inspect
          </p>
        </div>
        <Link href="/tailor" className="btn btn-primary" style={{ flexShrink: 0 }}>
          New Run →
        </Link>
      </div>

      <div className="kanban-layout">
        {/* Run list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3].map(i => <div key={i} className="kanban-skeleton-card" style={{ height: 72, borderRadius: 8 }} />)}
            </div>
          ) : runs.length === 0 ? (
            <div className="app-empty">
              <div className="app-empty-icon">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="1.5"/>
                  <polyline points="14 8 14 14 18 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="app-empty-title">No runs yet</p>
              <p className="app-empty-sub">Start a tailoring run to see your results here.</p>
              <Link href="/tailor" className="btn btn-primary" style={{ marginTop: 16 }}>New Tailoring Run</Link>
            </div>
          ) : (
            runs.map(run => {
              const isSelected = selected?.id === run.id;
              const isTracked = trackedRunIds.has(run.id);
              const failed = qaFailed(run);
              const bulletTotal = run.selected_content?.reduce((s, e) => s + (e.selected_bullets?.length ?? 0), 0) ?? 0;

              return (
                <div
                  key={run.id}
                  className={`run-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelected(isSelected ? null : run)}
                >
                  <div className="run-card-left">
                    <div className="run-card-status-dot" style={{
                      background: run.status === 'done' ? (failed ? '#f59e0b' : '#059669') : run.status === 'running' ? 'var(--accent)' : '#dc2626',
                    }}/>
                    <div>
                      <div className="run-card-company">
                        {run.company ?? 'Unknown'}{run.role ? ` — ${run.role}` : ''}
                      </div>
                      <div className="run-card-meta">
                        {formatDate(run.created_at)}
                        {run.page_count != null && ` · ${run.page_count}pg${failed ? ' QA ⚠' : ''}`}
                        {run.selected_content && ` · ${run.selected_content.length} entries`}
                        {bulletTotal > 0 && ` · ${bulletTotal} bullets`}
                        {run.retry_count > 0 && ` · ${run.retry_count} retr${run.retry_count === 1 ? 'y' : 'ies'}`}
                      </div>
                    </div>
                  </div>
                  <div className="run-card-right">
                    {isTracked && (
                      <span className="run-tracked-badge">Tracked</span>
                    )}
                    <span className="run-status-chip" style={{
                      color: run.status === 'done' ? (failed ? '#f59e0b' : '#059669') : 'var(--accent)',
                      background: run.status === 'done' ? (failed ? 'rgba(245,158,11,0.08)' : 'rgba(5,150,105,0.08)') : 'rgba(201,149,98,0.08)',
                      borderColor: run.status === 'done' ? (failed ? 'rgba(245,158,11,0.3)' : 'rgba(5,150,105,0.3)') : 'rgba(201,149,98,0.3)',
                    }}>
                      {run.status === 'done' && failed ? 'QA FAILED' : run.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <RunDetailPanel
            run={selected}
            onClose={() => setSelected(null)}
            onTrack={trackRun}
            isTracked={trackedRunIds.has(selected.id)}
            isTracking={tracking === selected.id}
            uid={uid}
          />
        )}
      </div>
    </div>
  );
}
