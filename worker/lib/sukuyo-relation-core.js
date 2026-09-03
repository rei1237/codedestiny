// 숙요점(宿曜占) 27수 관계 분류 정본(single source of truth).
//
// 과거에 sukuyo-ai-calculation.js 와 sukuyo-premium.js 두 곳에 같은 관계 분류 로직이
// 중복되어, 6번째 관계명이 한쪽은 "위성"·다른 쪽 소비처는 "성위"로 어긋나 있었다.
// 그 재발을 막기 위해 관계 분류(거리→관계)와 정본 명칭을 이 파일 한 곳으로 모은다.
// 정본 명칭은 "성위(成危)" — 서비스 전반의 다른 소비처가 이미 "성위"를 기준으로 삼고 있다.

import { cmsRecordCellSync } from "./cms-record-store.js";

const SUKUYO_RELATION_HAN = {
  "명": "命",
  "업태": "業胎",
  "영친": "榮親",
  "안괴": "安壞",
  "우쇠": "友衰",
  "성위": "成危",
};

function normalizeIndex(index) {
  const n = Number(index);
  if (!Number.isFinite(n)) return null;
  return ((Math.floor(n) % 27) + 27) % 27;
}

// 27수 순행 거리(0~26) → 6종 관계와 방향별 역할(aRole=기준 자리, bRole=상대 자리).
function relationFromForwardDistance(forwardDistance) {
  const d = normalizeIndex(forwardDistance);
  if (d == null) return null;
  if (d === 0) return { relationType: "명", relationTypeHan: SUKUYO_RELATION_HAN["명"], aRole: "명", bRole: "명" };
  if (d === 9) return { relationType: "업태", relationTypeHan: SUKUYO_RELATION_HAN["업태"], aRole: "업", bRole: "태" };
  if (d === 18) return { relationType: "업태", relationTypeHan: SUKUYO_RELATION_HAN["업태"], aRole: "태", bRole: "업" };
  if ([1, 10, 19].includes(d)) return { relationType: "영친", relationTypeHan: SUKUYO_RELATION_HAN["영친"], aRole: "영", bRole: "친" };
  if ([8, 17, 26].includes(d)) return { relationType: "영친", relationTypeHan: SUKUYO_RELATION_HAN["영친"], aRole: "친", bRole: "영" };
  if ([2, 11, 20].includes(d)) return { relationType: "우쇠", relationTypeHan: SUKUYO_RELATION_HAN["우쇠"], aRole: "우", bRole: "쇠" };
  if ([7, 16, 25].includes(d)) return { relationType: "우쇠", relationTypeHan: SUKUYO_RELATION_HAN["우쇠"], aRole: "쇠", bRole: "우" };
  if ([3, 12, 21].includes(d)) return { relationType: "안괴", relationTypeHan: SUKUYO_RELATION_HAN["안괴"], aRole: "안", bRole: "괴" };
  if ([6, 15, 24].includes(d)) return { relationType: "안괴", relationTypeHan: SUKUYO_RELATION_HAN["안괴"], aRole: "괴", bRole: "안" };
  if ([4, 13, 22].includes(d)) return { relationType: "성위", relationTypeHan: SUKUYO_RELATION_HAN["성위"], aRole: "위", bRole: "성" };
  if ([5, 14, 23].includes(d)) return { relationType: "성위", relationTypeHan: SUKUYO_RELATION_HAN["성위"], aRole: "성", bRole: "위" };
  return { relationType: "명", relationTypeHan: SUKUYO_RELATION_HAN["명"], aRole: "명", bRole: "명" };
}

