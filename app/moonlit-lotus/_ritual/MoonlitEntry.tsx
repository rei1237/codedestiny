"use client";
import {useCallback,useEffect,useState} from 'react';
import Space from '../Space';
import space from '../space.module.css';
import RitualFlow from './RitualFlow';
import {moonlitMode,stayUrl,type MoonlitMode} from './mode';
/** 정적 export 라 서버는 쿼리를 모른다. 주소를 읽은 뒤에 참배 흐름과 기존 공간 중 하나를 그린다. */
export default function MoonlitEntry(){
 const [mode,setMode]=useState<MoonlitMode|null>(null);
 useEffect(()=>{
  const read=()=>setMode(moonlitMode(location.search));read();
  window.addEventListener('popstate',read);return()=>window.removeEventListener('popstate',read);
 },[]);
 const browse=useCallback(()=>{history.pushState(null,'',stayUrl(location.search));setMode('space');},[]);
 if(mode==='space')return <Space/>;
 if(mode==='ritual')return <RitualFlow onBrowse={browse}/>;
 return <main className={space.page} aria-busy="true"/>;
}
