import {useCallback,useEffect,useRef,useState} from 'react';
import {TextField} from '@toss/tds-mobile';
import {Button} from './Button';
import MusicDownload from './MusicDownload';
import tracks from 'virtual:toss-music-shelf';

type Track=typeof tracks[number];
function Player({track,onClose}:{track:Track;onClose:()=>void}){
  const player=useRef<HTMLAudioElement>(null),heading=useRef<HTMLHeadingElement>(null),[error,setError]=useState(false);
  const [playing,setPlaying]=useState(false),[time,setTime]=useState(0),[duration,setDuration]=useState(0);
  const alive=useRef(true);
  useEffect(()=>{
    alive.current=true;const audio=player.current;heading.current?.focus();
    const back=(event:Event)=>{event.preventDefault();onClose();};
    window.addEventListener('code-destiny:toss-back',back);
    return ()=>{alive.current=false;window.removeEventListener('code-destiny:toss-back',back);audio?.pause();};
  },[onClose]);
  function play(){const audio=player.current;if(!audio)return;if(error)audio.load();setError(false);void audio.play().catch(()=>{if(alive.current)setError(true);});}
  const clock=(seconds:number)=>Math.floor(seconds/60)+':'+String(Math.floor(seconds)%60).padStart(2,'0');
  return <section><h1 ref={heading} tabIndex={-1}>{track.title}</h1><p>{track.artist}</p>
    <audio ref={player} preload="none" src={track.stream} onError={()=>{setError(true);setPlaying(false);}}
      onPlaying={()=>{setError(false);setPlaying(true);}} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)}
      onLoadedMetadata={e=>setDuration(Number.isFinite(e.currentTarget.duration)?e.currentTarget.duration:0)} onTimeUpdate={e=>setTime(e.currentTarget.currentTime)}/>
    <Button display="block" onClick={()=>playing?player.current?.pause():play()}>{playing?'일시 정지':error?'재생 다시 시도':'곡 재생하기'}</Button>
    {duration>0&&<label>재생 위치 · {clock(time)} / {clock(duration)}<input aria-label="재생 위치" type="range" min={0} max={duration} step={1} value={Math.min(duration,time)} onChange={e=>{if(player.current)player.current.currentTime=Number(e.target.value);}}/></label>}
    {error&&<p role="alert">음악을 불러오지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요.</p>}
    <MusicDownload track={track} orderId={new URLSearchParams(location.search).get('orderId')||''}/><Button display="block" variant="weak" onClick={onClose}>곡 목록으로</Button></section>;
}
export default function MusicShelf(){
  const [query,setQuery]=useState(''),[current,setCurrent]=useState<Track|null>(()=>tracks.find(track=>track.audioSourceKey===new URLSearchParams(location.search).get('track'))||null);
  const close=useCallback(()=>{setCurrent(null);window.history.replaceState(window.history.state,'','/music');},[]);
  const intentId=new URLSearchParams(location.search).get('intentId')||'';
  const lastId=useRef<string|null>(null);
  useEffect(()=>{if(!current&&lastId.current)document.getElementById('track-'+lastId.current)?.focus();},[current]);
  if(intentId&&!current)return <section><MusicDownload intentId={intentId}/><a href="/music">곡 목록으로</a></section>;
  if(current)return <Player track={current} onClose={close}/>;
  const term=query.trim().toLocaleLowerCase('ko'),visible=tracks.filter(t=>(t.title+' '+t.artist).toLocaleLowerCase('ko').includes(term));
  return <section><h1>꿀꿀운세 음악실</h1><p>마음에 드는 곡을 골라 재생해 보세요.</p>
    <TextField variant="box" label="곡명·아티스트 검색" labelOption="sustain" aria-label="곡명·아티스트 검색" type="search" value={query} onChange={e=>setQuery(e.target.value)}/>
    <p role="status">{visible.length?visible.length+'곡':'일치하는 곡이 없어요. 다른 이름으로 찾아보세요.'}</p>
    {visible.map(t=><button className="record" key={t.id} id={'track-'+t.id} onClick={()=>{lastId.current=t.id;setCurrent(t);}}><strong>{t.title}</strong><small>{t.artist}</small></button>)}</section>;
}
