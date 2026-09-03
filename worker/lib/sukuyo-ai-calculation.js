import {
  SUKUYO_ROLE_PROFILES,
  normalizeIndex,
  relationFromForwardDistance,
} from "./sukuyo-relation-core.js";

const SUKUYO_MONTH_START = [11, 13, 15, 17, 19, 21, 23, 25, 0, 2, 4, 7];

const SUKUYO_MANSIONS = [
  { nameKo: "각", nameHan: "角", direction: "동방", element: "목", keywords: ["개척", "시작", "비전"], strengths: ["시작 추진력", "선도 감각"], shadows: ["조급함", "과속"] },
  { nameKo: "항", nameHan: "亢", direction: "동방", element: "금", keywords: ["원칙", "신뢰", "의지"], strengths: ["지속성", "원칙 준수"], shadows: ["경직", "완고함"] },
  { nameKo: "저", nameHan: "氐", direction: "동방", element: "토", keywords: ["내실", "안정", "축적"], strengths: ["인내", "실행력"], shadows: ["감정 축적", "느린 전환"] },
  { nameKo: "방", nameHan: "房", direction: "동방", element: "일", keywords: ["권위", "주도", "성과"], strengths: ["리더십", "협상력"], shadows: ["지배욕", "과시"] },
  { nameKo: "심", nameHan: "心", direction: "동방", element: "월", keywords: ["직관", "통찰", "집중"], strengths: ["심층 분석", "핵심 파악"], shadows: ["의심", "극단"] },
  { nameKo: "미", nameHan: "尾", direction: "동방", element: "화", keywords: ["돌파", "투지", "혁신"], strengths: ["회복력", "도전"], shadows: ["충동", "과열"] },
  { nameKo: "기", nameHan: "箕", direction: "동방", element: "수", keywords: ["자유", "탐색", "확장"], strengths: ["적응", "확장성"], shadows: ["분산", "정착 회피"] },
  { nameKo: "두", nameHan: "斗", direction: "북방", element: "목", keywords: ["지식", "방향", "교육"], strengths: ["가이드", "체계화"], shadows: ["훈계", "경직"] },
  { nameKo: "여", nameHan: "女", direction: "북방", element: "토", keywords: ["정제", "완성", "세밀"], strengths: ["정확성", "책임감"], shadows: ["완벽주의", "자기검열"] },
  { nameKo: "허", nameHan: "虛", direction: "북방", element: "일", keywords: ["철학", "내면", "성찰"], strengths: ["사유", "통찰"], shadows: ["고립", "공허감"] },
  { nameKo: "위", nameHan: "危", direction: "북방", element: "월", keywords: ["위기", "전환", "용기"], strengths: ["위기대응", "재구성"], shadows: ["극단", "통제욕"] },
  { nameKo: "실", nameHan: "室", direction: "북방", element: "화", keywords: ["창업", "시작", "개척"], strengths: ["개시력", "리셋"], shadows: ["마무리 약함", "급전개"] },
  { nameKo: "벽", nameHan: "壁", direction: "북방", element: "수", keywords: ["조율", "관계", "중재"], strengths: ["중재력", "협업"], shadows: ["자기희생", "회피"] },
  { nameKo: "규", nameHan: "奎", direction: "서방", element: "목", keywords: ["전통", "품격", "기록"], strengths: ["정돈", "지속"], shadows: ["보수성", "경직"] },
  { nameKo: "루", nameHan: "婁", direction: "서방", element: "금", keywords: ["사교", "연결", "확장"], strengths: ["네트워크", "친화력"], shadows: ["피상성", "과소비"] },
  { nameKo: "위", nameHan: "胃", direction: "서방", element: "토", keywords: ["축적", "분석", "기획"], strengths: ["분석력", "자원관리"], shadows: ["과분석", "불안"] },
  { nameKo: "묘", nameHan: "昴", direction: "서방", element: "일", keywords: ["돌봄", "치유", "공감"], strengths: ["보호", "신뢰"], shadows: ["과보호", "의존"] },
  { nameKo: "필", nameHan: "畢", direction: "서방", element: "월", keywords: ["장인", "완성", "근면"], strengths: ["끈기", "완성도"], shadows: ["완고", "답답함"] },
  { nameKo: "자", nameHan: "觜", direction: "서방", element: "화", keywords: ["언어", "기획", "설득"], strengths: ["표현", "전달"], shadows: ["과설명", "날선 표현"] },
  { nameKo: "삼", nameHan: "參", direction: "서방", element: "수", keywords: ["변화", "개혁", "속도"], strengths: ["혁신", "적응"], shadows: ["충돌", "소진"] },
  { nameKo: "정", nameHan: "井", direction: "남방", element: "목", keywords: ["논리", "정리", "판단"], strengths: ["판단력", "정확성"], shadows: ["냉정함", "감정 억제"] },
  { nameKo: "귀", nameHan: "鬼", direction: "남방", element: "금", keywords: ["직감", "예감", "순발"], strengths: ["감지력", "전환력"], shadows: ["기복", "불안"] },
  { nameKo: "류", nameHan: "柳", direction: "남방", element: "토", keywords: ["집념", "헌신", "몰입"], strengths: ["몰입력", "지속력"], shadows: ["집착", "감정 소모"] },
  { nameKo: "성", nameHan: "星", direction: "남방", element: "일", keywords: ["승부", "리더", "추진"], strengths: ["주도권", "결단"], shadows: ["과열", "지배욕"] },
  { nameKo: "장", nameHan: "張", direction: "남방", element: "월", keywords: ["확장", "표현", "무대"], strengths: ["확장성", "표현력"], shadows: ["분산", "과시"] },
  { nameKo: "익", nameHan: "翼", direction: "남방", element: "화", keywords: ["완성", "품질", "원칙"], strengths: ["정밀성", "책임감"], shadows: ["비판성", "긴장"] },
  { nameKo: "진", nameHan: "軫", direction: "남방", element: "수", keywords: ["정리", "종결", "전환"], strengths: ["정리력", "마무리"], shadows: ["과경계", "결정 지연"] },
];

