import {lazy,Suspense,useEffect,useRef,useState} from 'react';
import {ArrowLeft,BookOpen,Fish,MessageCircle,PawPrint,Stars,WandSparkles} from 'lucide-react';
import RoomPresence from '../../../app/yeongnyangi/_home/RoomPresence';
import RoomInteractions from '../../../app/yeongnyangi/_home/RoomInteractions';
import {RoomSoundControls,useRoomSoundtrack} from '../../../app/yeongnyangi/_home/RoomSoundtrack';
import RoomDaily from './RoomDaily';
import '../../../app/yeongnyangi/_home/room.css';
import '../../../app/yeongnyangi/_home/room-story.css';
import styles from '../../../app/yeongnyangi/_home/room-shelf.module.css';
import './yeongnyangi-room.css';

declare const __TOSS_ROOM_PREVIEW__:boolean;
const StoryPanel=lazy(()=>import('../../../app/yeongnyangi/_home/StoryPanel'));
type Mood=Parameters<typeof useRoomSoundtrack>[0];

export default function YeongnyangiRoom(){
 const [story,setStory]=useState(()=>location.hash==='#story');
 const [mood,setMood]=useState<Mood>('quiet');
 const opener=useRef<HTMLButtonElement>(null);
 const activeMood=story?mood:'room';
 const sound=useRoomSoundtrack(activeMood,__TOSS_ROOM_PREVIEW__?'/__room-art/sound.wav?mood='+activeMood:undefined);
 function closeStory(){
  setStory(false);
  if(location.hash==='#story')history.replaceState(history.state,'',location.pathname+location.search);
  requestAnimationFrame(()=>opener.current?.focus({preventScroll:true}));
 }
 useEffect(()=>{
  if(!story)return;
  const back=(event:Event)=>{
   const dialog=document.querySelector<HTMLDialogElement>('dialog[aria-label="영냥이의 프롤로그"]');
   event.preventDefault();
   if(dialog?.open)dialog.dispatchEvent(new Event('cancel',{cancelable:true}));
   else closeStory();
  };
  window.addEventListener('code-destiny:toss-overlay-back',back);
  return ()=>window.removeEventListener('code-destiny:toss-overlay-back',back);
 },[story]);
 return <div className="ynOriginal toss-yn-room"><section className="yeongnyang-room">
  <header className="room-header"><a className="room-round-button" href="/?world=yeongnyangi" aria-label="영냥이 홈으로 돌아가기"><ArrowLeft size={20}/></a><h1><PawPrint size={19}/>영냥이의 방</h1></header>
  <div className="room-listening"><span>{__TOSS_ROOM_PREVIEW__?'모의 음원으로 재생과 음량을 확인해요.':'오늘 밤은, 혼자가 아니도록.'}</span><RoomSoundControls sound={sound}/></div>
  <div className={'room-layout '+styles.content}>
   <RoomPresence atlasSize={__TOSS_ROOM_PREVIEW__?512:1024}/>
   <nav className={styles.shelf} aria-label="영냥이의 방 콘텐츠">
    <button ref={opener} type="button" className={styles.tile} data-tone="gold" aria-haspopup="dialog" onClick={()=>setStory(true)}><BookOpen size={17}/>프롤로그</button>
    <a href="#room-chat" className={styles.tile} data-tone="lilac"><MessageCircle size={17}/>잡담</a>
    <a href="/yeongnyangi/hat/" className={styles.tile} data-tone="lilac" data-hat-entry><WandSparkles size={17}/>모자 이야기</a>
    <a href="#daily" className={styles.tile} data-tone="gold"><Fish size={17}/>오늘의 무료 운세</a>
    <a href="#daily-tarot" className={styles.tile} data-tone="gold"><Stars size={17}/>오늘·내일 타로</a>
   </nav>
   <RoomInteractions/>
   <RoomDaily/>
  </div>
  {story&&<Suspense fallback={<p role="status">프롤로그를 펼치고 있어요.</p>}><StoryPanel inRoom sourceLinks={!__TOSS_ROOM_PREVIEW__} onMood={setMood} onClose={closeStory} onDaily={()=>requestAnimationFrame(()=>document.getElementById('daily')?.scrollIntoView())} soundControls={<RoomSoundControls sound={sound}/>}/></Suspense>}
 </section></div>;
}
