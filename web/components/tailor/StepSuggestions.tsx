"use client";

import { useTailorStore } from "@/lib/tailorStore";

const API_URL = "/api/pipeline";

export default function StepSuggestions() {
  const {
    suggestions,
    selectedContent,
    parsedJD,
    loading,
    loadingMessage,
    toggleSuggestion,
    setLoading,
    setResult,
    advanceStep,
    currentStep,
  } = useTailorStore();

  const acceptedCount = suggestions.reduce(
    (sum, es) => sum + es.suggestions.filter((s) => s.accepted).length,
    0
  );
  const totalSuggestions = suggestions.reduce(
    (sum, es) => sum + es.suggestions.length,
    0
  );

  const handleCompile = async () => {
    setLoading(true, "Assembling and compiling your resume...");
    advanceStep(); // Go to step 5 (compiling)

    // Merge accepted suggestions into selected_content
    const mergedContent = selectedContent.map((entry) => {
      const entrySuggestions = suggestions.find(
        (es) => es.entry_id === entry.entry_id
      );
      if (!entrySuggestions) return entry;

      let bullets = [...entry.selected_bullets];
      for (const sug of entrySuggestions.suggestions) {
        if (!sug.accepted) continue;
        // Replace the bullet(s) that this suggestion targets
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

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "compile",
          selected_content: mergedContent,
          parsed_jd: parsedJD,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult({
        pdf_path: data.pdf_path,
        page_count: data.page_count,
        qa_feedback: data.qa_feedback,
        run_dir: data.run_dir,
        latex_source: data.latex_source,
      });
      advanceStep(); // Go to step 6 (done)
    } catch (err) {
      console.error("Compile failed:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && suggestions.length === 0) {
    return (
      <div className="step-inner step-loading">
        <div className="loading-spinner" />
        <p className="loading-text">{loadingMessage}</p>
      </div>
    );
  }

  const isReadOnly = currentStep > 4;

  return (
    <div className="step-inner step-suggestions">
      <div className="step-header-bar">
        <div>
          <h2 className="step-title">AI Suggestions</h2>
          <p className="step-desc">
            {totalSuggestions} improvements proposed. Accept the ones you like
            — {acceptedCount} accepted so far.
          </p>
        </div>
        {!isReadOnly && (
          <button className="step-cta" onClick={handleCompile}>
            Finalize & Compile →
          </button>
        )}
      </div>

      <div className="suggestion-list">
        {suggestions.map((entrySugs) => {
          if (entrySugs.suggestions.length === 0) return null;
          const entry = selectedContent.find(
            (e) => e.entry_id === entrySugs.entry_id
          );

          return (
            <div key={entrySugs.entry_id} className="suggestion-entry">
              <div className="suggestion-entry-header">
                <span className={`entry-type-pill ${entry?.type}`}>
                  {entry?.type}
                </span>
                <span className="suggestion-entry-name">
                  {entry?.company ? `${entry.company} — ` : ""}
                  {entry?.title}
                </span>
              </div>

              {entrySugs.suggestions.map((sug, i) => {
                const originalBullet = entry?.selected_bullets.find((b) =>
                  sug.replaces_bullet_ids.includes(b.id)
                );

                return (
                  <div
                    key={i}
                    className={`suggestion-card ${sug.accepted ? "accepted" : ""} ${isReadOnly ? "readonly" : ""}`}
                    onClick={() =>
                      !isReadOnly &&
                      toggleSuggestion(entrySugs.entry_id, i)
                    }
                  >
                    <div className="suggestion-toggle">
                      <div
                        className={`sug-switch ${sug.accepted ? "on" : ""}`}
                      >
                        <div className="sug-switch-thumb" />
                      </div>
                    </div>
                    <div className="suggestion-content">
                      {originalBullet && (
                        <div className="sug-original">
                          <span className="sug-label">Current</span>
                          <p>{originalBullet.text}</p>
                        </div>
                      )}
                      <div className="sug-arrow">↓</div>
                      <div className="sug-proposed">
                        <span className="sug-label proposed">Suggested</span>
                        <p>{sug.text}</p>
                      </div>
                      <div className="sug-reason">{sug.reason}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