// 방향별 역할(내 자리/상대 자리) 해설의 정본 프로필.
// 27수 고리는 대칭이 아니라 같은 관계 안에서도 두 사람이 서로 다른 자리에 선다.
// experience = 그 자리에 선 사람이 겪는 체감, advice = 그 자리 전용 조언.
// 짝(안↔괴, 영↔친, 우↔쇠, 성↔위, 업↔태)은 반드시 다른 문장이어야 하며
// verify:sukuyo-role-direction 이 그 차이를 단언한다.
const SUKUYO_ROLE_PROFILES = {
  명: {
    han: "命",
    meaning: "같은 리듬을 비추는 거울의 자리",
    experience: "상대의 반응이 내 속마음처럼 읽혀서, 말을 아껴도 통한다고 느낍니다.",
    advice: "닮았다는 이유로 확인을 건너뛰지 말고, 당연해 보이는 것부터 한 번씩 말로 맞춰 보세요.",
  },
  업: {
    han: "業",
    meaning: "오래된 숙제를 되짚게 하는 자리",
    experience: "내 쪽에서 지난 숙제를 끌고 와, 이 사람 앞에서만 같은 장면이 되풀이되는 기분이 듭니다.",
    advice: "되풀이되는 장면을 상대 탓으로 돌리지 말고, 내가 반복하는 반응 하나에 이름을 붙여 두세요.",
  },
  태: {
    han: "胎",
    meaning: "새 마음을 품고 시작하게 하는 자리",
    experience: "상대가 데려온 무게가 버겁다가도, 그 덕에 처음 해 보는 마음이 생깁니다.",
    advice: "상대의 속도에 끌려가지 말고, 새로 품은 마음 가운데 내가 이어갈 것만 골라 남기세요.",
  },
  영: {
    han: "榮",
    meaning: "상대를 빛나게 하고 베풀게 되는 자리",
    experience: "주고 싶은 마음이 먼저 나서서, 챙기고 나면 뿌듯한 만큼 허전함도 함께 옵니다.",
    advice: "베푸는 양을 줄일 필요는 없지만, 내가 무엇을 받고 싶은지도 같은 크기로 말해 두세요.",
  },
  친: {
    han: "親",
    meaning: "가까이 기대며 마음을 붙이는 자리",
    experience: "이 사람 곁에서는 긴장이 풀려, 어리광에 가까운 모습까지 편하게 나옵니다.",
    advice: "편안함에 익숙해지기 전에, 받은 것을 말로 되돌려 주는 습관을 하나 만들어 두세요.",
  },
  우: {
    han: "友",
    meaning: "곁을 지키는 동반의 자리",
    experience: "특별히 애쓰지 않아도 보폭이 맞아, 오래 함께 있어도 쉽게 지치지 않습니다.",
    advice: "편한 사이일수록 예의가 먼저 흐려지니, 부탁과 고마움은 매번 또렷하게 건네세요.",
  },
  쇠: {
    han: "衰",
    meaning: "기운을 내어주다 쉽게 소모되는 자리",
    experience: "함께 있을 땐 좋은데, 헤어지고 나면 유독 기운이 빠져 있는 자신을 발견합니다.",
    advice: "관계가 나쁘다는 뜻이 아니라 회복할 시간이 필요하다는 신호이니, 만남 사이에 쉬는 간격을 두세요.",
  },
  안: {
    han: "安",
    meaning: "안심과 편안함을 건네는 자리",
    experience: "내가 크게 애쓰지 않아도 상대가 놓여나는 게 보여, 자연스레 받쳐 주게 됩니다.",
    advice: "안정을 맡은 쪽이 먼저 지치기 쉬우니, 힘든 날은 숨기지 말고 그대로 알리세요.",
  },
  괴: {
    han: "壞",
    meaning: "흔들림과 변화를 일으키는 자리",
    experience: "나로서는 평소대로 했을 뿐인데, 상대의 균형이 크게 흔들리는 일이 반복됩니다.",
    advice: "흔드는 힘 자체가 잘못은 아니니, 큰 변화를 꺼낼 때는 미리 알리고 속도를 상대에게 맞추세요.",
  },
  성: {
    han: "成",
    meaning: "일을 이루도록 밀어주는 자리",
    experience: "내가 건넨 말과 손길이 상대의 일을 밀어 올리는 게 보여, 자꾸 더 나서게 됩니다.",
    advice: "밀어주는 힘이 강한 자리이니, 성과를 재촉하기 전에 상대가 감당할 수 있는 속도부터 물어보세요.",
  },
  위: {
    han: "危",
    meaning: "긴장과 자극을 일으키는 자리",
    experience: "이 사람 앞에서는 긴장이 잘 풀리지 않아, 잘하고 싶은 마음과 조바심이 함께 올라옵니다.",
    advice: "긴장을 위험 신호로만 읽지 말고, 감당할 몫과 미룰 몫을 나눠 적어 두면 자극이 추진력으로 바뀝니다.",
  },
};

