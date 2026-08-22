'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { SikojenpovailuProvider, useSikojenpovailuContext } from './SikojenpovailuContext';
import { PhaseWelcoming } from './components/PhaseWelcoming';
import { PhaseRitualPrep } from './components/PhaseRitualPrep';
import { PhaseCasting } from './components/PhaseCasting';
import { PhaseReveal } from './components/PhaseReveal';
import { PhaseSharing } from './components/PhaseSharing';
import { ShadowReading } from './components/ShadowReading';
import { useSikojenPovailuCopy } from './_lib/copy';
import './components/phases.css';

/**
 * Phase 라우터 컴포넌트
 * 현재 Phase에 따라 적절한 컴포넌트를 렌더링합니다
 */
function PhaseRouter() {
  const { currentPhase } = useSikojenpovailuContext();

  switch (currentPhase) {
    case 'welcome':
      return <PhaseWelcoming />;
    case 'ritual-prep':
      return <PhaseRitualPrep />;
    case 'casting':
      return <PhaseCasting />;
    case 'reveal':
      return <PhaseReveal />;
    case 'sharing':
      return <PhaseSharing />;
    case 'shadow':
      return <ShadowReading />;
    default:
      return <PhaseWelcoming />;
  }
}

/**
 * Sikojen Povailu - 핀란드 주석점 앱 (클라이언트 컴포넌트)
 *
 * 페이즈 흐름:
 * 1. Welcome - 환영과 소개
 * 2. Ritual Prep - 카테고리 선택
 * 3. Casting - 주석을 물에 붓기
 * 4. Reveal - 형태 확인 및 의미 해석
 * 5. Sharing - 결과 공유
 * + Shadow - 숨겨진 그림자 의미 (선택)
 */
export default function SikojenpovailuApp() {
  const copy = useSikojenPovailuCopy();
  const router = useRouter();
  const appRef = React.useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const handleClose = React.useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.replace('/index.html');
  }, [router]);

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <SikojenpovailuProvider>
      <div ref={appRef} className="sikojen-app" style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483000,
        width: '100vw',
        minHeight: '100dvh',
        height: '100%',
        display: 'block',
        overflowX: 'hidden',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        overscrollBehaviorY: 'contain',
        touchAction: 'pan-y',
      }}>
        <button
          type="button"
          onClick={handleClose}
          aria-label={copy.appHomeAria}
          style={{
            position: 'fixed',
            top: 'max(12px, env(safe-area-inset-top, 0px) + 8px)',
            right: 'max(12px, env(safe-area-inset-right, 0px) + 8px)',
            zIndex: 2147483001,
            border: '1px solid rgba(255, 255, 255, 0.35)',
            borderRadius: '999px',
            background: 'rgba(10, 8, 24, 0.72)',
            color: '#fff',
            fontSize: '0.92rem',
            fontWeight: 800,
            padding: '10px 14px',
            cursor: 'pointer',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          }}
        >
          {copy.appCloseButton}
        </button>
        <PhaseRouter />
      </div>
    </SikojenpovailuProvider>,
    document.body
  );
}
