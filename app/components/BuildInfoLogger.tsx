"use client";

import { useEffect } from "react";

export default function BuildInfoLogger() {
  useEffect(() => {
    const build = {
      version: process.env.NEXT_PUBLIC_APP_VERSION || "unknown",
      gitSha: process.env.NEXT_PUBLIC_GIT_SHA || "unknown",
      buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || "unknown",
      source: "pages",
    };
    console.info("[CodeDestiny] build", build);
    // 개발자가 콘솔에 `__cdBuild` 만 쳐도 지금 보고 있는 화면이 어느 커밋인지 알 수 있게 한다.
    // 정적 셸(홈)에는 React 가 없으므로 그쪽 확인 지점은 /version.json 이고, 값은 같은 SHA 다.
    (window as unknown as { __cdBuild?: typeof build }).__cdBuild = build;
  }, []);

  return null;
}
