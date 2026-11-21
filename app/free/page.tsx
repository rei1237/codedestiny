import type {Metadata} from 'next';
import Image from 'next/image';
import {pageOpenGraph} from '@/lib/seo/page-open-graph';
import {FREE_PROMO,FREE_PROMO_COPY_KO as KO,FREE_PROMO_GROUPS,FREE_PROMO_CATALOG,freePromoItemHref,freePromoEndDateIso} from '@/lib/marketing/free-promo.mjs';
import {FREE_LIST_PAGE_ENABLED} from '@/lib/guided-flow/flags.mjs';
import styles from './free.module.css';

// R1 무료 목록 단독 페이지(2026-11-21 승인). 6단계 카드 목록(FreePromoBanner)과 같은 데이터·주소·포스터를 쓴다.
// 🔴 표시 전용: 무료 여부는 lib/payment/free-fortune-policy.mjs 가 정한다. FREE_LIST_PAGE_ENABLED=false 면 noindex(사이트맵·/ggulggul/ 링크도 빠진다).
const url='https://code-destiny.com/free/';
const count=FREE_PROMO_GROUPS.reduce((n,group)=>n+group.items.length,0);
const date=freePromoEndDateIso(FREE_PROMO.endsAt);
const catalog=FREE_PROMO_CATALOG as Record<string,{image:string;description:string;minutes:number}|undefined>;
export const metadata:Metadata={
 title:'무료 운세 전체 목록 | 사주·타로·자미두수·점성술 · 꿀꿀 운세',
 description:`사주 명식과 만세력, 오늘의 운세, 사주 궁합, 타로, 자미두수, 숙요점, 베다점, 점성술, 휴먼 디자인까지 지금 무료로 볼 수 있는 운세 ${count}가지를 한곳에 모았습니다.`,
 alternates:{canonical:url},
 robots:FREE_LIST_PAGE_ENABLED?undefined:{index:false,follow:true},
 openGraph:{...pageOpenGraph(url),title:'무료 운세 전체 목록 · 꿀꿀 운세',description:`지금 무료로 볼 수 있는 운세 ${count}가지를 한곳에 모았어요.`},
};
export default function FreeListPage(){return <main className={styles.page}>
 <div className={styles.wrap}>
  <nav className={styles.top} aria-label="페이지 이동"><a href="/">꿀꿀 운세</a><a href="/ggulggul/">꿀꿀 운세 메인</a></nav>
  <header className={styles.hero}>
   <p className={styles.badge}>{KO.badge}</p>
   <h1>무료 운세 전체 목록</h1>
   <p className={styles.lead}>사주부터 타로와 세계 운세까지, 지금 무료로 볼 수 있는 운세 {count}가지를 한곳에 모았어요. 마음이 가는 카드를 눌러 바로 시작해 보세요.</p>
   <p className={styles.until}>{KO.until.replace('{date}',date)}</p>
  </header>
  {FREE_PROMO_GROUPS.map(group=><section className={styles.group} key={group.id} aria-labelledby={`free-${group.id}`}>
   <h2 id={`free-${group.id}`}>{KO[group.labelKey as keyof typeof KO]}</h2>
   <ul className={styles.catalog}>{group.items.map(item=>{const href=freePromoItemHref(item),meta=catalog[item.id];return <li key={item.id}>
    {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- legacy shell navigation */}
    <a className={styles.entry} href={href} data-cd-free-promo-item={item.id}>{meta&&<span className={styles.poster}><Image src={meta.image} width={320} height={213} sizes="120px" alt=""/></span>}<span className={styles.entryCopy}><strong>{item.ko}</strong>{meta&&<span className={styles.entryDesc}>{meta.description}</span>}<span className={styles.entryFoot}><span className={styles.free}>{KO.freeBadge}</span>{meta&&<span>{KO.minutes.replace('{n}',String(meta.minutes))}</span>}</span></span></a>
   </li>;})}</ul>
  </section>)}
  <section className={styles.notes} aria-labelledby="free-notes">
   <h2 id="free-notes">무료 범위 안내</h2>
   <p>{KO.note}</p>
   <p>사주 계열 항목은 생년월일시를 한 번 입력하면 같은 결과 화면에서 이어서 볼 수 있어요. 결과를 보관함에 저장하려면 로그인이 필요해요.</p>
  </section>
  {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- legacy shell navigation */}
  <footer className={styles.bottom}><a href="/saju/free/">무료 만세력 기본 풀이 시작하기</a><a href="/today/">오늘의 운세 보기</a><a href="/ggulggul/">꿀꿀 운세 메인으로</a></footer>
 </div>
</main>}
