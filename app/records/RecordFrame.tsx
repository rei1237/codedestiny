"use client";
import type { ReactNode } from 'react';
import { Archive, ArrowLeft, MessageCircleHeart } from 'lucide-react';
import { useLocale } from '@/lib/i18n/useT';
import { recordsCopy } from '@/lib/records/copy';
import styles from './records.module.css';
import neoTheme from '@/src/features/neo-war-room/neo-operation-room-result.module.css';
export const recordButton = styles.button;
export default function RecordFrame({ title, lead, children, view = 'library', reading = '' }: { title: string; lead?: string; children: ReactNode; view?: 'library' | 'hub' | 'result'; reading?: string }) {
  const c = recordsCopy(useLocale());
  return <main className={`${styles.page} ${view === 'library' ? styles.lightFrame : `${neoTheme.savedDocuments} ${styles.nightFrame}`}`} data-record-view={view} data-reading-family={reading || undefined}>
    <div className={styles.frame}>
      <nav className={styles.navigation} aria-label={title}>
        <a className={styles.back} href={view === 'result' ? '/records/' : '/ggulggul/'}><ArrowLeft size={18} aria-hidden />{view === 'result' ? c.back : c.home}</a>
        <a className={styles.back} href={view === 'hub' ? '/records/' : '/consultations/'}>{view === 'hub' ? <Archive size={18} aria-hidden /> : <MessageCircleHeart size={18} aria-hidden />}{view === 'hub' ? c.title : c.hub}</a>
      </nav>
      <header className={styles.heading}>
        <div><h1>{title}</h1>{lead && <p>{lead}</p>}</div>
        {view === 'library' && <img src="/images/yeoni/garden/yeoni-library-moonlight-v1-640.webp" srcSet="/images/yeoni/garden/yeoni-library-moonlight-v1-640.webp 640w, /images/yeoni/garden/yeoni-library-moonlight-v1-960.webp 960w" sizes="(max-width: 680px) 100vw, 460px" alt="" width="640" height="427" className={styles.libraryArt} />}
        <span className={styles.flower} aria-hidden="true" />
      </header>
      {children}
    </div>
  </main>;
}
