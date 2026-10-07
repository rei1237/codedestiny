'use client';
import {useEffect, useId, useState} from 'react';
import type {DomainId} from '@/worker/yeongnyangi/fortune/shared/contracts';
import {questionGuides,contextualQuestionGuides,questionGuideHref} from '@/lib/fortune/question-journey';
import {productCuriosity} from '../_lib/product-curiosity';
import {trackEvent} from '@/lib/analytics';
import styles from './product-guide.module.css';
import {useReadingLanguage} from '../_lib/use-reading-language';
import LocalizedProductGuide from './LocalizedProductGuide';
import {readingDepthCopy,readingTierDepth} from '../_lib/reading-depth-copy';
import LaunchPlannedPrice from '@/app/components/LaunchPlannedPrice';
import {plannedPriceFor} from '@/lib/brand/launch-offer';
import {YEONGNYANGI_TESTIMONIAL as testimonial} from '@/lib/brand/trust-stories.mjs';

export type ProductOffer = {id:string; itemId:string; fish:string; fishName:string; price:number; paymentLabel:string; chapters:string[]; depth:string};
export type ProductOffers = Record<DomainId, ProductOffer[]>;
export const CURIOSITY_VERSION='result-preview-v2';
export function trackProductStep(event:string, domain:string, itemId:string, surface='home_catalog',locale='ko'){
 trackEvent(event,{service:'yeongnyangi',domain,item_id:itemId,content_id:CURIOSITY_VERSION,locale,surface});
}
export default function ProductGuide({domain,offers,surface='home_catalog'}:{domain:DomainId;offers:ProductOffer[];surface?:'home_catalog'|'product_page'}){
 const {siteLocale}=useReadingLanguage();
 const [fish,setFish]=useState('mackerel');
 const sampleId=useId();
 const optionsId=useId();
 const offer=offers.find(p=>p.fish===fish)||offers[0];
 const planned=plannedPriceFor(offer.fish,offer.price);
 const copy=productCuriosity[domain];
 const Heading=surface==='product_page'?'h2':'h3';
 useEffect(()=>{trackProductStep('product_detail_view',domain,offers[0].itemId,surface,siteLocale);},[domain,offers,surface,siteLocale]);
 if(siteLocale!=='ko')return <LocalizedProductGuide domain={domain} offers={offers} locale={siteLocale} surface={surface}/>;
 return <div className={styles.guide}>
  <section className={styles.offer} aria-label="질문 상담 시작">
   <Heading>내 질문부터 들려주세요</Heading>
   <p>{copy.hook}</p><p>질문의 대상과 기간에 맞는 상담을 안내해요. 생선 이름을 먼저 고를 필요는 없어요.</p>
   <p><strong>{Math.min(...offers.map(p=>p.price)).toLocaleString('ko-KR')}원부터</strong> · 다룰 범위를 정한 뒤 가격 확인</p>
   <a className={styles.cta} href={'/yeongnyangi/fortune/?domain='+domain}>내 고민 상담하기</a>
   <a href={'#'+sampleId}>결제 전 상담 예시 읽기</a>
  </section>
  <section className={styles.sample} id={sampleId} aria-label="결과 미리보기">
   <Heading>어떤 글을 받는지 먼저 읽어보세요</Heading>
   <p className={styles.note}>형식을 보여주는 가상의 편집 예시예요. 실제 고객 결과나 지금 방문한 분의 운세가 아니에요.</p>
   <blockquote>{copy.example}</blockquote>
   <div className={styles.sampleMethod}><strong>내 상담에서는 무엇이 달라질까요?</strong><p>{copy.method}</p><p>실제 상담은 입력 정보와 계산 근거를 바탕으로 AI가 작성해요. 질문 상담을 선택하면 질문에 맞춰 답·근거·해볼 행동을 정리해요.</p></div>
  </section>
  {domain==='saju'&&<section className={styles.testimonial} aria-label="영냥이 참치 사주 분석 이용자 후기">
   <Heading>이런 편지가 도착했어요</Heading><p className={styles.note}>{testimonial.source}</p>
   <blockquote>{testimonial.paragraphs[1]}</blockquote>
   <p className={styles.note}>명식 오류 정정 후 재분석을 받은 참치 사주 이용자의 개인 경험이에요. 다른 등급·상품의 후기나 결과 보장은 아니에요.</p>
   <details onToggle={e=>{if(e.currentTarget.open)trackProductStep('product_review_open',domain,offer.itemId,surface);}}><summary>이메일 후기 전체 읽기</summary>{testimonial.paragraphs.map((text,index)=><p key={index} className={styles.originalReview}>{text}</p>)}</details>
  </section>}
  <details className={styles.legacyReport}>
  <summary>질문 없이 전체 성향 리포트 고르기</summary>
  <p>내 질문의 답을 찾는 상담과 달리, 정해진 목차에 따라 성향과 삶의 여러 분야를 읽는 리포트예요.</p>
  <div className={styles.offer}><p className={styles.offerHook}>{copy.hook}</p><p>{copy.description}</p><p><LaunchPlannedPrice amount={planned}/><strong>{offer.price.toLocaleString('ko-KR')}원</strong> · {offer.fishName} · {offer.chapters.length}개 챕터</p><a className={styles.cta} href={`#${sampleId}`} onClick={()=>trackProductStep('product_sample_open',domain,offer.itemId,surface)}>결과 예시 먼저 읽기</a><a href={`#${optionsId}`}>상담 구성과 결제 조건 확인하기</a></div>
  <Heading>이런 상황에 잘 맞아요</Heading><p>나의 성향이나 반복되는 선택을 이해하고, 다음 행동의 기준을 정리하고 싶을 때 살펴보세요.</p>
  <Heading>확인할 수 있는 내용</Heading><ul>{offer.chapters.slice(0,3).map(title=><li key={title}>{title}</li>)}</ul>
  <Heading>이런 답을 찾는다면 맞지 않아요</Heading><p>상대의 속마음, 특정 사건의 날짜, 합격·재회·수익을 확정하는 답은 제공하지 않아요.</p>
  <Heading>어떤 방식으로 읽을까?</Heading><p>{copy.detail}</p><p>{copy.method}</p>
  <Heading>결제 후 펼쳐질 이야기</Heading>
  <p>목차와 분량을 비교해 필요한 리포트를 골라주세요.</p>
  <div id={optionsId} className={styles.tiers} role="group" aria-label="성향 리포트 구성">{offers.map(p=><button key={p.id} type="button" aria-pressed={offer.id===p.id} onClick={()=>{setFish(p.fish);trackProductStep('product_tier_select',domain,p.itemId,surface);}}>{p.fishName}<span>{p.price.toLocaleString('ko-KR')}원</span><span className={styles.tierDepth}>{p.chapters.length}개 챕터 · {p.chapters[0]}</span></button>)}</div>
  <p aria-live="polite"><strong>{offer.fishName} · {offer.chapters.length}개 챕터</strong><br/><span data-reading-tier-depth={offer.fish}>{offer.chapters.slice(0,2).join(' · ')}</span></p>
  <a className={styles.cta} href={`/yeongnyangi/fortune/?flow=legacy&domain=${domain}&fish=${offer.fish}`} onClick={()=>trackProductStep('product_start_click',domain,offer.itemId,surface)}>이 구성으로 상담 준비하기 →</a>
  <p className={styles.note}>아래는 기본 해석의 목차예요. 다음 화면에서 궁합·질문 등 상담 종류를 바꾸면 그에 맞는 목차를 다시 확인할 수 있어요.</p>
  <ol className={styles.chapters}>{offer.chapters.map((title,i)=><li key={`${offer.id}-${i}`}>{title}</li>)}</ol>
  <p>{copy.limit}</p>
  <Heading>무료와 유료, 무엇이 다를까?</Heading><p>무료 운세에서는 요약된 흐름을 살펴봐요. 유료 상담은 선택한 체계와 등급에 맞춘 챕터별 해석을 받고, 같은 계정의 내 상담 기록에서 이어 읽어요.</p>
  <p>결과는 웹에서 읽고 내 상담 기록에서 다시 열어요. 생성 시간은 분량과 대기 상태에 따라 달라져요. 지연되면 같은 주문의 진행 상황을 확인하고, 재결제 전에 기존 결과를 확인해 주세요.</p>
  <a href="/yeongnyangi/library/">이미 구매한 상담 확인하기 →</a>
  {[...questionGuides,...contextualQuestionGuides].filter(q=>q.productId.startsWith(domain+'_')).slice(0,2).map(q=><a key={q.id} href={questionGuideHref(q.id)}>{q.question} — 이 고민에 맞는 상담 보기 →</a>)}
  <a href="/today/">오늘의 무료 흐름 먼저 살펴보기 →</a>
  <div className={styles.offer}><p><LaunchPlannedPrice amount={planned}/><strong>{offer.price.toLocaleString('ko-KR')}원</strong> · {offer.fishName} · {offer.chapters.length}개 챕터</p><p>{offer.paymentLabel}. 다음 화면에서 상담 종류와 프로필을 고르고, 로그인 후 결제창에서 적용 수단과 총액을 확인해요.</p><a className={styles.cta} href={`/yeongnyangi/fortune/?flow=legacy&domain=${domain}&fish=${offer.fish}`} onClick={()=>trackProductStep('product_start_click',domain,offer.itemId,surface)}>이 구성으로 상담 준비하기 →</a></div>
  </details>
  {domain==='saju'&&<a href="/yeongnyangi/#founder-records">네오 1:1 상담 실제 후기 보기 →</a>}
  {surface==='home_catalog'&&<a href={`/yeongnyangi/readings/${domain}/`}>공유할 수 있는 상품 안내 열기 →</a>}
 </div>;
}
