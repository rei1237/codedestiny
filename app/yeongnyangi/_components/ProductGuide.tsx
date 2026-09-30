'use client';
import {useEffect, useState} from 'react';
import type {DomainId} from '@/worker/yeongnyangi/fortune/shared/contracts';
import {questionGuides,contextualQuestionGuides,questionGuideHref} from '@/lib/fortune/question-journey';
import {productCuriosity} from '../_lib/product-curiosity';
import {trackEvent} from '@/lib/analytics';
import styles from './product-guide.module.css';
import {useReadingLanguage} from '../_lib/use-reading-language';
import LocalizedProductGuide from './LocalizedProductGuide';
import {readingDepthCopy,readingTierDepth} from '../_lib/reading-depth-copy';

export type ProductOffer = {id:string; itemId:string; fish:string; fishName:string; price:number; paymentLabel:string; chapters:string[]; depth:string};
export type ProductOffers = Record<DomainId, ProductOffer[]>;
export const CURIOSITY_VERSION='question-scope-v1';
export function trackProductStep(event:string, domain:string, itemId:string, surface='home_catalog',locale='ko'){
 trackEvent(event,{service:'yeongnyangi',domain,item_id:itemId,content_id:CURIOSITY_VERSION,locale,surface});
}
export default function ProductGuide({domain,offers,surface='home_catalog'}:{domain:DomainId;offers:ProductOffer[];surface?:'home_catalog'|'product_page'}){
 const {siteLocale}=useReadingLanguage();
 const [fish,setFish]=useState('mackerel');
 const offer=offers.find(p=>p.fish===fish)||offers[0];
 const copy=productCuriosity[domain];
 const Heading=surface==='product_page'?'h2':'h3';
 useEffect(()=>{trackProductStep('product_detail_view',domain,offers[0].itemId,surface,siteLocale);},[domain,offers,surface,siteLocale]);
 if(siteLocale!=='ko')return <LocalizedProductGuide domain={domain} offers={offers} locale={siteLocale} surface={surface}/>;
 return <div className={styles.guide}>
  <div className={styles.offer}><p><strong>{offer.price.toLocaleString('ko-KR')}원</strong> · {offer.chapters.length}개 챕터</p><p className={styles.offerHook}>{copy.hook}</p><p>{copy.description}</p><a className={styles.cta} href={`/yeongnyangi/fortune/?domain=${domain}&fish=${offer.fish}`} onClick={()=>trackProductStep('product_start_click',domain,offer.itemId,surface)}>상담 구성과 결제 조건 확인하기</a></div>
  <Heading>이런 상황에 잘 맞아요</Heading><p>나의 성향이나 반복되는 선택을 이해하고, 다음 행동의 기준을 정리하고 싶을 때 살펴보세요.</p>
  <Heading>확인할 수 있는 내용</Heading><ul>{offer.chapters.slice(0,3).map(title=><li key={title}>{title}</li>)}</ul>
  <Heading>이런 답을 찾는다면 맞지 않아요</Heading><p>상대의 속마음, 특정 사건의 날짜, 합격·재회·수익을 확정하는 답은 제공하지 않아요.</p>
  <Heading>어떤 방식으로 읽을까?</Heading><p>{copy.detail}</p><p>{copy.method}</p>
  <Heading>결제 후 펼쳐질 이야기</Heading>
  <p data-reading-depth-note>{readingDepthCopy().sharedTopics}</p>
  <div className={styles.tiers} role="group" aria-label="상담 깊이 선택">{offers.map(p=><button key={p.id} type="button" aria-pressed={offer.id===p.id} onClick={()=>setFish(p.fish)}>{p.fishName}<span>{p.price.toLocaleString('ko-KR')}원</span></button>)}</div>
  <p aria-live="polite"><strong>{offer.fishName} · {offer.chapters.length}개 챕터</strong><br/><span data-reading-tier-depth={offer.fish}>{readingTierDepth(offer.fish)||offer.depth}</span></p>
  <p className={styles.note}>아래는 기본 해석의 목차예요. 다음 화면에서 궁합·질문 등 상담 종류를 바꾸면 그에 맞는 목차를 다시 확인할 수 있어요.</p>
  <ol className={styles.chapters}>{offer.chapters.map((title,i)=><li key={`${offer.id}-${i}`}>{title}</li>)}</ol>
  <p>{copy.limit}</p>
  <details className={styles.sample} onToggle={e=>{if(e.currentTarget.open)trackProductStep('product_sample_open',domain,offer.itemId,surface);}}><summary>어떤 글을 받는지 먼저 읽기</summary><p className={styles.note}>형식을 보여주는 가상의 편집 예시예요. 실제 고객 결과나 지금 방문한 분의 운세가 아니에요.</p><blockquote>{copy.example}</blockquote><p>실제 상담은 입력 정보와 계산 근거를 바탕으로 AI가 작성해요. 질문 상담을 선택하면 질문에 맞춰 답·근거·해볼 행동을 정리해요.</p></details>
  <Heading>무료와 유료, 무엇이 다를까?</Heading><p>무료 운세에서는 요약된 흐름을 살펴봐요. 유료 상담은 선택한 체계와 등급에 맞춘 챕터별 해석을 받고, 같은 계정의 내 상담 기록에서 이어 읽어요.</p>
  <p>결과는 웹에서 읽고 내 상담 기록에서 다시 열어요. 생성 시간은 분량과 대기 상태에 따라 달라져요. 지연되면 같은 주문의 진행 상황을 확인하고, 재결제 전에 기존 결과를 확인해 주세요.</p>
  <a href="/yeongnyangi/library/">이미 구매한 상담 확인하기 →</a>
  {[...questionGuides,...contextualQuestionGuides].filter(q=>q.productId.startsWith(domain+'_')).slice(0,2).map(q=><a key={q.id} href={questionGuideHref(q.id)}>{q.question} — 이 고민에 맞는 상담 보기 →</a>)}
  <a href="/today/">오늘의 무료 흐름 먼저 살펴보기 →</a>
  <div className={styles.offer}><p><strong>{offer.price.toLocaleString('ko-KR')}원</strong> · {offer.fishName} · {offer.chapters.length}개 챕터</p><p>{offer.paymentLabel}. 다음 화면에서 상담 종류와 프로필을 고르고, 로그인 후 결제창에서 적용 수단과 총액을 확인해요.</p><a className={styles.cta} href={`/yeongnyangi/fortune/?domain=${domain}&fish=${offer.fish}`} onClick={()=>trackProductStep('product_start_click',domain,offer.itemId,surface)}>이 구성으로 상담 준비하기 →</a></div>
  {domain==='saju'&&<a href="/yeongnyangi/#founder-records">대통령 관련 공개 분석 기록도 확인하기 →</a>}
  {surface==='home_catalog'&&<a href={`/yeongnyangi/readings/${domain}/`}>공유할 수 있는 상품 안내 열기 →</a>}
 </div>;
}
