// 오늘·내일 두루마리 결과에 들어가는 "오늘의 색·숫자·작은 실천".
// 🔴 LLM·네트워크를 쓰지 않는다. 같은 날짜·같은 키는 언제 계산해도 같은 값이다(SSR·재열람·공유 이미지 일치).
// 띠별 페이지는 gen-daily 가 만든 entry.lucky 를 그대로 쓰고, 여기서는 색 이름 → 스와치 색만 고른다.
// /today 허브 응답에는 색·숫자·실천 필드가 없어 KST 날짜 + 체계 키(+ 생년)로 로컬 계산한다.
import { dayRotationPick } from './daily-pick.mjs';

export const SCROLL_LUCKY_VERSION = 'scroll-lucky-v1';

// scripts/gen-daily.mjs COLOR_POOL 8색과 같은 이름. 스와치는 색 이름이 가리키는 실제 색(콘텐츠 데이터)이라 CSS 토큰이 아니다.
const SWATCH = {
  '샴페인 골드': '#d9bf86',
  '딥 네이비': '#1f2f55',
  '올리브 그린': '#6b7a3d',
  '테라코타': '#c0694a',
  '라벤더': '#a89bd6',
  '아이보리': '#f3ead2',
  '슬레이트 그레이': '#6f7886',
  '체리 레드': '#b3203f',
};
export const LUCKY_COLOR_NAMES = Object.keys(SWATCH);

/** 색 이름 → 스와치(알 수 없는 이름·비한국어 이름은 null — 스와치 없이 이름만 보인다). */
export function swatchFor(colorName) {
  return SWATCH[String(colorName || '').trim()] || null;
}

// 체계별 "오늘의 작은 실천". 해요체·한 문장·40자 안팎, 단정·공포 표현 없이 가볍게 해 볼 수 있는 행동만.
// 풀 크기는 6 이상으로 둔다(daily-pick: 이웃한 날짜가 같은 문장을 받지 않는 조건은 n≥3).
export const PRACTICE_POOLS = {
  saju: [
    '물 한 잔을 천천히 마시며 하루를 시작해요.',
    '미뤄 둔 일 중 가장 작은 것 하나만 끝내요.',
    '오늘 만난 사람에게 먼저 안부를 건네요.',
    '해 질 무렵 5분만 가볍게 걸어요.',
    '지갑과 가방 속을 한 번 정리해요.',
    '잠들기 전 오늘 고마웠던 일 하나를 떠올려요.',
  ],
  sukuyo: [
    '오늘은 말을 한 박자 늦춰서 꺼내 봐요.',
    '가까운 사람에게 짧은 안부 메시지를 보내요.',
    '약속 시간보다 10분 먼저 도착해 봐요.',
    '책상 위에서 쓰지 않는 것 하나를 치워요.',
    '달을 올려다보며 깊게 숨을 세 번 쉬어요.',
    '오늘 받은 호의를 한 줄로 적어 둬요.',
  ],
  vedic: [
    '아침에 창문을 열고 숨을 크게 세 번 쉬어요.',
    '하루 중 한 번은 하던 일을 멈추고 쉬어요.',
    '오늘 쓸 에너지를 아침에 한 줄로 정해 봐요.',
    '식사는 휴대폰 없이 천천히 해 봐요.',
    '마음에 걸리는 일 하나를 종이에 적어 비워요.',
    '밤에는 조명을 낮추고 일찍 쉬어요.',
  ],
  number: [
    '오늘의 숫자만큼 천천히 숨을 쉬어 봐요.',
    '해야 할 일을 세 가지로 줄여서 시작해요.',
    '오늘 쓰는 돈을 한 번만 더 헤아려 봐요.',
    '하루의 끝에 오늘 한 일을 숫자로 세어 봐요.',
    '평소와 다른 길로 한 정거장만 걸어 봐요.',
    '약속은 오늘 하나만 가볍게 지켜 봐요.',
  ],
  zodiac: [
    '오늘은 나에게 어울리는 색 하나를 몸에 지녀 봐요.',
    '하루 중 한 번은 어깨를 펴고 크게 웃어 봐요.',
    '가까운 사람에게 따뜻한 말 한마디를 건네요.',
    '주변 정리를 5분만 해 봐요.',
    '식사 시간만큼은 느긋하게 즐겨 봐요.',
    '잠들기 전 내일 할 일 하나만 정해 둬요.',
  ],
};

function hash32(input) {
  let value = 2166136261;
  for (const char of String(input)) {
    value ^= char.codePointAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

/**
 * /today 용 행운의 색·숫자. 같은 (날짜, 체계, 생년) 은 같은 값.
 * @param {{dateKey:string, key:string, birthKey?:string}} input dateKey = 대상 날짜(YYYY-MM-DD, KST)
 */
export function luckyFor({ dateKey, key, birthKey = '' }) {
  const seed = `${key}|${birthKey}`;
  const colorKr = dayRotationPick(dateKey, `${seed}|color`, LUCKY_COLOR_NAMES);
  const number = (hash32(`${dateKey}|${seed}|number`) % 9) + 1;
  return { colorKr, swatch: swatchFor(colorKr), number };
}

/** 오늘의 작은 실천 한 문장. system 이 풀에 없으면 zodiac 풀. */
export function practiceFor({ dateKey, key, system = 'zodiac' }) {
  const pool = PRACTICE_POOLS[system] || PRACTICE_POOLS.zodiac;
  return dayRotationPick(dateKey, `${key}|${system}|practice`, pool);
}
