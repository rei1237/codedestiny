'use client';
import {Heart,UserRound} from 'lucide-react';
import styles from './BowFacingControl.module.css';
type Props={rearView:boolean;onChange:(rear:boolean)=>void;disabled?:boolean};
export default function BowFacingControl({rearView,onChange,disabled=false}:Props){
 return <fieldset className={styles.control} disabled={disabled} data-bow-facing-control><legend>참배 모습</legend><div className={styles.options}><button type="button" data-bow-facing="rear" aria-pressed={rearView} onClick={()=>onChange(true)}><Heart size={16} aria-hidden="true"/><span>불상 바라보기</span></button><button type="button" data-bow-facing="front" aria-pressed={!rearView} onClick={()=>onChange(false)}><UserRound size={16} aria-hidden="true"/><span>앞모습 보기</span></button></div><p>풍경은 그대로, 캐릭터를 보는 방향만 바꿔요.</p></fieldset>;
}
