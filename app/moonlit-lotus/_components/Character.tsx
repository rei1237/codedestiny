"use client";
import {memo,useEffect,useRef,useState} from 'react';
import {PREVIEW_CLIPS,ASSET_BASE} from '../model-review/sprite-clips';
import {frontBowPoseAt} from '../_lib/bow-drawing';
import {CYCLE_MS,poseAt} from '../model-review/bow-session';
import type {Character as CharacterKind} from '../_lib/session-policy';
import type {AvatarStyle} from '../_lib/use-space-profile';
import {HANBI_ART,COMPANION_ART,speciesOf,isZodiac,companionName,zodiacSheet,zodiacBow,zodiacStill,zodiacFrame} from '../_lib/companions';
import {rearBase,rearLabel,companionRearPoseAt,type RearCharacterId} from '../_lib/companion-rear';
import type {SpriteDrawing} from '../_lib/sprite-images';
import AtlasSprite from './AtlasSprite';
import styles from '../space.module.css';
export type Activity='idle'|'greeting'|'meditation'|'bow'|'prayer'|'affirmation';
function catFrame(activity:Activity,elapsed:number,step:number,base=COMPANION_ART+'/cat'){
 if(activity==='bow')return{url:base+'-bow.webp',frame:elapsed>=CYCLE_MS?0:Math.min(15,Math.floor(elapsed/CYCLE_MS*16))};
 const sequence=activity==='meditation'?[8,9,10,11,10,9]:activity==='greeting'?[0,4,5,6,7,6,7,5,4,0]:activity==='prayer'?[12]:activity==='affirmation'?[14]:[0,0,0,0,0,1,2,1];
 return{url:base+'-motion.webp',frame:sequence[step%sequence.length]};
}
export default memo(function Character({kind,activity,elapsed,reduced,look,image,onFailure,rearId,walking,holding=false,attempt=0}:{kind:CharacterKind;activity:Activity;elapsed:number;reduced:boolean;look:AvatarStyle;image:string;portrait:string;onFailure:()=>void;rearId?:RearCharacterId;walking?:SpriteDrawing|null;holding?:boolean;attempt?:number}){
 const species=speciesOf(look,image);
 if(kind==='custom'&&species==='yeongnyangi')kind='cat';
 if(kind==='custom'&&!isZodiac(species)&&species!=='hanbi')kind='yeoni';
 const hanbi=kind==='custom'&&species==='hanbi',zodiac=kind==='custom'&&isZodiac(species)?species:null;
 const id=hanbi?'hanbi':zodiac||kind,clockKey=id+'-'+activity;
 const [clock,setClock]=useState({key:clockKey,step:0}),step=clock.key===clockKey?clock.step:0;
 const savedClock=useRef(clock);savedClock.current=clock;
 const bow=poseAt(elapsed),sequence=PREVIEW_CLIPS[activity==='meditation'?'meditation':activity==='greeting'?'greeting':'idle'];
 const frame=activity==='bow'?frontBowPoseAt(elapsed):activity==='prayer'?{sheet:'bow-down',frame:2}:activity==='affirmation'?{sheet:'expressions',frame:14}:sequence[step%sequence.length];
 let drawing:SpriteDrawing=hanbi?catFrame(activity,elapsed,step,HANBI_ART):zodiac?{url:activity==='bow'?zodiacBow(zodiac):zodiacSheet(zodiac),frame:zodiacFrame(activity,elapsed/CYCLE_MS,step)}:kind==='cat'?catFrame(activity,elapsed,step):{url:ASSET_BASE+'/'+frame.sheet+'.webp',frame:frame.frame};
 let preload=kind==='yeoni'&&activity==='bow'?['bow-down','bow-lower','bow-up'].map(name=>ASSET_BASE+'/'+name+'.webp'):[drawing.url];
 let fallback=hanbi?HANBI_ART+'-still.webp':zodiac?zodiacStill(zodiac):kind==='cat'?COMPANION_ART+'/cat-still.webp':ASSET_BASE+'/still.webp';
 if(rearId){
  const base=rearBase(rearId),pose=activity==='bow'?companionRearPoseAt(rearId,elapsed):{sheet:'down',frame:0};
  drawing={url:base+'/'+pose.sheet+'.webp',frame:pose.frame};preload=['down','lower','up'].map(name=>base+'/'+name+'.webp');fallback=base+'/still.webp';
 }
 if(walking)drawing=walking;
 useEffect(()=>{
  if(reduced||rearId||walking||activity==='bow'||activity==='prayer'||activity==='affirmation'||zodiac&&activity==='meditation')return;
  let timer:ReturnType<typeof setTimeout>|undefined,index=savedClock.current.key===clockKey?savedClock.current.step:0;
  const delay=()=>kind==='cat'||hanbi?(activity==='idle'?500:300):sequence[index%sequence.length].ms;
  const tick=()=>{index++;setClock({key:clockKey,step:index});schedule();};
  const schedule=()=>{if(!document.hidden)timer=setTimeout(tick,delay());};
  const visibility=()=>{clearTimeout(timer);schedule();};
  if(savedClock.current.key!==clockKey)setClock({key:clockKey,step:0});schedule();document.addEventListener('visibilitychange',visibility);
  return()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',visibility);};
 },[activity,reduced,kind,hanbi,zodiac,sequence,clockKey,rearId,!!walking]); // eslint-disable-line react-hooks/exhaustive-deps
 const label=(rearId?rearLabel(rearId):hanbi?'서한비':zodiac?companionName(zodiac):kind==='cat'?'영냥이':'연이')+' · '+(walking?'천천히 걸어가는 중':activity==='bow'?(rearId?'불상을 바라보는 뒷모습':'앞모습')+' · '+bow.phase:activity==='meditation'?'명상 중':'함께 쉬는 중');
 return <AtlasSprite className={styles.characterDrawing} identity={id+'-'+(walking?'walk':rearId?'rear':'front')+'-'+activity} drawing={drawing} label={label} fallback={fallback} preload={preload} frozen={reduced} holding={holding} attempt={attempt} onFailure={onFailure}/>;
});
