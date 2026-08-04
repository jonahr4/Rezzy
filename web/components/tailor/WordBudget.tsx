"use client";

import { useEffect, useRef, useState } from "react";
import { useTailorStore } from "@/lib/tailorStore";

/**
 * Word Budget Thresholds — calibrated from the reference resume.
 *
 * A 1-page resume with our LaTeX template is ~886 rendered words.
 * We use 830 as the "safe" max and 900 as the "tight" threshold.
 *
 * FIXED OVERHEAD: ~175 words from sections the user doesn't control:
 *   - Header (name, contact info): ~15 words
 *   - Education (degree, GPA, honors): ~30 words
 *   - Skills (all categories listed): ~70 words  ← NOTE: if skills become AI-selectable, this moves to dynamic
 *   - Section headers + entry titles/dates: ~60 words (varies by entry count)
 *
 * The "content budget" is MAX_WORDS - FIXED_OVERHEAD = words available for bullets only.
 */

const FIXED_OVERHEAD_BASE = 115; // header + education + skills words
const WORDS_PER_ENTRY_HEADER = 12; // title, company, dates, location per entry
const MAX_WORDS_1_PAGE = 830;
const TIGHT_THRESHOLD = 900;
const TWO_PAGE_THRESHOLD = 1100;

/** Count words in a text string */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Get page estimate label and color class */
function getPageEstimate(totalWords: number): {
  label: string;
  emoji: string;
  colorClass: string;
} {
  if (totalWords <= MAX_WORDS_1_PAGE) {
    return { label: "Under 1 page", emoji: "✅", colorClass: "safe" };
  }
  if (totalWords <= TIGHT_THRESHOLD) {
    return { label: "Tight fit — might exceed 1 page", emoji: "⚠️", colorClass: "warn" };
  }
  if (totalWords <= TWO_PAGE_THRESHOLD) {
    return { label: "Resume is likely 2 pages", emoji: "❌", colorClass: "danger" };
  }
  return { label: "Resume is 3+ pages", emoji: "🚫", colorClass: "critical" };
}

/** Animated number that counts up/down instead of jumping */
function AnimatedNumber({ value, duration = 400 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(value);
  const animRef = useRef<number>();
  const startRef = useRef(display);
  const startTimeRef = useRef(0);

  useEffect(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    startRef.current = display;
    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(
        startRef.current + (value - startRef.current) * eased
      );
      setDisplay(current);
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <span>{display}</span>;
}

export default function WordBudget() {
  const { selectedContent, suggestions } = useTailorStore();

  // Calculate fixed overhead: base + per-entry headers
  const entryCount = selectedContent.length;
  const fixedOverhead = FIXED_OVERHEAD_BASE + entryCount * WORDS_PER_ENTRY_HEADER;

  // Calculate content words (bullets only, using accepted suggestions where applicable)
  let bulletWords = 0;
  for (const entry of selectedContent) {
    const entrySugs = suggestions.find((es) => es.entry_id === entry.entry_id);
    for (const bullet of entry.selected_bullets) {
      // If there's an accepted suggestion replacing this bullet, count the suggestion words
      const activeSuggestion = entrySugs?.suggestions.find(
        (s) => s.accepted && s.replaces_bullet_ids.includes(bullet.id)
      );
      if (activeSuggestion) {
        bulletWords += countWords(activeSuggestion.text);
      } else {
        bulletWords += countWords(bullet.text);
      }
    }
  }

  const totalWords = fixedOverhead + bulletWords;
  const percentage = Math.round((totalWords / MAX_WORDS_1_PAGE) * 100);
  const barWidth = Math.min(percentage, 120); // cap visual at 120%
  const pageEstimate = getPageEstimate(totalWords);

  // Determine bar color class based on fill
  let barColorClass = "safe";
  if (percentage > 100) barColorClass = "danger";
  else if (percentage > 90) barColorClass = "warn";

  return (
    <div className="word-budget">
      <div className="word-budget-top">
        <div className="word-budget-stats">
          <span className="word-budget-count">
            <AnimatedNumber value={totalWords} /> / {MAX_WORDS_1_PAGE}
          </span>
          <span className="word-budget-label">words</span>
        </div>
        <div className={`word-budget-page-est ${pageEstimate.colorClass}`}>
          <span className="page-est-emoji">{pageEstimate.emoji}</span>
          <span className="page-est-label">{pageEstimate.label}</span>
        </div>
        <div className="word-budget-pct">
          <AnimatedNumber value={percentage} />%
        </div>
      </div>

      <div className="word-budget-bar-track">
        {/* Zone markers */}
        <div className="bar-zone bar-zone-safe" style={{ width: "90%" }} />
        <div
          className="bar-zone bar-zone-warn"
          style={{ left: "90%", width: "10%" }}
        />

        {/* Fill bar */}
        <div
          className={`word-budget-bar-fill ${barColorClass}`}
          style={{ width: `${barWidth}%` }}
        />

        {/* Threshold marker at 100% */}
        <div className="bar-threshold" style={{ left: "100%" }}>
          <div className="bar-threshold-line" />
        </div>
      </div>
    </div>
  );
}

/**
 * Shows the word delta for a suggestion: "+12 words" or "-5 words"
 */
export function WordDelta({
  originalText,
  suggestedText,
}: {
  originalText: string;
  suggestedText: string;
}) {
  const origCount = countWords(originalText);
  const sugCount = countWords(suggestedText);
  const delta = sugCount - origCount;

  if (delta === 0) return null;

  return (
    <span className={`word-delta ${delta > 0 ? "plus" : "minus"}`}>
      {delta > 0 ? "+" : ""}
      {delta} words
    </span>
  );
}
