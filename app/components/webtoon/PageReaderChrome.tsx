'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import styles from './page-reader.module.css';

const pad = (n: number) => String(n).padStart(2, '0');

function load(key: string) {
  try { return Number(window.localStorage.getItem(key)) || 0; } catch { return 0; }
}
function save(key: string, value: number | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, String(value));
  } catch { /* 저장소가 막혀 있어도 읽기는 그대로 된다 */ }
}

/** 웹툰 리더의 얇은 상단 메뉴·진행 막대·이어 보기 안내.
 *  아래로 읽으면 메뉴가 숨고, 위로 올리거나 그림을 탭하면 다시 나온다. 처음과 끝에서는 늘 보인다. */
export default function PageReaderChrome({ title, total, backHref, backLabel, storageKey }: {
  title: string; total: number; backHref: string; backLabel: string; storageKey: string;
}) {
  const [page, setPage] = useState(1);
  const [hidden, setHidden] = useState(false);
  const [resume, setResume] = useState(0);
  const progress = useRef<HTMLDivElement>(null);

  // 다시 들어오면 읽던 쪽을 묻는다. 3쪽 미만이거나 끝까지 읽었으면 묻지 않는다.
  useEffect(() => {
    const saved = load(storageKey);
    if (saved >= 3 && saved < total && !window.location.hash) setResume(saved);
  }, [storageKey, total]);

  // 화면 가운데를 지나는 쪽이 지금 쪽이다.
  useEffect(() => {
    const items = Array.from(document.querySelectorAll<HTMLElement>('[data-webtoon-pages] [data-page]'));
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) setPage(Number(entry.target.getAttribute('data-page')));
    }, { rootMargin: '-50% 0px -50% 0px' });
    items.forEach(item => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (page >= total) save(storageKey, null);
    else if (page >= 2) save(storageKey, page);
    if (page > 2) setResume(0);
  }, [page, storageKey, total]);

  // 스크롤 방향으로 메뉴를 숨기거나 보이고, 진행 막대를 채운다.
  useEffect(() => {
    const list = document.querySelector<HTMLElement>('[data-webtoon-pages]');
    if (!list) return;
    let lastY = window.scrollY, frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const top = list.offsetTop, end = top + list.offsetHeight - window.innerHeight;
      const ratio = Math.min(1, Math.max(0, (y - top) / Math.max(1, end - top)));
      progress.current?.style.setProperty('--wr-progress', String(ratio));
      if (y < 80 || y > end) setHidden(false);
      else if (y > lastY + 6) setHidden(true);
      else if (y < lastY - 6) setHidden(false);
      lastY = y;
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    // 그림을 한 번 탭하면 메뉴를 켜고 끈다(확대·링크 동작은 건드리지 않는다).
    const onTap = (event: MouseEvent) => { if ((event.target as HTMLElement).tagName === 'IMG') setHidden(value => !value); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    list.addEventListener('click', onTap);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      list.removeEventListener('click', onTap);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  function jump(n: number) {
    setResume(0);
    document.getElementById(`p-${pad(n)}`)?.scrollIntoView({ block: 'start' });
  }

  return <>
    <header className={styles.bar} data-hidden={hidden ? '' : undefined} onFocus={() => setHidden(false)}>
      <div className={styles.barInner}>
        <a className={styles.back} href={backHref} aria-label={backLabel}><ChevronLeft size={22} aria-hidden="true" /></a>
        <p className={styles.barTitle}>{title}</p>
        <p className={styles.count}><span className={styles.srOnly}>현재 </span>{page}<span aria-hidden="true"> / </span><span className={styles.srOnly}>쪽, 전체 </span>{total}</p>
      </div>
    </header>
    <div ref={progress} className={styles.progress} aria-hidden="true" />
    {resume > 0 && <div className={styles.resume} role="dialog" aria-label="이어 보기">
      <p>{resume}쪽까지 읽었어요. 이어서 볼까요?</p>
      <div>
        <button type="button" onClick={() => setResume(0)}>처음부터</button>
        <button type="button" data-primary="" onClick={() => jump(resume)}>이어 보기</button>
      </div>
    </div>}
  </>;
}
