// Shared TypeScript types for ResumeGenie

export interface RunEntry {
  id: string;
  dir: string;
  jd_file: string;
  started_at: string;
  elapsed_s: number;
  status: "complete" | "failed" | "running";
  pdf_path: string | null;
  page_count: number | null;
  retry_count: number;
  company: string;
  role: string;
}

export interface RunsIndex {
  runs: RunEntry[];
}

export interface PipelineStep {
  node: string;
  summary: string;
  elapsed_s: number;
  timestamp: string;
}

export interface RunStatus {
  status: "running" | "complete" | "failed";
  message: string;
  steps: PipelineStep[];
  updated_at: string;
  pdf_path?: string | null;
  page_count?: number | null;
  retry_count?: number;
}

export interface SourceBankPersonal {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website?: string;
}

export interface SourceBankEntry {
  id: string;
  type: "job" | "project";
  company?: string;
  title: string;
  role?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  pinned: boolean;
  tags: string[];
  summary?: string;
  tech_stack?: string[];
  bullets: { id: string; text: string }[];
}

export interface SourceBankEducation {
  institution: string;
  degree: string;
  field: string;
  graduation: string;
  gpa?: string;
  coursework?: string[];
  honors?: string[];
}

export interface SourceBank {
  personal: SourceBankPersonal;
  skills: string[];
  education: SourceBankEducation[];
  entries: SourceBankEntry[];
}
