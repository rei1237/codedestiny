// 휴먼 디자인 AI 해석 프롬프트 — 계산 결과를 **해석만** 시킨다.
//
// 🔴 이 모듈의 존재 이유가 요구사항 23 이다: 모델에게 "1991년 2월 20일 08시 35분생의
//    휴먼 디자인을 계산해 줘" 라고 묻지 않는다. 계산은 이미 끝났고(lib/human-design/**,
//    외부 계산기 차트 20건과 520 셀 대조 완료), 모델이 받는 것은 그 **확정값**뿐이다.
//
// 🔴 프롬프트에 출생 데이터(생년월일·시각·타임존·좌표)를 싣지 않는다. 실으면 모델이
//    자기가 다시 계산해 확정값과 다른 타입·프로파일을 쓰기 시작한다 — 결정론 엔진을
//    만든 이유가 통째로 사라진다. buildHumanDesignAIPrompt 는 birthInput/moments 를
//    아예 읽지 않으며, scripts/verify-human-design-ai.mjs 가 그것을 강제한다.
//
// 정본 패턴: worker/lib/saju-ai-prompt.js (fact snapshot → 재계산 금지 못박기 → 사후 검산).

import { CENTER_ORDER } from "../../lib/human-design/centers.js";
import {
  AUTHORITY_LABEL,
  CENTER_LABEL,
  CROSS_ANGLE_LABEL,
  DEFINITION_LABEL,
  NOT_SELF_LABEL,
  SIGNATURE_LABEL,
  STRATEGY_LABEL,
  TYPE_LABEL,
} from "../../lib/human-design/labels.js";

export const HUMAN_DESIGN_AI_PROMPT_VERSION = "human-design-ai-v1";

/** 유료 상품(₩10,000)이 광고하는 최소 분량. 미달이면 라우트가 실패로 처리한다. */
export const HD_AI_MIN_RESULT_CHARS = 6000;

/**
 * 🔴 Workers AI 폴백 수용 문턱 — 관례는 최소 분량 × 0.4 다.
 *    안 주면 폴백이 8% 분량을 내놔도 정상 결제 결과로 전달된다(worker/lib/gemini.js 주석).
 */
export const HD_AI_FALLBACK_MIN_CHARS = Math.round(HD_AI_MIN_RESULT_CHARS * 0.4);

/**
 * 해석 섹션. 요구사항 24 의 세 묶음(기본 · BodyGraph · 개인 해석)을 10개로 편다.
 * 🔴 key 는 canonical identifier 다 — 화면 제목은 표시 계층이 갖는다.
 */
export const HD_AI_SECTIONS = Object.freeze([
  { key: "typeAndStrategy", title: "타입과 전략", minChars: 600 },
  { key: "authority", title: "의사결정 권위", minChars: 600 },
  { key: "profile", title: "프로파일", minChars: 550 },
  { key: "definition", title: "정의 방식", minChars: 500 },
  { key: "definedCenters", title: "정의된 센터 — 일관되게 나오는 힘", minChars: 700 },
  { key: "undefinedCenters", title: "열린 센터 — 받아들이고 증폭하는 자리", minChars: 700 },
  { key: "relationships", title: "관계", minChars: 600 },
  { key: "workAndEnergy", title: "일과 커리어, 에너지 사용", minChars: 700 },
  { key: "stressAndPatterns", title: "스트레스 패턴과 반복되는 흐름", minChars: 600 },
  { key: "strengths", title: "강점과 다음 한 걸음", minChars: 600 },
]);

/**
 * 시스템 프롬프트는 차트와 무관한 상수다 — 계산이 없어도(관리자 랩의 부분 조립) 보여 줄 수 있어야 한다.
 */
export const HD_AI_SYSTEM_PROMPT = [
  "당신은 휴먼 디자인 리더입니다.",
  "당신의 역할은 **이미 계산된 차트를 해석하는 것**이며, 계산하는 것이 아닙니다.",
  "일반론을 길게 늘어놓지 말고 이 사람의 실제 활성과 바디그래프 구조에 붙여 말하세요.",
].join(" ");

function label(table, key, fallback = "") {
  return table[key] || fallback || String(key || "");
}

/**
 * 🔴 fail-closed. 계산 결과 없이 프롬프트를 만들려는 시도는 조용히 진행시키지 않는다 —
 *    그렇게 되면 모델이 아무 근거 없이 "그럴듯한 휴먼 디자인"을 쓴다.
 */
