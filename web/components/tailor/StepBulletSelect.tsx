"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { pipelineHeaders } from "@/lib/pipeline-headers";
import { useTailorStore } from "@/lib/tailorStore";
import PageGauge from "./PageGauge";

const API_URL = "/api/pipeline/step";

export default function StepBulletSelect() {
  const {
    selectedContent,
    parsedJD,
    loading,
    loadingMessage,
    toggleBullet,
    setLoading,
    setSuggestions,
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

  const totalBullets = selectedContent.reduce(
    (sum, e) => sum + e.selected_bullets.length,
    0
  );

  const handleContinue = async () => {
    if (totalBullets === 0) return;
    setLoading(true, "Generating AI suggestions...");
    advanceStep();

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: pipelineHeaders(user?.uid),
        body: JSON.stringify({
          step: "suggest",
          parsed_jd: parsedJD,
          selected_content: selectedContent,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSuggestions(data.ai_suggestions);
    } catch (err) {
      console.error("Suggestions failed:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && selectedContent.length === 0) {
    return (
      <div className="step-inner step-loading">
        <div className="loading-spinner" />
        <p className="loading-text">{loadingMessage}</p>
      </div>
    );
  }

  const isReadOnly = currentStep > 4;

  return (
    <div className="step-inner step-bullets">
      <div className="step-header-bar">
        <div>
          <h2 className="step-title">Select Bullets</h2>
          <p className="step-desc">
            {totalBullets} bullets selected across {selectedContent.length} entries.
            Toggle bullets to include or exclude.
          </p>
        </div>
        <div className="step-header-right">
          {!isReadOnly && (
            <button
              className="step-cta"
              onClick={handleContinue}
              disabled={totalBullets === 0}
            >
              Continue with {totalBullets} bullets →
            </button>
          )}
          <PageGauge />
        </div>
      </div>

      <div className="bullet-entries-wrap">
        {(() => {
          const jobs = selectedContent.filter((e) => e.type === "job");
          const projects = selectedContent.filter((e) => e.type === "project");

          const scrollTo = (id: string) => {
            const el = document.getElementById(id);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          };

          const renderEntry = (entry: typeof selectedContent[0]) => {
            const selectedIds = new Set(entry.selected_bullets.map((b) => b.id));
            const isExpanded = !collapsedIds.has(entry.entry_id);
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
                    <div className="bullet-entry-count">
                      {entry.selected_bullets.length} / {entry.all_bullets.length}
                    </div>
                    <span className="entry-chevron">{isExpanded ? "▾" : "▸"}</span>
                  </div>
                </div>
                {isExpanded && (
                  <div className="bullet-list" style={{ marginLeft: 32, padding: '16px 0 0 0' }}>
                    {entry.all_bullets.map((bullet) => {
                      const isChecked = selectedIds.has(bullet.id);
                      return (
                        <div
                          key={bullet.id}
                          className={`bullet-check-row ${isChecked ? "checked" : ""} ${isReadOnly ? "readonly" : ""}`}
                          onClick={() => !isReadOnly && toggleBullet(entry.entry_id, bullet.id)}
                          style={{
                            padding: '12px 16px',
                            borderRadius: '8px',
                            marginBottom: '4px',
                            background: isChecked ? 'var(--accent-subtle)' : 'transparent',
                          }}
                        >
                          <div className={`check-box ${isChecked ? "checked" : ""}`}>
                            {isChecked && "✓"}
                          </div>
                          <div className="bullet-check-text">
                            <p>{bullet.text}</p>
                            {bullet.reason && <span className="bullet-reason">{bullet.reason}</span>}
                          </div>
                        </div>
                      );
                    })}
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
                  <button className="entry-toc-btn" onClick={() => scrollTo("bullet-section-jobs")}>
                    Experience ({jobs.length})
                  </button>
                )}
                {projects.length > 0 && (
                  <button className="entry-toc-btn" onClick={() => scrollTo("bullet-section-projects")}>
                    Projects ({projects.length})
                  </button>
                )}
              </div>

              <div className="entry-select-list">
                {jobs.length > 0 && (
                  <>
                    <div className="entry-section-header" id="bullet-section-jobs">
                      <span className="entry-section-label">Experience</span>
                      <span className="entry-section-count">
                        {jobs.reduce((sum, e) => sum + e.selected_bullets.length, 0)} bullets selected
                      </span>
                    </div>
                    {jobs.map(renderEntry)}
                  </>
                )}

                {projects.length > 0 && (
                  <>
                    <div className="entry-section-header" id="bullet-section-projects">
                      <span className="entry-section-label">Projects</span>
                      <span className="entry-section-count">
                        {projects.reduce((sum, e) => sum + e.selected_bullets.length, 0)} bullets selected
                      </span>
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
