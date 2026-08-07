"use client";

import { useState } from "react";
import { useTailorStore } from "@/lib/tailorStore";
import WordBudget from "./WordBudget";

const API_URL = "/api/pipeline";

/* ── Editable bullet ─────────────────────────── */

function EditableBullet({
  text,
  onSave,
}: {
  text: string;
  onSave: (newText: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);

  if (editing) {
    return (
      <li className="preview-bullet editing">
        <textarea
          className="preview-bullet-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft.trim() !== text) onSave(draft.trim());
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (draft.trim() !== text) onSave(draft.trim());
              setEditing(false);
            }
            if (e.key === "Escape") {
              setDraft(text);
              setEditing(false);
            }
          }}
          autoFocus
          rows={2}
        />
      </li>
    );
  }

  return (
    <li className="preview-bullet" onClick={() => { setDraft(text); setEditing(true); }}>
      {text}
    </li>
  );
}

/* ── Main StepPreview ─────────────────────────── */

export default function StepPreview() {
  const {
    selectedContent,
    skillRows,
    parsedJD,
    currentStep,
    loading,
    loadingMessage,
    updateBulletText,
    setLoading,
    setResult,
    advanceStep,
  } = useTailorStore();

  const isReadOnly = currentStep > 6;
  const jobs = selectedContent.filter((e) => e.type === "job");
  const projects = selectedContent.filter((e) => e.type === "project");

  /* ── Compile handler ─────────────────────────── */

  const handleCompile = async () => {
    setLoading(true, "Assembling LaTeX and compiling PDF...");
    useTailorStore.setState({ qaAttempts: [] });
    advanceStep(); // → step 7 (Compiling)

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "compile",
          selected_content: useTailorStore.getState().selectedContent,
          parsed_jd: parsedJD,
          skill_rows: useTailorStore.getState().skillRows,
        }),
      });

      if (!res.ok) throw new Error("Compile request failed");

      // Read SSE stream for live updates
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE events
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || ""; // keep incomplete event in buffer

          for (const block of lines) {
            const eventMatch = block.match(/^event: (.+)$/m);
            const dataMatch = block.match(/^data: (.+)$/m);
            if (!eventMatch || !dataMatch) continue;

            const eventType = eventMatch[1];
            const eventData = JSON.parse(dataMatch[1]);

            if (eventType === "progress") {
              setLoading(true, eventData.message);
            } else if (eventType === "qa_result") {
              useTailorStore.getState().addQaAttempt({
                attempt: eventData.attempt,
                verdict: eventData.verdict,
                message: eventData.message,
                feedback: eventData.feedback,
                preview: eventData.preview,
              });
              setLoading(true, eventData.message);
            } else if (eventType === "done") {
              setResult({
                pdf_path: eventData.pdf_path,
                page_count: eventData.page_count,
                qa_feedback: eventData.qa_feedback,
                run_dir: eventData.run_dir,
                latex_source: eventData.latex_source,
              });
              advanceStep(); // → step 8 (Done)
            }
          }
        }
      }
    } catch (err) {
      console.error("Compile failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="step-inner step-preview">
      <WordBudget />

      <div className="step-header-bar">
        <div>
          <h2 className="step-title">Review & Edit</h2>
          <p className="step-desc">
            Click any bullet to edit. This is your final review before compilation.
          </p>
        </div>
        {!isReadOnly && (
          <button className="step-cta" onClick={handleCompile}>
            Compile Resume →
          </button>
        )}
      </div>

      {/* ── Resume preview card ── */}
      <div className="preview-resume">
        {/* Skills section */}
        <div className="preview-section">
          <div className="preview-section-header">Technical Skills</div>
          <div className="preview-skills">
            {skillRows.map((row) =>
              row.items.length > 0 ? (
                <div key={row.id} className="preview-skill-line">
                  <span className="preview-skill-label">{row.label}:</span>{" "}
                  <span className="preview-skill-items">
                    {row.items.join(", ")}
                  </span>
                </div>
              ) : null
            )}
          </div>
        </div>

        {/* Experience section */}
        {jobs.length > 0 && (
          <div className="preview-section">
            <div className="preview-section-header">Experience</div>
            {jobs.map((entry) => (
              <div key={entry.entry_id} className="preview-entry">
                <div className="preview-entry-header">
                  <div className="preview-entry-left">
                    <div className="preview-entry-title">{entry.title}</div>
                    <div className="preview-entry-company">
                      {entry.company}
                      {entry.tagline ? ` — ${entry.tagline}` : ""}
                    </div>
                  </div>
                  <div className="preview-entry-right">
                    <div className="preview-entry-dates">
                      {entry.start_date} – {entry.end_date}
                    </div>
                    {entry.location && (
                      <div className="preview-entry-location">{entry.location}</div>
                    )}
                  </div>
                </div>
                <ul className="preview-bullets">
                  {entry.selected_bullets.map((b) => (
                    <EditableBullet
                      key={b.id}
                      text={b.text}
                      onSave={(newText) => updateBulletText(entry.entry_id, b.id, newText)}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Projects section */}
        {projects.length > 0 && (
          <div className="preview-section">
            <div className="preview-section-header">Projects</div>
            {projects.map((entry) => (
              <div key={entry.entry_id} className="preview-entry">
                <div className="preview-entry-header">
                  <div className="preview-entry-left">
                    <div className="preview-entry-title">{entry.title}</div>
                    {entry.tagline && (
                      <div className="preview-entry-company">{entry.tagline}</div>
                    )}
                  </div>
                  <div className="preview-entry-right">
                    <div className="preview-entry-dates">
                      {entry.start_date} – {entry.end_date}
                    </div>
                  </div>
                </div>
                <ul className="preview-bullets">
                  {entry.selected_bullets.map((b) => (
                    <EditableBullet
                      key={b.id}
                      text={b.text}
                      onSave={(newText) => updateBulletText(entry.entry_id, b.id, newText)}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
