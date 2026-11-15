"use client";
import {memo,useEffect,useState,type CSSProperties} from 'react';
import {BOW_CLIP,PREVIEW_CLIPS,ASSET_BASE} from '../model-review/sprite-clips';
import {CYCLE_MS,poseAt} from '../model-review/bow-session';
import type {Character as CharacterKind} from '../_lib/session-policy';
import type {AvatarStyle} from '../_lib/use-space-profile';
import {COMPANION_ART,roomMarkup,speciesOf} from '../_lib/companions';
import styles from '../space.module.css';
import YeoniSprite from '../model-review/Sprite';
import type {Sheet} from '../model-review/sprite-clips';
import '@/styles/profile-pet.css';
export type Activity='idle'|'greeting'|'meditation'|'bow'|'prayer'|'affirmation';
function catFrame(activity:Activity,elapsed:number,step:number){
 if(activity==='bow'){return{url:COMPANION_ART+'/cat-bow.webp',frame:elapsed>=CYCLE_MS?0:Math.min(15,Math.floor(elapsed/CYCLE_MS*16))};}
 const sequence=activity==='meditation'?[8,9,10,11,10,9]:activity==='greeting'?[0,4,5,6,7,6,7,5,4,0]:activity==='prayer'?[12]:activity==='affirmation'?[14]:[0,0,0,0,0,1,2,1];
 return{url:COMPANION_ART+'/cat-motion.webp',frame:sequence[step%sequence.length]};
}
function CustomAvatar({look,portrait,activity,elapsed,reduced}:{look:AvatarStyle;reduced:boolean;portrait:string;activity:Activity;elapsed:number}){
 const seated=activity==='meditation',lower=activity==='bow'?Math.sin(Math.min(1,elapsed/CYCLE_MS)*Math.PI):0;
 const markup=roomMarkup(look,portrait).replaceAll('-body.webp',seated?'-sleep.webp':'-body.webp').replace('pg-pet--idle',seated?'pg-pet--sleep':'pg-pet--idle');
 return <div className={styles.fullCompanion} data-activity={activity} data-reduced={reduced} style={{transform:`translateY(${lower*8}%) scaleY(${1-lower*.18}) rotate(${lower*12}deg)`}} dangerouslySetInnerHTML={{__html:markup}}/>;
}
export default memo(function Character({kind,activity,elapsed,reduced,look,image,portrait,onFailure}:{kind:CharacterKind;activity:Activity;elapsed:number;reduced:boolean;look:AvatarStyle;image:string;portrait:string;onFailure:()=>void}){
 const [step,setStep]=useState(0),[ready,setReady]=useState(false);
 if(kind==='custom'&&speciesOf(look,image)==='yeongnyangi')kind='cat';
 const effective=reduced?'idle':activity;
 const bow=poseAt(elapsed);
 const sequence=PREVIEW_CLIPS[effective==='meditation'?'meditation':effective==='greeting'?'greeting':'idle'];
 const frame=effective==='bow'?{sheet:BOW_CLIP[bow.step].sheet,frame:bow.frame}:effective==='prayer'?{sheet:'bow-down',frame:2}:effective==='affirmation'?{sheet:'expressions',frame:14}:sequence[step%sequence.length];
 const drawing=kind==='cat'?catFrame(effective,elapsed,step):{url:ASSET_BASE+'/'+frame.sheet+'.webp',frame:frame.frame};
 useEffect(()=>{
  setStep(0);
  if(reduced||activity==='bow'||activity==='prayer'||activity==='affirmation')return;
  let timer:ReturnType<typeof setTimeout>,index=0;
  const tick=()=>{if(!document.hidden){index++;setStep(index);}timer=setTimeout(tick,kind==='cat'?(activity==='idle'?500:300):sequence[index%sequence.length].ms);};
  timer=setTimeout(tick,kind==='cat'?300:sequence[0].ms);return()=>clearTimeout(timer);
 },[activity,reduced,kind,sequence]);
 useEffect(()=>{
  let cancelled=false;setReady(false);
  const urls=kind==='custom'?[]:kind==='cat'?['cat-bow','cat-motion'].map(name=>COMPANION_ART+'/'+name+'.webp'):activity==='bow'?['bow-down','bow-lower','bow-up'].map(name=>ASSET_BASE+'/'+name+'.webp'):[drawing.url];
  Promise.all(urls.map(async url=>{const img=new Image();img.src=url;await img.decode();})).then(()=>{if(!cancelled)setReady(true);}).catch(()=>{if(!cancelled)onFailure();});
  return()=>{cancelled=true;};
 // URL changes between already-decoded bow sheets must not reset the view.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[kind,activity]);
 const style:CSSProperties={backgroundImage:'url('+drawing.url+')',backgroundPosition:`${drawing.frame%4/3*100}% ${Math.floor(drawing.frame/4)/3*100}%`};
 if(kind==='custom'&&speciesOf(look,image)!=='yeongnyangi')return <CustomAvatar reduced={reduced} look={look} portrait={portrait} activity={reduced?'idle':activity} elapsed={elapsed}/>;
 if(kind==='yeoni'&&ready)return <YeoniSprite sheet={frame.sheet as Sheet} frame={frame.frame} reduced={reduced} label={'연이 · '+(activity==='bow'?bow.phase:'함께 쉬는 중')}/>;
 return <div className={styles.characterDrawing} role="img" aria-label={(kind==='cat'?'영냥이':'연이')+' · '+(activity==='bow'?bow.phase:activity==='meditation'?'명상 중':'함께 쉬는 중')} data-character={kind} data-frame={drawing.frame} style={ready?style:{backgroundImage:`url(${kind==='cat'?COMPANION_ART+'/cat-still.webp':ASSET_BASE+'/still.webp'})`,backgroundSize:'100%'}} />;
});
