'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { SikojenpovailuProvider, useSikojenpovailuContext } from './SikojenpovailuContext';
import { SikojenTopNav } from './components/SikojenTopNav';
import { PhaseWelcoming } from './components/PhaseWelcoming';
import { PhaseRitualPrep } from './components/PhaseRitualPrep';
import { PhaseCasting } from './components/PhaseCasting';
import { PhaseReveal } from './components/PhaseReveal';
import { PhaseSharing } from './components/PhaseSharing';
import { ShadowReading } from './components/ShadowReading';
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
  React.useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // ssr:false 로 로드되므로 첫 렌더부터 document 가 있다. mounted 게이트를 두면
  // 로딩 셸이 사라진 뒤 빈 프레임이 한 번 더 생긴다.
  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <SikojenpovailuProvider>
      <div className="sikojen-app" style={{
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
        <SikojenTopNav />
        <PhaseRouter />
      </div>
    </SikojenpovailuProvider>,
    document.body
  );
}