function getSukuyoByIndex(index) {
  const idx = normalizeIndex(index);
  return idx == null ? null : SUKUYO_MANSIONS[idx] || null;
}

// forward/reverse 실거리와 정본 역할 배정을 묶어 방향 비대칭 해설을 만든다.
// (a≠b면 forward+reverse=27 — 가까운 방향은 끌림의 속도, 먼 방향은 회복의 간격을 만든다)
function describeSukuyoDirectionalRelation(forwardDistance, reverseDistance) {
  const forward = normalizeIndex(forwardDistance);
  const reverse = normalizeIndex(reverseDistance);
  if (forward == null || reverse == null) return null;
  const relation = relationFromForwardDistance(forward);
  if (!relation) return null;
  const emptyProfile = { han: "", meaning: "확인된 자리", experience: "", advice: "" };
  const aProfile = SUKUYO_ROLE_PROFILES[relation.aRole] || emptyProfile;
  const bProfile = SUKUYO_ROLE_PROFILES[relation.bRole] || emptyProfile;
  let directionalDistanceGuide;
  if (forward === 0 && reverse === 0) {
    directionalDistanceGuide = "두 사람은 같은 자리에서 만나는 동숙이라 다가감과 되돌아옴의 간격이 똑같이 짧습니다. 익숙함이 빠른 만큼 변화의 신호도 함께 무뎌질 수 있어요.";
  } else {
    const myPathNear = forward <= reverse;
    const near = Math.min(forward, reverse);
    const far = Math.max(forward, reverse);
    const nearSubject = myPathNear ? "내가 상대에게 다가가는 길" : "상대가 나에게 다가오는 길";
    const farSubject = myPathNear ? "상대에게서 나에게 돌아오는 길" : "나에게서 상대에게 돌아가는 길";
    directionalDistanceGuide = `27숙의 바퀴에서 ${nearSubject}은 ${near}칸으로 짧고, ${farSubject}은 ${far}칸으로 깁니다. 끌림은 짧은 쪽 속도로 빨리 붙지만, 서운함이 풀리는 회복은 긴 쪽 ${far}칸의 결을 따라 더 천천히 돌아옵니다.`;
  }
  return {
    forwardDistance: forward,
    reverseDistance: reverse,
    relationType: relation.relationType,
    aRole: relation.aRole,
    aRoleHan: aProfile.han,
    aRoleLabel: `${relation.aRole}(${aProfile.han})`,
    aRoleMeaning: aProfile.meaning,
    aRoleExperience: aProfile.experience || "",
    aRoleAdvice: aProfile.advice || "",
    bRole: relation.bRole,
    bRoleHan: bProfile.han,
    bRoleLabel: `${relation.bRole}(${bProfile.han})`,
    bRoleMeaning: bProfile.meaning,
    bRoleExperience: bProfile.experience || "",
    bRoleAdvice: bProfile.advice || "",
    directionalDistanceGuide,
  };
}

