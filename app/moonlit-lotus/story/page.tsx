import type {Metadata} from 'next';
import Link from 'next/link';
import {ArrowLeft,ArrowRight,Flower2} from 'lucide-react';
import {CUTS,STORY_TITLE} from './story';
import styles from './story.module.css';
export const metadata:Metadata={title:STORY_TITLE+' | 달빛 연화당 웹툰',description:'바쁘게 살아온 꽃돼지 연이가 혼자만의 법당에서 명상과 긍정 확언으로 쉬어가는 15컷 이야기.',robots:{index:false,follow:false}};
export default function MoonlitStory(){return <main className={styles.page} lang="ko" data-cd-no-trans>
 <nav className={styles.nav} aria-label="웹툰 길잡이"><Link href="/moonlit-lotus/"><ArrowLeft size={17} aria-hidden="true"/>달빛 연화당</Link><a href="#ending">마지막 장면으로</a></nav>
 <header className={styles.title}><Flower2 size={30} aria-hidden="true"/><h1>열심히 살아온 나에게,<br/>잠깐의 달빛</h1><p>꽃돼지 연이의 작은 쉼표</p></header>
 <article aria-label="연이의 15컷 이야기" className={styles.strip}>
 {CUTS.map((cut,i)=><figure key={i} id={'cut-'+(i+1)} className={styles.cut} data-chapter={i<7?'day':'moon'}>
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <img src={`/assets/moonlit-lotus/story-v1/cut-${String(i+1).padStart(2,'0')}-1024.webp`} srcSet={`/assets/moonlit-lotus/story-v1/cut-${String(i+1).padStart(2,'0')}-640.webp 640w, /assets/moonlit-lotus/story-v1/cut-${String(i+1).padStart(2,'0')}-1024.webp 1024w`} sizes="(max-width:720px) 100vw, 720px" width={1024} height={512} loading={i===0?'eager':'lazy'} fetchPriority={i===0?'high':'auto'} decoding="async" alt={`${i+1}컷. ${cut.alt}`}/>
  <figcaption><p>{cut.narration}</p><blockquote>{cut.lines.map(line=><p key={line}>{line}</p>)}</blockquote></figcaption>
 </figure>)}
 </article>
 <footer id="ending" className={styles.ending}><Flower2 size={32} aria-hidden="true"/><h2>열심히 살아온 나에게,<br/>잠깐 쉬어갈 자리를.</h2><p>명상도, 기도도, 긍정 확언도.<br/>오롯이 나를 위한 시간이에요.</p><Link className={styles.enter} href="/moonlit-lotus/">나만의 연화당으로<ArrowRight size={18} aria-hidden="true"/></Link><a className={styles.again} href="#cut-1">처음부터 다시 읽기</a></footer>
 </main>;}
