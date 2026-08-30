/**
 * 앱은 `/app/index.html` 로 부팅한다 — 확장자 없는 `/app` 을 주면 Capacitor 로컬 서버가
 * html5mode SPA 폴백으로 받아 루트 웹셸을 대신 띄우기 때문이다(capacitor.config.ts 주석 참고).
 *
 * 그 대가로 `usePathname()` 이 `"/app/index.html"` 을 반환한다. 라우트를 비교하는 쪽
 * (탭 활성 표시, 백버튼 루트 판정)이 `"/app"` 정확 일치를 전제하므로, 비교 전에 이 함수로
 * 정규화한다. 정규화하지 않으면 홈 탭이 활성으로 안 보이고 루트에서 백버튼이 즉시 종료된다.
 *
 * 관리자 셸(app/admin/_components/AdminShell.tsx)도 같은 이유로 쓴다 — 웹 배포본은
 * trailingSlash:true 라 `"/admin/login/"` 이 오고, 앱 번들은 `"/admin/login/index.html"` 이 온다.
 */
export function normalizeAppPathname(pathname: string) {
  const withoutIndex = String(pathname || "").replace(/\/index\.html$/, "");
  return withoutIndex.replace(/\/+$/, "") || "/";
}
