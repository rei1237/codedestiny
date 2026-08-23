// 프리미엄 리포트 플랜 — **웹 리더와 PDF 조판기가 함께 소비하는 단일 정본**.
//
// 🔴 이 모듈이 존재하는 이유는 요구 3("AI 결과와 PDF 결과가 서로 다른 내용을 생성하는 구조를
//    만들지 않는다")을 *검사 항목*이 아니라 **불가능한 상태**로 만들기 위해서다. 리더가 자기
//    JSX 로 문단을 만들고 PDF 가 따로 조판하면 둘은 언젠가 반드시 갈린다. 그래서 "무엇을 어떤
//    순서로 그릴 것인가" 를 여기서 한 번만 정하고, 양쪽은 그 배열을 렌더링만 한다.
//
// 🔴 순수 .js 인 이유는 lib/pdf/fusion-report-plan.js 와 같다 — Jest 에 TS 프리셋이 없어
//    verify 가 **실제로 실행해** 분량·빈 장·페이지네이션을 재려면 JS 여야 한다. 그래서 이
//    파일은 DOM·jsPDF·네트워크·React 를 한 줄도 참조하지 않는다.
//
// 🔴 숫자 표(keyvalue·meter)는 **모델이 아니라 차트에서 계산한다.** 모델에게 "정의된 센터가
//    몇 개인지" 를 쓰게 하면 그 숫자가 환각될 수 있고, PDF 에서도 캡처 없이 조판할 수 없다.

import { CENTER_ORDER } from "./centers.js";
import {
  AUTHORITY_NAME,
  CENTER_NAME,
  CROSS_ANGLE_NAME,
  DEFINITION_NAME,
  LAYER_NAME,
  NOT_SELF_NAME,
  PLANET_NAME,
  SIGNATURE_NAME,
  STRATEGY_NAME,
  TYPE_NAME,
  displayName,
} from "./display-names.js";

/** 플랜 구조가 바뀌면 올린다. PDF 표지와 골든 스냅샷이 이 값을 찍는다. */
export const REPORT_PLAN_VERSION = "hd-report-plan-1";

/**
 * 렌더러가 반드시 다뤄야 하는 블록 종류.
 * 🔴 리더는 이 목록을 `Record<kind, Renderer>` 로 받으므로 **하나라도 빠뜨리면 컴파일이 깨진다.**
 */
export const REPORT_BLOCK_KINDS = Object.freeze([
  "lead",
  "paragraph",
  "heading",
  "bullets",
  "quote",
  "insight",
  "steps",
  "summary",
  "keyvalue",
  "meter",
  "chart",
]);

/**
 * 🔴 도표 상한 6장. PDF 캡처 시간·메모리가 여기에 정비례한다(SVG 노드 1,100여 개 × 장수).
 *    늘리려면 순차 캡처 실측을 먼저 하고 늘린다.
 */
export const REPORT_CHART_SLOT_LIMIT = 6;

/** 전체 64게이트·36채널 중 실제 활성 개수를 비율로 보여줄 때 쓰는 분모. */
const TOTAL_GATES = 64;
const TOTAL_CHANNELS = 36;
const TOTAL_CENTERS = 9;

