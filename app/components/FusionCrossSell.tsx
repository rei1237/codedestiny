import Link from "next/link";

/**
 * 무료 콘텐츠 → 대표 유료 상품(초융합 심층 리딩) 다리.
 *
 * 왜 있는가: 색인되는 최대 유입면인 `/insights/[slug]`(116개)과 `/fortune/[period]/[sign]`(52개)에서
 * 나가는 링크가 같은 무료 콘텐츠뿐이라, 검색으로 들어온 사람이 유료 상품에 닿을 길이 없었다.
 *
 * 🔴 가격을 여기에 적지 않는다 — 가격 정본은 worker/lib/paid-feature-registry.js 이고,
 *    `verify:paid-gate-price-coverage` 가 app/ 스캔에서 미해결 가격 문자열을 실패시킨다.
 *    금액은 상품 페이지의 PriceBadge(서버 정본)에서만 보여 준다.
 *
 * 🔴 클릭 계측은 새로 만들지 않는다 — 컨테이너의 `data-cd-cross-sell` 표식만 있으면
 *    js/core/analytics.js 의 capture 위임 리스너가 `cross_sell_click` 을 쏜다(같은 파일 :124).
 *    두 호스트 모두 서버 컴포넌트라 onClick 을 달 수 없어 이 방식이 유일하다.
 *
 * 문구는 한 곳에 두고 스킨만 tone 으로 가른다 — 두 호스트의 팔레트가 다르다
 * (인사이트=네오 퍼플 다크 전용, 운세=연이 핑크 라이트/다크 병행. docs/context/design-and-ui.md).
 */

const TONE = {
  neo: {
    section: "mt-10 rounded-3xl border border-amber-200/25 bg-amber-100/[0.05] p-5 md:p-7",
    kicker: "text-xs font-semibold tracking-[0.18em] text-amber-100/80",
    heading: "mt-2 text-xl font-semibold text-white",
    body: "mt-3 max-w-[62ch] break-keep text-sm leading-7 text-slate-300",
    link: "mt-5 inline-flex min-h-11 items-center rounded-full border border-amber-200/40 bg-amber-100/10 px-5 text-sm font-semibold text-amber-50 transition hover:border-amber-100/70 hover:bg-amber-100/20",
  },
  yeoni: {
    section:
      "mt-8 rounded-2xl border border-[#ead089]/60 bg-[#fff8dc]/50 p-5 dark:border-[#ead089]/25 dark:bg-[#ead089]/[0.06]",
    kicker: "text-xs font-bold tracking-[0.14em] text-[#8a6d1f] dark:text-[#ead089]",
    heading: "mt-2 text-lg font-bold text-[#3a2b12] dark:text-[#fdf3d6]",
    body: "mt-3 max-w-[62ch] break-keep text-sm leading-7 text-[#4a3a1d] dark:text-[rgba(253,243,214,0.82)]",
    link: "mt-5 inline-flex min-h-11 items-center rounded-full border border-[#b31955]/40 bg-white/70 px-5 text-sm font-bold text-[#b31955] transition hover:border-[#b31955]/70 hover:bg-[#b31955]/10 dark:border-[rgba(255,196,222,0.45)] dark:bg-white/10 dark:text-[rgba(255,196,222,0.96)] dark:hover:bg-white/20",
  },
} as const;

export function FusionCrossSell({ fromPath, tone = "neo" }: { fromPath: string; tone?: keyof typeof TONE }) {
  const skin = TONE[tone];
  return (
    <section className={skin.section} aria-labelledby="fusionCrossSellHeading" data-cd-cross-sell={fromPath}>
      <p className={skin.kicker}>여러 해석이 서로 다를 때</p>
      <h2 id="fusionCrossSellHeading" className={skin.heading}>
        여섯 체계를 교차 검증하는 초융합 심층 리딩
      </h2>
      <p className={skin.body}>
        사주·자미두수·베다점·숙요점·서양 점성술·타로를 각각 그 전통의 언어로 읽은 뒤, 여섯 해석이 겹치는
        지점과 엇갈리는 지점을 갈라 하나의 결론으로 모읍니다. 어느 말을 따라야 할지 흐릴 때, 앞으로 열두 달의
        시기와 지금 할 일까지 함께 정리합니다.
      </p>
      <Link href="/fusion-fortune/" className={skin.link}>
        초융합 심층 리딩 살펴보기
      </Link>
    </section>
  );
}
