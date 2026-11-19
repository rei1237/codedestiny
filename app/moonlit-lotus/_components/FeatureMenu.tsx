'use client';
import {BookHeart,Flower2,HandHeart,Heart,Info,Music2,Palette,Sparkles,Sun,Camera} from 'lucide-react';
import styles from './FeatureMenu.module.css';
export type MoonlitFeature='bow'|'prayer'|'meditation'|'music'|'affirmation'|'fortune'|'records'|'custom'|'info';
const FEATURES=[
 {id:'bow',label:'108배',Icon:HandHeart},
 {id:'meditation',label:'명상',Icon:Flower2},
 {id:'prayer',label:'기도',Icon:Heart},
 {id:'music',label:'명상 음악',Icon:Music2},
 {id:'affirmation',label:'긍정 확언',Icon:Sparkles},
 {id:'fortune',label:'오늘 운세',Icon:Sun},
 {id:'records',label:'나의 기록',Icon:BookHeart},
 {id:'custom',label:'꾸미기',Icon:Palette},
 {id:'info',label:'공간 안내',Icon:Info},
] as const;
type Props={active:MoonlitFeature|null;onOpen:(feature:MoonlitFeature)=>void;moreOpen:boolean;onMore:()=>void;hidden?:boolean};
/** Uses the existing activity navigation, without changing a session or music state. */
export default function FeatureMenu({active,onOpen,moreOpen,onMore,hidden=false}:Props){
 return <nav className={styles.menu} aria-label="연화당 모든 활동" hidden={hidden} data-moonlit-feature-menu data-compact={active==='bow'&&!moreOpen}>
  {!active&&!moreOpen&&<div className={styles.welcome}><span className={styles.welcomeIcon}><Flower2 size={20} strokeWidth={1.65} aria-hidden="true"/></span><p><strong>꽃돼지 연이와 잠깐 쉬어가요</strong><span>지금 마음에 맞는 쉼을 골라보세요.</span></p></div>}
  {FEATURES.map(({id,label,Icon})=><button key={id} type="button" data-moonlit-feature={id} data-activity={id} aria-pressed={active===id&&!moreOpen} onClick={()=>onOpen(id)} className={styles.item}><span className={styles.icon}><Icon size={19} strokeWidth={1.7} aria-hidden="true"/></span><span>{label}</span></button>)}
  <button type="button" data-moonlit-feature="more" className={styles.item} aria-expanded={moreOpen} aria-controls="moonlit-more" onClick={onMore}><span className={styles.icon}><Camera size={19} strokeWidth={1.7} aria-hidden="true"/></span><span>공간·사진</span></button>
 </nav>;
}