export function ensureHumanDesignCalculationPresence(calculation) {
  const missing = [];
  if (!calculation || typeof calculation !== "object") {
    throw new Error("휴먼 디자인 AI: 계산 결과가 없다.");
  }
  for (const field of ["type", "strategy", "authority", "profile", "definition", "signature", "notSelfTheme"]) {
    if (!calculation[field]) missing.push(field);
  }
  if (!Array.isArray(calculation.activations) || calculation.activations.length !== 26) {
    missing.push(`activations(26개여야 하는데 ${calculation?.activations?.length ?? 0}개)`);
  }
  if (!Array.isArray(calculation.definedCenters)) missing.push("definedCenters");
  if (!Array.isArray(calculation.channels)) missing.push("channels");
  if (!calculation.incarnationCross?.gates) missing.push("incarnationCross.gates");
  if (missing.length) {
    throw new Error(`휴먼 디자인 AI: 계산 결과에 빠진 항목이 있다 — ${missing.join(", ")}`);
  }
  return calculation;
}

/**
 * 확정표(fact snapshot). 모델이 절대 바꿀 수 없는 값들이며, 사후 검산의 기준이기도 하다.
 *
 * 🔴 birthInput·moments 를 읽지 않는다(출생 데이터 미포함 계약).
 */
export function buildHumanDesignFactSnapshot(calculation) {
  ensureHumanDesignCalculationPresence(calculation);

  const definedCenters = calculation.definedCenters.map((center) => label(CENTER_LABEL, center));
  const undefinedCenters = CENTER_ORDER
    .filter((center) => !calculation.definedCenters.includes(center))
    .map((center) => label(CENTER_LABEL, center));

  const channels = calculation.channels.map((channel) => ({
    channelId: channel.channelId,
    centerA: label(CENTER_LABEL, channel.centerA),
    centerB: label(CENTER_LABEL, channel.centerB),
    composition: channel.composition,
  }));

  const activations = calculation.activations.map((activation) => ({
    layer: activation.layer,
    planet: activation.planet,
    gate: activation.gate,
    line: activation.line,
  }));

  const cross = calculation.incarnationCross;
  return {
    promptVersion: HUMAN_DESIGN_AI_PROMPT_VERSION,
    calculationVersion: calculation.calculationVersion || "",
    mappingVersion: calculation.mappingVersion || "",
    type: label(TYPE_LABEL, calculation.type),
    strategy: label(STRATEGY_LABEL, calculation.strategy),
    authority: label(AUTHORITY_LABEL, calculation.authority),
    signature: label(SIGNATURE_LABEL, calculation.signature),
    notSelfTheme: label(NOT_SELF_LABEL, calculation.notSelfTheme),
    definition: label(DEFINITION_LABEL, calculation.definition),
    profile: calculation.profile,
    profileLines: calculation.profileLines,
    definedCenters,
    undefinedCenters,
    definedCenterCount: definedCenters.length,
    channels,
    activeGates: Array.isArray(calculation.activeGates) ? [...calculation.activeGates] : [],
    activations,
    incarnationCross: {
      angle: label(CROSS_ANGLE_LABEL, cross.angle),
      notation: cross.notation,
      gates: cross.gates,
    },
    motorToThroat: calculation.motorToThroat === true,
  };
}

function activationLines(snapshot, layer) {
  return snapshot.activations
    .filter((activation) => activation.layer === layer)
    .map((activation) => `${activation.planet} ${activation.gate}.${activation.line}`)
    .join(" · ");
}

/**
 * 최종 프롬프트.
 *
 * @param {object} input
 * @param {object} input.calculation assembleChart 결과
 * @param {string} [input.userQuestion] 사용자가 덧붙인 질문(선택)
 * @returns {{prompt:string, systemPrompt:string, factSnapshot:object, promptLength:number}}
 */
