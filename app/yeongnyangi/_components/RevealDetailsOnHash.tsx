'use client';
import {useEffect} from 'react';

// 주소의 해시가 접힌 <details id> 를 가리키면 그 details 와 바깥 접힘을 열고 그 위치로 스크롤한다.
// 처음 열 때·해시가 바뀔 때·같은 해시 링크를 다시 누를 때 동작한다. 움직임 줄이기 설정이면 바로 이동한다.
export default function RevealDetailsOnHash({id}:{id:string}){
 useEffect(()=>{
  let frame=0;
  function reveal(){
   const target=document.getElementById(id);
   if(!(target instanceof HTMLDetailsElement))return;
   for(let node:HTMLElement|null=target;node;node=node.parentElement) if(node instanceof HTMLDetailsElement) node.open=true;
   cancelAnimationFrame(frame);
   // 바깥 HomeDisclosure 가 같은 틱에 접힘을 맞춘 뒤 스크롤하도록 다음 프레임으로 미룬다.
   frame=requestAnimationFrame(()=>target.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}));
  }
  const onHash=()=>{if(location.hash===`#${id}`)reveal();};
  const onClick=(event:MouseEvent)=>{
   const link=event.target instanceof Element?event.target.closest('a[href]'):null;
   if(link?.getAttribute('href')===`#${id}`&&location.hash===`#${id}`)reveal();
  };
  onHash();
  window.addEventListener('hashchange',onHash);
  document.addEventListener('click',onClick);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('hashchange',onHash);document.removeEventListener('click',onClick);};
 },[id]);
 return null;
}
