"use client";

import { useTailorStore } from "@/lib/tailorStore";

export default function StepCompiling() {
  const { loading, loadingMessage } = useTailorStore();

  // Parse the loadingMessage to determine which step is active
  const message = loadingMessage || "Starting compilation...";
  const isAssembling = message.includes("Assembling");
  const isCompiling = message.includes("Compiling PDF");
  const isQA = message.includes("QA");
  const isRetry = message.includes("retrying") || message.includes("Retry");
  const isPassed = message.includes("passed");

  return (
    <div className="step-inner step-compiling">
      <div className="step-content-centered">
        <div className="compile-animation">
          <div className="compile-ring" />
          <div className="compile-ring delay" />
          <div className="compile-icon">📄</div>
        </div>
        <h2 className="compile-text">{message}</h2>
        <div className="compile-steps">
          <div className={`compile-step ${isAssembling || isCompiling || isQA || isPassed ? "done" : loading ? "active" : ""}`}>
            {isAssembling && !isCompiling ? "⟳" : "✓"} Assembling LaTeX
          </div>
          <div className={`compile-step ${isCompiling || isQA || isPassed ? "done" : isAssembling ? "" : ""}`}>
            {isCompiling && !isQA ? "⟳" : (isQA || isPassed) ? "✓" : "○"} Compiling PDF
          </div>
          <div className={`compile-step ${isPassed ? "done" : isQA || isRetry ? "active" : ""}`}>
            {isQA && !isPassed ? "⟳" : isPassed ? "✓" : "○"} QA Review
          </div>
          {isRetry && (
            <div className="compile-step active retry">
              ⟳ Fixing issues and recompiling...
            </div>
          )}
        </div>
        {isQA && !isPassed && (
          <p className="compile-hint">
            QA agent is checking the PDF for formatting issues...
          </p>
        )}
        {isRetry && (
          <p className="compile-hint retry-hint">
            Found issues — adjusting bullets and recompiling
          </p>
        )}
      </div>
    </div>
  );
}
