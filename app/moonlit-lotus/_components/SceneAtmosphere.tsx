"use client";
import {memo,useEffect,useRef,useState} from 'react';
import type {Scene,SceneView} from '../_lib/scene-views';
import styles from './scene-atmosphere.module.css';

/** Decorative motion has no clock or relationship to the private bow session. */
export default memo(function SceneAtmosphere({scene,view,portrait,disabled}:{scene:Scene;view:SceneView;portrait:boolean;disabled:boolean}){
 const element=useRef<HTMLDivElement>(null);
 const [playing,setPlaying]=useState(false);
 useEffect(()=>{
  if(disabled){setPlaying(false);return;}
  const target=element.current;if(!target)return;
  let visible=false,leaving=false;
  const sync=()=>setPlaying(visible&&!leaving&&!document.hidden);
  const hide=()=>{leaving=true;sync();};
  const show=()=>{leaving=false;sync();};
  const observer=new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);sync();});
  observer.observe(target);
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('pagehide',hide);window.addEventListener('pageshow',show);
  return()=>{observer.disconnect();document.removeEventListener('visibilitychange',sync);window.removeEventListener('pagehide',hide);window.removeEventListener('pageshow',show);};
 },[disabled]);
 if(disabled)return null;
 return <div ref={element} className={styles.atmosphere} aria-hidden="true" data-photo-hide data-atmosphere-scene={scene} data-portrait={portrait} data-playing={playing}>
  {view==='front'&&(scene==='pond'?<div className={styles.water}><i/><i/></div>:<><i className={styles.lampLeft}/><i className={styles.lampRight}/></>)}
  <div className={styles.motes}><i/><i/><i/></div>
 </div>;
});