function distanceLabelByRule(shortestDistance, relationType) {
  const d = Number(shortestDistance);
  if (relationType === "명" && d === 0) return "동숙";
  if (relationType === "업태") return "특수관계";
  if (d <= 4) return "근거리";
  if (d <= 10) return "중거리";
  return "원거리";
}

function distanceTierByShortest(shortestDistance) {
  const d = Number(shortestDistance);
  if (!Number.isFinite(d)) return "middle";
  if (d === 0) return "same";
  if (d <= 4) return "near";
  if (d <= 10) return "middle";
  return "far";
}

function clampScore(value) {
  return Math.max(5, Math.min(99, Math.round(Number(value) || 0)));
}

function buildDistanceMetrics(forwardDistance, reverseDistance, shortestDistance, distanceLabel) {
  const tier = distanceTierByShortest(shortestDistance);
  return {
    forwardDistance,
    reverseDistance,
    shortestDistance,
    distanceLabel,
    tier,
    resonanceCode: `${tier}:${forwardDistance}:${reverseDistance}`,
  };
}

// 자리(aRole/bRole)가 정본 프로필에 있으면 자리별 조언을 그대로 쓴다. 같은 관계라도
// 방향이 바뀌면 자리가 바뀌므로(예: 안괴 순행 3 → 안/괴, 순행 6 → 괴/안) 두 문장이
// 실질적으로 달라진다. 자리를 못 찾는 구버전 payload 는 기존 관계명 분기로 폴백한다.
function buildRoleGuide(relationType, aRole, bRole, shortestDistance) {
  const aProfile = SUKUYO_ROLE_PROFILES[aRole];
  const bProfile = SUKUYO_ROLE_PROFILES[bRole];
  if (aProfile?.advice && bProfile?.advice) {
    return {
      meAction: `${aRole}(${aProfile.han}) — ${aProfile.meaning}. ${aProfile.advice}`,
      otherAction: `${bRole}(${bProfile.han}) — ${bProfile.meaning}. ${bProfile.advice}`,
    };
  }
  if (relationType === "안괴") return { meAction: "상처가 올라오는 순간 바로 결론을 내리기보다 감정의 온도를 낮추는 시간이 필요합니다.", otherAction: "상대의 방어를 공격으로만 보지 않고 불안의 표현인지 살피는 태도가 도움이 됩니다." };
  if (relationType === "영친") return { meAction: "호감과 돌봄이 자연스럽지만, 한쪽만 계속 맞추는 흐름은 피해야 합니다.", otherAction: "따뜻함을 당연하게 여기지 말고 고마움을 말로 확인하는 편이 좋습니다." };
  if (relationType === "우쇠") return { meAction: "친밀함과 경쟁심이 함께 움직이므로 비교보다 각자의 장점을 인정해야 합니다.", otherAction: "자존심이 다칠 때 침묵으로 벌주지 않는 대화가 중요합니다." };
  if (relationType === "업태") return { meAction: "강한 끌림과 숙제 같은 감정이 함께 오므로 속도를 천천히 잡아야 합니다.", otherAction: "반복되는 패턴을 운명으로만 밀어붙이지 말고 현실의 선택으로 다뤄야 합니다." };
  if (relationType === "성위") return { meAction: "긴장감과 성장 욕구가 함께 생기니 역할 균형을 분명히 해야 합니다.", otherAction: "서로를 바꾸려 하기보다 각자의 기준을 설명하는 것이 좋습니다." };
  return { meAction: "닮은 리듬이 강하므로 편안함 속에서도 감정 표현을 미루지 않는 것이 좋습니다.", otherAction: "익숙함 때문에 상대의 변화를 놓치지 않도록 주기적으로 마음을 확인하세요." };
}

