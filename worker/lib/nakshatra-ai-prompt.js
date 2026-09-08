// 나크샤트라 결정판 AI 상담 — 하나의 별, 두 개의 언어.
//
// 천문·역법 값은 assembleNatalCodex가 계산하고, 이 모듈은 그 결과를 숙요 27숙과
// 베다 나크샤트라의 서로 다른 관점으로 통합해 읽는 역할만 한다. 두 체계를
// 1:1로 대응하거나 LLM이 별자리를 추측하게 하지 않는다.

import { getNakshatraAttributes } from "../../constants/nakshatra-attributes.js";

export const NAKSHATRA_PERSONA = Object.freeze({
  integrated:
    "너는 숙요점(宿曜占)의 27숙과 베다 점성학(Jyotish)의 나크샤트라를 함께 연구해 온 프리미엄 상담가다. " +
    "두 전통이 같은 체계이거나 서로 정확히 대응한다고 단정하지 않는다. 숙요는 본명숙·방위·사신·오행의 언어로, " +
    "베다는 달의 나크샤트라·파다·지배성·샥티의 언어로 이 사람을 읽는다는 차이를 존중한다. " +
    "계산된 사실을 근거로 하되, 전문용어를 바로 생활의 장면으로 번역하고 따뜻하면서도 현실적인 존댓말로 상담한다.",
});

