'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TutorialModal() {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) return null;

  const slides = [
    {
      title: 'Welcome to your Dashboard',
      content: 'This is your mission control. Here you can track all your active job applications, view your resume tailoring history, and instantly start a new tailor session for any job posting you find.',
      icon: (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line>
        </svg>
      )
    },
    {
      title: 'Master your Source Bank',
      content: 'The Source Bank is the brain of your AI. It holds all your past jobs, projects, skills, and education. You can manually edit entries here, add custom summaries, or upload more resumes to make the AI even smarter.',
      icon: (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
      )
    },
    {
      title: 'Configure your Settings',
      content: 'Head to the Settings tab to update the personal info that goes at the top of your resumes. You can also configure application preferences and manage API keys if you want to use your own LLM providers.',
      icon: (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      )
    }
  ];

  function handleClose() {
    setIsOpen(false);
    // Remove the ?tutorial=true from URL
    router.replace('/dashboard');
  }

  return (
    <>
      <div className="modal-backdrop" onClick={handleClose} style={{ zIndex: 9998 }} />
      <div className="auth-card" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 9999, margin: 0 }}>
        
        <div style={{ textAlign: 'center', marginBottom: 24, color: 'var(--accent)' }}>
          {slides[slide].icon}
        </div>
        
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, textAlign: 'center', color: 'var(--text-primary)' }}>
          {slides[slide].title}
        </h2>
        
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, textAlign: 'center', marginBottom: 32, minHeight: 75 }}>
          {slides[slide].content}
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {slides.map((_, i) => (
              <div 
                key={i} 
                style={{ 
                  width: 8, height: 8, borderRadius: '50%', 
                  background: slide === i ? 'var(--accent)' : 'var(--border)',
                  transition: 'background 0.2s'
                }} 
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost btn-sm" onClick={handleClose}>
              Skip
            </button>
            {slide < slides.length - 1 ? (
              <button className="btn btn-primary btn-sm" onClick={() => setSlide(s => s + 1)}>
                Next
              </button>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={handleClose}>
                Get Started
              </button>
            )}
          </div>
        </div>

      </div>
    </>
  );
}
