"use client";

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

export type AppStatus = "need_to_apply" | "applied" | "interviewing" | "offer" | "rejected";

export interface Application {
  id: string;
  company: string;
  role: string;
  job_url: string | null;
  date_applied: string;
  status: AppStatus;
  notes: string | null;
  pdf_blob_url: string | null;
  run_id: string | null;
  jd_text: string | null;
  jd_summary: string | null;
  jd_skills: string[];
  created_at: string;
}

export const STATUS_CONFIG: Record<AppStatus, { label: string; color: string; bg: string }> = {
  need_to_apply: { label: "Need to Apply", color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
  applied:       { label: "Applied",       color: "var(--accent)", bg: "rgba(201,149,98,0.1)" },
  interviewing:  { label: "Interviewing",  color: "#7c3aed", bg: "rgba(124,58,237,0.1)" },
  offer:         { label: "Offer",         color: "#059669", bg: "rgba(5,150,105,0.1)" },
  rejected:      { label: "Rejected",      color: "#dc2626", bg: "rgba(220,38,38,0.1)" },
};

export const STATUS_ORDER: AppStatus[] = ["need_to_apply", "applied", "interviewing", "offer", "rejected"];

interface Props {
  app: Application;
  onClose: () => void;
  onStatusChange: (id: string, status: AppStatus) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, fields: Partial<Application>) => void;
}

// Small inline editable field component
function InlineField({
  label, value, type = "text", placeholder, multiline, onSave,
}: {
  label: string;
  value: string;
  type?: string;
  placeholder?: string;
  multiline?: boolean;
  onSave: (val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => { setDraft(value); }, [value]);

  function commit() {
    setEditing(false);
    if (draft !== value) onSave(draft);
  }

  if (editing) {
    return (
      <div className="inline-field editing">
        <div className="detail-section-label">{label}</div>
        {multiline ? (
          <textarea
            className="detail-notes-input"
            value={draft}
            autoFocus
            rows={4}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
          />
        ) : (
          <input
            className="inline-field-input"
            type={type}
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="inline-field" onClick={() => setEditing(true)} title="Click to edit">
      <div className="detail-section-label">
        {label}
        <span className="inline-edit-hint">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M7 1.5l1.5 1.5L3 8.5H1.5V7L7 1.5Z" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
          </svg>
        </span>
      </div>
      <div className="inline-field-value">{value || <span className="inline-field-empty">{placeholder ?? "Click to add…"}</span>}</div>
    </div>
  );
}

export default function AppDetailPanel({ app, onClose, onStatusChange, onDelete, onUpdate }: Props) {
  const { user } = useAuth();
  const [jdExpanded, setJdExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const patch = useCallback(async (fields: Partial<Application>) => {
    await fetch(`/api/applications/${app.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(user?.uid ? { "x-user-id": user.uid } : {}) },
      body: JSON.stringify(fields),
    });
    onUpdate(app.id, fields);
  }, [app.id, user, onUpdate]);

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/applications/${app.id}`, {
      method: "DELETE",
      headers: { ...(user?.uid ? { "x-user-id": user.uid } : {}) },
    });
    onDelete(app.id);
  }

  return (
    <div className="detail-panel">
      {/* Header — company & role are inline-editable */}
      <div className="detail-panel-header">
        <div className="detail-panel-title-block">
          <InlineField
            label=""
            value={app.company}
            placeholder="Company name"
            onSave={(v) => patch({ company: v })}
          />
          <div style={{ marginTop: -4 }}>
            <InlineField
              label=""
              value={app.role}
              placeholder="Role title"
              onSave={(v) => patch({ role: v })}
            />
          </div>
        </div>
        <button className="detail-panel-close" onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div className="detail-panel-body">
        {/* Status */}
        <div className="detail-section">
          <div className="detail-section-label">Status</div>
          <div className="detail-status-pills">
            {STATUS_ORDER.map((s) => {
              const c = STATUS_CONFIG[s];
              const active = app.status === s;
              return (
                <button
                  key={s}
                  className={`detail-status-pill ${active ? "active" : ""}`}
                  style={active ? { background: c.bg, color: c.color, borderColor: c.color } : {}}
                  onClick={() => onStatusChange(app.id, s)}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Date applied (editable) + Job URL (editable) */}
        <div className="detail-section detail-two-col">
          <InlineField
            label="Date Applied"
            value={app.date_applied ? app.date_applied.split("T")[0] : ""}
            type="date"
            onSave={(v) => patch({ date_applied: v })}
          />
          <InlineField
            label="Job URL"
            value={app.job_url ?? ""}
            type="url"
            placeholder="Paste job posting URL…"
            onSave={(v) => patch({ job_url: v || null } as Partial<Application>)}
          />
        </div>

        {/* Job URL quick-link if set */}
        {app.job_url && (
          <a href={app.job_url} target="_blank" rel="noopener noreferrer" className="detail-link-btn" style={{ alignSelf: "flex-start" }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M5 2H2v8h8V7M7 2h3v3M7 5l3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            Open Job Posting
          </a>
        )}

        {/* PDF — serve via pipeline PDF route using run_id */}
        {app.run_id && (() => {
          const pdfSrc = `/api/pipeline/${app.run_id}/pdf${user?.uid ? `?uid=${user.uid}` : ''}`;
          return (
            <div className="detail-section">
              <div className="detail-section-label">
                Resume PDF
                <div className="detail-pdf-actions">
                  <a href={pdfSrc} target="_blank" rel="noopener noreferrer" className="detail-pdf-action-btn">View</a>
                  <a href={pdfSrc} download="resume.pdf" className="detail-pdf-action-btn">Download</a>
                </div>
              </div>
              <div className="detail-pdf-frame">
                <iframe src={pdfSrc} title="Resume PDF" className="detail-pdf-iframe" />
              </div>
            </div>
          );
        })()}

        {/* Skills */}
        {app.jd_skills && app.jd_skills.length > 0 && (
          <div className="detail-section">
            <div className="detail-section-label">Job Skills</div>
            <div className="detail-skills-wrap">
              {app.jd_skills.map((skill: string, i: number) => (
                <span key={i} className="detail-skill-chip">{skill}</span>
              ))}
            </div>
          </div>
        )}

        {/* Job Summary */}
        {app.jd_summary && (
          <div className="detail-section">
            <div className="detail-section-label">Job Summary</div>
            <p className="detail-jd-summary">{app.jd_summary}</p>
          </div>
        )}

        {/* Notes — editable inline */}
        <InlineField
          label="Notes"
          value={app.notes ?? ""}
          placeholder="Add notes about this application…"
          multiline
          onSave={(v) => patch({ notes: v || null } as Partial<Application>)}
        />

        {/* JD collapsible */}
        {app.jd_text && (
          <div className="detail-section">
            <button className="detail-jd-toggle" onClick={() => setJdExpanded(!jdExpanded)}>
              <span className="detail-section-label" style={{ marginBottom: 0 }}>Job Description</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                style={{ transform: jdExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </button>
            {jdExpanded && <div className="detail-jd-text">{app.jd_text}</div>}
          </div>
        )}

        {/* Delete */}
        <div className="detail-section detail-footer">
          <button className="detail-delete-btn" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete Application"}
          </button>
        </div>
      </div>
    </div>
  );
}
