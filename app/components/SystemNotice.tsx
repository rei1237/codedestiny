import type { ReactNode } from "react";

/**
 * 시스템 안내 화면(404 · 에러 바운더리) 공용 골격.
 *
 * 스타일을 새로 만들지 않는다 — 법적 문서 표면 `.policy-doc`(styles/globals.css:816-1179)의
 * 클래스만 조합한다. 정책 페이지와 시스템 페이지가 같은 톤으로 읽히게 하는 것이 목적이고,
 * 새 색·새 폰트·새 토큰을 들이지 않는 것이 이 컴포넌트의 존재 이유다.
 *
 * 문구는 하나도 갖지 않는다. i18n 배선이 호출부마다 다르기 때문이다 —
 * `app/not-found.js` 는 `data-cd-trans` 마커, `app/error.tsx` 는 `useT()`,
 * `app/palm-reading/error.tsx` 는 자체 로케일 표를 쓴다. 여기서 사전을 들면 그중 하나는
 * 반드시 어긋나므로, 이미 해석된 노드를 슬롯으로 받는다.
 *
 * 🔴 `pages/404.tsx` · `pages/500.tsx` 는 이 컴포넌트를 쓸 수 없다 — `pages/_app.tsx` 가 CSS 를
 *    하나도 import 하지 않아 `styles/globals.css` 가 pages 라우터에 도달하지 않는다(2026-09-05 실측).
 *    `app/global-error.tsx` 도 자체 `<html>` 을 렌더해 `app/layout.js` 의 CSS import 를 못 탄다.
 *    그 세 파일은 인라인 스타일을 유지하되 값을 위 정본과 수치로 맞춘다.
 */
export function SystemNotice({
  title,
  eyebrow,
  description,
  actions,
  related,
  relatedLabel,
}: {
  /** 화면의 유일한 h1. 에러 바운더리도 페이지 본문을 통째로 대체하므로 h1 이 맞다. */
  title: ReactNode;
  /** 제목 아래 한 줄(`ERROR 404`, `CODE DESTINY` 같은 킥커). 정책 문서의 시행일 줄과 같은 자리다. */
  eyebrow?: ReactNode;
  description?: ReactNode;
  /** `.policy-btn--primary` / `--ghost` 를 단 버튼·링크들. */
  actions?: ReactNode;
  /** `.policy-doc__toc-link` 를 단 관련 문서 링크들. */
  related?: ReactNode;
  /** `related` 를 넘길 때 함께 넘긴다 — nav 의 접근성 이름. */
  relatedLabel?: string;
}) {
  return (
    <main className="policy-doc">
      <header className="policy-doc__head">
        <h1 className="policy-doc__title">{title}</h1>
        {eyebrow ? <p className="policy-doc__meta">{eyebrow}</p> : null}
        {description ? <p className="policy-doc__lede">{description}</p> : null}
      </header>

      {actions || related ? (
        <div className="policy-doc__single">
          {actions ? <div className="policy-doc__actions">{actions}</div> : null}
          {related ? (
            <nav className="policy-doc__related" aria-label={relatedLabel}>
              {related}
            </nav>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}

export default SystemNotice;
