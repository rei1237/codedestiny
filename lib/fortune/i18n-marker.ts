/**
 * /fortune 의 회전 문장을 런타임이 번역할 수 있게 만드는 마커 재료.
 *
 * 왜 필요한가: 이 페이지들은 정적 export 된 서버 컴포넌트라 렌더 시점에 로케일을 모른다.
 * 그래서 완성된 한국어 문장만 내보내면 어떤 언어에서도 한국어로 남는다. 그런데 문장이
 * 그날 일진·달의 궁·읽는 사람의 sign 으로 조합되기 때문에(3,456가지에 날짜까지 돌면 더),
 * 완성문을 사전 키로 고정할 수도 없다.
 *
 * 해법: 한국어 완성문은 그대로 두고(AdSense 는 서버 렌더 텍스트만 세므로 분량이 유지된다),
 * 그 옆에 `key` 와 `vars` 를 함께 실어 뷰가 `data-cd-trans` / `data-cd-vars` 로 내보낸다.
 * 변수 값이 `@사전키` 면 런타임이 그 값도 로케일별로 풀어 넣는다(lib/i18n/dictionary.ts 의 resolveVars).
 *
 * 🔴 여기 `@` 로 내보내는 키는 모두 **코어 사전**(public/i18n/<lang>.json)에 있어야 한다.
 * 마커는 코어 사전만 보기 때문이다. 실재 여부는 verify:fortune-marker-keys 가 지킨다.
 */

import type { FortunePeriodId } from "./periods";

/**
 * 런타임 치환 재료. 보이는 한국어 문장은 기존 필드(`detail`·`narrative` 등)에 그대로
 * 남으므로 여기에는 담지 않는다 — AdSense 가 세는 서버 렌더 텍스트를 건드리지 않기 위해서다.
 */
export type MarkedText = {
  key: string;
  vars: Record<string, string>;
};

/** 지지 한자 → 코어 사전 키. */
export const BRANCH_KEY: Record<string, string> = {
  子: "fortuneVar.branch.zi",
  丑: "fortuneVar.branch.chou",
  寅: "fortuneVar.branch.yin",
  卯: "fortuneVar.branch.mao",
  辰: "fortuneVar.branch.chen",
  巳: "fortuneVar.branch.si",
  午: "fortuneVar.branch.wu",
  未: "fortuneVar.branch.wei",
  申: "fortuneVar.branch.shen",
  酉: "fortuneVar.branch.you",
  戌: "fortuneVar.branch.xu",
  亥: "fortuneVar.branch.hai",
};

/** 지지 한자 → 띠 동물 이름 키. `{a}띠` 처럼 접미는 로케일 템플릿이 붙인다. */
export const ANIMAL_KEY_BY_BRANCH: Record<string, string> = {
  子: "fortuneVar.animal.rat",
  丑: "fortuneVar.animal.ox",
  寅: "fortuneVar.animal.tiger",
  卯: "fortuneVar.animal.rabbit",
  辰: "fortuneVar.animal.dragon",
  巳: "fortuneVar.animal.snake",
  午: "fortuneVar.animal.horse",
  未: "fortuneVar.animal.goat",
  申: "fortuneVar.animal.monkey",
  酉: "fortuneVar.animal.rooster",
  戌: "fortuneVar.animal.dog",
  亥: "fortuneVar.animal.pig",
};

/** 삼합 라벨(한국어 원문) → 키. day-relation 의 TRINES 라벨과 같아야 한다. */
export const TRINE_KEY: Record<string, string> = {
  "수국(水局)": "fortuneVar.trine.water",
  "목국(木局)": "fortuneVar.trine.wood",
  "화국(火局)": "fortuneVar.trine.fire",
  "금국(金局)": "fortuneVar.trine.metal",
};

/** sign id → 키. zodiac 12개만 있다(띠는 ANIMAL_KEY_BY_BRANCH 쪽). */
export const SIGN_KEY: Record<string, string> = {
  aries: "fortuneVar.sign.aries",
  taurus: "fortuneVar.sign.taurus",
  gemini: "fortuneVar.sign.gemini",
  cancer: "fortuneVar.sign.cancer",
  leo: "fortuneVar.sign.leo",
  virgo: "fortuneVar.sign.virgo",
  libra: "fortuneVar.sign.libra",
  scorpio: "fortuneVar.sign.scorpio",
  sagittarius: "fortuneVar.sign.sagittarius",
  capricorn: "fortuneVar.sign.capricorn",
  aquarius: "fortuneVar.sign.aquarius",
  pisces: "fortuneVar.sign.pisces",
};

/** 별자리 4원소 라벨(한국어 원문) → 키. */
export const ELEMENT_KEY: Record<string, string> = {
  불: "fortuneVar.element.fire",
  흙: "fortuneVar.element.earth",
  공기: "fortuneVar.element.air",
  물: "fortuneVar.element.water",
};

export const PERIOD_KEY: Record<FortunePeriodId, string> = {
  today: "fortuneVar.period.today",
  tomorrow: "fortuneVar.period.tomorrow",
  weekly: "fortuneVar.period.weekly",
  monthly: "fortuneVar.period.monthly",
};

/**
 * 변수 값을 `@키` 로 만든다. 키가 없으면 **원문 그대로** 돌려준다 —
 * 그러면 그 자리만 한국어로 남고 문장은 살아 있다. 화면이 비는 쪽이 더 나쁘다.
 */
export function ref(map: Record<string, string>, id: string, fallbackText: string): string {
  const key = map[id];
  return key ? `@${key}` : fallbackText;
}

/** 번역 대상이 아닌 값(간지·절기·날짜·숫자)은 그대로 넘긴다. */
export function literal(value: string | number): string {
  return String(value ?? "");
}

/** 뷰가 그대로 펼칠 수 있는 속성 묶음. */
export function markerAttrs(marked: MarkedText | null | undefined) {
  if (!marked) return {};
  return { "data-cd-trans": marked.key, "data-cd-vars": JSON.stringify(marked.vars) };
}
