"use client";
import styles from './fortune-tools.module.css';
import {useEffect,useRef,useState} from 'react';
export type CurrentLocation={latitude:number;longitude:number;source:'geolocation';accuracy:number;name:string;timezone:string};
export default function CurrentLocationButton({onLocation,purpose='birth',disabled=false}:{onLocation:(value:CurrentLocation)=>void;purpose?:'birth'|'question';disabled?:boolean}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[pending,setPending]=useState<CurrentLocation|null>(null);
 const active=useRef(true),locked=useRef(false);
 useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 async function locate(){
  if(locked.current||disabled)return;
  setError('');setPending(null);
  if(!navigator.geolocation){setError('현재 위치를 지원하지 않는 환경이에요. 도시와 국가를 입력하거나 선택해 주세요.');return;}
  locked.current=true;setBusy(true);
  try{
   const position=await new Promise<GeolocationPosition>((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:false,timeout:10000,maximumAge:0}));
   if(!active.current)return;
   const response=await fetch('/api/yeongnyangi/location',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({latitude:position.coords.latitude,longitude:position.coords.longitude,accuracy:position.coords.accuracy,source:'geolocation'}),signal:AbortSignal.timeout(10000)});
   const data=await response.json();if(!response.ok||!data.location)throw new Error('위치의 시간대를 확인하지 못했어요. 도시와 국가를 입력하거나 선택해 주세요.');
   if(active.current)setPending(data.location);
  }catch(reason){if(active.current)setError((reason as {code?:number}).code===1?'위치 권한이 허용되지 않았어요. 도시와 국가를 입력하거나 선택해 주세요.':reason instanceof Error&&reason.message.startsWith('위치')?reason.message:'현재 위치를 확인하지 못했어요. 다시 시도하거나 도시를 선택해 주세요.');}
  finally{locked.current=false;if(active.current)setBusy(false);}
 }
 return <div className={styles.control}>
  <button type="button" disabled={disabled||busy} onClick={()=>void locate()}>{busy?'현재 위치 확인 중':'현재 위치 가져오기'}</button>
  <p>버튼을 누르고 위치 사용에 동의하면 현재 위치와 시간대를 확인해요.</p>
  {pending&&<div role="status"><p>현재 위치를 확인했어요. 정확도는 약 {Math.round(pending.accuracy).toLocaleString('ko-KR')}m예요. {purpose==='birth'?'태어난 장소와 같은 곳인가요?':'질문이 떠오른 당시의 장소와 같은 곳인가요?'}</p><button type="button" disabled={disabled} onClick={()=>{onLocation(pending);setPending(null);}}>{purpose==='birth'?'출생 장소가 맞아요 · 적용':'질문 당시 장소가 맞아요 · 적용'}</button><button type="button" onClick={()=>setPending(null)}>다른 장소예요</button></div>}
  {error&&<p role="alert">{error}</p>}
 </div>;
}
