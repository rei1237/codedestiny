"use client";
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,BookOpen,Fish,MessageCircle,Moon,PawPrint,Stars,WandSparkles} from 'lucide-react';
import dynamic from 'next/dynamic';

import {RoomSoundControls,useRoomSoundtrack} from './RoomSoundtrack';
import RoomInteractions from './RoomInteractions';
import ServiceNavigation from './ServiceNavigation';
import FreeFortune from '../_components/FreeFortune';
import SortingHat from '../_components/SortingHat';
import DailyTarotCard from '../_components/DailyTarotCard';
import PetMascot from '../_components/PetMascot';
import './original.css';
import './room.css';
import './room-story.css';
import styles from './room-shelf.module.css';

const StoryPanel=dynamic(()=>import('./StoryPanel'),{ssr:false});
const asset=(name:string)=>`/assets/yeongnyangi/original/${name}.webp`;
const petLines=[
 ['뭘 그렇게 봐.','…모자 비뚤어졌어?'],
 ['손 흔든 거 아니야.','…아무튼, 반가워.'],
 ['고등어? 잠깐 줘 봐.','냄새만 맡는다니까.'],
 ['봤어?','아니, 바닥이 나를 밀었어.'],
];
const destinations=[
 {href:'#room-chat',label:'잡담',icon:MessageCircle,tone:'lilac'},
 {href:'#sorting-hat',label:'모자 이야기',icon:WandSparkles,tone:'lilac'},
 {href:'#daily',label:'오늘의 무료 운세',icon:Fish,tone:'gold'},
 {href:'#daily-tarot',label:'오늘·내일 타로',icon:Stars,tone:'gold'},
] as const;

export default function Room(){
 const [storyOpen,setStoryOpen]=useState(false),[reaction,setReaction]=useState<number|null>(null);
 const [storyMood,setStoryMood]=useState<Parameters<typeof useRoomSoundtrack>[0]>('quiet');
 const opener=useRef<HTMLElement|null>(null);
 const sound=useRoomSoundtrack(storyOpen?storyMood:'room');
 const speech=reaction===null?['어서 와.','네 방석은 비워뒀어.']:petLines[reaction]??petLines[0];
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
 function readDaily(){window.location.hash='daily';requestAnimationFrame(()=>{document.getElementById('daily')?.focus({preventScroll:true});document.getElementById('daily')?.scrollIntoView({block:'start'});});}
 return <div className="ynOriginal"><main className="yeongnyang-room">
  <header className="room-header"><a href="/yeongnyangi/" className="room-round-button" aria-label="메인으로 돌아가기"><ArrowLeft size={22}/></a><h1><PawPrint size={19}/>영냥이의 방</h1><span className="room-round-button" aria-hidden="true"><Moon size={18}/></span></header>
  <div className="room-listening"><span>오늘 밤은, 혼자가 아니도록.</span><RoomSoundControls sound={sound}/></div>
  <div className={`room-layout ${styles.content}`}>
   <section className="room-presence" aria-label="달빛 아래 영냥이의 점술방">
    <img className="room-scenery" src={asset('room-1440')} srcSet={`${asset('room-780')} 780w, ${asset('room-1440')} 1440w`} sizes="(min-width: 900px) 58vw, 100vw" width={1440} height={810} alt="" fetchPriority="high"/>
    <div className="room-welcome"><Moon size={14}/>잠깐, 여기서 쉬어가.</div>
    <div className="room-cat-speech" aria-live="polite" aria-atomic="true">{speech[0]}<br/>{speech[1]}</div>
    <PetMascot className="room-resident" alt="방석 위에서 이야기를 기다리는 영냥이" onReact={setReaction}/>
    <p className="room-presence-caption">남의 운명을 읽던 눈이, 오늘은 너를 기다린다.</p>
   </section>
  <nav className={styles.shelf} aria-label="영냥이의 방 콘텐츠">
   <button type="button" id="room-story-title" className={styles.tile} data-tone="gold" aria-haspopup="dialog" onClick={openStory}><BookOpen size={17} aria-hidden="true"/><span>프롤로그</span></button>
   {destinations.map(({href,label,icon:Icon,tone})=><a key={href} href={href} className={styles.tile} data-tone={tone}><Icon size={17} aria-hidden="true"/><span>{label}</span></a>)}
  </nav><p className={styles.reward}>로그인 후 출석으로 모은 멸치 3마리로 오늘의 운세와 타로를 함께 열어요.</p>
   <RoomInteractions/>
   <SortingHat/>
   <FreeFortune/>
   <DailyTarotCard/>
  </div><footer className="room-footer"><PawPrint size={18}/>오늘도, 네 이야기에 작은 달빛 하나.</footer>
  {storyOpen&&<StoryPanel inRoom onClose={closeStory} onDaily={readDaily} onMood={setStoryMood} soundControls={<RoomSoundControls sound={sound}/>}/>}
 </main><ServiceNavigation/></div>;
}
