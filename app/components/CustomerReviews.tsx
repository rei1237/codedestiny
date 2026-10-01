import {UserRound} from 'lucide-react';
import {postedMonth, splitReviews} from '@/lib/brand/customer-reviews.mjs';
import styles from './CustomerReviews.module.css';

type Review = ReturnType<typeof splitReviews>['lead'][number];

// 서비스별 표기. visibleReviews 가 모르는 서비스를 걸러내므로 여기 없는 키는 오지 않는다.
const SERVICE: Record<string, {bar: string; sender: string}> = {
 'neo-1on1': {bar: '네오 1:1 상담', sender: '익명 상담 고객'},
 'neo-lecture': {bar: '네오 사주 강의', sender: '익명 수강생'},
};

// 메신저 대화창형 후기 카드. 문구는 원문 그대로 출력만 한다(가공·재배열 없음).
// quote: 원문 속 한 구절(highlight)을 크게 띄운다. 말풍선과 같은 글이라 보조기기에는 숨긴다.
function ReviewCard({review, quote, hero = false}: {review: Review; quote: boolean; hero?: boolean}) {
 const excerpt = review.bubbles.some(text => text.includes('…'));
 const service = SERVICE[review.service];
 return <article className={hero ? `${styles.card} ${styles.hero}` : styles.card}>
  {quote && review.highlight && <p className={styles.quote} aria-hidden="true" data-review-text>{review.highlight}</p>}
  <header className={styles.bar}><span>{service.bar}</span><span>카카오톡</span></header>
  <div className={styles.thread} lang="ko">
   <span className={styles.avatar} aria-hidden="true"><UserRound size={18} strokeWidth={1.75}/></span>
   <div className={styles.bubbles}>
    <span className={styles.sender}>{service.sender}</span>
    {review.bubbles.map((text, index) => <p key={index} className={styles.bubble} data-review-text>{text}</p>)}
   </div>
  </div>
  <footer className={styles.meta}>
   <span>실제 이용자 후기 · {excerpt ? '원문 발췌' : '원문 그대로'} · 게시 동의</span>
   <time dateTime={review.postedAt}>{postedMonth(review)} 블로그 게시</time>
  </footer>
 </article>;
}

// 후기가 없으면 아무것도 그리지 않는다(빈 섹션 금지).
// inline: 좁은 자리(결제 전 가이드 패널)용 — 제목·인용·"더 보기" 없이 대표 후기만 1열로.
export default function CustomerReviews({limit = 3, titleId, variant = 'section'}: {limit?: number; titleId?: string; variant?: 'section' | 'inline'}) {
 const {lead, rest} = splitReviews(limit);
 if (lead.length === 0) return null;
 const inline = variant === 'inline';
 return <div className={inline ? `${styles.reviews} ${styles.inline}` : styles.reviews} id={inline ? undefined : 'founder-reviews'}>
  {!inline && <h3 id={titleId} className={styles.title}>네오 1:1 상담·강의 실제 후기</h3>}
  <div className={styles.grid}>{lead.map((review, index) => <ReviewCard key={review.id} review={review} quote={!inline} hero={!inline && index === 0}/>)}</div>
  {!inline && rest.length > 0 && <details className={styles.more}>
   <summary>후기 {rest.length}개 더 보기</summary>
   <div className={styles.wall}>{rest.map(review => <ReviewCard key={review.id} review={review} quote/>)}</div>
  </details>}
  <p className={styles.fine}>개인 경험에 따른 후기이며 결과를 보장하지 않습니다. 사주 풀이는 참고용 정보입니다.</p>
 </div>;
}
