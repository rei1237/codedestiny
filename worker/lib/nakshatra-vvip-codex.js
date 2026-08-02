// 나크샤트라 결정판 VVIP 통합서 (₩50,000) — 결정론 조립 엔진.
//
// 흩어져 있던 것을 한 권으로 묶는 상품이다. LLM 을 쓰지 않는다 — 소장본(PDF)이 전제라
// 같은 명식이면 언제나 같은 책이 나와야 하고, 재료가 전부 이미 저작된 표와 결정론 엔진이다.
//
// 담는 것:
//   1) 명식 총람 — 숙요 · 나크샤트라 · 지배성 · 파다 · 기질 삼축 · 현재 다샤
//   2) 세 대가의 목소리 — 숙요 대가(EASTERN_EXPERT) · 베다 대가(INDIAN_EXPERT) · 통합(FUSION_DEEP)
//   3) 27수 전체 지형에서의 내 자리 — 27개 전 좌표와 나의 격각 관계
//   4) 지배성 심화 리포트 전문(₩10,000 상품 그대로)
//   5) 다샤 인생지도 전문(₩15,000 상품 그대로)
//
// 🔴 4·5 는 각 엔진을 그대로 호출한다. 여기서 축약본을 따로 쓰면 두 벌이 되어 한쪽만
//    고쳐지는 사고가 난다(같은 이유로 27수 지형도 sukuyo-relation-core 의 격각을 그대로 쓴다).

import { relationFromForwardDistance, SUKUYO_ROLE_PROFILES } from "./sukuyo-relation-core.js";
import { getSukuyoByIndex } from "./sukuyo-premium.js";
import { buildDongyangView, buildIndiaView, buildUnifiedView } from "./nakshatra-codex.js";
import { getNakshatraAttributes, getPadaDetail } from "../../constants/nakshatra-attributes.js";
import { GRAHA_KO } from "./vedic-derived-calculations.js";
import { buildNakshatraLordReport } from "./nakshatra-lord-report.js";
import { buildNakshatraDashaMap } from "./nakshatra-dasha-map.js";

// 격각 자리별 한 줄 — 27수 지형표의 각 행에 붙는다.
const ROLE_GIST = Object.freeze({
  명: "나와 같은 자리. 거울처럼 닮아 편하지만, 서로의 약점까지 같아 보완이 되지 않습니다.",
  영: "나를 키워 주는 자리. 이쪽이 베풀면 저쪽이 자랍니다.",
  친: "나를 따르는 자리. 받는 쪽이라 고마움을 표현해야 오래 갑니다.",
  안: "서로 편안한 자리. 큰 파도 없이 길게 가는 관계입니다.",
  우: "벗의 자리. 대등하게 주고받아 협업이 잘 붙습니다.",
  쇠: "기운이 새는 자리. 나쁜 사람이 아니라 함께 있으면 소모되는 조합입니다.",
  성: "일을 이루게 하는 자리. 성과가 필요한 국면에서 가장 잘 맞습니다.",
  괴: "결이 어긋나는 자리. 같은 말을 서로 다르게 알아듣습니다.",
  위: "긴장이 도는 자리. 거리를 두면 오히려 서로를 존중하게 됩니다.",
  업: "묵은 과제를 데려오는 자리. 피하기보다 정면으로 다루어야 넘어갑니다.",
  태: "내가 짐을 지는 자리. 선을 긋지 않으면 오래 버티지 못합니다.",
});

const CHAPTER_ORDER = ["natal", "masters", "terrain", "lord", "dasha"];

// 🔴 숙요 객체의 index 는 buildSukuyoFromLunar 가 붙여 주는 파생 필드다 —
//    SUKUYO_MANSIONS 원소 자체에는 없다. 인덱스가 없으면 격각 거리가 NaN 이 되어
//    27수 지형표가 "조용히 빈 표"로 나가므로, 여기서 이름으로 되찾고 그래도 없으면 실패시킨다.
function resolveMansionIndex(sukuyo) {
  if (Number.isInteger(sukuyo?.index)) return sukuyo.index;
  const nameKo = String(sukuyo?.nameKo || "");
  for (let index = 0; index < 27; index += 1) {
    if (getSukuyoByIndex(index)?.nameKo === nameKo) return index;
  }
  return null;
}

