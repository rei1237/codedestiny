"use client";

import Image from 'next/image';
import { useEffect } from 'react';
import styles from './home-install-entry.module.css';

function refresh() {
  const lifecycle = (window as Window & {__cdPwaLifecycle?: {refreshInstallControls?: () => void}}).__cdPwaLifecycle;
  lifecycle?.refreshInstallControls?.();
}

export default function HomeInstallEntry() {
  useEffect(() => {
    refresh();
    window.addEventListener('cd:pwa-ready', refresh);
    return () => window.removeEventListener('cd:pwa-ready', refresh);
  }, []);
  return <>
    <aside className={styles.entry} data-pwa-install-entry hidden aria-label="홈 화면에 추가">
      <Image src="/icons/moonlight-garden-v1-192.png" alt="" width={48} height={48}/>
      <div><strong>다음에도 바로 찾아오세요</strong><p>홈 화면의 아이콘으로 꿀꿀 운세를 열어요.</p></div>
      <button type="button" data-pwa-install>홈 화면에 추가하기</button>
    </aside>
  </>;
}
