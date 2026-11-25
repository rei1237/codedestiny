"use client";
import Link from 'next/link';
import {useId} from 'react';
import {ArrowRight,BookOpen,Flower2} from 'lucide-react';
import {useLocale} from '@/lib/i18n/useT';
import {MOONLIT_ENTRY_COPY} from '../moonlit-lotus/_lib/entry-copy';
import {MOONLIT_LOTUS_ENABLED} from '../moonlit-lotus/_lib/config';
import styles from './HomeMoonlitEntry.module.css';
// 2026-11-25 사용자 요청: "혼자만의 온라인 절 참배"로 공간의 정체를 한눈에 알린다.
const INVITATION={
 ko:{eyebrow:'달빛 드는 작은 법당',welcome:'혼자만의 온라인 절 참배',description:'바쁜 마음을 잠시 내려놓고, 연이와 조용히 쉬어 가요.',features:['108배','명상','긍정 확언'],action:'연화당 참배하러 가기'},
 ja:{eyebrow:'月明かりの小さなお堂',welcome:'ひとりだけのオンライン参拝',description:'忙しい心をそっと下ろして、ヨニと静かにひと休み。',features:['108拝','瞑想','ポジティブな言葉'],action:'蓮華堂へお参りする'}
};
export default function HomeMoonlitEntry(){
 const locale=useLocale()==='ja'?'ja':'ko',copy=MOONLIT_ENTRY_COPY[locale],invite=INVITATION[locale];
 const titleId=useId(),welcomeId=useId();
 if(!MOONLIT_LOTUS_ENABLED)return null;
 return <div className={styles.group}><Link href={locale==='ja'?'/moonlit-lotus/?lang=ja':'/moonlit-lotus/'} className={styles.entry} aria-labelledby={`${titleId} ${welcomeId}`} data-moonlit-entry lang={locale} data-cd-no-trans>
  <span className={styles.art}>
   {/* eslint-disable-next-line @next/next/no-img-element */}
   <img src="/assets/moonlit-lotus/entry-v2/yeoni-768.webp" srcSet="/assets/moonlit-lotus/entry-v2/yeoni-480.webp 480w, /assets/moonlit-lotus/entry-v2/yeoni-768.webp 768w" sizes="(max-width:600px) calc(100vw - 62px), 320px" width={768} height={512} loading="lazy" decoding="async" alt={copy.image}/>
  </span>
  <span className={styles.copy}>
   <span className={styles.eyebrow}><Flower2 size={14} strokeWidth={1.5} aria-hidden="true"/>{invite.eyebrow}</span>
   <strong id={titleId}>{copy.title}</strong>
   <span id={welcomeId} className={styles.welcome}>{invite.welcome}</span>
   <span className={styles.description}>{invite.description}</span>
   <span className={styles.features}>{invite.features.map(feature=><span key={feature}>{feature}</span>)}</span>
   <b>{invite.action}<ArrowRight size={18} strokeWidth={1.5} aria-hidden="true"/></b>
  </span>
 </Link><Link href="/moonlit-lotus/story/" className={styles.storyLink} lang="ko" data-cd-no-trans><BookOpen size={16} strokeWidth={1.5} aria-hidden="true"/><span>열심히 살아온 나에게, 잠깐의 달빛<small>연이의 15컷 웹툰 읽기</small></span><ArrowRight size={15} strokeWidth={1.5} aria-hidden="true"/></Link></div>;
}
