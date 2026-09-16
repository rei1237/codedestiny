"use client";
import {useRef,useState,type FormEvent} from 'react';
import {birthDateTextInputProps} from '@/lib/birthDateInputProps';
import {authFetch} from '@/app/_lib/auth-client';
import {readDestinyProfileAccountId,type DestinyProfileCard} from '@/app/_lib/profile-card-storage';
import {invalidateProfileCache} from '@/app/_lib/user-session-cache';
import {loginForCurrentPage} from '../_lib/api';
import styles from './profiles.module.css';
export default function ProfileForm({onSaved}:{onSaved:(profile:DestinyProfileCard)=>void}) {
 const [birthDate,setBirthDate]=useState('');
 const [unknown,setUnknown]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const profileId=useRef(''),lock=useRef(false);
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(lock.current)return;lock.current=true;
  if(!profileId.current)profileId.current=`yn_${crypto.randomUUID()}`;
  const account=readDestinyProfileAccountId();
  const form=new FormData(event.currentTarget);setBusy(true);setError('');
  try{
   const place=String(form.get('place')||'').trim();
   let location;
   if(place){
    const response=await authFetch(`/api/geocode?place=${encodeURIComponent(place)}`);
    const found=await response.json();
    if(!response.ok||found.fallback||!Number.isFinite(found.lat)||!Number.isFinite(found.lng))throw new Error('출생지역을 찾지 못했어요. 도시와 국가 이름을 함께 입력해 주세요.');
    location={label:found.name,tz:found.timezone,lat:found.lat,lng:found.lng};
   }
   const [year,month,day]=String(form.get('date')).split('-').map(Number);
   const [hour,minute]=String(form.get('time')||'').split(':').map(Number);
   if(account!==readDestinyProfileAccountId())return;
   const response=await authFetch('/api/yeongnyangi/profiles',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile:{profileId:profileId.current,name:form.get('name'),gender:form.get('gender'),birth:{year,month,day,hour:unknown?null:hour,minute:unknown?null:minute,timeUnknown:unknown,calType:form.get('calendar')},...(location?{location}:{})}})});
   if(response.status===401){loginForCurrentPage();return;}
   const data=await response.json();if(!response.ok)throw new Error(data.message||'프로필을 저장하지 못했어요.');
   if(account!==readDestinyProfileAccountId())return;
   invalidateProfileCache('yeongnyangi-profile-created');
   onSaved(data.profile);
  }catch(e){setError(e instanceof Error?e.message:'프로필을 저장하지 못했어요.');}finally{lock.current=false;setBusy(false);}
 }
 return <form onSubmit={save} className={styles.profileForm}>
  <h3>새로운 이야기를 남겨줘.</h3><p>저장한 프로필은 같은 CODE DESTINY 계정의 다른 운세에서도 함께 사용할 수 있어.</p>
  <label>이름<input name="name" required maxLength={40} autoComplete="nickname" /></label>
  <label>성별<select name="gender"><option value="F">여성</option><option value="M">남성</option></select></label>
  <label>생년월일<input name="date" required {...birthDateTextInputProps(birthDate,setBirthDate)} /></label>
  <label>달력<select name="calendar"><option value="solar">양력</option><option value="lunar">음력</option><option value="lunar_leap">음력 윤달</option></select></label>
  <label>출생시간<input name="time" type="time" required={!unknown} disabled={unknown} /></label>
  <label><input type="checkbox" checked={unknown} onChange={e=>setUnknown(e.target.checked)} /> 출생시간을 몰라요</label>
  <p>시간을 모르면 사주 고등어·연어 상담을 이용할 수 있어요. 시주와 시간에 따른 분석은 제외해요.</p>
  <label>출생지역<input name="place" placeholder="예: 대한민국 부산" maxLength={120} /></label>
  <p>숙요·베다·서양 점성술과 깊은 분석에는 출생지역이 필요해요.</p>
  <button disabled={busy} type="submit">{busy?'프로필 저장 중':'프로필 저장하기'}</button>
  {error&&<p role="alert">{error}</p>}
 </form>;
}
