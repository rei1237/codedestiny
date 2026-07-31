"use client";

/**
 * 모바일 하단 고정 CTA — 스크롤해도 금액이 사라지지 않게 한다.
 *
 * 🔴 중첩 사전검사: 배경음 토글(.bgmToggle)이 이미 우하단 fixed(z-70)로 떠 있다.
 *    새 오버레이를 겹쳐 얹지 않고, codex.module.css 의 모바일 미디어쿼리가 토글의
 *    bottom 을 이 바 높이만큼 밀어 올린다. 여기서 z-index 를 더 올리지 말 것.
 *
 * 금액은 PriceBadge(서버 조회)만 쓴다.
 */

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { PriceBadge } from "@/app/components/PriceBadge";
import styles from "../styles/codex.module.css";

/** 바가 문서 마지막 줄을 덮지 않도록 그만큼 아래를 비워 둔다(CodexShell 의 body overflow 관례와 같은 방식). */
const MOBILE_QUERY = "(max-width: 767px)";
const BAR_CLEARANCE = "104px";

interface CodexFloatingCtaProps {
  featureKey: string;
  fallbackCoins: number;
  label: string;
  onClick: () => void;
  busy?: boolean;
  busyLabel?: string;
}

export default function CodexFloatingCta({
  featureKey,
  fallbackCoins,
  label,
  onClick,
  busy = false,
  busyLabel = "",
}: CodexFloatingCtaProps) {
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const media = window.matchMedia(MOBILE_QUERY);
    const apply = () => {
      document.body.style.paddingBottom = media.matches ? BAR_CLEARANCE : "";
    };
    apply();
    media.addEventListener("change", apply);
    return () => {
      media.removeEventListener("change", apply);
      document.body.style.paddingBottom = "";
    };
  }, []);

  return (
    <div className={`${styles.floatingBar} md:hidden`}>
      <div className="min-w-0 flex-1">
        <p
          className={`${styles.numeral} text-[0.625rem]`}
          style={{ letterSpacing: "0.2em", color: "var(--codex-gold-dim)" }}
        >
          PREMIUM CONSULTATION
        </p>
        <PriceBadge
          featureKey={featureKey}
          fallbackCoins={fallbackCoins}
          className={`${styles.numeral} block text-[1.25rem] leading-tight`}
        />
      </div>
      <button type="button" onClick={onClick} disabled={busy} className={`${styles.cta} shrink-0`}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {busy ? busyLabel || label : label}
      </button>
    </div>
  );
}
