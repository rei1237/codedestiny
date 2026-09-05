import {
  ZIWEI_PALACE_NAME,
  ZiweiDeepChapter,
  ZiweiDeepChart,
  ZiweiPalace,
  ZiweiSectionId,
  ZiweiStarMeta,
} from "./ziwei-types";
import { SIHUA_INTERPRETATIONS } from "./ziwei-star-interpretations";
import { MASTER_TEMPLATE, OVERVIEW_TEMPLATE, ZIWEI_PALACE_TEMPLATES } from "./ziwei-deep-templates";
import { transformationTypeToLabel } from "./ziwei-advanced-normalization";
import {
  buildZiweiDeepCounselingText,
  buildZiweiDeepPalaceReading,
  removeRepeatedZiweiDeepPhrases,
  sanitizeZiweiDeepText,
  validateZiweiDeepReading,
} from "./ziwei-deep-reading";

const ZIWEI_DEEP_CHAPTER_TEXT_TRANSLATIONS = {
  ko: {
    preparingTitle: "분석 준비 중",
  },
  en: {
    preparingTitle: "Preparing Analysis",
  },
  ja: {
    preparingTitle: "分析を準備中",
  },
} as const;

type StrengthSymbol = "◎" | "O" | "▲" | "△" | "X" | "";

// 기호만으로는 의미를 알기 어려우므로, 뱃지에 짧은 한글 설명을 함께 표기한다(강약 기호 옆 인라인 설명).
const SYMBOL_SHORT_MEANING: Record<Exclude<StrengthSymbol, "">, string> = {
  "◎": "최상",
  "O": "득지",
  "▲": "이로움",
  "△": "균형",
  "X": "함몰 주의",
};

const SIHUA_BADGE: Record<string, string> = {
  화록: "풍요/기회 유입",
  화권: "권한/주도권 강화",
  화과: "명예/평판 상승",
  화기: "집중 과제/집착 관리",
};

function palaceById(chart: ZiweiDeepChart, id?: string): ZiweiPalace | null {
  if (!id) return null;
  return chart.palaces.find((p) => p.id === id) || null;
}

function normalizeSymbol(symbol?: string): StrengthSymbol {
  const raw = String(symbol || "").trim();
  if (raw === "◎") return "◎";
  if (raw === "○" || raw === "O") return "O";
  if (raw === "▲") return "▲";
  if (raw === "△") return "△";
  if (raw === "×" || raw.toUpperCase() === "X") return "X";
  return "";
}

function symbolOf(star: ZiweiStarMeta): StrengthSymbol {
  return normalizeSymbol(star.strengthSymbol || star.symbol);
}

function starBadge(star: ZiweiStarMeta): string {
  const symbol = symbolOf(star);
  const symbolText = symbol ? `${symbol}·${SYMBOL_SHORT_MEANING[symbol]}` : "강약 미확인";
  const transform = star.transformation ? ` ${star.transformation}` : "";
  return `${star.name}(${symbolText})${transform}`;
}

