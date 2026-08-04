import { create } from "zustand";

export type WizardStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;

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

interface TailorState {
  // Wizard navigation
  currentStep: WizardStep;
  maxReachedStep: WizardStep;
  setStep: (step: WizardStep) => void;
  advanceStep: () => void;

  // Loading state
  loading: boolean;
  loadingMessage: string;
  setLoading: (loading: boolean, message?: string) => void;

  // Step 0: JD input
  jdText: string;
  setJdText: (text: string) => void;

  // Step 1: Parsed JD
  parsedJD: ParsedJD | null;
  setParsedJD: (jd: ParsedJD) => void;

  // Step 2: Entry selection
  allEntries: EntryInfo[];
  confirmedEntryIds: string[];
  setEntries: (entries: EntryInfo[], confirmed: string[]) => void;
  toggleEntry: (id: string) => void;

  // Step 3: Bullet selection
  selectedContent: SelectedEntry[];
  setSelectedContent: (content: SelectedEntry[]) => void;
  toggleBullet: (entryId: string, bulletId: string) => void;

  // Step 4: AI Suggestions
  suggestions: EntrySuggestions[];
  setSuggestions: (suggestions: EntrySuggestions[]) => void;
  toggleSuggestion: (entryId: string, suggestionIndex: number) => void;

  // Step 6: Result
  result: {
    pdf_path: string | null;
    page_count: number | null;
    qa_feedback: string | null;
    run_dir: string | null;
    latex_source: string;
  } | null;
  setResult: (result: TailorState["result"]) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  currentStep: 0 as WizardStep,
  maxReachedStep: 0 as WizardStep,
  loading: false,
  loadingMessage: "",
  jdText: "",
  parsedJD: null,
  allEntries: [],
  confirmedEntryIds: [],
  selectedContent: [],
  suggestions: [],
  result: null,
};

export const useTailorStore = create<TailorState>((set, get) => ({
  ...initialState,

  setStep: (step) => set({ currentStep: step }),

  advanceStep: () => {
    const { currentStep, maxReachedStep } = get();
    const next = Math.min(currentStep + 1, 6) as WizardStep;
    set({
      currentStep: next,
      maxReachedStep: Math.max(maxReachedStep, next) as WizardStep,
    });
  },

  setLoading: (loading, message = "") =>
    set({ loading, loadingMessage: message }),

  setJdText: (text) => set({ jdText: text }),

  setParsedJD: (jd) => set({ parsedJD: jd }),

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

  setSelectedContent: (content) => set({ selectedContent: content }),

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

  setResult: (result) => set({ result }),

  reset: () => set(initialState),
}));