const T = Object.freeze({
  coverTitle: { ko: "휴먼 디자인 프리미엄 리포트", en: "Human Design Premium Report" },
  coverSubtitle: { ko: "개인 분석 데이터북", en: "A personal analysis databook" },
  factType: { ko: "타입", en: "Type" },
  factStrategy: { ko: "전략", en: "Strategy" },
  factAuthority: { ko: "내적 권위", en: "Inner Authority" },
  factProfile: { ko: "프로파일", en: "Profile" },
  factDefinition: { ko: "정의", en: "Definition" },
  factSignature: { ko: "시그니처", en: "Signature" },
  factNotSelf: { ko: "낫셀프 테마", en: "Not-Self Theme" },
  factCenters: { ko: "정의된 센터", en: "Defined centers" },
  keyPoints: { ko: "이 장의 요점", en: "Key points" },
  evidence: { ko: "이 장이 근거로 삼은 차트 요소", en: "Chart elements this chapter draws on" },
  practice: { ko: "실천 단계", en: "Practice steps" },
  closing: { ko: "마무리 정리", en: "Closing summary" },
  blueprint: { ko: "확정값", en: "Fixed values" },
  spread: { ko: "차트 분포", en: "Chart distribution" },
  definedCenters: { ko: "정의된 센터", en: "Defined centers" },
  openCenters: { ko: "열린 센터", en: "Open centers" },
  activeGates: { ko: "활성 게이트", en: "Active gates" },
  completeChannels: { ko: "완성된 채널", en: "Complete channels" },
  channelMix: { ko: "채널 구성", en: "Channel composition" },
  compPersonality: { ko: "의식만", en: "Personality only" },
  compDesign: { ko: "무의식만", en: "Design only" },
  compMixed: { ko: "의식+무의식", en: "Mixed" },
  crossGates: { ko: "크로스 게이트", en: "Cross gates" },
  crossAngle: { ko: "앵글", en: "Angle" },
  crossNotation: { ko: "표기", en: "Notation" },
  profileLines: { ko: "프로파일 라인", en: "Profile lines" },
  linePersonality: { ko: "의식 라인", en: "Personality line" },
  lineDesign: { ko: "무의식 라인", en: "Design line" },
  sunPersonality: { ko: "의식 태양", en: "Personality Sun" },
  sunDesign: { ko: "무의식 태양", en: "Design Sun" },
  chartOverview: { ko: "전체 바디그래프", en: "The full BodyGraph" },
  chartDefined: { ko: "정의된 센터 강조", en: "Defined center highlighted" },
  chartOpen: { ko: "열린 센터 강조", en: "Open center highlighted" },
  chartChannel: { ko: "채널 강조", en: "Channel highlighted" },
  chartGate: { ko: "핵심 게이트 강조", en: "Core gate highlighted" },
  chartPlanet: { ko: "행성 활성 강조", en: "Planetary activation highlighted" },
  center: { ko: "센터", en: "center" },
  gate: { ko: "게이트", en: "Gate" },
  channel: { ko: "채널", en: "Channel" },
  line: { ko: "라인", en: "Line" },
});

function t(key, locale) {
  const entry = T[key];
  if (!entry) return key;
  return entry[locale] || entry.en;
}

function text(value) {
  return String(value == null ? "" : value).trim();
}

/** 공백을 뺀 글자 수. 서버 검증(sectionCharCount)과 같은 셈법이어야 비교가 성립한다. */
function visibleChars(value) {
  return text(value).replace(/\s+/g, "").length;
}

function paragraphsOf(body) {
  return text(body)
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
}

// ── 차트 요소 id → 사람이 읽는 라벨 ──────────────────────────────────────────

/**
 * `center:THROAT` · `gate:34` · `channel:20-34` · `planet:Sun:design` 를 라벨로.
 * 🔴 모르는 형태는 원본을 그대로 돌려준다 — 조용히 빈칸이 되면 근거가 사라진 것을 못 본다.
 */
export function describeChartId(id, locale) {
  const raw = text(id);
  const parts = raw.split(":");
  if (parts[0] === "center" && parts[1]) {
    const name = displayName(CENTER_NAME, parts[1], locale);
    return locale === "ko" ? `${name} ${t("center", locale)}` : `${name} center`;
  }
  if (parts[0] === "gate" && parts[1]) return `${t("gate", locale)} ${parts[1]}`;
  if (parts[0] === "channel" && parts[1]) return `${t("channel", locale)} ${parts[1]}`;
  if (parts[0] === "planet" && parts[1]) {
    const planet = displayName(PLANET_NAME, parts[1], locale);
    const layer = parts[2] ? displayName(LAYER_NAME, parts[2], locale) : "";
    return layer ? `${planet} · ${layer}` : planet;
  }
  if (parts[0] === "topic") return raw;
  return raw;
}

/** subsection 제목이 비어 있거나 id 그대로면 id 에서 만든 라벨로 대체한다. */
function subsectionTitle(sub, locale) {
  const title = text(sub?.title);
  const id = text(sub?.id);
  if (title && title !== id) return title;
  return describeChartId(id, locale);
}

// ── 차트에서 계산하는 표 ─────────────────────────────────────────────────────

function definedSet(chart) {
  return new Set(chart?.definedCenters || []);
}

function channelComposition(chart) {
  const counts = { PERSONALITY_ONLY: 0, DESIGN_ONLY: 0, MIXED: 0 };
  for (const channel of chart?.channels || []) {
    if (counts[channel.composition] !== undefined) counts[channel.composition] += 1;
  }
  return counts;
}

