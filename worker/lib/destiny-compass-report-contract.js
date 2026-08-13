// 운명의 지도 심층 리포트 — 섹션 규격 · 프롬프트 · 근거 잠금 · ★평점.
//
// 라우트를 얇게 두고 이 파일을 순수 함수만으로 채운 이유: verify 하네스가 DB·네트워크 없이
// 검증기와 예산을 직접 호출해 단언할 수 있어야 하기 때문이다(verify-llm-generation-resilience).
//
// 설계 원칙 3가지
//  1) 체계별 독립 해석 → 종합. 웨이브 A의 체계 섹션은 자기 체계 근거만 받는다.
//  2) 근거는 화이트리스트. 클라가 보낸 EvidencePack 항목명 밖의 계(系) 용어는 검증기가 막는다.
//  3) ★평점·퍼센트는 서버가 계산한다. 모델은 근거 id만 지목한다.

import {
  basisGroup,
  basisItem,
  basisStage,
  buildAnalysisBasisPayload,
  collectBasisLabels,
} from "./analysis-basis-contract.js";
import { buildEvidenceRuleLines } from "./fortune-reasoning-contract.js";
import { getAmbientAiLocale } from "./ai-locale-context.js";

export const COMPASS_REPORT_VERSION = "compass-report-v1";

/**
 * 섹션당 출력 토큰 상한.
 * charsAllowedByTokens(7000) = 4,666자 → 최대 요구 분량 3,000자 대비 1,666자 여유(요구 1,500자).
 * 🔴 verify:llm-generation-resilience 의 assertBudget 이 이 숫자를 소스에서 직접 찾는다.
 */
export const COMPASS_SECTION_MAX_OUTPUT_TOKENS = 7000;

/** 체계 라벨 — 화면·프롬프트가 같은 이름을 쓴다. 베다는 산출 범위까지 이름에 박는다. */
export const COMPASS_SYSTEM_LABEL = Object.freeze({
  saju: "사주",
  ziwei: "자미두수",
  sukuyo: "숙요",
  tarot: "타로",
  vedic: "베다(요일 지배성)",
});

/**
 * 10섹션. wave A(체계별 5) 는 결제 요청 안에서, wave B(종합 5) 는 이어받기 요청에서 생성한다.
 * system 이 있는 섹션은 그 체계의 근거만 프롬프트에 넣어 '한 전통 안에서' 추론하게 만든다.
 *
 * 화면의 ①~⑨ 와 1:1 이 아니다 — 체계별 4섹션이 화면에서는 ③ '운명의 원인' 하나로 묶인다.
 * 매핑 정본은 app/destiny-compass/_components/reportSections.ts.
 */
