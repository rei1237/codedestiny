import {SKY_IMAGE} from '@/worker/yeongnyangi/fortune/question-sky-contract';
import styles from '../yeongnyangi.module.css';
export default function QuestionSkyEntry(){return <aside className={styles.skyEntry} aria-label="질문 순간의 상담">
  <a href="/yeongnyangi/fortune/?mode=spirit" aria-label="영냥 신점 상담 시작하기"><img src={SKY_IMAGE} width={160} height={160} alt="부채와 방울을 든 한복 차림의 영냥이" loading="lazy"/><span className={styles.skyEntryCopy}><span className={styles.skyEntryKicker}>질문 순간의 상담</span><strong>영냥 신점</strong><span className={styles.skyEntryDescription}>질문이 떠오른 순간의 기운과 인연의 흐름</span><span className={styles.skyEntryAction}>질문 남기기 <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg></span></span></a>
</aside>;}
