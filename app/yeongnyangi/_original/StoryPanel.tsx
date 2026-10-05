"use client";

import {useEffect, useRef, useState, type ReactNode} from 'react';
import Image from 'next/image';
import {ArrowLeft, ArrowRight, PawPrint} from 'lucide-react';
import {story} from './home-data';
const assetPath = (name:string) => `/assets/yeongnyangi/original/${name}.webp`;

export default function StoryPanel({step,onPrevious,onNext,onClose,onReading,soundControls}:{
 step:number; onPrevious:()=>void; onNext:()=>void; onClose:()=>void; onReading:()=>void; soundControls?:ReactNode;
}){
 const readingRef = useRef<HTMLDivElement>(null);
 const [choices,setChoices] = useState<Record<number,number>>({});
 const scene = story[step];
 const last = step===story.length-1;
 useEffect(()=>{
  if(readingRef.current) readingRef.current.scrollTop=0;
  const next=story[step+1];
  if(!next)return;
  const links=[next.background,...(next.fullArt?[]:[next.character,next.after])].filter(Boolean).map(name=>{
   const link=document.createElement('link');link.rel='prefetch';link.as='image';link.href=assetPath(name!);document.head.appendChild(link);return link;
  });
  return ()=>links.forEach(link=>link.remove());
 },[step]);
 return <div className="story-panel">
  <div key={`visual-${step}`} className={`story-visual mood-${scene.mood}${scene.portrait?' is-portrait':''}${scene.fullArt?' is-full-art':''}`}>
   <Image className="story-background" src={assetPath(scene.background)} alt={scene.fullArt?'고양이가 된 네오가 거울 속 인간 시절의 자신과 손을 맞대며 눈물을 흘린다.':''} width={1440} height={960}/>
   {!scene.fullArt&&<div className={`story-cast${scene.after?' has-transition':''}`} aria-hidden="true">
    <Image className="story-character first-frame" src={assetPath(scene.character)} alt="" width={520} height={520}/>
    {scene.after&&<Image className="story-character final-frame" src={assetPath(scene.after)} alt="" width={520} height={520}/>}
   </div>}
   <span className="story-scene-caption">네오, 그리고 영냥이</span>
  </div>
  <div className="story-reading" ref={readingRef} tabIndex={0} aria-label="이야기 본문">
   {soundControls}
   <div className="story-progress" role="group" aria-label={`${step+1} / ${story.length} 장면`}>{story.map((item,index)=><span key={item.title} className={index<=step?'read':''}/>)}</div>
   <div className="story-text" aria-live="polite" aria-atomic="true">
    <h2>{scene.title}</h2><span className="story-page-number">{String(step+1).padStart(2,'0')} / {String(story.length).padStart(2,'0')}</span>
    {scene.text.split('\n\n').map((text,index)=><p key={`${step}-${index}`}>{text}</p>)}
    <blockquote>{scene.line}</blockquote>
    {scene.recordUrl&&<p><a href={scene.recordUrl} target="_blank" rel="noopener noreferrer">게시일과 예측 원문 확인하기 ↗</a></p>}
   </div>
   {scene.choices&&<div className="story-choices"><p>이 순간, 네가 곁에 있다면.</p><div>{scene.choices.map((choice,index)=><button type="button" key={choice.label} aria-pressed={choices[step]===index} onClick={()=>setChoices(previous=>({...previous,[step]:index}))}>{choice.label}</button>)}</div><p className="story-choice-reply" role="status">{choices[step]!==undefined?scene.choices[choices[step]].reply:''}</p></div>}
   {step===0&&<p className="story-fiction-note">실제 공개 분석 기록에서 시작한 영냥이의 세계관 이야기입니다. 과거 사례가 앞으로의 결과를 보장하지는 않습니다. 하늘의 저주와 고양이 변신은 창작 설정입니다.</p>}
  </div>
  <div className="story-controls">
   <button className="icon-button" aria-label="이전 장면" disabled={step===0} onClick={onPrevious}><ArrowLeft size={19}/></button>
   <button className="story-next" onClick={last?onReading:onNext}>{last&&<PawPrint size={17}/>} {last?'멸치로 오늘의 운세 보기':'다음 이야기'}<ArrowRight size={17}/></button>
   <button className="story-exit" onClick={onClose}>{last?'영냥이 곁에 머물기':'이야기 나가기'}</button>
  </div>
 </div>;
}
