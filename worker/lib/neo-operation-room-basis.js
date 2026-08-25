// 네오 작전실의 계산 요약을 프롬프트용 [계산 확정값] 표로 바꾼다.
//
// 🔴 왜 있는가: 예전에는 methodSummary 객체를 JSON.stringify 로 통째로 프롬프트에 실었다.
//    거기에 "[계산 요약 데이터]에 실제로 있는 항목명을 데이터에 적힌 이름 그대로 인용한다"는
//    지시가 붙어 있어서, 모델이 시키는 대로 camelCase 키를 상담문에 그대로 인용했다
//    ("sanFangSiZheng.lifePalace.mainStars 에서 확인된다"). 지시가 잘못된 게 아니라
//    가리키는 대상이 잘못돼 있었다 — 다른 기능들은 같은 문장을 한글 라벨 표에 붙여 쓴다
//    (worker/lib/fortune-reasoning-contract.js:67-71 주석이 네오를 콕 집어 언급한다).
//
// 🔴 핵심 설계: **키 이름은 프롬프트에 넣지 않는다.** 사람이 읽을 라벨은 어댑터가 직접 붙이고,
//    어댑터가 모르는 중첩 구조는 `valuesOf` 가 **값만** 뽑아 잇는다. 라벨 표를 술수 4종 ×
//    수십 키로 유지하는 방식은 필드가 늘 때마다 조용히 새는 쪽으로 실패하지만, 값만 흘리는
//    방식은 새로운 필드가 들어와도 키가 샐 수 없다.
//
// groups 의 key 는 챕터별 데이터 슬라이싱(중복 방지)에도 쓰인다 — 각 챕터는 자기가 볼
// 그룹만 받으므로, 14개 챕터가 같은 12궁 표를 각자 다시 푸는 일이 구조적으로 불가능해진다.

import { basisGroup, basisItem } from "./analysis-basis-contract.js";

/** 챕터가 `basisGroups` 로 선언할 수 있는 그룹 키. 술수 4종이 같은 어휘를 쓴다. */
export const NEO_BASIS_GROUP_KEYS = Object.freeze(["core", "strength", "topic", "timing", "compat"]);

const GROUP_TITLES = Object.freeze({
  core: "중심 지표",
  strength: "강약 분포",
  topic: "자리별 판독",
  timing: "시기 흐름",
  compat: "두 사람 교차",
});

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isBlank(value) {
  return value === null || value === undefined || value === "";
}

/**
 * 객체/배열에서 **값만** 뽑아 사람이 읽을 문자열로 잇는다. 키 이름은 버린다.
 * 불리언은 값이 아니라 플래그라 버리고, 중첩은 2단까지만 본다(요약이지 덤프가 아니다).
 */
function valuesOf(value, depth = 0) {
  if (isBlank(value) || typeof value === "boolean") return "";
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (depth >= 2) return "";
  if (Array.isArray(value)) {
    return value.map((item) => valuesOf(item, depth + 1)).filter(Boolean).join(" · ");
  }
  if (typeof value === "object") {
    return Object.values(value).map((item) => valuesOf(item, depth + 1)).filter(Boolean).join(" ");
  }
  return "";
}

/** label 과 value 를 받아 basisItem 을 만들되, 값이 비면 항목 자체를 버린다. */
function item(label, value) {
  const text = typeof value === "string" || typeof value === "number" ? String(value).trim() : valuesOf(value);
  return text ? basisItem(label, text) : null;
}

function group(key, items) {
  const kept = items.filter(Boolean);
  return kept.length ? basisGroup(key, GROUP_TITLES[key] || key, kept) : null;
}