function groupBadge(stars: ZiweiStarMeta[]): string {
  if (!stars.length) return "없음";
  return stars.map((s) => starBadge(s)).join(", ");
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
  const strongestStar = chart.palaces
    .flatMap((palace) => palace.mainStars)
    .sort((left, right) => String(right.strengthSymbol || right.symbol || "").localeCompare(String(left.strengthSymbol || left.symbol || "")))[0];

  const strongestPalace = chart.palaces.find((p) => p.id === chart.summary.strongestPalaceId) || null;
  const weakestPalace = chart.palaces.find((p) => p.id === chart.summary.weakestPalaceId) || null;

  const matrixRows = [...chart.summary.palaceMatrix]
    .sort((a, b) => b.score - a.score)
    .map((row) => `${row.palaceName}: ${Math.round(row.score)}점 · ${row.mainStars.join("·") || "무주성"} · 키워드 ${row.keywords.slice(0, 2).join("/") || "정리 중"}`)
    .join("\n");

  const sihuaOneLine = buildSihuaAnalysis(chart).replace(/\n+/g, " ");

  const fullText = removeRepeatedZiweiDeepPhrases([
    `이 리포트를 읽는 순서를 먼저 안내합니다. 1장은 명반 전체의 큰 그림, 2~13장은 12궁 각각의 상세 상담, 14장은 사화·삼방사정의 상호작용, 15장은 시간축(대한·유년) 전략입니다. 지금 이 1장만 읽어도 전체 인생의 축을 파악할 수 있게 구성했습니다.`,
    `당신의 기본 결은 명궁에 자리한 ${groupBadge(lifePalace.mainStars)}로 시작되고, 실제 생활 습관과 행동 패턴은 신궁에 해당하는 ${bodyPalace ? `${bodyPalace.name}(${groupBadge(bodyPalace.mainStars)})` : "현재 확인 가능한 범위"}에서 더 뚜렷하게 드러납니다. 명궁이 "무엇을 기준으로 판단하는가"를 보여준다면, 신궁은 "실제로 몸이 어떻게 움직이는가"를 보여줍니다. 이 둘 사이의 간격이 클수록 '머리로는 아는데 실천이 안 된다'는 체감이 커지고, 간격이 작을수록 결심과 행동이 바로 연결됩니다.`,
    `삶의 확장과 성과는 바깥 활동(천이궁 ${groupBadge(travel?.mainStars || [])}), 일의 구조(관록궁 ${groupBadge(career?.mainStars || [])}), 돈의 흐름(재백궁 ${groupBadge(wealth?.mainStars || [])})이 맞물릴 때 커집니다. 그래서 한 영역만 잘하는 전략보다, 사람·일·수익을 같은 리듬으로 설계하는 전략이 더 오래갑니다. 이 세 궁 중 어느 하나라도 방치되면 다른 두 궁의 성과도 함께 흔들리는 구조이기 때문에, 세 궁을 한 세트로 관리하는 습관이 핵심입니다.`,
    `12궁 전체의 힘의 분포를 한눈에 정리하면 다음과 같습니다.\n${matrixRows}`,
    `이 중 지금 가장 힘이 강하게 작동하는 궁은 ${strongestPalace?.name || "확인 중"}이고, 상대적으로 보완이 필요한 궁은 ${weakestPalace?.name || "확인 중"}입니다. ${chart.summary.strengths.join(" ")} 반대로 ${chart.summary.weaknesses.join(" ")} 이 두 축을 같이 보는 이유는, 강한 궁만 밀어붙이면 약한 궁에서 새는 에너지를 놓치고, 약한 궁만 걱정하면 정작 밀어야 할 강점을 못 쓰게 되기 때문입니다.`,
    `당신의 인생 방향을 정리하면 다음과 같습니다.\n\n▶ 인생 방향: ${chart.summary.direction}\n▶ 방향이 열리는 조건: ${chart.summary.openingCondition}\n▶ 선택이 갈릴 때의 기준: ${chart.summary.decisionRule}\n\n이 세 가지(방향·조건·기준)만 기억해도 이 리포트의 15개 챕터를 관통하는 핵심을 놓치지 않을 수 있습니다.`,
    `사화(四化)의 흐름을 아주 짧게 미리 보면 다음과 같습니다. ${sihuaOneLine} 자세한 해석은 14장에서 궁과 궁 사이의 관계까지 포함해 다시 다룹니다.`,
    `마주 보는 궁과 연결된 궁의 흐름을 같이 보면, 겉으로 보이는 성향과 실제 결과 사이의 간격을 줄일 수 있습니다. 이 관점은 "운이 좋다/나쁘다"를 따지는 방식이 아니라, 어디를 먼저 조정하면 삶이 부드럽게 풀리는지를 찾는 데 도움이 됩니다. 자미두수의 강점은 바로 이 '관계의 지도'에 있습니다 — 한 궁의 별만 보지 않고, 그 궁을 둘러싼 대궁과 삼방사정을 함께 읽을 때 비로소 입체적인 그림이 완성됩니다.`,
    `현재 핵심 키워드는 ${chart.summary.keywords.slice(0, 5).join(", ")}이고, 지금 가장 먼저 살려야 할 강점 별은 ${strongestStar ? `${strongestStar.name}${strongestStar.strengthSymbol || strongestStar.symbol || ""}` : "명반 재확인 필요"}입니다. 이 강점을 일상 행동으로 옮길수록 삶의 체감 난이도는 낮아지고 선택의 확신은 높아집니다. 명반은 정해진 운명을 통보하는 문서가 아니라, 지금 무엇에 힘을 쓰고 무엇을 아껴야 하는지 알려주는 실용적인 지도입니다.`,
  ].join("\n\n"));

  return {
    sectionId: "overview",
    title: OVERVIEW_TEMPLATE.title,
    summary: [
      `당신의 기준과 행동 축: 명궁 ${groupBadge(lifePalace.mainStars)} / 신궁 ${bodyPalace ? `${bodyPalace.name} ${groupBadge(bodyPalace.mainStars)}` : "현재 확인 가능한 범위"}`,
      `지금 먼저 살릴 강점 별: ${strongestStar ? `${strongestStar.name}${strongestStar.strengthSymbol || strongestStar.symbol || ""}` : "확인 중"} · 가장 강한 궁 ${strongestPalace?.name || "-"} · 보완 궁 ${weakestPalace?.name || "-"}`,
      `함께 보아야 할 생활 축: ${[travel?.name, career?.name, wealth?.name].filter(Boolean).join(", ")}`,
      `인생 방향: ${chart.summary.direction}`,
    ],
    fullText: ensureMinLength(fullText, 3800, "개관 노트", [
      "명반 총론 노트: 명궁·신궁의 축을 매주 한 번씩 실제 행동과 비교해 기록하면 자기 이해의 정확도가 빠르게 올라갑니다.",
      "명반 총론 노트: 강한 궁과 약한 궁을 같은 표에 놓고 관리하면 확장과 방어를 동시에 운영할 수 있습니다.",
      "명반 총론 노트: 사화가 지나가는 궁을 월간 캘린더에 표시해 두면 시기별 대응이 훨씬 정교해집니다.",
    ]),
    highlights: ["기본 성향", "행동 패턴", "생활 축", "12궁 매트릭스", ...chart.summary.keywords].slice(0, 8),
    strengths: [
      "당신의 기본 성향과 현실 행동을 함께 보여 주어 자기 이해의 정확도를 높입니다.",
      "사람·일·돈의 연결 흐름을 같이 보게 해 주어 실제 전략으로 옮기기 쉽습니다.",
      "강한 지점과 흔들리는 지점을 동시에 제시해 확장 전략과 방어 전략을 분리할 수 있습니다.",
      "12궁 전체의 점수 분포를 제공해 어느 영역을 먼저 챙길지 우선순위를 명확히 합니다.",
    ],
    cautions: [
      "한 영역만 보고 결론 내리면 실제 변화 포인트를 놓치기 쉽습니다.",
      "반복 과제 신호와 약세 별은 실패 예언이 아니라 관리 우선순위로 읽어야 합니다.",
      "중심 별이 비어 보이는 궁도 연결 흐름의 영향이 커서 충분히 강하게 작동할 수 있습니다.",
    ],
    remedies: [
      "주 1회 내 기준과 실제 행동 비교 회고",
      "사람·일·돈 3축 체크포인트 기록",
      "강점 별과 보완 별을 분리해 운영표 작성",
    ],
    actionItems: ["핵심 강점 1개를 이번 주 행동으로 전환", "흔들리는 패턴 1개를 운영 규칙으로 보완", "사람·일·돈을 잇는 수익 시나리오 1개 정의"],
    routine7Days: ["매일 5분 기준 기록", "핵심 결정 24시간 재검토", "관계·일·돈 통합 점검"],
    routine30Days: ["기준/행동 축 비교 리뷰", "생활 3축 성과 회고", "다음 달 전략 리셋"],
  };
}

