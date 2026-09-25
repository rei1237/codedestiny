"use client";
import styles from './fortune-tools.module.css';
import {useEffect,useRef,useState} from 'react';
export type CurrentLocation={latitude:number;longitude:number;source:'geolocation';accuracy:number;name:string;timezone:string};
const copy={
 ko:{unsupported:'현재 위치를 지원하지 않는 환경이에요. 도시와 국가를 입력하거나 선택해 주세요.',timezone:'위치의 시간대를 확인하지 못했어요. 도시와 국가를 입력하거나 선택해 주세요.',denied:'위치 권한이 허용되지 않았어요. 도시와 국가를 입력하거나 선택해 주세요.',failed:'현재 위치를 확인하지 못했어요. 다시 시도하거나 도시를 선택해 주세요.',busy:'현재 위치 확인 중',get:'현재 위치 가져오기',hint:'버튼을 누르고 위치 사용에 동의하면 현재 위치와 시간대를 확인해요.',confirmed:'현재 위치를 확인했어요. 정확도는 약',accuracySuffix:'m예요.',birthQuestion:'태어난 장소와 같은 곳인가요?',questionQuestion:'질문이 떠오른 당시의 장소와 같은 곳인가요?',birthApply:'출생 장소가 맞아요 · 적용',questionApply:'질문 당시 장소가 맞아요 · 적용',other:'다른 장소예요'},
 en:{unsupported:'Current location is unavailable. Enter or choose a city and country.',timezone:'Could not confirm the location time zone. Enter or choose a city and country.',denied:'Location permission was not granted. Enter or choose a city and country.',failed:'Could not confirm your location. Try again or choose a city.',busy:'Checking location',get:'Use current location',hint:'Allow location access to check your current location and time zone.',confirmed:'Current location confirmed. Approximate accuracy:',accuracySuffix:'m.',birthQuestion:'Is this also where you were born?',questionQuestion:'Is this where you were when the question came to mind?',birthApply:'Yes, use as place of birth',questionApply:'Yes, use as question location',other:'Choose another place'},
 ja:{unsupported:'現在地を利用できません。都市名と国名を入力または選択してください。',timezone:'この場所のタイムゾーンを確認できませんでした。都市名と国名を入力または選択してください。',denied:'位置情報の利用が許可されていません。都市名と国名を入力または選択してください。',failed:'現在地を確認できませんでした。再試行するか都市を選択してください。',busy:'現在地を確認中',get:'現在地を使う',hint:'位置情報の利用を許可すると、現在地とタイムゾーンを確認します。',confirmed:'現在地を確認しました。おおよその精度：',accuracySuffix:'mです。',birthQuestion:'ここは出生地と同じ場所ですか？',questionQuestion:'質問が浮かんだときの場所と同じですか？',birthApply:'出生地として適用',questionApply:'質問時の場所として適用',other:'別の場所を選ぶ'}
};
export default function CurrentLocationButton({onLocation,purpose='birth',disabled=false,locale='ko'}:{onLocation:(value:CurrentLocation)=>void;purpose?:'birth'|'question';disabled?:boolean;locale?:'ko'|'en'|'ja'}){
 const t=copy[locale];
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[pending,setPending]=useState<CurrentLocation|null>(null);
 const active=useRef(true),locked=useRef(false);
 useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 async function locate(){
  if(locked.current||disabled)return;
  setError('');setPending(null);
  if(!navigator.geolocation){setError(t.unsupported);return;}
  locked.current=true;setBusy(true);
  try{
   const position=await new Promise<GeolocationPosition>((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:false,timeout:10000,maximumAge:0}));
   if(!active.current)return;
   const response=await fetch('/api/yeongnyangi/location',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({latitude:position.coords.latitude,longitude:position.coords.longitude,accuracy:position.coords.accuracy,source:'geolocation'}),signal:AbortSignal.timeout(10000)});
   const data=await response.json();if(!response.ok||!data.location)throw new Error('LOCATION_TIMEZONE_UNAVAILABLE');
   if(active.current)setPending(data.location);
  }catch(reason){if(active.current)setError((reason as {code?:number}).code===1?t.denied:reason instanceof Error&&reason.message==='LOCATION_TIMEZONE_UNAVAILABLE'?t.timezone:t.failed);}
  finally{locked.current=false;if(active.current)setBusy(false);}
 }
 return <div className={styles.control} lang={locale}>
  <button type="button" disabled={disabled||busy} onClick={()=>void locate()}>{busy?t.busy:t.get}</button>
  <p>{t.hint}</p>
  {pending&&<div role="status"><p>{t.confirmed} {Math.round(pending.accuracy).toLocaleString(locale==='ko'?'ko-KR':locale==='ja'?'ja-JP':'en-US')}{t.accuracySuffix} {purpose==='birth'?t.birthQuestion:t.questionQuestion}</p><button type="button" disabled={disabled} onClick={()=>{onLocation(pending);setPending(null);}}>{purpose==='birth'?t.birthApply:t.questionApply}</button><button type="button" onClick={()=>setPending(null)}>{t.other}</button></div>}
  {error&&<p role="alert">{error}</p>}
 </div>;
}
