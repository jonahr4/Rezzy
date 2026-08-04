"use client";

import { useRef, useEffect, useCallback } from "react";
import { useTailorStore, type WizardStep } from "@/lib/tailorStore";
import StepPasteJD from "@/components/tailor/StepPasteJD";
import StepParsedJD from "@/components/tailor/StepParsedJD";
import StepEntrySelect from "@/components/tailor/StepEntrySelect";
import StepBulletSelect from "@/components/tailor/StepBulletSelect";
import StepSuggestions from "@/components/tailor/StepSuggestions";
import StepCompiling from "@/components/tailor/StepCompiling";
import StepDone from "@/components/tailor/StepDone";

const STEP_LABELS = ["Paste JD", "Parsed", "Entries", "Bullets", "Suggestions", "Compiling", "Done"];

export default function TailorPage() {
  const { currentStep, maxReachedStep, setStep } = useTailorStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  // Prevent observer from fighting with programmatic scroll
  const isScrollingProgrammatically = useRef(false);

  // Scroll to current step when it changes via store (button clicks, advanceStep)
  useEffect(() => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const target = container.children[currentStep] as HTMLElement;
    if (target) {
      isScrollingProgrammatically.current = true;
      target.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
      // Reset flag after scroll completes
      setTimeout(() => {
        isScrollingProgrammatically.current = false;
      }, 600);
    }
  }, [currentStep]);

  // Sync dots when user manually scrolls/swipes (IntersectionObserver)
  useEffect(() => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        // Don't interfere with programmatic scrolls
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
      {
        root: container,
        threshold: 0.5,
      }
    );

    // Observe all wizard pages
    const pages = container.querySelectorAll(".wizard-page");
    pages.forEach((page) => observer.observe(page));

    return () => observer.disconnect();
  }, [maxReachedStep]); // Re-observe when new pages appear

  const goToStep = useCallback(
    (step: WizardStep) => {
      if (step <= maxReachedStep) setStep(step);
    },
    [maxReachedStep, setStep]
  );

  const canGoBack = currentStep > 0;
  const canGoForward = currentStep < maxReachedStep;

  return (
    <div className="tailor-page">
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
          style={{ width: `${(currentStep / 6) * 100}%` }}
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
            <StepEntrySelect />
          </div>
        )}
        {maxReachedStep >= 3 && (
          <div className="wizard-page" data-step={3}>
            <StepBulletSelect />
          </div>
        )}
        {maxReachedStep >= 4 && (
          <div className="wizard-page" data-step={4}>
            <StepSuggestions />
          </div>
        )}
        {maxReachedStep >= 5 && (
          <div className="wizard-page" data-step={5}>
            <StepCompiling />
          </div>
        )}
        {maxReachedStep >= 6 && (
          <div className="wizard-page" data-step={6}>
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
