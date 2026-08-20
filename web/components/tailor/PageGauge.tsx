"use client";

import { useEffect, useRef, useState } from "react";
import { useTailorStore } from "@/lib/tailorStore";

// ─────────────────────────────────────────────────────────────────────────────
// TUNING CONSTANTS — tweak these to calibrate the page-length estimator.
//
// Calibrated from 3 real single-page resumes (528, 589, 606 words).
// All confirmed 1-page resumes should land comfortably in the green zone.
// ─────────────────────────────────────────────────────────────────────────────

/** Words from fixed sections (header, education, coursework, section titles) */
const FIXED_OVERHEAD = 45;

/** Approximate words per entry header line (title, company, dates, location) */
const WORDS_PER_ENTRY_HEADER = 12;

/** Words per skill category label (e.g. "Languages:") */
const WORDS_PER_SKILL_CAT = 2;

/**
 * Average words per bullet — used for estimation when actual bullet text
 * isn't available yet (e.g. on the Entry Select step).
 */
const AVG_WORDS_PER_BULLET = 22;

/**
 * Zone word-count boundaries:
 *   Green:  0 → GREEN_MAX         — comfortably fits 1 page
 *   Yellow: GREEN_MAX → YELLOW_MAX — tight fit, might overflow
 *   Red:    YELLOW_MAX+            — will overflow to 2+ pages
 *
 * The arc zone visuals auto-derive from these values:
 *   green arc  = 0%  → (GREEN_MAX / RED_MAX)%
 *   yellow arc = above → (YELLOW_MAX / RED_MAX)%
 *   red arc    = above → 100%
 *
 * So changing these numbers automatically updates the visual zones.
 */
const GREEN_MAX  = 620;
const YELLOW_MAX = 740;
const RED_MAX    = 880;

// ─────────────────────────────────────────────────────────────────────────────
// Arc geometry — 180° half-circle, left=0, right=RED_MAX
// ─────────────────────────────────────────────────────────────────────────────
const ARC_START = -180;
const ARC_END   =    0;
const ARC_SPAN  = ARC_END - ARC_START; // 180

// Zone visual boundaries auto-derived from word thresholds
const FRAC_GREEN  = GREEN_MAX  / RED_MAX;
const FRAC_YELLOW = YELLOW_MAX / RED_MAX;

const DEG_GREEN_END  = ARC_START + FRAC_GREEN  * ARC_SPAN;
const DEG_YELLOW_END = ARC_START + FRAC_YELLOW * ARC_SPAN;

// SVG constants
const CX = 56;
const CY = 58;
const R  = 46;
const SW = 10;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Linear mapping: words → angle on the arc.
 * Because FRAC_GREEN = GREEN_MAX/RED_MAX and FRAC_YELLOW = YELLOW_MAX/RED_MAX,
 * the needle position at any threshold lands exactly on the zone boundary.
 */
function wordsToAngle(words: number): number {
  const ratio = Math.min(Math.max(words, 0) / RED_MAX, 1.0);
  return ARC_START + ratio * ARC_SPAN;
}

function getZone(words: number): { label: string; zone: "green" | "yellow" | "red" } {
  if (words <= GREEN_MAX)  return { label: "Fits 1 page",    zone: "green"  };
  if (words <= YELLOW_MAX) return { label: "Might overflow", zone: "yellow" };
  return                          { label: "Will overflow",  zone: "red"    };
}

