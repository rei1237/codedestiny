"use client";

import {useEffect, useRef, useState} from 'react';
import {Volume2, VolumeX} from 'lucide-react';

// Reuse the music already served by the Ggulggul light-novel player.
const novelTrack = (name:string) => `https://assets.code-destiny.com/CodeDestinyNovel/${encodeURIComponent(name)}.mp3`;
const tracks = {
 room: 'https://music.code-destiny.com/DestinyWar/Moonlit%20Strategy%20Map.mp3',
 quiet: novelTrack('연이의 우울감'),
 storm: novelTrack('연이 위기 상황'),
 warm: novelTrack('연이와 네오'),
 gold: 'https://music.code-destiny.com/DestinyWar/Moonlit%20Strategy%20Map.mp3',
};
export function useRoomSoundtrack(mood:keyof typeof tracks) {
 const audio = useRef<HTMLAudioElement|null>(null);
 const [enabled,setEnabled] = useState(false);
 const [playing,setPlaying] = useState(false);
 const [error,setError] = useState('');
 const [volume,setVolume] = useState(.22);
 const source = tracks[mood];
 useEffect(() => {
  const player = new Audio();
  player.loop = true;
  player.preload = 'none';
  audio.current = player;
  return () => { player.pause(); player.removeAttribute('src'); player.load(); audio.current = null; };
 },[]);
 useEffect(() => { if(audio.current) audio.current.volume = volume; },[volume]);
 useEffect(() => {
  const player = audio.current;
  if(!player) return;
  let active = true;
  const failed = () => { if(active){setPlaying(false);setEnabled(false);setError('음악을 불러오지 못했어요. 다시 켜 주세요.');} };
  const started = () => { if(active) setPlaying(true); };
  const paused = () => { if(active) setPlaying(false); };
  const play = () => { if(enabled && !document.hidden) void player.play().catch(failed); };
  const visibility = () => { if(document.hidden) player.pause(); else play(); };
  player.addEventListener('error',failed);
  player.addEventListener('playing',started);
  player.addEventListener('pause',paused);
  if(enabled){
   // Re-selecting the source clears a previous media error on explicit retry.
   player.pause();player.src = source;
   play();
  }else{player.pause();setPlaying(false);}
  document.addEventListener('visibilitychange',visibility);
  return () => {
   active = false;
   player.pause();
   player.removeEventListener('error',failed);
   player.removeEventListener('playing',started);
   player.removeEventListener('pause',paused);
   document.removeEventListener('visibilitychange',visibility);
  };
 },[enabled,source]);
 return {enabled,playing,error,volume,setVolume,toggle:()=>{setError('');setEnabled(value=>!value);}};
}
export function RoomSoundControls({sound}:{sound:ReturnType<typeof useRoomSoundtrack>}){
 return <div className="room-sound">
  <button type="button" aria-pressed={sound.enabled} onClick={sound.toggle}>
   {sound.enabled?<Volume2 size={16}/>:<VolumeX size={16}/>}
   {sound.enabled?(sound.playing?'BGM 끄기':'BGM 준비 중 · 끄기'):'BGM 켜기'}
  </button>
  {sound.enabled&&<label>음량<input aria-label="배경음악 음량" type="range" min="0" max="0.6" step="0.02" value={sound.volume} onChange={e=>sound.setVolume(Number(e.target.value))}/></label>}
  {sound.error&&<span role="status">{sound.error}</span>}
 </div>;
}
