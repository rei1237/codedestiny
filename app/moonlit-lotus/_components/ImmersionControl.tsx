"use client";
import {useEffect,useRef,useState} from 'react';
export default function ImmersionControl(){
 const [active,setActive]=useState(false),[message,setMessage]=useState('');
 const owned=useRef(false),pending=useRef(false),alive=useRef(true);
 useEffect(()=>{
  alive.current=true;
  const changed=()=>{if(owned.current&&!document.fullscreenElement){owned.current=false;setActive(false);setMessage('');try{screen.orientation?.unlock();}catch{}}};
  document.addEventListener('fullscreenchange',changed);
  return()=>{alive.current=false;document.removeEventListener('fullscreenchange',changed);if(owned.current){try{screen.orientation?.unlock();}catch{}if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});}};
 },[]);
 const toggle=async()=>{
  if(pending.current)return;pending.current=true;
  try{
   if(active){if(owned.current&&document.fullscreenElement)await document.exitFullscreen();setActive(false);setMessage('');return;}
   setActive(true);
   if(!document.documentElement.requestFullscreen){setMessage('기기를 가로로 돌리면 넓은 법당으로 바뀌어요.');return;}
   await document.documentElement.requestFullscreen();owned.current=true;
   if(!alive.current){await document.exitFullscreen();return;}
   const orientation=screen.orientation as ScreenOrientation & {lock?:(direction:string)=>Promise<void>};
   if(orientation?.lock){try{await orientation.lock('landscape');if(!alive.current){orientation.unlock();return;}setMessage('');}catch{if(alive.current)setMessage('기기를 가로로 돌려 넓게 감상해 주세요.');}}
   else setMessage('기기를 가로로 돌려 넓게 감상해 주세요.');
  }catch{if(alive.current)setMessage('전체화면을 열지 못했어요. 기기를 가로로 돌려도 넓게 볼 수 있어요.');}
  finally{pending.current=false;}
 };
 return <div><button onClick={toggle} aria-pressed={active}>{active?'몰입 모드 나가기':'가로로 몰입하기'}</button>{message&&<p role="status">{message}</p>}</div>;
}