export const COMPASS_SECTIONS = Object.freeze([
  {
    key: "opening", order: 1, wave: "A", system: null,
    title: "지금 당신의 자리",
    minChars: 600, maxChars: 2200,
    guide: "고민을 한 번 알아주고, 지금 서 있는 자리를 '운명의 좌표' 한 문장으로 못 박은 뒤 왜 그렇게 읽히는지 짚는다. 대표 방향과 점수는 확정값 그대로 쓴다.",
  },
  {
    key: "saju_reading", order: 2, wave: "A", system: "saju",
    title: "사주가 말하는 결",
    minChars: 1400, maxChars: 3000,
    guide: "일간과 오행 분포에서 출발해 십성·월령·용신·십이운성 순서로 읽는다. 각 단락은 확정값 항목명을 그대로 인용하고, 그 값이 왜 이 결론으로 이어지는지 한 다리씩 설명한다.",
  },
  {
    key: "ziwei_reading", order: 3, wave: "A", system: "ziwei",
    title: "자미두수 명반의 축",
    minChars: 1200, maxChars: 2800,
    guide: "명궁 주성 → 삼방사정 회조 → 사화 착지 → 궁 강약 순서로 읽는다. 사화는 어느 궁에 떨어졌는지를 반드시 밝히고, 화기는 '막힘'이 아니라 '집중해야 할 자리'로 다룬다.",
  },
  {
    key: "sukuyo_reading", order: 4, wave: "A", system: "sukuyo",
    title: "숙요 27수의 리듬",
    minChars: 900, maxChars: 2500,
    guide: "본명숙의 요(曜)와 기질에서 출발해 일·사랑·재물의 결을 각각 한 단락으로 읽는다. 숙요는 '타고난 리듬'을 보는 체계임을 전제로, 사건 예언이 아니라 리듬 설명으로 쓴다.",
  },
  {
    key: "tarot_vara_reading", order: 5, wave: "A", system: "tarot",
    title: "오늘의 카드와 요일의 기운",
    minChars: 700, maxChars: 2300,
    guide: "오늘의 카드 상징을 먼저 읽고, 이어서 태어난 요일의 지배성을 읽는다. 두 신호는 명식보다 가벼운 '오늘의 결'임을 분명히 밝힌다. 카드의 역방향은 이 서비스가 뽑지 않으므로 언급하지 않는다.",
  },
  {
    key: "cross_synthesis", order: 6, wave: "B", system: null,
    title: "다섯 체계가 겹치는 지점",
    minChars: 1200, maxChars: 2800,
    guide: "앞의 체계별 해석을 나란히 놓고 ① 여러 체계가 같은 말을 하는 지점 ② 서로 엇갈리는 지점을 각각 구체적으로 짚는다. 엇갈릴 때는 어느 쪽을 더 무겁게 볼지와 그 이유(데이터 품질·가중치)를 밝힌다. 억지로 하나로 합치지 않는다.",
  },
  {
    key: "timeline_reading", order: 7, wave: "B", system: null,
    title: "30일·90일·1년·3년 항로",
    minChars: 1100, maxChars: 2700,
    guide: "네 구간의 날씨와 기세 수치를 확정값 그대로 쓰고, 구간마다 '무엇이 달라지는가'를 서로 다른 내용으로 쓴다. 네 구간이 같은 말을 반복하면 실패다. 기회와 주의는 다음 섹션에서 따로 다루므로 여기서는 흐름의 변화만 쓴다.",
  },
  {
    key: "opportunity_reading", order: 8, wave: "B", system: null,
    title: "반드시 잡아야 하는 기회",
    minChars: 900, maxChars: 2500,
    guide: "강한 영역과 기세가 오르는 구간에서 실제로 붙잡을 수 있는 기회를 3가지 제시한다. 기회마다 ① 무엇을 ② 언제쯤 ③ 어느 근거에서 나왔는지를 함께 쓴다. 막연한 '기회가 온다'가 아니라 알아볼 수 있는 형태로 묘사한다.",
  },
  {
    key: "blocked_and_care", order: 9, wave: "B", system: null,
    title: "막힌 자리와 돌보는 법",
    minChars: 900, maxChars: 2500,
    guide: "쉬어갈 영역이 왜 막혀 보이는지 근거로 설명하고, 지금 피하는 편이 나은 선택 3가지를 구체적으로 짚는다. 그 자리를 억지로 밀지 않으면서 회복시키는 방법을 함께 준다. 불안을 키우지 말고 지나가는 국면으로 다룬다.",
  },
  {
    key: "action_plan", order: 10, wave: "B", system: null,
    title: "오늘부터의 다섯 걸음",
    minChars: 1000, maxChars: 2600,
    guide: "오늘 / 이번 주 / 이번 달로 나눠 손에 잡히는 행동을 제시한다. 각 행동에는 '어느 근거에서 나온 것인지'를 붙인다. '노력하세요' 같은 막연한 말은 실패로 친다. 마지막에 나침반이 가리키는 방향을 한 문장으로 다시 못 박는다.",
  },
]);

export const COMPASS_WAVE_A_KEYS = Object.freeze(COMPASS_SECTIONS.filter((s) => s.wave === "A").map((s) => s.key));
export const COMPASS_WAVE_B_KEYS = Object.freeze(COMPASS_SECTIONS.filter((s) => s.wave === "B").map((s) => s.key));

