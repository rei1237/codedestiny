import React,{useEffect,useState,useSyncExternalStore} from 'react';
import {File,Share} from '@apps-in-toss/web-framework';
import YeonStarHugPage from '@/app/yeon-star-hug/YeonStarHugClient';
import {readDestinyProfileAccountId} from '@/app/_lib/profile-card-storage';

import {starHugScope} from './yeon-star-session.mjs';
import {snapshotKey} from '../../../lib/guided-flow/step-controller.mjs';
const scope=()=>starHugScope(readDestinyProfileAccountId());
function subscribe(update){
 window.addEventListener('cd:auth-changed',update);window.addEventListener('storage',update);
 return ()=>{window.removeEventListener('cd:auth-changed',update);window.removeEventListener('storage',update);};
}
function dataUrl(blob){return new Promise((resolve,reject)=>{
 const reader=new FileReader();reader.onerror=()=>reject(new Error('카드 이미지를 읽지 못했어요.'));
 reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob);
});}
export default function TossYeonStarHug(){
 const flowScope=useSyncExternalStore(subscribe,scope,scope);
 const [ready,setReady]=useState('');
 useEffect(()=>{
  const url=new URL(location.href);
  if(url.searchParams.has('step')){
   let saved=false;try{saved=Boolean(sessionStorage.getItem(snapshotKey(flowScope)));}catch{/* Fresh entry. */}
   if(!saved){url.searchParams.delete('step');history.replaceState(null,'',url);}
  }
  setReady(flowScope);
 },[flowScope]);
 const tools={flowScope,async saveCard(svg,sprite,fileName){
  if(!File.saveBase64.isSupported())throw new Error('이 토스 버전은 파일 저장을 지원하지 않아요.');
  const response=await fetch(sprite);
  if(!response.ok)throw new Error('연이 그림을 불러오지 못했어요.');
  const art=await dataUrl(new Blob([await response.arrayBuffer()],{type:'image/webp'}));
  const card=new Blob([svg.replace('href="'+sprite+'"','href="'+art+'"')],{type:'image/svg+xml'});
  const encoded=await dataUrl(card);
  if(scope()!==flowScope)throw new Error('계정이 변경되었어요.');
  await File.saveBase64({data:encoded.slice(encoded.indexOf(',')+1),fileName,mimeType:'image/svg+xml'});
 },async share(summary){
  if(scope()!==flowScope)throw new Error('계정이 변경되었어요.');
  await Share.sendMessage({message:'연이의 마음 별자리 · '+summary});
 }};
 return ready===flowScope&&<YeonStarHugPage key={flowScope} toss={tools}/>;
}