export function buildHumanDesignAIPrompt(input = {}) {
  const snapshot = buildHumanDesignFactSnapshot(input.calculation);

  // 🔴 라벨=값 한 줄씩. 같은 객체를 JSON 으로 한 번 더 싣지 않는다 —
  //    saju-ai-prompt.js 에서 그 중복이 34,392자를 정가로 태운 실측이 있다.
  const factLines = [
    `타입 = ${snapshot.type}`,
    `전략 = ${snapshot.strategy}`,
    `내적 권위 = ${snapshot.authority}`,
    `프로파일 = ${snapshot.profile} (의식 태양 라인 ${snapshot.profileLines?.personality} / 무의식 태양 라인 ${snapshot.profileLines?.design})`,
    `정의 = ${snapshot.definition}`,
    `시그니처 = ${snapshot.signature}`,
    `낫셀프 테마 = ${snapshot.notSelfTheme}`,
    `인카네이션 크로스 = ${snapshot.incarnationCross.angle} (${snapshot.incarnationCross.notation})`,
    `모터→목 연결 = ${snapshot.motorToThroat ? "있음" : "없음"}`,
    `정의된 센터(${snapshot.definedCenters.length}) = ${snapshot.definedCenters.join(", ") || "없음"}`,
    `열린 센터(${snapshot.undefinedCenters.length}) = ${snapshot.undefinedCenters.join(", ") || "없음"}`,
    `완성된 채널(${snapshot.channels.length}) = ${snapshot.channels.map((c) => `${c.channelId}(${c.centerA}↔${c.centerB})`).join(", ") || "없음"}`,
    `활성 게이트(${snapshot.activeGates.length}) = ${snapshot.activeGates.join(", ")}`,
    `의식(퍼스낼리티) 활성 = ${activationLines(snapshot, "personality")}`,
    `무의식(디자인) 활성 = ${activationLines(snapshot, "design")}`,
  ].join("\n");

  const sectionSpec = HD_AI_SECTIONS
    .map((section, index) => `${index + 1}. "${section.key}" — ${section.title} (한국어 ${section.minChars}자 이상)`)
    .join("\n");

  const userQuestion = String(input.userQuestion || "").trim().slice(0, 600);

  const prompt = [
    "아래는 검증된 계산 엔진이 산출한 한 사람의 휴먼 디자인 차트입니다.",
    "",
    "── 확정값 (절대 기준) ──────────────────────────────",
    factLines,
    "── 확정값 끝 ──────────────────────────────────────",
    "",
    "🔴 지켜야 할 규칙",
    "1. 위 확정값은 이미 계산이 끝난 사실입니다. 다시 계산하거나 다른 값으로 바꾸지 마세요.",
    "2. 출생 날짜·시각·장소는 제공되지 않습니다. 추측하지 말고 묻지도 마세요.",
    "3. 타입·전략·권위·프로파일·정의를 위 값과 다르게 쓰면 안 됩니다. 다른 타입이나 다른 프로파일을 이 사람의 것처럼 언급하지 마세요.",
    "4. 위 목록에 없는 채널이나 정의된 센터를 있다고 쓰지 마세요.",
    "5. 교과서적 설명을 복사하지 말고, 위에 적힌 이 사람의 활성·채널·센터를 근거로 삼아 말하세요. 근거를 댈 때는 게이트 번호나 채널 번호를 함께 적으세요.",
    "6. 단정적인 운명 예언, 건강·의료·법률 판단, 특정 인물에 대한 단정은 하지 마세요.",
    "",
    userQuestion ? `사용자가 덧붙인 질문: ${userQuestion}\n` : "",
    "── 출력 형식 ──────────────────────────────────────",
    "아래 키를 가진 JSON 객체 하나만 출력하세요. 코드펜스·설명문 없이 JSON 만 출력합니다.",
    "{",
    '  "sections": [ { "key": "<아래 키>", "title": "<한국어 제목>", "body": "<본문>" }, ... ],',
    '  "summary": "<전체를 3~4문장으로 요약>"',
    "}",
    "",
    "섹션은 아래 순서와 키를 그대로, 10개 전부 채웁니다.",
    sectionSpec,
    "",
    `전체 본문 합계는 한국어 ${HD_AI_MIN_RESULT_CHARS}자 이상이어야 합니다.`,
  ].filter(Boolean).join("\n");

  return { prompt, systemPrompt: HD_AI_SYSTEM_PROMPT, factSnapshot: snapshot, promptLength: prompt.length };
}

/**
 * 관리자 프롬프트 랩 조립기.
 *
 * 🔴 이 기능에서 랩이 특히 쓸모 있는 이유: "모델에게 출생 데이터를 주지 않는다" 는 계약이
 *    눈으로 확인 가능해야 한다. 운영자가 프로필을 넣어도 결과 프롬프트에 생년월일이
 *    안 보이는 것이 이 화면에서 바로 드러난다.
 *
 * 계약: { systemPrompt, prompt, partial?, partialReason?, notes? }
 */
