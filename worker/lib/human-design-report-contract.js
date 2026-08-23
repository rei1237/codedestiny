// 휴먼 디자인 프리미엄 리포트 — 섹션 정본 · 예산 · 사후 검산.
//
// 이 파일은 **모델을 부르지 않는다.** 무엇을 몇 자나 쓰게 할 것인지, 돌아온 것이 계산 결과와
// 모순되지 않는지만 정한다. 프롬프트 문장은 human-design-report-prompt.js 가 갖는다.
//
// 🔴 확정표(fact snapshot)를 여기서 다시 만들지 않는다. human-design-ai-prompt.js 의
//    buildHumanDesignFactSnapshot 이 이미 그 일의 정본이고, "출생 데이터를 싣지 않는다" 는
//    계약을 scripts/verify-human-design-ai.mjs 가 그 파일에 대고 강제한다. 사본을 만들면
//    그 가드가 새 사본을 못 본다.
//
// 🔴 섹션 수는 **차트와 무관하게 18개로 고정**이다. 센터 9개·채널 0~36 처럼 개수가 차트마다
//    다른 것은 섹션이 아니라 섹션 **안의 subsection** 으로 흡수한다. 섹션 수를 차트에 따라
//    바꾸면 락·진행률·캐시 키·검증 규칙이 전부 차트 의존이 되어 재현이 불가능해진다.

import { CENTER_ORDER } from "../../lib/human-design/centers.js";
import { CENTER_LABEL } from "../../lib/human-design/labels.js";
import {
  buildHumanDesignFactSnapshot,
  ensureHumanDesignCalculationPresence,
} from "./human-design-ai-prompt.js";

export { buildHumanDesignFactSnapshot, ensureHumanDesignCalculationPresence };

/** 프롬프트·검증 규칙이 바뀌면 올린다. 저장 문서의 재생성 판정 키에 들어간다. */
export const HD_REPORT_VERSION = "human-design-report-v1";

export const HD_REPORT_LOCALES = Object.freeze(["ko", "en"]);

/** 상품이 광고하는 분량. 섹션 minChars 합이 이 값을 넘어야 한다(아래 자체 검사). */
export const HD_REPORT_TARGET_CHARS = 25000;

/**
 * 🔴 전달 하한. 여기를 넘으면 일부 섹션이 실패해도 **결제를 유지하고 전달**한다
 *    (worker/lib/llm-result-delivery.js 의 경량 보장 계약). 미달이면 환불한다.
 *    "리포트라고 부를 수 있는가" 의 경계이지 목표 분량이 아니다.
 */
export const HD_REPORT_DELIVER_MIN_TOTAL_CHARS = 20000;
export const HD_REPORT_DELIVER_MIN_SECTIONS = 14;

/** 저장 문서가 감당할 상한. 섹션 maxChars 합보다 커야 한다(아래 자체 검사). */
export const HD_REPORT_MAX_TOTAL_CHARS = 60000;

// ── 생성 예산 ────────────────────────────────────────────────────────────────
//
// 🔴 엣지 응답 데드라인이 100초라 25,000자를 한 요청에 담을 수 없다(인생의 책 실측:
//    30,000자 ≈ 45,000토큰, gemini-2.5-flash 비스트리밍 ~200tok/s → 225초). 그래서 한 요청은
//    웨이브 하나만 돌리고 클라이언트가 끝날 때까지 반복 호출한다.

export const HD_REPORT_SECTION_CONCURRENCY = 4;
export const HD_REPORT_SECTION_TIMEOUT_MS = 45000;
/** 웨이브 하나의 상한. 인증·락·저장 왕복을 빼고 남기는 몫이다. */
export const HD_REPORT_WAVE_BUDGET_MS = 75000;
/** 락 유효 기간. 웨이브 최악(≈45초)의 두 배. */
export const HD_REPORT_LOCK_TTL_MS = 90000;
/** 이만큼 갱신이 없으면 좀비로 보고 실패 처리한다. */
export const HD_REPORT_STALE_MS = 3 * 60 * 1000;
export const HD_REPORT_MAX_WAVES = 10;
export const HD_REPORT_MAX_SECTION_ATTEMPTS = 3;
/** 섹션 하나의 출력 토큰 상한. 최장 섹션(4,000자 ≈ 6,000토큰)에 여유를 둔다. */
export const HD_REPORT_SECTION_MAX_OUTPUT_TOKENS = 9000;

