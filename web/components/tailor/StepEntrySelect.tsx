"use client";

import { useAuth } from "@/lib/auth-context";
import { pipelineHeaders } from "@/lib/pipeline-headers";
import { useTailorStore } from "@/lib/tailorStore";
import PageGauge from "./PageGauge";

const API_URL = "/api/pipeline/step";

export default function StepEntrySelect() {
  const {
    allEntries,
    confirmedEntryIds,
    parsedJD,
    toggleEntry,
    loading,
    loadingMessage,
    setLoading,
    setSelectedContent,
    advanceStep,
    currentStep,
  } = useTailorStore();
  const { user } = useAuth();

  // Show loading while entries are being fetched
  if (allEntries.length === 0 && loading) {
    return (
      <div className="step-inner step-loading">
        <div className="loading-spinner" />
        <p className="loading-text">{loadingMessage}</p>
      </div>
    );
  }

  if (allEntries.length === 0) return null;

  const jobs = allEntries.filter((e) => e.type === "job");
  const projects = allEntries.filter((e) => e.type === "project");

  const selectedCount = confirmedEntryIds.length;
  const jobCount = jobs.filter((e) => confirmedEntryIds.includes(e.id)).length;
  const projCount = projects.filter((e) => confirmedEntryIds.includes(e.id)).length;

  const handleContinue = async () => {
    if (selectedCount === 0) return;
    setLoading(true, "Selecting best bullets for each entry...");
    advanceStep(); // Go to step 3

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: pipelineHeaders(user?.uid),
        body: JSON.stringify({
          step: "select-bullets",
          parsed_jd: parsedJD,
          confirmed_entries: confirmedEntryIds,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSelectedContent(data.selected_content);
    } catch (err) {
      console.error("Select bullets failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const isReadOnly = currentStep > 3;

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const renderEntry = (entry: typeof allEntries[0]) => {
    const isMissingBullets = entry.bullet_count === 0;
    const isSelected = !isMissingBullets && confirmedEntryIds.includes(entry.id);
    const cannotToggle = isReadOnly || isMissingBullets;

    return (
      <div
        key={entry.id}
        className={`entry-select-row ${isSelected ? "selected" : "excluded"} ${cannotToggle ? "readonly" : ""}`}
        onClick={() => !cannotToggle && toggleEntry(entry.id)}
        style={{ opacity: isMissingBullets ? 0.6 : 1 }}
      >
        <div className="entry-check">
          <div className={`check-box ${isSelected ? "checked" : ""}`} style={{ background: isMissingBullets ? 'var(--bg-card)' : undefined, borderColor: isMissingBullets ? 'var(--border)' : undefined, cursor: isMissingBullets ? 'not-allowed' : undefined }}>
            {isSelected && "✓"}
          </div>
        </div>
        <div className="entry-select-info">
          <div className="entry-select-top">
            <span className={`entry-type-pill ${entry.type}`}>
              {entry.type}
            </span>
            {entry.pinned && <span className="pin-badge">📌 Pinned</span>}
            {isMissingBullets && (
              <span style={{ 
                display: 'inline-flex', alignItems: 'center', gap: 4, 
                color: 'var(--danger)', fontSize: 10, fontWeight: 700, 
                textTransform: 'lowercase', letterSpacing: '0.02em', 
                fontFamily: 'var(--font-mono)' 
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                </svg>
                error - no bullets
              </span>
            )}
          </div>
          <div className="entry-select-title">
            {entry.company ? `${entry.company} — ` : ""}
            {entry.title}
          </div>
          <div className="entry-select-meta">
            {entry.start_date} – {entry.end_date}
            {entry.location && ` · ${entry.location}`}
            {` · ${entry.bullet_count} bullets available`}
          </div>
          {entry.tags.length > 0 && (
            <div className="entry-select-tags">
              {entry.tags.slice(0, 6).map((t, i) => (
                <span key={i} className="entry-select-tag">{t}</span>
              ))}
            </div>
          )}
        </div>
        <div className={`entry-rationale ${isSelected ? "selected" : "excluded"}`} style={{ color: isMissingBullets ? 'var(--danger)' : undefined }}>
          {isMissingBullets 
            ? "Cannot select: This entry has no bullet points for the AI to tailor. Add bullets in your Source Bank."
            : (entry.rationale || entry.summary || (isSelected ? "Selected for relevance" : "Less relevant to this role"))}
        </div>
      </div>
    );
  };

  return (
    <div className="step-inner step-entries">
      <div className="step-header-bar">
        <div>
          <h2 className="step-title">Select Entries</h2>
          <p className="step-desc">
            AI pre-selected {selectedCount} entries ({jobCount} jobs, {projCount} projects).
            Toggle any to include or exclude.
          </p>
        </div>
        <div className="step-header-right">
          {!isReadOnly && (
            <button
              className="step-cta"
              onClick={handleContinue}
              disabled={selectedCount === 0}
            >
              Continue with {selectedCount} entries →
            </button>
          )}
          <PageGauge />
        </div>
      </div>

      {/* Mini TOC nav */}
      <div className="entry-toc-nav">
        {jobs.length > 0 && (
          <button className="entry-toc-btn" onClick={() => scrollTo("entry-section-jobs")}>
            Experience ({jobCount}/{jobs.length})
          </button>
        )}
        {projects.length > 0 && (
          <button className="entry-toc-btn" onClick={() => scrollTo("entry-section-projects")}>
            Projects ({projCount}/{projects.length})
          </button>
        )}
      </div>

      <div className="entry-select-list">
        {/* Jobs section */}
        {jobs.length > 0 && (
          <>
            <div className="entry-section-header" id="entry-section-jobs">
              <span className="entry-section-label">Experience</span>
              <span className="entry-section-count">{jobCount} of {jobs.length} selected</span>
            </div>
            {jobs.map(renderEntry)}
          </>
        )}

        {/* Projects section */}
        {projects.length > 0 && (
          <>
            <div className="entry-section-header" id="entry-section-projects">
              <span className="entry-section-label">Projects</span>
              <span className="entry-section-count">{projCount} of {projects.length} selected</span>
            </div>
            {projects.map(renderEntry)}
          </>
        )}
      </div>
    </div>
  );
}
