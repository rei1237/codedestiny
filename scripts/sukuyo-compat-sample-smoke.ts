import { mapWorkerPayloadToSukuyoReport } from "../components/sukuyo-compat-report/mapWorkerPayloadToSukuyoReport";
import { normalizeSukuyoCompatibilityReport } from "../components/sukuyo-compat-report/normalizeSukuyoCompatibilityReport";
import type { WorkerSukuyoCompatibilityAssembledPayload } from "../types/sukuyo-compat-report/sukuyoCompatibilityWorkerContract.types";

const samplePayload: WorkerSukuyoCompatibilityAssembledPayload = {
  prepare: {
    ok: true,
    reportSessionId: "smoke-session-001",
    chapterPlan: [
      { key: "I", title: "I. Summary", goal: "overview" },
      { key: "II", title: "II. Traits", goal: "traits" },
    ],
  },
  seed: {
    profileA: {
      name: "A",
      gender: "F",
      birthDate: "1990-01-01",
      birthTime: "08:10",
      calendarType: "solar",
    },
    profileB: {
      name: "B",
      gender: "M",
      birthDate: "1991-02-02",
      birthTime: "09:20",
      calendarType: "solar",
    },
    raw: {
      relationType: "friend",
      distanceType: "middle",
      baseScore: 72,
    },
  },
  chapters: Array.from({ length: 16 }, (_, i) => {
    const chapterNo = i + 1;
    return {
      ok: true,
      chapterId: chapterNo,
      title: `Chapter ${chapterNo}`,
      text: `chapter-${chapterNo}-summary`,
      chapterJson: {
        title: `Chapter ${chapterNo}`,
        sections: [
          { title: "S1", body: `chapter-${chapterNo}-section-1` },
          { title: "S2", body: `chapter-${chapterNo}-section-2` },
          { title: "S3", body: `chapter-${chapterNo}-section-3` },
          { title: "S4", body: `chapter-${chapterNo}-section-4` },
          { title: "S5", body: `chapter-${chapterNo}-section-5` },
          { title: "S6", body: `chapter-${chapterNo}-section-6` },
        ],
      },
    };
  }),
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[sukuyo-compat-smoke] ${message}`);
  }
}

const mapped = mapWorkerPayloadToSukuyoReport(samplePayload);
const normalized = normalizeSukuyoCompatibilityReport(mapped);

assert(normalized.mode === "compatibility", "mode should be compatibility");
assert(normalized.chapterOrder.length === 16, "chapter order should contain 16 chapters");
assert(normalized.chapters.III.categories.relationTypeCore.includes("chapter-3-section-1"), "chapter III relationTypeCore should come from section 1");
assert(normalized.chapters.XVI.categories.finalKeyword.includes("chapter-16-section-5"), "chapter XVI finalKeyword should come from section 5");

console.log("[sukuyo-compat-smoke] ok");