/**
 * subsection 을 무엇에서 뽑는가. 개수가 차트마다 달라지는 축은 전부 여기로 들어온다.
 * null 이면 그 섹션은 subsection 없이 본문만 쓴다.
 */
const SUBSECTION_SOURCE = Object.freeze({
  DEFINED_CENTERS: "definedCenters",
  OPEN_CENTERS: "openCenters",
  CHANNELS: "channels",
  CORE_GATES: "coreGates",
  ACTIVATIONS: "activations",
  FIXED: "fixed",
});

/**
 * 18유닛. order 는 웹 목차·PDF 차례·진행률이 공유하는 정본 순서다.
 *
 * needsEvidence: 차트에서 나온 근거 id 를 최소 1개 달아야 하는 섹션.
 *   요구 28의 "제공받은 계산 데이터만 사용" 을 기계로 잡는 지점이다.
 */
export const HD_REPORT_SECTIONS = Object.freeze([
  { key: "executiveSummary", order: 1, minChars: 800, maxChars: 2600, needsEvidence: false, subsections: null },
  { key: "energyBlueprint", order: 2, minChars: 1100, maxChars: 2900, needsEvidence: true, subsections: null },
  { key: "type", order: 3, minChars: 1400, maxChars: 3200, needsEvidence: true, subsections: null },
  { key: "strategy", order: 4, minChars: 1300, maxChars: 3100, needsEvidence: true, subsections: null },
  { key: "authority", order: 5, minChars: 1400, maxChars: 3200, needsEvidence: true, subsections: null },
  { key: "profile", order: 6, minChars: 1400, maxChars: 3200, needsEvidence: true, subsections: null },
  { key: "centersDefined", order: 7, minChars: 2000, maxChars: 3800, needsEvidence: true, subsections: SUBSECTION_SOURCE.DEFINED_CENTERS },
  { key: "centersOpen", order: 8, minChars: 2000, maxChars: 3800, needsEvidence: true, subsections: SUBSECTION_SOURCE.OPEN_CENTERS },
  { key: "channels", order: 9, minChars: 2200, maxChars: 4000, needsEvidence: true, subsections: SUBSECTION_SOURCE.CHANNELS },
  { key: "gatesCore", order: 10, minChars: 1500, maxChars: 3300, needsEvidence: true, subsections: SUBSECTION_SOURCE.CORE_GATES },
  { key: "planetaryActivations", order: 11, minChars: 1500, maxChars: 3300, needsEvidence: true, subsections: SUBSECTION_SOURCE.ACTIVATIONS },
  { key: "incarnationCross", order: 12, minChars: 1200, maxChars: 3000, needsEvidence: true, subsections: null },
  { key: "lifeRelational", order: 13, minChars: 1600, maxChars: 3400, needsEvidence: false, subsections: SUBSECTION_SOURCE.FIXED, fixedSubsections: ["love", "communication", "social"] },
  { key: "lifeWork", order: 14, minChars: 1400, maxChars: 3200, needsEvidence: false, subsections: SUBSECTION_SOURCE.FIXED, fixedSubsections: ["career", "money"] },
  { key: "lifeSelf", order: 15, minChars: 1400, maxChars: 3200, needsEvidence: false, subsections: SUBSECTION_SOURCE.FIXED, fixedSubsections: ["growth", "decision"] },
  { key: "conditioningShadow", order: 16, minChars: 1400, maxChars: 3200, needsEvidence: true, subsections: SUBSECTION_SOURCE.OPEN_CENTERS },
  { key: "practicalGuide", order: 17, minChars: 1500, maxChars: 3300, needsEvidence: false, subsections: null },
  { key: "finalSynthesis", order: 18, minChars: 800, maxChars: 2600, needsEvidence: false, subsections: null },
]);

