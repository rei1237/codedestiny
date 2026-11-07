'use client';

import { useState } from 'react';
import { freeEntryHref, type HOME_CONCERNS } from '@/lib/marketing/home-concerns.mjs';
import styles from './entry-webtoon.module.css';

const STORAGE_KEY = 'cd:home-concern';

/**
 * 고민 칩. 고르면 화면의 모든 진입 CTA([data-entry-cta]) 주소에 concern을 싣고 sessionStorage에 남긴다.
 * 저장은 실패해도 된다(사파리 사생활 보호 등). 주소 교체가 먼저이고 저장 예외는 삼킨다.
 */
export default function ConcernPicker({ concerns, ctaHrefBase }: { concerns: typeof HOME_CONCERNS; ctaHrefBase: 'entry_webtoon' }) {
  const [selected, setSelected] = useState<string | null>(null);
  const choose = (id: string) => {
    setSelected(id);
    const href = freeEntryHref(id, ctaHrefBase);
    document.querySelectorAll('a[data-entry-cta]').forEach(anchor => anchor.setAttribute('href', href));
    try {
      window.sessionStorage.setItem(STORAGE_KEY, id);
    } catch {
      // 저장소를 못 써도 CTA 주소에 concern이 이미 실렸으니 그대로 진행한다.
    }
  };
  const picked = concerns.find(concern => concern.id === selected);
  return <div className={styles.concerns}>
    <div className={styles.chips} role="group" aria-label="궁금한 고민 고르기">
      {concerns.map(concern => <button key={concern.id} type="button" className={styles.chip} data-concern={concern.id}
        aria-pressed={selected === concern.id} onClick={() => choose(concern.id)}>{concern.label}</button>)}
    </div>
    <p className={styles.chipStatus} aria-live="polite">{picked ? `${picked.label} 이야기부터 들려 드릴게요.` : ''}</p>
  </div>;
}
