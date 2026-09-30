"use client";
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Moon,PawPrint,Sparkles,X} from 'lucide-react';
import StoryPanel from './StoryPanel';
import {story} from './home-data';
import {RoomSoundControls,useRoomSoundtrack} from './RoomSoundtrack';
import RoomInteractions from './RoomInteractions';
import CatMotion from './CatMotion';
import ServiceNavigation from './ServiceNavigation';
import FreeFortune from '../_components/FreeFortune';
import DailyTarotCard from '../_components/DailyTarotCard';
import './original.css';
import './room.css';
import './room-story.css';

const asset=(name:string)=>`/assets/yeongnyangi/original/${name}.webp`;
export default function Room(){
 const [storyOpen,setStoryOpen]=useState(false),[step,setStep]=useState(0),[reaction,setReaction]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null),storyButton=useRef<HTMLButtonElement>(null),opener=useRef<HTMLElement|null>(null);
 const sound=useRoomSoundtrack(storyOpen?story[step].mood:'room');
 useEffect(()=>{if(window.location.hash==='#story')setStoryOpen(true);},[]);
 useEffect(()=>{
  if(!storyOpen)return;
  dialog.current?.showModal();
  const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
  return ()=>{document.body.style.overflow=overflow;};
 },[storyOpen]);
 function openStory(){opener.current=document.activeElement as HTMLElement;setStep(0);setStoryOpen(true);}
 function closeStory(){dialog.current?.close();setStoryOpen(false);(opener.current||storyButton.current)?.focus();}
 function readDaily(){closeStory();window.location.hash='daily';requestAnimationFrame(()=>{document.getElementById('daily')?.focus();document.getElementById('daily')?.scrollIntoView({block:'start'});});}
 return <div className="ynOriginal"><main className="yeongnyang-room">
  <header className="room-header"><a href="/yeongnyangi/" className="room-round-button" aria-label="메인으로 돌아가기"><ArrowLeft size={22}/></a><h1><PawPrint size={19}/>영냥이의 방</h1><a href="/yeongnyangi/library/" className="room-round-button" aria-label="나의 상담 보기"><BookOpen size={18}/></a></header>
  <div className="room-listening"><span>오늘 밤은, 혼자가 아니도록.</span><RoomSoundControls sound={sound}/></div>
  <div className="room-layout">
   <section className="room-presence" aria-label="달빛 아래 영냥이의 점술방">
    <img className="room-scenery" src={asset('room-1440')} srcSet={`${asset('room-780')} 780w, ${asset('room-1440')} 1440w`} sizes="(min-width: 900px) 58vw, 100vw" width={1440} height={810} alt="" fetchPriority="high"/>
    <div className="room-welcome"><Moon size={14}/>잠깐, 여기서 쉬어가.</div>
    <div className="room-cat-speech" aria-live="polite">{reaction?<>머리는 안 된다고 했…<br/>조금만 더 있다 가.</>:<>어서 와.<br/>네 자리는 비워뒀어.</>}</div>
    <button className="room-resident" aria-label="영냥이 쓰다듬기" aria-pressed={reaction} onClick={()=>setReaction(v=>!v)}><img src={asset(reaction?'prologue-cat':'hero-800')} width={480} height={480} alt="방석 위에서 이야기를 기다리는 영냥이"/></button>
    <p className="room-presence-caption">남의 운명을 읽던 눈이, 오늘은 너를 기다린다.</p>
   </section>
   <RoomInteractions onStory={openStory}/>
   <section className="room-stories" aria-labelledby="room-story-title">
    <div className="room-story-heading"><BookOpen size={19}/><h2 id="room-story-title">내 이름이 네오였던 밤</h2></div>
    <button ref={storyButton} className="room-prologue-entry" onClick={openStory}><img src={asset('neo-mirror-grief')} width={1440} height={960} alt="" loading="lazy"/><span><strong>두 대통령의 운명을 맞혔다.<br/>그 대가로, 나의 내일을 잃었다.</strong><span>네오에서 영냥이로. 아홉 장면의 이야기와 네가 건네는 위로.</span><b>이야기 펼치기 <ArrowRight size={16}/></b></span></button>
   </section>
   <section className="room-small-moment" aria-label="영냥이의 작은 휴식"><CatMotion/><div><Sparkles size={18}/><h2>한숨 끝에도,<br/>네 자리는 남겨둘게.</h2><p>웃는 날에도, 그렇지 못한 날에도.<br/>다른 표정의 영냥이를 만나봐.</p><a className="room-fortune-link" href="/yeongnyangi/fortune/">상담 내용 살펴보기<ArrowRight size={16}/></a><a className="room-fortune-link" href="/yeongnyangi/library/">내 상담 이어보기<BookOpen size={16}/></a></div></section>
   <DailyTarotCard/>
   <FreeFortune/>
  </div><footer className="room-footer"><PawPrint size={18}/>오늘도, 네 이야기에 작은 달빛 하나.</footer>
  {storyOpen&&<dialog ref={dialog} className="experience-dialog story-dialog" aria-label="영냥이의 프롤로그" onCancel={event=>{event.preventDefault();closeStory();}}><div className="dialog-inner"><div className="dialog-header"><span><BookOpen size={17}/>내 이름이 네오였던 밤</span><button className="icon-button" aria-label="닫기" onClick={closeStory}><X size={22}/></button></div><StoryPanel step={step} onPrevious={()=>setStep(v=>Math.max(0,v-1))} onNext={()=>setStep(v=>Math.min(story.length-1,v+1))} onClose={closeStory} onReading={readDaily} soundControls={<RoomSoundControls sound={sound}/>}/></div></dialog>}
 </main><ServiceNavigation/></div>;
}