function blueprintTable(chart, locale) {
  const rows = [
    { label: t("factType", locale), value: displayName(TYPE_NAME, chart.type, locale) },
    { label: t("factStrategy", locale), value: displayName(STRATEGY_NAME, chart.strategy, locale) },
    { label: t("factAuthority", locale), value: displayName(AUTHORITY_NAME, chart.authority, locale) },
    { label: t("factProfile", locale), value: text(chart.profile) },
    { label: t("factDefinition", locale), value: displayName(DEFINITION_NAME, chart.definition, locale) },
    { label: t("factSignature", locale), value: displayName(SIGNATURE_NAME, chart.signature, locale) },
    { label: t("factNotSelf", locale), value: displayName(NOT_SELF_NAME, chart.notSelfTheme, locale) },
  ];
  return { kind: "keyvalue", title: t("blueprint", locale), rows: rows.filter((row) => row.value) };
}

function spreadMeter(chart, locale) {
  const defined = definedSet(chart).size;
  return {
    kind: "meter",
    title: t("spread", locale),
    items: [
      { label: t("definedCenters", locale), value: defined, max: TOTAL_CENTERS, display: `${defined} / ${TOTAL_CENTERS}` },
      {
        label: t("activeGates", locale),
        value: (chart.activeGates || []).length,
        max: TOTAL_GATES,
        display: `${(chart.activeGates || []).length} / ${TOTAL_GATES}`,
      },
      {
        label: t("completeChannels", locale),
        value: (chart.channels || []).length,
        max: TOTAL_CHANNELS,
        display: `${(chart.channels || []).length} / ${TOTAL_CHANNELS}`,
      },
    ],
  };
}

function centerListTable(chart, locale, wantDefined) {
  const defined = definedSet(chart);
  const list = CENTER_ORDER.filter((center) => defined.has(center) === wantDefined);
  return {
    kind: "meter",
    title: wantDefined ? t("definedCenters", locale) : t("openCenters", locale),
    items: [
      {
        label: wantDefined ? t("definedCenters", locale) : t("openCenters", locale),
        value: list.length,
        max: TOTAL_CENTERS,
        display: list.length
          ? list.map((center) => displayName(CENTER_NAME, center, locale)).join(" · ")
          : `0 / ${TOTAL_CENTERS}`,
      },
    ],
  };
}

function channelMixTable(chart, locale) {
  const counts = channelComposition(chart);
  return {
    kind: "keyvalue",
    title: t("channelMix", locale),
    rows: [
      { label: t("compPersonality", locale), value: String(counts.PERSONALITY_ONLY) },
      { label: t("compDesign", locale), value: String(counts.DESIGN_ONLY) },
      { label: t("compMixed", locale), value: String(counts.MIXED) },
      { label: t("completeChannels", locale), value: String((chart.channels || []).length) },
    ],
  };
}

function crossTable(chart, locale) {
  const cross = chart.incarnationCross || {};
  const gates = cross.gates || {};
  const ordered = [gates.personalitySun, gates.personalityEarth, gates.designSun, gates.designEarth]
    .filter((gate) => Number.isInteger(gate));
  const rows = [];
  if (ordered.length) rows.push({ label: t("crossGates", locale), value: ordered.join(" / ") });
  if (cross.angle) rows.push({ label: t("crossAngle", locale), value: displayName(CROSS_ANGLE_NAME, cross.angle, locale) });
  if (cross.notation) rows.push({ label: t("crossNotation", locale), value: text(cross.notation) });
  return rows.length ? { kind: "keyvalue", title: t("factProfile", locale), rows } : null;
}

function profileTable(chart, locale) {
  const lines = chart.profileLines || {};
  if (!Number.isInteger(lines.personality) || !Number.isInteger(lines.design)) return null;
  return {
    kind: "keyvalue",
    title: t("profileLines", locale),
    rows: [
      { label: t("linePersonality", locale), value: `${t("line", locale)} ${lines.personality}` },
      { label: t("lineDesign", locale), value: `${t("line", locale)} ${lines.design}` },
      { label: t("factProfile", locale), value: text(chart.profile) },
    ],
  };
}

function sunTable(chart, locale) {
  const find = (layer) => (chart.activations || []).find((a) => a.planet === "Sun" && a.layer === layer);
  const personality = find("personality");
  const design = find("design");
  const rows = [];
  if (personality) rows.push({ label: t("sunPersonality", locale), value: `${t("gate", locale)} ${personality.gate}.${personality.line}` });
  if (design) rows.push({ label: t("sunDesign", locale), value: `${t("gate", locale)} ${design.gate}.${design.line}` });
  return rows.length ? { kind: "keyvalue", title: t("sunPersonality", locale), rows } : null;
}

