/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  심화 자미두수 PDF  (ZIWEI_DEEP_PDF)
 * ───────────────────────────────────────────────────────────────────────────
 *  회당 결제(per-use) LLM PDF 심층 리포트 프롬프트/스키마 모듈.
 *
 *  - 상품: "심화 자미두수 PDF" — featureKey: `ziwei-deep-pdf`
 *  - 결제: 회당 결제(B유형), 300코인 = 30,000원 (worker/lib/paid-feature-registry.js)
 *  - 잠금 콘텐츠 "심화 자미두수"(웹, premium-ziwei 5만원 영구잠금)와는 별개의 SKU다.
 *  - 구성: 명궁부터 복덕궁까지 12궁 전체 + 사화/삼방사정 + 대한/유년 마스터플랜 = 15챕터.
 *  - 생성 전략: 챕터별 개별 LLM 콜(15콜). 챕터당 목표 2,200~3,000자 → 총 34,000~40,000자+.
 *  - 명반(성요 배치·사화)은 로컬 결정론 계산(worker/lib/ziwei-ai-chart.js) 결과를 주입한다.
 *    LLM은 해석 텍스트만 생성하며, 제공된 명반 밖의 성요를 지어내면 안 된다.
 *
 *  ▶ 앞으로 이 기능(심화 자미두수 PDF)을 찾을 때 키워드: `ZIWEI_DEEP_PDF`, `ziwei-deep-pdf`
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { formatStarWithBrightness } from "./ziwei-ai-chart.js";

export const ZIWEI_DEEP_PDF_META = Object.freeze({
  featureKey: "ziwei-deep-pdf",
  label: "심화 자미두수 PDF",
  paymentType: "per-use", // 회당 결제 (B유형)
  costCoins: 300,
  amountKRW: 30000,
  totalCharTarget: 36000, // 3.4만~4만자 목표(하한 34,000)
  minTotalChars: 34000,
});

/**
 * 15챕터 정의.
 *  - id: 내부 키
 *  - palaceKey: 명반 palaces[].name 과 매칭할 궁 이름(궁 챕터에 한함)
 *  - title: PDF 목차/제목
 *  - scope: LLM에 주는 이 챕터의 해석 범위
 *  - minChars: 이 챕터 최소 분량(자)
 *  - companionPalaces: 삼방사정 등 함께 볼 궁(해석 깊이용 힌트)
 */
