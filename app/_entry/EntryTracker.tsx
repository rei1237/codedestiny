'use client';

import { useEffect, useRef } from 'react';
import { trackEvent } from '@/lib/analytics';
import { normalizeConcern } from '@/lib/marketing/home-concerns.mjs';

const MARKS = [25, 50, 75, 100] as const;
const POSITIONS = new Set(['hero', 'sticky', 'invite', 'skip']);

// 지금 화면의 진입 CTA 주소(고민 칩이 갈아 끼운다)에서 고민을 읽는다. 허용 목록 밖이면 'none'.
function currentConcern(): string {
  try {
    const href = document.querySelector('a[data-entry-cta]')?.getAttribute('href') || '';
    return normalizeConcern(new URL(href, window.location.href).searchParams.get('concern')) ?? 'none';
  } catch {
    return 'none';
  }
}

/**
 * 진입 웹툰 계측: 화면 조회 1회, 스크롤 25/50/75/100% 각 1회, 진입 CTA·건너뛰기 클릭.
 * 렌더 결과는 없다. 링크 이동은 막지 않는다(클릭은 문서 위임으로만 듣는다). 계측 예외는 모두 삼킨다.
 */
export default function EntryTracker() {
  const viewed = useRef(false);
  const marks = useRef(new Set<number>());

  useEffect(() => {
    if (!viewed.current) {
      viewed.current = true;
      try {
        trackEvent('entry_webtoon_view');
      } catch {
        // 계측 실패는 화면에 영향을 주지 않는다.
      }
    }
    const onScroll = () => {
      try {
        const total = document.documentElement.scrollHeight;
        if (!(total > 0)) return;
        const seen = (window.scrollY + window.innerHeight) / total;
        for (const mark of MARKS) {
          if (seen * 100 >= mark - 0.5 && !marks.current.has(mark)) {
            marks.current.add(mark);
            trackEvent('entry_webtoon_progress', { percent: mark });
          }
        }
      } catch {
        // 스크롤 계산 실패는 무시한다.
      }
    };
    const onClick = (event: MouseEvent) => {
      try {
        const link = (event.target as Element | null)?.closest?.('a[data-entry-cta], a[data-entry-skip]');
        if (!link) return;
        const position = link.hasAttribute('data-entry-skip') ? 'skip' : link.getAttribute('data-position') || '';
        if (POSITIONS.has(position)) trackEvent('entry_webtoon_cta_click', { concern: currentConcern(), position });
      } catch {
        // 클릭 계측 실패는 이동에 영향을 주지 않는다.
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('click', onClick);
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('click', onClick);
    };
  }, []);
  return null;
}
