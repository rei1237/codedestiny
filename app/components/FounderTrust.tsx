import {founder} from '@/lib/brand/founder';
import predictionRecords from '@/lib/brand/prediction-records.json';
import styles from './FounderTrust.module.css';

export default function FounderTrust(){
 return <section className={styles.trust} aria-label="서비스를 만든 상담사와 공개 예측 기록" id="founder-records">
  <h2>{founder.credential}</h2>
  <p className={styles.headline}>{founder.headline}</p>
  <p>{founder.description}</p>
  <ul>{predictionRecords.map(record=><li key={record.url}><a href={record.url} target="_blank" rel="noopener noreferrer"><time dateTime={record.date}>{record.date}</time><span>{record.title}</span><span className={styles.source}>원문 보기 ↗</span></a></li>)}</ul>
  <p className={styles.method}>{founder.method}</p>
  <nav aria-label="상담사와 해석 기준"><a href="/about/#author">상담사 네오 소개</a><a href="/methodology/">계산과 해석 기준</a></nav>
 </section>;
}
