"use client";
import {memo,useEffect,useState,type CSSProperties} from 'react';
import {BOW_CLIP,PREVIEW_CLIPS,ASSET_BASE} from '../model-review/sprite-clips';
import {CYCLE_MS,poseAt} from '../model-review/bow-session';
import type {Character as CharacterKind} from '../_lib/session-policy';
import type {AvatarStyle} from '../_lib/use-space-profile';
import {HANBI_ART,COMPANION_ART,speciesOf,isZodiac,companionName,zodiacSheet,zodiacBow,zodiacStill,zodiacFrame} from '../_lib/companions';
import styles from '../space.module.css';
import YeoniSprite from '../model-review/Sprite';
import type {Sheet} from '../model-review/sprite-clips';
export type Activity='idle'|'greeting'|'meditation'|'bow'|'prayer'|'affirmation';
function catFrame(activity:Activity,elapsed:number,step:number,base=COMPANION_ART+'/cat'){
 if(activity==='bow'){return{url:base+'-bow.webp',frame:elapsed>=CYCLE_MS?0:Math.min(15,Math.floor(elapsed/CYCLE_MS*16))};}
 const sequence=activity==='meditation'?[8,9,10,11,10,9]:activity==='greeting'?[0,4,5,6,7,6,7,5,4,0]:activity==='prayer'?[12]:activity==='affirmation'?[14]:[0,0,0,0,0,1,2,1];
 return{url:base+'-motion.webp',frame:sequence[step%sequence.length]};
}
export default memo(function Character({kind,activity,elapsed,reduced,look,image,onFailure}:{kind:CharacterKind;activity:Activity;elapsed:number;reduced:boolean;look:AvatarStyle;image:string;portrait:string;onFailure:()=>void}){
 const [step,setStep]=useState(0),[ready,setReady]=useState(false);
 const species=speciesOf(look,image);
 if(kind==='custom'&&species==='yeongnyangi')kind='cat';
 if(kind==='custom'&&!isZodiac(species)&&species!=='hanbi')kind='yeoni';
 const hanbi=kind==='custom'&&species==='hanbi';
 const zodiac=kind==='custom'&&isZodiac(species)?species:null;
 const effective=reduced?'idle':activity;
 const bow=poseAt(elapsed);
 const sequence=PREVIEW_CLIPS[effective==='meditation'?'meditation':effective==='greeting'?'greeting':'idle'];
 const frame=effective==='bow'?{sheet:BOW_CLIP[bow.step].sheet,frame:bow.frame}:effective==='prayer'?{sheet:'bow-down',frame:2}:effective==='affirmation'?{sheet:'expressions',frame:14}:sequence[step%sequence.length];
 const drawing=hanbi?catFrame(effective,elapsed,step,HANBI_ART):zodiac?{url:effective==='bow'?zodiacBow(zodiac):zodiacSheet(zodiac),frame:zodiacFrame(effective,elapsed/CYCLE_MS,step)}:(kind==='cat'||hanbi)?catFrame(effective,elapsed,step):{url:ASSET_BASE+'/'+frame.sheet+'.webp',frame:frame.frame};
 useEffect(()=>{
  setStep(0);
  if(reduced||activity==='bow'||activity==='prayer'||activity==='affirmation')return;
  let timer:ReturnType<typeof setTimeout>,index=0;
  const tick=()=>{if(!document.hidden){index++;setStep(index);}timer=setTimeout(tick,(kind==='cat'||hanbi)?(activity==='idle'?500:300):sequence[index%sequence.length].ms);};
  timer=setTimeout(tick,(kind==='cat'||hanbi)?300:sequence[0].ms);return()=>clearTimeout(timer);
 },[activity,reduced,kind,hanbi,sequence]);
 useEffect(()=>{
  let cancelled=false;setReady(false);
  const still=hanbi?HANBI_ART+'-still.webp':zodiac?zodiacStill(zodiac):(kind==='cat'||hanbi)?COMPANION_ART+'/cat-still.webp':ASSET_BASE+'/still.webp';
  const urls=reduced?[still]:hanbi?[HANBI_ART+(activity==='bow'?'-bow.webp':'-motion.webp')]:zodiac?[zodiacSheet(zodiac),...(activity==='bow'?[zodiacBow(zodiac)]:[])]:(kind==='cat'||hanbi)?['cat-bow','cat-motion'].map(name=>COMPANION_ART+'/'+name+'.webp'):activity==='bow'?['bow-down','bow-lower','bow-up'].map(name=>ASSET_BASE+'/'+name+'.webp'):[drawing.url];
  Promise.all(urls.map(async url=>{const img=new Image();img.src=url;await img.decode();})).then(()=>{if(!cancelled)setReady(true);}).catch(()=>{if(!cancelled)onFailure();});
  return()=>{cancelled=true;};
 // URL changes between already-decoded bow sheets must not reset the view.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[kind,activity,zodiac,hanbi,reduced]);
 const style:CSSProperties={backgroundImage:'url('+drawing.url+')',backgroundPosition:`${drawing.frame%4/3*100}% ${Math.floor(drawing.frame/4)/3*100}%`};
 if(kind==='yeoni'&&ready&&!reduced)return <YeoniSprite sheet={frame.sheet as Sheet} frame={frame.frame} reduced={reduced} label={'연이 · '+(activity==='bow'?bow.phase:'함께 쉬는 중')}/>;
 return <div className={styles.characterDrawing} role="img" aria-label={(hanbi?'서한비':zodiac?companionName(zodiac):(kind==='cat'||hanbi)?'영냥이':'연이')+' · '+(activity==='bow'?bow.phase:activity==='meditation'?'명상 중':'함께 쉬는 중')} data-character={hanbi?'hanbi':zodiac||kind} data-frame={drawing.frame} style={ready&&!reduced?style:{backgroundImage:`url(${hanbi?HANBI_ART+'-still.webp':zodiac?zodiacStill(zodiac):(kind==='cat'||hanbi)?COMPANION_ART+'/cat-still.webp':ASSET_BASE+'/still.webp'})`,backgroundSize:'100%'}} />;
});
