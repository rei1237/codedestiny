'use client';
import Image from 'next/image';
import {useEffect,useRef,useState} from 'react';
import {Play} from 'lucide-react';
import styles from './opening-song.module.css';

// R2(codedestinyassets) 내용해시 키라 immutable 캐시다. 영상을 바꾸면 새 키로 올리고 여기만 고친다.
// 원본은 Golden Kindness MV v2 가사판(1080p30), 오디오는 WAV 마스터에서 한 번만 AAC 로 인코딩했다.
const sources={
 hd:'https://assets.code-destiny.com/yeongnyangi/opening/golden-kindness-opening-1080p-563f22051bfa.mp4',
 sd:'https://assets.code-destiny.com/yeongnyangi/opening/golden-kindness-opening-720p-5362022e87f6.mp4',
};
type Connection={saveData?:boolean;effectiveType?:string};
// 표시 폭 × DPR(2배까지)이 1400px 을 넘고 데이터 절약·저속 회선이 아닐 때만 1080p(41MB), 나머지는 720p(20MB).
function pickSource(width:number){
 const connection=(navigator as Navigator&{connection?:Connection}).connection;
 const slow=Boolean(connection?.saveData)||/2g|3g/.test(connection?.effectiveType||'');
 return !slow&&width*Math.min(window.devicePixelRatio||1,2)>1400?sources.hd:sources.sd;
}
type State='idle'|'loading'|'playing'|'error';
export default function OpeningSong(){
 const video=useRef<HTMLVideoElement>(null);
 const cover=useRef<HTMLButtonElement>(null);
 const refocus=useRef(false);
 const [state,setState]=useState<State>('idle');
 // 첫 클릭 전에는 src 가 없어 영상 바이트를 한 개도 받지 않는다. 클릭 핸들러 안에서 바로 play() 해야 소리 있는 재생이 허용된다.
 function start(){
  const player=video.current;
  if(!player)return;
  if(state==='idle'||state==='error')player.src=pickSource(player.clientWidth);
  setState('loading');
  void player.play().catch(()=>setState('error'));
 }
 // 재생이 시작되면 커버 버튼이 사라지므로, 포커스가 버튼에 있었다면 컨트롤이 붙은 영상으로 옮긴다.
 function playing(){
  refocus.current=document.activeElement===cover.current;
  setState('playing');
 }
 useEffect(()=>{
  if(state==='playing'&&refocus.current){
   refocus.current=false;
   video.current?.focus();
  }
 },[state]);
 useEffect(()=>{
  const player=video.current;
  if(!player||state==='idle'||!('IntersectionObserver' in window))return;
  // 화면 밖으로 완전히 나가면 멈춘다. 전체 화면 재생 중에는 건드리지 않는다.
  const observer=new IntersectionObserver(([entry])=>{
   const fullscreen=Boolean(document.fullscreenElement)||Boolean((player as HTMLVideoElement&{webkitDisplayingFullscreen?:boolean}).webkitDisplayingFullscreen);
   if(!entry.isIntersecting&&!player.paused&&!fullscreen)player.pause();
  });
  observer.observe(player);
  return()=>observer.disconnect();
 },[state]);
 return <section className={styles.opening} aria-labelledby="opening-song-title">
  <div className={styles.head}>
   <p className={styles.eyebrow}>영냥이 오프닝 송</p>
   <h2 id="opening-song-title">Golden Kindness</h2>
   <p className={styles.lead}>상담 들어가기 전에, 오프닝 한 곡 틀어 줄게.</p>
  </div>
  <div className={styles.screen} data-state={state}>
   <video ref={video} className={styles.video} preload="none" playsInline controls={state==='playing'} aria-label="Golden Kindness 오프닝 뮤직비디오" onPlaying={playing} onError={()=>setState('error')}/>
   {state!=='playing'&&<button ref={cover} type="button" className={styles.cover} onClick={start} aria-busy={state==='loading'} aria-label={state==='error'?'뮤직비디오 다시 재생하기':'Golden Kindness 오프닝 뮤직비디오 재생, 1분 30초, 소리가 나와요'}>
    <Image src="/assets/yeongnyangi/opening/golden-kindness-poster.webp" width={960} height={540} sizes="(max-width: 800px) 100vw, 760px" alt=""/>
    {/* 재생 표시는 얼굴을 가리지 않게 어두운 하단 띠 위 왼쪽에 둔다. 오류 안내도 여기서 바꿔 보여 줘 레이아웃이 밀리지 않는다. */}
    <span className={styles.cta} aria-hidden="true">
     <span className={styles.play}><Play size={22} fill="currentColor"/></span>
     {state==='loading'?'영상을 불러오는 중…':state==='error'?'불러오지 못했어요 · 다시 눌러 주세요':'1분 30초 · 소리가 나와요'}
    </span>
   </button>}
  </div>
  <p className={styles.srOnly} role="status">{state==='error'?'영상을 불러오지 못했어요. 다시 눌러 주세요.':''}</p>
 </section>;
}
