'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

const STAT_CARDS = [
  { label: 'Tailoring Runs',    value: '0',  delta: null },
  { label: 'Entries in Bank',   value: '0',  delta: null },
  { label: 'Avg Match Score',   value: '—',  delta: null },
  { label: 'PDFs Generated',    value: '0',  delta: null },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const firstName = user?.displayName?.split(' ')[0] ?? 'there';

  return (
    <>
      {/* Page header */}
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
          {STAT_CARDS.map((s) => (
            <div key={s.label} className="card stat-card">
              <div className="stat-card-label">{s.label}</div>
              <div className="stat-card-value">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 40 }}>
          <Link href="/tailor" className="btn btn-primary btn-lg">
            New Tailoring Run
          </Link>
          <Link href="/source-bank" className="btn btn-secondary">
            Manage Source Bank
          </Link>
        </div>

        {/* Recent runs placeholder */}
        <div className="subsection-title" style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          Recent Runs
          <span style={{ flex: 1, height: 1, background: 'var(--border)', display: 'block' }} />
        </div>

        <div
          className="card"
          style={{ padding: '60px 24px', textAlign: 'center' }}
        >
          <div
            className="text-mono text-muted"
            style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 12 }}
          >
            No runs yet
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            Paste a job description to create your first tailored resume.
          </p>
          <Link href="/tailor" className="btn btn-primary">
            Start your first run
          </Link>
        </div>
      </div>
    </>
  );
}