function buildMaster(chart: ZiweiDeepChart): ZiweiDeepChapter {
  const periodRows = chart.majorPeriods
    .map((period) => {
      const palace = palaceById(chart, period.palaceId);
      return `${period.range}: ${palace?.name || period.palaceId}${palace ? ` (${groupBadge(palace.mainStars)})` : ""}`;
    })
    .slice(0, 12);

  const fullPeriodTimeline = periodRows.join("\n");

  const annualKey = chart.annualFlow?.yearLabel || "유년 데이터";
  const annualPalaces = (chart.annualFlow?.keyPalaces || []).map((id) => ZIWEI_PALACE_NAME[id]).join(", ");
  const annualNotes = (chart.annualFlow?.notes || []).join(" ");

  const topStrength = [...chart.summary.palaceMatrix]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => `${item.palaceName}(${Math.round(item.score)})`)
    .join(", ");
  const lowStrength = [...chart.summary.palaceMatrix]
    .sort((a, b) => a.score - b.score)
    .slice(0, 2)
    .map((item) => `${item.palaceName}(${Math.round(item.score)})`)
    .join(", ");
  const currentPeriod = periodRows[0] || "데이터 확인 필요";
  const nextPeriod = periodRows[1] || "데이터 확인 필요";
  const laterPeriods = periodRows.slice(2, 6).join(" / ") || "이후 구간 데이터 확인 필요";

  const fullText = removeRepeatedZiweiDeepPhrases([
    `지금 명반 전체를 관통하는 방향을 정리하면 다음과 같습니다.\n\n▶ 인생 방향: ${chart.summary.direction}\n▶ 방향이 열리는 조건: ${chart.summary.openingCondition}\n▶ 갈림길에서의 결정 기준: ${chart.summary.decisionRule}\n\n복잡한 해석을 모두 기억하려고 애쓰기보다, 이 세 가지를 오늘의 선택 기준으로 삼는 것이 가장 빠른 길입니다.`,
    `현재 흐름에서 힘이 먼저 살아나는 궁은 ${topStrength || "상위 궁 데이터 확인 필요"}이고, 먼저 보완해야 할 궁은 ${lowStrength || "하위 궁 데이터 확인 필요"}입니다. 운은 좋고 나쁨의 낙인이 아니라, 어디를 먼저 쓰고 어디를 먼저 고칠지의 순서입니다.`,
    `대한(大限) 전체 흐름을 10년 단위로 펼치면 다음과 같습니다.\n${fullPeriodTimeline}`,
    `지금 구간은 ${currentPeriod}이고, 다음 구간은 ${nextPeriod}로 넘어갑니다. 그 이후로는 ${laterPeriods} 순으로 이어집니다. 대한은 인생의 계절과 같아서, 지금 구간에서 씨를 뿌려야 다음 구간에서 열매를 거둡니다. 그러니 당장 성과를 키울 영역과 천천히 기반을 다질 영역을 분리해 운용해야 체감 성과가 안정됩니다.`,
    `올해 유년 키워드는 ${annualKey}이며, 특히 ${annualPalaces || "핵심 궁 정보 제한"}에서 사건 체감이 빠르게 올라올 수 있습니다. ${annualNotes || "세부 유년 메모는 추가 데이터 확보 시 갱신됩니다."} 이 구간에서는 감정 반응보다 일정·문서·돈의 순서로 정리할수록 실수가 줄어듭니다.`,
    `사화 흐름은 다음과 같이 읽으시면 됩니다.\n${buildSihuaAnalysis(chart)}`,
    `화록은 들어오는 기회를 받는 힘, 화권은 책임을 떠맡는 힘, 화과는 평판을 키우는 힘, 화기는 오래 미뤄 둔 과제를 해결하라는 신호입니다. 특히 화기는 불운의 낙인이 아니라, 지금 반드시 정리해야 하는 삶의 숙제를 알려주는 등불에 가깝습니다. 네 가지 사화가 어느 궁에 떨어지는지에 따라 올해 에너지가 몰리는 자리가 완전히 달라지므로, 위 표를 옆에 두고 이번 장을 읽으시길 권합니다.`,
    `실전에서는 세 가지를 기억하세요. 첫째, 강점 궁은 확장하고 약점 궁은 보호한다. 둘째, 관계·일·돈을 따로 보지 말고 같은 주간 리듬으로 관리한다. 셋째, 큰 결정은 감정이 잦아든 다음 날 다시 확인한다. 이 세 원칙은 어떤 대한 구간에 있든 동일하게 적용되는 자미두수 운영의 기본기입니다.`,
    `앞으로 90일은 다음처럼 움직이면 좋습니다. 첫 7일은 기준 정렬 기간으로 핵심 목표를 3개만 남기세요. 8~30일은 실행 가속 기간으로 상위 궁의 강점을 결과물로 만드세요. 31~60일은 구조 점검 기간으로 화기와 약점 궁의 누수를 막으세요. 61~90일은 확장 설계 기간으로 수익 경로와 협업 구조를 안정화하세요.`,
    `${MASTER_TEMPLATE.declarationPrefix} 강점 궁의 별을 일상의 행동으로 옮기며, 약점 궁의 신호를 무시하지 않고 관리합니다. 당신의 명반은 신비로운 예언서가 아니라, 삶을 정확히 운영하게 도와주는 전략 지도입니다. 기준이 흔들리는 날에는 강점 궁 하나를 먼저 살리고, 약점 궁 하나를 보호하는 원칙으로 돌아오세요. 그 반복이 결국 운의 방향을 바꿉니다.`,
  ].join("\n\n"));

  return {
    sectionId: "master",
    title: MASTER_TEMPLATE.title,
    summary: [
      "사화 작동궁 기반 성공/리스크 축을 분리했습니다.",
      "대한(10년 단위) 전체 타임라인과 유년 흐름을 함께 정리했습니다.",
      "최종 성공 공식을 직업/돈/관계/사업 전략으로 통합했습니다.",
      `인생 방향: ${chart.summary.direction} · 결정 기준: ${chart.summary.decisionRule}`,
    ],
    fullText: ensureMinLength(fullText, 4200, "마스터플랜 노트", [
      "마스터플랜 노트: 대한이 바뀌는 해에는 이전 구간의 성과를 정리하고 새 구간의 중심 궁을 다시 확인하세요.",
      "마스터플랜 노트: 화기가 지나가는 궁의 과제를 문서화해 두면 다음 해에 같은 문제가 반복되는 것을 막을 수 있습니다.",
      "마스터플랜 노트: 90일 로드맵은 한 번으로 끝내지 말고, 대한이 바뀔 때마다 다시 세우는 습관을 들이면 좋습니다.",
    ]),
    highlights: ["사화", "대한", "유년", "마스터플랜", "성공 공식", chart.summary.direction].slice(0, 8),
    strengths: ["사화를 기회/과제로 분리해 해석", "대한·유년을 실행전략으로 번역", "90일 로드맵으로 행동 고정"],
    cautions: ["화기를 흉으로만 단정하지 않기", "시기 해석을 예언으로 오해하지 않기", "강점 확장과 리스크 관리의 균형 유지"],
    remedies: ["월간 사화 체크", "분기 대한 리셋", "주간 실행 로그"],
    actionItems: ["이번 달 화기 과제 1개를 문서화", "다음 대한 대비 역량 1개 선행 확보", "90일 테이블에 본인 일정 매핑"],
    routine7Days: ["사화 작동궁 점검", "핵심 리스크 1개 완충", "결정 로그 기록"],
    routine30Days: ["대한 흐름 리뷰", "수익/관계/건강 3축 재정렬", "분기 목표 재설정"],
  };
}

