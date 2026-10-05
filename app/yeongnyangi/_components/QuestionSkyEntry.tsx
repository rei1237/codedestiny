import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
import {SKY_IMAGE} from '@/worker/yeongnyangi/fortune/question-sky-contract';
import {questionSkyCopyFor} from '../_lib/question-sky-copy';
import styles from '../yeongnyangi.module.css';
export default function QuestionSkyEntry({locale='ko'}:{locale?:ReadingLocale}){const copy=questionSkyCopyFor(locale).entry;return <aside className={styles.skyEntry} aria-label={copy.kicker}>
  <a href={`/yeongnyangi/fortune/?mode=spirit&lang=${locale}`} aria-label={`${copy.title} · ${copy.action}`}><img src={SKY_IMAGE} width={160} height={160} alt={questionSkyCopyFor(locale).input.imageAlt} loading="lazy"/><span className={styles.skyEntryCopy}><span className={styles.skyEntryKicker}>{copy.kicker}</span><strong>{copy.title}</strong><span className={styles.skyEntryDescription}>{copy.description}</span><span className={styles.skyEntryAction}>{copy.action} <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6"/></svg></span></span></a>
</aside>;}
