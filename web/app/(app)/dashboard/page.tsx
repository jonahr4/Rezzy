'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import TutorialModal from '@/components/TutorialModal';
import { useAuth } from '@/lib/auth-context';
import { STATUS_CONFIG, STATUS_ORDER } from '@/components/applications/AppDetailPanel';
import type { AppStatus } from '@/components/applications/AppDetailPanel';

interface DashStats {
  runs: number;
  entries: number;
  pdfs: number;
  applications: number;
  appsByStatus: Record<AppStatus, number>;
  recentApps: { id: string; company: string; role: string; status: AppStatus; date_applied: string }[];
  recentRuns: { id: string; company: string | null; role: string | null; status: string; created_at: string }[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const firstName = user?.displayName?.split(' ')[0] ?? 'there';
  const [stats, setStats] = useState<DashStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('tutorial=true')) {
      setShowTutorial(true);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    const h = { 'x-user-id': user.uid };
    try {
      const [appsRes, runsRes, entriesRes] = await Promise.all([
        fetch('/api/applications', { headers: h }),
        fetch('/api/pipeline', { headers: h }),
        fetch('/api/entries', { headers: h }),
      ]);

      const appsData = appsRes.ok ? await appsRes.json() : { applications: [] };
      const runsData = runsRes.ok ? await runsRes.json() : [];
      const entriesData = entriesRes.ok ? await entriesRes.json() : [];

      const apps = appsData.applications ?? [];
      const runs = Array.isArray(runsData) ? runsData : [];
      const entries = Array.isArray(entriesData) ? entriesData : [];

      const appsByStatus = STATUS_ORDER.reduce((acc, s) => {
        acc[s] = apps.filter((a: { status: AppStatus }) => a.status === s).length;
        return acc;
      }, {} as Record<AppStatus, number>);

      setStats({
        runs: runs.length,
        entries: entries.length,
        pdfs: runs.filter((r: { status: string }) => r.status === 'done').length,
        applications: apps.length,
        appsByStatus,
        recentApps: apps.slice(0, 4),
        recentRuns: runs.slice(0, 4),
      });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <>
      {showTutorial && <TutorialModal />}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-eyebrow">Dashboard</div>
          <h1 className="page-title">
            Hey, <span>{firstName}</span>
          </h1>
          <p className="page-desc">
            Ready to tailor your resume? Add your experience to the Source Bank, then run a new tailoring.
          </p>
        </div>
      </div>

      <div className="page-content">
        {/* Stats row */}
        <div className="dashboard-stats">
          {[
            { label: 'Tailoring Runs',   value: loading ? '—' : String(stats?.runs ?? 0) },
            { label: 'Entries in Bank',  value: loading ? '—' : String(stats?.entries ?? 0) },
            { label: 'PDFs Generated',   value: loading ? '—' : String(stats?.pdfs ?? 0) },
            { label: 'Applications',     value: loading ? '—' : String(stats?.applications ?? 0), href: '/applications' },
          ].map((s) => (
            <div key={s.label} className="card stat-card">
              {s.href ? (
                <Link href={s.href} style={{ textDecoration: 'none', display: 'contents' }}>
                  <div className="stat-card-label" style={{ color: 'var(--accent)' }}>{s.label}</div>
                  <div className="stat-card-value">{s.value}</div>
                </Link>
              ) : (
                <>
                  <div className="stat-card-label">{s.label}</div>
                  <div className="stat-card-value">{s.value}</div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="dashboard-actions" style={{ display: 'flex', gap: 12, marginBottom: 40 }}>
          <Link href="/tailor" className="btn btn-primary btn-lg">
            New Tailoring Run
          </Link>
          <Link href="/source-bank" className="btn btn-secondary">
            Manage Source Bank
          </Link>
          <Link href="/applications" className="btn btn-secondary">
            Application Tracker
          </Link>
        </div>

        {/* Application status summary */}
        {stats && stats.applications > 0 && (
          <>
            <div className="subsection-title" style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              Applications by Status
              <span style={{ flex: 1, height: 1, background: 'var(--border)', display: 'block' }} />
              <Link href="/applications" style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>View all →</Link>
            </div>
            <div className="dashboard-app-status-row" style={{ display: 'flex', gap: 10, marginBottom: 40, flexWrap: 'wrap' }}>
              {STATUS_ORDER.map((s) => {
                const cfg = STATUS_CONFIG[s];
                const count = stats.appsByStatus[s] ?? 0;
                return (
                  <Link href="/applications" key={s} className="card" style={{ flex: 1, minWidth: 100, padding: '14px 16px', textDecoration: 'none', borderLeft: `3px solid ${cfg.color}` }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: cfg.color, letterSpacing: '-0.03em' }}>{count}</div>
                    <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginTop: 2 }}>{cfg.label}</div>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {/* Recent Runs */}
        <div className="subsection-title" style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          Recent Runs
          <span style={{ flex: 1, height: 1, background: 'var(--border)', display: 'block' }} />
          {stats && stats.runs > 0 && (
            <Link href="/runs" style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>View all →</Link>
          )}
        </div>

        {loading || !stats || stats.runs === 0 ? (
          <div className="card" style={{ padding: '60px 24px', textAlign: 'center' }}>
            <div className="text-mono text-muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 12 }}>
              {loading ? 'Loading...' : 'No runs yet'}
            </div>
            {!loading && (
              <>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                  Paste a job description to create your first tailored resume.
                </p>
                <Link href="/tailor" className="btn btn-primary">Start your first run</Link>
              </>
            )}
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden', marginBottom: 40 }}>
            {stats.recentRuns.map((run, i) => (
              <div key={run.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 20px',
                borderBottom: i < stats.recentRuns.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {run.company ?? 'Unknown'} {run.role ? `— ${run.role}` : ''}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    {formatDate(run.created_at)}
                  </div>
                </div>
                <span style={{
                  fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  padding: '2px 8px', borderRadius: 10,
                  background: run.status === 'done' ? 'rgba(5,150,105,0.1)' : 'rgba(201,149,98,0.1)',
                  color: run.status === 'done' ? '#059669' : 'var(--accent)',
                  border: `1px solid ${run.status === 'done' ? 'rgba(5,150,105,0.3)' : 'rgba(201,149,98,0.3)'}`,
                }}>
                  {run.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
