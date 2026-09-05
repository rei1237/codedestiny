'use client';

import React from 'react';
import { ArrowLeft, Home } from 'lucide-react';

import { hardNavigateToShellHome } from '@/lib/navigation/shellHome';
import { useSikojenPovailuCopy } from '../_lib/copy';

/**
 * 주석점 전용 상단 내비(뒤로 · 홈).
 *
 * 공용 FeatureBackHomeNav 는 `bg-slate-950/62 text-white` 로 어두운 기능 페이지 전용이다.
 * 이 화면만 밝은 파스텔이라 그 나브가 묻히므로, /feedback 과 같은 이유로
 * FEATURE_NAV_SELF_MANAGED_ROUTES 에 넣고 여기서 밝은 배경용으로 그린다.
 *
 * 이 화면은 테마와 무관하게 항상 파스텔 한 세계라 dark: 변형을 두지 않는다 —
 * 넣으면 다크 모드에서 배경만 파스텔인데 버튼만 어두워진다.
 */
export function SikojenTopNav() {
  const copy = useSikojenPovailuCopy();

  const goBack = React.useCallback(() => {
    if (typeof window === 'undefined') return;
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

  // 44×44 최소 터치 영역은 globals.css 가 button 에 걸어주지만, 여기서도 min-h-11 을 명시해
  // 유틸리티 순서에 관계없이 보장한다.
  const buttonClass =
    'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-[rgba(216,63,120,0.28)] bg-white/80 px-4 text-[13px] font-bold text-[#8e1240] shadow-[0_6px_18px_rgba(120,20,60,0.10)] backdrop-blur-md transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b31955] focus-visible:ring-offset-2';

  return (
    <nav
      aria-label={copy.topNavAriaLabel}
      className="fixed z-[2147483001] flex items-center gap-2"
      style={{
        top: 'max(12px, env(safe-area-inset-top, 0px) + 8px)',
        right: 'max(12px, env(safe-area-inset-right, 0px) + 8px)',
      }}
    >
      <button
        type="button"
        onClick={goBack}
        className={`${buttonClass} min-w-11 px-3`}
        aria-label={copy.backButtonAriaLabel}
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        <span className="hidden sm:inline">{copy.backButtonLabel}</span>
      </button>
      <button type="button" onClick={() => hardNavigateToShellHome()} className={buttonClass}>
        <Home aria-hidden="true" className="h-4 w-4" />
        {copy.homeButtonLabel}
      </button>
    </nav>
  );
}
