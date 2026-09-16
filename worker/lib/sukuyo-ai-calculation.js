import {
  SUKUYO_ROLE_PROFILES,
  normalizeIndex,
  relationFromForwardDistance,
} from "./sukuyo-relation-core.js";


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

// 자리(aRole/bRole)별 정본 조언을 그대로 쓴다. 같은 관계라도 방향이 바뀌면 자리가
// 바뀌므로(예: 안괴 순행 3 → 괴/안, 순행 6 → 안/괴) 두 문장이 실질적으로 달라진다.
// 정본은 27거리 전부에서 advice 가 있는 자리를 주므로 관계명 폴백은 두지 않는다.
function buildRoleGuide(aRole, bRole) {
  const aProfile = SUKUYO_ROLE_PROFILES[aRole];
  const bProfile = SUKUYO_ROLE_PROFILES[bRole];
  return {
    meAction: `${aRole}(${aProfile.han}) — ${aProfile.meaning}. ${aProfile.advice}`,
    otherAction: `${bRole}(${bProfile.han}) — ${bProfile.meaning}. ${bProfile.advice}`,
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
    roleActionGuide: buildRoleGuide(relation.aRole, relation.bRole),
  };
}

export {
  buildSukuyoAiCompatibility,
  describeSukuyoDirectionalRelation,
};
