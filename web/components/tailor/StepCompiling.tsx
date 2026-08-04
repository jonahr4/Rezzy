"use client";

import { useTailorStore } from "@/lib/tailorStore";

export default function StepCompiling() {
  const { loading, loadingMessage } = useTailorStore();

  return (
    <div className="step-inner step-compiling">
      <div className="step-content-centered">
        <div className="compile-animation">
          <div className="compile-ring" />
          <div className="compile-ring delay" />
          <div className="compile-icon">📄</div>
        </div>
        <h2 className="compile-text">
          {loading ? loadingMessage : "Compiling your resume..."}
        </h2>
        <div className="compile-steps">
          <div className="compile-step done">✓ Entries selected</div>
          <div className="compile-step done">✓ Bullets chosen</div>
          <div className="compile-step done">✓ Suggestions applied</div>
          <div className={`compile-step ${loading ? "active" : "done"}`}>
            {loading ? "⟳" : "✓"} Assembling LaTeX & compiling PDF
          </div>
        </div>
      </div>
    </div>
  );
}