// 하나의 상담을 9개 의미 영역으로만 나눈다. 각 chapter는 앞선 insight를 바꿔
// 말하지 않고 다음 삶의 장면으로 확장해야 한다.
export const INTEGRATED_SECTIONS = Object.freeze([
  {
    id: "dualStarSummary", deck: "consultation", topic: "hero", title: "당신을 부르는 두 개의 별", minChars: 650,
    scope: "베다의 달 나크샤트라·파다와 숙요의 본명숙을 한 사람의 첫인상으로 묶는다. 첫 문장에서 두 체계가 동시에 강조하는 핵심 결론을 말한다.",
    rules: [
      "‘베다에서는 당신을 …라고 부르고, 숙요에서는 …라고 부릅니다’의 구조를 자연스럽게 사용한다.",
      "나크샤트라·파다·지배성 및 본명숙·방위·사신 중 실제 계산된 값만 언급한다.",
      "두 전통이 같다는 말이나 1:1 대응 주장은 쓰지 않는다.",
    ],
  },
  {
    id: "coreIdentity", deck: "consultation", topic: "identity", title: "두 별이 동시에 말하는 당신의 본질", minChars: 1100,
    scope: "두 전통에서 반복되는 신호를 먼저 찾고, 근거 → 교차 해석 → 현실의 모습 순으로 이 사람의 핵심 기질을 설명한다.",
    rules: [
      "공통점은 2~3개로 압축하고, 각각에 베다 근거와 숙요 근거를 모두 남긴다.",
      "‘독립적이다’처럼 끝내지 말고 어떤 질서에서 순응하기 어렵고 무엇을 지키려 하는지까지 설명한다.",
    ],
  },
  {
    id: "outerVsInner", deck: "consultation", topic: "inner-life", title: "겉으로 보이는 나와 아무도 모르는 나", minChars: 900,
    scope: "처음 만난 사람 앞, 친해진 뒤, 혼자 있을 때, 스트레스를 받을 때의 모습을 구분해 외부 인상과 내면 욕구의 간격을 상담한다.",
    rules: [
      "감정·행동·관계 반응을 실제 생활 장면으로 쓴다.",
      "coreIdentity에서 이미 정의한 기질을 반복하지 말고, 그 기질이 압박에서 어떻게 달라지는지 다룬다.",
    ],
  },
  {
    id: "loveAndRelationships", deck: "consultation", topic: "relationship", title: "나는 어떤 사랑을 원하는 사람일까?", minChars: 1050,
    scope: "끌리는 사람, 사랑할 때의 모습, 관계에서 원하는 안전감, 오해받기 쉬운 부분, 반복하기 쉬운 패턴과 건강한 관계의 조건을 답한다.",
    rules: [
      "상대의 마음이나 특정 궁합을 확정하지 않는다.",
      "숙요의 관계·거리 관점과 베다의 본능·정서 관점을 각각 근거로 하되, 연애운 일반론으로 흐르지 않는다.",
    ],
  },
  {
    id: "talentAndWork", deck: "consultation", topic: "career", title: "내가 일을 잘할 수 있는 환경은 어디일까?", minChars: 1050,
    scope: "사고방식·강점·경쟁력·돈을 만드는 방식·조직과 독립의 적성을 현실적으로 읽고, 맞는 환경과 소모되는 환경을 대비한다.",
    rules: [
      "직업 하나를 단정하지 않는다. 일하는 방식과 선택 기준을 말한다.",
      "투자·수익 보장이나 구체 종목 권유를 하지 않는다.",
      "identity의 장점을 업무에서 어떤 행동으로 쓰는지 새롭게 확장한다.",
    ],
  },
  {
    id: "shadowPattern", deck: "consultation", topic: "shadow", title: "왜 같은 문제를 반복할까?", minChars: 950,
    scope: "과해진 강점, 불안할 때의 행동, 관계와 선택에서 되풀이될 수 있는 그림자를 겁주지 않고 현실적인 경향으로 다룬다.",
    rules: [
      "반복되는 실수와 회복 신호를 한 쌍으로 제시한다.",
      "운명·전생·응보로 공포를 만들지 않는다.",
    ],
  },
  {
    id: "contrastBetweenSystems", deck: "consultation", topic: "contrast", title: "두 전통이 서로 다르게 보는 당신", minChars: 1050,
    scope: "베다와 숙요의 결론이 갈리거나 강조점이 다른 2~3개 지점을 밝히고, 충돌처럼 보이는 두 특성이 삶에서 어떻게 함께 나타나는지 해석한다.",
    rules: [
      "반드시 ‘베다에서는 …, 숙요에서는 …’의 비교를 포함하되 두 전통을 승패로 가르지 않는다.",
      "실제 계산값에서 나오는 차이만 쓴다. 임의 대응표·역사적 동일성·경계일 추측을 만들지 않는다.",
      "이전 장의 공통점을 다시 요약하지 말고, 차이가 선택과 관계에 주는 정보를 설명한다.",
    ],
  },
  {
    id: "lifeManual", deck: "consultation", topic: "growth", title: "당신이라는 별의 사용 설명서", minChars: 900,
    scope: "앞선 상담을 행동 기준으로 바꾼다. 잘될 때의 조건, 무너질 때의 신호, 사람·일을 선택하는 기준, 감정 소모를 줄이는 방법을 제시한다.",
    rules: [
      "실행 조언은 5개 안팎으로, 각각 언제·무엇을·어떻게 할지가 보이게 쓴다.",
      "마지막에 ### 이번 주에 지킬 세 가지를 두고 정확히 3개의 - 목록을 쓴다.",
      "앞 장의 분석을 다시 풀지 말고 ‘그래서 무엇을 할지’에 집중한다.",
    ],
  },
  {
    id: "closingMessage", deck: "consultation", topic: "closing", title: "마지막 별의 문장", minChars: 380,
    scope: "상담 전체에서 나온 이 사람만의 결론을 짧고 강한 마지막 문장으로 남긴다.",
    rules: [
      "모든 사용자에게 통하는 감성 문구나 응원 문구를 쓰지 않는다.",
      "새로운 분석을 추가하지 않고, 앞에서 확인된 두 별의 긴장을 한 문장으로 압축한다.",
    ],
  },
]);

export const NAKSHATRA_SECTIONS = INTEGRATED_SECTIONS;
export const NAKSHATRA_PHASE_CONSULTATION = INTEGRATED_SECTIONS;
export const NAKSHATRA_TOTAL_MIN_CHARS = NAKSHATRA_SECTIONS.reduce((sum, section) => sum + section.minChars, 0);

export function buildAdminLabPrompt(body = {}, options = {}) {
  const section = NAKSHATRA_SECTIONS.find((item) => item.id === options.variant) || NAKSHATRA_SECTIONS[0];
  return {
    systemPrompt: NAKSHATRA_PERSONA.integrated,
    prompt: "",
    partial: true,
    partialReason: "상담 프롬프트는 계산된 숙요 본명숙과 베다 나크샤트라 근거를 입력으로 받습니다. 통합 상담가의 지시만 표시합니다.",
    variantKey: section?.id || "",
    variants: NAKSHATRA_SECTIONS.map((item) => ({ key: item.id, label: item.title || item.id })),
    notes: section?.scope ? [section.scope] : [],
  };
}

