"use client";
import Link from 'next/link';
import {useCallback,useEffect,useReducer,useState} from 'react';
import {FastForward,Map as MapIcon,X} from 'lucide-react';
import Character,{type Activity} from '../_components/Character';
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
type Voice='yeoni'|'cat'|'neutral';
const ACTIVITY:Record<RitualState['step'],Activity>={enter:'greeting',breathe:'meditation',incense:'idle',bow:'bow',wish:'prayer',dedication:'greeting'};
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
 const [reduced,setReduced]=useState(false),[characterError,setCharacterError]=useState(false),[notice,setNotice]=useState('');
 const scale=timeScale(state.fast);
 const bow=useRitualBow(profile.scope,state.fast?1.6:1);
 useEffect(()=>{
  const media=matchMedia('(prefers-reduced-motion: reduce)'),sync=()=>setReduced(media.matches);sync();
  media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync);
 },[]);
 useEffect(()=>{dispatch({type:'bowDone',completed:bow.session.completed});},[bow.session.completed]);
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
   <picture className={styles.backdrop} aria-hidden="true">
    <source media="(min-width:701px)" srcSet="/assets/moonlit-lotus/space-v1/hall-1536.webp"/>
    <img src="/assets/moonlit-lotus/space-v1/hall-768.webp" alt="" decoding="async"/>
   </picture>
   <SpeechBubble key={state.step+lineKey(state,bowing)} speaker={speaker} text={t('speech.'+voice+'.'+lineKey(state,bowing))} instant={reduced} fast={state.fast} t={t}/>
   {!characterError&&<div className={styles.figure}>
    <Character kind={kind} activity={ACTIVITY[state.step]} elapsed={bow.session.elapsed} reduced={reduced} look={profile.avatar} image={profile.image} portrait={profile.portrait} onFailure={()=>setCharacterError(true)}/>
   </div>}
  </section>
  <section className={styles.panel} aria-live="off">
   {state.step==='enter'&&<>
    <button type="button" className={space.primary+' '+styles.action} onClick={()=>dispatch({type:'enter'})}>{t('enter.cta')}</button>
    <p className={styles.hint}>{t('enter.hint')}</p>
   </>}
   {state.step==='breathe'&&<BreathGuide breaths={state.breaths} scale={scale} onCycle={()=>dispatch({type:'breathDone'})} t={t}/>}
   {state.step==='incense'&&<HoldToLight holdMs={HOLD_MS*scale} lit={state.lit} onLit={()=>dispatch({type:'light'})} t={t}/>}
   {state.step==='bow'&&<>
    <button type="button" className={space.primary+' '+styles.action} disabled={bowing||state.bows>=BOW_TARGET} onClick={bow.tap}>
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
