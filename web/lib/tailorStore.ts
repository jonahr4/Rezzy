import { create } from "zustand";

export type WizardStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface ParsedJD {
  company_name: string;
  role_title: string;
  seniority: string;
  required_skills: string[];
  nice_to_have_skills: string[];
  keywords: string[];
  key_responsibilities: string[];
}

export interface EntryInfo {
  id: string;
  type: "job" | "project";
  title: string;
  company: string | null;
  start_date: string;
  end_date: string;
  location: string | null;
  pinned: boolean;
  selected: boolean;
  bullet_count: number;
  tags: string[];
  summary: string;
  rationale?: string;
}

export interface BulletInfo {
  id: string;
  text: string;
  reason?: string;
}

export interface SelectedEntry {
  entry_id: string;
  type: string;
  company: string | null;
  title: string;
  start_date: string;
  end_date: string;
  location: string | null;
  tagline: string;
  links: Record<string, string>;
  selected_bullets: BulletInfo[];
  all_bullets: BulletInfo[];
}

export interface Suggestion {
  text: string;
  reason: string;
  replaces_bullet_ids: string[];
  accepted: boolean;
}

export interface EntrySuggestions {
  entry_id: string;
  suggestions: Suggestion[];
}

/**
 * Skill row for the drag-and-drop skills playground.
 * Each row maps to a LaTeX skill category line:
 *   \textbf{label}: item1, item2, item3 \\
 */
export interface SkillRow {
  id: string;
  label: string;
  items: string[];
}

export interface QaAttempt {
  attempt: number;
  verdict: "PASS" | "FAIL" | "WARN";
  message: string;
  feedback?: string;
  preview?: string; // base64 PNG
}

interface TailorState {
  // Wizard navigation
  // Flow: Paste JD(0) → Parsed(1) → Skills(2) → Entries(3) → Bullets(4) → Suggestions(5) → Compiling(6) → Done(7)
  currentStep: WizardStep;
  maxReachedStep: WizardStep;
  setStep: (step: WizardStep) => void;
  advanceStep: () => void;

  // Loading state
  loading: boolean;
  loadingMessage: string;
  setLoading: (loading: boolean, message?: string) => void;

  // Step 0: JD input
  runId: string | null;
  setRunId: (id: string | null) => void;
  jdText: string;
  setJdText: (text: string) => void;

  // Step 1: Parsed JD
  parsedJD: ParsedJD | null;
  setParsedJD: (jd: ParsedJD) => void;

  // Step 2: Skills playground
  skillRows: SkillRow[];
  availableSkills: string[];
  suggestedSkills: string[];
  setSkillsData: (rows: SkillRow[], available: string[], suggested: string[]) => void;
  setSkillRows: (rows: SkillRow[]) => void;
  setAvailableSkills: (skills: string[]) => void;
  setSuggestedSkills: (skills: string[]) => void;
  moveSkill: (skill: string, fromContainer: string, toContainer: string) => void;
  addSkillRow: () => void;
  removeSkillRow: (rowId: string) => void;
  moveSkillRow: (rowId: string, direction: 'up' | 'down') => void;
  renameSkillRow: (rowId: string, newLabel: string) => void;
  addCustomSkill: (rowId: string, skill: string) => void;

  // Step 3: Entry selection
  allEntries: EntryInfo[];
  confirmedEntryIds: string[];
  setEntries: (entries: EntryInfo[], confirmed: string[]) => void;
  toggleEntry: (id: string) => void;

  // Step 4: Bullet selection
  selectedContent: SelectedEntry[];
  setSelectedContent: (content: SelectedEntry[]) => void;
  toggleBullet: (entryId: string, bulletId: string) => void;

  // Step 5: AI Suggestions
  suggestions: EntrySuggestions[];
  setSuggestions: (suggestions: EntrySuggestions[]) => void;
  toggleSuggestion: (entryId: string, suggestionIndex: number) => void;

