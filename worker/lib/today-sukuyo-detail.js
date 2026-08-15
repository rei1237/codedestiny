// 오늘의 숙요점 상세 — 순수 판정 레이어(I/O 비의존).
//
// judgeDayFortune(sukuyo-relation-core.js)은 격각 관계·역할·티어·본명수별 조언을 이미 다 내는데
// 홈 카드는 그중 headline 과 advice 한 줄만 쓴다. 여기서 그 나머지(역할 프로필·거리·티어 해설)와
// SUKUYO_MANSIONS 의 수(宿) 속성(방위·오행·사신·원형·키워드·강점·그림자)을 섹션으로 펼친다.
//
// 🔴 표를 새로 들여오지 않는다. lib/sukuyo-calendar.ts(29.8KB)는 워커 번들에 없고, 여기서
//    import 하면 그 크기가 그대로 워커에 얹힌다. 이미 번들에 있는 두 표로 충분하다.
// 🔴 오늘 하루만·목적 무관으로 유지한다. 여러 날 랭킹과 목적별 적합도는 유료
//    nakshatra-muhurta(₩5,000)의 몫이다.

import { DAY_TIER_LABEL, SUKUYO_ROLE_PROFILES } from "./sukuyo-relation-core.js";

// 격각 6종이 "오늘"이라는 맥락에서 뜻하는 것. 궁합용 해설과 달리 하루 단위로 다시 썼다.
const RELATION_DAY_LINE = Object.freeze({
  명: "오늘 달이 내 본명수와 같은 자리에 섭니다. 나를 그대로 비추는 날이라 힘도 버릇도 같이 커집니다.",
  영친: "오늘 달이 내 본명수와 주고받는 자리에 섭니다. 베풀거나 기대는 쪽으로 관계가 움직입니다.",
  우쇠: "오늘 달이 내 본명수와 곁을 나누는 자리에 섭니다. 함께라서 든든하거나, 함께라서 소모됩니다.",
  안괴: "오늘 달이 내 본명수의 안정과 흔들림을 가르는 자리에 섭니다. 편안함과 변화가 같은 문에 있습니다.",
  성위: "오늘 달이 내 본명수를 밀거나 조이는 자리에 섭니다. 이루려는 힘과 긴장이 함께 옵니다.",
  업태: "오늘 달이 내 본명수와 숙제로 얽히는 자리에 섭니다. 미뤄 둔 문제가 표면으로 올라옵니다.",
});

// 오늘의 수가 나에게 갖는 역할(bRole)별 하루 처방. SUKUYO_ROLE_PROFILES 의 meaning 이
// "그 자리가 무엇인가"라면 이쪽은 "그래서 오늘 무엇을 하라"다.
const ROLE_DAY_ACTION = Object.freeze({
  명: "나를 위한 결정을 하기에 좋은 날입니다. 다만 내 버릇도 같이 세지니 한 가지에만 힘을 모으세요.",
  영: "먼저 내어주면 크게 돌아오는 날입니다. 부탁을 들어주고 자리를 마련하는 쪽에 서세요.",
  친: "가까이 가도 되는 날입니다. 안부·상담·화해처럼 마음이 오가는 일이 순합니다.",
  우: "곁을 지키는 날입니다. 새로 벌이기보다 함께 하던 일을 이어 가면 무리가 없습니다.",
  쇠: "기운이 새기 쉬운 날입니다. 부탁을 다 받지 말고 오늘의 몫만 하세요.",
  안: "마음이 놓이는 날입니다. 쉬어도 좋고, 미뤄 둔 정리를 해도 잘 됩니다.",
  괴: "판이 흔들리는 날입니다. 잡아 둔 계획이 바뀔 수 있으니 여백을 남기세요.",
  성: "이루기 좋은 날입니다. 마무리 단계에 있는 일을 오늘 매듭지으세요.",
  위: "긴장이 도는 날입니다. 자극을 동력으로 쓰되, 감정으로 받지는 마세요.",
  업: "숙제가 돌아오는 날입니다. 새 일을 시작하기보다 밀린 것을 하나 처리하세요.",
  태: "아직 형태가 없는 날입니다. 확정 대신 구상에 두면 뒤탈이 없습니다.",
});

// 사신(四神) 방위별 하루의 결. SUKUYO_MANSIONS 의 category 값(청룡/현무/백호/주작)에 대응.
const GUARDIAN_LINE = Object.freeze({
  청룡: "동방 청룡의 수입니다. 시작하고 뻗어 나가는 결이 하루에 깔립니다.",
  현무: "북방 현무의 수입니다. 안으로 여미고 지키는 결이 하루에 깔립니다.",
  백호: "서방 백호의 수입니다. 가르고 매듭짓는 결이 하루에 깔립니다.",
  주작: "남방 주작의 수입니다. 드러내고 표현하는 결이 하루에 깔립니다.",
});

// 오늘의 수 오행 × 길흉 방향으로 "권하는 일 / 자제할 일"을 만든다.
// element 는 SUKUYO_MANSIONS 의 값이라 목/화/토/금/수 외에 일·월도 온다.
const MANSION_ELEMENT_ACTION = Object.freeze({
  목: { do: "새로 시작하기·제안하기·씨앗을 심는 일", avoid: "이미 벌린 것을 또 벌리는 일" },
  화: { do: "드러내기·발표하기·사람 앞에 서는 일", avoid: "감정이 실린 말과 즉흥적인 통보" },
  토: { do: "정리하기·기준 세우기·기록으로 남기는 일", avoid: "결론을 미루고 쌓아 두는 일" },
  금: { do: "매듭짓기·군더더기를 덜어내기·계약과 문서를 확인하는 일", avoid: "날 선 지적과 성급한 단절" },
  수: { do: "생각하기·자료 모으기·물러나 살피는 일", avoid: "혼자 오래 곱씹으며 결론 내리는 일" },
  일: { do: "중심을 세우기·내가 주도하는 일", avoid: "과시와 독단" },
  월: { do: "돌보기·마음을 살피는 일", avoid: "기분에 따라 결정하는 일" },
});

