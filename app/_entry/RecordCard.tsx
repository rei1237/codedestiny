import { trustStoriesCopy } from '@/lib/brand/trust-stories.mjs';
import styles from './entry-webtoon.module.css';

type PublicRecord = { date: string; title: string; url: string; quote: string; after: string };

/** 네오가 남긴 공개 기록 한 건. 문장·사건은 lib/brand/trust-stories.mjs 원문 그대로 출력만 한다. */
export default function RecordCard({ record }: { record: PublicRecord }) {
  return <article className={styles.record} lang="ko">
    <time className={styles.recordDate} dateTime={record.date}>{record.date}</time>
    <h3 className={styles.recordTitle}>{record.title}</h3>
    <blockquote className={styles.recordQuote} cite={record.url}><p>{record.quote}</p></blockquote>
    <a className={styles.recordLink} href={record.url} target="_blank" rel="noopener noreferrer">
      {trustStoriesCopy.original}<span aria-hidden="true"> ↗</span>
    </a>
    <div className={styles.recordAfter}>
      <p className={styles.recordAfterLabel}>{trustStoriesCopy.after}</p>
      <p>{record.after}</p>
    </div>
    <p className={styles.recordLimit}>{trustStoriesCopy.recordLimit}</p>
  </article>;
}