export const HD_REPORT_SECTION_KEYS = Object.freeze(HD_REPORT_SECTIONS.map((section) => section.key));

/**
 * 🔴 폴백 수용 문턱. 관례는 그 호출의 목표 분량 × 0.4 다.
 *    안 주면 Workers AI 폴백이 8% 분량을 내놔도 정상 결제 결과로 전달된다
 *    (worker/lib/gemini.js 의 rejectShortFallback 주석 참고).
 */
export function hdReportFallbackMinChars(spec) {
  return Math.round(Number(spec?.minChars || 0) * 0.4);
}

// ── 자체 검사 ────────────────────────────────────────────────────────────────
// 표를 손으로 고치다 합이 무너지는 것을 모듈 로드 시점에 잡는다. 가드가 도는 것을 기다리지 않는다.
{
  const keys = new Set(HD_REPORT_SECTION_KEYS);
  if (keys.size !== HD_REPORT_SECTIONS.length) {
    throw new Error("human-design-report-contract: 섹션 key 가 중복이다.");
  }
  const minSum = HD_REPORT_SECTIONS.reduce((sum, section) => sum + section.minChars, 0);
  if (minSum < HD_REPORT_TARGET_CHARS) {
    throw new Error(`human-design-report-contract: 섹션 minChars 합(${minSum})이 광고 분량(${HD_REPORT_TARGET_CHARS})에 못 미친다.`);
  }
  const maxSum = HD_REPORT_SECTIONS.reduce((sum, section) => sum + section.maxChars, 0);
  if (maxSum > HD_REPORT_MAX_TOTAL_CHARS) {
    throw new Error(`human-design-report-contract: 섹션 maxChars 합(${maxSum})이 저장 상한(${HD_REPORT_MAX_TOTAL_CHARS})을 넘는다.`);
  }
  for (const section of HD_REPORT_SECTIONS) {
    if (section.maxChars - section.minChars < 1500) {
      throw new Error(`human-design-report-contract: ${section.key} 의 분량 여유가 1500자 미만이다.`);
    }
  }
}

// ── 차트에서 유도하는 것 ─────────────────────────────────────────────────────

const CENTER_KEY_BY_LABEL = Object.freeze(
  Object.fromEntries(Object.entries(CENTER_LABEL).map(([key, value]) => [value, key])),
);

/** 인카네이션 크로스 4게이트 + 목/천골에 붙은 활성 게이트. 핵심 게이트 섹션의 재료다. */
function pickCoreGates(calculation) {
  const cross = calculation.incarnationCross?.gates || {};
  const crossGates = [cross.personalitySun, cross.personalityEarth, cross.designSun, cross.designEarth]
    .filter((gate) => Number.isInteger(gate));
  const channelGates = (calculation.channels || []).flatMap((channel) => [channel.gateA, channel.gateB]);
  const ordered = [...new Set([...crossGates, ...channelGates])]
    .filter((gate) => (calculation.activeGates || []).includes(gate));
  return ordered.slice(0, 8);
}

/**
 * 모델이 달 수 있는 subsection id 와 evidence id 의 **허용 집합**.
 * 여기 없는 id 는 버린다 — 없는 채널·센터를 지어내는 것을 막는 1차 방어선이다.
 */
export function buildAllowedIds(calculation) {
  ensureHumanDesignCalculationPresence(calculation);
  const defined = new Set(calculation.definedCenters);
  const centers = CENTER_ORDER.map((center) => `center:${center}`);
  const gates = (calculation.activeGates || []).map((gate) => `gate:${gate}`);
  const channels = (calculation.channels || []).map((channel) => `channel:${channel.channelId}`);
  const planets = (calculation.activations || []).map((a) => `planet:${a.planet}:${a.layer}`);
  return {
    all: new Set([...centers, ...gates, ...channels, ...planets]),
    definedCenters: CENTER_ORDER.filter((center) => defined.has(center)).map((center) => `center:${center}`),
    openCenters: CENTER_ORDER.filter((center) => !defined.has(center)).map((center) => `center:${center}`),
    channels,
    coreGates: pickCoreGates(calculation).map((gate) => `gate:${gate}`),
    activations: planets,
  };
}

