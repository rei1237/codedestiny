// 프리미엄 리포트 화면의 타입.
//
// 🔴 블록 종류의 **정본은 lib/human-design/report-plan.js 의 REPORT_BLOCK_KINDS** 다.
//    그 파일은 PDF 조판기와 공유하는 순수 .js 라 타입을 갖지 않으므로 여기서 한 번 옮겨 적는다.
//    옮겨 적은 것이 어긋나면 화면과 PDF 가 다른 것을 그리게 되므로,
//    __tests__/ui/human-design-report.static.test.js 가 두 목록의 일치를 단언한다.

import type { HdChart, HdSelection } from "../../_lib/types";

export type ReportLocale = "ko" | "en";

export type ReportBlockKind =
  | "lead"
  | "paragraph"
  | "heading"
  | "bullets"
  | "quote"
  | "insight"
  | "steps"
  | "summary"
  | "keyvalue"
  | "meter"
  | "chart";

export type ReportBlock =
  | { kind: "lead"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "heading"; text: string; anchorId?: string }
  | { kind: "bullets"; title: string; items: string[] }
  | { kind: "quote"; text: string }
  | { kind: "insight"; title: string; items: string[] }
  | { kind: "steps"; title: string; items: Array<{ index: number; text: string }> }
  | { kind: "summary"; title: string; items: string[] }
  | { kind: "keyvalue"; title: string; rows: Array<{ label: string; value: string }> }
  | { kind: "meter"; title: string; items: Array<{ label: string; value: number; max: number; display: string }> }
  | { kind: "chart"; slotId: string; selection: HdSelection; caption: string };

export type ReportChapter = {
  key: string;
  order: number;
  title: string;
  blocks: ReportBlock[];
};

export type ReportChartSlot = {
  slotId: string;
  chapterKey: string;
  selection: HdSelection;
  caption: string;
};

export type ReportPlan = {
  planVersion: string;
  locale: ReportLocale;
  cover: {
    title: string;
    subtitle: string;
    facts: Array<{ label: string; value: string }>;
    planVersion: string;
    chapterCount: number;
  };
  chapters: ReportChapter[];
  chartSlots: ReportChartSlot[];
  stats: { chapters: number; blocks: number; chars: number; chartSlots: number };
};

/** `/api/human-design-report/*` 의 공개 형태. 서버 publicReport() 와 짝이다. */
export type ReportSection = {
  key: string;
  order: number;
  title: string;
  body: string;
  subsections: Array<{ id: string; title: string; body: string }>;
  keyPoints: string[];
  evidence: string[];
};

export type ReportDocument = {
  reportId: string;
  contractVersion: string;
  locale: ReportLocale;
  status: "generating" | "completed" | "generation_failed";
  degraded: boolean;
  totalChars: number;
  progress: { completed: number; total: number };
  sections: ReportSection[];
};

/** `/start` 가 돌려주는 목차. 아직 한 글자도 없을 때 18장을 미리 보여 주는 재료다. */
export type ReportPlanEntry = { key: string; order: number; title: string };

export type ReportPhase = "loading" | "locked" | "generating" | "reading" | "error";

export type ReportChartState = { chart: HdChart; inputHash: string };
