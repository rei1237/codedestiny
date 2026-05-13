import {
  ZIWEI_PALACE_NAME,
  ZiweiDeepChapter,
  ZiweiDeepChart,
  ZiweiPalace,
  ZiweiSectionId,
  ZiweiStarMeta,
} from "./ziwei-types";
import {
  AUXILIARY_STAR_INTERPRETATIONS,
  MALEFIC_STAR_INTERPRETATIONS,
  SIHUA_INTERPRETATIONS,
  STRENGTH_SPECIFIC_STAR_HINTS,
  STAR_INTERPRETATIONS,
} from "./ziwei-star-interpretations";
import { MASTER_TEMPLATE, OVERVIEW_TEMPLATE, ZIWEI_PALACE_TEMPLATES } from "./ziwei-deep-templates";
import { transformationTypeToLabel } from "./ziwei-advanced-normalization";

type StrengthSymbol = "◎" | "○" | "△" | "×" | "";

const SYMBOL_DESC: Record<Exclude<StrengthSymbol, "">, string> = {
  "◎": "묘(廟) 급으로 별의 성능이 최상 발현되는 상태",
  "○": "왕(旺) 급으로 안정성과 지속 실행력이 높은 상태",
  "△": "리(利)·평(平) 구간으로 환경·운영 방식에 따라 결과 편차가 생기는 상태",
  "×": "함(陷) 구간으로 리스크 통제와 방어 전략이 최우선인 상태",
};

const SIHUA_BADGE: Record<string, string> = {
  화록: "풍요/기회 유입",
  화권: "권한/주도권 강화",
  화과: "명예/평판 상승",
  화기: "집중 과제/집착 관리",
};

function sentenceList(items: string[], empty = "직접 사화가 없는 구간은 삼방사정과 대궁 흐름을 함께 해석합니다."): string {
  if (!items.length) return empty;
  return items.join(" ");
}

function palaceById(chart: ZiweiDeepChart, id?: string): ZiweiPalace | null {
  if (!id) return null;
  return chart.palaces.find((p) => p.id === id) || null;
}

function normalizeSymbol(symbol?: string): StrengthSymbol {
  const raw = String(symbol || "").trim();
  if (raw === "◎") return "◎";
  if (raw === "○") return "○";
  if (raw === "▲") return "△";
  if (raw === "△") return "△";
  if (raw === "×" || raw.toUpperCase() === "X") return "×";
  return "";
}

function starRoleLabel(group: "main" | "assistant" | "malefic"): string {
  if (group === "main") return "주성";
  if (group === "assistant") return "보조성";
  return "살성";
}

function buildGenericStrengthHint(star: ZiweiStarMeta, group: "main" | "assistant" | "malefic", symbol: Exclude<StrengthSymbol, "">): string {
  const role = starRoleLabel(group);
  const transform = star.transformation ? ` ${star.transformation} 결합 국면` : "";

  if (symbol === "◎") {
    return `${role} ${star.name}의 강세(◎)는 궁의 핵심 축을 선명하게 만들며${transform}에는 장기 성과로 누적될 가능성이 큽니다.`;
  }
  if (symbol === "○") {
    return `${role} ${star.name}의 안정 구간(○)은 재현 가능한 성과를 만들기 좋고, 습관화하면 변동성을 크게 줄일 수 있습니다.`;
  }
  if (symbol === "△") {
    return `${role} ${star.name}의 기복 구간(△)은 환경 의존성이 커지므로 루틴·체크리스트·협업 보조 장치로 품질을 표준화해야 합니다.`;
  }
  return `${role} ${star.name}의 충돌 구간(×)은 방치하면 손실이 커지므로 속도 제한, 손실 상한선, 의사결정 보류 규칙을 먼저 설계해야 합니다.`;
}

function buildStrengthDrivenAction(star: ZiweiStarMeta, group: "main" | "assistant" | "malefic"): string {
  const symbol = symbolOf(star);
  const role = starRoleLabel(group);

  if (!symbol) {
    return `${role} ${star.name}은(는) 강약 기호가 비어 있어 계산 데이터 재동기화가 필요합니다.`;
  }
  if (symbol === "◎") {
    return `${role} ${star.name}(◎)은(는) 확장 카드입니다. 고난도 과제·핵심 의사결정·대표 역할에 우선 배치하세요.`;
  }
  if (symbol === "○") {
    return `${role} ${star.name}(○)은(는) 안정 카드입니다. 반복 성과 구간에 고정해 장기 복리 구조를 만드세요.`;
  }
  if (symbol === "△") {
    return `${role} ${star.name}(△)은(는) 보완 카드입니다. 단독 질주보다 협업·템플릿·리허설 기반으로 운용하세요.`;
  }
  return `${role} ${star.name}(×)은(는) 통제 카드입니다. 감정 반응 대신 데이터 기반 단계 실행으로 리스크를 분해하세요.`;
}

