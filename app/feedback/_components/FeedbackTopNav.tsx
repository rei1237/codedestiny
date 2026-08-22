"use client";

import { useCallback } from "react";
import { ArrowLeft, Home } from "lucide-react";

import { hardNavigateToShellHome } from "@/lib/navigation/shellHome";
import { useFeedbackCopy } from "../_lib/copy";
import { INK } from "../_lib/styles";

/**
 * 제보실 전용 상단 내비.
 *
 * 공용 FeatureBackHomeNav 는 `bg-slate-950/62 text-white` 로 어두운 기능 페이지 전용이다.
 * 다른 몰입형 라우트는 전부 다크 배경이지만 이 화면만 밝은 크림 배경이라 뒤로가기 버튼이
 * 배경에 묻혔다. 공용 컴포넌트를 고치면 나머지 몰입형 페이지가 함께 바뀌므로
 * `/feedback` 을 FEATURE_NAV_SELF_MANAGED_ROUTES 에 넣고 여기서 밝은 배경용으로 그린다.
 */
export default function FeedbackTopNav() {
  const copy = useFeedbackCopy();
  const goBack = useCallback(() => {
    if (typeof window === "undefined") return;
    // 히스토리가 없으면(새 탭·딥링크) 홈으로. 홈은 정적 셸이라 문서 로드로 보낸다.
    if (window.history.length <= 1) {
      hardNavigateToShellHome();
      return;
    }
    const startPath = `${window.location.pathname}${window.location.search}`;
    window.history.back();
    // SPA 라우팅이라 back 이 먹히지 않는 경우가 있어 짧게 확인 후 홈으로 폴백한다.
    window.setTimeout(() => {
      if (`${window.location.pathname}${window.location.search}` === startPath) hardNavigateToShellHome();
    }, 240);
  }, []);

  const buttonClass = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-[rgba(216,63,120,0.28)] bg-white/80 px-4 text-[13px] font-bold text-[#8e1240] shadow-[0_6px_18px_rgba(120,20,60,0.10)] backdrop-blur-md transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b31955] focus-visible:ring-offset-2 dark:border-white/16 dark:bg-white/[0.08] dark:text-[#e6dcff] dark:shadow-[0_6px_18px_rgba(4,2,12,0.4)] dark:hover:bg-white/[0.14] dark:focus-visible:ring-[#c4b5fd] dark:focus-visible:ring-offset-[#0a0818]";

  return (
    <nav aria-label={copy.topNavAriaLabel} className="flex items-center gap-2">
      <button type="button" onClick={goBack} className={`${buttonClass} min-w-11 px-3`} aria-label={copy.backButtonAriaLabel}>
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        <span className={`hidden sm:inline ${INK}`}>{copy.backButtonLabel}</span>
      </button>
      <button type="button" onClick={() => hardNavigateToShellHome()} className={buttonClass}>
        <Home aria-hidden="true" className="h-4 w-4" />
        {copy.homeButtonLabel}
      </button>
    </nav>
  );
}
