"use client";

import * as Dialog from "@radix-ui/react-dialog";
import ReactMarkdown from "react-markdown";
import { useState, useEffect } from "react";

type DocType = "pdf" | "md" | "json" | "text";

interface DocModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  url: string;
  type: DocType;
}

export default function DocModal({ open, onClose, title, url, type }: DocModalProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (type === "pdf") return;

    setLoading(true);
    setContent(null);
    fetch(url)
      .then((r) => r.text())
      .then((text) => {
        if (type === "json") {
          try {
            setContent(JSON.stringify(JSON.parse(text), null, 2));
          } catch {
            setContent(text);
          }
        } else {
          setContent(text);
        }
      })
      .catch(() => setContent("Could not load file."))
      .finally(() => setLoading(false));
  }, [open, url, type]);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        {/* Overlay: full-screen dim + blur */}
        <Dialog.Overlay className="modal-overlay" />
        {/* Content: positioned independently (Radix siblings, not nested) */}
        <Dialog.Content
          className="modal-content"
          aria-describedby={undefined}
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 1001,
          }}
        >
          <div className="modal-header">
            <Dialog.Title className="modal-title">{title}</Dialog.Title>
            <Dialog.Close className="modal-close">✕</Dialog.Close>
          </div>
          <div className="modal-body">
            {type === "pdf" && (
              <iframe src={url} title={title} />
            )}
            {type !== "pdf" && loading && (
              <div className="modal-loading">Loading…</div>
            )}
            {type === "md" && content && (
              <div className="md-view">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            )}
            {(type === "json" || type === "text") && content && (
              <pre>{content}</pre>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
