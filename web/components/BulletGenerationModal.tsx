import React, { useEffect, useState } from 'react';

export default function BulletGenerationModal({ isOpen }: { isOpen: boolean }) {
  const [msgIdx, setMsgIdx] = useState(0);

  const messages = [
    "Analyzing your summary...",
    "Extracting key achievements...",
    "Applying ATS XYZ formula...",
    "Polishing professional terminology...",
    "Almost done..."
  ];

  useEffect(() => {
    if (isOpen) {
      setMsgIdx(0);
      const interval = setInterval(() => {
        setMsgIdx(i => Math.min(i + 1, messages.length - 1));
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-content" style={{ maxWidth: 400, textAlign: 'center', padding: '48px 32px' }}>
        <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3, margin: '0 auto 24px', borderColor: 'var(--accent)', borderRightColor: 'transparent' }} />
        <h3 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
          Crafting Bullets
        </h3>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
          {messages[msgIdx]}
        </p>
      </div>
    </div>
  );
}