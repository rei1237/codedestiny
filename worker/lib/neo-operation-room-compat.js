// 네오 작전실 궁합 모드 — 두 사람의 자미두수 명반을 교차한 계산 확정값을 만든다.
//
// 🔴 계산은 여기서 하지 않는다. 명반 교차 자체는 master-love-codex-compat.js 의
//    buildZiweiLoveCompatibility 가 전부 하고(마스터 인연의 서와 같은 엔진), 이 파일은
//    그 결과를 네오의 프롬프트/응답이 쓰는 모양으로 **추리기만** 한다. 새 궁합 규칙을
//    여기에 쓰기 시작하면 두 기능의 판정이 조용히 갈라진다.
//
// 🔴 점수는 엔진이 실제로 내는 축(resonance/friction/growth)만 노출한다. 재정·관록·천이
//    궁합 같은 축은 엔진에 공식이 없으므로 숫자를 만들지 않고 `highlights` 에 사실만 남긴다.

import { buildZiweiLoveCompatibility } from "./master-love-codex-compat.js";

/**
 * 궁합을 여는 주제 키. 클라이언트의 NEO_COMPAT_TOPIC("연애 / 재회") 이 여기로 정규화된다.
 *
 * 🔴 궁합을 여는 조건이라 프롬프트 모듈이 아니라 여기에 둔다. 프롬프트 모듈은 라우트 테스트가
 *    통째로 mock 하므로, 게이트를 거기 두면 mock 이 게이트를 지워 가드가 조용히 죽는다.
 */
export const NEO_COMPAT_TOPIC_KEY = "연애/재회";

/**
 * 자유 문자열로 오는 상담 주제를 정본 키로 정규화한다. 클라이언트가 보내는 값은 topicOptions 의
 * 한국어 원문이지만(로케일 라벨은 표시용일 뿐이다), 공백 표기가 흔들려도 흡수하도록 압축해서 본다.
 */
export function normalizeTopicKey(topic) {
  const compact = clean(topic).replace(/\s+/g, "");
  if (/연애|재회/.test(compact)) return NEO_COMPAT_TOPIC_KEY;
  if (/직업|이직/.test(compact)) return "직업/이직";
  if (/돈|재물/.test(compact)) return "돈/재물";
  if (/인간관계/.test(compact)) return "인간관계";
  if (/멘탈|자기관리/.test(compact)) return "멘탈/자기관리";
  if (/인생방향/.test(compact)) return "인생방향";
  if (/지금선택/.test(compact)) return "지금선택";
  if (/반복|실수/.test(compact)) return "반복실수";
  return "";
}

/** 관계 상태 — 이 집합을 벗어난 값은 빈 문자열로 떨어뜨린다. */
export const NEO_RELATIONSHIP_STATUSES = Object.freeze([
  "crush",
  "dating",
  "longterm",
  "breakup",
  "reconciling",
  "engaged",
  "married",
]);

const RELATIONSHIP_STATUS_LABELS = Object.freeze({
  crush: "썸",
  dating: "연애 중",
  longterm: "장기 연애",
  breakup: "이별",
  reconciling: "재회 시도",
  engaged: "결혼 예정",
  married: "부부",
});

/** 관계 상태별로 전략 챕터가 무게를 실을 축. 프롬프트에 한글로 실린다. */
const RELATIONSHIP_STATUS_FOCUS = Object.freeze({
  crush: "아직 관계가 확정되지 않았다. 확신을 요구하지 말고, 상대가 편하게 다가올 수 있는 조건을 만드는 쪽으로 전략을 짠다.",
  dating: "관계는 성립했고 문제는 유지 방식이다. 지금 반복되는 마찰을 짚고 습관 단위로 바꿀 것을 준다.",
  longterm: "익숙함이 만든 무감각과 미뤄 둔 갈등을 다룬다. 새 자극이 아니라 미결 과제를 정리하는 쪽으로 간다.",
  breakup: "관계가 끊긴 상태다. 재결합을 전제로 몰지 말고, 지금 감정을 정리하는 것과 재회를 시도하는 것 중 무엇이 이 사람에게 맞는지부터 판단한다.",
  reconciling: "재회를 시도 중이다. 접근 금지·첫 접촉·관계 회복·재회 판단·재회 후 단계로 나눠 각 단계에서 할 것과 하지 말 것을 준다.",
  engaged: "결혼을 앞뒀다. 연애 감정이 아니라 생활·돈·역할 분담·양가 문제에서 부딪힐 지점을 먼저 짚는다.",
  married: "이미 부부다. 헤어질지 말지가 아니라 같이 사는 방식을 어떻게 고칠지로 답한다.",
});

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function clean(value, maxLength = 0) {
  const text = String(value ?? "").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}

