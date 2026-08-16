#!/usr/bin/env node
/**
 * 초융합 텍스트 PDF 문서 구성 검증 — **mock 기본, LLM·네트워크·DOM 없음**.
 *
 * 왜 있는가: 예전 PDF 는 화면을 JPEG 로 찍어 붙였다. 2만 자가 넘는 이 상품에서는 결과가
 * 수십 MB에 글자 선택·검색이 안 되고, 화면의 다크 배경을 그대로 인쇄했다. 이제 결과 JSON 에서
 * 직접 조판하는데, 그러면 **본문 자체가 문서 구성에서 누락될 수 있다** — 캡처 방식에는 없던 위험이다.
 *
 * 그래서 여기서 고정하는 것은 셋이다:
 *   ① 결과의 모든 본문(6체계 + 통합 + 요약 + 최종 판정 + 시기/행동 + 맺음말)이 문서에 실린다
 *   ② 제목만 있고 내용이 없는 장(=빈 페이지)이 생기지 않는다
 *   ③ 표지·본문 어디에도 생년월일·생시·고민 원문이 들어가지 않는다
 *
 * 조판(jsPDF)은 브라우저에서만 돌므로 여기서는 구성(lib/pdf/fusion-report-plan.js)만 실행한다.
 * 실제 PDF 바이트는 브라우저 실측으로 확인한다(PR 본문에 수치 기록).
 *
 * 사용: node scripts/verify-fusion-fortune-pdf.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { buildFusionFortuneContext, generateFusionFortuneWithMockLLM } from "../worker/lib/fusion-fortune.js";
import { buildFusionReportPlan, countFusionReportChars, FUSION_REPORT_SECTIONS } from "../lib/pdf/fusion-report-plan.js";

if (process.argv.includes("--live")) {
  console.error("실호출 경로는 이 스크립트에 없습니다.");
  process.exit(2);
}

const failures = [];
function check(label, condition, detail = "") {
  if (condition) return;
  failures.push(detail ? `${label} — ${detail}` : label);
}

const INPUT = {
  birthDate: "1995-04-18",
  birthTime: "08:30",
  calendarType: "solar",
  gender: "female",
  nickname: "달빛",
  topic: "연애와 관계",
  concern: "이 사람과 계속 만나도 될지 모르겠어요",
  birthPlace: { city: "서울", country: "KR", latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul" },
};

const ADAPTERS = {
  saju: async () => ({ dayMaster: "갑목", currentFlowSummary: "정리한 기준을 행동으로 옮기는 흐름", evidence: ["saju.dayMaster"] }),
  ziwei: async () => ({ lifePalaceSummary: "명궁의 역할을 정리하는 흐름", topicPalaceSummary: "관록궁의 책임을 조율하는 흐름", evidence: ["ziwei.lifePalace"] }),
  vedic: async () => ({ moonSignSummary: "달의 감정 리듬", nakshatraSummary: "반복되는 회복 습관", innerRhythm: "감정의 속도를 알아차리는 리듬", evidence: ["vedic.nakshatra"] }),
  sukuyo: async () => ({ birthMansion: "묘숙", relationshipPattern: "관계의 거리를 천천히 맞추는 흐름", evidence: ["sukuyo.birthMansion"] }),
  astrology: async () => ({ sunSummary: "태양의 목표 방향", moonSummary: "달의 정서적 안정", currentMoodSummary: "기준을 먼저 확인하는 흐름", evidence: ["astrology.sun"] }),
  tarot: async () => ({
    spreadType: "fusion_six_system_bridge",
    spreadId: "fusion_six_system_bridge",
    symbolicMessage: "여섯 장을 현실 행동으로 연결합니다.",
    cards: ["바보", "마법사", "여사제", "여황제", "황제", "연인"].map((name, index) => ({
      name, orientation: "upright", positionKey: `position_${index}`, meaningSummary: `${name}의 선택 상징`,
    })),
  }),
};

const built = await buildFusionFortuneContext(INPUT, { adapters: ADAPTERS });
if (!built.ok) {
  console.error(`[verify-fusion-fortune-pdf] context failed: ${built.errorCode}`);
  process.exit(1);
}
const result = await generateFusionFortuneWithMockLLM({ context: built.context, now: new Date("2026-08-16T00:00:00Z") });

// ── ① 본문이 하나도 빠지지 않는다 ─────────────────────────────────────
const plan = buildFusionReportPlan(result, { includeVisual: true });
const flatten = (chapters) => chapters.flatMap((chapter) => chapter.blocks.map((block) => (
  block.kind === "bullets" ? block.items.join(" ") : String(block.text || "")
))).join("\n");
const documentText = flatten(plan);

for (const { key, fallbackTitle } of FUSION_REPORT_SECTIONS) {
  const content = String(result[key]?.content || "");
  check(`${fallbackTitle} 본문이 문서에 실린다`, content.length > 0 && documentText.includes(content.slice(0, 120)));
}
check("한 문단 요약이 실린다", documentText.includes(String(result.executiveSummary).slice(0, 120)));
check("최종 판정 근거가 실린다", documentText.includes(String(result.finalVerdict?.rationale || "").slice(0, 120)));
check("시기와 행동 본문이 실린다", documentText.includes(String(result.timingAndAction?.content || "").slice(0, 120)));
check("맺음말이 실린다", documentText.includes(String(result.closingMessage).slice(0, 120)));
check("여는 말이 실린다", documentText.includes(String(result.openingMessage).slice(0, 120)));

// 분량이 화면 본문과 같은 급이어야 한다 — 조판에서 조용히 절반이 날아가면 여기서 잡힌다.
const planChars = countFusionReportChars(plan);
check("문서 분량이 2만 자 계약 근처를 유지한다", planChars >= 18000, `${planChars}자`);

// ── ② 빈 장이 없다 ────────────────────────────────────────────────
check("모든 장에 내용 블록이 있다", plan.every((chapter) => chapter.blocks.length > 0),
  plan.filter((chapter) => !chapter.blocks.length).map((chapter) => chapter.title).join(","));
check("모든 장에 제목이 있다", plan.every((chapter) => String(chapter.title || "").trim().length > 0));
const contentBearing = plan.filter((chapter) => chapter.blocks.some((block) => block.kind === "body" || block.kind === "lead" || block.kind === "visual"));
check("모든 장이 본문이나 도표를 갖는다", contentBearing.length === plan.length,
  plan.filter((chapter) => !contentBearing.includes(chapter)).map((chapter) => chapter.title).join(","));

// 도표 캡처가 실패한 경우엔 그 장 자체가 없어야 한다(그림 없는 "한눈에" 페이지가 남으면 빈 장이다).
const planWithoutVisual = buildFusionReportPlan(result, { includeVisual: false });
check("도표 캡처 실패 시 그 장이 통째로 빠진다",
  !planWithoutVisual.some((chapter) => chapter.blocks.some((block) => block.kind === "visual")));
check("도표 장이 빠져도 나머지 본문은 그대로다", countFusionReportChars(planWithoutVisual) >= planChars - 200);

// ── ③ 프라이버시 경계 ─────────────────────────────────────────────
// 표지 문구까지 합쳐 검사한다 — 표지는 결과가 아니라 호출자가 주는 값이라 더 새기 쉽다.
const coverText = [INPUT.topic, INPUT.nickname, "2026. 8. 16."].join(" ");
const everything = `${documentText}\n${coverText}`;
for (const [label, value] of [["생년월일", INPUT.birthDate], ["생시", INPUT.birthTime], ["고민 원문", INPUT.concern]]) {
  check(`${label}이(가) 문서에 없다`, !everything.includes(value));
}

// ── 빈 결과에서도 터지지 않는다 ────────────────────────────────────
check("빈 결과는 장을 만들지 않는다", buildFusionReportPlan({}, {}).length === 0);
check("본문만 있는 결과도 장을 만든다", buildFusionReportPlan({ closingMessage: "짧은 맺음말" }).length === 1);

// ── 공용 캡처 유틸을 건드리지 않았는지 ──────────────────────────────
const root = path.resolve(import.meta.dirname, "..");
const shared = fs.readFileSync(path.join(root, "lib/pdf/export-result-pdf.ts"), "utf8");
check("공용 캡처 유틸은 폰트 로더만 공개한다(16개 기능이 공유)", shared.includes("export async function registerPdfFontsSafely"));
check("공용 캡처 유틸의 캡처 계약은 그대로다", shared.includes("captureTargets") && shared.includes("html2canvas"));

const report = fs.readFileSync(path.join(root, "lib/pdf/export-fusion-report-pdf.ts"), "utf8");
// 🔴 바탕칠은 본문보다 먼저 그려야 한다 — 나중에 칠하면 페이지를 통째로 덮는다.
check("바탕칠은 페이지를 만든 직후에만 한다", /pdf\.addPage\(\);\s*\n\s*paintPaper\(pdf\);/.test(report));
check("폰트 실패는 구분되는 에러로 던진다", report.includes("throw new FusionPdfFontError()"));

if (failures.length) {
  console.error("\n[verify-fusion-fortune-pdf] FAIL");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log(`[verify-fusion-fortune-pdf] PASS — ${plan.length}개 장 · 본문 ${planChars.toLocaleString("ko-KR")}자 (mock only)`);