  // Step 6: Preview editing
  updateBulletText: (entryId: string, bulletId: string, newText: string) => void;
  updateSkillItem: (rowId: string, oldSkill: string, newSkill: string) => void;
  removeSkillItem: (rowId: string, skill: string) => void;
  removeBullet: (entryId: string, bulletId: string) => void;
  addBullet: (entryId: string) => void;
  reorderEntries: (type: "job" | "project", fromIndex: number, toIndex: number) => void;
  reorderBullets: (entryId: string, fromIndex: number, toIndex: number) => void;
  reorderSkillRows: (fromIndex: number, toIndex: number) => void;

  // Step 7: Compiling & QA
  qaAttempts: QaAttempt[];
  addQaAttempt: (attempt: QaAttempt) => void;

  // Step 8: Result
  result: {
    pdf_path: string | null;
    pdf_base64: string | null;
    page_count: number | null;
    qa_feedback: string | null;
    run_dir: string | null;
    latex_source: string;
  } | null;
  setResult: (result: TailorState["result"]) => void;

  // Reset
  reset: () => void;
}

let _rowCounter = 0;
function nextRowId() {
  return `row_${++_rowCounter}`;
}

const initialState = {
  currentStep: 0 as WizardStep,
  maxReachedStep: 0 as WizardStep,
  loading: false,
  loadingMessage: "",
  runId: null,
  jdText: "",
  parsedJD: null,
  skillRows: [] as SkillRow[],
  availableSkills: [] as string[],
  suggestedSkills: [] as string[],
  allEntries: [],
  confirmedEntryIds: [],
  selectedContent: [],
  suggestions: [],
  qaAttempts: [] as QaAttempt[],
  result: null,
};

