'use client';
import {useEffect,useRef,useState} from 'react';
import {Captions,CaptionsOff,Music,Play,RotateCcw,Sparkles,X} from 'lucide-react';
import {trackEvent} from '@/lib/analytics';
import {useBodyScrollLock} from '@/app/_lib/body-scroll-lock';
import {attachMvCardMotion} from '@/lib/navigation/mv-card-motion.mjs';
import styles from './heaven-light-cinema.module.css';

// R2(codedestinyassets) 내용해시 키라 immutable 캐시다. 영상을 바꾸면 새 키로 올리고 여기만 고친다.
// 원본은 HEAVEN LIGHT MV 무자막 마스터(1080p30)다. 가사는 영상에 굽지 않고 같은 출처의 WebVTT 트랙으로 얹는다.
const SOURCES={
 '1080p':'https://assets.code-destiny.com/yeongnyangi/mv/heaven-light-1080p-1413c0e58a63.mp4',
 '720p':'https://assets.code-destiny.com/yeongnyangi/mv/heaven-light-720p-f11929333865.mp4',
};
type Quality=keyof typeof SOURCES;
const ART='/assets/yeongnyangi/mv';
const LYRICS='/media/mv/heaven-light-ko-v5.vtt';
const CARD_SIZES='(max-width: 384px) 78vw, 300px';
// 챕터 시작(초)은 MV 타임라인의 장 경계를 그 장 첫 컷의 시작 프레임에 맞춘 값이다. 썸네일은 그 챕터 안 대표 장면의 무자막 프레임이다.
const CHAPTERS=[
 {name:'첫 번째 봄',at:0},
 {name:'피눈물의 달',at:74.7},
 {name:'두 번째 봄',at:96.2},
 {name:'달을 읽는 사람',at:110.8},
 {name:'부르는 이름',at:197.37},
 {name:'우리의 빛',at:226.9},
];
const clock=(at:number)=>`${Math.floor(at/60)}:${String(Math.floor(at%60)).padStart(2,'0')}`;
type Connection={saveData?:boolean;effectiveType?:string};
const displayPx=(width:number)=>width*Math.min(window.devicePixelRatio||1,2);
// 표시 폭 × DPR(2배까지)이 1400px 을 넘고 데이터 절약·저속 회선이 아닐 때만 1080p, 나머지는 720p.
function pickQuality(width:number):Quality{
 const connection=(navigator as Navigator&{connection?:Connection}).connection;
 const slow=Boolean(connection?.saveData)||/2g|3g/.test(connection?.effectiveType||'');
 return !slow&&displayPx(width)>1400?'1080p':'720p';
}
const pickPoster=(width:number)=>`${ART}/heaven-light-v5-poster-${displayPx(width)>960?1440:displayPx(width)>640?960:640}.webp`;
type State='idle'|'loading'|'playing'|'error';
type Source='card'|'chapter';

