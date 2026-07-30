"use client";

import { useEffect } from "react";

// React 홈(app/page.js)은 더 이상 서비스 화면으로 노출하지 않는다. 홈은 정적 메인 셸로 통일하고,
// React 홈이 담고 있던 서비스 소개 내용은 /about 으로 합쳤다.
//
// 왜 리다이렉트가 필요한가:
// 배포 산출물(dist)에서 `dist/index.html` 은 정적 셸로 덮이지만 `dist/index.txt`("/" 의 RSC
// 페이로드)는 React 홈 그대로 남는다. 그래서 SPA 안에서 `href="/"` 로 이동하면 프로덕션에서도
// React 홈이 렌더된다. 코드베이스에 `href="/"` 호출부가 40곳 이상 흩어져 있어, 개별 수정 대신
// 이 한 곳에서 되돌린다.
//
// 목적지는 정규 홈 "/" 다. 하드 로드라 SPA 라우터를 거치지 않고, 서버가 정적 셸을 주므로
// React 가 다시 부팅되지 않는다(배포 dist 는 promote-static-shell-to-root 가 덮은 정적 셸,
// next dev 는 public/index.html 이 app/page.js 보다 우선해 역시 정적 셸을 준다).
const CANONICAL_HOME = "/";

// "/" 가 다시 React 홈을 주는 환경이 생기면 리로드 루프가 된다. 직전 시도 시각을 남겨 두고
// 되돌아온 것이 확인되면 정적 셸을 직접 서빙하는 "/static/" 으로 한 번 더 우회한다.
// 일회성 플래그가 아니라 시간 기준이라 세션 후반의 정상 리다이렉트는 막지 않는다.
const GUARANTEED_STATIC_HOME = "/static/";
const LOOP_GUARD_KEY = "cd:home-static-redirect-at";
// 진짜 루프라면 수백 ms 안에 되돌아온다. 창을 짧게 잡아 정상 재방문을 오탐하지 않는다.
const LOOP_GUARD_MS = 1500;

export default function HomeRedirectToStatic() {
  useEffect(() => {
    // 쿼리·해시를 반드시 유지한다. 하단 네비의 "사주"·"모든 운세" 탭과 카카오 딥링크가
    // `/?action=...` 로 들어오고, 그 액션을 처리하는 것은 도착지인 정적 셸 런타임이다.
    const suffix = `${window.location.search || ""}${window.location.hash || ""}`;
    let target = `${CANONICAL_HOME}${suffix}`;
    try {
      const lastAt = Number(window.sessionStorage.getItem(LOOP_GUARD_KEY) || 0);
      const bouncedBack = Boolean(lastAt) && Date.now() - lastAt < LOOP_GUARD_MS;
      if (bouncedBack) {
        // 이미 "/" 로 보냈는데 여기로 되돌아왔다 — 같은 곳으로 또 보내면 무한 루프다.
        if (window.location.pathname.startsWith(GUARANTEED_STATIC_HOME)) return;
        target = `${GUARANTEED_STATIC_HOME}${suffix}`;
      }
      window.sessionStorage.setItem(LOOP_GUARD_KEY, String(Date.now()));
    } catch (_e) {
      /* 스토리지가 막힌 환경에서는 가드 없이 정규 홈으로 진행한다 */
    }

    try {
      window.location.replace(target);
    } catch (_e) {
      /* noop */
    }
  }, []);

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483000,
        background: "#0a0818",
        color: "#c4b5fd",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.92rem",
        letterSpacing: "0.02em",
      }}
    >
      홈으로 이동 중…
    </div>
  );
}