/** 장별로 붙는 계산 표. 모델 문장과 무관하게 차트만으로 만들어진다. */
function computedBlocks(chapterKey, chart, locale) {
  switch (chapterKey) {
    case "energyBlueprint": return [blueprintTable(chart, locale), spreadMeter(chart, locale)];
    case "profile": return [profileTable(chart, locale)];
    case "centersDefined": return [centerListTable(chart, locale, true)];
    case "centersOpen": return [centerListTable(chart, locale, false)];
    case "conditioningShadow": return [centerListTable(chart, locale, false)];
    case "channels": return [channelMixTable(chart, locale)];
    case "incarnationCross": return [crossTable(chart, locale)];
    case "planetaryActivations": return [sunTable(chart, locale)];
    default: return [];
  }
}

// ── 도표 슬롯 ────────────────────────────────────────────────────────────────

/**
 * 어느 장에 어떤 시야의 차트를 넣을지. 🔴 각 슬롯은 서로 **다른 것을 보여줘야** 한다 —
 * 같은 그림을 여섯 번 넣으면 캡처 비용만 여섯 배가 되고 읽는 사람에게는 아무것도 안 준다.
 */
function chartSlotFor(chapterKey, chart, locale) {
  const defined = definedSet(chart);
  switch (chapterKey) {
    case "energyBlueprint":
      return { slotId: "overview", selection: null, caption: t("chartOverview", locale) };
    case "centersDefined": {
      const center = CENTER_ORDER.find((key) => defined.has(key));
      return center ? { slotId: "center-defined", selection: { kind: "center", center }, caption: t("chartDefined", locale) } : null;
    }
    case "centersOpen": {
      const center = CENTER_ORDER.find((key) => !defined.has(key));
      return center ? { slotId: "center-open", selection: { kind: "center", center }, caption: t("chartOpen", locale) } : null;
    }
    case "channels": {
      const channel = (chart.channels || [])[0];
      return channel ? { slotId: "channel", selection: { kind: "channel", channelId: channel.channelId }, caption: t("chartChannel", locale) } : null;
    }
    case "gatesCore": {
      const gate = chart.incarnationCross?.gates?.personalitySun;
      return Number.isInteger(gate) ? { slotId: "gate-core", selection: { kind: "gate", gate }, caption: t("chartGate", locale) } : null;
    }
    case "planetaryActivations":
      return { slotId: "planet-sun", selection: { kind: "planet", planet: "Sun", layer: "personality" }, caption: t("chartPlanet", locale) };
    default:
      return null;
  }
}

// ── 플랜 조립 ────────────────────────────────────────────────────────────────

/**
 * 표지에 싣는 확정값. 결제 **전** 잠금 화면도 같은 함수를 쓴다 — 사본을 두면 산 뒤에 값이
 * 달라 보일 수 있고, 그건 신뢰를 잃는 종류의 차이다.
 *
 * 🔴 생년월일·생시·이름을 넣지 않는다. 리포트는 공유되기 쉬운 물건이고 PDF 파일명도 같은 선이다.
 */
export function buildReportCoverFacts(chart, locale) {
  const lang = locale === "en" ? "en" : "ko";
  const defined = definedSet(chart).size;
  return [
    { label: t("factType", lang), value: displayName(TYPE_NAME, chart.type, lang) },
    { label: t("factStrategy", lang), value: displayName(STRATEGY_NAME, chart.strategy, lang) },
    { label: t("factAuthority", lang), value: displayName(AUTHORITY_NAME, chart.authority, lang) },
    { label: t("factProfile", lang), value: text(chart.profile) },
    { label: t("factCenters", lang), value: `${defined} / ${TOTAL_CENTERS}` },
  ].filter((fact) => fact.value);
}

