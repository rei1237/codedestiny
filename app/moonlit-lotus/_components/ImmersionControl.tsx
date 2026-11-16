"use client";
import {useEffect,useRef,useState} from 'react';
import {Maximize,Minimize} from 'lucide-react';
export default function ImmersionControl(){
 const [active,setActive]=useState(false),[message,setMessage]=useState('');
 const owned=useRef(false),pending=useRef(false),alive=useRef(true);
 useEffect(()=>{
  alive.current=true;const changed=()=>{setActive(!!document.fullscreenElement);if(!document.fullscreenElement)owned.current=false;};
  document.addEventListener('fullscreenchange',changed);
  return()=>{alive.current=false;document.removeEventListener('fullscreenchange',changed);if(owned.current&&document.fullscreenElement)void document.exitFullscreen().catch(()=>{});};
 },[]);
 const toggle=async()=>{
  if(pending.current)return;pending.current=true;setMessage('');
  try{
   if(document.fullscreenElement){await document.exitFullscreen();return;}
   if(!document.documentElement.requestFullscreen){setMessage('이 브라우저에서는 현재 화면을 가득 채워 이용해 주세요. 기기 방향은 자유롭게 바꿀 수 있어요.');return;}
   await document.documentElement.requestFullscreen();owned.current=true;
   if(!alive.current){await document.exitFullscreen();return;}setActive(true);
  }catch{if(alive.current)setMessage('브라우저 전체 화면을 열지 못했어요. 현재 화면에서도 그대로 이용할 수 있어요.');}
  finally{pending.current=false;}
 };
 return <div><button onClick={toggle} aria-pressed={active}>{active?<Minimize size={17}/>:<Maximize size={17}/>}<span>{active?'전체 화면 닫기':'전체 화면'}</span></button>{message&&<p role="status">{message}</p>}</div>;
}