function symbolOf(star: ZiweiStarMeta): StrengthSymbol {
  return normalizeSymbol(star.strengthSymbol || star.symbol);
}

function strengthOf(star: ZiweiStarMeta): string {
  const text = String(star.strength || "").trim();
  if (text) return text;
  const symbol = symbolOf(star);
  if (symbol === "◎") return "묘";
  if (symbol === "○") return "왕";
  if (symbol === "△") return "평";
  if (symbol === "×") return "함";
  return "강약 미확인";
}

function starBadge(star: ZiweiStarMeta): string {
  const symbol = symbolOf(star);
  const symbolText = symbol || "강약 미확인";
  const transform = star.transformation ? ` ${star.transformation}` : "";
  return `${star.name}(${symbolText})${transform}`;
}

function groupBadge(stars: ZiweiStarMeta[]): string {
  if (!stars.length) return "없음";
  return stars.map((s) => starBadge(s)).join(", ");
}

function buildStarInterpretation(star: ZiweiStarMeta, group: "main" | "assistant" | "malefic"): string {
  const symbol = symbolOf(star);
  const strengthLabel = strengthOf(star);
  const strengthDesc = symbol ? SYMBOL_DESC[symbol] : "원자료에 강약 기호가 없어 보수적으로 해석";

  let base = "";
  if (group === "main") {
    const info = STAR_INTERPRETATIONS[star.name];
    base = info
      ? `${info.basic} ${info.strengths} ${info.cautions} ${info.remedy}`
      : "핵심 축을 담당하는 별로서 궁의 주된 의사결정 기준을 형성합니다.";
  } else if (group === "assistant") {
    base = AUXILIARY_STAR_INTERPRETATIONS[star.name] || "보조성이 완충과 연결 능력을 제공합니다.";
  } else {
    base = MALEFIC_STAR_INTERPRETATIONS[star.name] || "살성은 리스크를 경고하며 통제 장치를 요구합니다.";
  }

  const specialRules: string[] = [];
  const symbolHint = symbol ? STRENGTH_SPECIFIC_STAR_HINTS[star.name]?.[symbol] : "";
  if (symbolHint) specialRules.push(symbolHint);
  if (!symbolHint && symbol) {
    specialRules.push(buildGenericStrengthHint(star, group, symbol));
  }

  if (star.name === "천동" && (symbol === "△" || symbol === "×")) {
    specialRules.push("천동 약세 구간은 '편안함이 곧 불안함'으로 체감되기 쉬워, 안락함보다 성취감 중심 프로젝트에 몰입할 때 심리적 안정이 올라갑니다.");
    specialRules.push("천동의 감수성은 소모형 감정 처리보다 UI/UX, 상담 문장, 서비스 디테일 같은 시스템 설계 영역으로 전환할 때 가치가 극대화됩니다.");
    specialRules.push("루틴 명상·시각화·수면 고정은 흔들리는 천동 에너지를 묶어주는 핵심 방어막입니다.");
  }
  if (star.name === "경양" && symbol === "◎") {
    specialRules.push("경양 강세는 공격성이 아니라 문제 핵심을 찌르는 기술력·돌파력·결단력으로 승화될 가능성이 큽니다.");
    specialRules.push("경양의 칼은 인간관계를 자르는 방향이 아니라, 복잡한 데이터를 절단·규격화하는 업상대체(코드·아키텍처·디버깅·분석 설계)에 쓸 때 가장 크게 길성화됩니다.");
  }
  if (star.name === "우필" && symbol === "◎") {
    specialRules.push("우필 강세는 조력자·도구·협업 자원을 즉시 연결해 결과를 만드는 실무형 다재다능으로 작동합니다.");
    specialRules.push("AI와 자동화 도구를 반복 노동에 배치하고 본인은 설계·판단·우선순위 지휘를 맡을 때 우필 시너지가 극대화됩니다.");
  }
  if (star.name === "거문" && star.transformation === "화록") {
    specialRules.push("거문 화록은 말·글·상담·지식 플랫폼에서 수익화 동력이 커지고, 복잡한 정보를 가치로 번역하는 능력이 강화됩니다.");
  }
  if (star.name === "문창" && star.transformation === "화기") {
    specialRules.push("문창 화기는 제도권 문서에서 답답함을 만들 수 있으나, 코드·분석 문서·특수 언어 체계에서는 높은 집중력으로 전환될 수 있습니다.");
  }

  return `${star.name}(${symbol || "강약 미확인"}) · ${strengthLabel}: ${base} ${strengthDesc}. ${specialRules.join(" ")}`.trim();
}

