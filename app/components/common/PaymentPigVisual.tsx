"use client";

import { useState } from "react";
import { getAssetUrlFromPublicPath } from "@/lib/r2-public-url";
import type { LoadingMotionTone } from "./LoadingProgressMotion";

// 결제/이용권 대기 화면 꽃돼지 로고는 R2 에셋 한 곳에서만 관리한다.
// 찻집 assets.ts와 동일한 prefix:"" 규칙 → https://assets.code-destiny.com/DestinyCafe/nobackground/꽃돼지3-Photoroom.png
const PAYMENT_PIG_PUBLIC_PATH = "/DestinyCafe/nobackground/꽃돼지3-Photoroom.png";

export const PAYMENT_PIG_LOGO_URL = getAssetUrlFromPublicPath(PAYMENT_PIG_PUBLIC_PATH, {
  fallbackPublicPath: PAYMENT_PIG_PUBLIC_PATH,
  prefix: "",
});

// 로딩 실패 폴백은 다른 이미지로 대체하지 않고 동일 에셋을 캐시버스트로 1회 재요청한다.
const PAYMENT_PIG_LOGO_FALLBACK_URL =
  `${PAYMENT_PIG_LOGO_URL}${PAYMENT_PIG_LOGO_URL.includes("?") ? "&" : "?"}retry=1`;

export function PaymentPigVisual({
  tone = "payment",
  className = "",
}: {
  tone?: LoadingMotionTone;
  className?: string;
}) {
  const isPassTone = tone === "pass";
  const isResultTone = tone === "result";
  const [logoSrc, setLogoSrc] = useState(PAYMENT_PIG_LOGO_URL);

  return (
    <div
      className={`saju-loader-visual relative mx-auto mb-4 h-[132px] w-[132px] sm:h-[148px] sm:w-[148px] ${className}`}
      data-react-pig-visual={tone}
      aria-hidden="true"
    >
      <div className="saju-loader-payment-core absolute inset-0 rounded-[32px] border border-white/15 bg-[linear-gradient(145deg,rgba(15,23,42,.76),rgba(30,41,59,.46))] shadow-[0_0_48px_rgba(251,191,36,.18),inset_0_1px_0_rgba(255,255,255,.18)]">
        <span className="absolute -inset-3 rounded-[38px] border border-white/10 motion-safe:animate-spin motion-reduce:animate-none" style={{ animationDuration: isPassTone ? "10.8s" : "12s" }} />
        <span className="absolute inset-3 rounded-[28px] border border-cyan-200/20 border-t-amber-200/80 motion-safe:animate-spin motion-reduce:animate-none" style={{ animationDirection: "reverse", animationDuration: isPassTone ? "5.4s" : "4.2s" }} />
        <span className="absolute inset-6 rounded-[22px] bg-[radial-gradient(circle,rgba(254,243,199,.26),rgba(251,191,36,.08)_44%,transparent_70%)] motion-safe:animate-pulse motion-reduce:animate-none" />
      </div>
      <div className={`saju-loader-pass-moon absolute -right-1 top-5 h-11 w-11 rounded-full border border-amber-100/40 bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,.86),rgba(254,243,199,.72)_32%,rgba(251,191,36,.18)_72%,transparent)] shadow-[0_0_22px_rgba(254,243,199,.32)] transition-opacity ${isPassTone ? "opacity-100" : "opacity-60"}`} />
      <div
        className={`saju-loader-yeon-sprite absolute inset-[18px] overflow-hidden rounded-[28px] bg-white/80 drop-shadow-[0_16px_24px_rgba(86,47,21,.24)] ${isResultTone ? "motion-safe:animate-bounce" : "motion-safe:animate-pulse"} motion-reduce:animate-none`}
        style={{
          animationDuration: isResultTone ? "1.4s" : "2.8s",
        }}
      >
        <img
          src={logoSrc}
          alt=""
          width={112}
          height={112}
          loading="eager"
          decoding="async"
          className="h-full w-full object-contain"
          onError={() => {
            if (logoSrc !== PAYMENT_PIG_LOGO_FALLBACK_URL) setLogoSrc(PAYMENT_PIG_LOGO_FALLBACK_URL);
          }}
        />
      </div>
    </div>
  );
}
