"use client";

import Image from 'next/image';
import { Smartphone, Download } from 'lucide-react';
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
    <aside className={styles.entry} aria-label="홈 화면에 추가">
      <Image src="/icons/moonlight-garden-v1-192.png" alt="" width={64} height={64}/>
      <div><strong>다음에도 바로 찾아오세요</strong><p>홈 화면의 아이콘으로 꿀꿀 운세를 열어요.</p></div>
      <div className={styles.actions}>
        <span data-pwa-install-entry hidden><button type="button" data-pwa-install><Smartphone size={18} aria-hidden="true" />홈 화면에 추가</button></span>
        <a href="https://play.google.com/store/apps/details?id=com.codedestiny.app"><Download size={18} aria-hidden="true" />Google Play에서 받기</a>
      </div>
    </aside>
  </>;
}
