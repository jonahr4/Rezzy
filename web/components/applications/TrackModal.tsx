"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTailorStore } from "@/lib/tailorStore";

interface TrackModalProps {
  onClose: () => void;
  onSaved: () => void;
}

export default function TrackModal({ onClose, onSaved }: TrackModalProps) {
  const { user } = useAuth();
  const { result, parsedJD, jdText, skillRows } = useTailorStore();

  const [company, setCompany] = useState(parsedJD?.company_name ?? "");
  const [role, setRole] = useState(parsedJD?.role_title ?? "");
  const [jobUrl, setJobUrl] = useState("");
  const [dateApplied, setDateApplied] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company.trim() || !role.trim()) {
      setError("Company and role are required.");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(user?.uid ? { "x-user-id": user.uid } : {}),
        },
        body: JSON.stringify({
          company: company.trim(),
          role: role.trim(),
          job_url: jobUrl.trim() || null,
          date_applied: dateApplied,
          status: 'applied',
          notes: notes.trim() || null,
          pdf_base64: result?.pdf_base64 ?? null,
          jd_text: jdText ?? null,
          parsed_jd: parsedJD ?? null,
          skill_rows: skillRows ?? null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }

      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card track-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Track Application</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="track-field">
            <label className="track-label">Company *</label>
            <input
              className="track-input"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Google"
              required
            />
          </div>

          <div className="track-field">
            <label className="track-label">Role *</label>
            <input
              className="track-input"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Software Engineer Intern"
              required
            />
          </div>

          <div className="track-field">
            <label className="track-label">Job Posting URL</label>
            <input
              className="track-input"
              type="url"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="track-field">
            <label className="track-label">Date Applied</label>
            <input
              className="track-input"
              type="date"
              value={dateApplied}
              onChange={(e) => setDateApplied(e.target.value)}
            />
          </div>

          <div className="track-field">
            <label className="track-label">Notes</label>
            <textarea
              className="track-input track-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about the application..."
              rows={3}
            />
          </div>

          {result?.pdf_base64 && (
            <div className="track-pdf-notice">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7L5.5 10.5L12 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Resume PDF will be saved to your tracker
            </div>
          )}

          {error && <p className="track-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="step-cta secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="step-cta" disabled={saving}>
              {saving ? "Saving..." : "Save Application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