export const ZIWEI_DEEP_CHAPTERS = Object.freeze([
  {
    id: "overview",
    title: "제1장 · 명반 총론 — 당신이라는 별의 지도",
    palaceKey: null,
    scope:
      "타고난 성향 총론을 가장 먼저 짚는다. 명궁 주성과 별 세기(묘·왕·득·리·평·함)를 근거로 이 사람의 타고난 기질과 성향을 전반적으로 소개해, 상담자가 '나를 정확히 봤다'고 느끼도록 신뢰를 먼저 세운다. " +
      "그 위에 명궁·신궁의 위치와 오행국(五行局), 명반 전체의 격국(格局) 성향, 12궁 세력의 균형을 개관한다. " +
      "이 리포트 전체를 여는 서장으로, 이 사람의 인생을 관통하는 큰 축과 테마를 제시한다.",
    minChars: 2600,
    companionPalaces: ["명궁", "신궁", "관록궁", "재백궁", "복덕궁"],
  },
  {
    id: "ming",
    title: "제2장 · 명궁 — 타고난 기질과 자아의 핵",
    palaceKey: "명궁",
    scope: "타고난 성향·자아상·세상을 대하는 기본 태도·핵심 동기. 명궁 주성/보좌성/사화의 조합으로 읽는다.",
    minChars: 2400,
    companionPalaces: ["천이궁", "재백궁", "관록궁"],
  },
  {
    id: "siblings",
    title: "제3장 · 형제궁 — 형제·동료와 협력의 결",
    palaceKey: "형제궁",
    scope: "형제·또래·동료·협업 관계의 패턴, 지지받는 방식과 마찰 지점.",
    minChars: 2200,
    companionPalaces: ["노복궁", "부부궁"],
  },
  {
    id: "spouse",
    title: "제4장 · 부부궁 — 배우자·연애·결혼의 흐름",
    palaceKey: "부부궁",
    scope: "연애 성향, 배우자상, 결혼의 시기적 흐름과 관계 운영 방식, 약속과 갈등의 결.",
    minChars: 2600,
    companionPalaces: ["복덕궁", "천이궁", "자녀궁"],
  },
  {
    id: "children",
    title: "제5장 · 자녀궁 — 자녀·창작·후배와 확장",
    palaceKey: "자녀궁",
    scope: "자녀 인연, 창작·프로젝트를 낳는 힘, 후배·제자와의 관계, 성적(性的)·생산적 에너지.",
    minChars: 2200,
    companionPalaces: ["부부궁", "전택궁"],
  },
  {
    id: "wealth",
    title: "제6장 · 재백궁 — 재물의 구조와 돈의 길",
    palaceKey: "재백궁",
    scope: "돈이 들어오고 머무는 방식, 수입 구조, 재물 관리 스타일, 재물운의 강약과 리스크.",
    minChars: 2500,
    companionPalaces: ["관록궁", "전택궁", "복덕궁"],
  },
  {
    id: "health",
    title: "제7장 · 질액궁 — 건강·체질·마음의 리듬",
    palaceKey: "질액궁",
    scope: "타고난 체질과 취약 지점, 스트레스 반응, 정신 건강의 리듬, 회복을 위한 생활 조율.",
    minChars: 2200,
    companionPalaces: ["복덕궁", "명궁"],
  },
  {
    id: "travel",
    title: "제8장 · 천이궁 — 이동·해외·바깥세상의 운",
    palaceKey: "천이궁",
    scope: "이동·이사·해외·사회활동에서 운이 넓어지는 방식, 바깥에서 만나는 기회와 인상.",
    minChars: 2200,
    companionPalaces: ["명궁", "관록궁"],
  },
  {
    id: "friends",
    title: "제9장 · 노복궁 — 대인관계와 인맥의 지형",
    palaceKey: "노복궁",
    scope: "친구·동료·아랫사람·인맥의 질, 곁에 둘 사람과 거리를 둘 인연, 사람으로 얻고 잃는 결.",
    minChars: 2200,
    companionPalaces: ["형제궁", "부부궁"],
  },
  {
    id: "career",
    title: "제10장 · 관록궁 — 직업·커리어·사회적 자리",
    palaceKey: "관록궁",
    scope: "직업 적성, 커리어의 궤도, 사회적 지위와 성취 방식, 일에서 빛나는 역할과 조심할 지점.",
    minChars: 2600,
    companionPalaces: ["명궁", "재백궁", "천이궁"],
  },
  {
    id: "property",
    title: "제11장 · 전택궁 — 부동산·가정환경·삶의 기반",
    palaceKey: "전택궁",
    scope: "부동산·거주환경·가정의 기반, 재산이 쌓이는 자리, 안정과 확장의 리듬.",
    minChars: 2200,
    companionPalaces: ["재백궁", "부모궁"],
  },
  {
    id: "fortune",
    title: "제12장 · 복덕궁 — 내면·복(福)·취향과 정신세계",
    palaceKey: "복덕궁",
    scope: "정신적 만족·취향·여가·복의 결, 내면의 평온과 소진, 즐거움을 얻는 방식.",
    minChars: 2400,
    companionPalaces: ["명궁", "질액궁", "부부궁"],
  },
  {
    id: "parents",
    title: "제13장 · 부모궁 — 부모·윗사람·귀인의 결",
    palaceKey: "부모궁",
    scope: "부모·윗사람·귀인과의 인연, 뿌리에서 이어진 지원과 과제, 권위와의 관계.",
    minChars: 2200,
    companionPalaces: ["전택궁", "관록궁"],
  },
  {
    id: "sihua",
    title: "제14장 · 사화·삼방사정 심층 — 별들이 주고받는 대화",
    palaceKey: null,
    scope:
      "생년사화(록·권·과·기)가 어느 궁을 밝히고 어느 궁에 부담을 주는지, 명궁 기준 삼방사정(三方四正)의 호응 구조를 심층 해석한다. " +
      "궁과 궁이 서로 힘을 빌려주고 견제하는 관계의 역학을 드러낸다.",
    minChars: 2800,
    companionPalaces: ["명궁", "재백궁", "관록궁", "천이궁"],
  },
  {
    id: "masterplan",
    title: "제15장 · 대한·유년 마스터플랜 — 시간축 위의 인생 전략",
    palaceKey: null,
    scope:
      "10년 단위 대한(大限)의 흐름과 변곡점, 올해 유년(流年)의 테마, 그리고 지금 붙잡을 것과 기다릴 것을 " +
      "명반 근거로 정리한 종합 실행 전략(마스터플랜)을 제시한다. 리포트를 닫는 결장.",
    minChars: 3000,
    companionPalaces: ["명궁", "관록궁", "재백궁", "복덕궁"],
  },
]);

