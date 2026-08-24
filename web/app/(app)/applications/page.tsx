"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useDataStore } from "@/lib/dataStore";
import AppDetailPanel, {
  Application,
  AppStatus,
  STATUS_CONFIG,
  STATUS_ORDER,
} from "@/components/applications/AppDetailPanel";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ApplicationsPage() {
  const { user } = useAuth();
  const { applications: cachedApps, setApplications: setApps } = useDataStore();
  const apps = cachedApps || [];
  const [loading, setLoading] = useState(!cachedApps);
  const [selected, setSelected] = useState<Application | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<AppStatus | null>(null);
  const dragNode = useRef<EventTarget | null>(null);

  const fetchApps = useCallback(async () => {
    if (!user) return;
    if (cachedApps) { setLoading(false); return; }
    const res = await fetch("/api/applications", {
      headers: { "x-user-id": user.uid },
    });
    const data = await res.json();
    setApps(data.applications ?? []);
    setLoading(false);
  }, [user, cachedApps, setApps]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  // Keep selected in sync when apps update
  useEffect(() => {
    if (selected) {
      const updated = apps.find((a) => a.id === selected.id);
      if (updated) setSelected(updated);
    }
  }, [apps]); // eslint-disable-line react-hooks/exhaustive-deps

  async function updateStatus(id: string, status: AppStatus) {
    setApps((prev: Application[]) => prev.map((a: Application) => (a.id === id ? { ...a, status } : a)));
    if (selected?.id === id) setSelected((s) => s ? { ...s, status } : s);
    await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(user?.uid ? { "x-user-id": user.uid } : {}) },
      body: JSON.stringify({ status }),
    });
  }

  function onUpdate(id: string, fields: Partial<Application>) {
    setApps((prev: Application[]) => prev.map((a: Application) => (a.id === id ? { ...a, ...fields } : a)));
    if (selected?.id === id) setSelected((s) => s ? { ...s, ...fields } : s);
  }

  function onDelete(id: string) {
    setApps((prev: Application[]) => prev.filter((a: Application) => a.id !== id));
    setSelected(null);
  }

  // Drag and drop
  function handleDragStart(e: React.DragEvent, id: string) {
    setDragId(id);
    dragNode.current = e.target;
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, col: AppStatus) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCol(col);
  }

  function handleDrop(e: React.DragEvent, col: AppStatus) {
    e.preventDefault();
    if (dragId) {
      const app = apps.find((a) => a.id === dragId);
      if (app && app.status !== col) updateStatus(dragId, col);
    }
    setDragId(null);
    setDragOverCol(null);
  }

  function handleDragEnd() {
    setDragId(null);
    setDragOverCol(null);
  }

  const [search, setSearch] = useState("");

  const totalApps = apps.length;

  // Filter apps by search query (company, role, or skills)
  const query = search.trim().toLowerCase();
  const filteredApps = query
    ? apps.filter((a) =>
        a.company.toLowerCase().includes(query) ||
        a.role.toLowerCase().includes(query) ||
        (a.jd_skills ?? []).some((s: string) => s.toLowerCase().includes(query))
      )
    : apps;

  return (
    <div className={`kanban-shell ${selected ? "detail-open" : ""}`}>
      {/* Page header */}
      <div className="kanban-header">
        <div>
          <h1 className="page-title" style={{ marginBottom: 2 }}>Application Tracker</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            {totalApps} application{totalApps !== 1 ? "s" : ""} tracked
            {query && ` · ${filteredApps.length} matching`}
          </p>
        </div>
        <div className="kanban-search-wrap">
          <svg className="kanban-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="kanban-search-input"
            type="text"
            placeholder="Search company, role, or skill\u2026"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="kanban-search-clear" onClick={() => setSearch("")} title="Clear search">
              \u00d7
            </button>
          )}
        </div>
      </div>

      <div className="kanban-layout">
        {/* Board */}
        <div className="kanban-board">
          {STATUS_ORDER.map((status) => {
            const cfg = STATUS_CONFIG[status];
            const colApps = filteredApps.filter((a) => a.status === status);
            const isOver = dragOverCol === status;

            return (
              <div
                key={status}
                className={`kanban-col ${isOver ? "drag-over" : ""}`}
                onDragOver={(e) => handleDragOver(e, status)}
                onDrop={(e) => handleDrop(e, status)}
                onDragLeave={() => setDragOverCol(null)}
              >
                {/* Column header */}
                <div className="kanban-col-header">
                  <div className="kanban-col-title-row">
                    <span className="kanban-col-dot" style={{ background: cfg.color }} />
                    <span className="kanban-col-name">{cfg.label}</span>
                    <span className="kanban-col-count">{colApps.length}</span>
                  </div>
                </div>

                {/* Cards */}
                <div className="kanban-cards">
                  {loading && (
                    <div className="kanban-skeleton">
                      <div className="kanban-skeleton-card" />
                      <div className="kanban-skeleton-card" />
                    </div>
                  )}
                  {!loading && colApps.length === 0 && (
                    <div className="kanban-empty-col">Drop here</div>
                  )}
                  {colApps.map((app) => {
                    const isSelected = selected?.id === app.id;
                    const isDragging = dragId === app.id;
                    return (
                      <div
                        key={app.id}
                        className={`kanban-card ${isSelected ? "selected" : ""} ${isDragging ? "dragging" : ""}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, app.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setSelected(isSelected ? null : app)}
                      >
                        <div className="kanban-card-company">{app.company}</div>
                        <div className="kanban-card-role">{app.role}</div>
                        <div className="kanban-card-footer-row">
                          <span className="kanban-card-date">{formatDate(app.date_applied)}</span>
                          <div className="kanban-card-icons">
                            {(app.pdf_blob_url || app.run_id) && (
                              <span className="kanban-card-icon" title="Has resume PDF">
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <path d="M2 1h5l3 3v7H2V1Z" stroke="currentColor" strokeWidth="1.1"/>
                                  <path d="M7 1v3h3" stroke="currentColor" strokeWidth="1.1"/>
                                </svg>
                              </span>
                            )}
                            {app.job_url && (
                              <span className="kanban-card-icon" title="Has job link">
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <path d="M5 2H2v8h8V7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                                  <path d="M7 2h3v3M7 5l3-3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                                </svg>
                              </span>
                            )}
                          </div>
                        </div>
                        {app.jd_skills && app.jd_skills.length > 0 && (
                          <div className="kanban-card-skills">
                            {app.jd_skills.slice(0, 3).map((s: string, i: number) => (
                              <span key={i} className="kanban-card-skill">{s}</span>
                            ))}
                            {app.jd_skills.length > 3 && (
                              <span className="kanban-card-skill muted">+{app.jd_skills.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        {selected && (
          <AppDetailPanel
            app={selected}
            onClose={() => setSelected(null)}
            onStatusChange={updateStatus}
            onDelete={onDelete}
            onUpdate={onUpdate}
          />
        )}
      </div>
    </div>
  );
}
