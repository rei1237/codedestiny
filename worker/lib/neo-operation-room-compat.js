// 네오 작전실 궁합 모드 — 두 사람의 명식/명반을 교차한 계산 확정값을 만든다.
//
// 🔴 계산은 여기서 하지 않는다. 교차 자체는 전부 기존 엔진이 한다 —
//    자미두수는 master-love-codex-compat.js 의 buildZiweiLoveCompatibility(마스터 인연의 서와
//    같은 엔진), 사주는 같은 파일의 buildSajuLoveCompatibility(연애 비책 AI 와 같은 엔진),
//    베다점은 nakshatra-compat.js 의 아쉬타쿠타. 이 파일은 그 결과를 네오의 프롬프트/응답이
//    쓰는 모양으로 **추리기만** 한다. 새 궁합 규칙을 여기에 쓰기 시작하면 기능마다 판정이
//    조용히 갈라진다.
//
// 🔴 **엔진이 내지 않는 점수는 만들지 않는다.** 축은 술수마다 다르다(자미두수 3축,
//    사주 4축, 베다점 아쉬타쿠타 8쿠타). 자미두수 3축을 다른 술수에 억지로 매핑하면 그 순간
//    없던 가중치가 생긴다. 공식이 없는 자리는 숫자 대신 `highlights` 에 사실만 남긴다.
//
// 🔴 그래서 scores 는 `{ overall, axes: [{ key, label, value, inverted }] }` 다.
//    화면(NeoCompatSummaryCard)과 [계산 확정값] 표가 같은 배열을 순회한다.

// 🔴 nakshatra-* 를 여기서 import 하지 않는다. constants/nakshatra-attributes.js 가
//    확장자 없는 .ts(`../lib/cms/build-text`)를 물고 있어 번들러 밖에서는 로드되지 않는다.
//    정적으로 물면 이 모듈을 bare Node 로 읽는 가드가 전부 깨진다
//    (verify-neo-operation-room-output-safety.mjs · __tests__/ui/*). 그래서 베다 교차는
//    라우트가 계산해 `vedicCompat` 로 **주입**한다 — 이 파일은 계속 순수하고 로드 가능하다.
import { buildSajuLoveCompatibility, buildZiweiLoveCompatibility } from "./master-love-codex-compat.js";

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
 *    술수가 늘어도 이 원칙은 같다 — 아래 사주·베다 요약도 같은 이유로 몇 줄로 끊는다.
 */
