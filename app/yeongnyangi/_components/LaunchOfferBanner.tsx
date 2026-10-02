import LaunchPlannedPrice from '@/app/components/LaunchPlannedPrice';
import {launchOffer,plannedPriceFor} from '@/lib/brand/launch-offer';
import {visibleReviews} from '@/lib/brand/customer-reviews.mjs';
import {products} from '@/worker/yeongnyangi/payments/catalog';
import styles from './launch-offer.module.css';

// 정식 상담 오픈 전 체험가 안내. 한국어 화면 전용이며 후기(FounderTrust) 바로 뒤에 둔다.
// 금액은 결제 가격표와 lib/brand/launch-offer.ts 에서 읽는다. 이벤트가 끝나면(active:false) 아무것도 그리지 않는다.
// '10년 경력 명리학자 설계'는 사주 계산 엔진에만 맞는 말이다(app/fusion-fortune/_lib/expert-labels.ts) — 다른 체계로 넓히지 않는다.
const starter=products.find(p=>p.id==='saju_mackerel')!;
const won=(amount:number)=>`${amount.toLocaleString('ko-KR')}원`;

export default function LaunchOfferBanner(){
 const planned=plannedPriceFor(starter.fishId,starter.priceKRW);
 if(planned===null)return null;
 const limit=launchOffer.limit.toLocaleString('ko-KR'),price=won(starter.priceKRW),reviewCount=visibleReviews().length;
 return <aside id="launch-offer" className={styles.offer} aria-labelledby="launch-offer-title">
  <p className={styles.badge}>정식 상담 오픈 전 체험 이벤트</p>
  <h2 id="launch-offer-title" className={styles.title}>선착순 {limit}명 한정 체험가</h2>
  <p className={styles.price}><LaunchPlannedPrice amount={planned}/><span aria-hidden="true">→ </span><strong>체험가 {price}</strong></p>
  <p className={styles.scope}>고등어 상담 기준이에요. 연어·광어·참치·모둠·오마카세와 영냥이 생선 팩에도 같은 체험가가 적용돼요.</p>
  <p className={styles.quip}><span className={styles.speaker}>영냥이</span>“요즘 생선값이… 너무 비싸냥. 이 가격, 오래는 못 버텨.”</p>
  <ul className={styles.facts}>
   <li>사주 계산 로직은 10년 경력 명리학자가 직접 설계했어요.</li>
   <li>정식 상담이 열리는 몇 달 뒤에는 예정가로 바뀔 수 있어요.</li>
   <li>{limit}명이 채워지면 체험가도 끝나요.</li>
  </ul>
  <p className={styles.actions}>
   <a className={styles.primary} href="/yeongnyangi/fortune/?domain=saju&fish=mackerel">체험가 {price}으로 시작하기 <span aria-hidden="true">→</span></a>
   {reviewCount>0&&<a className={styles.secondary} href="#founder-reviews">네오 1:1 상담 실제 후기 {reviewCount}개 보기</a>}
  </p>
  <p className={styles.fine}>후기는 네오의 사람 1:1 상담·강의 이용자가 남긴 것이고, 체험가 상담은 계산 엔진과 AI 해설로 제공돼요. 금액과 적용 수단은 결제창에서 한 번 더 확인해요.</p>
 </aside>;
}
