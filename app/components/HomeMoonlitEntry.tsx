"use client";
import Link from 'next/link';
import {ArrowRight,BookOpen} from 'lucide-react';
import {useLocale} from '@/lib/i18n/useT';
import {MOONLIT_ENTRY_COPY} from '../moonlit-lotus/_lib/entry-copy';
import {MOONLIT_LOTUS_ENABLED} from '../moonlit-lotus/_lib/config';
import styles from './HomeMoonlitEntry.module.css';
export default function HomeMoonlitEntry(){
 const locale=useLocale()==='ja'?'ja':'ko',copy=MOONLIT_ENTRY_COPY[locale];
 if(!MOONLIT_LOTUS_ENABLED)return null;
 return <><Link href={locale==='ja'?'/moonlit-lotus/?lang=ja':'/moonlit-lotus/'} className={styles.entry} data-moonlit-entry lang={locale} data-cd-no-trans>
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <img src="/assets/moonlit-lotus/entry-v1/yeoni-768.webp" srcSet="/assets/moonlit-lotus/entry-v1/yeoni-480.webp 480w, /assets/moonlit-lotus/entry-v1/yeoni-768.webp 768w" sizes="(max-width:600px) calc(100vw - 56px), 336px" width={768} height={512} loading="lazy" decoding="async" alt={copy.image}/>
  <span className={styles.copy}><strong>{copy.title}</strong><span>{copy.description}</span><em className={styles.invite}>{locale==='ja'?'今日の気持ちを、そっとほどいて。':'오늘의 마음을 조용히 내려놓아요.'}</em><b>{copy.action}<ArrowRight size={18} aria-hidden="true"/></b></span>
 </Link><Link href="/moonlit-lotus/story/" className={styles.storyLink} lang="ko" data-cd-no-trans><BookOpen size={18} aria-hidden="true"/><span>열심히 살아온 나에게, 잠깐의 달빛<small>연이의 15컷 웹툰 읽기</small></span><ArrowRight size={17} aria-hidden="true"/></Link></>;
}
