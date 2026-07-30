"use client";

import { useEffect } from "react";
import { hardNavigateToShellHome, isShellHomePath } from "@/lib/navigation/shellHome";

/**
 * React 화면 안의 "홈으로" 링크(`href="/"`)를 문서 로드로 보낸다.
 *
 * next/link 로 "/" 에 가면 app/page.js(React 홈)가 먼저 렌더돼 글로벌 헤더·푸터·하단 네비가
 * 한 번 번쩍인 뒤에야 정적 셸로 넘어간다(자세한 배경은 lib/navigation/shellHome.ts).
 * 호출부가 40곳 넘게 흩어져 있어 개별 수정 대신 문서 캡처 단계에서 한 번에 되돌린다.
 *
 * 캡처 단계인 이유: next/link 의 onClick 은 `event.defaultPrevented` 를 먼저 확인하므로,
 * 앵커에 도달하기 전에 preventDefault 하면 클라이언트 라우팅이 시작되지 않는다.
 * stopPropagation 은 하지 않는다 — 링크가 가진 자체 onClick(탭 상태 저장 등)은 그대로 돌아야 한다.
 * (하단 네비 MobileBottomNav 는 같은 이동을 자체적으로도 수행한다. 같은 URL 로의 두 번째
 *  location.assign 은 진행 중인 이동을 대체할 뿐이라 문서·히스토리 항목은 하나로 유지된다.)
 */
export default function ShellHomeHardNavGuard() {
  useEffect(() => {
    const onClickCapture = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      // 좌클릭·수식키 없는 클릭만 가로챈다(새 탭·새 창은 브라우저 기본 동작 유지).
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.hasAttribute("download")) return;
      const anchorTarget = anchor.getAttribute("target");
      if (anchorTarget && anchorTarget !== "_self") return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch (_e) {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (!isShellHomePath(url.pathname)) return;

      event.preventDefault();
      hardNavigateToShellHome(url.search, url.hash);
    };

    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, []);

  return null;
}
