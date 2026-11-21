"use client";
import Link from 'next/link';
import {useId} from 'react';
import {ArrowRight,BookOpen,Flower2} from 'lucide-react';
import {useLocale} from '@/lib/i18n/useT';
import {MOONLIT_ENTRY_COPY} from '../moonlit-lotus/_lib/entry-copy';
import {MOONLIT_LOTUS_ENABLED} from '../moonlit-lotus/_lib/config';
import styles from './HomeMoonlitEntry.module.css';
const INVITATION={
 ko:{eyebrow:'꽃돼지 연이의 작은 쉼터',welcome:'연이와 함께하는 온라인 절',description:'달빛 드는 작은 절에서 바쁜 마음을 내려놓아요.',features:'가볍게 108배 · 조용히 명상',action:'연이와 쉬러 가기'},
 ja:{eyebrow:'花ぶたヨニの小さな憩いの場',welcome:'ヨニと一緒に、ひと休み',description:'月明かりの小さなお堂で、忙しい心をそっと休めて。',features:'ゆっくり108拝 · 静かな瞑想',action:'ヨニとひと休み'}
};
export default function HomeMoonlitEntry(){
 const locale=useLocale()==='ja'?'ja':'ko',copy=MOONLIT_ENTRY_COPY[locale],invite=INVITATION[locale];
 const titleId=useId(),welcomeId=useId();
 if(!MOONLIT_LOTUS_ENABLED)return null;
 return <><Link href={locale==='ja'?'/moonlit-lotus/?lang=ja':'/moonlit-lotus/'} className={styles.entry} aria-labelledby={`${titleId} ${welcomeId}`} data-moonlit-entry lang={locale} data-cd-no-trans>
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <img src="/assets/moonlit-lotus/entry-v2/yeoni-768.webp" srcSet="/assets/moonlit-lotus/entry-v2/yeoni-480.webp 480w, /assets/moonlit-lotus/entry-v2/yeoni-768.webp 768w" sizes="(max-width:600px) calc(100vw - 54px), 336px" width={768} height={512} loading="lazy" decoding="async" alt={copy.image}/>
  <span className={styles.copy}>
   <span className={styles.eyebrow}><Flower2 size={15} aria-hidden="true"/>{invite.eyebrow}</span>
   <strong id={titleId}>{copy.title}</strong>
   <span id={welcomeId} className={styles.welcome}>{invite.welcome}</span>
   <span className={styles.description}>{invite.description}</span>
   <span className={styles.features}>{invite.features}</span>
   <b>{invite.action}<ArrowRight size={18} aria-hidden="true"/></b>
  </span>
 </Link><Link href="/moonlit-lotus/story/" className={styles.storyLink} lang="ko" data-cd-no-trans><BookOpen size={18} aria-hidden="true"/><span>열심히 살아온 나에게, 잠깐의 달빛<small>연이의 15컷 웹툰 읽기</small></span><ArrowRight size={17} aria-hidden="true"/></Link></>;
}
