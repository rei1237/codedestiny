"use client";
import CurrentLocationButton,{type CurrentLocation} from '@/app/components/CurrentLocationButton';
import {useRef,useState,type FormEvent} from 'react';
import {birthDateTextInputProps} from '@/lib/birthDateInputProps';
import {authFetch} from '@/app/_lib/auth-client';
import {readDestinyProfileAccountId,type DestinyProfileCard} from '@/app/_lib/profile-card-storage';
import {invalidateProfileCache} from '@/app/_lib/user-session-cache';
import {loginForCurrentPage} from '../_lib/api';
import {consultationInputCopy} from '../_lib/consultation-input-copy';
import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
import styles from './profiles.module.css';
export default function ProfileForm({onSaved,locale}:{onSaved:(profile:DestinyProfileCard)=>void;locale?:ReadingLocale}) {
 const copy=consultationInputCopy(locale);
 const [currentLocation,setCurrentLocation]=useState<CurrentLocation|null>(null);
 const [birthDate,setBirthDate]=useState(''),[place,setPlace]=useState('');
 const [unknown,setUnknown]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const profileId=useRef(''),lock=useRef(false);
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(lock.current)return;lock.current=true;
  if(!profileId.current)profileId.current=`yn_${crypto.randomUUID()}`;
  const account=readDestinyProfileAccountId();
  const form=new FormData(event.currentTarget);setBusy(true);setError('');
  try{
   const place=String(form.get('place')||'').trim();
   let location=currentLocation?{label:currentLocation.name,tz:currentLocation.timezone,lat:currentLocation.latitude,lng:currentLocation.longitude}:undefined;
   if(place&&!currentLocation){
    const response=await authFetch(`/api/geocode?place=${encodeURIComponent(place)}`);
    const found=await response.json();
    if(!response.ok||found.fallback||!Number.isFinite(found.lat)||!Number.isFinite(found.lng))throw new Error(copy.geocodeError);
    location={label:found.name,tz:found.timezone,lat:found.lat,lng:found.lng};
   }
   const [year,month,day]=String(form.get('date')).split('-').map(Number);
   const [hour,minute]=String(form.get('time')||'').split(':').map(Number);
   if(account!==readDestinyProfileAccountId())return;
   const response=await authFetch('/api/yeongnyangi/profiles',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile:{profileId:profileId.current,name:form.get('name'),gender:form.get('gender'),birth:{year,month,day,hour:unknown?null:hour,minute:unknown?null:minute,timeUnknown:unknown,calType:form.get('calendar')},...(location?{location}:{})}})});
   if(response.status===401){loginForCurrentPage();return;}
   const data=await response.json();if(!response.ok)throw new Error(locale==='ko'&&data.message?data.message:copy.saveError);
   if(account!==readDestinyProfileAccountId())return;
   invalidateProfileCache('yeongnyangi-profile-created');
   onSaved(data.profile);
  }catch(e){setError(e instanceof Error?e.message:copy.saveError);}finally{lock.current=false;setBusy(false);}
 }
 return <form onSubmit={save} className={styles.profileForm} lang={locale||'ko'}>
  <h3>{copy.profileHeading}</h3><p>{copy.profileIntro}</p>
  <label>{copy.name}<input name="name" required maxLength={40} autoComplete="nickname" /></label>
  <label>{copy.gender}<select name="gender"><option value="F">{copy.female}</option><option value="M">{copy.male}</option></select></label>
  <label>{copy.birthDate}<input name="date" required {...birthDateTextInputProps(birthDate,setBirthDate)} /></label>
  <label>{copy.calendar}<select name="calendar"><option value="solar">{copy.solar}</option><option value="lunar">{copy.lunar}</option><option value="lunar_leap">{copy.leap}</option></select></label>
  <label>{copy.birthTime}<input name="time" type="time" required={!unknown} disabled={unknown} /></label>
  <label><input type="checkbox" checked={unknown} onChange={e=>setUnknown(e.target.checked)} /> {copy.unknown}</label>
  <p>{copy.unknownHint}</p>
  <label>{copy.birthPlace}<input name="place" value={place} onChange={e=>{setPlace(e.target.value);setCurrentLocation(null);}} placeholder={copy.placeExample} maxLength={120} /></label>
  <CurrentLocationButton locale={locale==='ja'?'ja':locale==='ko'||!locale?'ko':'en'} disabled={busy} onLocation={value=>{setCurrentLocation(value);setPlace(value.name);}}/>{currentLocation&&<p role="status">{copy.locationUsed} {currentLocation.timezone}</p>}
  <p>{copy.placeHint}</p>
  <button disabled={busy} type="submit">{busy?copy.saving:copy.save}</button>
  {error&&<p role="alert">{error}</p>}
 </form>;
}
