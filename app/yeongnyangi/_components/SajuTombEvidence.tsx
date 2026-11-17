import type {SajuTombEvidence as Evidence} from '@/worker/yeongnyangi/fortune/charts';
import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
import styles from './saju-tomb-evidence.module.css';

/** Stored interpretation only; opening the panel never recalculates a purchased result. */
export default function SajuTombEvidence({evidence,locale}:{evidence?:Evidence;locale?:ReadingLocale}){
 if(!evidence)return null;
 const title=!locale||locale==='ko'?'입묘의 작용과 근거':locale==='ja'?'入墓の働きと根拠（韓国語）':'Tomb-state evidence (Korean)';
 return <details className={styles.details}>
  <summary>{title}</summary>
  <div lang="ko">
   <p>입묘는 어떤 기운의 작용이 제한될 수 있다는 해석이에요. 충이 있다는 이유만으로 단정하지 않고, 뿌리·계절·합과 희기를 함께 살펴요.</p>
   {evidence.rows.length>0?<ul>{evidence.rows.map(row=><li key={row.id}>
    <strong>{row.title}</strong><p>{row.description}</p>
    {row.conditions.length>0&&<p className={styles.note}>{row.conditions.join(' · ')}</p>}
   </li>)}</ul>:<p>원국에서 살필 입묘 후보가 없어요. 이것만으로 길흉이 정해지지는 않아요.</p>}
   {evidence.limitations.map(note=><p className={styles.note} key={note}>{note}</p>)}
  </div>
 </details>;
}
