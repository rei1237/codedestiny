import PublicRecordLink from './PublicRecordLink';
import { PRESIDENTIAL_RECORDS, YEONGNYANGI_TESTIMONIAL as email, trustStoriesCopy as copy } from '@/lib/brand/trust-stories.mjs';
import '@/styles/trust-stories.css';

export default function TrustStories() {
  return <div className="cd-trust-stories" lang="ko">
    <section aria-labelledby="prediction-records-title">
      <h3 id="prediction-records-title">{copy.recordsTitle}</h3>
      <p>{copy.recordsLead}</p>
      <ol className="cd-trust-stories__records">{PRESIDENTIAL_RECORDS.map(record => <li key={record.url}>
        <time dateTime={record.date}>{record.date.replaceAll('-', '.')}</time>
        <h4>{record.title}</h4><blockquote>{record.quote}</blockquote>
        <p className="cd-trust-stories__after">{copy.after} · {record.after}</p>
        <a href={record.url} target="_blank" rel="noopener noreferrer">{copy.original}<span className="sr-only">: {record.title}</span></a>
      </li>)}</ol>
    </section>
    <PublicRecordLink />
    <section className="cd-trust-stories__email" aria-labelledby="service-letter-title">
      <h3 id="service-letter-title">{copy.emailTitle}</h3><p className="cd-trust-stories__source">{email.source}</p>
      <blockquote>{email.title}</blockquote>
      <details><summary>{copy.emailMore}</summary>{email.paragraphs.map((text, index) => <p key={index} style={{whiteSpace:'pre-line'}}>{text}</p>)}</details>
    </section>
    <p className="cd-trust-stories__fine">{copy.fine}</p>
  </div>;
}