export default function HeavenLightCinema(){
 const deck=useRef<HTMLDivElement>(null);
 const card=useRef<HTMLElement>(null);
 const trigger=useRef<HTMLButtonElement>(null);
 const dialog=useRef<HTMLDialogElement>(null);
 const video=useRef<HTMLVideoElement>(null);
 const cover=useRef<HTMLButtonElement>(null);
 const motion=useRef<{release:()=>void;destroy:()=>void}|null>(null);
 const activate=useRef<()=>void>(()=>{});
 const stateRef=useRef<State>('idle');
 const lyricsRef=useRef(true);
 const quality=useRef<Quality>('720p');
 const playSource=useRef<Source>('card');
 const pendingSeek=useRef<number|null>(null);
 const tracked=useRef({play:false,complete:false});
 const refocus=useRef(false);
 const toQuestions=useRef(false);
 const [state,setStateValue]=useState<State>('idle');
 const [open,setOpen]=useState(false);
 // 한 번이라도 열린 뒤에만 챕터 썸네일을 그린다. 카드를 누르기 전에는 영상·포스터·썸네일을 받지 않는다.
 const [opened,setOpened]=useState(false);
 const [lyrics,setLyrics]=useState(true);
 const [chapter,setChapter]=useState(0);
 const [ended,setEnded]=useState(false);
 const [deal,setDeal]=useState<'pending'|'go'>();
 function setState(next:State){stateRef.current=next;setStateValue(next);}
 function applyLyrics(){const first=video.current?.textTracks?.[0];if(first)first.mode=lyricsRef.current?'showing':'hidden';}
 // src 는 첫 재생 때 정한다. 클릭 핸들러 안에서 바로 play() 해야 소리 있는 재생이 허용된다.
 function start(source:Source){
  const player=video.current;
  if(!player)return;
  playSource.current=source;
  if(!player.getAttribute('src')||stateRef.current==='error'){
   quality.current=pickQuality(player.clientWidth);
   player.src=SOURCES[quality.current];
  }
  if(stateRef.current!=='playing')setState('loading');
  void player.play().catch((error:DOMException)=>{
   // 불러오는 중에 닫아 멈춘 경우·자동 재생이 막힌 경우는 실패가 아니다. 재생 버튼을 다시 보여 준다.
   if(player.error||error?.name==='NotSupportedError')setState('error');
   else if(stateRef.current!=='playing')setState('idle');
  });
 }
 // 카드 모션이 클릭 안에서 동기로 부른다. showModal() 직후라 영상 폭을 재서 화질을 고를 수 있다.
 function openTheatre(){
  const box=dialog.current,player=video.current;
  if(!box||!player||box.open)return;
  box.showModal();
  setOpen(true);
  setOpened(true);
  trackEvent('yeongnyangi_mv_open');
  if(!player.getAttribute('poster'))player.poster=pickPoster(player.clientWidth);
  start('card');
 }
 function closed(){
  video.current?.pause();
  setOpen(false);
  motion.current?.release();
  if(!toQuestions.current){trigger.current?.focus({preventScroll:true});return;}
  // 운세 묻기로 닫았으면 카드 대신 바로 위 질문 여정으로 올라가 첫 입력에 포커스를 준다.
  toQuestions.current=false;
  requestAnimationFrame(()=>{
   const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   document.getElementById('questions')?.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});
   document.getElementById('home-question')?.focus({preventScroll:true});
  });
 }
 function ask(placement:'theatre_end'|'theatre_footer'){
  trackEvent('yeongnyangi_mv_cta',{placement});
  toQuestions.current=true;
  dialog.current?.close();
 }
 function replay(){
  const player=video.current;
  if(!player)return;
  player.currentTime=0;
  void player.play().catch(()=>{});
 }
 function seek(index:number){
  const player=video.current,at=CHAPTERS[index].at;
  trackEvent('yeongnyangi_mv_chapter',{chapter:index+1});
  if(!player)return;
  setChapter(index);
  if(stateRef.current==='idle'||stateRef.current==='error'||player.readyState<1){
   pendingSeek.current=at;
   if(stateRef.current!=='loading')start('chapter');
   return;
  }
  player.currentTime=at;
  if(player.paused)void player.play().catch(()=>{});
 }
 function playing(){
  refocus.current=document.activeElement===cover.current;
  setState('playing');
  if(!tracked.current.play){
   tracked.current.play=true;
   trackEvent('yeongnyangi_mv_play',{quality:quality.current,source:playSource.current});
  }
 }
 function markChapter(){
  const now=(video.current?.currentTime||0)+0.25;
  let current=0;
  CHAPTERS.forEach((item,index)=>{if(item.at<=now)current=index;});
  setChapter(current);
 }
 useEffect(()=>{activate.current=openTheatre;});
 useEffect(()=>{
  const el=deck.current;
  if(!el)return;
  const handle=attachMvCardMotion(el,()=>activate.current());
  motion.current=handle;
  return()=>{handle.destroy();motion.current=null;};
 },[]);
 useEffect(()=>{
  const el=card.current;
  if(!el||typeof IntersectionObserver==='undefined')return;
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let first=true,seen=false;
  // 카드가 화면 아래에서 시작할 때만 들어오는 순간 딜인한다. 절반 이상 보이면 노출을 한 번 센다.
  const observer=new IntersectionObserver(entries=>{
   const entry=entries[entries.length-1];
   if(first){first=false;if(!entry.isIntersecting&&!reduce)setDeal('pending');}
   if(entry.isIntersecting)setDeal(value=>value==='pending'?'go':value);
   if(!seen&&entry.intersectionRatio>=0.5){
    seen=true;
    observer.disconnect();
    trackEvent('yeongnyangi_mv_impression',{placement:'home_journey'});
   }
  },{threshold:[0,0.5]});
  observer.observe(el);
  return()=>observer.disconnect();
 },[]);
 useBodyScrollLock(open);
 useEffect(()=>{
  if(!open)return;
  // 탭이 숨으면 멈춘다. 다시 열거나 재생 버튼을 누르면 이어서 본다.
  const hide=()=>{if(document.hidden)video.current?.pause();};
  document.addEventListener('visibilitychange',hide);
  return()=>document.removeEventListener('visibilitychange',hide);
 },[open]);
 useEffect(()=>{
  if(state==='playing'&&refocus.current){refocus.current=false;video.current?.focus();}
 },[state]);
 useEffect(()=>{
  const tracks=video.current?.textTracks;
  if(!tracks||typeof tracks.addEventListener!=='function')return;
  // 브라우저 자체 자막 메뉴로 끄고 켜도 가사 버튼이 같은 상태를 보여 준다.
  const sync=()=>{
   const first=tracks[0];
   if(!first||stateRef.current==='idle')return;
   lyricsRef.current=first.mode==='showing';
   setLyrics(lyricsRef.current);
  };
  tracks.addEventListener('change',sync);
  return()=>tracks.removeEventListener('change',sync);
 },[]);

 return <section className={styles.cinema} aria-labelledby="hl-mv-title">
  <div ref={deck} className={styles.deck}>
   <article ref={card} className={styles.card} data-mv-card="heaven-light" data-deal={deal}>
    <span className={styles.numeral} aria-hidden="true">MV</span>
    <picture className={styles.art}>
     <source type="image/avif" srcSet={`${ART}/heaven-light-card-360.avif 360w, ${ART}/heaven-light-card-600.avif 600w`} sizes={CARD_SIZES}/>
     {/* eslint-disable-next-line @next/next/no-img-element */}
     <img src={`${ART}/heaven-light-card-360.webp`} srcSet={`${ART}/heaven-light-card-360.webp 360w, ${ART}/heaven-light-card-600.webp 600w`} sizes={CARD_SIZES} width={360} height={480} alt="비 오는 강가에서 흰 우산을 기울여 주는 은발의 네오와 연이. 물웅덩이에는 영냥이와 꽃돼지가 비친다." loading="lazy" decoding="async"/>
    </picture>
    <div className={styles.copy}>
     <p className={styles.eyebrow}>DEST1NOVA 2집 · 뮤직비디오</p>
     {/* 제목의 버튼을 카드 크기로 늘려 카드 전체가 하나의 버튼이다. button 안에는 h2 를 둘 수 없어 h2 안에 버튼을 둔다. */}
     <h2 id="hl-mv-title" className={styles.name}>
      <button ref={trigger} type="button" className={styles.cardLink} data-mv-card-trigger="" aria-haspopup="dialog" aria-describedby="hl-mv-line hl-mv-meta">HEAVEN LIGHT<span className={styles.srOnly}> 뮤직비디오 재생</span></button>
     </h2>
     <p id="hl-mv-line" className={styles.line}>괜찮은 척 웃던 너를 지키러,<br/>누군가 시간을 거슬러 왔다.</p>
     <p id="hl-mv-meta" className={styles.meta}>4분 44초 · 소리가 나와요 · 가사 자막</p>
     <span className={styles.action} aria-hidden="true"><Play size={14} fill="currentColor"/>뮤직비디오 재생</span>
    </div>
    <span className={styles.foil} aria-hidden="true"/>
   </article>
  </div>

  <dialog ref={dialog} className={styles.theatre} aria-labelledby="hl-mv-theatre-title" onClose={closed} onClick={event=>{if(event.target===event.currentTarget)event.currentTarget.close();}}>
   <div className={styles.stage}>
    <header className={styles.bar}>
     <div>
      <p className={styles.kicker}>DEST1NOVA 2집 뮤직비디오</p>
      <h2 id="hl-mv-theatre-title">HEAVEN LIGHT</h2>
     </div>
     <button type="button" className={styles.close} onClick={()=>dialog.current?.close()} aria-label="닫기"><X size={22}/></button>
    </header>
    <div className={styles.screen} data-state={state}>
     <video ref={video} className={styles.video} preload="none" playsInline controls={state==='playing'} aria-label="HEAVEN LIGHT 뮤직비디오"
      onPlaying={playing} onError={()=>{if(stateRef.current!=='idle')setState('error');}}
      onLoadedMetadata={()=>{applyLyrics();if(pendingSeek.current!==null&&video.current){video.current.currentTime=pendingSeek.current;pendingSeek.current=null;}}}
      onTimeUpdate={markChapter} onSeeked={markChapter}
      onPlay={()=>setEnded(false)} onEnded={()=>{setEnded(true);if(!tracked.current.complete){tracked.current.complete=true;trackEvent('yeongnyangi_mv_complete');}}}>
      <track kind="subtitles" srcLang="ko" label="한국어 가사" src={LYRICS} default/>
     </video>
     {state!=='playing'&&<button ref={cover} type="button" className={styles.cover} onClick={()=>start(playSource.current)} aria-busy={state==='loading'} aria-label={state==='error'?'뮤직비디오 다시 시도':'HEAVEN LIGHT 뮤직비디오 재생, 4분 44초, 소리가 나와요'}>
      <span className={styles.cta} aria-hidden="true">
       <span className={styles.play}><Play size={22} fill="currentColor"/></span>
       {state==='loading'?'영상을 불러오는 중이에요':state==='error'?'영상을 불러오지 못했어요 · 다시 시도':'4분 44초 · 소리가 나와요'}
      </span>
     </button>}
     {ended&&<div className={styles.end} role="group" aria-labelledby="hl-mv-end-title">
      <p id="hl-mv-end-title" className={styles.endTitle}>오늘 밤, 당신의 별은?</p>
      <div className={styles.endActions}>
       <button type="button" className={styles.endPrimary} onClick={()=>ask('theatre_end')}><Sparkles size={18} aria-hidden="true"/>영냥이에게 내 운세 묻기</button>
       <button type="button" className={styles.endSecondary} onClick={replay}><RotateCcw size={16} aria-hidden="true"/>다시 보기</button>
      </div>
     </div>}
    </div>
    <div className={styles.tools}>
     <button type="button" className={styles.toggle} aria-pressed={lyrics} onClick={()=>{lyricsRef.current=!lyricsRef.current;setLyrics(lyricsRef.current);applyLyrics();}}>
      {lyrics?<Captions size={18} aria-hidden="true"/>:<CaptionsOff size={18} aria-hidden="true"/>}한국어 가사
     </button>
     <div className={styles.links}>
      <a className={styles.ask} href="#questions" onClick={event=>{event.preventDefault();ask('theatre_footer');}}><Sparkles size={16} aria-hidden="true"/>내 운세 보러 가기</a>
      <a className={styles.music} href="/music/"><Music size={16} aria-hidden="true"/>노래 전체 듣기</a>
     </div>
    </div>
    <nav aria-label="챕터">
     <ol className={styles.chapters}>
      {CHAPTERS.map((item,index)=><li key={item.name}>
       <button type="button" className={styles.chapter} aria-current={state==='playing'&&chapter===index?'time':undefined} onClick={()=>seek(index)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {opened&&<img src={`${ART}/heaven-light-v5-ch${index+1}-320.webp`} width={320} height={180} alt="" loading="lazy" decoding="async"/>}
        <span className={styles.chapterName}><small>{index+1}장 · {clock(item.at)}</small>{item.name}</span>
       </button>
      </li>)}
     </ol>
    </nav>
    {/* 모달이 열리면 바깥은 비활성이라 상태 알림도 극장 안에 둔다. */}
    <p className={styles.srOnly} role="status">{state==='loading'?'영상을 불러오는 중이에요.':state==='error'?'영상을 불러오지 못했어요. 다시 시도해 주세요.':ended?'뮤직비디오가 끝났어요.':''}</p>
   </div>
  </dialog>
 </section>;
}
