/**
 * /fortune/{기간}/{별자리·띠} 의 `<title>` 후보를 만든다 — 네이버 CTR 실험용 3패턴.
 *
 * 배경(2026-10-03 실측, docs/seo/SEO_STATE.json 네이버 관찰): 별자리·띠 페이지는 노출이
 * 1만~2.6만인데 CTR 이 0.2~1.0% 였다. 기존 제목은 `쥐띠 오늘의 운세 9월 26일 | 무료 띠별 운세` 로
 * 같은 날 24쪽이 꼬리까지 똑같았고 혜택·신뢰 단서가 없었다. 순위를 알 수 없어(네이버는 평균순위를
 * 주지 않는다) 제목 탓인지 순위 탓인지 가를 수단이 필요하다 — 그래서 sign 마다 패턴을 달리 배정해
 * 같은 기간 안에서 페이지별 CTR 을 비교한다.
 *
 * 🔴 신뢰 문구는 사실만 쓴다. lib/brand/founder.ts 는 "서비스 창작자 소개이지 AI 결과를 사람이
 *    검수했다는 뜻이 아니다" 라고 못박고, 페이지 본문도 "사람이 매일 손으로 쓰는 글이 아니다" 라고
 *    고지한다. 그래서 `명리학자 감수` 같은 검수 표현은 쓰지 않고 `명리학자가 만든` 만 쓴다.
 * 🔴 폭 게이트는 scripts/verify-adsense-readiness.mjs 의 SERP_TITLE_WIDTH_LIMIT(60)와 같다.
 *    후보는 긴 것부터 시도해 처음으로 60 이하인 것을 고르고, 모두 넘으면 호출부가 준 폴백을 쓴다.
 *    월말 주간(`10월 26~11월 1일`)·긴 별자리 이름(`물고기자리`)이 겹치는 날에만 길어지므로
 *    로컬에서는 초록불이고 그 주에만 배포가 죽을 수 있다 — 후보 체인이 그 구멍을 막는다.
 * 🔴 순수 ESM 이다(다른 모듈을 import 하지 않는다). Next 페이지와 테스트가 함께 읽는다.
 */

export const SERP_TITLE_WIDTH_LIMIT = 60;

const EAST_ASIAN_WIDE =
  /[ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿ꀀ-꓏가-힣豈-﫿︰-﹯＀-｠￠-￦]/;

/** verify-adsense-readiness 의 serpTitleWidth 와 같은 계산(한중일 2, 그 외 1). */
export function serpTitleWidth(title) {
  return [...title].reduce((total, char) => total + (EAST_ASIAN_WIDE.test(char) ? 2 : 1), 0);
}

export const TITLE_VARIANTS = ["benefit", "question", "trust"];

/**
 * 실험 라운드. 값을 1 올리면 모든 sign 의 패턴이 한 칸씩 밀린다(라틴 스퀘어 순환).
 * 같은 sign 이 모든 패턴을 한 번씩 받아야 sign 자체의 인기 차이를 상쇄할 수 있다.
 * 바꾸는 날짜는 docs/seo/SEO_STATE.json 의 titleExperiment 에 함께 적는다.
 */
export const TITLE_EXPERIMENT_ROUND = 0;

/**
 * 같은 kind(띠 12 · 별자리 12) 안의 순번으로 패턴을 정한다. 순번 % 3 이라 각 패턴이 4개씩 돌아간다.
 * @param {number} signIndexInKind
 */
export function titleVariantFor(signIndexInKind) {
  const n = TITLE_VARIANTS.length;
  return TITLE_VARIANTS[(((signIndexInKind + TITLE_EXPERIMENT_ROUND) % n) + n) % n];
}

/** 패턴별 꼬리. 앞에 있는 것이 더 길고 구체적이다. */
function tailsFor(variant, score) {
  switch (variant) {
    case "benefit":
      return [`총운 ${score}/10·행운의 색`, `총운 ${score}/10`];
    case "question":
      return ["재물·연애 어떨까?", "재물·연애운"];
    case "trust":
      return ["명리학자가 만든 무료 운세", "명리학자가 만든 운세", "명리학자 운영"];
    default:
      return [];
  }
}

/**
 * @param {{
 *   name: string,            // "쥐띠" · "물고기자리"
 *   periodTitle: string,     // "오늘의" · "이번 주" (lib/fortune/periods.ts PERIOD_TITLE)
 *   dateLabel: string,       // vm.titleDateLabel — "10월 3일" · "9월 28~10월 4일" · "2026년 10월"
 *   year: number | null,     // 일간(today/tomorrow)만 넘긴다. 연도가 든 날짜 쿼리의 CTR 이 높았다(추정).
 *   score: number,           // vm.score.overall
 *   variant: string,         // titleVariantFor() 결과
 *   fallback: string,        // 어떤 후보도 폭을 못 맞출 때 쓰는 기존 제목
 * }} input
 */
export function buildFortuneTitle({ name, periodTitle, dateLabel, year, score, variant, fallback }) {
  const heads = [];
  if (year) heads.push(`${name} ${periodTitle} 운세 ${year}년 ${dateLabel}`);
  heads.push(`${name} ${periodTitle} 운세 ${dateLabel}`);

  for (const head of heads) {
    for (const tail of tailsFor(variant, score)) {
      const title = `${head} | ${tail}`;
      if (serpTitleWidth(title) <= SERP_TITLE_WIDTH_LIMIT) return title;
    }
  }
  return fallback;
}