function buildTerrain(myMansionIndex) {
  const rows = [];
  for (let index = 0; index < 27; index += 1) {
    const forward = (index - myMansionIndex + 27) % 27;
    const relation = relationFromForwardDistance(forward);
    const suk = getSukuyoByIndex(index);
    if (!relation || !suk) continue;
    const role = relation.bRole;
    const profile = SUKUYO_ROLE_PROFILES[role] || { han: "" };
    rows.push({
      index,
      nameKo: suk.nameKo,
      nameHan: suk.nameHan,
      isSelf: index === myMansionIndex,
      relationType: relation.relationType,
      relationTypeHan: relation.relationTypeHan,
      role,
      roleHan: profile.han,
      gist: ROLE_GIST[role] || "",
      forward,
    });
  }
  return rows;
}

function paragraphsOf(chapter) {
  return chapter.sections
    ? chapter.sections.flatMap((section) => section.paragraphs || [])
    : chapter.paragraphs || [];
}

function buildNatalChapter(dongyang, india, unified, attrs, padaDetail, dasha) {
  const lines = [];
  lines.push(
    `당신의 자리는 동양의 ${dongyang.nameKo}(${dongyang.nameHan})이고, 인도의 ${india.nameKo}(${india.nameEn})입니다.`
    + ` 두 전통이 같은 밤하늘을 나눠 부른 이름이며, 이 책은 그 두 이름을 한자리에 놓고 읽습니다.`,
  );
  lines.push(
    `동양 쪽 좌표 — 방위는 ${dongyang.direction}, 사신은 ${dongyang.fourSymbol}, 칠요 배속은 ${dongyang.sevenLuminary}입니다.`
    + ` 원형은 "${dongyang.archetypeTitle}"이고, 결을 이루는 낱말은 ${(dongyang.keywords || []).join(" · ")}입니다.`,
  );
  lines.push(
    `인도 쪽 좌표 — 지배성은 ${india.lordKo}, 상징은 ${attrs.symbol}, 고유한 힘은 "${attrs.shakti}"입니다.`
    + ` 주신 ${attrs.deity}가 이 자리를 주관하며 ${attrs.deityRole}로 읽습니다.`
    + ` 기질의 삼축은 ${attrs.ganaKo} · ${attrs.nadiKo} · ${attrs.yoni} 요니이고, 삶의 동기축은 ${attrs.motiveKo}입니다.`,
  );
  lines.push(
    padaDetail
      ? `파다는 ${padaDetail.pada}번째 — 나바암샤 ${padaDetail.navamsaSignKo}, 그 방의 주인은 ${GRAHA_KO[padaDetail.navamsaLord] || padaDetail.navamsaLord}입니다. 겉으로 드러나는 결과 안쪽의 결이 여기서 갈립니다.`
      : `출생 시각이 없어 파다는 산출하지 않았습니다. 파다는 달의 위치를 3°20′ 단위로 다시 쪼개 정하므로 몇 분 차이로 방이 바뀝니다 — 근거 없이 고르면 이 책에서 가장 개인적인 대목이 가장 부정확해지기 때문입니다.`,
  );
  if (dasha?.currentMahadasha) {
    lines.push(
      `지금 지나는 대주기는 ${GRAHA_KO[dasha.currentMahadasha] || dasha.currentMahadasha}입니다`
      + `${dasha.current?.startDate ? `(${dasha.current.startDate} ~ ${dasha.current.endDate})` : ""}.`
      + ` 뒤쪽 '다샤 인생지도' 장에서 120년 전체를 펼쳐 봅니다.`,
    );
  }
  if (unified?.fusionTitle) {
    lines.push(`두 이름을 합쳐 부르면 "${unified.fusionTitle}"입니다. ${unified.fusionReading || ""}`.trim());
  }
  if (unified?.boundaryNote) lines.push(unified.boundaryNote);

  return {
    id: "natal",
    title: "제1장 · 명식 총람",
    icon: "◎",
    keyInsight: `${dongyang.nameKo}(${dongyang.nameHan}) · ${india.nameKo} · 지배성 ${india.lordKo}`,
    paragraphs: lines,
  };
}

