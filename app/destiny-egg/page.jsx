'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';

const DestinyEgg = dynamic(() => import('../../destiny_egg'), { ssr: false });

export default function DestinyEggPage() {
  useEffect(() => {
    // PWA manifest 동적 주입
    const existing = document.querySelector('link[data-egg-manifest]');
    if (!existing) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = '/manifest-egg.json';
      link.setAttribute('data-egg-manifest', '1');
      document.head.appendChild(link);
    }
    // theme-color 조정
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    const prevTheme = metaTheme?.getAttribute('content');
    if (metaTheme) metaTheme.setAttribute('content', '#f4a7c3');
    // 서비스 워커 등록 (캐싱으로 오프라인 지원)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw-egg.js').catch(() => {});
    }
    return () => {
      // 페이지 이탈 시 복원
      document.querySelector('link[data-egg-manifest]')?.remove();
      if (metaTheme && prevTheme) metaTheme.setAttribute('content', prevTheme);
    };
  }, []);

  return <DestinyEgg />;
}

