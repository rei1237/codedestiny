"use client";
import {useEffect, useRef, useState} from 'react';
import Image from 'next/image';
import {ENTRY_SKIP_KEY, startServiceEntry} from '@/lib/ui/service-entry-lifecycle.mjs';
import '@/styles/service-entry-scene.css';

export default function ServiceEntryScene() {
  const [visible, setVisible] = useState(false);
  const dismiss = useRef<() => void>(() => {});
  const scene = useRef<HTMLElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => { dismiss.current = startServiceEntry(window, 'yeongnyangi', () => setVisible(true), () => {
      const focusedInside = !!scene.current?.contains(document.activeElement);
      setVisible(false);
      if (focusedInside) {
        const heading = document.querySelector<HTMLElement>('.ynOriginal h1');
        if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({preventScroll: true}); }
      }
    });
    });
    return () => { cancelAnimationFrame(frame); dismiss.current(); };
  }, []);
  if (!visible) return null;
  return <section ref={scene} className="cd-entry-scene cd-entry-scene--night" data-yn-night lang="ko" data-cd-no-trans aria-label="운세보는 영냥이 진입 화면" onKeyDown={event => {if (event.key === 'Escape') dismiss.current();}}>
    <header className="cd-entry-scene__header"><a className="cd-entry-scene__back" href="/" aria-label="서비스 선택으로 돌아가기">‹</a><span>달빛 점술방</span><span className="cd-entry-scene__seal" aria-hidden="true">☾</span></header>
    <div className="cd-entry-scene__title">
      <svg className="cd-entry-scene__ornament" viewBox="0 0 80 28" aria-hidden="true"><path d="M0 16c18 0 22-14 34-6M80 16C62 16 58 2 46 10M0 21c16 0 25-8 31-7M80 21c-16 0-25-8-31-7M40 4c-8 6-8 12 0 18C48 16 48 10 40 4ZM31 10c0 9 3 12 9 12-1-7-4-11-9-12ZM49 10c0 9-3 12-9 12 1-7 4-11 9-12Z"/></svg>
      <p className="cd-entry-scene__brand">운세보는 영냥이</p><p className="cd-entry-scene__heading">네 이야기를<br/>들려줘.</p><p className="cd-entry-scene__intro">별빛 아래, 차분히 함께 풀어볼게.</p>
    </div>
    <picture className="cd-entry-scene__picture"><source type="image/webp" srcSet="/assets/service-intro/cat-reading-entry-480.webp 480w, /assets/service-intro/cat-reading-entry-720.webp 720w" sizes="(max-width: 500px) 90vw, 450px"/><Image className="cd-entry-scene__art" src="/assets/service-intro/cat-reading-entry-480.webp" alt="책장을 넘기는 흰 마법사 고양이 영냥이" width={480} height={384} sizes="(max-width: 500px) 90vw, 450px" priority/></picture>
    <div className="cd-entry-scene__footer"><p className="cd-entry-scene__status" role="status" aria-live="polite">달빛 점술방을 준비하고 있어요</p><button type="button" className="cd-entry-scene__enter" onClick={() => dismiss.current()}>바로 들어가기 <span aria-hidden="true">→</span></button><label className="cd-entry-scene__preference"><input type="checkbox" onChange={event => {try {if (event.target.checked) localStorage.setItem(ENTRY_SKIP_KEY, '1'); else localStorage.removeItem(ENTRY_SKIP_KEY);} catch {} if (event.target.checked) dismiss.current();}}/> 다음부터 연출 건너뛰기</label></div>
  </section>;
}
