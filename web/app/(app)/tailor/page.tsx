'use client';

import { useState } from 'react';

const PIPELINE_STEPS = [
  { id: 'parse',    label: 'Parse JD',         desc: 'Extract role, company, requirements' },
  { id: 'match',    label: 'Match Content',     desc: 'Score entries & bullets against JD' },
  { id: 'suggest',  label: 'AI Suggestions',    desc: 'Generate tailored alternatives' },
  { id: 'select',   label: 'Review & Select',   desc: 'Pick final entries and bullets' },
  { id: 'compile',  label: 'Compile Resume',    desc: 'Generate LaTeX → PDF' },
];

export default function TailorPage() {
  const [jd, setJd] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  function handleAnalyze() {
    if (!jd.trim()) return;
    setIsAnalyzing(true);
    // TODO: Wire to pipeline API
    setTimeout(() => setIsAnalyzing(false), 2000);
  }

  return (
    <>
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-eyebrow">Pipeline</div>
          <h1 className="page-title">New Tailoring Run</h1>
          <p className="page-desc">
            Paste a job description below to start. The pipeline will parse, match, suggest, and compile a tailored resume.
          </p>
        </div>
      </div>

      <div className="page-content">
        <div className="tailor-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
          {/* Left: JD input */}
          <div>
            <div className="input-group" style={{ marginBottom: 16 }}>
              <label className="input-label" htmlFor="jd-input">
                Job Description
              </label>
              <textarea
                id="jd-input"
                className="input-field"
                placeholder="Paste the full job description here...&#10;&#10;Include the role title, company name, requirements, and any specifics about the position."
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                style={{
                  minHeight: 320,
                  resize: 'vertical',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  lineHeight: 1.7,
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleAnalyze}
                disabled={!jd.trim() || isAnalyzing}
                id="btn-analyze-jd"
              >
                {isAnalyzing ? (
                  <>
                    <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    Analyze JD
                  </>
                )}
              </button>

              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {jd.length > 0 ? `${jd.length.toLocaleString()} characters` : ''}
              </span>
            </div>
          </div>

          {/* Right: Pipeline stepper */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 20, fontFamily: 'var(--font-mono)' }}>
              Pipeline Steps
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {PIPELINE_STEPS.map((step, i) => (
                <div key={step.id} style={{ display: 'flex', gap: 14, position: 'relative' }}>
                  {/* Connector line */}
                  {i < PIPELINE_STEPS.length - 1 && (
                    <div style={{
                      position: 'absolute',
                      left: 13,
                      top: 28,
                      width: 1,
                      height: 'calc(100% - 4px)',
                      background: 'var(--border)',
                    }} />
                  )}

                  {/* Step indicator */}
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    border: '2px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    flexShrink: 0,
                    background: 'var(--surface)',
                    fontFamily: 'var(--font-mono)',
                    zIndex: 1,
                  }}>
                    {i + 1}
                  </div>

                  {/* Step info */}
                  <div style={{ paddingBottom: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                      {step.label}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      {step.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