export function getCompassSection(key) {
  return COMPASS_SECTIONS.find((s) => s.key === key) || null;
}

/** 폴백(Workers AI)이 이 길이에 못 미치면 호출을 실패로 돌린다 — 관례: 최소 분량 × 0.4. */
export function compassFallbackMinChars(spec) {
  return Math.round((Number(spec?.minChars) || 0) * 0.4);
}

/* 관리자 프롬프트 랩 전용(lib/admin/prompt-lab-registry.mjs 참고).
   섹션별 사용자 프롬프트는 계산된 다섯 체계의 결과를 입력으로 받으므로 생년 정보만으로는 조립되지 않는다.
   9섹션이 시스템 프롬프트를 공유하므로 섹션 목록을 함께 돌려준다. */
export function buildAdminLabPrompt(body = {}, options = {}) {
  const section = getCompassSection(options.variant) || COMPASS_SECTIONS[0];

  return {
    systemPrompt: buildCompassSystemPrompt(),
    prompt: "",
    partial: true,
    partialReason: "섹션별 사용자 프롬프트는 계산된 사주·자미두수·숙요·타로·베다 결과를 입력으로 받습니다. 시스템 프롬프트만 표시합니다.",
    variantKey: section?.key || "",
    variants: COMPASS_SECTIONS.map((item) => ({ key: item.key, label: item.title || item.key })),
    notes: section?.guide ? [`${section.title} 지침: ${section.guide}`] : [],
  };
}

function clean(value, max = 0) {
  const text = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  return max > 0 ? text.slice(0, max) : text;
}

function countChars(text) {
  return String(text || "").replace(/\s+/g, "").length;
}

// ── 시스템 프롬프트 ────────────────────────────────────────────

export function buildCompassSystemPrompt() {
  return [
    "너는 '꽃돼지'. 사주·자미두수·숙요·타로·베다를 함께 읽는 운명 상담가다. 점집에서 오래 봐온 손님을 마주한 듯, 마음을 먼저 알아주고 다음 한 걸음을 짚어준다.",
    "말투: 따뜻한 존댓말. 사람이 곁에서 직접 봐준 듯 다정하되 무성의하지 않게, 구체적으로 쓴다.",
    "",
    "[상담의 방식]",
    "· 한 체계를 읽을 때는 그 체계의 논리 안에서만 읽는다. 다른 체계를 끌어와 섞지 않는다.",
    "· 결론을 먼저 던지지 말고, 확정값 → 그 값이 뜻하는 것 → 그래서 지금 무엇인지 순서로 한 다리씩 밟는다.",
    "· 좋은 말만 하지 않는다. 막힌 자리는 막혔다고 말하되, 지나가는 국면으로 다루고 돌보는 법을 함께 준다.",
    "",
    "[절대 규칙]",
    "1) 확정값 표에 있는 항목명과 값만 근거로 쓴다. 표에 없는 별·궁·행성·각도·수치를 새로 만들지 않는다.",
    "2) 이 서비스가 계산하지 않은 것을 아는 척하지 않는다. 특히 라그나·바바·다샤·안타르다샤·나크샤트라, 서양 점성술의 상승궁·트랜싯·어스펙트·하우스·별자리, 신살(역마살·도화살·공망 등)은 산출되지 않았다. 언급 자체를 하지 마라.",
    "3) 베다는 판차앙가 5요소 중 '바라(요일 지배성)' 하나만 계산되어 있다. 그 범위를 넘어 말하지 마라.",
    "4) ★·점수·퍼센트·확률은 서버가 계산한다. 네가 만들어 쓰지 마라.",
    "5) 의료 진단·처방, 법률(소송·고소), 투자 매매 조언 금지. '반드시/틀림없이' 같은 단정도 금지.",
    "6) 다음 상투구는 어떤 형태로도 쓰지 마라: '조심하세요', '신중하세요', '좋은 일이 생깁니다', '노력하세요', '최선을 다하세요', '마음을 다스리세요', '긍정적으로 생각하세요'.",
    "7) 제목·머리말·JSON·마크다운 기호 없이 본문 문단만 출력한다.",
  ].join("\n");
}