// ─── 사주 ──────────────────────────────────────────────────────────────────
function sajuGroups(summary) {
  const pillars = summary.pillars || {};
  const majorLuck = summary.majorLuck || {};
  const current = majorLuck.currentCycle || null;
  const yearly = asArray(summary.yearlyLuck);
  return [
    group("core", [
      item("사주 네 기둥", [pillars.year, pillars.month, pillars.day, pillars.hour].filter(Boolean).join(" / ")),
      item("일간", pillars.dayMaster),
      item("신강약", summary.strength),
      item("용신", summary.usefulGod),
      item("기신", summary.unfavorableGod),
    ]),
    group("strength", [
      item("오행 분포", summary.fiveElements),
      item("십성 분포", summary.tenGods),
      item("조후", summary.seasonalBalance),
      item("원국 합충", summary.natalInteractions),
    ]),
    group("topic", [
      item("가장 강한 십성", asArray(summary.strongestTenGods).map((entry) => valuesOf(entry)).filter(Boolean).join(" · ")),
    ]),
    group("timing", [
      item("현재 대운", current ? `${current.pillar || ""} (${current.startAge ?? "?"}-${current.endAge ?? "?"}세)`.trim() : ""),
      item("대운 방향", majorLuck.direction),
      item("대운 흐름", asArray(majorLuck.cycles).map((cycle) => `${cycle?.pillar || ""}(${cycle?.startAge ?? "?"}세~)`).filter((line) => line.length > 4).join(" · ")),
      item("올해 세운", yearly[0] ? `${yearly[0].year || ""}년 ${yearly[0].pillar || ""}${yearly[0].stemTenGod ? ` (${yearly[0].stemTenGod})` : ""}`.trim() : ""),
      item("다가오는 세운", yearly.slice(1).map((entry) => `${entry?.year || ""}년 ${entry?.pillar || ""}`.trim()).filter(Boolean).join(" · ")),
    ]),
  ];
}

// ─── 자미두수 ──────────────────────────────────────────────────────────────
const ZIWEI_TRANSFORMATION_LABELS = Object.freeze({ huaLu: "화록", huaQuan: "화권", huaKe: "화과", huaJi: "화기" });

function ziweiPalaceLine(palace) {
  const stars = [...asArray(palace?.mainStars), ...asArray(palace?.assistantStars), ...asArray(palace?.maleficStars)]
    .filter(Boolean)
    .join(" · ");
  return stars ? `${palace?.name || ""}: ${stars}`.trim() : "";
}

function sanFangLine(node) {
  if (!node || typeof node !== "object") return valuesOf(node);
  return [
    node.self ? `본궁 ${node.self}` : "",
    asArray(node.palaceNames).length ? `삼합 ${asArray(node.palaceNames).join(" · ")}` : "",
    asArray(node.mainStars).length ? `주성 ${asArray(node.mainStars).join(" · ")}` : "",
    asArray(node.transformations).length ? `사화 ${asArray(node.transformations).join(" · ")}` : "",
    node.opposite ? `대궁 ${node.opposite}` : "",
  ].filter(Boolean).join(", ");
}

function ziweiGroups(summary) {
  const palaces = asArray(summary.palaces);
  const lifePalace = palaces.find((palace) => palace?.name && palace.name === summary.mingGong) || null;
  const sihua = summary.fourTransformations || {};
  const sanFang = summary.sanFangSiZheng || {};
  const yearly = summary.yearlyLuck || null;
  return [
    group("core", [
      item("명궁", lifePalace ? ziweiPalaceLine(lifePalace) || summary.mingGong : summary.mingGong),
      item("신궁", summary.shenGong),
      item("생년 사화", Object.entries(ZIWEI_TRANSFORMATION_LABELS)
        .map(([key, label]) => (sihua[key] ? `${label} ${sihua[key]}` : ""))
        .filter(Boolean)
        .join(" · ")),
    ]),
    group("strength", [
      item("핵심 별", asArray(summary.keyStars).map((star) => valuesOf(star)).filter(Boolean).join(" · ")),
      item("가장 강한 궁", asArray(summary.strongestPalaces).map((palace) => valuesOf(palace)).filter(Boolean).join(" · ")),
    ]),
    group("topic", [
      item("12궁 주성", palaces.map(ziweiPalaceLine).filter(Boolean).join(" / ")),
      // 🔴 여기가 "sanFangSiZheng.lifePalace.mainStars" 가 새어 나오던 지점이다.
      //    valuesOf 로 뭉개면 어느 값이 대궁이고 어느 값이 주성인지 알 수 없어져 근거가 못 되므로
      //    이 구조만은 라벨을 직접 붙인다.
      item("삼방사정(명궁)", sanFangLine(sanFang.lifePalace)),
      item("삼방사정 축", sanFang.core),
    ]),
    group("timing", [
      item("대한 흐름", asArray(summary.majorLuck).map((cycle) => valuesOf(cycle)).filter(Boolean).join(" · ")),
      item("올해 유년", yearly ? `${yearly.year || ""}년 ${yearly.palaceName || yearly.earthlyBranch || ""}${asArray(yearly.mainStars).length ? ` (${asArray(yearly.mainStars).join(" · ")})` : ""}`.trim() : ""),
    ]),
    // 궁합 모드에서만. 1인 모드는 compat 이 없어 group() 이 null 을 돌려주고 그룹째 사라진다.
    ziweiCompatGroup(summary.compat),
  ];
}