function buildMastersChapter(dongyang, india, unified) {
  const lines = [];
  lines.push(`한 사람의 별을 세 목소리로 듣습니다. 같은 자리를 두고 각자의 언어로 말하므로, 겹치는 대목은 근거가 두터운 곳이고 갈리는 대목은 두 전통이 서로 다른 것을 보는 곳입니다.`);
  if (dongyang.easternExpert) lines.push(`[숙요 대가] ${dongyang.easternExpert}`);
  if (india.indianExpert) lines.push(`[베다 대가] ${india.indianExpert}`);
  if (unified?.convergence) lines.push(`[함께 말하는 것] ${unified.convergence}`);
  if (unified?.divergence) lines.push(`[갈라지는 것] ${unified.divergence}`);
  lines.push(`두 전통이 갈릴 때 어느 한쪽이 틀린 것이 아닙니다. 동양 숙요는 음력 날짜의 자리에서, 인도 나크샤트라는 달의 실제 황경에서 출발합니다 — 출발점이 다르니 강조하는 결도 달라집니다. 겹치는 곳부터 믿고, 갈리는 곳은 두 가능성으로 남겨 두십시오.`);

  return {
    id: "masters",
    title: "제2장 · 세 대가의 목소리",
    icon: "❈",
    keyInsight: "숙요 대가 · 베다 대가 · 두 전통을 잇는 통합 해석",
    paragraphs: lines,
  };
}

function buildTerrainChapter(terrain, mySuk) {
  const good = terrain.filter((row) => ["영", "친", "안", "우", "성"].includes(row.role)).length;
  const hard = terrain.filter((row) => ["쇠", "괴", "위", "업", "태"].includes(row.role)).length;
  return {
    id: "terrain",
    title: "제3장 · 27수 지형에서의 내 자리",
    icon: "⁂",
    keyInsight: `${mySuk.nameKo}(${mySuk.nameHan}) 기준 — 순한 자리 ${good} · 버거운 자리 ${hard}`,
    paragraphs: [
      `숙요는 스물일곱 자리가 서로 정해진 관계를 맺습니다. 두 자리 사이의 거리(격각)가 관계의 성격을 정하고, 그 관계는 사람뿐 아니라 날짜·방위·시기에도 그대로 적용됩니다.`,
      `당신의 자리 ${mySuk.nameKo}(${mySuk.nameHan})에서 나머지 스물여섯을 보면, 순하게 흐르는 자리가 ${good}개, 버거운 자리가 ${hard}개입니다. 이 배치는 평생 바뀌지 않습니다 — 그래서 한 번 익혀 두면 사람을 만날 때마다, 날짜를 고를 때마다 같은 지도를 씁니다.`,
      `주의할 것은 "버거운 자리 = 나쁜 사람"이 아니라는 점입니다. 쇠(衰)는 함께 있으면 내 기운이 새는 조합이고, 업(業)·태(胎)는 묵은 과제를 데려오는 조합입니다. 피하라는 뜻이 아니라 그 관계에서는 다른 방식으로 서야 한다는 뜻입니다.`,
      `아래 표에서 상대의 본명수를 찾으면 그 사람과 나의 자리가 바로 나옵니다. 날짜를 고를 때도 같습니다 — 그날의 수가 표에서 어디에 있는지를 보면 됩니다.`,
    ],
    terrain,
  };
}

function countChars(chapters) {
  let total = 0;
  for (const chapter of chapters) {
    total += String(chapter.title || "").length + String(chapter.keyInsight || "").length;
    for (const paragraph of paragraphsOf(chapter)) total += String(paragraph || "").length;
    for (const row of chapter.terrain || []) total += String(row.gist || "").length;
    for (const section of chapter.sections || []) {
      total += String(section.title || "").length + String(section.keyInsight || "").length;
      for (const bullet of section.bullets || []) total += String(bullet.text || "").length;
    }
    for (const period of chapter.periods || []) {
      total += String(period.opens || "").length + String(period.demands || "").length + String(period.caution || "").length;
    }
  }
  return total;
}