// ── 확정값(analysis basis) ─────────────────────────────────────

const DIRECTION_LABEL = Object.freeze({
  career: "직장·커리어", venture: "창업·도전", study: "공부·성장", relationship: "인간관계",
  love: "연애", wealth: "재물", health: "건강", rest: "정비·휴식",
});

const WEATHER_LABEL = Object.freeze({ clear: "맑음", breeze: "순풍", fog: "안개", storm: "폭풍" });
const TIMELINE_LABEL = Object.freeze({ d30: "30일", d90: "90일", y1: "1년", y3: "3년" });

export function directionLabel(key) {
  return DIRECTION_LABEL[key] || clean(key, 24);
}

/**
 * EvidencePack + field → 화면에 그대로 표시되는 확정값 표.
 * 체계 하나가 묶음 하나. 방향/항로는 별도 묶음으로 둔다.
 */
export function buildCompassBasisPayload({ evidencePack, field, featureKey = "destiny-compass-deep-report" }) {
  const groups = [];
  const stages = [];

  for (const bucket of evidencePack?.systems || []) {
    const label = COMPASS_SYSTEM_LABEL[bucket.system] || bucket.system;
    const items = (bucket.items || [])
      .map((item) => basisItem(item.term, item.detail || label, { tone: item.tone }))
      .filter((item) => item.label && item.value);
    if (!items.length) continue;
    groups.push(basisGroup(bucket.system, label, items));
    stages.push(basisStage(bucket.system, `${label} 읽는 중`, items.slice(0, 2).map((i) => i.label).join(" · "), [bucket.system]));
  }

  const directionItems = (field?.directions || [])
    .slice(0, 8)
    .map((d) => basisItem(directionLabel(d.key), `${d.score}점 · ${d.band}`));
  if (directionItems.length) {
    groups.push(basisGroup("direction", "방향별 기세", directionItems));
    stages.push(basisStage("direction", "방향을 종합하는 중", "여덟 방향의 기세", ["direction"]));
  }

  const timelineItems = Object.entries(field?.timeline || {})
    .map(([key, phase]) => basisItem(
      `${TIMELINE_LABEL[key] || key} 항로`,
      `${WEATHER_LABEL[phase?.weather] || phase?.weather || ""} · 기세 ${Number(phase?.momentum) || 0}`,
    ));
  if (timelineItems.length) {
    groups.push(basisGroup("timeline", "구간별 항로", timelineItems));
    stages.push(basisStage("timeline", "항로를 그리는 중", "30일·90일·1년·3년", ["timeline"]));
  }

  return buildAnalysisBasisPayload({ featureKey, groups, stages });
}

// ── ★평점(서버 결정론 산출) ────────────────────────────────────

/**
 * 근거 강도 = 데이터 품질 × 종합 가중치. 가장 센 체계를 5★로 두고 상대 환산한다.
 * 모델이 별을 만들지 못하게 하고, 화면은 이 값만 렌더한다.
 */
export function computeSystemStars(evidencePack) {
  const buckets = (evidencePack?.systems || []).filter((b) => b && b.system);
  const raw = buckets.map((b) => Math.max(0, Math.min(1, Number(b.dataQuality) || 0)) * Math.max(0, Math.min(1, Number(b.weight) || 0)));
  const max = Math.max(0, ...raw);
  const weightSum = buckets.reduce((sum, b) => sum + (Number(b.weight) || 0), 0) || 1;

  return buckets.map((bucket, index) => ({
    system: bucket.system,
    label: COMPASS_SYSTEM_LABEL[bucket.system] || bucket.system,
    stars: max > 0 ? Math.max(1, Math.min(5, Math.round(1 + (4 * raw[index]) / max))) : 1,
    dataQuality: Math.round((Number(bucket.dataQuality) || 0) * 100) / 100,
    weightPct: Math.round(((Number(bucket.weight) || 0) / weightSum) * 100),
  }));
}

