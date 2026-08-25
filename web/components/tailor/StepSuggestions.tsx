"use client";

import { useAuth } from "@/lib/auth-context";
import { pipelineHeaders } from "@/lib/pipeline-headers";
import { useTailorStore } from "@/lib/tailorStore";
import { useState } from "react";
import { WordDelta } from "./WordBudget";
import PageGauge from "./PageGauge";

const API_URL = "/api/pipeline/step";

/** Highlight words that differ between original and suggested text */
function DiffHighlight({
  original,
  suggested,
  type,
}: {
  original: string;
  suggested: string;
  type: "added" | "removed";
}) {
  const origWords = original.split(/\s+/);
  const sugWords = suggested.split(/\s+/);

  const origSet = new Set(origWords.map((w) => w.toLowerCase()));
  const sugSet = new Set(sugWords.map((w) => w.toLowerCase()));

  if (type === "added") {
    // Show green for added words
    return (
      <span>
        {sugWords.map((word, i) => {
          const isNew = !origSet.has(word.toLowerCase());
          return (
            <span key={i}>
              {i > 0 ? " " : ""}
              {isNew ? (
                <mark className="diff-highlight" style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#166534', padding: '0 2px', borderRadius: '2px' }}>{word}</mark>
              ) : (
                word
              )}
            </span>
          );
        })}
      </span>
    );
  } else {
    // Show red strikethrough for removed words
    return (
      <span>
        {origWords.map((word, i) => {
          const isRemoved = !sugSet.has(word.toLowerCase());
          return (
            <span key={i}>
              {i > 0 ? " " : ""}
              {isRemoved ? (
                <mark className="diff-highlight" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#991b1b', textDecoration: 'line-through', padding: '0 2px', borderRadius: '2px' }}>{word}</mark>
              ) : (
                word
              )}
            </span>
          );
        })}
      </span>
    );
  }
}