function polar(deg: number, r: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function arc(a: number, b: number, r: number) {
  const s = polar(a, r);
  const e = polar(b, r);
  return `M ${s.x} ${s.y} A ${r} ${r} 0 0 1 ${e.x} ${e.y}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Animated value
// ─────────────────────────────────────────────────────────────────────────────
function useAnimated(target: number, ms = 500) {
  const [cur, setCur] = useState(target);
  const animId  = useRef<number | undefined>(undefined);
  const startV  = useRef(cur);
  const startT  = useRef(0);

  useEffect(() => {
    if (animId.current) cancelAnimationFrame(animId.current);
    startV.current = cur;
    startT.current = performance.now();
    const go = (now: number) => {
      const p = Math.min((now - startT.current) / ms, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setCur(startV.current + (target - startV.current) * e);
      if (p < 1) animId.current = requestAnimationFrame(go);
    };
    animId.current = requestAnimationFrame(go);
    return () => { if (animId.current) cancelAnimationFrame(animId.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return cur;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tick mark between zones
// ─────────────────────────────────────────────────────────────────────────────
function Tick({ deg }: { deg: number }) {
  const inner = polar(deg, R - SW / 2 - 1);
  const outer = polar(deg, R + SW / 2 + 1);
  return <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="var(--bg-elevated)" strokeWidth={2} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// PageGauge
// ─────────────────────────────────────────────────────────────────────────────
export default function PageGauge() {
  const {
    selectedContent,
    suggestions,
    skillRows,
    allEntries,
    confirmedEntryIds,
  } = useTailorStore();

  // ── Word estimation ────────────────────────────────────────────────────
  // Skill words
  let skillWords = 0;
  for (const row of skillRows) {
    skillWords += WORDS_PER_SKILL_CAT;
    skillWords += row.items.reduce((s, sk) => s + countWords(sk), 0);
  }

  // Entry words — ALWAYS driven by confirmedEntryIds so toggles are
  // reflected immediately. Uses actual bullet text when available,
  // falls back to estimation from bullet_count metadata.
  let entryWords = 0;

  for (const id of confirmedEntryIds) {
    entryWords += WORDS_PER_ENTRY_HEADER;

    // Check if we have actual bullet text for this entry
    const selectedEntry = selectedContent.find(e => e.entry_id === id);
    if (selectedEntry && selectedEntry.selected_bullets.length > 0) {
      // Precise count from real bullet text
      const sugsForEntry = suggestions.find(es => es.entry_id === id);
      for (const bullet of selectedEntry.selected_bullets) {
        const accepted = sugsForEntry?.suggestions.find(
          s => s.accepted && s.replaces_bullet_ids.includes(bullet.id)
        );
        entryWords += countWords(accepted ? accepted.text : bullet.text);
      }
    } else {
      // Estimate from metadata (entry select step)
      const entry = allEntries.find(e => e.id === id);
      if (entry) {
        const bulletCap = entry.type === "job" ? 4 : 3;
        const estimatedBullets = Math.min(entry.bullet_count, bulletCap);
        entryWords += estimatedBullets * AVG_WORDS_PER_BULLET;
      }
    }
  }

  const totalWords = FIXED_OVERHEAD + skillWords + entryWords;
  console.log('[PageGauge]', { confirmedCount: confirmedEntryIds.length, allCount: allEntries.length, selCount: selectedContent.length, skillWords, entryWords, totalWords });
  const { label, zone } = getZone(totalWords);
  const angle = useAnimated(wordsToAngle(totalWords));

  // Needle geometry
  const needleLen = R - SW / 2 - 3;
  const tip   = polar(angle, needleLen);
  const base1 = polar(angle + 90, 4);
  const base2 = polar(angle - 90, 4);

  const color =
    zone === "green"  ? "var(--gauge-green)"  :
    zone === "yellow" ? "var(--gauge-yellow)" :
                        "var(--gauge-red)";

  return (
    <div className="page-gauge">
      <svg
        viewBox={`0 0 ${CX * 2} ${CY + 8}`}
        width={112}
        height={66}
        aria-label={`Page length: ${label}`}
      >
        {/* Track */}
        <path d={arc(ARC_START, ARC_END, R)} fill="none" stroke="var(--border)" strokeWidth={SW} strokeLinecap="butt" />

        {/* Green zone */}
        <path d={arc(ARC_START, DEG_GREEN_END,  R)} fill="none" stroke="var(--gauge-green)"  strokeWidth={SW} strokeOpacity={0.32} strokeLinecap="butt" />
        {/* Yellow zone */}
        <path d={arc(DEG_GREEN_END,  DEG_YELLOW_END, R)} fill="none" stroke="var(--gauge-yellow)" strokeWidth={SW} strokeOpacity={0.38} strokeLinecap="butt" />
        {/* Red zone */}
        <path d={arc(DEG_YELLOW_END, ARC_END,        R)} fill="none" stroke="var(--gauge-red)"    strokeWidth={SW} strokeOpacity={0.38} strokeLinecap="butt" />

        {/* Zone dividers */}
        <Tick deg={DEG_GREEN_END} />
        <Tick deg={DEG_YELLOW_END} />

        {/* Needle */}
        <polygon
          points={`${tip.x},${tip.y} ${base1.x},${base1.y} ${base2.x},${base2.y}`}
          fill={color}
          style={{ transition: "fill 0.4s ease" }}
        />

        {/* Pivot */}
        <circle cx={CX} cy={CY} r={4.5} fill="var(--text-primary)" />
        <circle cx={CX} cy={CY} r={2}   fill="var(--bg-elevated)" />
      </svg>

      <div className="page-gauge-label" style={{ color }}>
        {label}
      </div>
    </div>
  );
}
