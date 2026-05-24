import type { SukuyoChapterId, SukuyoCompatibilityReportData } from "./sukuyoCompatibilityReport.types";

export interface WorkerSukuyoChapterPlanItem {
  key?: string;
  title?: string;
  subtitle?: string;
  goal?: string;
}

export interface WorkerSukuyoPrepareResponse {
  ok?: boolean;
  reportSessionId?: string;
  totalChapters?: number;
  chapterPlan?: WorkerSukuyoChapterPlanItem[];
  reportMode?: string;
  normalizedRequestBody?: Record<string, unknown>;
}

export interface WorkerSukuyoChapterResponse {
  ok?: boolean;
  reportSessionId?: string;
  chapterId?: number;
  chapterKey?: string;
  title?: string;
  text?: string;
  chapterJson?: {
    title?: string;
    summary?: string;
    sections?: Array<{ title?: string; body?: string }>;
  };
}

export interface WorkerSukuyoCompatibilitySeed {
  profileA?: { name?: string; gender?: string; birthDate?: string; birthTime?: string; calendarType?: string };
  profileB?: { name?: string; gender?: string; birthDate?: string; birthTime?: string; calendarType?: string };
  raw?: Partial<SukuyoCompatibilityReportData["raw"]>;
}

export interface WorkerSukuyoCompatibilityAssembledPayload {
  prepare: WorkerSukuyoPrepareResponse;
  chapters: WorkerSukuyoChapterResponse[];
  seed?: WorkerSukuyoCompatibilitySeed;
}

export type WorkerSukuyoChapterId = SukuyoChapterId;
