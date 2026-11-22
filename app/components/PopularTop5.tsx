"use client";
// 홈 `/` "지금 많이 찾는 상담 TOP5". 그리기·요청·분석은 js/core/popular-top5.mjs 가 맡는다.
// 즉시 표시(2026-11-22): 정적 CSS(styles/popular-top5.css)와 SSR 스켈레톤으로 첫 페인트부터 예화 프레임을 보이고,
// 모듈은 동적 import 없이 바로 마운트한다. 실패하면 자리째 치운다.
import { useEffect, useRef, useState } from 'react';
import { mountPopularTop5, popularTop5SkeletonHtml } from '@/js/core/popular-top5.mjs';
import '@/styles/popular-top5.css';

const SKELETON = { __html: popularTop5SkeletonHtml() };

export default function PopularTop5() {
  const ref = useRef<HTMLElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // 개발 모드 이중 실행에서도 한 번만 채운다 — 두 번째 호출은 'loading' 을 보고 바로 false 를 돌려주므로
    // 숨김 판단은 모듈이 남긴 'failed' 표식으로만 한다.
    mountPopularTop5(node, { surface: 'home', removeOnFail: false })
      .then((ok) => { if (!ok && node.dataset.cdPop5State === 'failed') setHidden(true); })
      .catch(() => setHidden(true));
  }, []);

  if (hidden) return null;
  // 스켈레톤은 서버에서 한 번만 그리고, 이후 자식은 모듈이 바꾼다(React 는 다시 그리지 않는다).
  return <section ref={ref} className="cd-pop5" data-cd-no-trans data-cd-korean-only aria-label="지금 많이 찾는 상담 TOP5" dangerouslySetInnerHTML={SKELETON} suppressHydrationWarning />;
}