function buildSynergyAndConflict(palace: ZiweiPalace): { synergy: string[]; conflicts: string[] } {
  const all = [...palace.mainStars, ...palace.auxiliaryStars, ...palace.maleficStars];
  const has = (name: string) => all.some((s) => s.name === name);
  const hasTransform = (name: string, transform: "화록" | "화권" | "화과" | "화기") =>
    all.some((s) => s.name === name && s.transformation === transform);

  const synergy: string[] = [];
  const conflicts: string[] = [];

  if (has("천기") && has("태음")) {
    synergy.push("천기+태음 조합은 논리와 감성의 결합으로 기획·시스템 설계·데이터 정리에 강한 구조를 만듭니다.");
  }
  if (has("거문") && hasTransform("거문", "화록")) {
    synergy.push("거문 화록은 지식·상담·콘텐츠·플랫폼형 수익 모델을 키우는 핵심 축입니다.");
  }
  if (has("천량") && has("문창") && hasTransform("문창", "화기")) {
    synergy.push("천량+문창 화기는 전통 지식과 특수 문서·코드 해석 역량을 결합해 고난도 문제 해결력으로 전환될 수 있습니다.");
  }
  if (has("천동") && has("경양")) {
    synergy.push("천동의 감수성과 경양의 절단력이 함께하면 외유내강형 문제 해결 엔진이 작동합니다.");
  }

  const severeMalefic = palace.maleficStars.filter((s) => symbolOf(s) === "×");
  if (severeMalefic.length > 0) {
    conflicts.push(`${severeMalefic.map((s) => s.name).join(", ")}은(는) 강한 충돌 신호이므로 과속 결정과 정면충돌 커뮤니케이션을 줄여야 합니다.`);
  }

  const weakMain = palace.mainStars.filter((s) => symbolOf(s) === "△" || symbolOf(s) === "×");
  if (weakMain.length > 0) {
    conflicts.push(`주성 중 ${weakMain.map((s) => s.name).join(", ")}의 기복이 커서, 의욕 편차가 큰 날에는 핵심 결정을 보류하는 운영 규칙이 필요합니다.`);
  }

  if (!synergy.length) {
    synergy.push("이 궁의 시너지는 단일 별보다 주성-보조성-사화를 동시에 묶어 실행할 때 강화됩니다.");
  }
  if (!conflicts.length) {
    conflicts.push("뚜렷한 충돌성은 낮지만, 피로 누적 시 의사결정 품질 저하를 막기 위한 리듬 관리가 필요합니다.");
  }

  return { synergy, conflicts };
}

function buildTriadLink(chart: ZiweiDeepChart, palace: ZiweiPalace): string {
  const opposite = palaceById(chart, palace.oppositePalaceId);
  const triad = palace.triadPalaceIds
    .map((id) => palaceById(chart, id))
    .filter(Boolean) as ZiweiPalace[];

  const triadText = triad
    .map((p) => `${p.name}(${groupBadge(p.mainStars)})`)
    .join(" · ");

  return [
    `대궁은 ${opposite?.name || "정보 없음"}이며, 현재 궁의 맹점을 교정하는 균형축입니다.`,
    `삼방사정 연결궁은 ${triad.map((p) => p.name).join(", ")}이고, 실전에서는 ${triadText || "연결궁 정보 확인 필요"}로 작동합니다.`,
    "해석 원칙은 단일 궁 단정이 아니라 현재 궁-대궁-삼방의 상호 압력과 지원을 함께 읽는 것입니다.",
  ].join(" ");
}

function buildSihuaAnalysis(chart: ZiweiDeepChart): string {
  const locate = (starName: string) => {
    const palace = chart.palaces.find((p) => [...p.mainStars, ...p.auxiliaryStars, ...p.maleficStars].some((s) => s.name === starName));
    return palace ? `${palace.name}(${palace.mainStars.map((s) => starBadge(s)).join(", ") || "주성 정보 제한"})` : "위치 미확인";
  };

  const rows = [
    { key: "화록", star: chart.sihua.hualu },
    { key: "화권", star: chart.sihua.huaquan },
    { key: "화과", star: chart.sihua.huake },
    { key: "화기", star: chart.sihua.huaji },
  ];

  return rows
    .map((row) => {
      const starName = row.star || "미확인";
      const place = row.star ? locate(row.star) : "위치 미확인";
      const keyHint = SIHUA_INTERPRETATIONS[row.key] || "사화 흐름 점검";
      const taskHint = row.key === "화기"
        ? "화기는 흉으로 단정하지 말고, 반복 과제를 구조화해 집중력을 성과로 전환하는 핵심 학습 구간으로 해석합니다."
        : "";
      return `${row.key}: ${starName} · 작동궁 ${place} · ${SIHUA_BADGE[row.key] || "작동 흐름"}. ${keyHint} ${taskHint}`.trim();
    })
    .join("\n");
}