function line(label, value) {
  return value == null || value === "" ? "" : "- " + label + ": " + value;
}

// assembleNatalCodex 결과만 LLM에 전달한다. 별·숙을 만들어내는 입력은 이 모듈에 없다.
export function buildFactContext(codex, question) {
  const sukuyo = codex?.dongyang || {};
  const vedic = codex?.india || {};
  const attrs = getNakshatraAttributes(vedic.index) || {};
  const dasha = vedic.dasha || {};
  const pada = vedic.pada != null
    ? String(vedic.pada) + (vedic.padaDetail ? " · 나바암샤 " + vedic.padaDetail.navamsaSignKo : "")
    : "미상(출생 시각 미상)";
  const sukuyoLines = [
    line("본명숙", sukuyo.nameKo ? sukuyo.nameKo + "수(" + sukuyo.nameHan + ")" : ""),
    line("방위·사신", [sukuyo.direction, sukuyo.fourSymbol].filter(Boolean).join(" · ")),
    line("칠요", sukuyo.sevenLuminary),
    line("원형", sukuyo.archetypeTitle),
    line("키워드", (sukuyo.keywords || []).join(" · ")),
    line("강점", (sukuyo.strengths || []).join(" · ")),
    line("그림자", (sukuyo.shadows || []).join(" · ")),
  ].filter(Boolean).join("\n");
  const vedicLines = [
    line("달의 나크샤트라", vedic.nameKo ? vedic.nameKo + "(" + vedic.nameEn + ")" : ""),
    line("파다", pada),
    line("지배성", vedic.lordKo),
    line("샥티(고유 힘)", attrs.shakti),
    line("주신", vedic.deity ? vedic.deity + " — " + vedic.deityRole : ""),
    line("가나·나디·요니", [vedic.ganaKo, vedic.nadiKo, vedic.yoni].filter(Boolean).join(" · ")),
    line("근원 동기", vedic.motiveKo),
    line("현재 다샤", dasha.currentMahadashaKo ? dasha.currentMahadashaKo + " / " + dasha.currentAntardashaKo : ""),
  ].filter(Boolean).join("\n");
  const tokens = [
    sukuyo.nameKo && sukuyo.nameKo + "수", sukuyo.nameHan, sukuyo.sevenLuminary, sukuyo.fourSymbol,
    vedic.nameKo, vedic.nameEn, vedic.lordKo, attrs.shakti, vedic.ganaKo, vedic.nadiKo, dasha.currentMahadashaKo,
  ].map((token) => String(token || "").trim()).filter((token) => token.length >= 2);
  return {
    summaryText: [
      "【숙요 27숙의 계산 근거】", sukuyoLines,
      "", "【베다 나크샤트라의 계산 근거】", vedicLines,
      "", "【통합 원칙】",
      "- 두 전통은 같은 체계도, 고정된 1:1 대응표도 아니다.",
      "- 공통점·차이점·한 체계에서만 강한 신호를 나누어, 한 사람의 현실로 통합한다.",
    ].join("\n"),
    evidenceTokens: [...new Set(tokens)].slice(0, 20),
  };
}

// 앞 장의 결론을 짧게 주입해 같은 문장을 새 표현으로 반복하는 분량 채우기를 막는다.
export function buildWrittenMemory(done, limit = 8) {
  return (Array.isArray(done) ? done : [])
    .filter((entry) => entry?.body)
    .slice(-limit)
    .map((entry) => {
      const lead = String(entry.keyInsight || entry.body || "").split(/(?<=[.!?。])\s|\n/)[0].trim().slice(0, 110);
      return lead ? "- " + (entry.title || entry.id) + ": " + lead : "";
    })
    .filter(Boolean)
    .join("\n");
}

