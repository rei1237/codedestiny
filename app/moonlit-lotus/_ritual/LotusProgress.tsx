import {RITUAL_STEPS} from './ritual-machine';
import styles from './ritual.module.css';
/** 꽃잎 6장 진행 표시. 단계를 마칠 때마다 한 장씩 밝아진다(opacity·transform 만 바뀐다). */
export default function LotusProgress({lit,label}:{lit:number;label:string}){
 return <svg className={styles.lotus} viewBox="-50 -50 100 100" role="img" aria-label={label}>
  {RITUAL_STEPS.map((step,index)=><path key={step} className={styles.petal} data-lit={index<lit} transform={`rotate(${index*60})`} d="M0 -6 C 10 -16 10 -34 0 -44 C -10 -34 -10 -16 0 -6 Z"/>)}
  <circle className={styles.lotusCore} r="7"/>
 </svg>;
}
