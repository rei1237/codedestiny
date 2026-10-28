import {visibleReviews} from '@/lib/brand/customer-reviews.mjs';
import {products} from '@/worker/yeongnyangi/payments/catalog';
import styles from './launch-offer.module.css';

// 2026-10-11 프리미엄 가격 개편 공지. 금액은 결제 카탈로그에서 읽고 기존 구매 권리는 그대로 둔다.
const starter=products.find(p=>p.id==='saju_mackerel')!;
const salmon=products.find(p=>p.id==='saju_salmon')!;
const omakase=products.find(p=>p.id==='fusion_all')!;
const won=(amount:number)=>`${amount.toLocaleString('ko-KR')}원`;

export default function LaunchOfferBanner(){
 const reviewCount=visibleReviews().length;
 return <aside id="launch-offer" className={styles.offer} aria-labelledby="launch-offer-title">
  <p className={styles.badge}>영냥이 상담 가격 안내</p>
  <h2 id="launch-offer-title" className={styles.title}>더 깊어진 프리미엄 상담으로 개편했어요</h2>
  <p className={styles.price}><span className={styles.trial}><strong>고등어 {won(starter.priceKRW)} · 연어 {won(salmon.priceKRW)} · 오마카세 {won(omakase.priceKRW)}</strong></span></p>
  <p className={styles.scope}>상담마다 다른 구성과 추가 질문 횟수를 확인해 보세요. 실제 결제 금액과 이용권 적용 여부는 결제창에서 다시 확인해 주세요.</p>
  <p className={styles.quip}><span className={styles.speaker}>영냥이</span>“고민의 답과 지금 해볼 행동을 함께 정리해줄게.”</p>
  <ul className={styles.facts}>
   <li>이미 결제한 상담과 기존 해금 결과는 가격 변경 뒤에도 그대로 다시 볼 수 있어요.</li>
   <li>이용권·월정석·단건 결제 구조는 바뀌지 않아요.</li>
   <li>자동 결제나 실결제 없이, 결제창에서 선택한 수단으로만 진행해요.</li>
  </ul>
  <p className={styles.actions}>
   <a className={styles.primary} href="/yeongnyangi/fortune/?domain=saju&fish=mackerel">상담 구성과 가격 확인하기 <span aria-hidden="true">→</span></a>
   {reviewCount>0&&<a className={styles.secondary} href="#founder-reviews">네오 1:1 상담 실제 후기 {reviewCount}개 보기</a>}
  </p>
  <p className={styles.fine}>후기는 네오의 사람 1:1 상담·강의 이용자가 남긴 것이며, 영냥이 상담은 계산 엔진과 AI 해설로 제공돼요.</p>
 </aside>;
}
