"use client";
import {memo,useEffect,useId,useState,type CSSProperties} from 'react';
import {BOW_CLIP,PREVIEW_CLIPS,ASSET_BASE} from '../model-review/sprite-clips';
import {poseAt} from '../model-review/bow-session';
import type {Character as CharacterKind} from '../_lib/session-policy';
import type {AvatarStyle} from '../_lib/use-space-profile';
import styles from '../space.module.css';
import YeoniSprite from '../model-review/Sprite';
import type {Sheet} from '../model-review/sprite-clips';
import '@/styles/profile-pet.css';
export type Activity='idle'|'greeting'|'meditation'|'bow'|'prayer'|'affirmation';
const CAT_TIMES=[0,600,900,1250,1650,2100,2500,3400,4500,5700,6050,6400,6850,7300,7650,8000];
function catFrame(activity:Activity,elapsed:number,step:number){
 if(activity==='bow'){let frame=0;for(let i=0;i<CAT_TIMES.length;i++)if(elapsed>=CAT_TIMES[i])frame=i;return{url:'/assets/moonlit-lotus/space-v1/cat-bow.webp',frame:elapsed>=8240?0:frame};}
 const sequence=activity==='meditation'?[8,9,10,11,10,9]:activity==='greeting'?[0,4,5,6,7,6,7,5,4,0]:activity==='prayer'?[2]:activity==='affirmation'?[14]:[0,0,0,0,0,1,2,1];
 return{url:'/assets/moonlit-lotus/space-v1/cat-motion.webp',frame:sequence[step%sequence.length]};
}
function CustomAvatar({look,image,portrait,activity,elapsed}:{look:AvatarStyle;image:string;portrait:string;activity:Activity;elapsed:number}){
 const clip=useId().replaceAll(':',''),lower=activity==='bow'?Math.sin(Math.min(1,elapsed/8240)*Math.PI):0;
 const seated=activity==='meditation',headY=seated?15:lower*95,bodyY=seated?35:lower*42;
 return <svg viewBox="0 0 384 384" role="img" aria-label={look.name+' · 프로필 이미지 아바타'}>
  <defs><clipPath id={clip}><ellipse cx="192" cy="133" rx="83" ry="79"/></clipPath><linearGradient id={clip+'body'} x2=".8" y2="1"><stop stopColor="#fff7f1"/><stop offset="1" stopColor={look.color}/></linearGradient></defs>
  <ellipse cx="165" cy="331" rx="30" ry={seated?18:23} fill={look.color}/><ellipse cx="220" cy="331" rx="30" ry={seated?18:23} fill={look.color}/>
  <ellipse cx="192" cy={268+bodyY*.45} rx={seated?75:67} ry={seated?62:80-bodyY*.45} fill={'url(#'+clip+'body)'} stroke={look.color} strokeWidth="3"/>
  <g transform={'translate(0 '+headY+')'}>
   <ellipse cx="192" cy="133" rx="87" ry="83" fill={look.color}/>
   <foreignObject x="109" y="54" width="166" height="158" clipPath={'url(#'+clip+')'}><div className={styles.customFace} style={{transform:'translate('+((look.x-50)*.25)+'%,'+((35-look.y)*.25)+'%) scale('+(look.zoom*1.7)+')',transformOrigin:'50% 30%'}} dangerouslySetInnerHTML={{__html:portrait}} /></foreignObject>
   {!image&&<><path d="M152 139q12-10 24 0m32 0q12-10 24 0M178 164q14 12 28 0" fill="none" stroke="#64465b" strokeWidth="5" strokeLinecap="round"/></>}
  </g>
  <ellipse cx={lower>.3?145:activity==='prayer'||activity==='bow'?179:133} cy={lower>.3?337:239} rx="23" ry="30" fill="#ffe3e9" stroke={look.color} strokeWidth="3"/>
  <ellipse cx={lower>.3?239:activity==='prayer'||activity==='bow'?205:251} cy={lower>.3?337:239} rx="23" ry="30" fill="#ffe3e9" stroke={look.color} strokeWidth="3"/>
 </svg>;
}
export default memo(function Character({kind,activity,elapsed,reduced,look,image,portrait,onFailure}:{kind:CharacterKind;activity:Activity;elapsed:number;reduced:boolean;look:AvatarStyle;image:string;portrait:string;onFailure:()=>void}){
 const [step,setStep]=useState(0),[ready,setReady]=useState(false);
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
  const urls=kind==='custom'?[]:kind==='cat'?['cat-bow','cat-motion'].map(name=>'/assets/moonlit-lotus/space-v1/'+name+'.webp'):activity==='bow'?['bow-down','bow-lower','bow-up'].map(name=>ASSET_BASE+'/'+name+'.webp'):[drawing.url];
  Promise.all(urls.map(async url=>{const img=new Image();img.src=url;await img.decode();})).then(()=>{if(!cancelled)setReady(true);}).catch(()=>{if(!cancelled)onFailure();});
  return()=>{cancelled=true;};
 // URL changes between already-decoded bow sheets must not reset the view.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[kind,activity]);
 const style:CSSProperties={backgroundImage:'url('+drawing.url+')',backgroundPosition:`${drawing.frame%4/3*100}% ${Math.floor(drawing.frame/4)/3*100}%`};
 if(kind==='custom')return <CustomAvatar look={look} image={image} portrait={portrait} activity={reduced?'idle':activity} elapsed={elapsed}/>;
 if(kind==='yeoni'&&ready)return <YeoniSprite sheet={frame.sheet as Sheet} frame={frame.frame} reduced={reduced} label={'연이 · '+(activity==='bow'?bow.phase:'함께 쉬는 중')}/>;
 return <div className={styles.characterDrawing} role="img" aria-label={(kind==='cat'?'영냥이':'연이')+' · '+(activity==='bow'?bow.phase:activity==='meditation'?'명상 중':'함께 쉬는 중')} data-character={kind} data-frame={drawing.frame} style={ready?style:{backgroundImage:`url(${kind==='cat'?'/assets/moonlit-lotus/space-v1/cat-still.webp':ASSET_BASE+'/still.webp'})`,backgroundSize:'100%'}} />;
});
