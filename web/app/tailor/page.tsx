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

  // Scroll to current step
  useEffect(() => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const target = container.children[currentStep] as HTMLElement;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    }
  }, [currentStep]);

  const goToStep = useCallback(
    (step: WizardStep) => {
      if (step <= maxReachedStep) setStep(step);
    },
    [maxReachedStep, setStep]
  );

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
