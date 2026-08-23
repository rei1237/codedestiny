// 휴먼 디자인 프리미엄 리포트 — ko/en 프롬프트 조립.
//
// 🔴 이 모듈은 LLM 을 부르지 않는다. 문자열만 만든다(human-design-ai-prompt.js 와 같은 계약).
//
// 🔴 **출생 데이터를 싣지 않는다.** 생년월일·시각·타임존·좌표는 프롬프트에 들어가지 않으며,
//    확정표(buildHumanDesignFactSnapshot)가 birthInput·moments 를 읽지 않는 것으로 보장된다.
//    부수 효과가 하나 있다 — 프롬프트에 개인 식별 정보가 없으므로 **같은 차트를 가진 다른
//    사용자끼리 LLM 응답 캐시가 그대로 재사용된다**. 개인정보 유출 없이 원가가 떨어지는 자리다.
//
// 🔴 배열 순서는 **불변 접두 → 가변 접미** 다. Gemini 암묵 캐싱은 공통 **접두사**에만 걸린다
//    (docs/CURRENT_DEV_BASELINE.md §7). 시스템 지시·확정표·금지 규칙이 앞, 이번 섹션 지시와
//    앞선 섹션 요약이 뒤다. 뒤집으면 18회 반복되는 입력이 전부 정가로 돌아간다.
//
// 🔴 같은 객체를 JSON 으로 한 번 더 싣지 않는다. saju-ai-prompt.js 에서 그 중복이 34,392자를
//    정가로 태운 실측이 있다. 확정표는 "라벨 = 값" 한 줄씩만 쓴다.

import { CENTER_LABEL } from "../../lib/human-design/labels.js";
import {
  HD_REPORT_SECTIONS,
  HD_REPORT_VERSION,
  buildHumanDesignFactSnapshot,
  effectiveMinChars,
  ensureHumanDesignCalculationPresence,
} from "./human-design-report-contract.js";
import {
  HD_REPORT_CHAPTER_ORDER,
  HD_REPORT_SECTION_TITLES,
} from "../../lib/human-design/report-sections.js";

// 🔴 계약의 섹션 표와 공유 장 목록이 어긋나면 여기서 멈춘다. 한쪽만 고치면 결제 전 목차와
//    실제로 생성되는 장이 달라지는데, 그건 사용자가 산 것과 받은 것이 다르다는 뜻이다.
{
  const contractKeys = HD_REPORT_SECTIONS.map((section) => section.key).join(",");
  if (contractKeys !== HD_REPORT_CHAPTER_ORDER.join(",")) {
    throw new Error("human-design-report-prompt: 계약 섹션 순서가 report-sections.js 와 다르다.");
  }
}

// 🔴 섹션 제목은 lib/human-design/report-sections.js 가 정본이다. 결제 전 잠금 화면이 18장
//    목차를 보여 줘야 하는데 클라이언트는 worker/lib 을 읽을 수 없어서다. 여기서는 재export 만
//    하고, 정합성은 위의 자체 검사가 로드 시점에 지킨다.
export { HD_REPORT_SECTION_TITLES };

/** 고정 subsection(생활 영역)의 표시 이름. */
const TOPIC_TITLES = Object.freeze({
  love: { ko: "연애와 가까운 관계", en: "Love and close relationships" },
  communication: { ko: "소통", en: "Communication" },
  social: { ko: "사회적 관계", en: "Social relationships" },
  career: { ko: "커리어와 일", en: "Career and work" },
  money: { ko: "돈과 자원", en: "Money and resources" },
  growth: { ko: "개인적 성장", en: "Personal growth" },
  decision: { ko: "의사결정", en: "Decision making" },
});

const SYSTEM_PROMPT = Object.freeze({
  ko: [
    "당신은 휴먼 디자인 전문 분석가이자 리포트 저자입니다.",
    "당신의 역할은 **이미 계산된 차트를 해석하는 것**이며, 계산하거나 추측하는 것이 아닙니다.",
    "일반론을 늘어놓지 말고 주어진 활성·채널·센터 구조에 붙여 이 사람의 실제 삶으로 번역하세요.",
  ].join(" "),
  en: [
    "You are an expert Human Design analyst and report writer.",
    "Your role is to **interpret an already-calculated chart**, never to recalculate or invent chart information.",
    "Do not write generalities. Tie every claim to the given activations, channels and center structure.",
  ].join(" "),
});

