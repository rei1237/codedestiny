"use client";

import Script from "next/script";

const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;

/**
 * Kakao JavaScript SDK — loads after hydration so it does not block first paint.
 * Set NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY (Kakao Developers → 앱 → 앱 키 → JavaScript 키).
 */
export default function KakaoSdk() {
  if (!KAKAO_JS_KEY) return null;

  return (
    <Script
      id="kakao-js-sdk"
      src="https://developers.kakao.com/sdk/js/kakao.min.js"
      strategy="afterInteractive"
      onLoad={() => {
        const Kakao = (window as unknown as { Kakao?: { init: (k: string) => void; isInitialized?: () => boolean } })
          .Kakao;
        if (!Kakao) return;
        if (typeof Kakao.isInitialized === "function" && Kakao.isInitialized()) return;
        Kakao.init(KAKAO_JS_KEY);
      }}
    />
  );
}