// 오늘의 수(bRole)가 본명수에게 갖는 자리별 길흉 등급.
// tier: pivotal(특별·양날의검) / great-auspicious(대길) / auspicious(길) / caution(흉) / great-caution(대흉)
const DAY_ROLE_FORTUNE = {
  명: { tier: "pivotal", score: 80 },
  영: { tier: "great-auspicious", score: 92 },
  친: { tier: "auspicious", score: 74 },
  안: { tier: "auspicious", score: 72 },
  우: { tier: "auspicious", score: 70 },
  성: { tier: "auspicious", score: 76 },
  쇠: { tier: "caution", score: 42 },
  괴: { tier: "caution", score: 38 },
  위: { tier: "caution", score: 40 },
  업: { tier: "great-caution", score: 24 },
  태: { tier: "great-caution", score: 22 },
};

const DAY_TIER_LABEL = {
  "pivotal": "특별한 날",
  "great-auspicious": "대길일",
  "auspicious": "길일",
  "caution": "주의일",
  "great-caution": "흉일",
};

const DAY_TIER_ADVICE = {
  "pivotal": "본명수와 같은 결의 날이라 큰 결정에는 힘이 실리지만, 과욕은 그대로 되돌아옵니다. 핵심 하나에만 집중하세요.",
  "great-auspicious": "베풀고 나설수록 크게 돌아오는 날입니다. 미뤄둔 제안·부탁·시작을 오늘 꺼내 보세요.",
  "auspicious": "관계와 협력이 부드럽게 풀리는 날입니다. 사람을 만나고 손을 내밀기 좋습니다.",
  "caution": "기운이 새거나 마찰이 생기기 쉬운 날입니다. 큰 결정보다 컨디션 관리와 거리 조절에 집중하세요.",
  "great-caution": "숙제 같은 일과 충돌이 겹치기 쉬운 날입니다. 중요한 계약·담판·무리한 시작은 다른 날로 미루세요.",
};