const RULES = Object.freeze({
  ko: [
    "규칙",
    "- 아래 확정값만 사용합니다. 차트를 다시 계산하지 마세요.",
    "- 출생 정보(생년월일·시각·장소)는 제공되지 않았습니다. 추측하거나 언급하지 마세요.",
    "- 확정값(타입·전략·권위·프로파일·정의·센터·채널)을 바꾸거나 다른 값으로 서술하지 마세요.",
    "- 목록에 없는 게이트·채널·센터·활성을 지어내지 마세요.",
    "- 누구에게나 해당하는 문장, 과도한 긍정, 같은 말의 반복을 쓰지 마세요.",
    "- 운명을 단정하지 마세요. 의료·법률·재정 영역에서 확정적 판단을 내리지 마세요.",
    "- 주장에는 근거가 된 게이트·채널·센터를 함께 밝히세요.",
  ].join("\n"),
  en: [
    "Rules",
    "- Use only the fixed values below. Do not recalculate the chart.",
    "- Birth data (date, time, place) was not provided. Do not guess at it or refer to it.",
    "- Never change or contradict a fixed value (type, strategy, authority, profile, definition, centers, channels).",
    "- Never invent a gate, channel, center or activation that is not listed.",
    "- No statements that would fit anyone, no relentless positivity, no repeating the same point.",
    "- Do not state destiny as fact. Give no definitive medical, legal or financial judgement.",
    "- Name the gate, channel or center each claim rests on.",
  ].join("\n"),
});

function activationLines(snapshot, layer) {
  return snapshot.activations
    .filter((activation) => activation.layer === layer)
    .map((activation) => `${activation.planet} ${activation.gate}.${activation.line}`)
    .join(" · ");
}

/**
 * 확정표 블록. **불변 접두사**의 본체이므로 섹션마다 달라지면 안 된다.
 * 🔴 여기에 섹션별 정보를 섞지 말 것 — 섞는 순간 암묵 캐싱이 0이 된다.
 */
function factBlock(snapshot, locale) {
  const ko = locale === "ko";
  const lines = [
    ko ? "확정값(계산 결과 — 변경 불가)" : "Fixed values (computed — not changeable)",
    `Type = ${snapshot.type}`,
    `Strategy = ${snapshot.strategy}`,
    `Authority = ${snapshot.authority}`,
    `Signature = ${snapshot.signature}`,
    `Not-self theme = ${snapshot.notSelfTheme}`,
    `Definition = ${snapshot.definition}`,
    `Profile = ${snapshot.profile} (conscious ${snapshot.profileLines?.personality} / unconscious ${snapshot.profileLines?.design})`,
    `Defined centers (${snapshot.definedCenterCount}/9) = ${snapshot.definedCenters.join(", ") || "none"}`,
    `Open centers = ${snapshot.undefinedCenters.join(", ") || "none"}`,
    `Channels (${snapshot.channels.length}/36) = ${snapshot.channels.map((c) => `${c.channelId} ${c.centerA}-${c.centerB} ${c.composition}`).join(" · ") || "none"}`,
    `Active gates (${snapshot.activeGates.length}/64) = ${snapshot.activeGates.join(", ") || "none"}`,
    `Personality activations = ${activationLines(snapshot, "personality")}`,
    `Design activations = ${activationLines(snapshot, "design")}`,
    `Incarnation cross = ${snapshot.incarnationCross.angle} · ${snapshot.incarnationCross.notation}`,
    `Motor connected to Throat = ${snapshot.motorToThroat ? "yes" : "no"}`,
  ];
  return lines.join("\n");
}

function subsectionBrief(id, locale) {
  if (id.startsWith("topic:")) {
    const topic = TOPIC_TITLES[id.slice("topic:".length)];
    return `${id} (${topic ? topic[locale] : id})`;
  }
  if (id.startsWith("center:")) {
    const key = id.slice("center:".length);
    return `${id} (${CENTER_LABEL[key] || key})`;
  }
  return id;
}

/**
 * 섹션 하나의 프롬프트.
 *
 * @param {object} input
 * @param {object} input.snapshot buildHumanDesignFactSnapshot 결과
 * @param {object} input.spec HD_REPORT_SECTIONS 항목
 * @param {"ko"|"en"} input.locale
 * @param {string[]} input.requiredIds 이 섹션이 다뤄야 할 subsection id
 * @param {Array<{key:string,title:string,digest:string}>} [input.priorDigests] 앞선 섹션 요약
 * @param {string[]} [input.repairIssues] 재생성이면 직전 시도의 문제
 * @param {string} [input.userQuestion] 사용자가 덧붙인 질문. 은퇴한 해석 라우트가 받던 것과 같은
 *   계약이며, 관리자 프롬프트 랩이 이 자리를 쓴다(모든 랩 서비스가 질문 입력을 받는다는 불변식).
 * @returns {{prompt:string, systemPrompt:string, targetMinChars:number}}
 */
