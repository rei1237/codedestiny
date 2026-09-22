import {SKY_IMAGE} from '@/worker/yeongnyangi/fortune/question-sky-contract';
import styles from '../yeongnyangi.module.css';
export default function QuestionSkyEntry(){return <aside className={styles.skyEntry} aria-label="질문 순간의 상담">
  <a href="/yeongnyangi/fortune/?mode=spirit"><img src={SKY_IMAGE} width={160} height={160} alt="부채와 방울을 든 한복 차림의 영냥이" loading="lazy"/><span><strong>영냥 신점</strong><span>질문이 떠오른 순간의 기운과 인연의 흐름</span><b>질문 남기기 →</b></span></a>
  <a className={styles.skyWestern} href="/yeongnyangi/fortune/?mode=horary">서양 방식으로 읽는 영냥 호라리 →</a>
</aside>;}
