/* eslint-disable @next/next/no-img-element -- Pre-sized WebP in a static export; keep the reader SSR/PDF independent of Next's image runtime. */
import styles from './report-illustration.module.css';

export type ReportScene='cover'|'insight'|'choices'|'closing';
export const reportIllustration=(scene:ReportScene)=>`/assets/yeongnyangi/report-art/${scene}.webp`;
export default function ReportIllustration({scene}:{scene:ReportScene}){
 return <figure className={styles.art} aria-hidden="true" data-yn-report-art={scene}>
  <img src={reportIllustration(scene)} alt="" width={960} height={640} loading="lazy" decoding="async"/>
 </figure>;
}
