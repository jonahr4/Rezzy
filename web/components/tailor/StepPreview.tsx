"use client";

import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { pipelineHeaders } from "@/lib/pipeline-headers";
import { useTailorStore } from "@/lib/tailorStore";
import PageGauge from "./PageGauge";

const API_URL = "/api/pipeline/step";

/* ── Grip icon SVG ────────────────────────────── */

function GripIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="currentColor"
    >
      <circle cx="4" cy="2" r="1.2" />
      <circle cx="8" cy="2" r="1.2" />
      <circle cx="4" cy="6" r="1.2" />
      <circle cx="8" cy="6" r="1.2" />
      <circle cx="4" cy="10" r="1.2" />
      <circle cx="8" cy="10" r="1.2" />
    </svg>
  );
}

/* ── Editable skill chip ─────────────────────── */

function EditableSkill({
  skill,
  rowId,
  onUpdate,
  onRemove,
  readOnly,
}: {
  skill: string;
  rowId: string;
  onUpdate: (rowId: string, oldSkill: string, newSkill: string) => void;
  onRemove: (rowId: string, skill: string) => void;
  readOnly: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(skill);

  if (readOnly) return <>{skill}</>;

  if (editing) {
    return (
      <input
        className="preview-skill-edit-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft.trim() && draft.trim() !== skill) onUpdate(rowId, skill, draft.trim());
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (draft.trim() && draft.trim() !== skill) onUpdate(rowId, skill, draft.trim());
            setEditing(false);
          }
          if (e.key === "Escape") { setDraft(skill); setEditing(false); }
        }}
        autoFocus
        style={{ width: `${Math.max(draft.length, 4)}ch` }}
      />
    );
  }

  return (
    <span
      className="preview-skill-editable"
      onClick={() => { setDraft(skill); setEditing(true); }}
    >
      {skill}
      <button
        className="preview-skill-x"
        onClick={(e) => { e.stopPropagation(); onRemove(rowId, skill); }}
        title="Remove skill"
      >
        ×
      </button>
    </span>
  );
}

/* ── Editable bullet ─────────────────────────── */

function EditableBullet({
  text,
  onSave,
  onRemove,
  readOnly,
}: {
  text: string;
  onSave: (newText: string) => void;
  onRemove: () => void;
  readOnly: boolean;
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
            if (!draft.trim()) { onRemove(); return; }
            if (draft.trim() !== text) onSave(draft.trim());
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!draft.trim()) { onRemove(); return; }
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
      {!readOnly && (
        <button
          className="preview-bullet-delete"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          title="Remove bullet"
        >
          ×
        </button>
      )}
    </li>
  );
}


/* ── Drag-and-drop hooks ─────────────────────── */

/**
 * Generic drag-and-drop hook for reordering items.
 * Returns drag handlers and the current drop target index.
 */
function useDragReorder(onReorder: (from: number, to: number) => void) {
  const dragIdx = useRef<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, idx: number) => {
    dragIdx.current = idx;
    e.dataTransfer.effectAllowed = "move";
    // Set a transparent drag image to avoid the default ghost
    const el = e.currentTarget as HTMLElement;
    el.classList.add("dragging");
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).classList.remove("dragging");
    dragIdx.current = null;
    setDropIdx(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropIdx(idx);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx.current !== null && dragIdx.current !== idx) {
      onReorder(dragIdx.current, idx);
    }
    dragIdx.current = null;
    setDropIdx(null);
  }, [onReorder]);

  const handleDragLeave = useCallback(() => {
    setDropIdx(null);
  }, []);

  return { dragIdx, dropIdx, handleDragStart, handleDragEnd, handleDragOver, handleDrop, handleDragLeave };
}


/* ── Main StepPreview ─────────────────────────── */

