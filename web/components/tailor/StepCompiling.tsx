"use client";

import { useTailorStore } from "@/lib/tailorStore";

const COMPILE_TIPS = [
  "Your resume is being compiled with LaTeX for pixel-perfect formatting",
  "The QA system checks that your resume fits on exactly one page",
  "If the resume is too long, bullets are trimmed and recompiled automatically",
  "Tectonic compiles LaTeX without requiring a full TeX Live installation",
  "Each compile run is saved with a timestamped directory for your records",
];

export default function StepCompiling() {
  const { loadingMessage, qaAttempts } = useTailorStore();

  const message = loadingMessage || "Starting compilation...";
  const isCompiling = message.includes("Compiling PDF") || message.includes("compiling");
  const isQA = message.includes("QA") || message.includes("qa") || message.includes("checking");
  const isFixing = message.includes("Fixing") || message.includes("recompiling") || message.includes("Trimming");
  const isPassed = message.includes("passed");

  const stageIndex = isPassed ? 3 : isQA || isFixing ? 2 : isCompiling ? 1 : 0;

  return (
    <div className="step-inner step-compiling">
      <div className="step-content-centered">
        <div className="compile-spinner">
          <div className="compile-spinner-ring" />
        </div>

        <div className="compile-pipeline">
          {["Assembling LaTeX", "Compiling PDF", "QA Review"].map((label, i) => (
            <div key={label} className={`compile-stage ${i < stageIndex ? "done" : i === stageIndex ? "active" : ""}`}>
              <div className="compile-stage-dot">
                {i < stageIndex ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <span className="compile-stage-label">{label}</span>
            </div>
          ))}
        </div>

        <p className="compile-status">{message}</p>

        {qaAttempts.length > 0 && (
          <div className="compile-qa-log">
            {qaAttempts.map((qa) => (
              <div key={qa.attempt} className={`compile-qa-entry ${qa.verdict.toLowerCase()}`}>
                <span className="compile-qa-badge">
                  {qa.verdict === "PASS" ? "Pass" : `Attempt ${qa.attempt}`}
                </span>
                {qa.feedback && (
                  <span className="compile-qa-feedback">{qa.feedback}</span>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="compile-tip">
          {COMPILE_TIPS[Math.floor(Date.now() / 5000) % COMPILE_TIPS.length]}
        </p>
      </div>
    </div>
  );
}