function palaceByName(chart, name) {
  return asArray(chart?.palaces).find((palace) => clean(palace?.name) === name) || null;
}

const TRANSFORMATION_LABELS = Object.freeze({ huaLu: "화록", huaQuan: "화권", huaKe: "화과", huaJi: "화기" });

function transformationLine(chart) {
  const table = chart?.fourTransformations && typeof chart.fourTransformations === "object" ? chart.fourTransformations : {};
  return Object.entries(TRANSFORMATION_LABELS)
    .map(([key, label]) => (table[key] ? `${label} ${table[key]}` : ""))
    .filter(Boolean)
    .join(" · ");
}

function palaceStarLine(palace) {
  const stars = [...asArray(palace?.mainStars), ...asArray(palace?.assistantStars), ...asArray(palace?.maleficStars)]
    .filter(Boolean)
    .join(" · ");
  return stars || "무주성";
}

/**
 * 상대 명반에서 궁합 해석에 필요한 만큼만 추린다.
 * 🔴 상대의 12궁 전체를 싣지 않는다 — 프롬프트가 본인 명반과 상대 명반을 대등하게 받으면
 *    챕터들이 "상대의 1인 상담"을 쓰기 시작한다. 이 상담의 주인은 어디까지나 본인이다.
 */
function buildPartnerDigest(partnerChart) {
  const ming = palaceByName(partnerChart, "명궁");
  const spouse = palaceByName(partnerChart, "부부궁");
  const fortune = palaceByName(partnerChart, "복덕궁");
  // lifePalace 는 궁 **이름**이라 명궁은 늘 "명궁"이다. 의미가 있는 건 그 궁이 앉은 지지이므로
  // summarizeZiwei 의 evidenceSummary 와 같은 "명궁(해궁)" 표기를 쓴다.
  return {
    mingGong: ming?.earthlyBranch ? `명궁(${ming.earthlyBranch}궁)` : clean(partnerChart?.lifePalace, 40),
    shenGong: clean(partnerChart?.bodyPalace, 40),
    mingGongStars: ming ? palaceStarLine(ming) : "",
    spousePalaceStars: spouse ? palaceStarLine(spouse) : "",
    fortunePalaceStars: fortune ? palaceStarLine(fortune) : "",
    fourTransformations: transformationLine(partnerChart),
    bureau: clean(partnerChart?.bureau?.name, 40),
  };
}

const GENDER_LABELS = Object.freeze({ male: "남성", female: "여성" });

function round(value) {
  return Math.round(Number(value) || 0);
}

/**
 * 노출 점수. 엔진의 3축을 그대로 쓰고, 종합만 그 평균으로 낸다.
 * 🔴 friction 은 방향이 반대다(높을수록 위험). 종합에서만 뒤집고, 개별 노출에서는
 *    뒤집지 않은 원값을 주되 라벨이 "갈등 위험"임을 화면/프롬프트가 함께 밝힌다.
 */
export function buildNeoCompatScores(axisScores) {
  const resonance = round(axisScores?.resonance);
  const friction = round(axisScores?.friction);
  const growth = round(axisScores?.growth);
  return {
    overall: round((resonance + (100 - friction) + growth) / 3),
    resonance,
    friction,
    growth,
  };
}

/**
 * 점수로 만들지 않는 사실들. 전부 엔진 산출물에서 그대로 읽어 온 것이며 새 가중치가 없다.
 * 프롬프트의 [계산 확정값] 표와 화면의 근거 배지가 같은 배열을 쓴다.
 *
 * 🔴 `{ label, value }` 로 쪼개서 돌려준다 — 한 문자열로 합쳐 넘기면 analysis-basis-contract 의
 *    basisItem 이 값을 300자에서 잘라, 뒤쪽 교차 판독(특히 화기 낙궁)이 통째로 사라진다.
 */