// 본명수(27수)별 × 5티어 그날 조언. 손필사 정본 — 각 수의 성향(각수=개척,
// 항수=원칙, 저수=기반 … 진수=종결)에 맞춰 다섯 등급의 처방을 저작했다.
// judgeDayFortune이 본명수 index로 이 표를 먼저 조회하고, 없으면 DAY_TIER_ADVICE로
// 폴백하므로 이 표가 비어도 기존 동작이 그대로 유지된다. 인덱스 0~26은
// SUKUYO_MANSIONS(worker/lib/sukuyo-premium.js) / SUKUYO_CALENDAR_MANSIONS와 동일 순서.
const MANSION_DAY_ADVICE = {
  0: { // 각수(角) 개척·시작
    "pivotal": "새 문을 여는 결이 겹치는 날이에요. 벌여둔 일 여럿보다 오늘 시작할 단 하나를 골라 첫 삽을 뜨세요.",
    "great-auspicious": "먼저 손 내밀수록 크게 열립니다. 미뤄둔 첫 제안·첫 연락을 오늘 꺼내세요.",
    "auspicious": "새 인연과 협력이 순하게 트이는 날이에요. 사람을 먼저 찾아가 관심을 건네보세요.",
    "caution": "추진력이 앞서다 약속이 커지기 쉬운 날이에요. 새로 벌이기보다 시작한 것부터 여미세요.",
    "great-caution": "충돌과 무리한 착수가 겹치기 쉬운 날입니다. 큰 계약이나 새 시작은 다른 날로 미루세요.",
  },
  1: { // 항수(亢) 원칙·자존
    "pivotal": "기준이 또렷해지는 날이에요. 원칙 하나를 정해 거기에만 힘을 실으면 흔들리지 않습니다.",
    "great-auspicious": "정당한 요구를 꺼내기 좋은 날이에요. 미뤄둔 조건·경계·부탁을 당당히 말하세요.",
    "auspicious": "선을 지키는 대화가 부드럽게 통하는 날이에요. 협상과 조율을 진행하기 좋습니다.",
    "caution": "자존이 방어로 굳으면 관계가 차가워지는 날이에요. 단호함 안에 여지를 남기세요.",
    "great-caution": "고집과 마찰이 부딪히기 쉬운 날입니다. 담판·강행보다 한 발 물러서 하루를 두세요.",
  },
  2: { // 저수(氐) 기반·축적
    "pivotal": "뿌리를 다지는 결이 겹치는 날이에요. 이것저것 벌이기보다 기반 하나를 깊게 손보세요.",
    "great-auspicious": "쌓아온 것이 돌아오는 날이에요. 저축·계약·신뢰 관계의 매듭을 오늘 지어보세요.",
    "auspicious": "믿음이 오가는 관계가 순한 날이에요. 오래 볼 사람과 손을 맞잡기 좋습니다.",
    "caution": "감정이 안으로 쌓이기 쉬운 날이에요. 담아두지 말고 컨디션과 마음을 먼저 챙기세요.",
    "great-caution": "무리한 확장과 충돌이 겹치기 쉬운 날입니다. 큰 지출·새 착수는 미루고 지키는 데 집중하세요.",
  },
  3: { // 방수(房) 권위·주도
    "pivotal": "주도권이 실리는 날이에요. 여러 곳에 나서기보다 가장 중요한 자리 하나를 이끄세요.",
    "great-auspicious": "앞장서 이끌수록 성과가 커지는 날이에요. 미뤄둔 결정과 제안을 오늘 밀어붙이세요.",
    "auspicious": "사람을 품고 협력하기 좋은 날이에요. 아랫사람·동료를 챙기며 손을 내미세요.",
    "caution": "주도가 지배로 넘어가면 마찰이 생기는 날이에요. 밀어붙이기보다 한 박자 늦추세요.",
    "great-caution": "권위 충돌과 무리한 강행이 겹치기 쉬운 날입니다. 담판·큰 계약은 다른 날로 미루세요.",
  },
  4: { // 심수(心) 직관·통찰
    "pivotal": "속을 꿰뚫는 감이 예리해지는 날이에요. 흩지 말고 한 가지 핵심에만 촉을 모으세요.",
    "great-auspicious": "본심을 전하기 좋은 날이에요. 미뤄둔 진심 어린 말과 제안을 오늘 꺼내세요.",
    "auspicious": "마음이 통하는 만남이 순한 날이에요. 깊은 대화로 관계를 한 겹 더 여미세요.",
    "caution": "의심과 극단으로 기울기 쉬운 날이에요. 넘겨짚지 말고 사실부터 확인하세요.",
    "great-caution": "감정 충돌이 날카로워지기 쉬운 날입니다. 중요한 담판은 감정이 가라앉은 뒤로 미루세요.",
  },
  5: { // 미수(尾) 회복·끈기
    "pivotal": "다시 일어서는 힘이 실리는 날이에요. 여러 전선을 벌이기보다 회복할 한 곳에 끈기를 쏟으세요.",
    "great-auspicious": "버텨온 것이 결실로 도는 날이에요. 미뤄둔 도전과 재도전을 오늘 다시 꺼내세요.",
    "auspicious": "묵은 관계가 회복되는 날이에요. 소원했던 사람에게 먼저 손 내밀기 좋습니다.",
    "caution": "무리하면 쉽게 지치는 날이에요. 큰일보다 몸과 마음의 회복을 우선하세요.",
    "great-caution": "소진과 충돌이 겹치기 쉬운 날입니다. 밀어붙이는 대신 쉼을 두고 큰 시작은 미루세요.",
  },
  6: { // 기수(箕) 자유·확장
    "pivotal": "넓게 뻗는 결이 겹치는 날이에요. 사방으로 흩지 말고 넓힐 방향 하나만 정해 나아가세요.",
    "great-auspicious": "새 영역을 탐색하기 좋은 날이에요. 미뤄둔 확장·여행·시도를 오늘 시작하세요.",
    "auspicious": "새로운 사람과 자리가 편하게 열리는 날이에요. 낯선 만남에 마음을 열어보세요.",
    "caution": "관심이 분산돼 정착이 어려운 날이에요. 벌인 것부터 한자리에 붙들어 매세요.",
    "great-caution": "산만함과 충돌이 겹치기 쉬운 날입니다. 새 판을 벌이기보다 지금 것을 지키세요.",
  },
  7: { // 두수(斗) 지혜·설계
    "pivotal": "큰 그림이 또렷해지는 날이에요. 실행을 늘리기보다 설계 하나를 제대로 세우세요.",
    "great-auspicious": "배우고 가르치기 좋은 날이에요. 미뤄둔 계획·강의·안내를 오늘 펼치세요.",
    "auspicious": "조언이 오가는 관계가 순한 날이에요. 멘토·후배와 지혜를 나누기 좋습니다.",
    "caution": "훈계가 앞서면 대화가 막히는 날이에요. 가르치기보다 먼저 들어주세요.",
    "great-caution": "고집과 마찰이 부딪히기 쉬운 날입니다. 큰 판단은 하루 재우고 결정하세요.",
  },
  8: { // 여수(女) 정제·완성
    "pivotal": "매듭을 짓는 결이 겹치는 날이에요. 새로 벌이기보다 미완의 하나를 끝까지 다듬으세요.",
    "great-auspicious": "정성이 빛으로 도는 날이에요. 마무리 못 한 일과 약속을 오늘 완성하세요.",
    "auspicious": "세심함이 관계를 데우는 날이에요. 작은 배려로 사람의 마음을 챙기세요.",
    "caution": "완벽주의가 자기검열로 굳는 날이에요. 100점보다 끝내는 것을 목표로 삼으세요.",
    "great-caution": "예민함과 충돌이 겹치기 쉬운 날입니다. 큰 결정은 마음이 가벼워진 뒤로 미루세요.",
  },
  9: { // 허수(虛) 성찰·비움
    "pivotal": "안을 들여다보는 결이 겹치는 날이에요. 채우기보다 비우고, 한 가지 물음에만 머무르세요.",
    "great-auspicious": "생각을 정리해 내놓기 좋은 날이에요. 미뤄둔 글·기록·성찰을 오늘 꺼내세요.",
    "auspicious": "잔잔한 대화가 통하는 날이에요. 조용히 곁을 지켜줄 사람과 시간을 보내세요.",
    "caution": "고립과 공허로 기울기 쉬운 날이에요. 혼자 가라앉지 말고 밖으로 한 걸음 나오세요.",
    "great-caution": "무기력과 마찰이 겹치기 쉬운 날입니다. 큰일을 벌이기보다 마음을 쉬게 두세요.",
  },
  10: { // 위수(危) 전환·위기
    "pivotal": "판을 바꾸는 결이 겹치는 날이에요. 여러 변화를 한꺼번에 말고, 전환점 하나에만 집중하세요.",
    "great-auspicious": "위기를 기회로 뒤집기 좋은 날이에요. 미뤄둔 전환·정리·결단을 오늘 실행하세요.",
    "auspicious": "긴장을 함께 풀 사람과 손잡기 좋은 날이에요. 어려운 일을 나눠 지세요.",
    "caution": "극단과 통제욕으로 기울기 쉬운 날이에요. 몰아붙이지 말고 안전거리를 두세요.",
    "great-caution": "위태로운 충돌이 겹치기 쉬운 날입니다. 무리한 강행·큰 담판은 다른 날로 미루세요.",
  },
  11: { // 실수(室) 창조·개시
    "pivotal": "새로 짓는 결이 겹치는 날이에요. 여럿을 열기보다 창을 하나만 세워 집중하세요.",
    "great-auspicious": "판을 새로 여는 날이에요. 미뤄둔 창업·기획·리셋을 오늘 시작하세요.",
    "auspicious": "새 인연이 편하게 트이는 날이에요. 함께 무언가를 시작할 사람을 만나보세요.",
    "caution": "시작은 좋되 마무리가 약한 날이에요. 벌인 것을 끝까지 여미는 데 신경 쓰세요.",
    "great-caution": "급전개와 충돌이 겹치기 쉬운 날입니다. 큰 착수는 준비를 더 갖춘 뒤로 미루세요.",
  },
  12: { // 벽수(壁) 조율·중재
    "pivotal": "사이를 잇는 결이 겹치는 날이에요. 이 사람 저 사람 말고, 가장 중요한 관계 하나를 조율하세요.",
    "great-auspicious": "중재로 매듭을 푸는 날이에요. 미뤄둔 화해·조율·기록을 오늘 마무리하세요.",
    "auspicious": "협업과 화합이 순한 날이에요. 사이가 서먹했던 이들을 잇기 좋습니다.",
    "caution": "자기희생과 회피로 기울기 쉬운 날이에요. 남을 맞추기 전에 내 몫부터 챙기세요.",
    "great-caution": "낀 자리의 마찰이 커지기 쉬운 날입니다. 무리한 중재보다 한 발 빠져 지켜보세요.",
  },
  13: { // 규수(奎) 전통·기준
    "pivotal": "격을 세우는 결이 겹치는 날이에요. 새로 벌이기보다 기준·문서 하나를 제대로 정리하세요.",
    "great-auspicious": "정리한 것이 인정받는 날이에요. 미뤄둔 문서·규정·서류를 오늘 매듭지으세요.",
    "auspicious": "품격 있는 관계가 순한 날이에요. 예를 갖춰 사람을 대하면 신뢰가 쌓입니다.",
    "caution": "보수와 경직으로 굳기 쉬운 날이에요. 원칙을 지키되 새 방식에도 귀를 여세요.",
    "great-caution": "규칙 충돌이 부딪히기 쉬운 날입니다. 큰 결정은 근거를 더 갖춘 뒤로 미루세요.",
  },
  14: { // 루수(婁) 연결·사교
    "pivotal": "사람을 잇는 결이 겹치는 날이에요. 넓게 벌리기보다 꼭 필요한 인연 하나에 정성을 쏟으세요.",
    "great-auspicious": "관계가 크게 넓어지는 날이에요. 미뤄둔 만남·소개·모임을 오늘 열어보세요.",
    "auspicious": "교류와 친화가 순하게 흐르는 날이에요. 먼저 다가가 대화를 트기 좋습니다.",
    "caution": "피상적 만남과 과소비로 흐르기 쉬운 날이에요. 넓히기보다 관계의 결을 깊게 하세요.",
    "great-caution": "말과 자리에서 마찰이 생기기 쉬운 날입니다. 큰 약속·지출은 다른 날로 미루세요.",
  },
  15: { // 위수(胃) 축적·재정
    "pivotal": "자원을 다지는 결이 겹치는 날이에요. 여러 곳에 손대기보다 재정 하나를 깊게 점검하세요.",
    "great-auspicious": "준비한 것이 결실로 도는 날이에요. 미뤄둔 정산·투자·관리 계획을 오늘 실행하세요.",
    "auspicious": "실속 있는 관계가 순한 날이에요. 함께 오래 이익을 나눌 사람과 손잡기 좋습니다.",
    "caution": "과분석과 불안으로 기울기 쉬운 날이에요. 재보기만 말고 작은 실행으로 옮기세요.",
    "great-caution": "돈 문제의 충돌이 겹치기 쉬운 날입니다. 큰 지출·계약은 다른 날로 미루세요.",
  },
  16: { // 묘수(昴) 관찰·선별
    "pivotal": "가려보는 눈이 밝아지는 날이에요. 다 붙잡지 말고 가장 중요한 하나만 골라 지키세요.",
    "great-auspicious": "옳게 골라 챙기기 좋은 날이에요. 미뤄둔 선별·정리·보살핌을 오늘 마무리하세요.",
    "auspicious": "돌보는 마음이 관계를 데우는 날이에요. 약한 이를 살피며 손 내밀기 좋습니다.",
    "caution": "따지고 재다 사람을 밀어내기 쉬운 날이에요. 판단은 늦추고 먼저 품어주세요.",
    "great-caution": "예민한 판단이 충돌로 번지기 쉬운 날입니다. 중요한 선택은 하루 재우고 정하세요.",
  },
  17: { // 필수(畢) 완성·근면
    "pivotal": "끝을 보는 결이 겹치는 날이에요. 새 일을 늘리기보다 손에 쥔 하나를 완성으로 밀어붙이세요.",
    "great-auspicious": "근면이 결실로 도는 날이에요. 미뤄둔 마무리·납품·약속을 오늘 지어내세요.",
    "auspicious": "성실함이 신뢰로 도는 날이에요. 묵묵히 함께 일할 사람과 손잡기 좋습니다.",
    "caution": "완고함으로 답답해지기 쉬운 날이에요. 내 방식만 고집 말고 한 걸음 여지를 두세요.",
    "great-caution": "고집 충돌이 부딪히기 쉬운 날입니다. 무리한 강행·담판은 다른 날로 미루세요.",
  },
  18: { // 자수(觜) 언어·설득
    "pivotal": "말이 힘을 얻는 결이 겹치는 날이에요. 여러 말 말고, 핵심 한 문장에 무게를 실으세요.",
    "great-auspicious": "설득과 제안이 통하는 날이에요. 미뤄둔 발표·협상·기획을 오늘 꺼내세요.",
    "auspicious": "대화가 부드럽게 오가는 날이에요. 먼저 말을 건네 관계를 트기 좋습니다.",
    "caution": "말이 날카로워지기 쉬운 날이에요. 옳은 말도 한 번 더 다듬어 건네세요.",
    "great-caution": "말싸움과 충돌이 겹치기 쉬운 날입니다. 예민한 담판은 감정이 식은 뒤로 미루세요.",
  },
  19: { // 삼수(參) 변화·돌파
    "pivotal": "판을 깨는 결이 겹치는 날이에요. 여기저기 흔들지 말고 돌파할 지점 하나에 속도를 모으세요.",
    "great-auspicious": "변화를 밀어붙이기 좋은 날이에요. 미뤄둔 개혁·전환·도전을 오늘 시작하세요.",
    "auspicious": "새 자극을 함께 즐길 사람과 잘 맞는 날이에요. 낯선 시도에 손을 내미세요.",
    "caution": "충돌과 소진으로 기울기 쉬운 날이에요. 속도를 늦추고 몸을 먼저 챙기세요.",
    "great-caution": "격한 부딪힘이 겹치기 쉬운 날입니다. 무리한 강행·큰 전환은 다른 날로 미루세요.",
  },
  20: { // 정수(井) 질서·이성
    "pivotal": "이치를 세우는 결이 겹치는 날이에요. 벌이기보다 흐트러진 하나를 반듯이 정리하세요.",
    "great-auspicious": "공정하게 매듭짓기 좋은 날이에요. 미뤄둔 정리·판정·규칙을 오늘 세우세요.",
    "auspicious": "이성적인 대화가 통하는 날이에요. 오해를 사실로 풀어 관계를 맑히기 좋습니다.",
    "caution": "냉정함이 감정을 눌러 서먹해지기 쉬운 날이에요. 논리 앞에 따뜻함을 한 겹 얹으세요.",
    "great-caution": "옳고 그름의 충돌이 겹치기 쉬운 날입니다. 큰 담판은 감정이 가라앉은 뒤로 미루세요.",
  },
  21: { // 귀수(鬼) 직감·치유
    "pivotal": "감이 예민해지는 날이에요. 흩지 말고 마음이 이끄는 한 곳에만 촉을 두세요.",
    "great-auspicious": "영감이 선물처럼 도는 날이에요. 미뤄둔 창작·치유·돌봄을 오늘 꺼내세요.",
    "auspicious": "마음을 어루만지는 만남이 순한 날이에요. 지친 이를 다독이며 함께 있어주세요.",
    "caution": "기복과 불안으로 흔들리기 쉬운 날이에요. 감정에 휩쓸리지 말고 리듬을 지키세요.",
    "great-caution": "예민함이 충돌로 번지기 쉬운 날입니다. 중요한 결정은 마음이 잔잔해진 뒤로 미루세요.",
  },
  22: { // 류수(柳) 집념·몰입
    "pivotal": "깊이 파고드는 결이 겹치는 날이에요. 여럿 말고 몰입할 하나에만 마음을 쏟으세요.",
    "great-auspicious": "헌신이 결실로 도는 날이에요. 미뤄둔 소식·고백·매듭을 오늘 전하세요.",
    "auspicious": "끈끈한 관계가 더 단단해지는 날이에요. 아끼는 사람과 시간을 깊게 나누세요.",
    "caution": "집착과 감정 소모로 기울기 쉬운 날이에요. 붙들기보다 손을 조금 느슨히 하세요.",
    "great-caution": "감정 충돌이 격해지기 쉬운 날입니다. 예민한 담판은 마음이 식은 뒤로 미루세요.",
  },
  23: { // 성수(星) 승부·리더
    "pivotal": "주목이 쏠리는 결이 겹치는 날이에요. 여러 판 말고, 이길 승부 하나에만 힘을 실으세요.",
    "great-auspicious": "앞장서 이끌수록 빛나는 날이에요. 미뤄둔 도전·결단·발표를 오늘 밀어붙이세요.",
    "auspicious": "사람을 이끌고 모으기 좋은 날이에요. 먼저 손 내밀어 팀을 세우기 좋습니다.",
    "caution": "과열과 지배욕으로 기울기 쉬운 날이에요. 이기려 몰아붙이기 전에 한 박자 늦추세요.",
    "great-caution": "주도권 충돌이 부딪히기 쉬운 날입니다. 큰 승부·담판은 다른 날로 미루세요.",
  },
  24: { // 장수(張) 표현·무대
    "pivotal": "무대가 열리는 결이 겹치는 날이에요. 여기저기 펼치기보다 보여줄 하나에 집중하세요.",
    "great-auspicious": "매력이 크게 퍼지는 날이에요. 미뤄둔 발표·전시·표현을 오늘 무대에 올리세요.",
    "auspicious": "밝은 기운이 사람을 끌어당기는 날이에요. 먼저 다가가 분위기를 열기 좋습니다.",
    "caution": "과시와 분산으로 흐르기 쉬운 날이에요. 넓게 벌이기보다 하나를 깊게 보여주세요.",
    "great-caution": "겉치레 충돌이 겹치기 쉬운 날입니다. 큰 자리·무리한 지출은 다른 날로 미루세요.",
  },
  25: { // 익수(翼) 완성·예의
    "pivotal": "격과 완성을 아우르는 결이 겹치는 날이에요. 벌이기보다 품질 하나를 끝까지 올리세요.",
    "great-auspicious": "정성과 예의가 인정받는 날이에요. 미뤄둔 마무리·감사·답례를 오늘 전하세요.",
    "auspicious": "예를 갖춘 관계가 순한 날이에요. 정중한 배려로 사람의 신뢰를 얻기 좋습니다.",
    "caution": "비판과 긴장으로 굳기 쉬운 날이에요. 지적하기 전에 먼저 인정과 여유를 건네세요.",
    "great-caution": "깐깐한 충돌이 부딪히기 쉬운 날입니다. 큰 담판은 마음이 누그러진 뒤로 미루세요.",
  },
  26: { // 진수(軫) 정리·종결
    "pivotal": "매듭짓고 넘어가는 결이 겹치는 날이에요. 새로 벌이기보다 끝낼 하나를 확실히 종결하세요.",
    "great-auspicious": "정리가 새 길로 이어지는 날이에요. 미뤄둔 종결·이전·전환을 오늘 마무리하세요.",
    "auspicious": "떠나보내고 돌보는 마음이 순한 날이에요. 관계를 곱게 정리하고 챙기기 좋습니다.",
    "caution": "과경계와 결정 지연으로 굳기 쉬운 날이에요. 재지 말고 오늘 하나는 끝을 내세요.",
    "great-caution": "마무리 충돌이 겹치기 쉬운 날입니다. 큰 종결·담판은 다른 날로 미루세요.",
  },
};

