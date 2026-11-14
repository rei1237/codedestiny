/* SeoLandingTemplate 과 무료 기능 상세(free-feature/FreeFeatureDetail)가 함께 쓰는 서버 부품.
   두 화면이 같은 포커스 링·브랜드 락업·섹션 머리를 쓰도록 한곳에 둔다. */

/* 밝은 지면에서 식별 가능한 보라색 포커스. 버튼 바깥 offset으로 배경과 구분한다. */
export const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cd-focus-ring)]";

/** 브랜드 락업의 달 마크. 장식이라 접근성 트리에서 빼고, 텍스트 분량 계산에도 잡히지 않는다. */
export function MoonMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M20.1 14.6A8.4 8.4 0 0 1 9.4 3.9a8.4 8.4 0 1 0 10.7 10.7Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * 섹션 머리. 제목 위에 킥커를 쌓지 않고 같은 기준선 오른쪽에 라벨을 두고 골드 헤어라인으로 끊는다.
 * (섹션마다 반복되는 작은 대문자 킥커는 PRODUCT.md anti-references 의 금지 목록이다.)
 */
export function SectionHead({ id, title, label = null }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-[var(--cd-border)] pb-4">
      <h2
        id={id}
        className="font-[family-name:var(--font-serif)] text-[clamp(1.4rem,3.2vw,1.9rem)] font-bold tracking-[-0.01em] text-[var(--cd-text)]"
      >
        {title}
      </h2>
      {label ? <span className="text-[0.78rem] text-[var(--cd-text-muted)]">{label}</span> : null}
    </div>
  );
}