function buildPalaceLongBody(chart: ZiweiDeepChart, palace: ZiweiPalace): string {
  const tpl = ZIWEI_PALACE_TEMPLATES[palace.id];
  const main = groupBadge(palace.mainStars);
  const assistant = groupBadge(palace.auxiliaryStars);
  const malefic = groupBadge(palace.maleficStars);
  const directTransformations = Array.isArray(palace.fourTransformations) ? palace.fourTransformations : [];
  const transformations = directTransformations.length
    ? directTransformations
      .map((item) => {
        const label = transformationTypeToLabel(item.type);
        return `${label} ${item.starName}(${SIHUA_BADGE[label] || "작동"})`;
      })
      .join(", ")
    : "직접 사화 없음";
  const incomingTransformations = Array.isArray(palace.incomingFourTransformations) ? palace.incomingFourTransformations : [];
  const incomingTransformationText = incomingTransformations.length
    ? incomingTransformations
      .map((item) => `${transformationTypeToLabel(item.type)} ${item.starName}`)
      .join(", ")
    : "삼방사정·대궁에서 확인된 직접 유입 없음";
  const emptyMainNarrative = palace.isEmptyMainStarPalace
    ? "이 궁은 주성이 직접 자리하지 않는 무주성궁입니다. 대궁과 삼방사정의 영향을 강하게 받는 구조로, 관계와 사건의 흐름이 주변 궁의 별 배치에 따라 섬세하게 달라집니다."
    : "";
  const noDirectTransformationNarrative = directTransformations.length === 0
    ? "이 궁에는 생년사화가 직접 들어오지 않았습니다. 따라서 별의 기본 성향과 삼방사정에서 들어오는 흐름을 중심으로 해석합니다."
    : "";

  const starDetails = [
    ...palace.mainStars.map((s) => buildStarInterpretation(s, "main")),
    ...palace.auxiliaryStars.map((s) => buildStarInterpretation(s, "assistant")),
    ...palace.maleficStars.map((s) => buildStarInterpretation(s, "malefic")),
  ];

  const { synergy, conflicts } = buildSynergyAndConflict(palace);

  const strengthDrivenActions = Array.from(new Set([
    ...palace.mainStars.map((s) => buildStrengthDrivenAction(s, "main")),
    ...palace.auxiliaryStars.map((s) => buildStrengthDrivenAction(s, "assistant")),
    ...palace.maleficStars.map((s) => buildStrengthDrivenAction(s, "malefic")),
  ])).slice(0, 14);

  const strengths = [
    ...palace.mainStars.filter((s) => symbolOf(s) === "◎" || symbolOf(s) === "○").map((s) => `${s.name} ${symbolOf(s)} 강점이 실행 품질을 끌어올립니다.`),
    ...palace.auxiliaryStars.filter((s) => symbolOf(s) === "◎" || symbolOf(s) === "○").map((s) => `보조성 ${s.name} ${symbolOf(s)}은(는) 협업·완충·도구 활용 효율을 끌어올립니다.`),
    ...palace.maleficStars.filter((s) => symbolOf(s) === "◎" || symbolOf(s) === "○").map((s) => `살성 ${s.name} ${symbolOf(s)}은(는) 통제 시 고속 실행 도구로 전환될 수 있습니다.`),
    "핵심 궁의 기준을 문장화하면 운의 변동성을 낮추고 재현 가능한 성과를 만들 수 있습니다.",
  ];

  const weaknesses = [
    ...palace.mainStars.filter((s) => symbolOf(s) === "△" || symbolOf(s) === "×").map((s) => `${s.name} ${symbolOf(s)} 구간에서 감정·컨디션 편차가 커질 수 있습니다.`),
    ...palace.auxiliaryStars.filter((s) => symbolOf(s) === "△" || symbolOf(s) === "×").map((s) => `보조성 ${s.name} ${symbolOf(s)}이 약하면 연결·지원 체계가 끊겨 성과가 흔들릴 수 있습니다.`),
    ...palace.maleficStars.filter((s) => symbolOf(s) === "△" || symbolOf(s) === "×").map((s) => `살성 ${s.name} ${symbolOf(s)}이 약충돌 구간이면 과속·마찰 리스크가 빠르게 증폭될 수 있습니다.`),
    "대궁 관점을 생략하면 단기 감정 반응이 전략을 덮어버릴 수 있습니다.",
  ];

  const cautions = [
    sentenceList(tpl.cautionLens, "과속/과부하/관계 소모"),
    "살성은 무조건 흉이 아니라 고속 실행 에너지이므로, 일정 완충과 손실 상한선을 같이 설계해야 합니다.",
    "화기가 있는 궁은 막힘으로 단정하지 말고 집중 과제의 방향을 먼저 정의해야 합니다.",
  ];

  const actions = [
    ...tpl.remedies,
    "삼방사정 3궁의 체크포인트를 주간 회고에 고정해 궁간 불균형을 조기 보정합니다.",
    "감정이 고조된 날의 핵심 결정은 24시간 보류 후 사실-감정-행동 순서로 재검토합니다.",
  ];

  const hasGyeongyang = palace.maleficStars.some((s) => s.name === "경양");
  if (hasGyeongyang) {
    actions.push("경양 에너지는 인간관계 정면충돌보다 업상대체(코드·분석·디버깅·시스템 절단 설계)로 배출해 성과 에너지로 전환합니다.");
  }

  if (palace.auxiliaryStars.some((s) => s.name === "우필" && (symbolOf(s) === "◎" || symbolOf(s) === "○"))) {
    actions.push("우필 강점 구간에서는 AI/툴 자동화에 반복 작업을 위임하고, 본인은 판단·설계·통합 역할에 집중합니다.");
  }

  const body = [
    `CHAPTER 메모: ${palace.name} 심화 분석`,
    `궁 이름: ${palace.name}`,
    `궁의 의미: ${tpl.meaning}`,
    `배치된 주성: ${main}`,
    `배치된 보조성: ${assistant}`,
    `배치된 살성: ${malefic}`,
    `사화 배치: ${transformations}`,
    `사화 유입: ${incomingTransformationText}`,
    emptyMainNarrative,
    noDirectTransformationNarrative,
    "",
    "각 별의 강약 기호 기준",
    "- 강약 서열: 묘 > 왕 > 리 > 평 > 함",
    "- ◎: 묘(최상 발현)",
    "- ○: 왕(강한 안정)",
    "- △: 리/평(실무·보통 구간)",
    "- ×: 함(취약·충돌 구간)",
    "",
    "별 하나하나의 개별 해석",
    ...starDetails.map((line, idx) => `${idx + 1}. ${line}`),
    "",
    "별들 간의 시너지",
    ...synergy.map((line) => `- ${line}`),
    "",
    "별들 간의 충돌",
    ...conflicts.map((line) => `- ${line}`),
    "",
    `삼방사정과의 연결: ${buildTriadLink(chart, palace)}`,
    "",
    "현실적 발현 방식",
    `이 궁은 ${tpl.insightPrompts.join(" / ")}를 중심으로 현실에 드러납니다. 핵심은 성향 설명에서 멈추지 않고 업무·관계·재정의 행동 규칙으로 번역하는 것입니다.`,
    "",
    "강점",
    ...strengths.map((line) => `- ${line}`),
    "",
    "약점",
    ...weaknesses.map((line) => `- ${line}`),
    "",
    "주의점",
    ...cautions.map((line) => `- ${line}`),
    "",
    "활용 전략",
    ...actions.map((line, idx) => `${idx + 1}) ${line}`),
    "",
    "강약 기반 정밀 운영 포인트",
    ...strengthDrivenActions.map((line, idx) => `${idx + 1}) ${line}`),
    "",
    "종합 결론",
    `${palace.name}의 결론은 '${sentenceList(palace.keywords, "균형/관리/실행")}'입니다. 이 구조는 운이 좋고 나쁨의 문제가 아니라, 강약 기호와 삼방사정을 기준으로 의사결정 품질을 관리할수록 성과가 커지는 설계입니다.`,
  ].join("\n");

  return ensureMinLength(body, 6200, "심층 보강", [
    `${palace.name} 추가 보강: 대궁 관점에서 반대 전략을 쓰면 과신을 줄이고 정확도를 높일 수 있습니다.`,
    `${palace.name} 추가 보강: 강점 별(◎/○)은 확장에, 약점 별(△/×)은 리스크 관리에 우선 배치하세요.`,
    `${palace.name} 추가 보강: 사화 작동 궁을 월간 루틴으로 추적하면 체감 성과가 빨라집니다.`,
  ]);
}

