import { buildQuestionReading, palaceVoice, type ConsultationTopic } from "./ziwei-consultation-narrative";
import {
  ZIWEI_PALACE_NAME,
  ZiweiDeepChapter,
  ZiweiDeepChart,
  ZiweiPalace,
  ZiweiSectionId,
  ZiweiStarMeta,
} from "./ziwei-types";
import { SIHUA_INTERPRETATIONS } from "./ziwei-star-interpretations";
import { ZIWEI_PALACE_TEMPLATES } from "./ziwei-deep-templates";
import { transformationTypeToLabel } from "./ziwei-advanced-normalization";
import {
  buildZiweiDeepCounselingText,
  buildZiweiDeepPalaceReading,
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

function buildOverview(chart: ZiweiDeepChart): ZiweiDeepChapter {
  const topics: ConsultationTopic[] = ['life','career','wealth','love','relationships','family','health','timing'];
  const readings = topics.map(id => buildQuestionReading(chart,id));
  return {
    sectionId: 'overview', title: '내 삶에는 어떤 패턴이 흐를까요?',
    summary: [readings[0].conclusion],
    fullText: readings.map(reading => [
      '## ' + reading.question, reading.conclusion, ...reading.scenes,
      ...reading.actions, '### 명반에서 함께 읽은 자리', ...reading.evidence.flatMap(row => row.lines),
    ].join('\n\n')).join('\n\n'),
    highlights: chart.summary.keywords, strengths: chart.summary.strengths, cautions: chart.summary.weaknesses,
    remedies: readings[0].actions, actionItems: readings[1].actions,
    routine7Days: ['일주일 동안 마음이 편했던 선택과 지쳤던 선택을 하나씩 적어보세요.'],
    routine30Days: ['한 달 뒤에도 유지하고 싶은 습관 하나만 남겨보세요.'],
  };
}

function buildMaster(chart: ZiweiDeepChart): ZiweiDeepChapter {
  const reading = buildQuestionReading(chart,'timing');
  const periods = chart.majorPeriods.map(period => {
    const palace = palaceById(chart,period.palaceId);
    return palace ? [
      '## ' + period.range + ' · ' + palace.name, palaceVoice(palace).scene, palaceVoice(palace).action,
      '근거 · ' + (palace.mainStars.length ? groupBadge(palace.mainStars) : '맞은편 궁의 별을 함께 읽는 자리'),
    ].join('\n\n') : '';
  });
  return {
    sectionId:'master', title:'앞으로 어떤 방향으로 움직이면 좋을까요?', summary:[reading.conclusion],
    fullText: [reading.scenes[1], ...reading.actions, '## 나이 구간마다 돌아볼 주제', ...periods, '## 기회와 책임이 머무는 자리', buildSihuaAnalysis(chart)].join('\n\n'),
    highlights: chart.summary.keywords, strengths:[reading.scenes[0]], cautions:['대한은 명반에 표시된 나이 구간입니다. 특정 연도의 사건이나 성패를 뜻하지 않습니다.'],
    remedies:reading.actions, actionItems:reading.actions,
    routine7Days:['새로 시도할 일 하나를 작게 시작하고, 들인 시간과 느낌을 기록해보세요.'],
    routine30Days:['한 달 뒤 계속할 일과 줄일 일을 정하고 다음 점검일을 달력에 남겨보세요.'],
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
      fullText: "선택한 궁의 상담을 열지 못했습니다. 다른 궁을 선택하거나 출생정보를 확인한 뒤 다시 시작해주세요.",
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
    title: `${ZIWEI_PALACE_NAME[palace.id]}에서 읽는 나의 모습`,
    subtitle: `${palaceReading.palaceName} · 지지 ${palace.earthlyBranch}`,
    summary: [palaceReading.summary],
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
    routine7Days: [palaceVoice(palace).action],
    routine30Days: ["한 달 동안 가장 자주 반복된 장면 하나를 골라, 다음에는 다르게 해볼 행동을 적어보세요."],
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