function joinList(list, limit = 4) {
  return (Array.isArray(list) ? list : []).slice(0, limit).join(" · ");
}

/** 오늘 수(宿) 자체의 속성 섹션. 본명수가 없어도 참이다. */
function mansionSections(todayMansion) {
  const sections = [];
  const items = [
    { label: "오늘의 수", value: `${todayMansion.nameKo}수(${todayMansion.nameHan})`, note: todayMansion.archetypeTitle || "" },
    { label: "방위·수호", value: `${todayMansion.direction} · ${todayMansion.animalSymbol}` },
    { label: "오행", value: todayMansion.element || "" },
  ];
  if (Array.isArray(todayMansion.keywords) && todayMansion.keywords.length) {
    items.push({ label: "오늘의 키워드", value: joinList(todayMansion.keywords) });
  }
  sections.push({ key: "mansion", title: "오늘 달이 머무는 자리", items });

  const guardianLine = GUARDIAN_LINE[todayMansion.category];
  const action = MANSION_ELEMENT_ACTION[todayMansion.element];
  const lines = [];
  if (guardianLine) lines.push(guardianLine);
  if (action) {
    lines.push(`오늘 권하는 일 — ${action.do}.`);
    lines.push(`오늘 자제할 일 — ${action.avoid}.`);
  }
  if (lines.length) sections.push({ key: "mansion-mood", title: "오늘 수의 결", lines });

  const strengths = joinList(todayMansion.strengths, 3);
  const shadows = joinList(todayMansion.shadows, 3);
  if (strengths || shadows) {
    const traits = [];
    if (strengths) traits.push({ label: "살아나는 면", value: strengths });
    if (shadows) traits.push({ label: "조심할 면", value: shadows });
    sections.push({ key: "mansion-traits", title: "오늘 두드러지는 성질", items: traits });
  }
  return sections;
}

/**
 * 오늘의 숙요 상세(본명수 있음).
 *
 * @param {object} params
 * @param {object} params.verdict      judgeDayFortune() 결과
 * @param {object} params.todayMansion buildSukuyoFromLunar() 결과 (오늘)
 * @param {object|null} params.natalMansion buildSukuyoFromLunar() 결과 (본명)
 */
export function buildTodaySukuyoDetail({ verdict, todayMansion, natalMansion }) {
  if (!verdict || !todayMansion) return { highlights: [], sections: [] };

  const sections = mansionSections(todayMansion);
  const highlights = [];

  const roleProfile = SUKUYO_ROLE_PROFILES[verdict.bRole] || null;
  const relationItems = [
    { label: "격각 관계", value: `${verdict.relationType}(${verdict.relationTypeHan})`, note: RELATION_DAY_LINE[verdict.relationType] || "" },
    { label: "오늘이 나에게 갖는 자리", value: `${verdict.bRole}(${verdict.roleHan})`, note: roleProfile ? roleProfile.meaning : "" },
    { label: "본명수에서의 거리", value: `${verdict.forwardDistance}번째 자리`, note: natalMansion ? `내 본명수는 ${natalMansion.nameKo}수(${natalMansion.nameHan})입니다.` : "" },
    { label: "오늘의 등급", value: `${DAY_TIER_LABEL[verdict.tier] || verdict.tierLabel} · ${verdict.score}점` },
  ];
  sections.splice(1, 0, { key: "relation", title: "내 본명수와 오늘의 자리", items: relationItems });

  const action = ROLE_DAY_ACTION[verdict.bRole];
  const adviceLines = [];
  if (verdict.advice) adviceLines.push(verdict.advice);
  if (action) adviceLines.push(action);
  if (adviceLines.length) sections.push({ key: "advice", title: "오늘의 조언", lines: adviceLines });

  highlights.push(`${verdict.relationType}의 자리 — ${verdict.bRole}(${verdict.roleHan})`);
  if (action) highlights.push(action.split(".")[0] + ".");
  const strengths = joinList(todayMansion.strengths, 2);
  if (strengths) highlights.push(`오늘 살아나는 면 — ${strengths}`);

  return { highlights: highlights.slice(0, 3), sections };
}

/**
 * 본명수 없이도 참인 오늘의 수(宿).
 *
 * @param {object} todayMansion buildSukuyoFromLunar() 결과
 */
export function buildTodaySukuyoPublic(todayMansion) {
  if (!todayMansion) return null;
  const action = MANSION_ELEMENT_ACTION[todayMansion.element];
  return {
    anchor: `오늘의 수(宿) · ${todayMansion.nameKo}(${todayMansion.nameHan})`,
    headline: `${todayMansion.nameKo}수(${todayMansion.nameHan})${todayMansion.archetypeTitle ? ` — ${todayMansion.archetypeTitle}` : ""}`,
    body: `오늘 달은 ${todayMansion.direction} ${todayMansion.animalSymbol}에 속한 ${todayMansion.nameKo}수에 머뭅니다. ${joinList(todayMansion.keywords, 3)}의 결이 하루 전체에 깔립니다.`,
    highlights: [
      `${todayMansion.direction} ${todayMansion.animalSymbol} · ${todayMansion.element}`,
      action ? `오늘 권하는 일 — ${action.do}` : "",
    ].filter(Boolean),
    sections: mansionSections(todayMansion),
  };
}

export { RELATION_DAY_LINE, ROLE_DAY_ACTION, GUARDIAN_LINE, MANSION_ELEMENT_ACTION };
