"use client";

import { useMemo, useState, useEffect } from "react";
import { useTailorStore } from "@/lib/tailorStore";
import TrackModal from "@/components/applications/TrackModal";
import { useAuth } from "@/lib/auth-context";

export default function StepDone() {
  const { result, selectedContent, reset, runId, skillRows, parsedJD, jdText } = useTailorStore();
  const { user } = useAuth();

  // Finalize run in DB when done step mounts — always runs, even on QA fail (2 pages)
  useEffect(() => {
    if (!runId || !result || !user?.uid) return;

    const uid = user.uid;
    const coName = parsedJD?.company_name ?? null;
    const roleName = parsedJD?.role_title ?? null;

    // 1. Save all run metadata
    fetch(`/api/pipeline/${runId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-user-id": uid },
      body: JSON.stringify({
        status: "done",
        page_count: result.page_count ?? null,
        selected_content: selectedContent ?? null,
        skill_rows: skillRows ?? null,
        jd_text: jdText ?? null,
        parsed_jd: parsedJD ?? null,
        company: coName,
        role: roleName,
      }),
    });

    // 2. Save PDF base64 to DB (blob store is private, serve via /api/pipeline/[runId]/pdf)
    if (result.pdf_base64) {
      fetch(`/api/pipeline/${runId}/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": uid },
        body: JSON.stringify({ pdf_base64: result.pdf_base64 }),
      }).catch(e => console.error("PDF save failed:", e));
    }
  }, [runId]); // eslint-disable-line react-hooks/exhaustive-deps
  const [showModal, setShowModal] = useState(false);
  const [tracked, setTracked] = useState(false);

  // Create a blob URL from the base64 PDF
  const pdfUrl = useMemo(() => {
    if (!result?.pdf_base64) return null;
    try {
      const bytes = Uint8Array.from(atob(result.pdf_base64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/pdf" });
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  }, [result?.pdf_base64]);

  // Fallback to /api/file for local dev
  const viewUrl = pdfUrl
    ? pdfUrl
    : result?.pdf_path
      ? `/api/file?path=${encodeURIComponent(result.pdf_path)}`
      : null;

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
          {passed ? (
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M8 16L14 22L24 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <span>!</span>
          )}
        </div>
        <h2 className="done-headline">
          {passed ? "Resume Ready" : "Resume Generated"}
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
          {viewUrl && (
            <a href={viewUrl} target="_blank" rel="noopener noreferrer" className="step-cta">
              View PDF
            </a>
          )}
          {pdfUrl && (
            <a href={pdfUrl} download="resume.pdf" className="step-cta secondary">
              Download PDF
            </a>
          )}
          <button className="step-cta secondary" onClick={reset}>
            Start Over
          </button>
        </div>

        {/* Track as Application */}
        <div className="done-track-section">
          {tracked ? (
            <div className="done-tracked-confirm">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Saved to Application Tracker
            </div>
          ) : (
            <button className="done-track-btn" onClick={() => setShowModal(true)}>
              Track as Application
            </button>
          )}
        </div>
      </div>

      {showModal && (
        <TrackModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); setTracked(true); }}
        />
      )}
    </div>
  );
}
