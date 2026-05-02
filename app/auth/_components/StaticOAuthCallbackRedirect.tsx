"use client";

import { useEffect } from "react";

type StaticOAuthCallbackRedirectProps = {
  provider: "google" | "naver" | "kakao";
};

export default function StaticOAuthCallbackRedirect({ provider }: StaticOAuthCallbackRedirectProps) {
  const baseTarget = `/api/auth/oauth/${provider}/callback`;

  useEffect(() => {
    const query = window.location.search || "";
    window.location.replace(`${baseTarget}${query}`);
  }, [baseTarget]);

  return (
    <main style={{ padding: "24px", fontFamily: "sans-serif" }}>
      <p>Redirecting to social login callback...</p>
      <p>
        If you are not redirected, continue to <a href={baseTarget}>callback</a>.
      </p>
    </main>
  );
}