function buildSukuyoFromLunar(lunarMonthRaw, lunarDayRaw, options = {}) {
  const lunarMonth = Math.max(1, Math.min(12, Math.abs(Number(lunarMonthRaw) || 1)));
  const lunarDay = Math.max(1, Math.min(30, Math.abs(Number(lunarDayRaw) || 1)));
  const start = SUKUYO_MONTH_START[lunarMonth - 1] ?? 11;
  const index = (start + lunarDay - 1) % 27;
  const item = getSukuyoByIndex(index);
  if (!item) return null;
  return {
    index,
    ...item,
    lunarMonth,
    lunarDay,
    isLeapMonth: Boolean(options.isLeapMonth),
    source: String(options.source || "korean-calendar-core"),
  };
}

function buildSukuyoAiCompatibility(personASukuyo, personBSukuyo) {
  const aIndex = normalizeIndex(personASukuyo?.index);
  const bIndex = normalizeIndex(personBSukuyo?.index);
  if (aIndex == null || bIndex == null) throw Object.assign(new Error("SUKUYO_COMPATIBILITY_INDEX_MISSING"), { code: "CALCULATION_FAILED" });
  const total = 27;
  const forwardDistance = (bIndex - aIndex + total) % total;
  const reverseDistance = (aIndex - bIndex + total) % total;
  const shortestDistance = Math.min(forwardDistance, reverseDistance);
  const relation = relationFromForwardDistance(forwardDistance);
  const distanceLabel = distanceLabelByRule(shortestDistance, relation.relationType);
  const distanceMetrics = buildDistanceMetrics(forwardDistance, reverseDistance, shortestDistance, distanceLabel);
  const chemistryScore = clampScore(88 - shortestDistance * 2 + (relation.relationType === "영친" ? 8 : 0));
  const stabilityScore = clampScore(82 - shortestDistance * 2 + (relation.relationType === "영친" ? 10 : relation.relationType === "우쇠" ? 4 : 0));
  const conflictScore = clampScore(34 + shortestDistance * 3 + (relation.relationType === "안괴" ? 20 : relation.relationType === "업태" ? 14 : 0));
  return {
    forwardDistance,
    reverseDistance,
    shortestDistance,
    distanceLabel,
    distanceMetrics,
    relationType: relation.relationType,
    relationTypeHan: relation.relationTypeHan,
    aRole: relation.aRole,
    bRole: relation.bRole,
    directionFromAToB: `순행 +${forwardDistance}`,
    directionFromBToA: `역행 +${reverseDistance}`,
    chemistryScore,
    stabilityScore,
    conflictScore,
    roleActionGuide: buildRoleGuide(relation.relationType, relation.aRole, relation.bRole, shortestDistance),
  };
}

export {
  buildSukuyoAiCompatibility,
  buildSukuyoFromLunar,
  describeSukuyoDirectionalRelation,
};
