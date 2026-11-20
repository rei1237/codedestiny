'use client';

// 캐릭터 웹툰 결과의 연출 래퍼(4단계, docs/context/narrator-webtoon-result-spec.md N1~N7).
// CutReader 는 서버 컴포넌트로도 쓰이므로 손대지 않고, 움직임·읽기 설정·이벤트·그림 대체는 여기서만 한다.
// - 글로만 보기·글자 크기: 이 기기 브라우저에만 저장(try/catch, 실패해도 기본값으로 정상 표시).
// - 움직임: reduced-motion 이 아니고 IntersectionObserver 가 있을 때만 컷 fade-up(18px)·대사 순차 등장. 타이핑 효과 없음(N7).
// - result_cut_view: 컷마다 화면의 50% 이상 보일 때 한 번. result_text_only_toggle: 토글할 때.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import CutReader, { type WebtoonCut } from './CutReader';
import styles from './narrator-webtoon.module.css';
import { usePrefersReducedMotion } from '@/app/hooks/usePrefersReducedMotion';
import { trackEvent } from '@/lib/analytics';

export const WEBTOON_TEXT_ONLY_KEY = 'cd:webtoon:text-only:v1';
export const WEBTOON_FONT_KEY = 'cd:webtoon:font:v1';

export type NarratorWebtoonLabels = {
  toolbar: string; textOnly: string; fontSize: string; fontBase: string; fontLarge: string; reader: string; progress: string;
};

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

function advanceFallback(img: HTMLImageElement) {
  const rest = (img.getAttribute('data-fallbacks') || '').split(' ').filter(Boolean);
  const next = rest.shift();
  if (!next) return;
  if (rest.length) img.setAttribute('data-fallbacks', rest.join(' '));
  else img.removeAttribute('data-fallbacks');
  img.src = next;
}

export default function NarratorWebtoon({ cuts, narrator, flowId, labels }: {
  cuts: WebtoonCut[]; narrator: 'yeoni' | 'yeongnyangi'; flowId: string; labels: NarratorWebtoonLabels;
}) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const [textOnly, setTextOnly] = useState(false);
  const [large, setLarge] = useState(false);
  const [progress, setProgress] = useState(0);
  const seen = useRef(new Set<string>());

  useEffect(() => {
    try {
      setTextOnly(window.localStorage.getItem(WEBTOON_TEXT_ONLY_KEY) === '1');
      setLarge(window.localStorage.getItem(WEBTOON_FONT_KEY) === 'large');
    } catch { /* 저장소 차단: 기본값 */ }
  }, []);

  const toggleTextOnly = () => {
    const next = !textOnly;
    setTextOnly(next);
    try { window.localStorage.setItem(WEBTOON_TEXT_ONLY_KEY, next ? '1' : '0'); } catch { /* 이번 화면에만 적용 */ }
    trackEvent('result_text_only_toggle', { flow_id: flowId, on: next });
  };
  const chooseFont = (value: boolean) => {
    setLarge(value);
    try { window.localStorage.setItem(WEBTOON_FONT_KEY, value ? 'large' : 'base'); } catch { /* 이번 화면에만 적용 */ }
  };

  // 움직임은 그리기 전에 켠다(깜빡임 방지). 줄인 움직임이거나 관찰자가 없으면 켜지 않아 모든 컷이 바로 보인다.
  useIsoLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const prefersReduced = reduced || (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (prefersReduced || typeof IntersectionObserver === 'undefined') el.removeAttribute('data-motion');
    else el.setAttribute('data-motion', '');
  }, [reduced]);

  // 컷 등장 + 50% 노출 이벤트.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const items = Array.from(el.querySelectorAll<HTMLElement>('li[data-cut-index]'));
    if (typeof IntersectionObserver === 'undefined') {
      items.forEach((item) => item.setAttribute('data-in', ''));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const item = entry.target as HTMLElement;
        if (entry.intersectionRatio > 0.12) item.setAttribute('data-in', '');
        const index = Number(item.dataset.cutIndex);
        const kind = item.dataset.kind || '';
        const key = `${index}-${kind}`;
        // 컷이 화면보다 길면 50% 를 못 넘으므로 화면의 절반을 채운 경우도 본 것으로 센다.
        const fills = entry.intersectionRect.height >= (entry.rootBounds?.height ?? window.innerHeight) * 0.5;
        if ((entry.intersectionRatio >= 0.5 || fills) && !seen.current.has(key)) {
          seen.current.add(key);
          trackEvent('result_cut_view', { flow_id: flowId, cut_index: index, cut_kind: kind });
        }
      }
    }, { threshold: [0, 0.12, 0.5, 1] });
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [cuts, flowId]);

  // 그림 대체: 축소본 → 원본 → 공개 덱. 효과가 붙기 전에 이미 실패한 그림도 넘긴다.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const onError = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLImageElement && target.hasAttribute('data-fallbacks')) advanceFallback(target);
    };
    el.addEventListener('error', onError, true);
    el.querySelectorAll<HTMLImageElement>('img[data-fallbacks]').forEach((img) => {
      if (img.complete && img.naturalWidth === 0) advanceFallback(img);
    });
    return () => el.removeEventListener('error', onError, true);
  }, [cuts]);

  // 읽은 정도(장식 막대, 스크린리더에는 값으로 알린다).
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = root.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const span = Math.max(1, rect.height - window.innerHeight * 0.5);
      setProgress(Math.min(1, Math.max(0, (window.innerHeight * 0.5 - rect.top) / span)));
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return <div ref={root} className={styles.root} data-narrator={narrator}
    {...(narrator === 'yeongnyangi' ? { 'data-yn-night': '' } : {})}
    data-text-only={textOnly ? '' : undefined} data-font={large ? 'large' : 'base'}>
    <div className={styles.toolbar} role="toolbar" aria-label={labels.toolbar}>
      <button type="button" className={styles.tool} aria-pressed={textOnly} onClick={toggleTextOnly}>{labels.textOnly}</button>
      <span className={styles.fontGroup} role="group" aria-label={labels.fontSize}>
        <button type="button" className={styles.tool} aria-pressed={!large} onClick={() => chooseFont(false)}>{labels.fontBase}</button>
        <button type="button" className={styles.tool} aria-pressed={large} onClick={() => chooseFont(true)}>{labels.fontLarge}</button>
      </span>
      <span className={styles.progress} role="progressbar" aria-label={labels.progress}
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
        <span className={styles.progressFill} style={{ transform: `scaleX(${progress})` }} />
      </span>
    </div>
    <CutReader cuts={cuts} tone="guided" eager={1} label={labels.reader} />
  </div>;
}
