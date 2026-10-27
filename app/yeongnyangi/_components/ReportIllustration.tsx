import Image from 'next/image';
import styles from './report-illustration.module.css';

export type ReportScene='cover'|'insight'|'choices'|'closing';
export const reportIllustration=(scene:ReportScene)=>`/assets/yeongnyangi/report-art/${scene}.webp`;
export default function ReportIllustration({scene}:{scene:ReportScene}){
 return <figure className={styles.art} aria-hidden="true" data-yn-report-art={scene}>
  <Image src={reportIllustration(scene)} alt="" width={960} height={640} sizes="(max-width: 700px) 100vw, 680px" loading="lazy"/>
 </figure>;
}
