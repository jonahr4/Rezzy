"use client";

import { useState } from "react";
import { useTailorStore } from "@/lib/tailorStore";
import WordBudget from "./WordBudget";

const API_URL = "/api/pipeline";

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

  const [expandedEntry, setExpandedEntry] = useState<string | null>(
    selectedContent[0]?.entry_id ?? null
  );

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
        headers: { "Content-Type": "application/json" },
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
      <WordBudget />
      <div className="step-header-bar">
        <div>
          <h2 className="step-title">Select Bullets</h2>
          <p className="step-desc">
            {totalBullets} bullets selected across {selectedContent.length} entries.
            Toggle bullets to include or exclude.
          </p>
        </div>
        {!isReadOnly && (
          <button
            className="step-cta"
            onClick={handleContinue}
            disabled={totalBullets === 0}
          >
            Continue with {totalBullets} bullets →
          </button>
        )}
      </div>

      <div className="bullet-entries">
        {selectedContent.map((entry) => {
          const isExpanded = expandedEntry === entry.entry_id;
          const selectedIds = new Set(
            entry.selected_bullets.map((b) => b.id)
          );

          return (
            <div
              key={entry.entry_id}
              className={`bullet-entry ${isExpanded ? "expanded" : ""}`}
            >
              <button
                className="bullet-entry-header"
                onClick={() =>
                  setExpandedEntry(isExpanded ? null : entry.entry_id)
                }
              >
                <div className="bullet-entry-info">
                  <span className={`entry-type-pill ${entry.type}`}>
                    {entry.type}
                  </span>
                  <span className="bullet-entry-name">
                    {entry.company ? `${entry.company} — ` : ""}
                    {entry.title}
                  </span>
                </div>
                <div className="bullet-entry-count">
                  {entry.selected_bullets.length} / {entry.all_bullets.length}
                </div>
                <span className="entry-chevron">{isExpanded ? "▾" : "▸"}</span>
              </button>

              {isExpanded && (
                <div className="bullet-list">
                  {entry.all_bullets.map((bullet) => {
                    const isChecked = selectedIds.has(bullet.id);
                    const selectedBullet = entry.selected_bullets.find(
                      (b) => b.id === bullet.id
                    );
                    return (
                      <div
                        key={bullet.id}
                        className={`bullet-check-row ${isChecked ? "checked" : ""} ${isReadOnly ? "readonly" : ""}`}
                        onClick={() =>
                          !isReadOnly && toggleBullet(entry.entry_id, bullet.id)
                        }
                      >
                        <div
                          className={`check-box ${isChecked ? "checked" : ""}`}
                        >
                          {isChecked && "✓"}
                        </div>
                        <div className="bullet-check-text">
                          <p>{bullet.text}</p>
                          {selectedBullet?.reason && (
                            <span className="bullet-reason">
                              {selectedBullet.reason}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
