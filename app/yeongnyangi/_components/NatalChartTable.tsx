import type {ChartView} from '@/worker/yeongnyangi/fortune/charts';
import styles from './natal-chart-table.module.css';

/** Display only: every cell comes from the stored chart; never calculate in UI. */
export default function NatalChartTable({chart}:{chart:ChartView}){
 const pillars=['시주','일주','월주','년주'].map(label=>chart.groups.find(g=>g.label===label));
 if(chart.domain!=='saju'||pillars.some(p=>!p))return null;
 const rows=[...new Set(pillars.flatMap(p=>p!.items.map(i=>i.label)))];
 return <div className={styles.frame}><table className={styles.table}>
  <caption>사주 만세력 <span>태어난 순간의 네 기둥</span></caption>
  <thead><tr><th scope="col">구분</th>{pillars.map(p=><th scope="col" key={p!.label}>{p!.label}</th>)}</tr></thead>
  <tbody>{rows.map((label,index)=><tr key={label}><th scope="row">{label}</th>{pillars.map(p=><td className={index===0?styles.pillar:undefined} key={p!.label}>{p!.items.find(i=>i.label===label)?.value||'미상'}</td>)}</tr>)}</tbody>
 </table></div>;
}
