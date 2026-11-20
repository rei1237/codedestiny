"use client";
// 홈 `/` "지금 많이 찾는 상담 TOP5". 그리기·요청·분석은 js/core/popular-top5.mjs 가 맡고, 여기서는
// 자리(높이)를 미리 잡아 두고 실패하면 자리째 치운다. 렌더 차단 CSS 를 늘리지 않으려고 스타일은 모듈이 늦게 넣는다.
import { useEffect, useRef, useState } from 'react';

const RESERVED_STYLE = { boxSizing: 'border-box' as const, minHeight: 452, maxWidth: 640, margin: '24px auto' };

export default function PopularTop5() {
  const ref = useRef<HTMLElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // 개발 모드 이중 실행에서도 한 번만 채운다 — 두 번째 호출은 'loading' 을 보고 바로 false 를 돌려주므로
    // 숨김 판단은 모듈이 남긴 'failed' 표식으로만 한다.
    import('@/js/core/popular-top5.mjs')
      .then((module) => module.mountPopularTop5(node, { surface: 'home', removeOnFail: false }))
      .then((ok) => { if (!ok && node.dataset.cdPop5State === 'failed') setHidden(true); })
      .catch(() => setHidden(true));
  }, []);

  if (hidden) return null;
  return <section ref={ref} className="cd-pop5" style={RESERVED_STYLE} data-cd-no-trans data-cd-korean-only aria-label="지금 많이 찾는 상담 TOP5" />;
}