/** 이 섹션이 다뤄야 할 subsection id 목록. 없으면 빈 배열. */
export function requiredSubsectionIds(spec, allowed) {
  switch (spec.subsections) {
    case SUBSECTION_SOURCE.DEFINED_CENTERS: return allowed.definedCenters;
    case SUBSECTION_SOURCE.OPEN_CENTERS: return allowed.openCenters;
    case SUBSECTION_SOURCE.CHANNELS: return allowed.channels;
    case SUBSECTION_SOURCE.CORE_GATES: return allowed.coreGates;
    case SUBSECTION_SOURCE.ACTIVATIONS: return allowed.activations.slice(0, 8);
    case SUBSECTION_SOURCE.FIXED: return (spec.fixedSubsections || []).map((id) => `topic:${id}`);
    default: return [];
  }
}

/**
 * 개수에 따라 실목표를 조절한다.
 *
 * 🔴 고정 자수를 강요하면 채널이 2개인 사람에게 2,200자를 채우라고 시키는 꼴이라 반복이 나온다
 *    (요구 4가 금지한 것). 반대로 개수만큼 곱하면 채널 0개인 리플렉터의 하한이 무너진다.
 *    그래서 바닥은 개수와 무관하게 두고 그 위에서만 늘린다.
 */
export function effectiveMinChars(spec, subsectionCount) {
  const base = Math.round(spec.minChars * 0.62);
  const scaled = base + (260 * Math.max(0, Number(subsectionCount || 0) - 3));
  return Math.max(base, Math.min(scaled, spec.maxChars - 400));
}

// ── 사후 검산 ────────────────────────────────────────────────────────────────

const ALL_PROFILES = Object.freeze([
  "1/3", "1/4", "2/4", "2/5", "3/5", "3/6", "4/6", "4/1", "5/1", "5/2", "6/2", "6/3",
]);

const ALL_TYPE_LABELS = Object.freeze([
  "Generator", "Manifesting Generator", "Projector", "Manifestor", "Reflector",
]);

function visibleChars(text) {
  return String(text || "").replace(/\s+/g, "").length;
}

/** 섹션 본문 전체(본문 + subsection 본문)를 한 덩어리로. */
export function sectionText(payload) {
  const parts = [String(payload?.body || "")];
  for (const sub of payload?.subsections || []) parts.push(String(sub?.body || ""));
  return parts.join("\n");
}

export function sectionCharCount(payload) {
  return visibleChars(sectionText(payload));
}

/** 24자 이상 문장만 센다 — 짧은 관용구까지 중복으로 잡으면 정상 글이 반려된다. */
function sentencesOf(text) {
  return String(text || "")
    .split(/(?<=[.!?。？！])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 24);
}

function hangulRatio(text) {
  const stripped = String(text || "").replace(/\s+/g, "");
  if (!stripped) return 0;
  const hangul = stripped.match(/[가-힣]/g);
  return (hangul ? hangul.length : 0) / stripped.length;
}

/**
 * 돌아온 섹션이 계산 결과와 모순되지 않는지 본다.
 *
 * 🔴 여기서 하는 것은 **모순 탐지**이지 품질 채점이 아니다. 좋은 글인지는 기계가 못 본다.
 *    잡는 것은 "이 사람 것이 아닌 값을 이 사람 것처럼 서술" 과 "차트에 없는 것을 지어냄" 뿐이다.
 *
 * @returns {{ok:boolean, issues:string[], charCount:number, keptSubsections:object[]}}
 */