export async function buildAdminLabPrompt(body = {}, options = {}) {
  const birthDate = String(body?.birthDate || "").trim();
  const birthTime = String(body?.birthTime || "").trim();
  const timezone = String(body?.timezone || body?.birthPlace?.timezone || "Asia/Seoul").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !/^\d{1,2}:\d{2}$/.test(birthTime)) {
    return {
      systemPrompt: HD_AI_SYSTEM_PROMPT,
      prompt: "",
      partial: true,
      partialReason: "휴먼 디자인은 생년월일과 태어난 시각이 모두 있어야 차트를 계산할 수 있습니다(시각을 모르면 라인과 프로파일이 정해지지 않습니다).",
    };
  }

  // 프롬프트는 계산 결과에서만 나온다 — 랩도 같은 경로를 그대로 탄다.
  let calculation;
  try {
    const { calculateHumanDesignChart } = await import("./human-design-ephemeris.js");
    calculation = await calculateHumanDesignChart(
      options?.env || {},
      { birthDate, birthTime, timezone, calendar: body?.calendarType || "solar" },
      { requestUrl: options?.requestUrl, calculatedAt: null },
    );
  } catch (error) {
    // 천체력을 못 불러오는 환경(테스트·오프라인)에서는 시스템 프롬프트만 보여 준다.
    // 🔴 계산 없이 사용자 프롬프트를 만들지 않는다 — 그게 이 기능의 전체 계약이다.
    return {
      systemPrompt: HD_AI_SYSTEM_PROMPT,
      prompt: "",
      partial: true,
      partialReason: `천체력을 불러오지 못해 차트를 계산하지 못했습니다 — ${String(error?.message || error).slice(0, 160)}`,
    };
  }

  const built = buildHumanDesignAIPrompt({ calculation, userQuestion: body?.question });
  return {
    systemPrompt: built.systemPrompt,
    prompt: built.prompt,
    notes: [
      "🔴 이 프롬프트에는 출생 날짜·시각·타임존이 들어 있지 않습니다. 모델은 계산된 확정값만 봅니다.",
      `확정값: ${built.factSnapshot.type} · ${built.factSnapshot.authority} · ${built.factSnapshot.profile} · ${built.factSnapshot.definition}`,
      `프롬프트 길이 ${built.promptLength}자 · 섹션 ${HD_AI_SECTIONS.length}개 · 목표 분량 ${HD_AI_MIN_RESULT_CHARS}자`,
    ],
  };
}

/** 12 프로파일 전체 — 다른 프로파일을 이 사람 것처럼 쓰는지 보는 데 쓴다. */
const ALL_PROFILES = Object.freeze([
  "1/3", "1/4", "2/4", "2/5", "3/5", "3/6", "4/6", "4/1", "5/1", "5/2", "6/2", "6/3",
]);

/**
 * 사후 검산 — 출력이 확정값과 모순되는지 본다.
 *
 * 🔴 여기서 잡는 것은 "모델이 자기가 계산했다" 의 흔적이다. 대조가 명확한 네 가지만 본다.
 *    문체나 주장의 옳고 그름은 판정하지 않는다(과한 검사는 결제한 사용자의 결과를 막는다).
 *
 * @returns {{ok:boolean, violations:string[]}}
 */
export function validateHumanDesignInterpretation(text, factSnapshot) {
  const body = String(text || "");
  const violations = [];

  if (factSnapshot?.type && !body.includes(factSnapshot.type)) {
    violations.push(`확정 타입("${factSnapshot.type}")이 본문에 한 번도 나오지 않는다`);
  }
  if (factSnapshot?.authority && !body.includes(factSnapshot.authority)) {
    violations.push(`확정 권위("${factSnapshot.authority}")가 본문에 한 번도 나오지 않는다`);
  }
  if (factSnapshot?.profile && !body.includes(factSnapshot.profile)) {
    violations.push(`확정 프로파일("${factSnapshot.profile}")이 본문에 한 번도 나오지 않는다`);
  }

  // 프로파일 표기는 모호하지 않다 — 남의 프로파일을 적을 이유가 없다.
  const strayProfiles = ALL_PROFILES
    .filter((profile) => profile !== factSnapshot?.profile)
    .filter((profile) => new RegExp(`(?:^|[^\\d/])${profile.replace("/", "\\/")}(?:[^\\d/]|$)`).test(body));
  if (strayProfiles.length) {
    violations.push(`확정 프로파일이 아닌 프로파일이 등장한다 — ${strayProfiles.join(", ")}`);
  }

  return { ok: violations.length === 0, violations };
}