export const useTailorStore = create<TailorState>((set, get) => ({
  ...initialState,

  setStep: (step) => set({ currentStep: step }),

  advanceStep: () => {
    const { currentStep, maxReachedStep } = get();
    const next = Math.min(currentStep + 1, 8) as WizardStep;
    set({
      currentStep: next,
      maxReachedStep: Math.max(maxReachedStep, next) as WizardStep,
    });
  },

  setLoading: (loading, message = "") =>
    set({ loading, loadingMessage: message }),

  setRunId: (id) => set({ runId: id }),
  setJdText: (text) => set({ jdText: text }),

  setParsedJD: (jd) => set({ parsedJD: jd }),

  // Skills playground
  setSkillsData: (rows, available, suggested) => {
    // Deduplicate: a skill should only appear in ONE place
    const seen = new Set<string>();
    const dedupedRows = rows.map((r) => ({
      ...r,
      items: r.items.filter((s) => {
        if (seen.has(s)) return false;
        seen.add(s);
        return true;
      }),
    }));
    const dedupedAvailable = available.filter((s) => {
      if (seen.has(s)) return false;
      seen.add(s);
      return true;
    });
    const dedupedSuggested = suggested.filter((s) => {
      if (seen.has(s)) return false;
      seen.add(s);
      return true;
    });
    set({ skillRows: dedupedRows, availableSkills: dedupedAvailable, suggestedSkills: dedupedSuggested });
  },

  setSkillRows: (rows) => set({ skillRows: rows }),

  setAvailableSkills: (skills) => set({ availableSkills: skills }),

  setSuggestedSkills: (skills) => set({ suggestedSkills: skills }),

  moveSkill: (skill, fromContainer, toContainer) => {
    const { skillRows, availableSkills, suggestedSkills } = get();
    // Build new state atomically — remove from source, add to target
    let newRows = skillRows.map((r) => ({ ...r, items: [...r.items] }));
    let newAvailable = [...availableSkills];
    let newSuggested = [...suggestedSkills];

    // Remove from source
    if (fromContainer === "available") {
      newAvailable = newAvailable.filter((s) => s !== skill);
    } else if (fromContainer === "suggested") {
      newSuggested = newSuggested.filter((s) => s !== skill);
    } else {
      newRows = newRows.map((r) =>
        r.id === fromContainer ? { ...r, items: r.items.filter((s) => s !== skill) } : r
      );
    }

    // Add to target (only if not already there)
    if (toContainer === "available") {
      if (!newAvailable.includes(skill)) newAvailable.push(skill);
    } else if (toContainer === "suggested") {
      if (!newSuggested.includes(skill)) newSuggested.push(skill);
    } else {
      newRows = newRows.map((r) =>
        r.id === toContainer && !r.items.includes(skill)
          ? { ...r, items: [...r.items, skill] }
          : r
      );
    }

    set({ skillRows: newRows, availableSkills: newAvailable, suggestedSkills: newSuggested });
  },

  addSkillRow: () => {
    const { skillRows } = get();
    set({
      skillRows: [
        ...skillRows,
        { id: nextRowId(), label: "New Category", items: [] },
      ],
    });
  },

  removeSkillRow: (rowId) => {
    const { skillRows, availableSkills } = get();
    const row = skillRows.find((r) => r.id === rowId);
    if (!row) return;
    set({
      skillRows: skillRows.filter((r) => r.id !== rowId),
      availableSkills: [...availableSkills, ...row.items],
    });
  },

  moveSkillRow: (rowId, direction) => {
    const { skillRows } = get();
    const idx = skillRows.findIndex((r) => r.id === rowId);
    if (idx < 0) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= skillRows.length) return;
    const rows = [...skillRows];
    [rows[idx], rows[newIdx]] = [rows[newIdx], rows[idx]];
    set({ skillRows: rows });
  },

  renameSkillRow: (rowId, newLabel) => {
    const { skillRows } = get();
    set({
      skillRows: skillRows.map((r) =>
        r.id === rowId ? { ...r, label: newLabel } : r
      ),
    });
  },

  addCustomSkill: (rowId, skill) => {
    const { skillRows } = get();
    set({
      skillRows: skillRows.map((r) =>
        r.id === rowId ? { ...r, items: [...r.items, skill] } : r
      ),
    });
  },

  // Entry selection
  setEntries: (entries, confirmed) =>
    set({ allEntries: entries, confirmedEntryIds: confirmed }),

  toggleEntry: (id) => {
    const { confirmedEntryIds } = get();
    if (confirmedEntryIds.includes(id)) {
      set({ confirmedEntryIds: confirmedEntryIds.filter((eid) => eid !== id) });
    } else {
      set({ confirmedEntryIds: [...confirmedEntryIds, id] });
    }
  },

  setSelectedContent: (content) => {
    // When content is first set, copy reasons from selected_bullets into all_bullets
    // so that toggling off and on preserves the AI-provided reason
    const enriched = content.map((entry) => ({
      ...entry,
      all_bullets: entry.all_bullets.map((ab) => {
        const selected = entry.selected_bullets.find((sb) => sb.id === ab.id);
        if (selected?.reason && !ab.reason) {
          return { ...ab, reason: selected.reason };
        }
        return ab;
      }),
    }));
    set({ selectedContent: enriched });
  },

  toggleBullet: (entryId, bulletId) => {
    const { selectedContent } = get();
    set({
      selectedContent: selectedContent.map((entry) => {
        if (entry.entry_id !== entryId) return entry;
        const isSelected = entry.selected_bullets.some(
          (b) => b.id === bulletId
        );
        if (isSelected) {
          return {
            ...entry,
            selected_bullets: entry.selected_bullets.filter(
              (b) => b.id !== bulletId
            ),
          };
        } else {
          // Look in all_bullets (which now has reasons preserved)
          const bullet = entry.all_bullets.find((b) => b.id === bulletId);
          if (!bullet) return entry;
          return {
            ...entry,
            selected_bullets: [...entry.selected_bullets, bullet],
          };
        }
      }),
    });
  },


  setSuggestions: (suggestions) =>
    set({
      suggestions: suggestions.map((es) => ({
        ...es,
        suggestions: es.suggestions.map((s) => ({ ...s, accepted: false })),
      })),
    }),

  toggleSuggestion: (entryId, suggestionIndex) => {
    const { suggestions } = get();
    set({
      suggestions: suggestions.map((es) => {
        if (es.entry_id !== entryId) return es;
        return {
          ...es,
          suggestions: es.suggestions.map((s, i) =>
            i === suggestionIndex ? { ...s, accepted: !s.accepted } : s
          ),
        };
      }),
    });
  },

  updateBulletText: (entryId, bulletId, newText) => {
    const { selectedContent, suggestions } = get();
    set({
      selectedContent: selectedContent.map((entry) => {
        if (entry.entry_id !== entryId) return entry;
        return {
          ...entry,
          selected_bullets: entry.selected_bullets.map((b) =>
            b.id === bulletId ? { ...b, text: newText } : b
          ),
        };
      }),
      // Un-accept any suggestion that targeted this bullet (user manually overrode it)
      suggestions: suggestions.map((es) => {
        if (es.entry_id !== entryId) return es;
        return {
          ...es,
          suggestions: es.suggestions.map((s) =>
            s.accepted && s.replaces_bullet_ids.includes(bulletId)
              ? { ...s, accepted: false }
              : s
          ),
        };
      }),
    });
  },

  updateSkillItem: (rowId, oldSkill, newSkill) => {
    const { skillRows } = get();
    set({
      skillRows: skillRows.map((r) =>
        r.id === rowId
          ? { ...r, items: r.items.map((s) => (s === oldSkill ? newSkill : s)) }
          : r
      ),
    });
  },

  removeSkillItem: (rowId, skill) => {
    const { skillRows } = get();
    set({
      skillRows: skillRows.map((r) =>
        r.id === rowId
          ? { ...r, items: r.items.filter((s) => s !== skill) }
          : r
      ),
    });
  },

  removeBullet: (entryId, bulletId) => {
    const { selectedContent } = get();
    set({
      selectedContent: selectedContent.map((entry) => {
        if (entry.entry_id !== entryId) return entry;
        return {
          ...entry,
          selected_bullets: entry.selected_bullets.filter((b) => b.id !== bulletId),
        };
      }),
    });
  },

  addBullet: (entryId) => {
    const { selectedContent } = get();
    set({
      selectedContent: selectedContent.map((entry) => {
        if (entry.entry_id !== entryId) return entry;
        const newId = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        return {
          ...entry,
          selected_bullets: [
            ...entry.selected_bullets,
            { id: newId, text: "New bullet point — click to edit" },
          ],
        };
      }),
    });
  },


  addQaAttempt: (attempt) => set((state) => ({ qaAttempts: [...state.qaAttempts, attempt] })),

  setResult: (result) => set({ result }),

  reorderEntries: (type, fromIndex, toIndex) => {
    const { selectedContent } = get();
    // Get indices of entries of this type within the full array
    const typeIndices = selectedContent
      .map((e, i) => (e.type === type ? i : -1))
      .filter((i) => i !== -1);
    if (fromIndex < 0 || fromIndex >= typeIndices.length) return;
    if (toIndex < 0 || toIndex >= typeIndices.length) return;
    const newContent = [...selectedContent];
    const movedItem = newContent[typeIndices[fromIndex]];
    // Remove from old position
    newContent.splice(typeIndices[fromIndex], 1);
    // Recalculate target position after removal
    const remainingTypeIndices = newContent
      .map((e, i) => (e.type === type ? i : -1))
      .filter((i) => i !== -1);
    const insertAt = toIndex >= remainingTypeIndices.length
      ? (remainingTypeIndices.length > 0 ? remainingTypeIndices[remainingTypeIndices.length - 1] + 1 : newContent.length)
      : remainingTypeIndices[toIndex];
    newContent.splice(insertAt, 0, movedItem);
    set({ selectedContent: newContent });
  },

  reorderBullets: (entryId, fromIndex, toIndex) => {
    const { selectedContent } = get();
    set({
      selectedContent: selectedContent.map((entry) => {
        if (entry.entry_id !== entryId) return entry;
        const bullets = [...entry.selected_bullets];
        const [moved] = bullets.splice(fromIndex, 1);
        bullets.splice(toIndex, 0, moved);
        return { ...entry, selected_bullets: bullets };
      }),
    });
  },

  reorderSkillRows: (fromIndex, toIndex) => {
    const { skillRows } = get();
    const rows = [...skillRows];
    const [moved] = rows.splice(fromIndex, 1);
    rows.splice(toIndex, 0, moved);
    set({ skillRows: rows });
  },

  reset: () => set(initialState),
}));
