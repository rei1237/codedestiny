import Link from "next/link";

/**
 * 기능 가이드 하단의 1차 진입 CTA.
 *
 * 프레젠테이션 전용이다 — async 도 아니고 서버 API 도 안 쓰므로 서버 페이지 14개와
 * 클라이언트 컴포넌트인 /tarot/guide 양쪽에서 그대로 쓰인다.
 *
 * variant:
 *   "full"    ko 페이지 — 킥커 + 제목 + 리드 + 버튼
 *   "compact" 문구를 번역해 둘 수 없는 로케일 — 버튼 줄만. /tarot/guide 의 비-ko 11개
 *             로케일이 이미 번역된 navLinks 를 재사용해 이 형태로 그린다.
 *
 * 🔴 하드 내비를 여기서 감싸지 말 것. "/?action=..." 은 평범한 next/link 로 두면 되고,
 *    ShellHomeHardNavGuard 가 문서 캡처 단계에서 가로채 쿼리를 보존한 채 셸로 문서 로드한다.
 *
 * data-cd-cross-sell 은 js/core/analytics.js 가 위임으로 집계한다(cross_sell_click).
 */
export default function GuideCta({ target, variant = "full", headingId = "guide-cta-title" }) {
  if (!target || !target.primary || !target.primary.href) return null;

  const compact = variant === "compact";
  const secondary = target.secondary || [];
  const showHeading = !compact && Boolean(target.heading);

  return (
    <aside
      className="cd-guide-cta"
      data-cd-cross-sell={target.from}
      aria-labelledby={showHeading ? headingId : undefined}
    >
      {!compact && target.kicker ? <p className="cd-guide-cta__kicker">{target.kicker}</p> : null}
      {showHeading ? (
        <h2 id={headingId} className="cd-guide-cta__title">
          {target.heading}
        </h2>
      ) : null}
      {!compact && target.body ? <p className="cd-guide-cta__lede">{target.body}</p> : null}

      <div className="cd-guide-cta__actions">
        <Link href={target.primary.href} className="cd-guide-cta__primary">
          <span>{target.primary.label}</span>
          {target.primary.note ? <em>{target.primary.note}</em> : null}
        </Link>
        {secondary.map((item) => (
          <Link key={item.href} href={item.href} className="cd-guide-cta__secondary">
            {item.label}
          </Link>
        ))}
      </div>
    </aside>
  );
}
