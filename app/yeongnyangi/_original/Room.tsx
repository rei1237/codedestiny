"use client";
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Moon,PawPrint,Sparkles,X} from 'lucide-react';
import StoryPanel from './StoryPanel';
import CatMotion from './CatMotion';
import ServiceNavigation from './ServiceNavigation';
import FreeFortune from '../_components/FreeFortune';
import './original.css';
import './room.css';

const asset=(name:string)=>`/assets/yeongnyangi/original/${name}.webp`;
export default function Room(){
 const [storyOpen,setStoryOpen]=useState(false),[step,setStep]=useState(0),[reaction,setReaction]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null),storyButton=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(window.location.hash==='#story')setStoryOpen(true);},[]);
 useEffect(()=>{
  if(!storyOpen)return;dialog.current?.showModal();const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
  return ()=>{document.body.style.overflow=overflow;};
 },[storyOpen]);
 function closeStory(){dialog.current?.close();setStoryOpen(false);storyButton.current?.focus();}
 return <div className="ynOriginal"><main className="yeongnyang-room">
  <header className="room-header"><a href="/yeongnyangi/" className="room-round-button" aria-label="메인으로 돌아가기"><ArrowLeft size={22}/></a><h1><PawPrint size={19}/>영냥이의 방</h1><a href="/yeongnyangi/library/" className="room-round-button" aria-label="나의 상담 보기"><BookOpen size={18}/></a></header>
  <div className="room-layout">
   <section className="room-presence" aria-label="달빛 아래 영냥이의 점술방">
    <img className="room-scenery" src={asset('room-1440')} srcSet={`${asset('room-780')} 780w, ${asset('room-1440')} 1440w`} sizes="(min-width: 900px) 58vw, 100vw" width={1440} height={810} alt="" fetchPriority="high"/>
    <div className="room-welcome"><Moon size={14}/>잠깐, 여기서 쉬어가.</div><div className="room-cat-speech" aria-live="polite">{reaction?<>말이 좀 엉켜도 괜찮아.<br/>천천히 풀어보자.</>:<>어서 와.<br/>오늘은 무슨 이야기야?</>}</div>
    <button className="room-resident" aria-label="영냥이 쓰다듬기" onClick={()=>setReaction(v=>!v)}><img src={asset(reaction?'prologue-cat':'hero-800')} width={480} height={480} alt="방석 위에서 이야기를 기다리는 영냥이"/></button><p className="room-presence-caption">거창한 고민이 아니어도 돼.</p>
   </section>
   <section className="room-conversation" id="room-conversation"><h2>그래서, 무슨 이야기야?</h2><p>궁금한 운세를 고르면, 네 프로필과 고민을 바탕으로 차근차근 읽어줄게.</p><a className="room-fortune-link" href="/yeongnyangi/fortune/">생선 상품과 상담 내용 살펴보기<ArrowRight size={16}/></a><a className="room-fortune-link" href="/yeongnyangi/library/">이미 결제한 상담 이어가기<BookOpen size={16}/></a></section>
   <FreeFortune/>
   <section className="room-stories" aria-labelledby="room-story-title"><div className="room-story-heading"><BookOpen size={19}/><h2 id="room-story-title">내 얘기도, 들어볼래?</h2></div><button ref={storyButton} className="room-prologue-entry" onClick={()=>{setStep(0);setStoryOpen(true);}}><img src={asset('story-mirror')} width={480} height={270} alt="" loading="lazy"/><span><strong>두 대통령의 운명을 맞힌 밤,<br/>나는 고양이가 됐다.</strong><span>영묘진인에서 영냥이로. 그날의 이야기.</span><b>프롤로그 보기 <ArrowRight size={16}/></b></span></button></section>
   <section className="room-small-moment" aria-label="영냥이의 작은 휴식"><CatMotion/><div><Sparkles size={18}/><h2>조금 쉬어도 괜찮아.</h2><p>답을 빨리 찾는 것보다,<br/>네 마음을 놓치지 않는 게 먼저야.</p></div></section>
  </div><footer className="room-footer"><PawPrint size={18}/>오늘도, 네 이야기에 작은 달빛 하나.</footer>
  {storyOpen&&<dialog ref={dialog} className="experience-dialog story-dialog" aria-label="영냥이의 프롤로그" onCancel={event=>{event.preventDefault();closeStory();}}><div className="dialog-inner"><div className="dialog-header"><span><BookOpen size={17}/>영냥이의 방 · 프롤로그</span><button className="icon-button" aria-label="닫기" onClick={closeStory}><X size={22}/></button></div><StoryPanel step={step} onPrevious={()=>setStep(v=>Math.max(0,v-1))} onNext={()=>setStep(v=>Math.min(7,v+1))} onClose={closeStory} onReading={()=>window.location.assign('/yeongnyangi/fortune/')}/></div></dialog>}
 </main><ServiceNavigation/></div>;
}