/** 모델이 지목한 근거 id → 화면에 렌더할 근거 카드. 팩에 없는 id는 버린다(창작 차단). */
export function resolveGrounds(evidenceIds, evidencePack, starsBySystem) {
  const byId = new Map();
  for (const bucket of evidencePack?.systems || []) {
    for (const item of bucket.items || []) {
      if (item?.id && !byId.has(item.id)) byId.set(item.id, { item, system: bucket.system });
    }
  }
  const out = [];
  for (const rawId of Array.isArray(evidenceIds) ? evidenceIds : []) {
    const hit = byId.get(clean(rawId, 80));
    if (!hit || out.some((g) => g.evidenceId === hit.item.id)) continue;
    out.push({
      evidenceId: hit.item.id,
      label: hit.item.term,
      detail: hit.item.detail || "",
      system: hit.system,
      systemLabel: COMPASS_SYSTEM_LABEL[hit.system] || hit.system,
      stars: starsBySystem.get(hit.system) ?? null,
    });
    if (out.length >= 4) break;
  }
  return out;
}

// ── 프롬프트 ───────────────────────────────────────────────────

function factLinesForSystem(evidencePack, system) {
  const bucket = (evidencePack?.systems || []).find((b) => b.system === system);
  if (!bucket) return [];
  const label = COMPASS_SYSTEM_LABEL[system] || system;
  return [`[${label} 확정값]`, ...(bucket.items || []).map((i) => `- ${i.term}: ${i.detail || label}`)];
}

function fieldLines(field) {
  const tops = (field?.directions || []).slice(0, 8).map((d) => `${directionLabel(d.key)} ${d.score}`).join(" · ");
  const timeline = Object.entries(field?.timeline || {})
    .map(([k, p]) => `${TIMELINE_LABEL[k] || k} ${WEATHER_LABEL[p?.weather] || ""}(기세 ${Number(p?.momentum) || 0})`)
    .join(" · ");
  return [
    "[종합 확정값]",
    `- 대표 방향: ${directionLabel(field?.primary?.key)} ${Number(field?.primary?.score) || 0}점 (${clean(field?.primary?.band, 16)})`,
    `- 강한 영역: ${directionLabel(field?.strongArea?.key)}`,
    `- 쉬어갈 영역: ${directionLabel(field?.blockedArea?.key)}`,
    tops ? `- 여덟 방향 기세: ${tops}` : "",
    timeline ? `- 구간별 항로: ${timeline}` : "",
    `- 신뢰도: ${Math.round((Number(field?.confidence) || 0) * 100)}%`,
  ].filter(Boolean);
}

/** 근거 id 목록 — 모델이 이 중에서만 고를 수 있다. */
function evidenceIdMenu(evidencePack, system) {
  const buckets = (evidencePack?.systems || []).filter((b) => !system || b.system === system);
  const ids = [];
  for (const bucket of buckets) {
    for (const item of bucket.items || []) {
      if (item?.id) ids.push(`${item.id}(${item.term})`);
    }
  }
  return ids;
}

/**
 * 섹션 하나의 프롬프트.
 * @param {{ spec, field, evidencePack, basisPayload, question, emotion, digests?, repairIssues? }} input
 */
