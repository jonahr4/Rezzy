import { create } from 'zustand';

interface DataState {
  stats: any | null;
  entries: any[] | null;
  education: any[] | null;
  skillGroups: any[] | null;
  runs: any[] | null;
  applications: any[] | null;
  setStats: (stats: any) => void;
  setEntries: (entries: any[]) => void;
  setEducation: (education: any[]) => void;
  setSkillGroups: (skillGroups: any[]) => void;
  setRuns: (runs: any[]) => void;
  setApplications: (applications: any[]) => void;
  invalidate: () => void;
}

export const useDataStore = create<DataState>((set) => ({
  stats: null,
  entries: null,
  education: null,
  skillGroups: null,
  runs: null,
  applications: null,
  setStats: (stats) => set({ stats }),
  setEntries: (entries) => set({ entries }),
  setEducation: (education) => set({ education }),
  setSkillGroups: (skillGroups) => set({ skillGroups }),
  setRuns: (runs) => set({ runs }),
  setApplications: (applications) => set({ applications }),
  invalidate: () => set({ stats: null, entries: null, education: null, skillGroups: null, runs: null, applications: null })
}));
