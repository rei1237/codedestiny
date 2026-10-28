'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
export default function ReadingTools(){
 const pathname=usePathname();
 const [progress,setProgress]=useState(0),[saved,setSaved]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{
  const path=pathname;setSaved(false);setMessage('');setProgress(0);
  try{setSaved(JSON.parse(localStorage.getItem('cd.reading.bookmarks') || '[]').includes(path));}catch{}
  const update=()=>{const article=document.querySelector('article');if(!article)return;const start=article.getBoundingClientRect().top+scrollY;setProgress(Math.max(0,Math.min(100,Math.round((scrollY-start)/Math.max(1,article.scrollHeight-innerHeight)*100))));};
  update();window.addEventListener('scroll',update,{passive:true});return()=>window.removeEventListener('scroll',update);
 },[pathname]);
 function toggle(){try{const stored=JSON.parse(localStorage.getItem('cd.reading.bookmarks') || '[]');const paths=Array.isArray(stored)?stored.filter(x=>typeof x==='string' && x.startsWith('/insights/')):[];localStorage.setItem('cd.reading.bookmarks',JSON.stringify(saved?paths.filter(x=>x!==location.pathname):[...new Set([...paths,location.pathname])].slice(-200)));setSaved(!saved);setMessage(saved?'북마크를 해제했어요.':'이 브라우저에 저장했어요.');}catch{setMessage('브라우저 저장 공간을 사용할 수 없어요.');}}
 return <div className="moon-reading-tools"><progress aria-label="글 읽기 진행" value={progress} max="100"/><button type="button" aria-pressed={saved} onClick={toggle}>{saved?'북마크 해제':'북마크 저장'}</button><span role="status">{message || '이 브라우저에만 저장됩니다'}</span></div>;
}
