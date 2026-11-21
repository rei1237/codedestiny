'use client';

import {useEffect,useRef,useState,type CSSProperties} from 'react';
import styles from './pet-mascot.module.css';

const ORIGINAL='/assets/yeongnyangi/original/hero-800.webp';
const ATLAS='/assets/yeongnyangi/original/mascot-reactions.webp';
const REACTIONS=['눈을 깜빡이며 고개를 갸웃해요.','앞발을 들어 인사해요.','고등어를 꼭 끌어안아요.','별빛 사이로 살짝 뛰어요.'] as const;
const HOLD_MS=950;
const LOAD_WINDOW_MS=2600;
type Props={className?:string;alt:string;onReact?:(reaction:number)=>void;priority?:boolean;sizes?:string;variant?:'room'|'landing'};
type Press={row:number;turn:number};
type LoadState='idle'|'loading'|'ready'|'failed';

export default function PetMascot({className,alt,onReact,priority=false,sizes='(min-width: 900px) 410px, 285px',variant='room'}:Props){
 const [press,setPress]=useState<Press|null>(null);
 const [atlas,setAtlas]=useState<LoadState>('idle');
 const [announcement,setAnnouncement]=useState('');
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const turn=useRef(-1);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 function endPressAfter(ms:number){
  if(timer.current)clearTimeout(timer.current);
  timer.current=setTimeout(()=>setPress(null),ms);
 }
 function settleAtlas(ok:boolean){
  setAtlas(ok?'ready':'failed');
  if(press)endPressAfter(HOLD_MS);
 }
 function pet(){
  const id=++turn.current,row=id%REACTIONS.length;
  setPress({row,turn:id});
  setAnnouncement('영냥이가 '+REACTIONS[row]);
  onReact?.(row);
  // Allow a cold download a short window, then start the full animation when decoded.
  endPressAfter(atlas==='idle'||atlas==='loading'?LOAD_WINDOW_MS:HOLD_MS);
  if(atlas==='idle')setAtlas('loading');
 }
 const painted=press&&atlas==='ready';
 return <>
  <button type="button" className={[styles.button,className].filter(Boolean).join(' ')} aria-label="영냥이 쓰다듬기" onClick={pet} data-reaction={press?.row} data-pet-placement={variant}>
   <span className={styles.canvas}>
    <img className={painted?styles.inactive:undefined} src={ORIGINAL} srcSet="/assets/yeongnyangi/original/hero-480.webp 480w, /assets/yeongnyangi/original/hero-800.webp 800w" sizes={sizes} width={800} height={800} alt={alt} {...(priority?{fetchPriority:'high' as const}:{})}/>
    {(atlas==='loading'||atlas==='ready')&&<span aria-hidden="true" className={styles.spriteWindow} data-pet-sprite={painted?'active':'idle'}>
     <img src={ATLAS} alt="" width={1024} height={1024} className={styles.atlas}
      onLoad={({currentTarget:img})=>settleAtlas(img.naturalWidth===1024&&img.naturalHeight===1024)}
      onError={()=>settleAtlas(false)}
      data-motion={painted?(press.turn%2===0?'even':'odd'):undefined}
      style={{'--pet-row':`${-(press?.row??0)*25}%`} as CSSProperties}/>
    </span>}
    {press&&!painted?<span key={press.turn} aria-hidden="true" className={styles.fallbackReaction}>✦</span>:null}
   </span>
   <span aria-hidden="true" className={styles.invitation}>✧ 한 번 쓰다듬어 봐</span>
  </button>
  <span className={styles.status} role="status">{announcement}</span>
 </>;
}
