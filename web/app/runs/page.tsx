"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import type { RunEntry, RunStatus } from "@/lib/types";
import DocModal from "@/components/DocModal";

type DocType = "pdf" | "md" | "json" | "text";

interface ModalState {
  open: boolean;
  title: string;
  url: string;
  type: DocType;
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return (
      d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
      " " +
      d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    );
  } catch {
    return iso;
  }
}

function RunsList({
  runs,
  selectedId,
  onSelect,
}: {
  runs: RunEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (!runs.length) {
    return (
      <div className="runs-empty">
        No runs yet.
        <br />
        <small>Run python main.py --jd data/sample_jd_backend.txt</small>
      </div>
    );
  }

  return (
    <>
      {runs.map((run) => (
        <div
          key={run.id}
          className={clsx("run-item", { active: run.id === selectedId })}
          onClick={() => onSelect(run.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && onSelect(run.id)}
        >
          <div className="run-item-target">
            {run.company} — {run.role}
          </div>
          <div className="run-item-date">
            {formatDate(run.started_at)} · {run.elapsed_s}s
          </div>
          <span className={clsx("run-status-badge", run.status)}>{run.status}</span>
        </div>
      ))}
    </>
  );
}

function RunDetail({
  run,
  status,
  onOpenDoc,
}: {
  run: RunEntry;
  status: RunStatus | null;
  onOpenDoc: (title: string, url: string, type: DocType) => void;
}) {
  return (
    <div className="run-detail">
      <div className="run-detail-title">
        {run.company} — {run.role}
      </div>
      <div className="run-detail-meta">
        <span>{formatDate(run.started_at)}</span>
        <span>{run.elapsed_s}s{run.page_count ? ` · ${run.page_count}p` : ""}{run.retry_count > 0 ? ` · ${run.retry_count} retries` : ""}</span>
        <span className={clsx("run-status-badge", run.status)}>{run.status}</span>
      </div>

      {/* Output buttons */}
      <div className="run-output-btns">
        {run.pdf_path && (
          <button
            className="run-output-btn"
            onClick={() => onOpenDoc("PDF Resume", `/api/file?path=${run.pdf_path}`, "pdf")}
          >
            PDF ↗
          </button>
        )}
        <button
          className="run-output-btn"
          onClick={() => onOpenDoc("Pipeline Trace", `/api/file?path=${run.dir}/pipeline_trace.md`, "md")}
        >
          Trace
        </button>
        <button
          className="run-output-btn"
          onClick={() => onOpenDoc("Selection Report", `/api/file?path=${run.dir}/selection_report.json`, "json")}
        >
          Report
        </button>
        <button
          className="run-output-btn"
          onClick={() => onOpenDoc("LaTeX Source", `/api/file?path=${run.dir}/resume.tex`, "text")}
        >
          LaTeX
        </button>
        <button
          className="run-output-btn"
          onClick={() => onOpenDoc("Input JD", `/api/file?path=${run.dir}/input_jd.txt`, "text")}
        >
          Input JD
        </button>
      </div>

      {/* Timeline */}
      <div className="timeline-label">Pipeline Timeline</div>
      <div className="timeline">
        {status?.steps.map((step, i) => {
          const isLast = i === (status.steps.length - 1);
          const stepClass = isLast && status.status === "running" ? "active-step" : "done";
          return (
            <div key={i} className={clsx("timeline-step", stepClass)}>
              <div className="timeline-dot" />
              <div className="timeline-node">{step.node}</div>
              <div className="timeline-summary">{step.summary}</div>
              <div className="timeline-time">+{step.elapsed_s}s</div>
            </div>
          );
        })}
        {!status?.steps.length && (
          <div style={{ padding: "20px 0", color: "var(--gray)", fontSize: 13 }}>
            No step data available.
          </div>
        )}
      </div>
    </div>
  );
}

export default function RunsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ open: false, title: "", url: "", type: "text" });

  // Fetch runs index — refetch every 2s if any run is "running"
  const { data: runsData } = useQuery({
    queryKey: ["runs"],
    queryFn: (): Promise<{ runs: RunEntry[] }> =>
      fetch("/api/runs").then((r) => r.json()),
    refetchInterval: (q) => {
      const runs: RunEntry[] = (q.state.data as { runs: RunEntry[] } | undefined)?.runs ?? [];
      return runs.some((r) => r.status === "running") ? 2000 : false;
    },
  });

  const runs: RunEntry[] = runsData?.runs ?? [];
  const selectedRun = runs.find((r) => r.id === selectedId) ?? null;

  // Auto-select first run when list loads
  useEffect(() => {
    if (!selectedId && runs.length) setSelectedId(runs[0].id);
  }, [runs.length]); // eslint-disable-line react-hooks/exhaustive-deps


  // Fetch status for selected run
  const { data: statusData } = useQuery({
    queryKey: ["run-status", selectedId, selectedRun?.dir],
    queryFn: () =>
      fetch(`/api/file?path=${selectedRun!.dir}/status.json`)
        .then((r) => r.json())
        .catch(() => null),
    enabled: !!selectedRun,
    refetchInterval: selectedRun?.status === "running" ? 2000 : false,
  });

  function openDoc(title: string, url: string, type: DocType) {
    setModal({ open: true, title, url, type });
  }

  return (
    <div className="container">
      <div className="runs-header">
        <h2 className="runs-title">
          Pipeline <span style={{ color: "var(--cobalt)" }}>Runs</span>
        </h2>
        <p className="runs-subtitle">
          Every tailoring run, timestamped and stored. Select a run to audit the
          full pipeline trace.
        </p>
      </div>

      <div className="runs-grid">
        <div className="runs-list">
          <RunsList runs={runs} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <div>
          {selectedRun ? (
            <RunDetail run={selectedRun} status={statusData ?? null} onOpenDoc={openDoc} />
          ) : (
            <div className="run-select-prompt">
              Select a run from the list to view details.
            </div>
          )}
        </div>
      </div>

      <DocModal
        open={modal.open}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        title={modal.title}
        url={modal.url}
        type={modal.type}
      />
    </div>
  );
}