export function validateHumanDesignReportSection(payload, options) {
  const { spec, snapshot, locale, allowed, requiredIds = [], seenSentences } = options || {};
  const issues = [];

  const keptSubsections = (payload?.subsections || [])
    .filter((sub) => sub && typeof sub === "object")
    .filter((sub) => allowed.all.has(String(sub.id || "")) || String(sub.id || "").startsWith("topic:"))
    .map((sub) => ({
      id: String(sub.id).slice(0, 80),
      title: String(sub.title || "").trim().slice(0, 160),
      body: String(sub.body || "").trim(),
    }));

  const missing = requiredIds.filter((id) => !keptSubsections.some((sub) => sub.id === id));
  if (missing.length) issues.push(`missing_subsection:${missing.slice(0, 4).join(",")}`);

  const evidence = (payload?.evidence || [])
    .map((id) => String(id || ""))
    .filter((id) => allowed.all.has(id));
  if (spec.needsEvidence && evidence.length === 0) issues.push("missing_evidence");

  const text = sectionText({ ...payload, subsections: keptSubsections });
  const charCount = visibleChars(text);
  const targetMin = effectiveMinChars(spec, requiredIds.length);
  if (charCount < targetMin) issues.push(`too_short:${charCount}<${targetMin}`);

  // 확정값 모순 — 이 사람 것이 아닌 프로파일·타입을 이 사람 것처럼 쓰면 반려한다.
  for (const profile of ALL_PROFILES) {
    if (profile === snapshot.profile) continue;
    if (text.includes(profile)) { issues.push(`foreign_profile:${profile}`); break; }
  }
  for (const type of ALL_TYPE_LABELS) {
    if (type === snapshot.type) continue;
    // 비교·설명 목적의 언급은 허용하되, "당신은 X" 형태만 잡는다.
    const claimed = new RegExp(`(당신은|당신의 타입은|You are|your type is)\\s*[^.\\n]{0,12}${type}`, "i");
    if (claimed.test(text)) { issues.push(`foreign_type:${type}`); break; }
  }

  // 열린 센터를 "정의된" 으로 서술하는 것은 차트와 정면으로 어긋난다.
  for (const openId of allowed.openCenters) {
    const centerKey = openId.slice("center:".length);
    const centerLabel = CENTER_LABEL[centerKey] || centerKey;
    const wrong = new RegExp(`${centerLabel}\\s*(센터)?\\s*(는|은|이|가)?\\s*(정의된|정의돼|defined)`, "i");
    if (wrong.test(text)) { issues.push(`open_center_called_defined:${centerKey}`); break; }
  }

  // 차트에 없는 채널 번호를 지어내는 것.
  const activeChannelIds = new Set(snapshot.channels.map((channel) => channel.channelId));
  for (const match of text.matchAll(/(?:채널|channel)\s*(\d{1,2}\s*-\s*\d{1,2})/gi)) {
    const normalized = match[1].replace(/\s+/g, "");
    if (!activeChannelIds.has(normalized)) { issues.push(`unknown_channel:${normalized}`); break; }
  }

  // 로케일 드리프트 — ko 섹션이 영어로, en 섹션이 한국어로 오는 것.
  const ratio = hangulRatio(text);
  if (locale === "ko" && ratio < 0.6) issues.push(`locale_drift:ko:${ratio.toFixed(2)}`);
  if (locale === "en" && ratio > 0.05) issues.push(`locale_drift:en:${ratio.toFixed(2)}`);

  // 반복 — 앞선 섹션에서 이미 쓴 문장을 다시 쓰는 것.
  if (seenSentences instanceof Set) {
    const sentences = sentencesOf(text);
    const repeated = sentences.filter((sentence) => seenSentences.has(sentence));
    if (sentences.length && repeated.length / sentences.length > 0.2) {
      issues.push(`repetition:${repeated.length}/${sentences.length}`);
    }
  }

  return { ok: issues.length === 0, issues, charCount, keptSubsections, evidence };
}

/** 검증을 통과한 섹션의 문장을 누적한다. 다음 섹션의 반복 검사 기준이 된다. */
export function rememberSentences(seenSentences, payload) {
  if (!(seenSentences instanceof Set)) return;
  for (const sentence of sentencesOf(sectionText(payload))) seenSentences.add(sentence);
}