function ensureMinLength(baseText: string, targetLength: number, heading: string, pool: string[]): string {
  if (baseText.length >= targetLength) return baseText;
  let text = baseText;
  let i = 0;
  while (text.length < targetLength && i < 24) {
    const chunk = pool[i % pool.length] || "핵심 기준을 유지하면 운의 변동 폭이 줄어듭니다.";
    text += `\n\n${heading} ${i + 1}\n${chunk}`;
    i += 1;
  }
  return text;
}

function buildOverview(chart: ZiweiDeepChart): ZiweiDeepChapter {
  const lifePalace = chart.palaces.find((p) => p.id === "ming") || chart.palaces[0];
  const bodyPalace = chart.palaces.find((p) => p.earthlyBranch === chart.shenGong) || null;
  const travel = chart.palaces.find((p) => p.id === "travel") || null;
  const career = chart.palaces.find((p) => p.id === "career") || null;
  const wealth = chart.palaces.find((p) => p.id === "wealth") || null;

  const lines = [
    "CH.01 명궁 분석: 나의 핵심 설계도",
    `명궁 주성/보조성/살성: ${groupBadge(lifePalace.mainStars)} / ${groupBadge(lifePalace.auxiliaryStars)} / ${groupBadge(lifePalace.maleficStars)}`,
    `명궁 핵심 해석: ${buildPalaceLongBody(chart, lifePalace).slice(0, 2200)}`,
    "",
    "CH.02 신궁 분석: 후천적으로 강해지는 나",
    `신궁 위치: ${chart.shenGong} · 대응 궁: ${bodyPalace?.name || "미확인"}`,
    bodyPalace
      ? `신궁 별 배치: ${groupBadge(bodyPalace.mainStars)}. 명궁과 비교하면 '${lifePalace.name}'의 타고난 기질이 '${bodyPalace.name}'의 현실 행동으로 구체화됩니다.`
      : "신궁 궁위 식별이 제한되어 명궁 중심으로 보수 해석합니다.",
    "",
    "CH.03 삼방사정 분석: 인생의 무기와 수익 모델",
    `명궁: ${groupBadge(lifePalace.mainStars)}`,
    `천이궁: ${groupBadge(travel?.mainStars || [])}`,
    `관록궁: ${groupBadge(career?.mainStars || [])}`,
    `재백궁: ${groupBadge(wealth?.mainStars || [])}`,
    "삼방사정 해석은 명궁 하나만 보는 것이 아니라, 외부 인터페이스(천이)·직업 로직(관록)·수익 구조(재백)를 교차해 성공 공식을 도출하는 과정입니다.",
    "",
    "삼방사정 연결 결론",
    `${buildTriadLink(chart, lifePalace)}`,
    "",
    "핵심 전략",
    "1) 명궁의 강점 별(◎/○)은 브랜드/역할로 전환하고, 약점 별(△/×)은 운영 규칙으로 관리합니다.",
    "2) 관록궁-재백궁 연결로 수익 모델을 설계하고, 천이궁으로 외부 노출 방식을 설계합니다.",
    "3) 단기 결과보다 90일 단위 실행 루틴을 고정하면 명반 강점이 복리로 누적됩니다.",
  ].join("\n");

  const fullText = ensureMinLength(lines, 6200, "핵심 구조 보강", [
    "명궁은 성격 설명이 아니라 의사결정 기준의 원형입니다. 기준을 글로 고정할수록 삶의 노이즈가 줄어듭니다.",
    "신궁은 나이가 들수록 더 체감되는 행동 패턴입니다. 명궁과 차이를 의식하면 후천 운용력이 급상승합니다.",
    "삼방사정은 성공 모델과 리스크 모델을 동시에 보여줍니다. 확장 전략과 방어 전략을 항상 짝으로 설계하세요.",
  ]);

  return {
    sectionId: "overview",
    title: OVERVIEW_TEMPLATE.title,
    summary: [
      `명궁: ${groupBadge(lifePalace.mainStars)}`,
      `신궁: ${bodyPalace ? bodyPalace.name : "미확인"}`,
      `삼방사정 축: ${[travel?.name, career?.name, wealth?.name].filter(Boolean).join(", ")}`,
    ],
    fullText,
    highlights: ["명궁", "신궁", "삼방사정", ...chart.summary.keywords].slice(0, 8),
    strengths: [
      "강약 기호 기반으로 궁별 실행 우선순위를 분리할 수 있습니다.",
      "명궁-신궁 차이를 인식하면 후천 운용력이 크게 상승합니다.",
      "삼방사정으로 직업/수익/확장 모델을 동시에 설계할 수 있습니다.",
    ],
    cautions: [
      "명궁 단일 해석으로 결론 내리면 현실 발현 예측이 왜곡될 수 있습니다.",
      "약점 별의 리스크를 무시하면 성과 변동성이 커집니다.",
      "대궁 관점이 빠지면 단기 감정 반응이 전략을 압도할 수 있습니다.",
    ],
    remedies: [
      "주 1회 명궁-신궁 비교 회고",
      "삼방사정 3궁 체크포인트 기록",
      "강약 기호별 행동 우선순위표 작성",
    ],
    actionItems: ["명궁 강점 1개를 이번 주 실행으로 전환", "신궁 약점 1개를 운영 규칙으로 보완", "삼방사정 기반 수익 모델 1개 정의"],
    routine7Days: ["매일 5분 기준 기록", "핵심 결정 24시간 재검토", "관계·일·돈 통합 점검"],
    routine30Days: ["명궁/신궁 비교 리뷰", "삼방사정 성과 회고", "다음 달 전략 리셋"],
  };
}

