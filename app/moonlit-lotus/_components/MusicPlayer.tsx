"use client";
import {useEffect,useRef,useState} from 'react';
import {DIARY_MEDITATION_TRACKS as tracks} from '@/app/diary/_lib/meditation-tracks';
import styles from '../space.module.css';
export default function MusicPlayer({scope,open}:{scope:string;open:boolean}){
 const audio=useRef<HTMLAudioElement>(null),channel=useRef<BroadcastChannel>(),token=useRef(0);
 const [index,setIndex]=useState(0),[playing,setPlaying]=useState(false),[repeat,setRepeat]=useState(false),[shuffle,setShuffle]=useState(false);
 const [query,setQuery]=useState(''),[error,setError]=useState(''),[deadline,setDeadline]=useState(0),[minutes,setMinutes]=useState(0),[retry,setRetry]=useState(0);
 const track=tracks[index];
 useEffect(()=>{
  const pause=()=>{audio.current?.pause();token.current++;setPlaying(false);};
  const visibility=()=>{if(document.hidden)pause();};
  document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',pause);
  return()=>{document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',pause);};
 },[]);
 useEffect(()=>{
  setPlaying(false);setDeadline(0);setError('');
  if(typeof BroadcastChannel!=='undefined'){
   const bus=new BroadcastChannel('cd:moonlit-audio');channel.current=bus;bus.onmessage=()=>setPlaying(false);
   return()=>{bus.close();channel.current=undefined;};
  }
 },[scope]);
 useEffect(()=>{
  const element=audio.current;if(!element)return;
  const generation=++token.current;
  if(element.getAttribute('src')!==track.url){element.src=track.url;setError('');}
  if(playing){
   document.querySelectorAll('audio').forEach(other=>{if(other!==element)other.pause();});
   channel.current?.postMessage('playing');
   void element.play().catch(()=>{if(generation===token.current){setPlaying(false);setError('음악을 재생하지 못했어요. 연결을 확인한 뒤 다시 재생해 주세요.');}});
  }else element.pause();
  return()=>{token.current++;element.pause();};
 },[playing,track.url,retry]);
 useEffect(()=>{
  if(!deadline)return;
  const check=()=>{if(Date.now()>=deadline){setPlaying(false);setDeadline(0);setMinutes(0);}};
  const timer=setInterval(check,1000);document.addEventListener('visibilitychange',check);
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',check);};
 },[deadline]);
 const next=()=>{
  setIndex(current=>shuffle&&tracks.length>1?(current+1+Math.floor(Math.random()*(tracks.length-1)))%tracks.length:(current+1)%tracks.length);setError('');
 };
 const play=(selected=index)=>{setError('');setIndex(selected);setPlaying(true);setRetry(value=>value+1);};
 return <section className={styles.music} data-open={open} aria-label="명상 음악" hidden={!open}>
  <audio ref={audio} preload="none" onEnded={()=>{if(repeat){if(audio.current){audio.current.currentTime=0;setRetry(v=>v+1);}}else next();}} onError={()=>{setPlaying(false);setError('음원을 불러오지 못했어요. 다른 곡을 선택하거나 다시 시도해 주세요.');}} />
  <div className={styles.musicNow}><div><small>{playing?'지금 흐르는 음악':'선택한 음악'}</small><strong>{track.title}</strong></div><button className={styles.primary} onClick={()=>playing?setPlaying(false):play()}>{playing?'음악 멈추기':'음악 재생'}</button><button onClick={next}>다음 곡</button></div>
  {error&&<p role="alert">{error}<button onClick={()=>play()}>음악 다시 시도</button></p>}
  {open&&<><div className={styles.row}><button aria-pressed={repeat} onClick={()=>setRepeat(v=>!v)}>한 곡 반복</button><button aria-pressed={shuffle} onClick={()=>setShuffle(v=>!v)}>셔플</button></div><label className={styles.field}>자동 멈춤<select value={minutes} onChange={event=>{const value=Number(event.target.value);setMinutes(value);setDeadline(value?Date.now()+value*60000:0);}}><option value={0}>설정 안 함</option><option value={5}>5분</option><option value={15}>15분</option><option value={30}>30분</option><option value={60}>60분</option></select></label>
  <label className={styles.field}>음악 찾기<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="곡 제목으로 찾기" /></label>
  <ul className={styles.trackList}>{tracks.map((item,i)=>item.title.toLowerCase().includes(query.toLowerCase())&&<li key={item.id}><button aria-pressed={i===index} onClick={()=>play(i)}>{item.title}{i===index&&playing?' · 재생 중':''}</button></li>)}</ul>
  {!tracks.some(item=>item.title.toLowerCase().includes(query.toLowerCase()))&&<p>맞는 곡이 없어요. 다른 이름으로 찾아보세요.</p>}
  <p className={styles.small}>음악은 절 횟수와 별도로 재생돼요. 화면을 떠나면 음악은 멈추고, 108배는 일시정지해요.</p></>}
 </section>;
}
