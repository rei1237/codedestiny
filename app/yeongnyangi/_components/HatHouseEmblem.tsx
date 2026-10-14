import {BookOpenText,Compass,Feather,Hammer,KeyRound,Sprout} from 'lucide-react';
import type {HatHouseId} from '@/lib/yeongnyangi/hat-houses';
import styles from './hat-prologue.module.css';

const emblems={
 'moon-library':{Icon:BookOpenText,role:'학자'},
 'star-forge':{Icon:Hammer,role:'공예가'},
 'dawn-tower':{Icon:Compass,role:'탐험가'},
 'gold-vault':{Icon:KeyRound,role:'금고지기'},
 'wind-gallery':{Icon:Feather,role:'전령'},
 'star-greenhouse':{Icon:Sprout,role:'정원사'},
} as const;

/** Fictional house emblems, not a prediction or recommendation of a user's job. */
export default function HatHouseEmblem({id}:{id:HatHouseId}){
 const {Icon,role}=emblems[id];
 return <span className={styles.emblem} role="img" aria-label={`${role}의 문장`}>
  <svg className={styles.engraving} viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="36"/><circle cx="40" cy="40" r="31" strokeDasharray="1 5"/><path d="M13 41q-3 18 22 26M67 41q3 18-22 26M18 52l8 1-3 8M62 52l-8 1 3 8M35 10l5-5 5 5-5 5Z"/></svg>
  <Icon className={styles.emblemIcon} strokeWidth={1.35} aria-hidden="true"/>
  <span className={styles.role}>{role}</span>
 </span>;
}
