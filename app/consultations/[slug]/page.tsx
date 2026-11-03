import type {Metadata} from 'next';
import Image from 'next/image';
import {notFound} from 'next/navigation';
import {RECORD_SERVICES} from '@/lib/records/service-registry';
import {PriceBadge} from '@/app/components/PriceBadge';
import {consultationStories} from '../stories';
import {storyMasters,storyOutcomes} from '../story-masters';
import {storyDialogue} from '../story-dialogue';
import styles from './story.module.css';
type Props={params:Promise<{slug:string}>};
export function generateStaticParams(){return Object.keys(consultationStories).map(slug=>({slug}));}
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {slug}=await params;const service=RECORD_SERVICES.find(item=>item.id===slug),story=consultationStories[slug];
 if(!service||!story)return {};
 return {title:`${service.name} · 상담 이야기`,description:story.basis,alternates:{canonical:`/consultations/${slug}/`}};
}
export default async function ConsultationStory({params}:Props){
 const {slug}=await params,story=consultationStories[slug],service=RECORD_SERVICES.find(item=>item.id===slug);
 if(!story||!service)notFound();
 return <main className={styles.page} lang="ko" data-cd-no-trans>
  <link rel="stylesheet" href="/styles/service-intro-fonts.css"/>
  <nav className={styles.nav}><a href="/consultations/">상담의 정원</a><a href={service.href}>이야기 건너뛰기</a></nav>
  <header className={styles.cover}><p>달빛 아래, 당신을 기다리는 이야기</p><h1>{service.name}</h1><p className={styles.lead}>{story.lead}</p><a href="#story" className={styles.action}>이야기 읽기</a></header>
  <section id="story" aria-label={`${service.name} 도입 웹툰`}><Image unoptimized src={`/images/consultation-webtoons/${slug}.webp`} alt={`${story.voices} ${storyDialogue[slug]}`} width={724} height={2172} className={styles.webtoon} loading="eager"/></section>
  <section className={styles.reading} aria-label="이야기에서 상담으로">
   {(storyMasters[slug]||[]).map(master=><div key={master.name} className={styles.master}><Image unoptimized src={master.avatar} width={72} height={72} alt=""/><div><h2>{master.name}</h2><p>{master.role}</p><p className={styles.voice}>{master.line}</p></div></div>)}
   {storyOutcomes[slug].map(([title,body])=><article key={title}><h3>{title}</h3><p>{body}</p></article>)}
  </section>
  <section className={styles.invitation}><p className={styles.caption}>도입 이야기의 예시 · 개인 분석 결과가 아닙니다</p><h2>{story.invitation}</h2><p>{story.basis}</p><div className={styles.price}>{slug==='codex'?'개인판 · ':''}<PriceBadge className={styles.priceBadge} featureKey={service.featureKey}/>{slug==='codex'&&<p>궁합판 · <PriceBadge featureKey="master-love-codex-compat"/></p>}</div><a className={styles.action} href={service.href}>{slug==='tea'?'상담 고르기':'프로필 선택하고 상담 준비하기'}</a><p className={styles.caption}>상담 화면에서 저장한 프로필을 선택하거나 새로 만들 수 있어요. 이용 조건을 확인한 뒤 상담을 시작합니다.</p><a href="/consultations/">다른 상담 둘러보기</a></section>
 </main>;
}
