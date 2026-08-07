"use client";

import { useTailorStore } from "@/lib/tailorStore";

export default function StepCompiling() {
  const { loading, loadingMessage, qaAttempts } = useTailorStore();

  const message = loadingMessage || "Starting compilation...";
  const isAssembling = message.includes("Assembling");
  const isCompiling = message.includes("Compiling PDF");
  const isQA = message.includes("QA") || message.includes("qa");
  const isFixing = message.includes("Fixing") || message.includes("recompiling");
  const isPassed = message.includes("passed");

  return (
    <div className="step-inner step-compiling">
      <div className="step-content-centered">
        {/* Spinner animation */}
        <div className="compile-animation">
          <div className="compile-ring" />
          <div className="compile-ring delay" />
          <div className="compile-icon">📄</div>
        </div>

        <h2 className="compile-text">{message}</h2>

        {/* Pipeline stage indicators */}
        <div className="compile-steps">
          <div className={`compile-step ${isAssembling || isCompiling || isQA || isPassed ? "done" : loading ? "active" : ""}`}>
            {isAssembling && !isCompiling ? "⟳" : "✓"} Assembling LaTeX
          </div>
          <div className={`compile-step ${isCompiling || isQA || isPassed ? "done" : isAssembling ? "" : ""}`}>
            {isCompiling && !isQA ? "⟳" : (isQA || isPassed) ? "✓" : "○"} Compiling PDF
          </div>
          <div className={`compile-step ${isPassed ? "done" : isQA || isFixing ? "active" : ""}`}>
            {isQA && !isPassed ? "⟳" : isPassed ? "✓" : "○"} QA Visual Review
          </div>
        </div>

        {/* QA Attempts Timeline */}
        {qaAttempts.length > 0 && (
          <div className="qa-attempts">
            <h3 className="qa-attempts-title">QA Review Attempts</h3>
            {qaAttempts.map((qa) => (
              <div key={qa.attempt} className={`qa-attempt qa-attempt--${qa.verdict.toLowerCase()}`}>
                <div className="qa-attempt-header">
                  <span className="qa-attempt-badge">
                    {qa.verdict === "PASS" ? "✅" : qa.verdict === "FAIL" ? "❌" : "⚠️"}{" "}
                    Attempt {qa.attempt}
                  </span>
                  <span className={`qa-attempt-verdict verdict-${qa.verdict.toLowerCase()}`}>
                    {qa.verdict}
                  </span>
                </div>

                {qa.feedback && (
                  <p className="qa-attempt-feedback">{qa.feedback}</p>
                )}

                {qa.preview && (
                  <div className="qa-attempt-preview">
                    <img
                      src={`data:image/png;base64,${qa.preview}`}
                      alt={`Resume attempt ${qa.attempt}`}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
