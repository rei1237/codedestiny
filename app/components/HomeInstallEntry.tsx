"use client";

import Image from 'next/image';
import { Smartphone, Download } from 'lucide-react';
import { useEffect } from 'react';
import styles from './home-install-entry.module.css';

function refresh() {
  const lifecycle = (window as Window & {__cdPwaLifecycle?: {refreshInstallControls?: () => void}}).__cdPwaLifecycle;
  lifecycle?.refreshInstallControls?.();
}

// pwa-lifecycle.js is a deferred script that may toggle [data-pwa-install-entry]/[data-pwa-install]
// `hidden` before React hydrates, which caused a hydration attribute mismatch. The server markup
// carries neutral markers, and the lifecycle hooks are attached only after mount.
function attachLifecycleHooks() {
  const doc = window.document;
  doc.querySelectorAll('[data-home-install-entry]').forEach(el => el.setAttribute('data-pwa-install-entry', ''));
  doc.querySelectorAll('[data-home-install-button]').forEach(el => el.setAttribute('data-pwa-install', ''));
}

export default function HomeInstallEntry() {
  useEffect(() => {
    attachLifecycleHooks();
    refresh();
    window.addEventListener('cd:pwa-ready', refresh);
    return () => window.removeEventListener('cd:pwa-ready', refresh);
  }, []);
  return <>
    <aside className={styles.entry} aria-label="홈 화면에 추가">
      <Image src="/icons/moonlight-garden-v1-192.png" alt="" width={64} height={64}/>
      <div><strong>다음에도 바로 찾아오세요</strong><p>홈 화면의 아이콘으로 꿀꿀 운세를 열어요.</p></div>
      <div className={styles.actions}>
        <span data-home-install-entry hidden><button type="button" data-home-install-button><Smartphone size={18} aria-hidden="true" />홈 화면에 추가</button></span>
        <a href="https://play.google.com/store/apps/details?id=com.codedestiny.app"><Download size={18} aria-hidden="true" />Google Play에서 받기</a>
      </div>
    </aside>
  </>;
}