function buildMaster(chart: ZiweiDeepChart): ZiweiDeepChapter {
  const periodRows = chart.majorPeriods
    .map((period) => {
      const palace = palaceById(chart, period.palaceId);
      return `${period.range}: ${palace?.name || period.palaceId}`;
    })
    .slice(0, 12);

  const annualKey = chart.annualFlow?.yearLabel || "유년 데이터";
  const annualPalaces = (chart.annualFlow?.keyPalaces || []).map((id) => ZIWEI_PALACE_NAME[id]).join(", ");

  const fullText = ensureMinLength([
    "CH.12 사화 분석: 화록·화권·화과·화기",
    buildSihuaAnalysis(chart),
    "",
    "CH.13 대운·세운 전략",
    `현재 대운 참조: ${periodRows[0] || "데이터 확인 필요"}`,
    `다음 대운 참조: ${periodRows[1] || "데이터 확인 필요"}`,
    `유년 포인트: ${annualKey} · 강조 궁 ${annualPalaces || "정보 제한"}`,
    "전략 원칙: 단정적 예언 대신, 시기별로 유리한 선택과 보수적 선택을 분리해 실행합니다.",
    "- 유리한 시기: 강점 궁(점수 상위 3궁)과 사화 화록/화권이 겹치는 구간",
    "- 조심할 시기: 약점 궁(점수 하위 2궁)과 화기·강한 살성이 겹치는 구간",
    "- 행동 전략: 확장 결정은 90일 계획, 방어 결정은 7일 회복 루틴으로 관리",
    "",
    "CH.14 성공을 위한 마스터플랜",
    `명반 전체 성공 공식: ${chart.summary.direction}`,
    "직업 전략: 관록궁 강점 별을 핵심 역량으로 고정하고, 약점 별은 협업/도구 시스템으로 보완",
    "돈 전략: 재백궁-관록궁-천이궁을 연결해 수익화 경로를 다변화하고 누수 패턴을 선제 차단",
    "관계 전략: 부부궁/복덕궁/교우궁을 묶어 경계-소통-회복 루틴을 하나의 운영 체계로 설계",
    "콘텐츠·플랫폼·사업 전략: 거문/문창/천기 계열 언어·기획 역량을 구조화 상품으로 전환",
    "조심해야 할 함정: 과속 확장, 감정 과부하, 기준 없는 관계 소모",
    "가장 강력한 무기: 강약 기호를 행동 규칙으로 번역하는 실행력",
    "최종 한 문장: 이 명반은 신비를 현실 언어로 구조화할 때 가장 크게 성공합니다.",
    "",
    "90일 실행 테이블",
    "| 기간 | 핵심 목표 | 실천 행동 | 주의할 점 | 기대 변화 |",
    "|---|---|---|---|---|",
    "| 1~7일 | 기준 정렬 | 핵심 목표 3개 제한 | 감정 과열 결정 금지 | 변동성 감소 |",
    "| 8~30일 | 실행 가속 | 강점 궁 기반 프로젝트 집중 | 과부하 누적 경계 | 성과 체감 상승 |",
    "| 31~60일 | 구조 검증 | 사화/삼방사정 교차 점검 | 관계 소모 방치 금지 | 재현성 강화 |",
    "| 61~90일 | 확장 설계 | 수익 모델 다변화/자동화 | 무리한 확장 금지 | 장기 성장 기반 확보 |",
  ].join("\n"), 6200, "마스터플랜 보강", [
    "사화는 운의 방향키입니다. 화록/화권/화과는 확장 축, 화기는 집중 과제 축으로 함께 관리해야 성과가 안정됩니다.",
    "대운은 속도보다 방향, 세운은 방향보다 실행 품질을 검증합니다. 둘을 분리해서 읽어야 오판을 줄일 수 있습니다.",
    "성공 공식은 재능이 아니라 운영입니다. 강점 별은 복리로 키우고, 약점 별은 제도로 보완하세요.",
  ]);

  return {
    sectionId: "master",
    title: MASTER_TEMPLATE.title,
    summary: [
      "사화 작동궁 기반 성공/리스크 축을 분리했습니다.",
      "대운·세운 시기 전략을 행동 단위로 번역했습니다.",
      "최종 성공 공식을 직업/돈/관계/사업 전략으로 통합했습니다.",
    ],
    fullText,
    highlights: ["사화", "대운", "세운", "마스터플랜", "성공 공식"],
    strengths: ["사화를 기회/과제로 분리해 해석", "대운·세운을 실행전략으로 번역", "90일 로드맵으로 행동 고정"],
    cautions: ["화기를 흉으로만 단정하지 않기", "시기 해석을 예언으로 오해하지 않기", "강점 확장과 리스크 관리의 균형 유지"],
    remedies: ["월간 사화 체크", "분기 대운 리셋", "주간 실행 로그"],
    actionItems: ["이번 달 화기 과제 1개를 문서화", "다음 대운 대비 역량 1개 선행 확보", "90일 테이블에 본인 일정 매핑"],
    routine7Days: ["사화 작동궁 점검", "핵심 리스크 1개 완충", "결정 로그 기록"],
    routine30Days: ["대운 흐름 리뷰", "수익/관계/건강 3축 재정렬", "분기 목표 재설정"],
  };
}