function buildHighlights(compat) {
  const { palaceOverlay, spouseCross, maleficImpact, sihuaExchange } = compat;
  const items = [];
  const push = (label, value) => {
    if (value) items.push({ label, value });
  };

  const overlayValue = (overlay) => {
    if (!overlay?.landsOn) return "";
    const stars = asArray(overlay.landingMainStars).filter(Boolean).join(" · ");
    return `${overlay.sourcePalace}(${overlay.sourceBranch}) → 내 ${overlay.landsOn}${stars ? ` [${stars}]` : ""}`;
  };
  push("상대 명궁이 앉는 자리", overlayValue(palaceOverlay?.partnerMingOntoMe));
  push("상대 부부궁이 앉는 자리", overlayValue(palaceOverlay?.partnerSpouseOntoMe));
  push("내 명궁이 앉는 자리", palaceOverlay?.myMingOntoPartner?.landsOn ? `상대 ${palaceOverlay.myMingOntoPartner.landsOn}` : "");

  push("내 부부궁 주성 ↔ 상대 명궁 주성 일치", asArray(spouseCross?.myIdealMatchesPartner).join(" · "));
  push("상대 부부궁 주성 ↔ 내 명궁 주성 일치", asArray(spouseCross?.partnerIdealMatchesMe).join(" · "));
  push("두 부부궁 공유 주성", asArray(spouseCross?.sharedSpouseStars).join(" · "));
  if (spouseCross?.bothSpouseEmpty) {
    push("두 부부궁 모두 무주성", "관계의 상을 상대에게서 빌려온다");
  }

  const landings = (list) => asArray(list)
    .map((item) => `${asArray(item?.stars).join("·")}→${item?.landsOn}`)
    .filter((line) => line.length > 2)
    .join(" / ");
  push("상대 살성이 내 민감궁에 낙궁", landings(maleficImpact?.partnerHitsOnSensitive));
  push("내 살성이 상대 민감궁에 낙궁", landings(maleficImpact?.myHitsOnSensitive));

  const gifts = (list) => asArray(list)
    .map((item) => `${item?.transform}(${item?.star})→${item?.landsOn}`)
    .filter((line) => line.length > 4)
    .join(" / ");
  push("상대 사화가 내 명반에 주는 것", gifts(sihuaExchange?.giftsToMe));
  push("내 사화가 상대 명반에 주는 것", gifts(sihuaExchange?.giftsToPartner));
  push(
    "상대 화기가 내 명반에 떨어지는 자리",
    sihuaExchange?.partnerHuaJiOntoMe?.landsOn ? `${sihuaExchange.partnerHuaJiOntoMe.star} → 내 ${sihuaExchange.partnerHuaJiOntoMe.landsOn}` : "",
  );
  push(
    "내 화기가 상대 명반에 떨어지는 자리",
    sihuaExchange?.myHuaJiOntoPartner?.landsOn ? `${sihuaExchange.myHuaJiOntoPartner.star} → 상대 ${sihuaExchange.myHuaJiOntoPartner.landsOn}` : "",
  );

  return items;
}

export function neoRelationshipStatusLabel(status) {
  return RELATIONSHIP_STATUS_LABELS[status] || "";
}

export function neoRelationshipStatusFocus(status) {
  return RELATIONSHIP_STATUS_FOCUS[status] || "";
}

/**
 * 두 명반 → 네오 궁합 확정값. 순수 함수(같은 명반이면 같은 결과).
 *
 * @param {object} params
 * @param {object} params.selfChart          calculateZiweiAiChart(본인)
 * @param {object} params.partnerChart       calculateZiweiAiChart(상대)
 * @param {string} params.relationshipStatus NEO_RELATIONSHIP_STATUSES 중 하나 또는 ""
 * @param {string} params.partnerGender      "male" | "female" | "unknown" | ""
 */
export function buildNeoZiweiCompat({ selfChart, partnerChart, relationshipStatus = "", partnerGender = "" } = {}) {
  const compat = buildZiweiLoveCompatibility({ selfZiwei: selfChart, partnerZiwei: partnerChart });
  // 🔴 원본 교차 구조(palaceOverlay/spouseCross/maleficImpact/sihuaExchange)를 그대로 싣지 않는다.
  //    highlights 가 그 값들을 사람이 읽을 문장으로 이미 담고 있고, 원본을 함께 두면 (1) 상담 문서와
  //    응답이 두 배로 불고 (2) 다음 세션이 그 camelCase 구조를 프롬프트에 덤프해 키 누출이 되살아난다.
  //    (그 사고가 neo-operation-room-basis.js 머리말에 기록돼 있다.)
  // 🔴 여기 남는 값은 전부 [계산 확정값] 표에 렌더된다 — 표에 안 실리는 값을 여기 두면
  //    measureNeoBasisCoverage 가 "표가 계산값을 잃었다"로 잡는다.
  return {
    scores: buildNeoCompatScores(compat.axisScores),
    highlights: buildHighlights(compat),
    partnerDigest: buildPartnerDigest(partnerChart),
    partnerGenderLabel: GENDER_LABELS[clean(partnerGender)] || "",
    relationshipStatusLabel: neoRelationshipStatusLabel(relationshipStatus),
    uncertainty: {
      selfBirthTimeUnknown: selfChart?.uncertainty?.birthTimeUnknown === true,
      partnerBirthTimeUnknown: partnerChart?.uncertainty?.birthTimeUnknown === true,
    },
  };
}