export default function StepPreview() {
  const {
    selectedContent,
    skillRows,
    parsedJD,
    currentStep,
    loading,
    updateBulletText,
    updateSkillItem,
    removeSkillItem,
    reorderEntries,
    reorderBullets,
    reorderSkillRows,
    setLoading,
    setResult,
    advanceStep,
  } = useTailorStore();
  const { user } = useAuth();

  const isReadOnly = currentStep > 6;
  const jobs = selectedContent.filter((e) => e.type === "job");
  const projects = selectedContent.filter((e) => e.type === "project");

  /* ── Entry drag handlers ─────────────────────── */

  const jobDrag = useDragReorder(
    useCallback((from: number, to: number) => reorderEntries("job", from, to), [reorderEntries])
  );
  const projectDrag = useDragReorder(
    useCallback((from: number, to: number) => reorderEntries("project", from, to), [reorderEntries])
  );

  /* ── Skill row drag ─────────────────────────── */

  const skillDrag = useDragReorder(
    useCallback((from: number, to: number) => reorderSkillRows(from, to), [reorderSkillRows])
  );

  /* ── Compile handler ─────────────────────────── */

  const handleCompile = async () => {
    setLoading(true, "Assembling LaTeX and compiling PDF...");
    useTailorStore.setState({ qaAttempts: [] });
    advanceStep(); // → step 7 (Compiling)

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: pipelineHeaders(user?.uid),
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
                pdf_base64: eventData.pdf_base64 || null,
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

  /* ── Render a draggable entry ─────────────────── */

  const renderEntry = (
    entry: (typeof selectedContent)[0],
    idx: number,
    drag: ReturnType<typeof useDragReorder>,
    showCompany: boolean,
  ) => (
    <div
      key={entry.entry_id}
      className={`preview-entry preview-draggable ${drag.dropIdx === idx ? "drop-target" : ""}`}
      draggable={!isReadOnly}
      onDragStart={(e) => drag.handleDragStart(e, idx)}
      onDragEnd={drag.handleDragEnd}
      onDragOver={(e) => drag.handleDragOver(e, idx)}
      onDrop={(e) => drag.handleDrop(e, idx)}
      onDragLeave={drag.handleDragLeave}
    >
      <div className="preview-entry-header">
        {!isReadOnly && (
          <span className="drag-handle" title="Drag to reorder">
            <GripIcon />
          </span>
        )}
        <div className="preview-entry-left">
          <div className="preview-entry-title">{entry.title}</div>
          {showCompany && (
            <div className="preview-entry-company">
              {entry.company}
              {entry.tagline ? ` — ${entry.tagline}` : ""}
            </div>
          )}
          {!showCompany && entry.tagline && (
            <div className="preview-entry-company">{entry.tagline}</div>
          )}
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
      <BulletList entry={entry} isReadOnly={isReadOnly} />
    </div>
  );

  return (
    <div className="step-inner step-preview">
      <div className="step-header-bar">
        <div>
          <h2 className="step-title">Review &amp; Edit</h2>
          <p className="step-desc">
            Click any bullet to edit. Drag the grip handles to reorder entries and bullets.
          </p>
        </div>
        <div className="step-header-right">
          {!isReadOnly && (
            <button className="step-cta" onClick={handleCompile}>
              Compile Resume →
            </button>
          )}
          <PageGauge />
        </div>
      </div>

      {/* ── Resume preview card ── */}
      <div className="preview-resume">
        {/* Skills section */}
        <div className="preview-section">
          <div className="preview-section-header">Technical Skills</div>
          <div className="preview-skills">
            {skillRows.map((row, rowIdx) =>
              row.items.length > 0 ? (
                <div
                  key={row.id}
                  className={`preview-skill-line preview-draggable ${skillDrag.dropIdx === rowIdx ? "drop-target" : ""}`}
                  draggable={!isReadOnly}
                  onDragStart={(e) => skillDrag.handleDragStart(e, rowIdx)}
                  onDragEnd={skillDrag.handleDragEnd}
                  onDragOver={(e) => skillDrag.handleDragOver(e, rowIdx)}
                  onDrop={(e) => skillDrag.handleDrop(e, rowIdx)}
                  onDragLeave={skillDrag.handleDragLeave}
                >
                  {!isReadOnly && (
                    <span className="drag-handle drag-handle-sm" title="Drag to reorder">
                      <GripIcon />
                    </span>
                  )}
                  <span className="preview-skill-label">{row.label}:</span>{" "}
                  <span className="preview-skill-items">
                    {row.items.map((skill, i) => (
                      <span key={skill}>
                        <EditableSkill
                          skill={skill}
                          rowId={row.id}
                          onUpdate={updateSkillItem}
                          onRemove={removeSkillItem}
                          readOnly={isReadOnly}
                        />
                        {i < row.items.length - 1 && ", "}
                      </span>
                    ))}
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
            {jobs.map((entry, idx) => renderEntry(entry, idx, jobDrag, true))}
          </div>
        )}

        {/* Projects section */}
        {projects.length > 0 && (
          <div className="preview-section">
            <div className="preview-section-header">Projects</div>
            {projects.map((entry, idx) => renderEntry(entry, idx, projectDrag, false))}
          </div>
        )}
      </div>
    </div>
  );
}


/* ── Bullet list with drag reorder ─────────────── */

function BulletList({
  entry,
  isReadOnly,
}: {
  entry: { entry_id: string; selected_bullets: { id: string; text: string }[] };
  isReadOnly: boolean;
}) {
  const { updateBulletText, reorderBullets, removeBullet, addBullet } = useTailorStore();

  const bulletDrag = useDragReorder(
    useCallback(
      (from: number, to: number) => reorderBullets(entry.entry_id, from, to),
      [reorderBullets, entry.entry_id]
    )
  );

  return (
    <ul className="preview-bullets">
      {entry.selected_bullets.map((b, idx) => (
        <div
          key={b.id}
          className={`preview-bullet-row preview-draggable ${bulletDrag.dropIdx === idx ? "drop-target" : ""}`}
          draggable={!isReadOnly}
          onDragStart={(e) => bulletDrag.handleDragStart(e, idx)}
          onDragEnd={bulletDrag.handleDragEnd}
          onDragOver={(e) => bulletDrag.handleDragOver(e, idx)}
          onDrop={(e) => bulletDrag.handleDrop(e, idx)}
          onDragLeave={bulletDrag.handleDragLeave}
        >
          {!isReadOnly && (
            <span className="drag-handle drag-handle-bullet" title="Drag to reorder">
              <GripIcon />
            </span>
          )}
          <EditableBullet
            text={b.text}
            onSave={(newText) => updateBulletText(entry.entry_id, b.id, newText)}
            onRemove={() => removeBullet(entry.entry_id, b.id)}
            readOnly={isReadOnly}
          />
        </div>
      ))}
      {!isReadOnly && (
        <button
          className="preview-add-bullet"
          onClick={() => addBullet(entry.entry_id)}
          title="Add a new bullet point"
        >
          + Add bullet
        </button>
      )}
    </ul>
  );
}
