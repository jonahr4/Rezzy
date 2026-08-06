"use client";

import { useTailorStore } from "@/lib/tailorStore";

const API_URL = "/api/pipeline";

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

  const selectedCount = confirmedEntryIds.length;
  const jobCount = allEntries.filter(
    (e) => e.type === "job" && confirmedEntryIds.includes(e.id)
  ).length;
  const projCount = selectedCount - jobCount;

  const handleContinue = async () => {
    if (selectedCount === 0) return;
    setLoading(true, "Selecting best bullets for each entry...");
    advanceStep(); // Go to step 3

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        {!isReadOnly && (
          <button
            className="step-cta"
            onClick={handleContinue}
            disabled={selectedCount === 0}
          >
            Continue with {selectedCount} entries →
          </button>
        )}
      </div>

      <div className="entry-select-list">
        {allEntries.map((entry) => {
          const isSelected = confirmedEntryIds.includes(entry.id);
          return (
            <div
              key={entry.id}
              className={`entry-select-row ${isSelected ? "selected" : "excluded"} ${isReadOnly ? "readonly" : ""}`}
              onClick={() => !isReadOnly && toggleEntry(entry.id)}
            >
              <div className="entry-check">
                <div className={`check-box ${isSelected ? "checked" : ""}`}>
                  {isSelected && "✓"}
                </div>
              </div>
              <div className="entry-select-info">
                <div className="entry-select-top">
                  <span className={`entry-type-pill ${entry.type}`}>
                    {entry.type}
                  </span>
                  {entry.pinned && <span className="pin-badge">📌 Pinned</span>}
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
              <div className={`entry-rationale ${isSelected ? "selected" : "excluded"}`}>
                {entry.summary || (isSelected ? "Selected for relevance" : "Less relevant to this role")}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
