import {founder} from '@/lib/brand/founder';
import predictionRecords from '@/lib/brand/prediction-records.json';
import {predictionTimeline} from '@/lib/brand/prediction-timeline';
import {products} from '@/worker/yeongnyangi/payments/catalog';
import styles from './FounderTrust.module.css';

const mackerel=products.find(p=>p.id==='saju_mackerel')!;
const price=mackerel.priceKRW===1000?'천원':`${mackerel.priceKRW.toLocaleString('ko-KR')}원`;
const records=predictionRecords.map(record=>{
 const entry=predictionTimeline[record.url];
 if(!entry) throw new Error(`prediction-timeline missing ${record.url}`);
 return {...record,...entry};
});

export default function FounderTrust(){
 return <section className={styles.trust} aria-labelledby="founder-records-title" id="founder-records">
  <div className={styles.intro}>
   <div className={styles.copy}>
    <p className={styles.eyebrow}>{founder.credential}</p>
    <h2 id="founder-records-title" className={styles.title}>두 대통령의 2025년을 맞힌 명리학자</h2>
    <p className={styles.lead}>2022년과 2024년, 변화가 오기 전에 공개 블로그에 먼저 적어 둔 기록입니다.</p>
    <a className={styles.primary} href="#founder-timeline">원문 기록 {records.length}편 확인하기 <span aria-hidden="true">↓</span></a>
   </div>
   <figure className={styles.art}>
    <img src="/assets/yeongnyangi/original/records-scroll-960.webp" srcSet="/assets/yeongnyangi/original/records-scroll-480.webp 480w, /assets/yeongnyangi/original/records-scroll-960.webp 960w" sizes="(min-width: 860px) 440px, calc(100vw - 44px)" width={960} height={640} alt="" loading="lazy" decoding="async"/>
   </figure>
  </div>
  <ol className={styles.timeline} id="founder-timeline">{records.map(record=><li key={record.url} className={styles.record}>
   <time dateTime={record.date}>{record.date.replaceAll('-','.')} 게시</time>
   <h3>{record.title}</h3>
   <p className={styles.label}>당시 원문</p>
   <blockquote cite={record.url}><p>“{record.quote}”</p></blockquote>
   <p className={styles.after}><span>이후</span>{record.after}</p>
   <a className={styles.source} href={record.url} target="_blank" rel="noopener noreferrer" aria-label={`원문 보기: ${record.title} (새 창)`}>원문 보기 <span aria-hidden="true">↗</span></a>
  </li>)}</ol>
  <p className={styles.note}>인용은 원문 발췌이며 표기는 원문 그대로입니다. 게시일은 네이버 블로그 표시 기준입니다.</p>
  <div className={styles.offer}>
   <p className={styles.offerLine}>두 대통령의 흐름을 읽은 그{" "}해석 방식 그대로, {price}부터.</p>
   <a className={styles.primary} href="/yeongnyangi/fortune/?domain=saju&fish=mackerel">{price}으로 내 흐름 물어보기 <span aria-hidden="true">→</span></a>
   <p className={styles.fine}>공개 기록은 과거 해석 사례이며, 개인 상담 결과를 보장하지 않습니다.</p>
  </div>
  <p className={styles.method}>{founder.method}</p>
  <nav aria-label="상담사와 해석 기준"><a href="/about/#author">상담사 네오 소개</a><a href="/methodology/">계산과 해석 기준</a></nav>
 </section>;
}