/**
 * 특정 날짜의 수(dayMansionIndex)가 본명수(myMansionIndex)에게 갖는 그날의 길흉.
 * 두 인덱스 모두 0~26. 유효하지 않으면 null.
 */
function judgeDayFortune(myMansionIndex, dayMansionIndex) {
  if (myMansionIndex == null || dayMansionIndex == null) return null;
  const myIdx = normalizeIndex(myMansionIndex);
  const dayIdx = normalizeIndex(dayMansionIndex);
  if (myIdx == null || dayIdx == null) return null;
  const forwardDistance = (dayIdx - myIdx + 27) % 27;
  const relation = relationFromForwardDistance(forwardDistance);
  if (!relation) return null;
  // 오늘의 수는 상대(b) 자리 — "오늘이 나에게 어떤 자리인가".
  const role = relation.bRole;
  const fortune = DAY_ROLE_FORTUNE[role] || { tier: "auspicious", score: 60 };
  const profile = SUKUYO_ROLE_PROFILES[role] || { han: "", meaning: "확인된 자리" };
  const tierLabel = DAY_TIER_LABEL[fortune.tier];
  // 본명수별 조언을 먼저 조회하고, 미저작이면 티어 공통 조언으로 폴백한다(기존 동작 보존).
  // 관리자 CMS(운세 콘텐츠 → 숙요 일진 조언)가 있으면 그것을 먼저 쓴다.
  const mansionAdvice = cmsRecordCellSync(
    "sukuyo-day",
    "mansion",
    myIdx,
    fortune.tier,
    (MANSION_DAY_ADVICE[myIdx] && MANSION_DAY_ADVICE[myIdx][fortune.tier])
      || DAY_TIER_ADVICE[fortune.tier],
  );
  return {
    relationType: relation.relationType,
    relationTypeHan: relation.relationTypeHan,
    aRole: relation.aRole,
    bRole: role,
    roleHan: profile.han,
    forwardDistance,
    tier: fortune.tier,
    tierLabel,
    score: fortune.score,
    headline: `${relation.relationType}의 결 — ${tierLabel} (오늘은 ${role}(${profile.han})의 자리)`,
    advice: mansionAdvice,
  };
}

export {
  SUKUYO_RELATION_HAN,
  SUKUYO_ROLE_PROFILES,
  DAY_TIER_LABEL,
  DAY_TIER_ADVICE,
  MANSION_DAY_ADVICE,
  normalizeIndex,
  relationFromForwardDistance,
  judgeDayFortune,
};