export function buildSectionPrompt(section, ctx) {
  const question = String(ctx?.question || "").trim();
  const memory = String(ctx?.writtenMemory || "").trim();
  return [
    NAKSHATRA_PERSONA.integrated,
    "",
    "아래 [계산 근거]만 사실로 취급한다. 계산값에 없는 별·숙·성향·날짜를 지어내지 않는다.",
    "응답을 쓰기 전에는 표시하지 말고, ① 베다에서 강한 신호 ② 숙요에서 강한 신호 ③ 공통점 ④ 차이점 ⑤ 현실 장면을 차례로 점검한다.",
    "그 내부 점검을 설명하거나 단계별 사고 과정을 출력하지 않는다.",
    "",
    "[계산 근거]",
    ctx?.summaryText || "",
    ...(memory ? ["", "[앞 장에서 이미 말한 결론 — 바꿔 말해 반복하지 말 것]", memory] : []),
    "",
    question ? "[사용자 질문]\n" + question : "[사용자 질문]\n(자유 상담 — 이 사람의 전반적인 결을 읽는다)",
    "",
    "[이 장: " + section.title + "]",
    "- 의미 주제: " + section.topic,
    "- 목적: " + section.scope,
    "- 최소 분량: 공백 포함 " + section.minChars + "자 이상.",
    "- 첫 문단은 결론부터 말하고, 다음 문단에서 베다 근거 → 숙요 근거 → 두 시선의 통합 → 현실 장면 순으로 깊게 쓴다.",
    "- 모든 문장은 이 사용자의 이야기처럼 쓴다. 백과사전식 신화·행성·상징 나열, ‘해석할 수 있습니다’ 같은 교과서 문체를 쓰지 않는다.",
    "- 이전 장의 결론을 동의어로 반복해 분량을 채우지 않는다. 이번 장의 의미 주제에서만 새 정보를 더한다.",
    "- 운명·관계·상대 마음을 확정하지 않는다. 의료·법률·투자 판단이나 적중·성공 보장을 하지 않는다.",
    "- 가독성: 소제목은 ###, 목록은 -, 강조는 굵게 표기만 사용한다.",
    ...(section.rules || []).map((rule) => "- 규칙: " + rule),
    "",
    "출력은 반드시 아래 JSON 하나만 쓴다. 코드블록·인사말·추가 설명은 금지한다.",
    '{ "keyInsight": "이 장의 결론 한 줄(45자 이내)", "vedicEvidence": "계산값 기반 베다 근거 한 줄", "sukuyoEvidence": "계산값 기반 숙요 근거 한 줄", "body": "사용자에게 들려줄 통합 상담문" }',
  ].join("\n");
}

export function extractJsonObject(text) {
  const raw = String(text || "");
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return {};
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return {};
  }
}

export function parseSectionResponse(text) {
  const value = extractJsonObject(text);
  const toText = (item, max = 0) => {
    const result = typeof item === "string" ? item.trim() : "";
    return max > 0 ? result.slice(0, max) : result;
  };
  return {
    keyInsight: toText(value.keyInsight, 120),
    vedicEvidence: toText(value.vedicEvidence, 240),
    sukuyoEvidence: toText(value.sukuyoEvidence, 240),
    body: toText(value.body || value.text),
  };
}

export function extractTopInsights(body) {
  const text = String(body || "");
  const marker = "### 이번 주에 지킬 세 가지";
  const start = text.indexOf(marker);
  if (start < 0) return [];
  return text.slice(start)
    .split("\n")
    .filter((line) => /^\s*-\s+/.test(line))
    .slice(0, 3)
    .map((line) => {
      const [title, ...detail] = line.replace(/^\s*-\s+/, "").replace(/\*\*/g, "").trim().split(/\s*—\s*/);
      return { title: String(title || "").slice(0, 40), detail: detail.join(" — ").trim() };
    })
    .filter((item) => item.title);
}

// decks 필드는 이전 결제 결과 재열람 계약 때문에 유지한다. 신규 결과만 consultation 배열을 쓴다.
export function mergeConsultationSections(results) {
  const byId = new Map((Array.isArray(results) ? results : []).map((result) => [result.id, result]));
  return {
    consultation: NAKSHATRA_SECTIONS
      .map((section) => {
        const result = byId.get(section.id) || {};
        return {
          id: section.id,
          title: section.title,
          topic: section.topic,
          keyInsight: result.keyInsight || "",
          vedicEvidence: result.vedicEvidence || "",
          sukuyoEvidence: result.sukuyoEvidence || "",
          body: result.body || "",
        };
      })
      .filter((section) => section.body),
  };
}

export function hasForbiddenResultText(value) {
  return /\b(mock|dry-run|provider|system prompt|assistant|JSON)\b/i.test(JSON.stringify(value || ""));
}
