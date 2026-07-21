// 운세를 처음 보는 사람과 공부하는 사람이 같은 화면을 읽을 수 있게 하는 용어 풀이.
//
// 프런트가 아니라 워커에 두는 이유: 근거 패널을 쓰는 화면이 React 넷(자미두수·점성술·베다·숙요)과
// 바닐라 하나(사주 AI 상담, js/saju-engine.js)로 갈려 있다. 데이터를 여기 한 벌만 두고
// 근거 응답(analysis basis)에 termHint를 실어 보내면 양쪽이 같은 문장을 보게 된다.

const GLOSSARY = Object.freeze({
  // ── 사주 ─────────────────────────────────────────────
  일간: { system: "saju", oneLiner: "사주 여덟 글자 중 태어난 날의 천간. 나 자신을 가리키는 기준점이다.", detail: "나머지 일곱 글자는 모두 일간과의 관계로 해석한다. 십성도 일간을 기준으로 정해진다." },
  월지: { system: "saju", oneLiner: "태어난 달의 지지. 사주 전체의 계절과 기운의 세기를 정한다.", detail: "일간이 월지에서 힘을 얻는지 잃는지가 신강·신약 판단의 출발점이다." },
  십성: { system: "saju", oneLiner: "일간과 다른 글자의 관계를 열 가지로 나눈 이름표.", detail: "비견·겁재는 나와 같은 힘, 식신·상관은 표현, 정재·편재는 재물, 정관·편관은 책임, 정인·편인은 배움을 가리킨다." },
  오행: { system: "saju", oneLiner: "목·화·토·금·수 다섯 기운. 무엇이 넘치고 무엇이 부족한지를 본다.", detail: "서로 낳아 주는 상생과 눌러 주는 상극으로 얽혀 있어, 균형이 무너진 자리에서 반복되는 문제가 나온다." },
  조후: { system: "saju", oneLiner: "사주 전체의 춥고 더움, 마르고 습함의 균형.", detail: "같은 배치라도 겨울에 태어났는지 여름에 태어났는지에 따라 필요한 기운이 달라진다." },
  용신: { system: "saju", oneLiner: "지금 이 사주에 가장 도움이 되는 기운.", detail: "반대로 해가 되는 기운을 기신이라 한다. 어느 쪽인지에 따라 유리한 방향과 선택이 갈린다." },
  대운: { system: "saju", oneLiner: "10년 단위로 바뀌는 큰 흐름.", detail: "타고난 배치가 무대라면 대운은 조명이다. 같은 사주도 대운에 따라 다르게 풀린다." },
  세운: { system: "saju", oneLiner: "한 해 단위의 흐름.", detail: "대운이 만든 판 위에서 그해에 어떤 사건이 도드라지는지를 본다." },
  지장간: { system: "saju", oneLiner: "지지 안에 숨어 있는 천간.", detail: "겉으로 드러나지 않지만 실제로 작동하는 기운이라, 천간에 같은 글자가 뜨면(투간) 성향이 겉으로 드러난다." },
  십이운성: { system: "saju", oneLiner: "일간이 각 자리에서 얼마나 기운이 살아 있는지를 열두 단계로 표시한 것.", detail: "장생·제왕처럼 힘이 붙는 자리와 병·사·묘처럼 힘이 빠지는 자리가 있다." },

  // ── 자미두수 ─────────────────────────────────────────
  명궁: { system: "ziwei", oneLiner: "타고난 성향과 삶의 중심을 보는 궁. 명반을 읽는 첫 자리다.", detail: "명궁에 어떤 주성이 앉았는지가 그 사람의 기본 결을 정한다." },
  신궁: { system: "ziwei", oneLiner: "후천적으로 힘을 쏟게 되는 자리.", detail: "명궁이 타고난 결이라면 신궁은 살면서 실제로 매달리게 되는 영역을 가리킨다." },
  삼방사정: { system: "ziwei", oneLiner: "한 궁과 서로 기운을 주고받는 네 자리 묶음.", detail: "궁 하나만 보고 단정하지 않고, 마주 보는 대궁과 삼합으로 이어진 두 궁까지 함께 읽는다." },
  사화: { system: "ziwei", oneLiner: "화록·화권·화과·화기 네 가지 변화. 명반에 힘의 방향을 넣는다.", detail: "화록은 재물과 인연, 화권은 권한, 화과는 명예와 인정, 화기는 막힘과 집착을 가리킨다." },
  화록: { system: "ziwei", oneLiner: "재물과 좋은 인연이 흘러드는 자리를 표시한다.", detail: "" },
  화권: { system: "ziwei", oneLiner: "권한과 추진력이 붙는 자리를 표시한다.", detail: "" },
  화과: { system: "ziwei", oneLiner: "명예와 인정, 도움을 받는 자리를 표시한다.", detail: "" },
  화기: { system: "ziwei", oneLiner: "막힘과 집착이 생기는 자리를 표시한다.", detail: "겁먹을 자리가 아니라 관리할 자리로 읽는다. 어디에 힘을 과하게 쓰는지를 알려 준다." },
  주성: { system: "ziwei", oneLiner: "자미·천기·태양 등 열네 개의 중심 별.", detail: "궁의 성격을 결정하는 가장 큰 요소다." },
  살성: { system: "ziwei", oneLiner: "긴장과 마찰을 만드는 별.", detail: "나쁘기만 한 것이 아니라 추진력이 되기도 하지만, 조율 없이 두면 소모가 커진다." },
  오행국: { system: "ziwei", oneLiner: "명반 전체의 기본 골격이자 대한이 시작되는 나이를 정하는 값.", detail: "수이국·목삼국처럼 부르며, 숫자가 첫 대한 시작 나이가 된다." },
  대한: { system: "ziwei", oneLiner: "10년 단위로 옮겨 가는 큰 흐름.", detail: "지금 어느 궁에 머무는지에 따라 그 10년의 주제가 달라진다." },

  // ── 서양 점성술 ──────────────────────────────────────
  상승궁: { system: "astrology", oneLiner: "태어난 순간 동쪽 지평선에 떠오르던 별자리(ASC). 남에게 보이는 첫인상과 삶의 출발점.", detail: "출생 시간을 알아야 정확해진다. 시간이 없으면 이 값과 하우스는 확정하지 않는다." },
  MC: { system: "astrology", oneLiner: "차트의 가장 높은 지점. 사회에서 도달하려는 자리와 직업 방향을 가리킨다.", detail: "" },
  하우스: { system: "astrology", oneLiner: "차트를 열둘로 나눈 삶의 무대.", detail: "행성이 어떤 별자리에 있는지가 '어떻게'라면, 몇 하우스에 있는지는 '어디에서'를 말한다." },
  어스펙트: { system: "astrology", oneLiner: "행성끼리 이루는 각도. 서로 돕는지 부딪히는지를 본다.", detail: "합·트라인·섹스타일은 흐름을 매끄럽게 하고, 스퀘어·충은 긴장을 만들되 성장을 밀어붙인다." },
  원소: { system: "astrology", oneLiner: "불·흙·공기·물 네 기질의 분포.", detail: "어느 원소가 몰리고 비었는지가 그 사람의 기본 반응 방식을 알려 준다." },
  양식: { system: "astrology", oneLiner: "활동·고정·변통 세 가지 행동 방식의 분포.", detail: "일을 시작하는 쪽인지, 지키는 쪽인지, 바꾸는 쪽인지를 본다." },
  "차트 룰러": { system: "astrology", oneLiner: "상승궁을 다스리는 행성. 그 사람의 삶을 이끄는 대표 행성이다.", detail: "" },
  트랜싯: { system: "astrology", oneLiner: "지금 하늘의 행성이 태어날 때 차트를 건드리는 상태.", detail: "확정된 사건이 아니라 지금 어떤 주제가 활성화되어 있는지를 가리킨다." },

  // ── 베다 점성술 ──────────────────────────────────────
  라그나: { system: "vedic", oneLiner: "베다 점성술의 상승점. 차트 전체를 읽는 기준 자리다.", detail: "서양 점성술의 상승궁에 해당하지만, 별자리 기준(사이데리얼)이 달라 결과가 다르게 나온다." },
  나크샤트라: { system: "vedic", oneLiner: "달이 지나는 길을 스물일곱으로 나눈 별자리.", detail: "성향을 더 촘촘하게 보고, 다샤(시기 흐름)의 출발점을 정하는 근거가 된다." },
  다샤: { system: "vedic", oneLiner: "행성이 차례로 주도권을 잡는 시기 체계.", detail: "빔쇼타리 다샤가 가장 널리 쓰이며, 어느 행성의 기간에 있는지가 그 시기의 주제를 정한다." },
  바바: { system: "vedic", oneLiner: "베다 점성술의 열두 하우스. 삶의 영역을 나눈다.", detail: "" },
  그라하: { system: "vedic", oneLiner: "해석에 쓰는 아홉 행성.", detail: "해·달·화성·수성·목성·금성·토성에 라후·케투를 더해 아홉이다." },
  라후: { system: "vedic", oneLiner: "달의 북쪽 교점. 갈망과 확장, 낯선 영역으로의 끌림을 가리킨다.", detail: "" },
  케투: { system: "vedic", oneLiner: "달의 남쪽 교점. 이미 익숙한 것과 놓아야 할 것을 가리킨다.", detail: "" },

  // ── 숙요점 ───────────────────────────────────────────
  본명숙: { system: "sukuyo", oneLiner: "태어난 날 달이 머문 자리. 스물일곱 숙 가운데 하나가 그 사람의 기본 결이 된다.", detail: "" },
  "27수": { system: "sukuyo", oneLiner: "달의 길을 스물일곱으로 나눈 자리.", detail: "두 사람의 숙이 서로 어느 방향에 놓이는지로 관계의 결을 읽는다." },
  수호신: { system: "sukuyo", oneLiner: "각 숙에 배정된 상징. 그 숙의 기질을 압축해 보여 준다.", detail: "" },
  "방위 관계": { system: "sukuyo", oneLiner: "두 숙 사이의 거리로 정해지는 관계 이름.", detail: "명·업·태·영·쇠·안·위·성·친처럼 부르며, 끌림의 방향과 소모되는 지점을 함께 알려 준다." },
});

/**
 * 용어 한 줄 풀이. 없는 용어면 빈 문자열.
 * @param {string} term
 * @returns {string}
 */
export function describeTerm(term) {
  const key = String(term || "").trim();
  return GLOSSARY[key]?.oneLiner || "";
}

/**
 * 툴팁에 실어 보낼 전체 항목. 근거 응답이 items에 붙인다.
 * @param {string} term
 * @returns {{ term: string, oneLiner: string, detail?: string, system: string } | null}
 */
export function lookupTerm(term) {
  const key = String(term || "").trim();
  const entry = GLOSSARY[key];
  if (!entry) return null;
  const result = { term: key, oneLiner: entry.oneLiner, system: entry.system };
  if (entry.detail) result.detail = entry.detail;
  return result;
}

export function listGlossaryTerms() {
  return Object.keys(GLOSSARY);
}