export function generateZiweiDeepChapter(chart: ZiweiDeepChart, sectionId: ZiweiSectionId): ZiweiDeepChapter {
  if (sectionId === "overview") return buildOverview(chart);
  if (sectionId === "master") return buildMaster(chart);

  const palace = palaceById(chart, sectionId);
  if (!palace) {
    return {
      sectionId,
      title: ZIWEI_DEEP_CHAPTER_TEXT_TRANSLATIONS.ko.preparingTitle,
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

  const palaceReading = buildZiweiDeepPalaceReading(chart, palace);
  const fullText = sanitizeZiweiDeepText(buildZiweiDeepCounselingText(chart, palace, palaceReading));

  const chapter: ZiweiDeepChapter = {
    sectionId,
    palaceId: palace.id,
    title: `${ZIWEI_PALACE_NAME[palace.id]} 심화 분석`,
    subtitle: `${palaceReading.palaceName} · 지지 ${palace.earthlyBranch}`,
    summary: [
      palaceReading.summary,
      `핵심 별 흐름: ${palaceReading.mainStars.length ? palaceReading.mainStars.map((star) => `${star.name}${star.strengthSymbol || star.symbol || ""}`).join(", ") : "연결된 궁의 영향 중심"}`,
      `보조성/잡성: ${palaceReading.supportStars.length ? palaceReading.supportStars.map((star) => `${star.name}${star.strengthSymbol || star.symbol || ""}`).join(", ") : "직접 보조성 약함"} / ${palaceReading.minorStars.length ? palaceReading.minorStars.map((star) => `${star.name}${star.strengthSymbol || star.symbol || ""}`).join(", ") : "잡성 영향 경미"}`,
      `변화 신호: ${palaceReading.transformations.length ? palaceReading.transformations.map((item) => `${item.type} ${item.starName}`).join(", ") : "직접 변화 신호는 약하고 연결 흐름 중심"}`,
    ],
    fullText,
    highlights: [
      ...palace.keywords,
      ...(palace.fourTransformations || []).map((item) => `${transformationTypeToLabel(item.type)} ${item.starName}`),
    ].slice(0, 8),
    strengths: [
      palaceReading.brightnessSummary,
      palaceReading.categories[0]?.interpretation.split(/\n+/).slice(0, 1).join(" ") || "핵심 상담 신호 정리",
      palaceReading.sanFangSiZheng?.summary || "연결 흐름 확인",
    ],
    cautions: palaceReading.categories.slice(0, 3).map((category) => category.caution),
    remedies: [...ZIWEI_PALACE_TEMPLATES[palace.id].remedies, ...palaceReading.practicalAdvice].slice(0, 6),
    actionItems: palaceReading.categories.slice(0, 4).map((category) => category.action),
    routine7Days: ["5분 기준 기록", "결정 24시간 재검토", "회복 루틴 점검"],
    routine30Days: ["궁별 성과 리뷰", "리스크 패턴 정리", "다음 달 전략 재설계"],
    palaceReading,
  };

  const validation = validateZiweiDeepReading(chapter);
  if (!validation.valid) {
    chapter.fullText = sanitizeZiweiDeepText(
      buildZiweiDeepCounselingText(chart, palace, palaceReading, true),
    );
  }
  return chapter;
}
