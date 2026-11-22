/* eslint-disable @next/next/no-img-element -- Pre-sized WebP in a static export; keep the reader SSR/PDF independent of Next's image runtime. */
import styles from './report-illustration.module.css';

export type ReportScene='cover'|'insight'|'choices'|'closing';
export const reportIllustration=(scene:ReportScene)=>`/assets/yeongnyangi/report-art/${scene}.webp`;
export default function ReportIllustration({scene,header=false}:{scene:ReportScene;header?:boolean}){
 return <figure className={header ? styles.coverArt : styles.art} aria-hidden="true" data-yn-report-art={scene}>
  <img src={reportIllustration(scene)} srcSet={scene === 'cover' ? '/assets/yeongnyangi/report-art/cover-320.webp 320w, /assets/yeongnyangi/report-art/cover-640.webp 640w, /assets/yeongnyangi/report-art/cover.webp 960w' : undefined} sizes={scene === 'cover' ? (header ? '(max-width: 600px) 34vw, (max-width: 1160px) 36vw, 400px' : '(max-width: 760px) 100vw, 640px') : undefined} alt="" width={960} height={640} loading={header ? 'eager' : 'lazy'} decoding="async"/>
 </figure>;
}