export default function StepSuggestions() {
  const {
    suggestions,
    selectedContent,
    loading,
    loadingMessage,
    toggleSuggestion,
    setSelectedContent,
    advanceStep,
    currentStep,
  } = useTailorStore();
  const { user } = useAuth();

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const acceptedCount = suggestions.reduce(
    (sum, es) => sum + es.suggestions.filter((s) => s.accepted).length,
    0
  );
  const totalSuggestions = suggestions.reduce(
    (sum, es) => sum + es.suggestions.length,
    0
  );

  const handleContinue = () => {
    const { selectedContent: currentContent, suggestions: currentSugs } = useTailorStore.getState();
    const mergedContent = currentContent.map((entry) => {
      const entrySuggestions = currentSugs.find(
        (es) => es.entry_id === entry.entry_id
      );
      if (!entrySuggestions) return entry;

      let bullets = [...entry.selected_bullets];
      for (const sug of entrySuggestions.suggestions) {
        if (!sug.accepted) continue;
        for (const replaceId of sug.replaces_bullet_ids) {
          const idx = bullets.findIndex((b) => b.id === replaceId);
          if (idx !== -1) {
            bullets[idx] = {
              ...bullets[idx],
              text: sug.text,
              reason: `AI suggestion: ${sug.reason}`,
            };
          }
        }
      }
      return { ...entry, selected_bullets: bullets };
    });

    setSelectedContent(mergedContent);
    advanceStep();
  };

  if (loading && suggestions.length === 0) {
    return (
      <div className="step-inner step-loading">
        <div className="loading-spinner" />
        <p className="loading-text">{loadingMessage}</p>
      </div>
    );
  }

  const isReadOnly = currentStep > 6;
  const entriesToRender = selectedContent;

  return (
    <div className="step-inner step-suggestions-v2">
      <div className="step-header-bar">
        <div>
          <h2 className="step-title">Review Suggestions</h2>
          <p className="step-desc">
            {acceptedCount} of {totalSuggestions} improvements accepted.
            Toggle suggestions to apply them.
          </p>
        </div>
        <div className="step-header-right">
          {!isReadOnly && (
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                className="btn btn-ghost" 
                style={{ padding: '8px 16px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                onClick={() => {
                  useTailorStore.setState(s => {
                    const newSugs = s.suggestions.map(entrySug => ({
                      ...entrySug,
                      suggestions: entrySug.suggestions.map(sg => ({ ...sg, accepted: true }))
                    }));
                    return { suggestions: newSugs };
                  });
                }}
              >
                Accept All
              </button>
              <button className="step-cta" onClick={handleContinue}>
                Continue to Preview →
              </button>
            </div>
          )}
          <PageGauge />
        </div>
      </div>

      <div className="bullet-entries-wrap">
        {(() => {
          const jobs = entriesToRender.filter(e => e.type === "job");
          const projects = entriesToRender.filter(e => e.type === "project");

          const scrollTo = (id: string) => {
            const el = document.getElementById(id);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          };

          const renderEntry = (entry: typeof selectedContent[0]) => {
            const isExpanded = !collapsedIds.has(entry.entry_id);
            const entrySugs = suggestions.find(es => es.entry_id === entry.entry_id);
            
            const acceptedInEntry = entrySugs ? entrySugs.suggestions.filter((s) => s.accepted).length : 0;
            const totalInEntry = entrySugs ? entrySugs.suggestions.length : 0;

            return (
              <div key={entry.entry_id} className={`bullet-entry ${isExpanded ? "expanded" : ""}`} style={{ borderBottom: 'none', marginTop: 32, marginBottom: 16 }}>
                <div 
                  className="bullet-entry-header" 
                  style={{ cursor: 'pointer', padding: '0 0 16px 0', borderBottom: isExpanded ? '1px solid var(--border)' : 'none' }}
                  onClick={() => toggleExpand(entry.entry_id)}
                >
                  <div className="bullet-entry-info">
                    <span className={`entry-type-pill ${entry.type}`}>{entry.type}</span>
                    <span className="bullet-entry-name" style={{ fontSize: 18, fontWeight: 800, marginLeft: -4 }}>
                      {entry.company ? `${entry.company} — ` : ""}
                      {entry.title}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {totalInEntry > 0 && (
                      <div className="bullet-entry-count" style={{ background: acceptedInEntry > 0 ? 'var(--accent)' : '', color: acceptedInEntry > 0 ? '#fff' : '', transition: 'all 0.2s' }}>
                        {acceptedInEntry} / {totalInEntry} accepted
                      </div>
                    )}
                    <span className="entry-chevron">{isExpanded ? "▾" : "▸"}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="bullet-list" style={{ marginLeft: 32, padding: '16px 0 0 0' }}>
                    {(() => {
                      const renderedSuggestions = new Set<number>();

                      return entry.selected_bullets.map((bullet) => {
                        const sugIndex = entrySugs ? entrySugs.suggestions.findIndex((s) =>
                          s.replaces_bullet_ids.includes(bullet.id)
                        ) : -1;
                        const suggestion = sugIndex >= 0 ? entrySugs!.suggestions[sugIndex] : null;

                        if (!suggestion) {
                          return (
                            <div key={bullet.id} style={{ 
                              marginBottom: 24, 
                              padding: '20px', 
                              borderRadius: '12px', 
                              border: '1px solid var(--border)',
                              background: 'var(--bg-card)',
                              opacity: 0.7
                            }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '8px' }}>
                                <div>
                                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.05em' }}>Current</div>
                                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                    {bullet.text}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.05em' }}>Suggestion</div>
                                  <div style={{ fontSize: 14, color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', height: '100%' }}>
                                    No suggestions for this bullet point.
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        const isMerge = suggestion.replaces_bullet_ids.length > 1;
                        if (renderedSuggestions.has(sugIndex)) {
                          return (
                            <div key={bullet.id} style={{ marginBottom: 24, padding: '16px 20px', borderRadius: 8, border: '1px dashed var(--border)', opacity: 0.6 }}>
                               <div className="sug-merged-away-text" style={{ fontSize: 13 }}>
                                 <span className="sug-merged-icon" style={{ marginRight: 8 }}>↑</span>
                                 <s>{bullet.text}</s>
                                 <span style={{ marginLeft: 12, fontSize: 11, background: 'var(--bg-card)', padding: '2px 6px', borderRadius: 4 }}>merged above</span>
                               </div>
                            </div>
                          );
                        }

                        renderedSuggestions.add(sugIndex);

                        return (
                          <div key={bullet.id} style={{ 
                            marginBottom: 24, 
                            padding: '20px', 
                            borderRadius: '12px', 
                            border: `1px solid ${suggestion.accepted ? 'var(--accent)' : 'var(--border)'}`,
                            background: suggestion.accepted ? 'var(--accent-subtle)' : 'var(--bg-card)'
                          }}>
                            {/* Side by side columns */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '16px' }}>
                              
                              {/* Left: Original */}
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.05em' }}>Current</div>
                                <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                  <DiffHighlight original={bullet.text} suggested={suggestion.text} type="removed" />
                                </div>
                              </div>

                              {/* Right: Suggested */}
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: suggestion.accepted ? 'var(--accent)' : 'var(--text-muted)', letterSpacing: '0.05em' }}>
                                    {isMerge ? `MERGED (${suggestion.replaces_bullet_ids.length} BULLETS)` : 'Suggested'}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <WordDelta originalText={bullet.text} suggestedText={suggestion.text} />
                                    <div 
                                      className={`sug-switch ${suggestion.accepted ? "on" : ""}`}
                                      onClick={() => !isReadOnly && toggleSuggestion(entry.entry_id, sugIndex)}
                                      style={{ cursor: isReadOnly ? 'default' : 'pointer' }}
                                    >
                                      <div className="sug-switch-thumb" />
                                    </div>
                                  </div>
                                </div>
                                <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6, fontWeight: 500 }}>
                                  <DiffHighlight original={bullet.text} suggested={suggestion.text} type="added" />
                                </div>
                              </div>

                            </div>
                            
                            {/* Full width explanation below */}
                            <div style={{ 
                              background: suggestion.accepted ? '#fff' : 'var(--bg-base)', 
                              padding: '12px 16px', 
                              borderRadius: '8px', 
                              fontSize: '12.5px', 
                              color: 'var(--text-secondary)',
                              borderLeft: '3px solid var(--accent)'
                            }}>
                              <strong>AI Reasoning:</strong> {suggestion.reason}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            );
          };

          return (
            <>
              {/* Mini TOC nav */}
              <div className="entry-toc-nav" style={{ marginBottom: 20 }}>
                {jobs.length > 0 && (
                  <button className="entry-toc-btn" onClick={() => scrollTo("sug-section-jobs")}>
                    Experience ({jobs.length})
                  </button>
                )}
                {projects.length > 0 && (
                  <button className="entry-toc-btn" onClick={() => scrollTo("sug-section-projects")}>
                    Projects ({projects.length})
                  </button>
                )}
              </div>

              <div className="entry-select-list">
                {jobs.length > 0 && (
                  <>
                    <div className="entry-section-header" id="sug-section-jobs">
                      <span className="entry-section-label">Experience</span>
                    </div>
                    {jobs.map(renderEntry)}
                  </>
                )}

                {projects.length > 0 && (
                  <>
                    <div className="entry-section-header" id="sug-section-projects">
                      <span className="entry-section-label">Projects</span>
                    </div>
                    {projects.map(renderEntry)}
                  </>
                )}
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
