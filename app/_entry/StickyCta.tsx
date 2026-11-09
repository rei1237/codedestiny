'use client';

import { useEffect, useState } from 'react';
import styles from './entry-webtoon.module.css';

/**
 * 상단 고정 CTA. watchId 컷이 화면 위로 완전히 지나가면 보이고, 다시 올라오면 숨는다.
 * IntersectionObserver가 없으면 숨긴 채 둔다(히어로·초대 CTA가 HTML로 남아 있다).
 */
export default function StickyCta({ label, href, watchId }: { label: string; href: string; watchId: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const target = document.getElementById(watchId);
    if (!target || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(entries => {
      const entry = entries[entries.length - 1];
      if (entry) setVisible(!entry.isIntersecting && entry.boundingClientRect.bottom <= 0);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [watchId]);
  return <div className={styles.sticky} data-visible={visible ? 'true' : 'false'}>
    <a data-entry-cta="" data-position="sticky" className={styles.stickyLink} href={href}
      tabIndex={visible ? undefined : -1} aria-hidden={visible ? undefined : true}>
      {label}<span aria-hidden="true"> →</span>
    </a>
  </div>;
}
