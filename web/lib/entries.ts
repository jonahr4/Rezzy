// ─────────────────────────────────────────────
// Rezzy — Source Bank Types & Client Helpers
// ─────────────────────────────────────────────

export type EntryType = 'job' | 'project';

export interface Bullet {
  id: string;
  text: string;
}

export interface Entry {
  id: string;
  user_id: string;
  type: EntryType;
  title: string;          // role title OR project name
  organization: string | null; // company OR null for solo projects
  start_date: string | null;   // "Jun 2024"
  end_date: string | null;     // "Aug 2024" or "Present"
  location: string | null;
  pinned: boolean;
  summary: string | null;
  bullets: Bullet[];
  skills: string[];
  links: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface Education {
  id: string;
  user_id: string;
  institution: string;
  degree: string;
  minor: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  gpa: string | null;
  honors: string | null;
  relevant_coursework: string[];
  created_at: string;
  updated_at: string;
}

export interface SkillGroup {
  id: string;
  user_id: string;
  label: string;         // "Languages", "Frameworks & Libraries", etc.
  skills: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ─── Client fetch helpers ───────────────────

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(path, options);
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `API error ${res.status}`);
  }
  return res.json();
}

// Entries
export const getEntries = (type?: EntryType): Promise<Entry[]> =>
  apiFetch(type ? `/api/entries?type=${type}` : '/api/entries');

export const createEntry = (data: Partial<Entry>): Promise<Entry> =>
  apiFetch('/api/entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const updateEntry = (id: string, data: Partial<Entry>): Promise<Entry> =>
  apiFetch(`/api/entries/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const deleteEntry = (id: string): Promise<void> =>
  apiFetch(`/api/entries/${id}`, { method: 'DELETE' });

// Education
export const getEducation = (): Promise<Education[]> =>
  apiFetch('/api/education');

export const createEducation = (data: Partial<Education>): Promise<Education> =>
  apiFetch('/api/education', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const updateEducation = (id: string, data: Partial<Education>): Promise<Education> =>
  apiFetch(`/api/education/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const deleteEducation = (id: string): Promise<void> =>
  apiFetch(`/api/education/${id}`, { method: 'DELETE' });

// Skills
export const getSkillGroups = (): Promise<SkillGroup[]> =>
  apiFetch('/api/skills');

export const saveSkillGroups = (groups: Partial<SkillGroup>[]): Promise<SkillGroup[]> =>
  apiFetch('/api/skills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groups }),
  });

// Default skill group labels (mirrors V1)
export const DEFAULT_SKILL_GROUPS = [
  'Languages',
  'Frameworks & Libraries',
  'Testing & DevOps',
  'Cloud & Databases',
  'AI / ML & Data',
  'Other',
];