export function buildHumanDesignReportSectionPrompt(input) {
  const { snapshot, spec, locale, requiredIds = [], priorDigests = [], repairIssues = [], userQuestion = "" } = input;
  // 🔴 가변 접미에만 붙인다. 접두에 넣으면 사람마다 달라져 암묵 캐싱이 통째로 깨진다.
  const question = String(userQuestion || "").trim().slice(0, 600);
  const ko = locale === "ko";
  const title = HD_REPORT_SECTION_TITLES[spec.key]?.[locale] || spec.key;
  const targetMinChars = effectiveMinChars(spec, requiredIds.length);

  // ── 불변 접두 ──────────────────────────────────────────────────────────────
  const head = [
    ko
      ? "다음은 한 사람의 휴먼 디자인 차트 계산 결과입니다. 이 결과만 근거로 전문 리포트의 한 장(chapter)을 씁니다."
      : "Below is one person's computed Human Design chart. Using only this, write one chapter of a professional report.",
    "",
    factBlock(snapshot, locale),
    "",
    RULES[locale],
  ].join("\n");

  // ── 가변 접미 ──────────────────────────────────────────────────────────────
  const tail = [];
  tail.push("");
  tail.push(ko ? `이번 장: ${title}` : `This chapter: ${title}`);
  if (requiredIds.length) {
    tail.push(ko
      ? `다뤄야 할 항목 ${requiredIds.length}개 — 하나도 빠뜨리지 마세요:`
      : `Cover all ${requiredIds.length} items below — omit none:`);
    tail.push(requiredIds.map((id) => `  - ${subsectionBrief(id, locale)}`).join("\n"));
  }
  tail.push(ko
    ? `분량: 본문과 항목 본문을 합쳐 공백 제외 ${targetMinChars}자 이상, ${spec.maxChars}자 이하.`
    : `Length: at least ${targetMinChars} characters excluding whitespace across the body and item bodies, at most ${spec.maxChars}.`);

  if (priorDigests.length) {
    tail.push("");
    tail.push(ko
      ? "앞 장에서 이미 다룬 내용입니다. 되풀이하지 말고 이어서 쓰세요:"
      : "Already covered in earlier chapters. Do not repeat it; build on it:");
    tail.push(priorDigests.map((d) => `  - ${d.title}: ${d.digest}`).join("\n"));
  }

  if (repairIssues.length) {
    tail.push("");
    tail.push(ko
      ? `직전 시도에서 아래 문제가 있었습니다. 그 부분을 고쳐 다시 쓰세요: ${repairIssues.join(", ")}`
      : `The previous attempt had these problems. Fix them and rewrite: ${repairIssues.join(", ")}`);
  }

  if (question) {
    tail.push("");
    tail.push(ko
      ? `이 사람이 덧붙인 질문입니다. 이 장과 관련된 부분이 있으면 함께 다루세요: ${question}`
      : `The person added this question. Address it where this chapter is relevant: ${question}`);
  }

  tail.push("");
  tail.push(ko ? "출력 형식 — 코드펜스·설명문 없이 JSON 만:" : "Output format — JSON only, no code fence, no prose:");
  tail.push(JSON.stringify({
    key: spec.key,
    title,
    body: ko ? "<이 장의 본문>" : "<chapter body>",
    subsections: requiredIds.length
      ? [{ id: requiredIds[0], title: ko ? "<항목 제목>" : "<item title>", body: ko ? "<항목 본문>" : "<item body>" }]
      : [],
    keyPoints: [ko ? "<핵심 한 줄>" : "<one key point>"],
    evidence: ["center:THROAT", "gate:34", "channel:20-34"],
  }, null, 2));
  tail.push(ko
    ? "evidence 에는 위 확정값에 실제로 있는 id 만 적습니다."
    : "evidence must contain only ids that actually appear in the fixed values above.");

  return {
    prompt: `${head}\n${tail.join("\n")}`,
    systemPrompt: SYSTEM_PROMPT[locale],
    targetMinChars,
  };
}

/** 다음 섹션에 넘길 요약. 앞 240자면 무엇을 다뤘는지 알기에 충분하다. */
export function sectionDigest(section, locale) {
  const title = HD_REPORT_SECTION_TITLES[section.key]?.[locale] || section.key;
  return { key: section.key, title, digest: String(section.body || "").replace(/\s+/g, " ").trim().slice(0, 240) };
}

/**
 * 관리자 프롬프트 랩용 조립기. 계산이 없으면 부분 결과를 돌려주고 사용자 프롬프트는 만들지 않는다
 * (human-design-ai-prompt.js 의 buildAdminLabPrompt 와 같은 계약).
 */
export function buildAdminLabPrompt(body = {}, options = {}) {
  const locale = HD_REPORT_SECTION_TITLES[body?.sectionKey] && body?.locale === "en" ? "en" : "ko";
  const spec = HD_REPORT_SECTIONS.find((section) => section.key === body?.sectionKey) || HD_REPORT_SECTIONS[0];
  const calculation = body?.calculation || options?.calculation || null;
  if (!calculation) {
    return {
      partial: true,
      partialReason: "계산 결과가 없어 확정표를 만들 수 없다 — 출생 데이터로 차트를 먼저 계산할 것.",
      systemPrompt: SYSTEM_PROMPT[locale],
      promptVersion: HD_REPORT_VERSION,
    };
  }
  ensureHumanDesignCalculationPresence(calculation);
  const snapshot = buildHumanDesignFactSnapshot(calculation);
  const built = buildHumanDesignReportSectionPrompt({
    snapshot, spec, locale, requiredIds: [], userQuestion: body?.question || body?.userQuestion || "",
  });
  return { partial: false, ...built, promptVersion: HD_REPORT_VERSION };
}
