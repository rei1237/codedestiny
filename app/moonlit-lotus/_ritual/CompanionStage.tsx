"use client";
// 참배 길동무. 상태기계(companion-machine)가 정한 상태를 연이는 포즈 교체로, 다른 캐릭터는 기존 Character + transform 으로 보여 준다.
import {useCallback,useEffect,useReducer,useRef,useState} from 'react';
import Character from '../_components/Character';
import AtlasSprite from '../_components/AtlasSprite';
import {ASSET_BASE} from '../model-review/sprite-clips';
import type {Character as CharacterKind} from '../_lib/session-policy';
import type {AvatarStyle} from '../_lib/use-space-profile';
import {speciesOf} from '../_lib/companions';
import space from '../space.module.css';
import styles from './companion.module.css';
import {blinkDelay,companionReducer,companionState,initialCompanion,nextChange,stateSince,type CompanionScene} from './companion-machine';
import {BLINK_MS,tickMs,tierOneActivity,yeoniPose,type BreathPhase} from './companion-pose';
import type {RitualT} from './use-ritual-t';
export type BreathBeat={phase:BreathPhase;at:number;ms:number};
const BLINK_STEP=85;
const now=()=>performance.now();
export default function CompanionStage({kind,look,image,portrait,scene,elapsed,breath,reduced,speaker,t,onFailure}:{kind:CharacterKind;look:AvatarStyle;image:string;portrait:string;scene:CompanionScene;elapsed:number;breath:BreathBeat;reduced:boolean;speaker:string;t:RitualT;onFailure:()=>void}){
 const species=speciesOf(look,image);
 // Character 와 같은 규칙: 고른 친구가 없는 custom 은 연이로 그린다.
 const yeoni=kind==='yeoni'||(kind==='custom'&&!species);
 const [machine,dispatch]=useReducer(companionReducer,scene,initial=>initialCompanion(initial,now()));
 const [clock,setClock]=useState(()=>now());
 const [blink,setBlink]=useState<number|null>(null);
 const bounce=useRef<HTMLDivElement>(null);
 const {step,lit,bowing,bows,wishSent}=scene;
 useEffect(()=>{dispatch({type:'scene',scene:{step,lit,bowing,bows,wishSent},now:now()});},[step,lit,bowing,bows,wishSent]);
 useEffect(()=>{
  const input=()=>dispatch({type:'input',now:now()});
  document.addEventListener('pointerdown',input,true);document.addEventListener('keydown',input,true);
  return()=>{document.removeEventListener('pointerdown',input,true);document.removeEventListener('keydown',input,true);};
 },[]);
 const state=companionState(machine,clock);
 // 상태가 저절로 바뀌는 시각(반응 끝·30초 쉼)과 클립 박자에 맞춰 시계를 다시 읽는다.
 useEffect(()=>{
  const at=now(),change=nextChange(machine,at),tick=reduced?null:tickMs(companionState(machine,at));
  const waits=[change===null?null:change-at+16,tick].filter((ms):ms is number=>ms!==null);
  if(!waits.length)return;
  const timer=setTimeout(()=>setClock(now()),Math.max(16,Math.min(...waits)));
  return()=>clearTimeout(timer);
 },[machine,clock,reduced]);
 useEffect(()=>{
  // 눈 깜빡임: idle 에서만 3~6초마다 idle 클립의 눈 감은 1·2 프레임.
  if(!yeoni||reduced||state!=='idle'){setBlink(null);return;}
  let timer:ReturnType<typeof setTimeout>;
  const close=(ms:number)=>{setBlink(ms);timer=ms+BLINK_STEP<BLINK_MS?setTimeout(()=>close(ms+BLINK_STEP),BLINK_STEP):setTimeout(open,BLINK_STEP);};
  const open=()=>{setBlink(null);timer=setTimeout(()=>{if(!document.hidden)close(0);else open();},blinkDelay(Math.random()));};
  open();
  return()=>clearTimeout(timer);
 },[yeoni,reduced,state]);
 const tap=useCallback(()=>{
  dispatch({type:'tap',now:now()});
  if(!reduced)bounce.current?.animate([{transform:'translateY(0) scale(1)'},{transform:'translateY(-5%) scale(1.02,.98)'},{transform:'translateY(0) scale(1)'}],{duration:420,easing:'ease-out'});
 },[reduced]);
 const since=Math.max(0,clock-stateSince(machine,clock));
 const breathProgress=breath.ms>0?(clock-breath.at)/breath.ms:0;
 const label=speaker+' · '+t('companion.'+state);
 let sprite;
 if(yeoni){
  const pose=yeoniPose(state,{since,elapsed,breath:breath.phase,breathProgress,blink});
  const later=step!=='enter'&&step!=='breathe';
  const preload=['expressions','rest',...(later?['bow-down','bow-lower','bow-up']:[])].map(name=>ASSET_BASE+'/'+name+'.webp');
  sprite=<AtlasSprite className={space.characterDrawing} identity={'yeoni-ritual-'+state} drawing={{url:ASSET_BASE+'/'+pose.sheet+'.webp',frame:pose.frame}} label={label} fallback={ASSET_BASE+'/still.webp'} preload={preload} frozen={reduced} onFailure={onFailure}/>;
 }else{
  sprite=<div role="group" aria-label={label}><Character kind={kind} activity={tierOneActivity(state)} elapsed={elapsed} reduced={reduced} look={look} image={image} portrait={portrait} onFailure={onFailure}/></div>;
 }
 const breathing=state==='breathe'&&breath.phase!=='ready';
 return <div className={styles.companion} data-state={state} data-tier={yeoni?2:1} data-look={machine.lookUp?'up':undefined} data-companion-state={state} onPointerDown={tap}>
  <span className={styles.pool} aria-hidden="true"/>
  <span className={styles.halo} aria-hidden="true"/>
  <div className={styles.look}>
   <div className={styles.float}>
    <div ref={bounce} className={styles.bounce}>
     <div className={styles.breath} data-breath={breathing?breath.phase:undefined} style={{'--companion-breath-ms':(breathing?breath.ms:0)+'ms'} as React.CSSProperties}>
      {sprite}
     </div>
    </div>
   </div>
  </div>
 </div>;
}