export function generateZiweiDeepChapter(chart: ZiweiDeepChart, sectionId: ZiweiSectionId): ZiweiDeepChapter {
  if (sectionId === "overview") return buildOverview(chart);
  if (sectionId === "master") return buildMaster(chart);

  const palace = palaceById(chart, sectionId);
  if (!palace) {
    return {
      sectionId,
      title: "분석 준비 중",
      summary: ["선택한 궁 정보를 찾지 못했습니다."],
      fullText: "선택한 궁 데이터가 누락되어 기본 분석만 제공합니다. 입력값을 확인한 뒤 다시 계산하면 더 정밀한 결과를 확인할 수 있습니다.",
      highlights: ["데이터 누락"],
      strengths: [],
      cautions: ["입력값 점검 필요"],
      remedies: ["생년월일/출생시/성별 재확인"],
      actionItems: ["다시 계산하기"],
      routine7Days: [],
      routine30Days: [],
    };
  }

  const title = `${ZIWEI_PALACE_NAME[palace.id]} 심화 분석`;
  const fullText = buildPalaceLongBody(chart, palace);

  return {
    sectionId,
    palaceId: palace.id,
    title,
    subtitle: `${palace.name} · 지지 ${palace.earthlyBranch}`,
    summary: [
      `궁의 의미: ${ZIWEI_PALACE_TEMPLATES[palace.id].meaning}`,
      `주성: ${palace.isEmptyMainStarPalace ? "무주성궁" : groupBadge(palace.mainStars)}`,
      `보조성/살성: ${groupBadge(palace.auxiliaryStars)} / ${groupBadge(palace.maleficStars)}`,
      `사화: ${sentenceList((palace.fourTransformations || []).map((item) => `${transformationTypeToLabel(item.type)} ${item.starName}`), "직접 사화 없음")}`,
    ],
    fullText,
    highlights: [
      ...palace.keywords,
      ...(palace.fourTransformations || []).map((item) => `${transformationTypeToLabel(item.type)} ${item.starName}`),
    ].slice(0, 8),
    strengths: [
      "별 강약 기호를 근거로 행동 우선순위를 제시합니다.",
      "삼방사정·대궁 연결을 통해 단일 궁 해석의 왜곡을 줄입니다.",
      "살성과 화기를 리스크 관리와 집중 과제로 번역합니다.",
    ],
    cautions: [
      "강약 기호가 약한 별은 환경 의존성이 크므로 루틴 기반 보완이 필요합니다.",
      "충돌 별이 강한 구간은 관계·일정 완충을 먼저 설계해야 합니다.",
      "사화 변화는 단기 감정이 아니라 장기 운영 관점으로 읽어야 합니다.",
    ],
    remedies: ZIWEI_PALACE_TEMPLATES[palace.id].remedies,
    actionItems: ["강점 별 1개 확장", "약점 별 1개 보완 규칙 수립", "삼방사정 체크포인트 주간 고정"],
    routine7Days: ["5분 기준 기록", "결정 24시간 재검토", "회복 루틴 점검"],
    routine30Days: ["궁별 성과 리뷰", "리스크 패턴 정리", "다음 달 전략 재설계"],
  };
}
