"use client";

import { useState } from "react";
import clsx from "clsx";
import { SourceBankEntry } from "@/lib/types";

interface EntryCardProps {
  entry: SourceBankEntry;
}

export default function EntryCard({ entry }: EntryCardProps) {
  const [open, setOpen] = useState(false);

  const typeLabel = entry.type === "job" ? "Experience" : "Project";
  const name = entry.company || entry.title;
  const subtitle = entry.role || entry.title;
  const dateRange = [entry.start_date, entry.end_date].filter(Boolean).join(" — ");

  return (
    <div className={clsx("entry-card", { open })}>
      <div className="entry-header" onClick={() => setOpen(!open)} role="button" tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setOpen(!open)}>
        <div className="entry-title-group">
          <div className="entry-type-badge">{typeLabel}</div>
          <div className="entry-title">
            {name}
            {entry.pinned && <span style={{ color: "var(--cobalt)", marginLeft: 8, fontSize: "0.6em" }}>📌 PINNED</span>}
          </div>
          <div className="entry-meta">
            {subtitle !== name && <span>{subtitle}</span>}
            {entry.location && <span>{entry.location}</span>}
            {dateRange && <span>{dateRange}</span>}
            <span style={{ color: "var(--cobalt)" }}>{entry.bullets.length} bullets</span>
          </div>
        </div>
        <span className="entry-chevron">›</span>
      </div>
      <div className="entry-body">
        <div className="entry-body-inner">
          {entry.summary && <p className="entry-summary">{entry.summary}</p>}
          {entry.tags && entry.tags.length > 0 && (
            <div className="entry-tags">
              {entry.tags.map((t) => <span key={t} className="entry-tag">{t}</span>)}
            </div>
          )}
          {entry.tech_stack && entry.tech_stack.length > 0 && (
            <div className="entry-tags" style={{ marginTop: -8 }}>
              {entry.tech_stack.map((t) => (
                <span key={t} className="skill-pill" style={{ fontSize: 11 }}>{t}</span>
              ))}
            </div>
          )}
          <div className="bullets-label">Bullet Bank — {entry.bullets.length} variants</div>
          {entry.bullets.map((b, i) => (
            <div key={b.id} className="bullet-item">
              <span className="bullet-num">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <div className="bullet-text">{b.text}</div>
                <div className="bullet-id">{b.id}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
