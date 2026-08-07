"use client";

import { useTailorStore } from "@/lib/tailorStore";

export default function StepDone() {
  const { result, selectedContent, reset } = useTailorStore();

  if (!result) return null;

  const totalBullets = selectedContent.reduce(
    (sum, e) => sum + e.selected_bullets.length,
    0
  );
  const passed = result.page_count === 1;

  return (
    <div className="step-inner step-done">
      <div className="step-content-centered">
        <div className={`done-icon ${passed ? "pass" : "warn"}`}>
          {passed ? "✓" : "⚠"}
        </div>
        <h2 className="done-headline">
          {passed ? "Resume Ready!" : "Resume Generated"}
        </h2>
        {!passed && result.qa_feedback && (
          <p className="done-warning">{result.qa_feedback}</p>
        )}

        <div className="done-stats">
          <div className="done-stat">
            <span className="done-stat-num">{selectedContent.length}</span>
            <span className="done-stat-label">Entries</span>
          </div>
          <div className="done-stat">
            <span className="done-stat-num">{totalBullets}</span>
            <span className="done-stat-label">Bullets</span>
          </div>
          <div className="done-stat">
            <span className="done-stat-num">{result.page_count}</span>
            <span className="done-stat-label">Page{result.page_count !== 1 ? "s" : ""}</span>
          </div>
        </div>

        <div className="done-actions">
          {result.pdf_path && (
            <a
              href={`/api/file?path=${encodeURIComponent(result.pdf_path)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="step-cta"
            >
              View PDF ↗
            </a>
          )}
          <button className="step-cta secondary" onClick={reset}>
            Start Over
          </button>
        </div>
      </div>
    </div>
  );
}