/**
 * VVIP 통합서 조립.
 *
 * @param {{ nak:object, sukuyo:object, pada:(number|null), dasha:object, majorLuck:(object|null),
 *           birthUtc:Date, now:Date, timeUnknown:boolean }} input
 * @returns {object|null}
 */
export function buildNakshatraVvipCodex({ nak, sukuyo, pada = null, dasha, majorLuck = null, birthUtc, now = new Date(), timeUnknown = false }) {
  const attrs = getNakshatraAttributes(nak?.index);
  if (!attrs || !sukuyo) return null;
  const mansionIndex = resolveMansionIndex(sukuyo);
  if (mansionIndex == null) return null;

  const padaDetail = timeUnknown ? null : getPadaDetail(attrs.index, pada);
  const dongyang = buildDongyangView(sukuyo);
  const india = buildIndiaView(nak, attrs, timeUnknown ? null : pada, dasha ? {
    currentMahadasha: dasha.currentMahadasha,
    currentMahadashaKo: GRAHA_KO[dasha.currentMahadasha] || dasha.currentMahadasha,
    currentAntardasha: dasha.currentAntardasha,
    currentAntardashaKo: GRAHA_KO[dasha.currentAntardasha] || dasha.currentAntardasha,
    current: dasha.current || null,
    birthNakshatra: dasha.birthNakshatra || "",
  } : null);
  const unified = buildUnifiedView(mansionIndex, attrs.index);
  if (!dongyang || !india) return null;

  // 🔴 두 유료 리포트는 각 엔진을 그대로 호출한다 — 축약본을 따로 쓰면 두 벌이 된다.
  const lordReport = buildNakshatraLordReport({ nakIndex: attrs.index, pada, dasha, timeUnknown });
  const dashaMap = buildNakshatraDashaMap({ dasha, majorLuck, nakIndex: attrs.index, birthUtc, now });

  const chapters = [
    buildNatalChapter(dongyang, india, unified, attrs, padaDetail, dasha),
    buildMastersChapter(dongyang, india, unified),
    buildTerrainChapter(buildTerrain(mansionIndex), sukuyo),
    lordReport && {
      id: "lord",
      title: "제4장 · 지배성 심화 리포트",
      icon: "☉",
      keyInsight: lordReport.headline,
      sections: lordReport.sections,
    },
    dashaMap && {
      id: "dasha",
      title: "제5장 · 다샤 인생지도",
      icon: "◷",
      keyInsight: dashaMap.current
        ? `지금은 ${dashaMap.current.mahadashaLordKo} 대주기 · 안타르 ${dashaMap.current.antardashaLordKo}`
        : `비쇼타리 120년 · 마하 ${dashaMap.meta.periodCount}구간`,
      sections: dashaMap.sections,
      current: dashaMap.current,
      periods: dashaMap.periods,
    },
  ].filter(Boolean);

  // 목차 순서는 CHAPTER_ORDER 로 고정한다(소장본이라 판본마다 순서가 흔들리면 안 된다).
  chapters.sort((a, b) => CHAPTER_ORDER.indexOf(a.id) - CHAPTER_ORDER.indexOf(b.id));

  return {
    meta: {
      sukuyoKo: dongyang.nameKo,
      sukuyoHan: dongyang.nameHan,
      nakshatraKo: india.nameKo,
      nakshatraEn: india.nameEn,
      lordKo: india.lordKo,
      fusionTitle: unified?.fusionTitle || "",
      pada: padaDetail ? padaDetail.pada : null,
      timeUnknown: Boolean(timeUnknown),
      chapterCount: chapters.length,
      easternAvailable: dashaMap ? dashaMap.meta.easternAvailable : false,
      includesLordReport: Boolean(lordReport),
      includesDashaMap: Boolean(dashaMap),
    },
    toc: chapters.map((chapter) => ({ id: chapter.id, title: chapter.title, icon: chapter.icon })),
    chapters,
    charCount: countChars(chapters),
  };
}

export const __nakshatraVvipTestUtils = { ROLE_GIST, CHAPTER_ORDER, buildTerrain };
