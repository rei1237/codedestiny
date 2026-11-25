/**
 * 재미 콘텐츠(최애운명·유명인 사주) → 실제 궁합 상품 다리.
 *
 * 왜 있는가: 유명인·아이돌 케미는 공개 자료로 즐기는 무료 재미 콘텐츠다. 실제 상대와의 궁합은
 * 사주 라이트 궁합(saju-compat-light)과 고급 궁합(saju-compat-premium)에서 결제 후 제공한다
 * (2026-11-26 사용자 요청). 두 기능을 유료로 바꾸지 않고, 라벨과 하단 안내만 붙인다.
 *
 * 🔴 금액 문구는 가격 정본(worker/lib/paid-feature-registry.js: 30코인/3,000원, 100코인/10,000원)과
 *    같아야 한다. 가격이 바뀌면 이 파일도 함께 고친다.
 * 🔴 --cd-yehwa-* 는 장식 전용(테두리)이다 — 글자색은 --cd-text 계열만 쓴다(styles/theme-tokens.css).
 * 클릭 계측은 FusionCrossSell 과 같은 `data-cd-cross-sell` 위임(js/core/analytics.js)을 쓴다.
 */

export const FUN_COMPAT_LIGHT_HREF = "/ggulggul/?action=cdOneStepFreeSajuEntry&section=compatCard";
export const FUN_COMPAT_PREMIUM_HREF = "/saju/compatibility/premium/";

export function FunLabel({ children = "재미로 보는 케미", className = "" }: { children?: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-[var(--cd-yehwa-line)] bg-[var(--cd-surface)] px-3 py-1 text-xs font-bold text-[var(--cd-text)] ${className}`}
      data-cd-fun-label=""
    >
      {children}
    </span>
  );
}

export function FunCompatCta({ fromPath, label = "재미로 보는 케미" }: { fromPath: string; label?: string }) {
  return (
    <aside
      className="mt-8 rounded-3xl border border-[var(--cd-yehwa-line)] bg-[var(--cd-surface)] p-5 text-[var(--cd-text)] md:p-7"
      aria-label="실제 궁합 안내"
      data-cd-cross-sell={fromPath}
      data-cd-fun-compat-cta=""
    >
      <FunLabel>{label}</FunLabel>
      <p className="mt-3 max-w-[62ch] break-keep text-sm leading-7 text-[var(--cd-text-muted)]">
        이 풀이는 공개된 정보로 가볍게 즐기는 재미 콘텐츠예요.
      </p>
      <p className="mt-2 break-keep text-base font-bold leading-7">
        실제 상대와의 궁합은 라이트 궁합(3,000원) · 고급 궁합(10,000원)
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a href={FUN_COMPAT_LIGHT_HREF} className="cd-yehwa-button cd-yehwa-button--primary">
          라이트 궁합 보기
        </a>
        <a href={FUN_COMPAT_PREMIUM_HREF} className="cd-yehwa-button cd-yehwa-button--secondary">
          고급 궁합 보기
        </a>
      </div>
    </aside>
  );
}
