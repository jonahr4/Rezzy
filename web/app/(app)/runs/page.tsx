'use client';

import Link from 'next/link';

const TABLE_HEADERS = ['Date', 'Company', 'Role', 'Match Score', 'Status', 'PDF'];

export default function RunsPage() {
  // TODO: Fetch real runs from the database
  const runs: never[] = [];

  return (
    <>
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-eyebrow">Pipeline</div>
          <h1 className="page-title">Run History</h1>
          <p className="page-desc">
            Every tailoring run is logged here — review past results, re-download PDFs, or re-run with different selections.
          </p>
        </div>
      </div>

      <div className="page-content">
        {runs.length > 0 ? (
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="table">
              <thead>
                <tr>
                  {TABLE_HEADERS.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Rows will go here */}
              </tbody>
            </table>
          </div>
        ) : (
          /* Empty state */
          <div className="card" style={{ padding: '80px 24px', textAlign: 'center' }}>
            {/* Table header preview */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: 12,
              maxWidth: 600,
              margin: '0 auto 32px',
              padding: '12px 16px',
              borderRadius: 8,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}>
              {TABLE_HEADERS.map((h) => (
                <div key={h} style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {h}
                </div>
              ))}
            </div>

            {/* Placeholder rows */}
            <div style={{ maxWidth: 600, margin: '0 auto 32px' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  gap: 12,
                  padding: '10px 16px',
                  opacity: 0.15 + (0.08 * (3 - i)),
                }}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <div key={j} style={{
                      height: 10,
                      borderRadius: 4,
                      background: 'var(--text-muted)',
                    }} />
                  ))}
                </div>
              ))}
            </div>

            <div className="text-mono text-muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 8 }}>
              No runs yet
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Start a tailoring run to see your results here.
            </p>
            <Link href="/tailor" className="btn btn-primary" id="btn-first-run">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Start your first run
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