/** 명반 데이터를 프롬프트용 텍스트로 정리 */
export function formatZiweiChartForPrompt(chart) {
  const c = chart || {};
  const palaces = Array.isArray(c.palaces) ? c.palaces : [];
  const lines = [];
  lines.push(`- 명궁(命宮): ${c.lifePalace || "미상"}`);
  lines.push(`- 신궁(身宮): ${c.bodyPalace || "미상"}`);
  const ft = c.fourTransformations || {};
  const ftText = Object.entries(ft)
    .map(([type, star]) => `${type}:${star || "-"}`)
    .join(", ");
  if (ftText) lines.push(`- 생년사화(四化): ${ftText}`);
  lines.push("- 강약 표기 범례: ◎=묘(최상) · O=득(득지) · ▲=리(이로움) · △=평(균형) · X=함(주의). 표에 없는 별은 강약 미표기(추정 금지).");
  lines.push("- 12궁 배치(강약 포함):");
  for (const p of palaces) {
    if (!p || !p.name) continue;
    const brightness = p.brightness && typeof p.brightness === "object" ? p.brightness : {};
    const withBrightness = (names) => (names || []).map((name) => formatStarWithBrightness(name, brightness[name])).join("·");
    const main = withBrightness(p.mainStars) || "공궁(空宮)";
    const aux = withBrightness(p.assistantStars);
    const mal = withBrightness(p.maleficStars);
    const trans = (p.transformations || []).join("·");
    let row = `  · ${p.name}(${p.earthlyBranch || "-"}): 주성 ${main}`;
    if (aux) row += ` / 보좌 ${aux}`;
    if (mal) row += ` / 흉성 ${mal}`;
    if (trans) row += ` / 사화 ${trans}`;
    lines.push(row);
  }
  return lines.join("\n");
}

function formatBirthLine(birthInfo) {
  const b = birthInfo || {};
  const cal = b.calendarType === "lunar" ? "음력" : "양력";
  const parts = [b.name || "내담자"];
  if (b.gender) parts.push(b.gender);
  if (b.birthDate) parts.push(`${cal} ${b.birthDate}`);
  if (b.birthTimeUnknown) parts.push("출생시간 모름(정오 기준)");
  else if (b.birthTime) parts.push(b.birthTime);
  return parts.join(" · ");
}

/** 리포트 전체 공통 톤/규칙 가이드 (모든 챕터 프롬프트에 삽입) */
export function buildZiweiDeepSystemGuide() {
  return [
    "당신은 20년 경력의 자미두수(紫微斗數) 명리 상담가다. 아래 규칙을 반드시 지켜라.",
    "1. 제공된 [명반 데이터]에 실제로 배치된 성요·사화만 근거로 삼아라. 명반에 없는 별을 지어내지 마라.",
    "2. 과장된 예언·단정(반드시/절대) 대신, 성향과 확률·경향으로 서술하고 스스로 선택할 여지를 남겨라.",
    "3. 추상적 미사여구만 나열하지 말고, 일상·관계·일·돈의 구체적 장면과 실행 조언으로 연결하라.",
    "4. 존댓말, 따뜻하지만 명료한 문체. 한국어. 소제목(●)으로 단락을 구조화하라.",
    "5. 좋은 별/나쁜 별을 단순 이분하지 말고, 자리·밝기·삼방사정·시간의 흐름 속에서 강약이 켜지는 순서를 읽어라.",
    "6. [명반 데이터]의 각 별 뒤에 표기된 강약 기호(◎묘·O득·▲리·△평·X함)를 반드시 해석 근거로 삼아라. 강한 별(◎/O)은 그 궁의 힘이 실제로 살아나는 지점으로, 약한 별(△/X)은 관리·보완이 필요한 지점으로 명시적으로 구분해 서술하라. 기호가 없는 별의 강약은 지어내지 마라.",
  ].join("\n");
}

/**
 * 상담 블록. 통합 이전에는 "🔮 별궁 전문가 상담"이 별도 상품으로 이 질문을 받았다.
 * 두 상품을 하나로 합치면서, 관심분야·자유질문을 15챕터 전체가 공유하는 맥락으로 넘긴다.
 * 값이 없으면 빈 배열을 돌려 기존 프롬프트와 완전히 동일한 문자열을 유지한다.
 */