function buildZiweiPartnerDigest(partnerChart) {
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
 * 술수별 점수 축. 🔴 **엔진이 실제로 내는 축만** 적는다 — 여기에 없는 축을 만들면
 * 그 순간 근거 없는 가중치가 생긴다. 축이 없는 술수(점성술)는 이 표에 아예 없고,
 * buildNeoCompatScores 가 null 을 돌려줘 화면이 점수 카드를 통째로 뺀다.
 *
 * `inverted` 는 "높을수록 나쁜" 축이다. 원값을 뒤집지 않고 그대로 내보내되 라벨과
 * 이 플래그로 방향을 밝힌다 — 화면에서 100 - value 로 그리면 같은 숫자가 화면과
 * 프롬프트에서 다른 뜻이 된다.
 */
const COMPAT_SCORE_AXES = Object.freeze({
  // buildZiweiAxisScores 가 내는 3축.
  ziwei: Object.freeze([
    Object.freeze({ key: "resonance", label: "공명" }),
    Object.freeze({ key: "friction", label: "갈등 위험", inverted: true }),
    Object.freeze({ key: "growth", label: "함께 크는 힘" }),
  ]),
  // buildSajuAxisScores 가 내는 4축. 뒤집을 축이 없다.
  saju: Object.freeze([
    Object.freeze({ key: "attraction", label: "끌림" }),
    Object.freeze({ key: "stability", label: "안정" }),
    Object.freeze({ key: "communication", label: "소통" }),
    Object.freeze({ key: "endurance", label: "지구력" }),
  ]),
});

/**
 * 노출 점수. 엔진의 축을 그대로 쓰고, 종합만 그 평균으로 낸다.
 *
 * 🔴 자미두수의 종합은 예전 식 `(resonance + (100 - friction) + growth) / 3` 과
 *    **한 자리도 달라지면 안 된다** — 이미 상담을 본 사용자가 재열람할 때 점수가 바뀐다.
 *    아래 일반식은 inverted 축만 뒤집어 평균 내므로 그 식과 항등이다(가드가 고정한다).
 */
export function buildNeoCompatScores(method, axisScores) {
  const spec = COMPAT_SCORE_AXES[clean(method)];
  if (!spec || !axisScores) return null;
  const axes = spec.map((axis) => ({
    key: axis.key,
    label: axis.label,
    value: round(axisScores[axis.key]),
    inverted: axis.inverted === true,
  }));
  const sum = axes.reduce((total, axis) => total + (axis.inverted ? 100 - axis.value : axis.value), 0);
  return { overall: round(sum / axes.length), axes };
}

/**
 * 아쉬타쿠타는 36점 만점의 전통 점수라 새 공식을 만들 필요가 없다 — 총점 백분율을 종합으로 쓴다.
 *
 * 🔴 축(게이지)은 만들지 않는다. 쿠타는 8개인 데다 만점이 1~8로 제각각이라 백분율로 나란히
 *    세우면 나디(8점)와 바르나(1점)가 같은 무게로 보인다. 8쿠타는 점수 대신 highlights 로
 *    내려가 [계산 확정값] 표와 근거 배지에 만점과 함께 실린다 — 거기서는 무게가 보인다.
 */
function buildAshtakutaScores(ashtakuta) {
  if (!ashtakuta || !Number.isFinite(Number(ashtakuta.pct))) return null;
  return { overall: round(ashtakuta.pct), axes: [] };
}

/**
 * 점수로 만들지 않는 사실들. 전부 엔진 산출물에서 그대로 읽어 온 것이며 새 가중치가 없다.
 * 프롬프트의 [계산 확정값] 표와 화면의 근거 배지가 같은 배열을 쓴다.
 *
 * 🔴 `{ label, value }` 로 쪼개서 돌려준다 — 한 문자열로 합쳐 넘기면 analysis-basis-contract 의
 *    basisItem 이 값을 300자에서 잘라, 뒤쪽 교차 판독(특히 화기 낙궁)이 통째로 사라진다.
 */
function buildZiweiHighlights(compat) {
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

/** highlights 공통 수집기. 빈 값은 항목째 버린다. */
function highlightCollector() {
  const items = [];
  return {
    items,
    push(label, value) {
      if (value) items.push({ label, value });
    },
  };
}

/**
 * 사주 궁합 사실. buildSajuLoveCompatibility 산출물에서 그대로 읽는다 — 새 가중치 없음.
 * 🔴 지지 교차는 건수만 세지 않고 어느 기둥끼리 무엇으로 걸렸는지 남긴다.
 *    "충 3건" 만으로는 일주끼리 부딪힌 것인지 년주끼리인지 알 수 없어 근거가 못 된다.
 */
function buildSajuHighlights(compat) {
  const { dayStemRelation, elementBalance, tenGodInteraction, yongshinSupport, branchRelations } = compat;
  const { items, push } = highlightCollector();

  push(
    "두 일간의 관계",
    dayStemRelation?.selfStem && dayStemRelation?.partnerStem
      ? `내 ${dayStemRelation.selfStem}(${dayStemRelation.selfElement}) ↔ 상대 ${dayStemRelation.partnerStem}(${dayStemRelation.partnerElement}) — ${dayStemRelation.relationLabel || "관계 미상"}`
      : "",
  );
  push("천간 합", dayStemRelation?.stemCombination ? `${dayStemRelation.selfStem}·${dayStemRelation.partnerStem} 천간합` : "");
  push("천간 충", dayStemRelation?.stemClash ? `${dayStemRelation.selfStem}·${dayStemRelation.partnerStem} 천간충` : "");
  push("상대가 내 명식에 앉는 십성", clean(tenGodInteraction?.partnerAsMyTenGod, 40));
  push("내가 상대 명식에 앉는 십성", clean(tenGodInteraction?.meAsPartnerTenGod, 40));

  const tally = (table) => Object.entries(table || {})
    .filter(([, count]) => count > 0)
    .map(([role, count]) => `${role} ${count}`)
    .join(" · ");
  push("상대 네 기둥이 내게 주는 역할", tally(tenGodInteraction?.partnerRoleTally));
  push("내 네 기둥이 상대에게 주는 역할", tally(tenGodInteraction?.myRoleTally));

  const gapLine = (list) => asArray(list).map((entry) => `${entry?.element}(상대 ${entry?.from} ↔ 나 ${entry?.to})`).join(" · ");
  push("상대가 덮어 주는 내 결핍 오행", gapLine(elementBalance?.partnerCoversMyGap));
  push("내가 덮어 주는 상대 결핍 오행", gapLine(elementBalance?.iCoverPartnerGap));
  push("둘이 함께 있으면 과해지는 오행", asArray(elementBalance?.overloadedTogether).join(" · "));
  push("둘 다 비어 있는 오행", asArray(elementBalance?.sharedGap).join(" · "));

  push(
    "내 용신을 상대가 공급하는가",
    yongshinSupport?.self?.usefulElement
      ? `용신 ${yongshinSupport.self.usefulElement} — 상대에게 ${yongshinSupport.self.suppliedCount}개${yongshinSupport.self.supplied ? " (공급)" : " (부족)"}`
      : "",
  );
  push(
    "상대 용신을 내가 공급하는가",
    yongshinSupport?.partner?.usefulElement
      ? `용신 ${yongshinSupport.partner.usefulElement} — 내게 ${yongshinSupport.partner.suppliedCount}개${yongshinSupport.partner.supplied ? " (공급)" : " (부족)"}`
      : "",
  );
  push("내 기신을 상대가 키우는가", yongshinSupport?.self?.amplified ? `기신 ${yongshinSupport.self.unfavorableElement} 가 상대의 최다 오행이다` : "");
  push("서로 용신을 주고받는가", yongshinSupport?.mutual ? "양방향 공급" : "");
  push("신강약", [yongshinSupport?.selfStrength ? `나 ${yongshinSupport.selfStrength}` : "", yongshinSupport?.partnerStrength ? `상대 ${yongshinSupport.partnerStrength}` : ""].filter(Boolean).join(" · "));

  const relationLine = (list) => asArray(list)
    .map((item) => `내 ${item?.selfPillar}(${item?.selfBranch}) ↔ 상대 ${item?.partnerPillar}(${item?.partnerBranch}) ${item?.type}`)
    .join(" / ");
  const supports = asArray(branchRelations?.relations).filter((item) => item?.polarity === "support");
  const tensions = asArray(branchRelations?.relations).filter((item) => item?.polarity === "tension");
  push("지지 합(끌어당기는 자리)", relationLine(supports.slice(0, 6)));
  push("지지 충형파해(부딪히는 자리)", relationLine(tensions.slice(0, 6)));
  push("일주끼리 걸린 것", relationLine(branchRelations?.dayAxis));

  return items;
}

/**
 * 베다점 궁합 사실 — 아쉬타쿠타 8쿠타와 도샤. 점수는 전통 배점(총 36점)을 그대로 쓴다.
 * 🔴 unified.blendedPct 를 쓰지 않는다. 그 값은 숙요 궁합과 반씩 섞는데, 네오는 숙요를
 *    계산하지 않아 동양 쪽이 0으로 들어간다 — 그대로 쓰면 모든 궁합이 반토막 난다.
 */
function buildVedicHighlights(compat, partnerChart) {
  const ashtakuta = compat?.india;
  const { items, push } = highlightCollector();
  const nakLine = (person) => [clean(person?.nakshatraKo, 40), clean(person?.ganaKo, 20), clean(person?.lord, 20)].filter(Boolean).join(" · ");
  push("내 달 나크샤트라", nakLine(compat?.personA));
  push("상대 달 나크샤트라", nakLine(compat?.personB) || clean(partnerChart?.moon?.nakshatra, 60));
  push(
    "아쉬타쿠타 총점",
    Number.isFinite(Number(ashtakuta?.total)) ? `${ashtakuta.total} / ${ashtakuta.max}점 (${ashtakuta.pct}%) — ${clean(ashtakuta.verdict, 40)}` : "",
  );
  for (const item of asArray(ashtakuta?.items)) {
    push(clean(item?.label, 60), `${item?.score} / ${item?.max}점 — ${clean(item?.note, 120)}`);
  }
  push("도샤", asArray(ashtakuta?.doshas).join(" · "));
  return items;
}

/** 상대 사주 명식 요약. 자미두수판과 같은 이유로 몇 줄에서 끊는다. */
function buildSajuPartnerDigest(partnerSaju) {
  const chart = partnerSaju && typeof partnerSaju === "object" ? partnerSaju : {};
  return {
    dayPillar: clean(chart.dayPillar, 20),
    dayMaster: clean(chart.dayMaster, 20),
    monthPillar: clean(chart.monthPillar, 20),
    strength: clean(chart.strength, 40),
    usefulGod: clean(chart.usefulGod, 60),
    unfavorableGod: clean(chart.unfavorableGod, 60),
  };
}

/**
 * 점성술 시나스트리 사실. buildNeoAstroSynastry 산출물을 그대로 읽는다 — 새 각도 규칙 없음.
 * 🔴 하우스 오버레이는 "무엇이 어디에 떨어졌는가"라서 방향을 잃으면 근거가 못 된다.
 *    내→상대와 상대→나를 각각 한 칸으로 남긴다.
 */
function buildAstrologyHighlights(synastry) {
  const { items, push } = highlightCollector();
  if (!synastry) return items;
  const overlay = synastry.houseOverlay || {};
  const overlayLine = (prefix, suffix) => ["Sun", "Moon", "Venus", "Mars"]
    .map((key) => {
      const house = overlay[`${prefix}${key}${suffix}`];
      return Number.isFinite(house) ? `${PLANET_KO[key]} → ${house}하우스` : "";
    })
    .filter(Boolean)
    .join(" · ");
  push("내 행성이 상대 하우스에 떨어지는 자리", overlayLine("my", "InPartnerHouse"));
  push("상대 행성이 내 하우스에 떨어지는 자리", overlayLine("partner", "InMyHouse"));

  const aspects = asArray(synastry.crossAspects);
  push(
    "두 사람 사이의 각(오브가 좁은 순)",
    aspects.map((entry) => `내 ${entry?.myPlanet} ↔ 상대 ${entry?.partnerPlanet} ${entry?.type}(오브 ${entry?.orb}도)`).join(" / "),
  );
  if (synastry.uncertainty?.partnerHousesUnavailable || synastry.uncertainty?.selfHousesUnavailable) {
    push("하우스 판독", "출생 정보가 하우스를 세우기에 부족해 각(角) 위주로만 읽었다");
  }
  return items;
}

const PLANET_KO = Object.freeze({ Sun: "태양", Moon: "달", Venus: "금성", Mars: "화성" });

/** 상대 점성술 차트 요약 — 시나스트리가 이미 뽑아 둔 네 행성의 사인. */
function buildAstrologyPartnerDigest(partnerChart, synastry) {
  const partner = synastry?.partner && typeof synastry.partner === "object" ? synastry.partner : {};
  const chart = asObjectLike(asObjectLike(partnerChart).localAstroChartJson).chart;
  const ascendant = asObjectLike(asObjectLike(chart).ascendant);
  return {
    sun: clean(partner["태양"], 40),
    moon: clean(partner["달"], 40),
    venus: clean(partner["금성"], 40),
    mars: clean(partner["화성"], 40),
    ascendant: clean(ascendant.signKo || ascendant.sign, 40),
  };
}

function asObjectLike(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

/**
 * 상대 베다 차트 요약.
 * 🔴 나크샤트라는 여기 담지 않는다 — buildVedicHighlights 가 가나·주재성까지 붙여 한국어로
 *    이미 싣는다. 둘 다 담으면 [계산 확정값] 표에 같은 항목이 두 줄로 나온다.
 */
function buildVedicPartnerDigest(partnerChart) {
  const chart = partnerChart && typeof partnerChart === "object" ? partnerChart : {};
  const moon = chart.moon && typeof chart.moon === "object" ? chart.moon : {};
  const lagna = chart.lagna && typeof chart.lagna === "object" ? chart.lagna : {};
  return {
    lagna: clean(lagna.rashiKo || lagna.rashi || lagna.sign, 40),
    moonSign: clean(moon.sign, 40),
  };
}

export function neoRelationshipStatusLabel(status) {
  return RELATIONSHIP_STATUS_LABELS[status] || "";
}

export function neoRelationshipStatusFocus(status) {
  return RELATIONSHIP_STATUS_FOCUS[status] || "";
}

/** 술수별 교차 판독. 각 항목은 기존 엔진을 부르고 그 산출물을 추리기만 한다. */
const COMPAT_BUILDERS = Object.freeze({
  ziwei({ selfChart, partnerChart }) {
    const compat = buildZiweiLoveCompatibility({ selfZiwei: selfChart, partnerZiwei: partnerChart });
    return {
      scores: buildNeoCompatScores("ziwei", compat.axisScores),
      highlights: buildZiweiHighlights(compat),
      partnerDigest: buildZiweiPartnerDigest(partnerChart),
    };
  },
  saju({ selfChart, partnerChart }) {
    const compat = buildSajuLoveCompatibility({ selfSaju: selfChart, partnerSaju: partnerChart });
    return {
      scores: buildNeoCompatScores("saju", compat.axisScores),
      highlights: buildSajuHighlights(compat),
      partnerDigest: buildSajuPartnerDigest(partnerChart),
    };
  },
  // 달 황경이 없거나 vedicCompat 주입이 없으면 아쉬타쿠타가 안 선다. 억지로 0점을 만들지 않고
  // 점수를 null 로 두면 화면이 점수 카드를 통째로 빼고, 사실(나크샤트라)만 남는다.
  vedic({ partnerChart, vedicCompat }) {
    return {
      scores: buildAshtakutaScores(vedicCompat?.india),
      highlights: buildVedicHighlights(vedicCompat, partnerChart),
      partnerDigest: buildVedicPartnerDigest(partnerChart),
    };
  },
  // 🔴 점수가 없다. 시나스트리에는 이 레포가 근거로 삼을 결정론 배점이 없어서
  //    (자미두수 3축·사주 4축·베다 아쉬타쿠타 36점과 달리) 숫자를 만들지 않는다.
  //    화면은 scores 가 없으면 점수 카드를 통째로 빼고, 근거와 챕터 4개는 그대로 나온다.
  astrology({ partnerChart, synastry }) {
    return {
      scores: null,
      highlights: buildAstrologyHighlights(synastry),
      partnerDigest: buildAstrologyPartnerDigest(partnerChart, synastry),
    };
  },
});

/** 궁합을 지원하는 술수. 라우트·화면의 목록이 이 키 집합과 같아야 한다(가드가 단언한다). */
export const NEO_COMPAT_METHODS = Object.freeze(Object.keys(COMPAT_BUILDERS));

/**
 * 두 사람의 차트 → 네오 궁합 확정값. 순수 함수(같은 입력이면 같은 결과).
 *
 * 🔴 원본 교차 구조(자미두수의 palaceOverlay/spouseCross/…, 사주의 branchRelations 등)를
 *    그대로 싣지 않는다. highlights 가 그 값들을 사람이 읽을 문장으로 이미 담고 있고, 원본을
 *    함께 두면 (1) 상담 문서와 응답이 두 배로 불고 (2) 다음 세션이 그 camelCase 구조를
 *    프롬프트에 덤프해 키 누출이 되살아난다.
 *    (그 사고가 neo-operation-room-basis.js 머리말에 기록돼 있다.)
 * 🔴 여기 남는 값은 전부 [계산 확정값] 표에 렌더된다 — 표에 안 실리는 값을 여기 두면
 *    measureNeoBasisCoverage 가 "표가 계산값을 잃었다"로 잡는다.
 *
 * @param {object} params
 * @param {string} params.method             "ziwei" | "saju" | "vedic"
 * @param {object} params.selfChart          해당 술수의 본인 차트
 * @param {object} params.partnerChart       같은 함수로 계산한 상대 차트
 * @param {string} params.relationshipStatus NEO_RELATIONSHIP_STATUSES 중 하나 또는 ""
 * @param {string} params.partnerGender      "male" | "female" | "unknown" | ""
 * @param {object} [params.vedicCompat]      베다 전용. assembleNakshatraCompat 결과를 라우트가
 *                                           계산해 넣는다(위 import 주석의 이유). 없으면 점수 없이
 *                                           나크샤트라 사실만 남는다.
 * @param {object} [params.synastry]         점성술 전용. buildNeoAstroSynastry 결과. 이쪽도
 *                                           라우트가 계산해 넣는다 — swiss-ephemeris 는 WASM 을
 *                                           끌고 오므로 이 모듈이 물면 안 된다.
 */
export function buildNeoCompat({
  method, selfChart, partnerChart, relationshipStatus = "", partnerGender = "",
  vedicCompat = null, synastry = null,
} = {}) {
  const builder = COMPAT_BUILDERS[clean(method)];
  if (!builder || !selfChart || !partnerChart) return null;
  const built = builder({ selfChart, partnerChart, partnerGender, vedicCompat, synastry });
  return {
    method: clean(method, 30),
    ...built,
    partnerGenderLabel: GENDER_LABELS[clean(partnerGender)] || "",
    relationshipStatusLabel: neoRelationshipStatusLabel(relationshipStatus),
    uncertainty: {
      selfBirthTimeUnknown: birthTimeUnknown(selfChart),
      partnerBirthTimeUnknown: birthTimeUnknown(partnerChart),
    },
  };
}

/** 자미두수 전용 호출부(가드·verify 스크립트)가 쓰던 이름. buildNeoCompat 의 얇은 별칭이다. */
export function buildNeoZiweiCompat(params = {}) {
  return buildNeoCompat({ ...params, method: "ziwei" });
}

/** 술수마다 출생시간 미상을 다른 자리에 적어 둔다. 한 군데라도 켜져 있으면 미상으로 본다. */
function birthTimeUnknown(chart) {
  return chart?.uncertainty?.birthTimeUnknown === true
    || chart?.calculationMeta?.timeUnknown === true
    || chart?.birthTimeUnknown === true;
}

/**
 * 베다 차트에서 달의 시데리얼 황경을 꺼낸다. 나크샤트라 인덱스는 도출하지 않는다 —
 * assembleNakshatraCompat 이 같은 황경에서 nakshatraInfo 로 뽑으므로, 여기서 따로 계산하면
 * 27등분 규칙이 두 군데로 갈린다. 라우트가 이 값으로 교차를 계산해 주입한다.
 */
export function neoVedicMoonLongitude(chart) {
  const moon = chart?.moon && typeof chart.moon === "object" ? chart.moon : {};
  const longitude = Number(moon.moonLongitude ?? moon.longitude);
  return Number.isFinite(longitude) ? longitude : NaN;
}