export function buildCompassSectionPrompt(input) {
  const { spec, field, evidencePack, basisPayload, question, emotion, digests, repairIssues } = input;

  const facts = spec.system
    ? factLinesForSystem(evidencePack, spec.system).concat("", fieldLines(field))
    : (evidencePack?.systems || []).flatMap((b) => factLinesForSystem(evidencePack, b.system).concat("")).concat(fieldLines(field));

  const digestLines = spec.wave === "B" && digests?.length
    ? ["", "[앞 단계에서 이미 쓴 해석 — 같은 말을 되풀이하지 말고 여기서 더 나아가라]", ...digests.map((d) => `- ${d.title}: ${d.text}`)]
    : [];

  const repairLines = repairIssues?.length
    ? ["", "[직전 시도가 규칙을 어겼다. 아래를 반드시 고쳐서 다시 써라]", ...repairIssues.map((i) => `- ${i}`)]
    : [];

  const ids = evidenceIdMenu(evidencePack, spec.system);

  return [
    ...facts,
    // 확정값 블록을 이미 위에 실었으므로 표를 두 번 넣지 않는다.
    "",
    ...buildEvidenceRuleLines(basisPayload, { includeFactTable: false }),
    ...digestLines,
    ...repairLines,
    "",
    "[이번에 쓸 것]",
    question ? `사용자의 고민: "${clean(question, 300)}"` : "사용자의 고민: (자유 입력 없음)",
    emotion ? `지금의 마음 상태: ${clean(emotion, 24)}` : "",
    `섹션 제목: ${spec.title}`,
    `쓰는 법: ${spec.guide}`,
    `분량: 공백 제외 ${spec.minChars.toLocaleString("ko-KR")}자 이상 ${spec.maxChars.toLocaleString("ko-KR")}자 이하.`,
    "",
    "[출력 형식]",
    "본문을 먼저 쓴다. 제목·머리말·번호를 붙이지 않는다.",
    ids.length
      ? `본문이 끝나면 마지막 줄에 이 섹션이 실제로 근거로 삼은 항목의 id를 2~4개, 아래 형식 그대로 한 줄로 적는다.\n근거: ${ids.slice(0, 3).map((s) => s.split("(")[0]).join(", ")}\n고를 수 있는 id는 이것뿐이다: ${ids.join(", ")}`
      : "",
    "",
    "본문:",
  ].filter(Boolean).join("\n");
}

// ── 출력 검증 ──────────────────────────────────────────────────

/** 이 엔진이 산출하지 않는 계(系) 용어 — 쓰면 그 문장은 근거가 없다. */
const UNGROUNDED = /라그나|다샤|안타르다샤|나크샤트라|아센던트|어센던트|상승궁|트랜싯|어스펙트|스퀘어|트라인|섹스타일|하우스|황도|태양궁|양자리|황소자리|쌍둥이자리|게자리|사자자리|처녀자리|천칭자리|전갈자리|사수자리|염소자리|물병자리|물고기자리|프로그레션|역방향|역위/;
/** 이 엔진이 계산하지 않는 사주 부가 요소. (대운은 자미 evidence 로 정당하게 인용될 수 있어 제외) */
const UNCOMPUTED = /신살|역마살|도화살|공망|백호살|괴강|천을귀인/;
const RISKY = /소송|고소|진단|처방|투약|매수|매도|주식|코인|틀림없이|반드시\s*(성공|실패|이룬|잃)/;
const STOCK_PHRASE = /조심하세요|신중하세요|좋은 일이 생깁니다|노력하세요|최선을 다하세요|마음을 다스리|긍정적으로 생각/;
/** 모델이 만든 별점·확률. */
const FAKE_SCORE = /[★☆]|\d+\s*점\s*만점|\d+\s*%\s*(확률|가능성)/;

/**
 * 섹션 출력을 검사해 **문제 목록을 돌려준다. 절대 던지지 않는다.**
 * 던지면 호출부가 결제된 결과를 통째로 잃는다(verify 하네스가 이 계약을 단언한다).
 *
 * 🔴 한국어 리터럴 검사는 ko 출력에만 성립한다. 다른 로케일에서 그대로 돌리면 모델이
 *    정상적으로 답해도 매번 탈락해 유료 라우트가 전량 실패한다(무료 /narrate 에서 겪은 그 버그).
 *
 * @param {string} text
 * @param {{ spec?: object, allowedLabels?: string[], seenSentences?: Set<string> }} [ctx]
 * @returns {string[]}
 */
