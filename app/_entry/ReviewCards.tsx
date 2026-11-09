import * as trustStories from '@/lib/brand/trust-stories.mjs';
import { postedMonth, splitReviews } from '@/lib/brand/customer-reviews.mjs';
import { founder } from '@/lib/brand/founder';
import styles from './entry-webtoon.module.css';

// 진입 웹툰의 두 후기 컷. 문구는 정본 원문을 그대로 출력만 한다(가공·재배열 없음).
// - record-reactions: 네이버 블로그 공개 반응. 구매 후기가 아니라는 reactionsNote를 붙인다.
// - decade-reviews:  네오 1:1 상담·강의 이용자 카카오톡 후기. 지금의 AI 해설 상품과 다르다는 고지를 붙인다.

const { trustStoriesCopy } = trustStories;
const REACTIONS_SHOWN = 3;
const SERVICE_BAR: Record<string, string> = { 'neo-1on1': '네오 1:1 상담', 'neo-lecture': '네오 사주 강의' };

export function ReaderReactionCards() {
  const shown = trustStories.PRESIDENTIAL_REACTIONS.slice(0, REACTIONS_SHOWN);
  return <div className={styles.reactions}>
    <h3 className={styles.blockTitle}>{trustStoriesCopy.reactionsTitle}</h3>
    <ul className={styles.reactionList}>
      {shown.map(reaction => <li key={`${reaction.author}-${reaction.date}-${reaction.quote}`} className={styles.reaction}>
        <blockquote lang="ko"><p>{reaction.quote}</p></blockquote>
        <p className={styles.reactionMeta}>
          {reaction.author} · <time dateTime={reaction.date}>{reaction.date}</time> · {reaction.excerpt ? '일부 발췌' : '공개 댓글'}
        </p>
      </li>)}
    </ul>
    <p className={styles.note}>{trustStoriesCopy.reactionsNote}</p>
    {shown[0] && <a className={styles.textLink} href={shown[0].url} target="_blank" rel="noopener noreferrer">
      {trustStoriesCopy.reactionsMore}<span aria-hidden="true"> ↗</span>
    </a>}
  </div>;
}

export function CustomerReviewCards() {
  const { lead } = splitReviews(3);
  if (lead.length === 0) return null;
  return <div className={styles.reviews}>
    <p className={styles.reviewsKicker}>{SERVICE_BAR['neo-1on1']}</p>
    <h3 className={styles.blockTitle}>네오 1:1 상담·강의 이용자 후기</h3>
    <div className={styles.reviewList}>
      {lead.map(review => {
        const excerpt = review.bubbles.some((text: string) => text.includes('…'));
        return <article key={review.id} className={styles.review}>
          <header className={styles.reviewBar}><span>{SERVICE_BAR[review.service]}</span><span>카카오톡</span></header>
          <div className={styles.reviewThread} lang="ko">
            {review.bubbles.map((text: string, index: number) => <p key={index} className={styles.reviewBubble}>{text}</p>)}
          </div>
          <footer className={styles.reviewMeta}>
            <span>실제 이용자 후기 · {excerpt ? '원문 발췌' : '원문 그대로'} · 게시 동의</span>
            <time dateTime={review.postedAt}>{postedMonth(review)} 블로그 게시</time>
          </footer>
        </article>;
      })}
    </div>
    <p className={styles.note}>{founder.method}</p>
  </div>;
}
