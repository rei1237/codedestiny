import CustomerReviews from '@/app/components/CustomerReviews';
import {founder} from '@/lib/brand/founder';
import {visibleReviews} from '@/lib/brand/customer-reviews.mjs';
import {EXPERTISE_FACTS} from '@/lib/brand/expertise-facts.mjs';
import {products} from '@/worker/yeongnyangi/payments/catalog';
import styles from './FounderTrust.module.css';

const mackerel=products.find(p=>p.id==='saju_mackerel')!;
const price=mackerel.priceKRW===1000?'천원':`${mackerel.priceKRW.toLocaleString('ko-KR')}원`;
const reviewCount=visibleReviews().length;

export default function FounderTrust(){
 return <section className={styles.trust} aria-labelledby="founder-records-title" id="founder-records">
  <div className={styles.intro}>
   <div className={styles.copy}>
    <p className={styles.eyebrow}>{founder.credential}</p>
    <h2 id="founder-records-title" className={styles.title}>{founder.offerHeadline(price)}</h2>
    <p className={styles.lead}>네오가 1:1로 상담할 때 받은 실제 카톡 후기와, 지금 {price} 상담이 계산되는 방식을 그대로 보여드려요.</p>
    {reviewCount>0&&<a className={styles.primary} href="#founder-reviews">실제 후기 {reviewCount}개 읽기 <span aria-hidden="true">↓</span></a>}
   </div>
   <figure className={styles.art}>
    <img src="/assets/yeongnyangi/original/records-scroll-2d-960.webp" srcSet="/assets/yeongnyangi/original/records-scroll-2d-480.webp 480w, /assets/yeongnyangi/original/records-scroll-2d-960.webp 960w" sizes="(min-width: 860px) 440px, calc(100vw - 44px)" width={960} height={640} alt="" loading="lazy" decoding="async"/>
   </figure>
  </div>
  <CustomerReviews limit={3} titleId="founder-reviews-title"/>
  <div className={styles.expertise}>
   <h3 className={styles.subtitle}>계산은 규칙대로, 해설은 AI가</h3>
   <ul>{EXPERTISE_FACTS.map(fact=><li key={fact.key}>{fact.ko}</li>)}</ul>
  </div>
  <div className={styles.offer}>
   <p className={styles.offerLine}>내 사주에서 반복되는 선택의 단서를, {price}부터.</p>
   <a className={styles.primary} href="/yeongnyangi/fortune/?domain=saju&fish=mackerel">{price}으로 내 흐름 물어보기 <span aria-hidden="true">→</span></a>
   <p className={styles.fine}>위 후기는 네오의 1:1 상담 이용자가 남긴 것이며, {price} 상담은 계산 엔진과 AI 해설로 제공돼요.</p>
  </div>
  <p className={styles.method}>{founder.method}</p>
  <nav aria-label="상담사와 해석 기준"><a href="/about/#author">상담사 네오 소개</a><a href="/methodology/">계산과 해석 기준</a></nav>
 </section>;
}
