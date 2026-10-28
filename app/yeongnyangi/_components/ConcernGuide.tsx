'use client';
import {useEffect} from 'react';
import type {ConcernId,ConcernTier,concernPages} from '../_lib/concern-pages';
import {trackProductStep} from './ProductGuide';
import CraftedProductDisclosure from '@/app/components/CraftedProductDisclosure';
import styles from './product-guide.module.css';
import concern from './concern-guide.module.css';

const SURFACE='concern_page';
const SAMPLE_ID='concern-sample';
export default function ConcernGuide({id,copy,tiers,recommended,startHref}:{id:ConcernId;copy:typeof concernPages[ConcernId];tiers:ConcernTier[];recommended:string[];startHref:string}){
 const itemId=`saju_${recommended[0]}`;
 useEffect(()=>{trackProductStep('product_detail_view','saju',itemId,SURFACE);},[itemId]);
 const from=Math.min(...tiers.map(t=>t.price)).toLocaleString('ko-KR');
 const start=()=>trackProductStep('product_start_click','saju',itemId,SURFACE);
 return <div className={styles.guide} data-concern={id}>
  <section className={styles.offer} aria-label="상담 시작">
   <p>{copy.lead}</p>
   <p><strong>{from}원부터</strong> · 질문 범위에 따라 가격이 정해져요</p>
   <a className={styles.cta} href={startHref} onClick={start}>질문으로 시작하기</a>
   <a href={'#'+SAMPLE_ID} onClick={()=>trackProductStep('product_sample_open','saju',itemId,SURFACE)}>결과 예시 보기</a>
  </section>
  <h2>이런 분께 맞아요</h2><p>{copy.who}</p>
  <h2>필요한 정보</h2><p>{copy.inputs}</p>
  <h2>받는 결과</h2>
  <ol className={styles.chapters}><li>질문에 대한 답 요약</li><li>해석의 근거</li><li>조건에 따라 달라지는 선택</li><li>지금 해볼 행동</li></ol>
  <h2>범위별 가격</h2>
  <p>생선 이름을 고를 필요는 없어요. 질문을 적으면 다룰 범위에 맞는 상담을 안내해요.</p>
  <ul className={concern.tiers}>{tiers.map(t=><li key={t.fish} data-fish={t.fish} data-recommended={recommended.includes(t.fish)||undefined}>
   <strong>{t.name}</strong>{recommended.includes(t.fish)&&<span className={concern.badge}>이 고민에 자주 안내</span>}
   <span>{t.scope}</span>
   <span className={concern.price}>{t.price.toLocaleString('ko-KR')}원 · {t.length}{t.followups>0?` · 추가 질문 ${t.followups}회`:''}</span>
  </li>)}</ul>
  <p className={styles.note}>모든 상담에서 답과 근거, 생활 속 예시, 다음 행동을 전해요. 최종 범위와 가격은 질문 조건을 확인한 뒤 결제 전에 다시 보여드려요.</p>
  <section className={styles.sample} id={SAMPLE_ID} aria-label="결과 예시">
   <h2>어떤 글을 받는지 먼저 읽어보세요</h2>
   <p className={styles.note}>형식을 보여주는 가상의 편집 예시예요. 실제 고객 결과가 아니에요.</p>
   {copy.sample.map(line=><blockquote key={line}>{line}</blockquote>)}
   <CraftedProductDisclosure featureKey={copy.sampleKey} summaryLabel="상담 구성을 글과 그림으로 자세히 보기"/>
  </section>
  <p>{copy.limit}</p>
  <h2>결제 후에는</h2>
  <p>결과는 웹에서 읽고 영냥이 보관함에서 다시 열어요. 생성 시간은 분량과 대기 상태에 따라 달라져요. 지연되거나 실패하면 같은 주문의 진행 상황을 먼저 확인해 주세요. 다시 결제하지 않아도 돼요.</p>
  <p>해결되지 않으면 <a href="/contact/">문의하기</a>로 알려 주세요. 환불은 <a href="/refund-policy/">환불 정책</a>을 따라요.</p>
  <a href="/yeongnyangi/library/">이미 구매한 상담 확인하기 →</a>
  <div className={styles.offer}><p><strong>{from}원부터</strong> · 로그인 후 결제창에서 적용 수단과 총액을 확인해요.</p><a className={styles.cta} href={startHref} onClick={start}>질문으로 시작하기</a></div>
 </div>;
}