function buildConsultationLines(consultation) {
  const topic = String(consultation?.topic ?? "").trim();
  const question = String(consultation?.question ?? "").trim();
  if (!topic && !question) return [];

  const lines = ["[내담자의 상담 요청]"];
  if (topic) lines.push(`- 관심분야: ${topic}`);
  if (question) lines.push(`- 질문: ${question}`);
  lines.push(
    "- 이 장의 해석 범위를 지키되, 위 관심분야·질문과 이 장이 닿는 지점을 반드시 한 단락 이상 다뤄라.",
    "- 이 장에서 실제로 말할 수 있는 만큼만 연결하라. 무관한 장에 질문을 억지로 끌어오지 마라.",
    "- 질문에 답한다고 이 장의 원래 범위를 축소하지 마라. 분량 목표는 그대로다.",
  );
  return lines;
}

/**
 * 특정 챕터의 LLM 프롬프트를 만든다.
 * @param {object} chart  calculateZiweiAiChart(...) 결과
 * @param {object} birthInfo  { name, gender, birthDate, birthTime, birthTimeUnknown, calendarType }
 * @param {object} chapter  ZIWEI_DEEP_CHAPTERS 항목
 * @param {object} [consultation]  { topic, question } — 통합된 전문가 상담 입력(선택)
 */
export function buildZiweiDeepChapterPrompt(chart, birthInfo, chapter, consultation = null) {
  const chartText = formatZiweiChartForPrompt(chart);
  const birthLine = formatBirthLine(birthInfo);
  const min = chapter.minChars || 2200;
  const companions = (chapter.companionPalaces || []).join(", ");
  const consultationLines = buildConsultationLines(consultation);

  const palaceFocus = chapter.palaceKey
    ? `이번 장은 [${chapter.palaceKey}]을 중심 궁으로 삼아, 그 궁의 주성·보좌성·흉성·사화 조합을 정밀하게 해석한다.`
    : "이번 장은 특정 한 궁이 아니라 명반 전체를 가로지르는 주제를 다룬다.";

  return [
    buildZiweiDeepSystemGuide(),
    "",
    `[내담자] ${birthLine}`,
    "",
    "[명반 데이터]",
    chartText,
    "",
    `[이번 장] ${chapter.title}`,
    `[해석 범위] ${chapter.scope}`,
    palaceFocus,
    companions ? `[함께 볼 궁(삼방사정·호응)] ${companions}` : "",
    ...(consultationLines.length ? ["", ...consultationLines] : []),
    "",
    "[작성 지시]",
    `- 이 장 하나만 작성한다. 다른 장의 내용은 쓰지 않는다.`,
    `- 분량: 공백 포함 최소 ${min}자 이상. 얕게 끝내지 말고 근거→해석→구체적 장면→실행 조언 순으로 충분히 전개하라.`,
    "- 다음 소제목 흐름을 참고해 4~6개 단락으로 구성하라: ● 핵심 요약 / ● 성요 근거 / ● 강점과 기회 / ● 주의와 조율 / ● 현실 장면 / ● 실행 제안.",
    "- 명반 근거를 인용할 때 실제 배치된 성요 이름을 명시하라(예: '명궁의 자미·천부가…').",
    "- 마크다운 표/코드블록 없이, 소제목(●)과 문단만으로 작성하라.",
    "",
    `이제 "${chapter.title}"를 작성하라.`,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/** 리포트 전체 챕터 수 / 목표 분량 요약 (검증·진행률 표시에 사용) */
/* 관리자 프롬프트 랩 전용(lib/admin/prompt-lab-registry.mjs 참고).
   장별 사용자 프롬프트는 계산된 명반(chart)을 입력으로 받으므로 생년 정보만으로는 조립되지 않는다. */
export function buildAdminLabPrompt(body = {}, options = {}) {
  const chapter = ZIWEI_DEEP_CHAPTERS.find((item) => item.id === options.variant) || ZIWEI_DEEP_CHAPTERS[0];

  return {
    systemPrompt: buildZiweiDeepSystemGuide(),
    prompt: "",
    partial: true,
    partialReason: "장별 사용자 프롬프트는 계산된 자미두수 명반을 입력으로 받습니다. 시스템 지침만 표시합니다.",
    variantKey: chapter?.id || "",
    variants: ZIWEI_DEEP_CHAPTERS.map((item) => ({ key: item.id, label: item.title || item.id })),
    notes: chapter?.scope ? [`${chapter.title} 범위: ${chapter.scope}`] : [],
  };
}

export function getZiweiDeepReportPlan() {
  const chapters = ZIWEI_DEEP_CHAPTERS.map((ch) => ({
    id: ch.id,
    title: ch.title,
    minChars: ch.minChars,
  }));
  const minTotal = chapters.reduce((sum, ch) => sum + (ch.minChars || 0), 0);
  return {
    featureKey: ZIWEI_DEEP_PDF_META.featureKey,
    chapterCount: chapters.length,
    minTotalChars: minTotal,
    chapters,
  };
}
