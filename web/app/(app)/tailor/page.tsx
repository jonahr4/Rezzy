"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTailorStore, type WizardStep } from "@/lib/tailorStore";
import StepPasteJD from "@/components/tailor/StepPasteJD";
import StepParsedJD from "@/components/tailor/StepParsedJD";
import StepSkills from "@/components/tailor/StepSkills";
import StepEntrySelect from "@/components/tailor/StepEntrySelect";
import StepBulletSelect from "@/components/tailor/StepBulletSelect";
import StepSuggestions from "@/components/tailor/StepSuggestions";
import StepPreview from "@/components/tailor/StepPreview";
import StepCompiling from "@/components/tailor/StepCompiling";
import StepDone from "@/components/tailor/StepDone";

const STEP_LABELS = ["Paste JD", "Parsed", "Skills", "Entries", "Bullets", "Suggestions", "Preview", "Compiling", "Done"];

export default function TailorPage() {
  const { currentStep, maxReachedStep, setStep } = useTailorStore();
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isScrollingProgrammatically = useRef(false);
  const [hasSourceData, setHasSourceData] = useState<boolean | null>(null); // null = loading

  // Check if user has source bank data (entries) before allowing pipeline
  useEffect(() => {
    if (!user?.uid) return;
    fetch("/api/pipeline/source-bank", {
      headers: { "x-user-id": user.uid },
    })
      .then((r) => r.json())
      .then((data) => {
        setHasSourceData((data.entries ?? []).length > 0);
      })
      .catch(() => setHasSourceData(false));
  }, [user?.uid]);

  useEffect(() => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const target = container.children[currentStep] as HTMLElement;
    if (target) {
      isScrollingProgrammatically.current = true;
      target.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
      setTimeout(() => {
        isScrollingProgrammatically.current = false;
      }, 600);
    }
  }, [currentStep]);

  useEffect(() => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingProgrammatically.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const stepAttr = (entry.target as HTMLElement).dataset.step;
            if (stepAttr != null) {
              const step = parseInt(stepAttr, 10) as WizardStep;
              const store = useTailorStore.getState();
              if (step !== store.currentStep && step <= store.maxReachedStep) {
                store.setStep(step);
              }
            }
          }
        }
      },
      { root: container, threshold: 0.5 }
    );

    const pages = container.querySelectorAll(".wizard-page");
    pages.forEach((page) => observer.observe(page));
    return () => observer.disconnect();
  }, [maxReachedStep]);

  const goToStep = useCallback(
    (step: WizardStep) => {
      if (step <= maxReachedStep) setStep(step);
    },
    [maxReachedStep, setStep]
  );

  const canGoBack = currentStep > 0;
  const canGoForward = currentStep < maxReachedStep;

  // Show empty state if user has no source bank data
  if (hasSourceData === false) {
    return (
      <div className="tailor-page">
        <div className="tailor-empty-state">
          <div className="tailor-empty-icon">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" />
              <path d="M14 2v6h6" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </div>
          <h2 className="tailor-empty-title">Set up your Source Bank first</h2>
          <p className="tailor-empty-desc">
            Add your experience, projects, education, and skills so we can tailor your resume to any job.
          </p>
          <a href="/source-bank" className="step-cta">
            Go to Source Bank →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="tailor-page" style={{ position: 'relative' }}>
      <button 
        onClick={() => {
          if (confirm('Are you sure you want to start over? All current progress will be lost.')) {
            useTailorStore.getState().reset();
          }
        }}
        className="btn btn-ghost"
        style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          zIndex: 50,
          color: 'var(--text-secondary)',
          fontSize: '14px',
          padding: '6px 12px',
          background: 'var(--bg-secondary)',
          borderRadius: '6px'
        }}
      >
        Start Over
      </button>
      
      {/* ── Top progress bar ── */}
      <div className="tailor-progress">
        {STEP_LABELS.map((label, i) => (
          <button
            key={i}
            className={`progress-dot ${i <= maxReachedStep ? "reached" : ""} ${i === currentStep ? "active" : ""} ${i < currentStep ? "done" : ""}`}
            onClick={() => goToStep(i as WizardStep)}
            disabled={i > maxReachedStep}
          >
            <span className="dot-circle">
              {i < currentStep ? "✓" : i + 1}
            </span>
            <span className="dot-label">{label}</span>
          </button>
        ))}
        <div
          className="progress-fill"
          style={{ width: `${(currentStep / 8) * 100}%` }}
        />
      </div>

      {/* ── "Go to current step" floating button ── */}
      {currentStep !== maxReachedStep && currentStep < maxReachedStep && (
        <button
          className="go-to-current"
          onClick={() => setStep(maxReachedStep)}
        >
          Go to current step →
        </button>
      )}

      {/* ── Side navigation arrows ── */}
      {canGoBack && (
        <button
          className="wizard-arrow wizard-arrow-left"
          onClick={() => goToStep((currentStep - 1) as WizardStep)}
          aria-label="Previous step"
        >
          ‹
        </button>
      )}
      {canGoForward && (
        <button
          className="wizard-arrow wizard-arrow-right"
          onClick={() => goToStep((currentStep + 1) as WizardStep)}
          aria-label="Next step"
        >
          ›
        </button>
      )}

      {/* ── Horizontal scrollable pages ── */}
      <div className="wizard-scroll" ref={scrollRef}>
        <div className="wizard-page" data-step={0}>
          <StepPasteJD />
        </div>
        {maxReachedStep >= 1 && (
          <div className="wizard-page" data-step={1}>
            <StepParsedJD />
          </div>
        )}
        {maxReachedStep >= 2 && (
          <div className="wizard-page" data-step={2}>
            <StepSkills />
          </div>
        )}
        {maxReachedStep >= 3 && (
          <div className="wizard-page" data-step={3}>
            <StepEntrySelect />
          </div>
        )}
        {maxReachedStep >= 4 && (
          <div className="wizard-page" data-step={4}>
            <StepBulletSelect />
          </div>
        )}
        {maxReachedStep >= 5 && (
          <div className="wizard-page" data-step={5}>
            <StepSuggestions />
          </div>
        )}
        {maxReachedStep >= 6 && (
          <div className="wizard-page" data-step={6}>
            <StepPreview />
          </div>
        )}
        {maxReachedStep >= 7 && (
          <div className="wizard-page" data-step={7}>
            <StepCompiling />
          </div>
        )}
        {maxReachedStep >= 8 && (
          <div className="wizard-page" data-step={8}>
            <StepDone />
          </div>
        )}
      </div>

      {/* ── Bottom page dots ── */}
      <div className="wizard-dots">
        {Array.from({ length: maxReachedStep + 1 }, (_, i) => (
          <button
            key={i}
            className={`wizard-dot ${i === currentStep ? "active" : ""}`}
            onClick={() => goToStep(i as WizardStep)}
          />
        ))}
      </div>
    </div>
  );
}
