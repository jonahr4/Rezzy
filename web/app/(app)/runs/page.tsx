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
  created_at: string;
}

export default function RunsPage() {
  const { user } = useAuth();
  const uid = user?.uid;
  function authH(): HeadersInit { return uid ? { 'x-user-id': uid } : {}; }

  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [trackedRunIds, setTrackedRunIds] = useState<Set<string>>(new Set());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [expandedData, setExpandedData] = useState<any>(null);

  const loadRuns = useCallback(async () => {
    try {
      const res = await fetch('/api/pipeline', { headers: authH() });
      if (res.ok) {
        const data = await res.json();
        setRuns(data);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [uid]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (uid) loadRuns(); }, [uid, loadRuns]);

  async function loadRunDetail(id: string) {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    setExpandedData(null);
    try {
      const res = await fetch(`/api/pipeline/${id}`, { headers: authH() });
      if (res.ok) {
        const data = await res.json();
        setExpandedData(data);
      }
    } catch { /* ignore */ }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  }

  async function trackRun(run: Run) {
    if (!uid) return;
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': uid },
      body: JSON.stringify({
        company: run.company ?? 'Unknown',
        role: run.role ?? 'Unknown',
        status: 'applied',
        date_applied: new Date(run.created_at).toISOString().split('T')[0],
        jd_text: expandedData?.jd_text ?? null,
        parsed_jd: expandedData?.parsed_jd ?? null,
      }),
    });
    if (res.ok) setTrackedRunIds((prev) => new Set(prev).add(run.id));
  }

  return (
    <>
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-eyebrow">Pipeline</div>
          <h1 className="page-title">Run History</h1>
          <p className="page-desc">
            Every tailoring run is logged here — review past results, see what was generated.
          </p>
        </div>
      </div>

      <div className="page-content">
        {loading ? (
          <div className="card" style={{ padding: '60px 24px', textAlign: 'center' }}>
            <span className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }}/>
          </div>
        ) : runs.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {runs.map(run => (
              <div key={run.id}>
                <div
                  className="card"
                  style={{ padding: '16px 20px', cursor: 'pointer', transition: 'border-color 0.2s' }}
                  onClick={() => loadRunDetail(run.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {/* Status dot */}
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                      background: run.status === 'done' ? '#43A047' : run.status === 'running' ? 'var(--accent)' : '#E53935',
                    }}/>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {run.company ?? 'Unknown Company'} — {run.role ?? 'Unknown Role'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                        {formatDate(run.created_at)}
                      </div>
                    </div>
                    {/* Status badge */}
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.1em',
                      padding: '3px 10px', borderRadius: 'var(--radius-full)',
                      background: run.status === 'done' ? 'color-mix(in srgb, #43A047 12%, transparent)'
                        : run.status === 'running' ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
                        : 'color-mix(in srgb, #E53935 12%, transparent)',
                      color: run.status === 'done' ? '#2E7D32'
                        : run.status === 'running' ? 'var(--accent)'
                        : '#C62828',
                    }}>
                      {run.status}
                    </span>
                    {/* Page count */}
                    {run.page_count !== null && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                        {run.page_count} pg{run.retry_count > 0 ? ` · ${run.retry_count} retries` : ''}
                      </span>
                    )}
                    {/* Expand arrow */}
                    <svg
                      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round"
                      style={{ transition: 'transform 0.2s', transform: expandedId === run.id ? 'rotate(180deg)' : '' }}
                    >
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </div>

                {/* Expanded detail */}
                {expandedId === run.id && (
                  <div className="card" style={{ padding: '16px 20px', marginTop: 4, borderTop: '2px solid var(--accent)' }}>
                    {!expandedData ? (
                      <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}/>
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {/* Parsed JD summary */}
                        {expandedData?.parsed_jd && (
                          <div style={{ marginBottom: 16 }}>
                            <div className="parsed-jd-label">Parsed JD</div>
                            <div className="chip-wrap" style={{ marginTop: 4 }}>
                              {expandedData.parsed_jd?.required_skills?.map((s: string) => (
                                <span key={s} className="chip chip-required">{s}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Selected entries count */}
                        {expandedData?.confirmed_entries && (
                          <div style={{ marginBottom: 8 }}>
                            <span className="parsed-jd-label">Entries: </span>
                            {String(expandedData.confirmed_entries?.length ?? 0)} selected
                          </div>
                        )}

                        {/* Selected content bullet count */}
                        {expandedData?.selected_content && (
                          <div style={{ marginBottom: 8 }}>
                            <span className="parsed-jd-label">Bullets: </span>
                            {String(expandedData.selected_content
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              ?.reduce((s: number, e: any) => s + (e.selected_bullets?.length ?? 0), 0) ?? 0)} selected
                          </div>
                        )}

                        {/* JD text preview */}
                        {expandedData?.jd_text && (
                          <div style={{ marginTop: 12 }}>
                            <div className="parsed-jd-label">JD Preview</div>
                            <div style={{
                              fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.6,
                              color: 'var(--text-muted)', maxHeight: 120, overflow: 'hidden',
                              marginTop: 4,
                            }}>
                              {String(expandedData.jd_text).slice(0, 500)}...
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="card" style={{ padding: '80px 24px', textAlign: 'center' }}>
            <div style={{ marginBottom: 16, opacity: 0.25, display: 'flex', justifyContent: 'center' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div className="text-mono text-muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 8 }}>
              No runs yet
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, maxWidth: 360, margin: '0 auto 20px' }}>
              Start a tailoring run to see your results here.
            </p>
            <Link href="/tailor" className="btn btn-primary" id="btn-first-run">
              New Tailoring Run
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
