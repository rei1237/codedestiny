"use client";
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Moon,PawPrint,Sparkles} from 'lucide-react';
import dynamic from 'next/dynamic';

import {RoomSoundControls,useRoomSoundtrack} from './RoomSoundtrack';
import RoomInteractions from './RoomInteractions';
import CatMotion from './CatMotion';
import ServiceNavigation from './ServiceNavigation';
import FreeFortune from '../_components/FreeFortune';
import SortingHat from '../_components/SortingHat';
import DailyTarotCard from '../_components/DailyTarotCard';
import './original.css';
import './room.css';
import './room-story.css';

const StoryPanel=dynamic(()=>import('./StoryPanel'),{ssr:false});
const asset=(name:string)=>`/assets/yeongnyangi/original/${name}.webp`;
export default function Room(){
 const [storyOpen,setStoryOpen]=useState(false),[reaction,setReaction]=useState(false);
 const [storyMood,setStoryMood]=useState<Parameters<typeof useRoomSoundtrack>[0]>('quiet');
 const opener=useRef<HTMLElement|null>(null);
 const sound=useRoomSoundtrack(storyOpen?storyMood:'room');
 useEffect(()=>{
  const sync=()=>{if(window.location.hash==='#story')setStoryOpen(true);};
  sync();window.addEventListener('hashchange',sync);
  return ()=>window.removeEventListener('hashchange',sync);
 },[]);
 function openStory(){opener.current=document.activeElement instanceof HTMLElement?document.activeElement:null;setStoryOpen(true);}
 function closeStory(){
  setStoryOpen(false);
  if(location.hash==='#story')history.replaceState(history.state,'',location.pathname+location.search);
  (opener.current??document.getElementById('room-story-title'))?.focus({preventScroll:true});
 }
 function readDaily(){window.location.hash='daily';requestAnimationFrame(()=>{document.getElementById('daily')?.focus();document.getElementById('daily')?.scrollIntoView({block:'start'});});}
 return <div className="ynOriginal"><main className="yeongnyang-room">
  <header className="room-header"><a href="/yeongnyangi/" className="room-round-button" aria-label="메인으로 돌아가기"><ArrowLeft size={22}/></a><h1><PawPrint size={19}/>영냥이의 방</h1><a href="/yeongnyangi/library/" className="room-round-button" aria-label="나의 상담 보기"><BookOpen size={18}/></a></header>
  <div className="room-listening"><span>오늘 밤은, 혼자가 아니도록.</span><RoomSoundControls sound={sound}/></div>
  <nav className="room-free-nav" aria-label="무료 운세 바로가기"><a href="#sorting-hat">영냥이의 모자</a><a href="#daily-tarot">오늘의 타로</a><a href="#daily">오늘의 운세</a></nav>
  <div className="room-layout">
   <SortingHat/>
   <section className="room-presence" aria-label="달빛 아래 영냥이의 점술방">
    <img className="room-scenery" src={asset('room-1440')} srcSet={`${asset('room-780')} 780w, ${asset('room-1440')} 1440w`} sizes="(min-width: 900px) 58vw, 100vw" width={1440} height={810} alt="" fetchPriority="high"/>
    <div className="room-welcome"><Moon size={14}/>잠깐, 여기서 쉬어가.</div>
    <div className="room-cat-speech" aria-live="polite">{reaction?<>머리는 안 된다고 했…<br/>조금만 더 있다 가.</>:<>어서 와.<br/>네 자리는 비워뒀어.</>}</div>
    <button className="room-resident" aria-label="영냥이 쓰다듬기" aria-pressed={reaction} onClick={()=>setReaction(v=>!v)}><img src={asset(reaction?'prologue-cat':'hero-800')} width={480} height={480} alt="방석 위에서 이야기를 기다리는 영냥이"/></button>
    <p className="room-presence-caption">남의 운명을 읽던 눈이, 오늘은 너를 기다린다.</p>
   </section>
   <RoomInteractions onStory={openStory}/>
   <details className="room-stories"><summary id="room-story-title">영냥이의 이야기 펼쳐보기</summary>
    <div className="room-story-heading"><BookOpen size={19}/><h2>내 이름이 네오였던 밤</h2></div>
    <button className="room-prologue-entry" onClick={openStory}><img src="/assets/yeongnyangi/prologue/01.webp" width={960} height={1542} alt="" loading="lazy"/><span><strong>내 이름이 네오였던 밤.<br/>네 이야기도 들려줄래?</strong><span>네오에서 영냥이로. 거울 앞에 앉은 네오에게 네가 먼저 말을 건네는 웹툰.</span><b>이야기 펼치기 <ArrowRight size={16}/></b></span></button>
   </details>
   <section className="room-small-moment" aria-label="영냥이의 작은 휴식"><CatMotion/><div><Sparkles size={18}/><h2>한숨 끝에도,<br/>네 자리는 남겨둘게.</h2><p>웃는 날에도, 그렇지 못한 날에도.<br/>다른 표정의 영냥이를 만나봐.</p><a className="room-fortune-link" href="/yeongnyangi/fortune/">상담 내용 살펴보기<ArrowRight size={16}/></a><a className="room-fortune-link" href="/yeongnyangi/library/">내 상담 이어보기<BookOpen size={16}/></a></div></section>
   <DailyTarotCard/>
   <FreeFortune/>
  </div><footer className="room-footer"><PawPrint size={18}/>오늘도, 네 이야기에 작은 달빛 하나.</footer>
  {storyOpen&&<StoryPanel inRoom onClose={closeStory} onDaily={readDaily} onMood={setStoryMood} soundControls={<RoomSoundControls sound={sound}/>}/>}
 </main><ServiceNavigation/></div>;
}
