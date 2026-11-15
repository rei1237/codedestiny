import Link from 'next/link';
import {MOONLIT_LOTUS_ENABLED} from '../moonlit-lotus/_lib/config';
import styles from './HomeMoonlitEntry.module.css';
export default function HomeMoonlitEntry(){
 if(!MOONLIT_LOTUS_ENABLED)return null;
 return <Link href="/moonlit-lotus/" className={styles.entry} data-moonlit-entry>
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <img src="/assets/moonlit-lotus/space-v1/hall-768.webp" width={768} height={512} loading="lazy" alt="연꽃 좌대의 꽃돼지 불상과 따뜻한 법당"/>
  <span><strong>달빛 연화당</strong><span>나 혼자 머무는 작은 절.<br/>기도하고, 명상하고, 마음을 쉬어가요.</span><b>나만의 연화당 들어가기</b></span>
 </Link>;
}
