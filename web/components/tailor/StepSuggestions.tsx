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
}: {
  original: string;
  suggested: string;
}) {
  const origWords = original.split(/\s+/);
  const sugWords = suggested.split(/\s+/);

  // Simple word-level diff: highlight words in suggested that aren't in original
  const origSet = new Set(origWords.map((w) => w.toLowerCase()));

  return (
    <span>
      {sugWords.map((word, i) => {
        const isNew = !origSet.has(word.toLowerCase());
        return (
          <span key={i}>
            {i > 0 ? " " : ""}
            {isNew ? (
              <mark className="diff-highlight">{word}</mark>
            ) : (
              word
            )}
          </span>
        );
      })}
    </span>
  );
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

  const [activeEntry, setActiveEntry] = useState<string | null>(null);

  const acceptedCount = suggestions.reduce(
    (sum, es) => sum + es.suggestions.filter((s) => s.accepted).length,
    0
  );
  const totalSuggestions = suggestions.reduce(
    (sum, es) => sum + es.suggestions.length,
    0
  );

  const handleContinue = () => {
    // Merge accepted suggestions into selected_content before advancing to Preview
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
    advanceStep(); // → step 6 (Preview)
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

  // Build entries that have suggestions
  const entriesWithSuggestions = suggestions.filter(
    (es) => es.suggestions.length > 0
  );

  return (
    <div className="step-inner step-suggestions-v2">
      <div className="step-header-bar">
        <div>
          <h2 className="step-title">Review Suggestions</h2>
          <p className="step-desc">
            {acceptedCount} of {totalSuggestions} improvements accepted.
            Toggle suggestions on the right to apply them.
          </p>
        </div>
        <div className="step-header-right">
          {!isReadOnly && (
            <button className="step-cta" onClick={handleContinue}>
              Continue to Preview →
            </button>
          )}
          <PageGauge />
        </div>
      </div>

      {/* Entry tabs */}
      <div className="sug-entry-tabs">
        {entriesWithSuggestions.map((es) => {
          const entry = selectedContent.find(
            (e) => e.entry_id === es.entry_id
          );
          const acceptedInEntry = es.suggestions.filter(
            (s) => s.accepted
          ).length;
          const isActive =
            activeEntry === es.entry_id ||
            (!activeEntry && entriesWithSuggestions[0]?.entry_id === es.entry_id);

          return (
            <button
              key={es.entry_id}
              className={`sug-tab ${isActive ? "active" : ""}`}
              onClick={() => setActiveEntry(es.entry_id)}
            >
              <span className={`entry-type-dot ${entry?.type}`} />
              <span className="sug-tab-name">
                {entry?.company || entry?.title}
              </span>
              <span className="sug-tab-count">
                {acceptedInEntry}/{es.suggestions.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Side-by-side resume columns */}
      {entriesWithSuggestions.map((entrySugs) => {
        const entry = selectedContent.find(
          (e) => e.entry_id === entrySugs.entry_id
        );
        const isActive =
          activeEntry === entrySugs.entry_id ||
          (!activeEntry &&
            entriesWithSuggestions[0]?.entry_id === entrySugs.entry_id);

        if (!isActive || !entry) return null;

        return (
          <div key={entrySugs.entry_id} className="sug-columns">
            {/* LEFT: Current resume */}
            <div className="sug-col sug-col-current">
              <div className="sug-col-header">
                <span className="sug-col-label">Current</span>
              </div>
              <div className="sug-resume-card">
                <div className="sug-resume-title">{entry.title}</div>
                <div className="sug-resume-company">
                  {entry.company}
                </div>
                <ul className="sug-resume-bullets">
                  {entry.selected_bullets.map((bullet) => {
                    const hasSuggestion = entrySugs.suggestions.some(
                      (s) => s.replaces_bullet_ids.includes(bullet.id)
                    );
                    const isAccepted = entrySugs.suggestions.some(
                      (s) =>
                        s.replaces_bullet_ids.includes(bullet.id) &&
                        s.accepted
                    );

                    return (
                      <li
                        key={bullet.id}
                        className={`sug-bullet ${
                          hasSuggestion ? "has-suggestion" : ""
                        } ${isAccepted ? "replaced" : ""}`}
                      >
                        {bullet.text}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            {/* RIGHT: Suggested resume */}
            <div className="sug-col sug-col-suggested">
              <div className="sug-col-header">
                <span className="sug-col-label suggested">Suggested</span>
              </div>
              <div className="sug-resume-card suggested">
                <ul className="sug-resume-bullets">
                  {(() => {
                    // Track which suggestions we've already rendered (to avoid duplicates on merges)
                    const renderedSuggestions = new Set<number>();

                    return entry.selected_bullets.map((bullet) => {
                      const sugIndex = entrySugs.suggestions.findIndex((s) =>
                        s.replaces_bullet_ids.includes(bullet.id)
                      );
                      const suggestion = sugIndex >= 0 ? entrySugs.suggestions[sugIndex] : null;

                      if (!suggestion) {
                        // No suggestion for this bullet — show as-is
                        return (
                          <li key={bullet.id} className="sug-bullet unchanged">
                            {bullet.text}
                          </li>
                        );
                      }

                      const isMerge = suggestion.replaces_bullet_ids.length > 1;
                      const isFirstOfMerge = suggestion.replaces_bullet_ids[0] === bullet.id;

                      // If this is a merge and we already rendered this suggestion, show "merged away" indicator
                      if (renderedSuggestions.has(sugIndex)) {
                        return (
                          <li
                            key={bullet.id}
                            className={`sug-bullet merged-away ${suggestion.accepted ? "accepted" : "pending"}`}
                            onClick={() =>
                              !isReadOnly &&
                              toggleSuggestion(entrySugs.entry_id, sugIndex)
                            }
                          >
                            <div className="sug-merged-away-text">
                              <span className="sug-merged-icon">↑</span>
                              <s>{bullet.text}</s>
                            </div>
                            <div className="sug-merged-label">merged above</div>
                          </li>
                        );
                      }

                      // Mark this suggestion as rendered
                      renderedSuggestions.add(sugIndex);

                      return (
                        <li
                          key={bullet.id}
                          className={`sug-bullet suggestion-item ${
                            suggestion.accepted ? "accepted" : "pending"
                          } ${isReadOnly ? "readonly" : ""} ${isMerge ? "is-merge" : ""}`}
                          onClick={() =>
                            !isReadOnly &&
                            toggleSuggestion(entrySugs.entry_id, sugIndex)
                          }
                        >
                          {isMerge && (
                            <div className="sug-merge-badge">
                              ⛙ MERGES {suggestion.replaces_bullet_ids.length} BULLETS
                            </div>
                          )}
                          <div className="sug-bullet-row">
                            <div className="sug-bullet-text">
                              <DiffHighlight
                                original={bullet.text}
                                suggested={suggestion.text}
                              />
                            </div>
                            <div className="sug-bullet-toggle">
                              <WordDelta
                                originalText={bullet.text}
                                suggestedText={suggestion.text}
                              />
                              <div
                                className={`sug-switch ${
                                  suggestion.accepted ? "on" : ""
                                }`}
                              >
                                <div className="sug-switch-thumb" />
                              </div>
                            </div>
                          </div>
                          <div className="sug-bullet-reason">
                            {suggestion.reason}
                          </div>
                        </li>
                      );
                    });
                  })()}
                </ul>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