/**
 * 두 사람 교차 확정값.
 * 🔴 낙궁·교차는 sanFangLine 과 같은 이유로 `valuesOf` 로 뭉개지 않는다 — "무엇이 어디에
 *    떨어졌는가"가 사라지면 근거가 못 되고, 모델이 방향을 뒤집어 쓴다.
 */
function ziweiCompatGroup(compat) {
  if (!compat || typeof compat !== "object") return null;
  const digest = compat.partnerDigest || {};
  const scores = compat.scores || {};
  return group("compat", [
    item("상대 성별", compat.partnerGenderLabel),
    item("상대 명궁", [digest.mingGong, digest.mingGongStars].filter(Boolean).join(" — ")),
    item("상대 신궁", digest.shenGong),
    item("상대 부부궁", digest.spousePalaceStars),
    item("상대 복덕궁", digest.fortunePalaceStars),
    item("상대 생년 사화", digest.fourTransformations),
    item("상대 국수", digest.bureau),
    // 교차 판독은 항목마다 한 칸씩 — 한 칸에 합치면 basisItem 의 300자 상한에 뒤쪽이 잘린다.
    ...asArray(compat.highlights).map((entry) => item(entry?.label, entry?.value)),
    item("관계 지표", [
      Number.isFinite(scores.overall) ? `종합 ${scores.overall}` : "",
      Number.isFinite(scores.resonance) ? `공명 ${scores.resonance}` : "",
      Number.isFinite(scores.friction) ? `갈등 위험 ${scores.friction}` : "",
      Number.isFinite(scores.growth) ? `함께 크는 힘 ${scores.growth}` : "",
    ].filter(Boolean).join(" · ")),
    item("관계 상태", compat.relationshipStatusLabel),
    item("상대 출생시간", compat.uncertainty?.partnerBirthTimeUnknown ? "미상(정오 기준으로 계산됨)" : ""),
  ]);
}

// ─── 베다점 ────────────────────────────────────────────────────────────────
function vedicGroups(summary) {
  const dasha = summary.dasha || {};
  return [
    group("core", [
      item("라그나", summary.lagna),
      item("달", summary.moon),
      item("태양", summary.sun),
    ]),
    group("strength", [
      item("행성 배치", asArray(summary.planets).map((planet) => valuesOf(planet)).filter(Boolean).join(" / ")),
      item("요가", asArray(summary.yogas).map((yoga) => valuesOf(yoga)).filter(Boolean).join(" · ")),
    ]),
    group("topic", [
      item("하우스", asArray(summary.houses).map((house) => valuesOf(house)).filter(Boolean).join(" / ")),
    ]),
    group("timing", [
      item("현재 마하다샤", dasha.currentMahadasha),
      item("현재 안타르다샤", dasha.currentAntardasha),
      item("다가오는 다샤", asArray(dasha.upcoming).map((period) => valuesOf(period)).filter(Boolean).join(" · ")),
      item("고차라", summary.transits),
    ]),
  ];
}

