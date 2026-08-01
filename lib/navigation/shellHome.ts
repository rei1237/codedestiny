/**
 * 홈("/")의 실제 화면은 React 라우트가 아니라 정적 메인 셸이다.
 *
 * 배포 산출물에서 `dist/index.html` 은 정적 셸로 덮이지만 `dist/index.txt`("/" 의 RSC
 * 페이로드)는 React 홈(app/page.js)으로 남는다. 그래서 React 라우트 안에서 next/link 나
 * router.push 로 "/" 로 가면 순서가 이렇게 된다:
 *   클릭 → React 홈 렌더(글로벌 헤더·푸터·하단 네비까지 함께) → HomeRedirectToStatic 이
 *   정적 셸로 되돌림
 * 사용자에게는 "리액트 화면이 잠깐 보였다가 메인으로 넘어가는" 깜빡임으로 보인다.
 *
 * 이 모듈은 그 깜빡임을 없애기 위해 "클릭 시점에 문서 로드로 보내는" 단일 규칙을 담는다.
 * 문서 로드는 새 화면이 준비될 때까지 현재 화면을 그대로 두므로 React 홈이 아예 렌더되지
 * 않는다. HomeRedirectToStatic 은 그래도 "/" 의 React 홈에 도달한 경우(직접 진입·히스토리
 * 복원 등)를 위한 안전망으로 남는다.
 */

export const SHELL_HOME_PATH = "/";

/**
 * 정적 메인 셸이 담당하는 홈 경로인가. 쿼리·해시는 목적지가 아니라 셸이 해석할 인자다.
 *
 * `/index.html`도 같은 홈으로 취급한다 — GlobalHeader 등 일부 링크가 `/index.html`을 쓰고
 * (Capacitor 앱은 확장자 없는 경로를 못 열어 셸 내부 네비게이션이 그 URL로 귀결된다),
 * 여기서 걸러내지 않으면 이 가드가 그 링크를 못 잡아 `/`와 `/index.html` 사이를 오갈 때마다
 * 셸이 다른 문서로 취급돼 전체 재로드가 난다.
 */
export function isShellHomePath(pathname: string | null | undefined) {
  return pathname === SHELL_HOME_PATH || pathname === "/index.html";
}

/**
 * 정적 메인 셸 홈으로 문서 로드 이동.
 * 쿼리·해시는 반드시 보존한다 — `/?action=...` 딥링크를 해석하는 주체가 도착지인 셸 런타임이다.
 */
export function hardNavigateToShellHome(search = "", hash = "") {
  if (typeof window === "undefined") return;
  window.location.assign(`${SHELL_HOME_PATH}${search || ""}${hash || ""}`);
}