export function validateCompassSection(text, ctx = {}) {
  const issues = [];
  try {
    const body = String(text || "");
    const spec = ctx.spec || null;
    const length = countChars(body);

    if (!length) {
      issues.push("본문이 비어 있다.");
      return issues;
    }
    if (spec?.minChars && length < spec.minChars) {
      issues.push(`분량이 ${length}자로 최소 ${spec.minChars}자에 못 미친다. 근거를 더 풀어 써라.`);
    }
    if (FAKE_SCORE.test(body)) {
      issues.push("별점·점수·확률 표기를 지워라. 그 값은 서버가 계산한다.");
    }

    // 로케일 탈출구 — 여기부터는 한국어 리터럴 검사다.
    if ((getAmbientAiLocale() || "ko") !== "ko") return issues;

    const ungrounded = body.match(UNGROUNDED);
    if (ungrounded) issues.push(`'${ungrounded[0]}'는 이 서비스가 계산하지 않는다. 그 문장을 지워라.`);

    const uncomputed = body.match(UNCOMPUTED);
    if (uncomputed) issues.push(`'${uncomputed[0]}'는 산출되지 않았다. 확정값에 있는 용어로 바꿔라.`);

    const risky = body.match(RISKY);
    if (risky) issues.push(`'${risky[0]}'는 쓸 수 없다(의료·법률·투자·단정).`);

    const stock = body.match(STOCK_PHRASE);
    if (stock) issues.push(`상투구 '${stock[0]}'를 구체적인 문장으로 바꿔라.`);

    const labels = Array.isArray(ctx.allowedLabels) ? ctx.allowedLabels : [];
    if (labels.length && !labels.some((label) => label && body.includes(label))) {
      issues.push("확정값 항목명을 하나도 인용하지 않았다. 표에 적힌 이름 그대로 최소 1개 인용해라.");
    }

    // 섹션 간 문장 재사용 — 같은 문장이 두 섹션에 나오면 리포트가 '반복적'으로 읽힌다.
    if (ctx.seenSentences instanceof Set) {
      const sentences = body.split(/(?<=[.!?。])\s+/).map((s) => clean(s)).filter((s) => s.length >= 24);
      const repeated = sentences.find((s) => ctx.seenSentences.has(s));
      if (repeated) issues.push("앞 섹션과 같은 문장을 되풀이했다. 다른 각도로 다시 써라.");
    }
  } catch (error) {
    // 검증기 자신의 버그가 결제된 결과를 죽이면 안 된다.
    issues.push(`검증 중 오류: ${clean(error?.message || error, 120)}`);
  }
  return issues;
}

/** 검증에 쓸 허용 항목명 = 확정값 표의 라벨 + 방향/구간 라벨. */
export function buildAllowedLabels(basisPayload) {
  const labels = collectBasisLabels(basisPayload);
  for (const label of Object.values(DIRECTION_LABEL)) if (!labels.includes(label)) labels.push(label);
  for (const label of Object.values(TIMELINE_LABEL)) if (!labels.includes(label)) labels.push(label);
  return labels;
}

/** 본문 끝에 붙은 "근거: id, id" 줄을 떼어 낸다. */
export function splitGroundsLine(text) {
  const raw = String(text || "").trim();
  const match = raw.match(/\n\s*근거\s*[:：]\s*([^\n]+)\s*$/);
  if (!match) return { body: raw, evidenceIds: [] };
  return {
    body: raw.slice(0, match.index).trim(),
    evidenceIds: match[1].split(/[,·、]/).map((s) => clean(s, 80)).filter(Boolean),
  };
}

/**
 * 토큰 상한에 걸려 잘린 본문을 마지막 완결 문장까지만 남긴다.
 * 문장 부호가 하나도 없으면 원문을 그대로 둔다(잘라서 빈 결과를 만들지 않는다).
 */
export function trimToLastSentence(text) {
  const raw = String(text || "").trim();
  const cut = Math.max(raw.lastIndexOf("."), raw.lastIndexOf("!"), raw.lastIndexOf("?"), raw.lastIndexOf("。"));
  if (cut < 0) return raw;
  const trimmed = raw.slice(0, cut + 1).trim();
  // 잘라 낸 결과가 원문의 절반도 안 되면 잘린 게 아니라 문장부호가 드문 것이다 — 원문 유지.
  return countChars(trimmed) >= countChars(raw) * 0.5 ? trimmed : raw;
}
