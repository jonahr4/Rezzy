import { create } from 'zustand';

interface DataState {
  stats: any | null;
  entries: any[] | null;
  education: any[] | null;
  skillGroups: any[] | null;
  runs: any[] | null;
  applications: any[] | null;
  setStats: (stats: any | ((prev: any) => any)) => void;
  setEntries: (entries: any[] | ((prev: any[]) => any[])) => void;
  setEducation: (education: any[] | ((prev: any[]) => any[])) => void;
  setSkillGroups: (skillGroups: any[] | ((prev: any[]) => any[])) => void;
  setRuns: (runs: any[] | ((prev: any[]) => any[])) => void;
  setApplications: (applications: any[] | ((prev: any[]) => any[])) => void;
  invalidate: () => void;
}

export const useDataStore = create<DataState>((set) => ({
  stats: null,
  entries: null,
  education: null,
  skillGroups: null,
  runs: null,
  applications: null,
  setStats: (stats) => set((state) => ({ stats: typeof stats === 'function' ? stats(state.stats) : stats })),
  setEntries: (entries) => set((state) => ({ entries: typeof entries === 'function' ? entries(state.entries || []) : entries })),
  setEducation: (education) => set((state) => ({ education: typeof education === 'function' ? education(state.education || []) : education })),
  setSkillGroups: (skillGroups) => set((state) => ({ skillGroups: typeof skillGroups === 'function' ? skillGroups(state.skillGroups || []) : skillGroups })),
  setRuns: (runs) => set((state) => ({ runs: typeof runs === 'function' ? runs(state.runs || []) : runs })),
  setApplications: (apps) => set((state) => ({ applications: typeof apps === 'function' ? apps(state.applications || []) : apps })),
  invalidate: () => set({ stats: null, entries: null, education: null, skillGroups: null, runs: null, applications: null })
}));