function chapterBlocks(section, chart, locale, slot) {
  const blocks = [];
  const paragraphs = paragraphsOf(section.body);

  if (paragraphs.length) blocks.push({ kind: "lead", text: paragraphs[0] });

  // 🔴 요점은 **본문보다 앞**에 온다. 25,000자를 순서대로 읽지 않는 사람이 장의 주장을
  //    먼저 잡을 수 있어야 한다(요구 21 의 "인사이트 카드").
  const keyPoints = (section.keyPoints || []).map(text).filter(Boolean);
  if (keyPoints.length) {
    if (section.key === "practicalGuide") {
      blocks.push({
        kind: "steps",
        title: t("practice", locale),
        items: keyPoints.map((item, index) => ({ index: index + 1, text: item })),
      });
    } else if (section.key === "finalSynthesis") {
      blocks.push({ kind: "summary", title: t("closing", locale), items: keyPoints });
    } else if (section.key === "executiveSummary") {
      blocks.push({ kind: "quote", text: keyPoints[0] });
      if (keyPoints.length > 1) blocks.push({ kind: "insight", title: t("keyPoints", locale), items: keyPoints.slice(1) });
    } else {
      blocks.push({ kind: "insight", title: t("keyPoints", locale), items: keyPoints });
    }
  }

  for (const block of computedBlocks(section.key, chart, locale)) {
    if (block) blocks.push(block);
  }

  if (slot) blocks.push({ kind: "chart", slotId: slot.slotId, selection: slot.selection, caption: slot.caption });

  for (const paragraph of paragraphs.slice(1)) blocks.push({ kind: "paragraph", text: paragraph });

  for (const sub of section.subsections || []) {
    const body = paragraphsOf(sub?.body);
    if (!body.length) continue;
    blocks.push({ kind: "heading", text: subsectionTitle(sub, locale), anchorId: text(sub?.id) });
    for (const paragraph of body) blocks.push({ kind: "paragraph", text: paragraph });
  }

  // 🔴 근거는 **차트 id 를 라벨로 옮긴 것**이지 모델 문장이 아니다. 요구 28("제공받은 계산
  //    데이터만 사용")이 지켜졌는지를 읽는 사람이 직접 확인할 수 있는 자리다.
  const evidence = (section.evidence || []).map(text).filter(Boolean);
  if (evidence.length) {
    blocks.push({
      kind: "bullets",
      title: t("evidence", locale),
      items: evidence.map((id) => describeChartId(id, locale)),
    });
  }

  return blocks;
}

/**
 * 저장된 리포트 + 차트 → 웹/PDF 공용 플랜.
 *
 * @param {object} report `/api/human-design-report/result` 의 공개 형태
 * @param {object} chart  `/api/human-design/chart` 의 계산 객체
 * @param {{locale?: "ko"|"en"}} [options]
 */
export function buildHumanDesignReportPlan(report, chart, options = {}) {
  if (!report || typeof report !== "object") throw new Error("report-plan: report 가 없다.");
  if (!chart || typeof chart !== "object") throw new Error("report-plan: chart 가 없다.");

  // 🔴 본문 언어는 **저장된 report.locale** 이다. 뷰어 언어가 아니다 — 그래야 ko 리포트를
  //    en 브라우저에서 열어도 웹과 PDF 가 같은 것을 낸다(요구 3).
  const locale = report.locale === "en" ? "en" : (options.locale === "en" && !report.locale ? "en" : "ko");

  const sections = [...(report.sections || [])]
    .filter((section) => section && text(section.body))
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  let slotBudget = REPORT_CHART_SLOT_LIMIT;
  const chartSlots = [];
  const chapters = sections.map((section) => {
    const slot = slotBudget > 0 ? chartSlotFor(section.key, chart, locale) : null;
    if (slot) {
      slotBudget -= 1;
      chartSlots.push({ ...slot, chapterKey: section.key });
    }
    return {
      key: section.key,
      order: section.order,
      title: text(section.title) || section.key,
      blocks: chapterBlocks(section, chart, locale, slot),
    };
  });

  const cover = {
    title: t("coverTitle", locale),
    subtitle: t("coverSubtitle", locale),
    facts: buildReportCoverFacts(chart, locale),
    planVersion: REPORT_PLAN_VERSION,
    chapterCount: chapters.length,
  };

  const plan = { planVersion: REPORT_PLAN_VERSION, locale, cover, chapters, chartSlots };
  plan.stats = {
    chapters: chapters.length,
    blocks: chapters.reduce((sum, chapter) => sum + chapter.blocks.length, 0),
    chars: countReportChars(plan),
    chartSlots: chartSlots.length,
  };
  return plan;
}

/** 플랜이 실제로 담고 있는 글자 수(공백 제외). 광고 분량 대조에 쓴다. */
export function countReportChars(plan) {
  let total = 0;
  for (const chapter of plan?.chapters || []) {
    total += visibleChars(chapter.title);
    for (const block of chapter.blocks || []) {
      if (block.text) total += visibleChars(block.text);
      for (const item of block.items || []) {
        total += visibleChars(typeof item === "string" ? item : (item.text || item.display || item.label || ""));
      }
      for (const row of block.rows || []) total += visibleChars(`${row.label}${row.value}`);
    }
  }
  return total;
}

/** PDF 호출부가 미리 캡처해야 하는 도표 목록. */
export function collectChartSlots(plan) {
  return (plan?.chartSlots || []).map((slot) => ({
    slotId: slot.slotId,
    chapterKey: slot.chapterKey,
    selection: slot.selection,
    caption: slot.caption,
  }));
}
