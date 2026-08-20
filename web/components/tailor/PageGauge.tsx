"use client";

import { useEffect, useRef, useState } from "react";
import { useTailorStore } from "@/lib/tailorStore";

// ─────────────────────────────────────────────────────────────────────────────
// TUNING CONSTANTS — adjust these to calibrate the estimator
// ─────────────────────────────────────────────────────────────────────────────

/** Words from fixed sections the user doesn't control (header + education) */
const FIXED_OVERHEAD = 45;

/** Extra words per selected entry (title, company, dates, location) */
const WORDS_PER_ENTRY_HEADER = 12;

/** Words added per skill category label (e.g. "Languages:") */
const WORDS_PER_SKILL_CAT = 2;

/**
 * Zone word-count boundaries:
 *   Green  zone: 0 → GREEN_MAX      needle: 0%  → 60% of arc
 *   Yellow zone: GREEN_MAX → YELLOW_MAX  needle: 60% → 80% of arc
 *   Red    zone: YELLOW_MAX → RED_MAX    needle: 80% → 100% of arc
 *
 * Needle is clamped at RED_MAX.
 */
const GREEN_MAX  = 750;   // below this = definitely fits 1 page
const YELLOW_MAX = 900;   // below this = borderline / tight
const RED_MAX    = 1050;  // needle stops here (overflow territory)

// ─────────────────────────────────────────────────────────────────────────────
// Arc geometry — 180° half-circle, left=0 words, right=RED_MAX
// ─────────────────────────────────────────────────────────────────────────────
const ARC_START = -180;
const ARC_END   =    0;
const ARC_SPAN  = ARC_END - ARC_START; // 180°

// Zone fractions of the arc (3/5, 4/5, 5/5)
const FRAC_GREEN  = 3 / 5;
const FRAC_YELLOW = 4 / 5;

const DEG_GREEN_END  = ARC_START + FRAC_GREEN  * ARC_SPAN; // -72°
const DEG_YELLOW_END = ARC_START + FRAC_YELLOW * ARC_SPAN; // -36°

// SVG
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

function wordsToAngle(words: number): number {
  const ratio = Math.min(words / RED_MAX, 1.0);
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
// Divider tick between two zones
// ─────────────────────────────────────────────────────────────────────────────
function Tick({ deg }: { deg: number }) {
  const inner = polar(deg, R - SW / 2 - 1);
  const outer = polar(deg, R + SW / 2 + 1);
  return <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="var(--bg-elevated)" strokeWidth={2} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// PageGauge component
// ─────────────────────────────────────────────────────────────────────────────
export default function PageGauge() {
  const { selectedContent, suggestions, skillRows } = useTailorStore();

  // Skill words
  let skillWords = 0;
  for (const row of skillRows) {
    skillWords += WORDS_PER_SKILL_CAT;
    skillWords += row.items.reduce((s, sk) => s + countWords(sk), 0);
  }

  // Fixed overhead scales with how many entries are selected
  const fixedOverhead = FIXED_OVERHEAD + selectedContent.length * WORDS_PER_ENTRY_HEADER;

  // Bullet words (use accepted suggestions where available)
  let bulletWords = 0;
  for (const entry of selectedContent) {
    const sugsForEntry = suggestions.find(es => es.entry_id === entry.entry_id);
    for (const bullet of entry.selected_bullets) {
      const accepted = sugsForEntry?.suggestions.find(
        s => s.accepted && s.replaces_bullet_ids.includes(bullet.id)
      );
      bulletWords += countWords(accepted ? accepted.text : bullet.text);
    }
  }

  const totalWords = fixedOverhead + skillWords + bulletWords;
  const { label, zone } = getZone(totalWords);
  const angle = useAnimated(wordsToAngle(totalWords));

  // Needle
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

        {/* Green zone: 0–60% */}
        <path d={arc(ARC_START, DEG_GREEN_END,  R)} fill="none" stroke="var(--gauge-green)"  strokeWidth={SW} strokeOpacity={0.32} strokeLinecap="butt" />
        {/* Yellow zone: 60–80% */}
        <path d={arc(DEG_GREEN_END,  DEG_YELLOW_END, R)} fill="none" stroke="var(--gauge-yellow)" strokeWidth={SW} strokeOpacity={0.38} strokeLinecap="butt" />
        {/* Red zone: 80–100% */}
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