// ─── 점성술 ────────────────────────────────────────────────────────────────
function astrologyGroups(summary) {
  return [
    group("core", [
      item("태양", summary.sun),
      item("달", summary.moon),
      item("상승", summary.ascendant),
    ]),
    group("strength", [
      item("행성 사인", asArray(summary.planets).map((planet) => valuesOf(planet)).filter(Boolean).join(" / ")),
    ]),
    group("topic", [
      item("하우스", asArray(summary.houses).map((house) => valuesOf(house)).filter(Boolean).join(" / ")),
      item("주요 애스펙트", asArray(summary.aspects).map((aspect) => valuesOf(aspect)).filter(Boolean).join(" · ")),
    ]),
    group("timing", [
      item("시기 신호", summary.timingInsights),
    ]),
  ];
}

const ADAPTERS = Object.freeze({
  saju: sajuGroups,
  ziwei: ziweiGroups,
  vedic: vedicGroups,
  astrology: astrologyGroups,
});

/**
 * methodSummary → { groups } (analysis-basis-contract 형태).
 * 알 수 없는 술수면 빈 groups 를 돌려준다(호출부가 evidenceSummary 로 폴백).
 * @param {Record<string, unknown>} methodSummary
 * @returns {{ groups: unknown[] }}
 */
export function buildNeoBasisPayload(methodSummary) {
  const summary = methodSummary && typeof methodSummary === "object" ? methodSummary : {};
  const adapter = ADAPTERS[String(summary.method || "")];
  return { groups: adapter ? adapter(summary).filter(Boolean) : [] };
}

/**
 * 챕터가 볼 그룹만 남긴다. 이게 챕터 간 중복 서술을 막는 본체다 —
 * 시기 표를 못 본 챕터는 대운을 다시 풀 수 없다.
 * @param {{ groups?: unknown[] }} payload
 * @param {readonly string[]|"*"} allowed 챕터의 basisGroups 선언
 */
export function sliceNeoBasisPayload(payload, allowed) {
  const groups = asArray(payload?.groups);
  if (allowed === "*") return { groups };
  const keys = new Set(asArray(allowed));
  return { groups: groups.filter((entry) => keys.has(entry?.key)) };
}

/**
 * 프롬프트에 실린 표가 원본 계산값을 얼마나 담고 있는지 검사한다(가드 전용).
 * 라벨 표로 바꾸면서 데이터가 조용히 사라지면 20,000자 상담의 근거가 얕아지므로,
 * 스칼라 리프 값이 표 안에 남아 있는지 비율로 본다.
 * @returns {{ total: number, covered: number, missing: string[] }}
 */
export function measureNeoBasisCoverage(methodSummary, payload) {
  const rendered = asArray(payload?.groups)
    .flatMap((entry) => asArray(entry?.items).map((basis) => `${basis?.label} ${basis?.value}`))
    .join("\n");
  const leaves = [];
  const collect = (value, depth = 0) => {
    if (depth > 5) return;
    if (typeof value === "string" || typeof value === "number") {
      const text = String(value).trim();
      // 2자 미만은 지지 한 글자 등 노이즈, evidenceTokens/calculationMeta 는 표의 대상이 아니다.
      if (text.length >= 2) leaves.push(text);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry) => collect(entry, depth + 1));
      return;
    }
    if (value && typeof value === "object") {
      for (const [key, entry] of Object.entries(value)) {
        if (key === "evidenceTokens" || key === "calculationMeta" || key === "evidenceSummary" || key === "summary" || key === "method") continue;
        collect(entry, depth + 1);
      }
    }
  };
  collect(methodSummary);
  const missing = [...new Set(leaves)].filter((leaf) => !rendered.includes(leaf));
  const total = new Set(leaves).size;
  return { total, covered: total - missing.length, missing };
}
