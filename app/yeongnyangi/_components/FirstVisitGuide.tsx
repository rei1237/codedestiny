'use client';
import {useEffect,useRef,useState} from 'react';
import Image from 'next/image';
import {ArrowRight,X} from 'lucide-react';
import {useLocale,useT} from '@/lib/i18n/useT';
import ProfilePicker from './ProfilePicker';
import {useProfiles} from '../_lib/use-profiles';
import {useFirstVisit} from '../_lib/use-first-visit';
import {loginForCurrentPage} from '../_lib/api';
import {firstVisitEvent,firstVisitHome,firstVisitOverlayBusy,firstVisitLogin,writeFirstVisit,readFirstVisit,readYeongnyangiGuideHidden,hideYeongnyangiGuide,clearYeongnyangiGuideHidden,type FirstVisitState} from '@/js/first-visit-state.mjs';
import styles from './first-visit.module.css';
function GuideArt({step=0}:{step?:number}){
 return <span className={styles.art} aria-hidden="true"><Image src="/images/first-visit/yeongnyangi-tutorial-v1.webp" alt="" width={1440} height={480} style={{left:`-${step*100}%`}}/></span>;
}
export default function FirstVisitGuide(){
 const locale=useLocale();
 const translate=useT('firstVisitGuide');
 const t=(key:string)=>translate('firstVisitGuide.'+key);
 const scenes=['profile','concern','choice'].map(key=>({id:key,label:t(key+'Label'),title:t(key+'Title'),speech:t(key+'Speech')}));
 const {state,scope}=useFirstVisit();
 const profiles=useProfiles();
 const [scene,setScene]=useState(0);
 const [hidden,setHidden]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null),panel=useRef<HTMLElement>(null),replay=useRef<HTMLButtonElement>(null);
 const returnFocus=useRef<HTMLElement|null>(null);
 const beforeOffer=useRef<FirstVisitState>({status:'new',step:0});
 const selected=profiles.profiles.find(p=>String(p.profileId||p.id)===profiles.profileId);
 function close(){dialog.current?.close();returnFocus.current?.focus({preventScroll:true});}
 function dismiss(){hideYeongnyangiGuide(365);setHidden(true);writeFirstVisit('yeongnyangi','dismissed');firstVisitEvent('yeongnyangi','skip');close();}
 function hideToday(){const previous=beforeOffer.current;hideYeongnyangiGuide();setHidden(true);writeFirstVisit('yeongnyangi',previous.status==='offered'?'new':previous.status,previous.step);firstVisitEvent('yeongnyangi','skip');close();}
 function show(){
  const el=dialog.current;if(!el||el.open)return;
  returnFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:replay.current;
  beforeOffer.current=readFirstVisit('yeongnyangi');
  writeFirstVisit('yeongnyangi','offered');
  el.showModal();firstVisitEvent('yeongnyangi','view');
 }
 useEffect(()=>{
  const previouslyClosed=state?.status==='dismissed'||(scope!=='guest'&&readFirstVisit('yeongnyangi','guest').status==='dismissed');
  if(previouslyClosed&&!readYeongnyangiGuideHidden())hideYeongnyangiGuide(365);
  setHidden(readYeongnyangiGuideHidden()||state?.status==='dismissed');
 },[state?.status,scope]);
 useEffect(()=>{
  if(!state||state.status!=='new'||profiles.loading||profiles.error||!firstVisitHome(window.location,'yeongnyangi'))return;
  let cancelled=false;
  const offer=()=>{if(!cancelled&&!readYeongnyangiGuideHidden()&&readFirstVisit('yeongnyangi').status==='new'&&!firstVisitOverlayBusy(document))show();};
  const observer=new MutationObserver(offer);
  const timer=setTimeout(()=>{offer();observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open','class','hidden','aria-hidden']});},1400);
  return()=>{cancelled=true;clearTimeout(timer);observer.disconnect();};
 // show uses current DOM refs; state changes dispose the pending offer.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[state?.status,scope,profiles.loading,profiles.error]);
 useEffect(()=>{dialog.current?.close();},[scope]);
 useEffect(()=>{if(state?.status==='active')setScene(Math.min(2,Math.max(0,state.step-1)));},[state?.status,state?.step]);
 useEffect(()=>{
  if(state?.status==='active'&&state.step===1&&!profiles.loading&&!profiles.error&&!profiles.guest&&selected){
   writeFirstVisit('yeongnyangi','active',2);firstVisitEvent('yeongnyangi','step',2);
  }
 },[state,profiles.loading,profiles.error,profiles.guest,selected]);
 function start(){
  clearYeongnyangiGuideHidden();setHidden(false);
  writeFirstVisit('yeongnyangi','active',1);firstVisitEvent('yeongnyangi','start',1);
  requestAnimationFrame(()=>{dialog.current?.querySelector<HTMLElement>('input,select,a')?.focus();});
 }
 const active=state?.status==='active'&&!hidden;
 return <section className={styles.guide} aria-label={t('guideLabel')} ref={panel} tabIndex={-1}>
  <div className={styles.bar}><button ref={replay} type="button" onClick={show} aria-label={t('open')}>{t('how')}</button></div>
  <dialog ref={dialog} className={styles.welcome} aria-labelledby="yn-first-title" aria-describedby="yn-first-description" onCancel={event=>{event.preventDefault();dismiss();}}>
   <button className={styles.close} type="button" aria-label={t('close')} onClick={dismiss}><X size={20}/></button>
   <h2 id="yn-first-title">{t('title')}</h2>
   <p id="yn-first-description">{t('intro')}</p>
  <div className={styles.story}>
   <nav className={styles.sceneNav} aria-label={t('scenesLabel')}>{scenes.map((item,index)=><button type="button" key={item.id} aria-pressed={scene===index} onClick={()=>setScene(index)}><span>{index+1}</span>{item.label}</button>)}</nav>
   <div className={styles.scene}>
    <GuideArt step={scene}/>
    <div className={styles.speech} aria-live="polite"><span className={styles.speaker}>{t('title')}</span><h3>{scenes[scene].title}</h3><p>{scenes[scene].speech}</p><button type="button" className={styles.nextScene} onClick={()=>setScene((scene+1)%scenes.length)}>{t(scene===2?'restart':'next')} <ArrowRight size={16}/></button></div>
   </div>
  </div>

  {active&&<div className={styles.body}>
   <ol className={styles.steps} aria-label={t('stepsLabel')}><li aria-current={state.step===1?'step':undefined}>1. {t('profileLabel')}</li><li aria-current={state.step>=2?'step':undefined}>2. {t('concernLabel')}</li><li>3. {t('priceLabel')}</li></ol>
   <h2>{t(selected?'profileReady':'profileQuestion')}</h2>
   <p>{t('profileHelp')}</p>
   <ProfilePicker state={profiles} locale={locale} showPolicyNote={false} onLogin={()=>{firstVisitLogin('yeongnyangi');loginForCurrentPage();}}/>
   <p className={styles.note}>{t('profileFree')}</p>
   <a className={styles.primary} href="#questions" onClick={()=>{writeFirstVisit('yeongnyangi','active',2);firstVisitEvent('yeongnyangi','step',2);close();}}>{t('chooseConcern')} <ArrowRight size={18}/></a>
   <p className={styles.note}>{t('priceHelp')}</p>
   <a href="/yeongnyangi/room/#daily">{t('dailyLink')}</a>
   <p className={styles.note}>{t('dailyHelp')}</p>
   <button className={styles.textButton} type="button" onClick={dismiss}>{t('dismiss')}</button>
  </div>}

   {!active&&<button className={styles.primary} type="button" onClick={start}>{t('start')} <ArrowRight size={18}/></button>}
   <button className={styles.textButton} type="button" onClick={dismiss}>{t('later')}</button>
   <button className={styles.textButton} type="button" onClick={hideToday}>{t('hideToday')}</button>
  </dialog>
 </section>;
}
