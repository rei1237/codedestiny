"use client";
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {useCallback,useEffect,useReducer,useRef,useState} from 'react';
import {FastForward,Map as MapIcon,X} from 'lucide-react';
import {useSpaceProfile} from '../_lib/use-space-profile';
import {speciesOf} from '../_lib/companions';
import {writeRecord} from '../_lib/private-store';
import {kstTodayYmd} from '@/app/diary/_lib/kst-date';
import space from '../space.module.css';
import styles from './ritual.module.css';
import {BOW_TARGET,HOLD_MS,RITUAL_STEPS,initialRitual,petalsLit,ritualReducer,timeScale,type RitualState} from './ritual-machine';
import {useRitualBow} from './use-ritual-bow';
import {useRitualT} from './use-ritual-t';
import LotusProgress from './LotusProgress';
import SpeechBubble from './SpeechBubble';
import BreathGuide from './BreathGuide';
import HoldToLight from './HoldToLight';
import WishLantern from './WishLantern';
import RitualBackdrop from './RitualBackdrop';
import {COURTYARD_STEPS,PROPS,chimeDelay} from './ritual-views';
import {useAmbientAudio} from '../_audio/use-ambient-audio';
import MiniPlayer from '../_audio/MiniPlayer';
import CompanionStage,{type BreathBeat} from './CompanionStage';
// 연출(canvas·CSS 등불)은 따로 나눠 불러 첫 화면을 막지 않는다.
const SceneFx=dynamic(()=>import('../_fx/SceneFx'),{ssr:false});
type Voice='yeoni'|'cat'|'neutral';
function lineKey(state:RitualState,bowing:boolean){
 switch(state.step){
  case 'incense':return state.lit?'incenseLit':'incense';
  case 'bow':return state.bows>=BOW_TARGET&&!bowing?'bowDone':'bow';
  case 'wish':return state.wishSent?'wishSent':'wish';
  default:return state.step;
 }
}
export default function RitualFlow({onBrowse}:{onBrowse:()=>void}){
 const profile=useSpaceProfile();
 const {t,locale}=useRitualT();
 const [state,dispatch]=useReducer(ritualReducer,undefined,()=>initialRitual());
 const [breath,setBreath]=useState<BreathBeat>({phase:'ready',at:0,ms:0});
 const onBreathPhase=useCallback((phase:BreathBeat['phase'],ms:number)=>setBreath({phase,at:performance.now(),ms}),[]);
 const [reduced,setReduced]=useState(false),[characterError,setCharacterError]=useState(false),[notice,setNotice]=useState('');
 const panel=useRef<HTMLElement>(null),shownStep=useRef(state.step);
 const scale=timeScale(state.fast);
 const bow=useRitualBow(profile.scope,state.fast?1.6:1);
 const audio=useAmbientAudio(),{sfx}=audio,heardBows=useRef(0);
 useEffect(()=>{
  const media=matchMedia('(prefers-reduced-motion: reduce)'),sync=()=>setReduced(media.matches);sync();
  media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync);
 },[]);
 useEffect(()=>{dispatch({type:'bowDone',completed:bow.session.completed});},[bow.session.completed]);
 // 한 번 절을 마치고 일어설 때마다 목탁 한 번. 향 불붙기·연등 떠오름·범종은 그 행동이 끝날 때 한 번.
 // 효과음은 모두 입장 탭 뒤에만 난다(입장 전 단계에는 소리 효과가 없다). 미니 플레이어의 효과음 끔을 따른다.
 useEffect(()=>{
  const completed=bow.session.completed;
  if(completed>heardBows.current)sfx('mokugyo');
  heardBows.current=completed;
 },[bow.session.completed,sfx]);
 useEffect(()=>{if(state.lit)sfx('fire');},[state.lit,sfx]);
 useEffect(()=>{if(state.wishSent)sfx('lantern');},[state.wishSent,sfx]);
 useEffect(()=>{if(state.step==='dedication')sfx('bell');},[state.step,sfx]);
 // 마당(호흡·향)에 있는 동안 처마 풍경이 가끔 운다. 탭이 숨으면 울리지 않는다.
 const courtyard=COURTYARD_STEPS.includes(state.step);
 useEffect(()=>{
  if(!courtyard)return;
  let timer:ReturnType<typeof setTimeout>;
  const ring=()=>{timer=setTimeout(()=>{if(!document.hidden)sfx('windChime');ring();},chimeDelay(Math.random));};
  ring();
  return()=>clearTimeout(timer);
 },[courtyard,sfx]);
 useEffect(()=>{if(bow.save==='failed')setNotice(t('bow.saveFailed'));},[bow.save,t]);
 // 한 단계의 행동을 마치면 잠시 반응을 보여 준 뒤 다음 화면으로 넘어간다.
 const bowing=bow.session.status==='running';
 const finished=(state.step==='incense'&&state.lit)||(state.step==='bow'&&state.bows>=BOW_TARGET&&!bowing)||(state.step==='wish'&&state.wishSent);
 useEffect(()=>{
  if(!finished)return;
  const wait=(state.step==='wish'?1800:state.step==='bow'?1400:1000)*scale;
  const timer=setTimeout(()=>dispatch({type:'next'}),wait);
  return()=>clearTimeout(timer);
 },[finished,state.step,scale]);
 useEffect(()=>{setNotice('');},[state.step]);
 // 단계가 바뀌면 방금 누른 버튼이 사라져 초점이 body 로 떨어진다. 그때만 새 단계 패널로 옮긴다
 // (입력칸에 바로 주지 않는다 — 휴대폰 자판이 저절로 열리지 않게).
 useEffect(()=>{
  // 처음 그릴 때(개발 모드의 effect 두 번 실행 포함)는 옮기지 않는다: 직전 단계와 같으면 그대로 둔다.
  if(shownStep.current===state.step)return;
  shownStep.current=state.step;
  const active=document.activeElement;
  if(!active||active===document.body)panel.current?.focus({preventScroll:true});
 },[state.step]);
 const sendWish=useCallback((text:string)=>{
  dispatch({type:'sendWish',text});
  const now=Date.now();
  writeRecord({id:profile.scope+'|prayer|ritual-'+crypto.randomUUID(),scope:profile.scope,kind:'prayer',day:kstTodayYmd(),createdAt:now,updatedAt:now,text:text.trim()})
   .then(ok=>{if(!ok)setNotice(t('wish.saveFailed'));},()=>setNotice(t('wish.saveFailed')));
 },[profile.scope,t]);
 const kind=profile.character||'yeoni',species=speciesOf(profile.avatar,profile.image);
 const voice:Voice=kind==='cat'||(kind==='custom'&&species==='yeongnyangi')?'cat':kind==='custom'&&species?'neutral':'yeoni';
 const speaker=t('speaker.'+(voice==='neutral'?'friend':voice));
 const index=RITUAL_STEPS.indexOf(state.step);
 const progressLabel=t('progress',{current:Math.min(RITUAL_STEPS.length,index+1),total:RITUAL_STEPS.length})+' · '+t('steps.'+state.step);
 const skippable=state.step!=='enter'&&state.step!=='dedication'&&!finished;
 return <main className={space.page+' '+styles.flow} lang={locale} data-cd-no-trans data-step={state.step} data-fast={state.fast} data-reduced={reduced}>
  <header className={styles.top}>
   <LotusProgress lit={petalsLit(state)} label={progressLabel}/>
   <h1 className={styles.srOnly}>{t('title')}</h1>
   <span className={styles.stepName} aria-hidden="true">{t('steps.'+state.step)}</span>
   <button type="button" className={styles.chip} aria-pressed={state.fast} onClick={()=>dispatch({type:'toggleFast'})}><FastForward size={16} aria-hidden="true"/>{t('fast')}</button>
   <button type="button" className={styles.iconButton} aria-label={t('browse')} title={t('browse')} onClick={onBrowse}><MapIcon size={18} aria-hidden="true"/></button>
   <Link href="/" className={styles.exit}><X size={16} aria-hidden="true"/>{t('exit')}</Link>
  </header>
  <section className={styles.stage} aria-label={t('steps.'+state.step)}>
   {/* 단계마다 다른 각도의 절 그림(장식, aria-hidden). 다음 단계 그림 한 장만 미리 받는다. */}
   <RitualBackdrop step={state.step}/>
   <SpeechBubble speaker={speaker} text={t('speech.'+voice+'.'+lineKey(state,bowing))} instant={reduced} fast={state.fast} t={t}/>
   <SceneFx smoke={state.lit} reduced={reduced}/>
   {state.step==='incense'&&<img className={styles.burner} src={PROPS.incenseBurner} alt={t('props.incenseBurner')} decoding="async" draggable={false}/>}
   {!characterError&&<div className={styles.figure}>
    <CompanionStage kind={kind} look={profile.avatar} image={profile.image} portrait={profile.portrait} scene={{step:state.step,lit:state.lit,bowing,bows:state.bows,wishSent:state.wishSent}} elapsed={bow.session.elapsed} breath={breath} reduced={reduced} speaker={speaker} t={t} onFailure={()=>setCharacterError(true)}/>
   </div>}
   <MiniPlayer audio={audio} t={t}/>
  </section>
  <section key={state.step} ref={panel} tabIndex={-1} className={styles.panel} aria-label={t('steps.'+state.step)} aria-live="off">
   {state.step==='enter'&&<>
    <button type="button" className={space.primary+' '+styles.action} onClick={()=>{audio.begin();sfx('windChime');dispatch({type:'enter'});}}>{t('enter.cta')}</button>
    <p className={styles.hint}>{t('enter.hint')}</p>
   </>}
   {state.step==='breathe'&&<BreathGuide breaths={state.breaths} scale={scale} onCycle={()=>dispatch({type:'breathDone'})} onPhase={onBreathPhase} t={t}/>}
   {state.step==='incense'&&<HoldToLight holdMs={HOLD_MS*scale} lit={state.lit} onLit={()=>dispatch({type:'light'})} t={t}/>}
   {state.step==='bow'&&<>
    {/* 절하는 동안에는 disabled 대신 aria-disabled: 키보드 초점이 버튼에 남아 Enter 로 다음 절을 이어 간다. */}
    <button type="button" className={space.primary+' '+styles.action} aria-disabled={bowing||state.bows>=BOW_TARGET} onClick={()=>{if(!bowing&&state.bows<BOW_TARGET)bow.tap();}}>
     {state.bows>=BOW_TARGET&&!bowing?t('bow.done'):bowing?t('bow.running'):t('bow.cta',{current:state.bows+1,total:BOW_TARGET})}
    </button>
    <p className={styles.srOnly} aria-live="polite">{t('bow.cta',{current:state.bows,total:BOW_TARGET})}</p>
   </>}
   {state.step==='wish'&&<WishLantern sent={state.wishSent} onSend={sendWish} t={t}/>}
   {state.step==='dedication'&&<>
    <h2 className={styles.doneTitle}>{t('dedication.title')}</h2>
    <div className={styles.choices}>
     <button type="button" className={space.primary+' '+styles.action} onClick={onBrowse}>{t('browse')}</button>
     <Link href="/" className={styles.homeLink}>{t('home')}</Link>
    </div>
   </>}
   {notice&&<p className={styles.notice} role="status">{notice}</p>}
   {skippable&&<button type="button" className={styles.quiet} onClick={()=>dispatch({type:'skip'})}>{t('skip')}</button>}
  </section>
 </main>;
}
