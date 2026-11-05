import {useCallback,useEffect,useRef,useState} from 'react';
import {authFetch} from '@/app/_lib/auth-client';
import {selectedBirthProfileSeed,type AiPrefillSeed} from '@/app/_lib/ai-prefill-seed';
import {normalizeDestinyProfileCard,type DestinyProfileCard} from '@/app/_lib/profile-card-storage';
import {usePaidDeliveryScope} from '@/app/hooks/usePaidDeliveryScope';
import {useTossConsultationCopy} from '@/app/_lib/toss-consultation-copy';

// Profile choices are always read from the current Toss identity, never web cache.
export default function TossAstrologyProfilePicker({onSelect,calendarMode='solar'}:{onSelect:(seed:AiPrefillSeed)=>void;calendarMode?:'solar'|'lunar'}){
 const {copy}=useTossConsultationCopy();
 const [profiles,setProfiles]=useState<DestinyProfileCard[]>([]),[loading,setLoading]=useState(true),[message,setMessage]=useState(''),[epoch,setEpoch]=useState(0);
 const revision=useRef(0);
 const captureOwner=usePaidDeliveryScope(()=>{revision.current++;setProfiles([]);setMessage('');setLoading(false);setEpoch(value=>value+1);});
 const reload=useCallback(async()=>{const owner=captureOwner(),request=++revision.current,same=()=>owner()&&request===revision.current;setProfiles([]);setLoading(true);setMessage('');try{
  const response=await authFetch('/api/profile',{cache:'no-store'},{retryOn401:false,forceFresh:true});const payload=await response.json().catch(()=>({}));if(!same())return;
  if(response.status===401)throw Object.assign(new Error('LOGIN_REQUIRED'),{status:401});if(response.status===403)throw Object.assign(new Error('ACCESS_DENIED'),{status:403});
  if(!response.ok||!Array.isArray(payload.profiles))throw new Error('PROFILE_UNAVAILABLE');
  setProfiles(payload.profiles.map(normalizeDestinyProfileCard).filter((p:DestinyProfileCard|null):p is DestinyProfileCard=>Boolean(p&&(p.id||p.profileId))));
 }catch(error){if(!same())return;setProfiles([]);const failure=error&&typeof error==='object'?error as {status?:number;code?:string}:{};setMessage(failure.status===401||['LOGIN_REQUIRED','SESSION_EXPIRED'].includes(failure.code||'')?'profileLogin':failure.status===403||failure.code==='ACCESS_DENIED'?'profileDenied':'profileFailed');}finally{if(same())setLoading(false);}},[captureOwner]);
 useEffect(()=>{void reload();},[reload,epoch]);
 const choose=async(id:string)=>{const owner=captureOwner(),request=++revision.current,same=()=>owner()&&request===revision.current;const profile=profiles.find(p=>String(p.id||p.profileId)===id);if(!profile)return;let seed=selectedBirthProfileSeed(profile);try{if(seed.calendarType==='lunar'&&(calendarMode==='solar'||seed.isLeapMonth)){
  const {lunarToSolar}=await import('@/lib/korean-calendar');const [year,month,day]=(seed.birthDate||'').split('-').map(Number);const date=lunarToSolar(year,month,day,Boolean(seed.isLeapMonth));if(!date)throw new Error('INVALID_LUNAR_DATE');
  seed={...seed,birthDate:[date.year,String(date.month).padStart(2,'0'),String(date.day).padStart(2,'0')].join('-'),calendarType:'solar',isLeapMonth:false};
 }if(same())onSelect(seed);}catch{if(same())setMessage('profileInvalid');}};
 return <div>{profiles.length>0?<><label htmlFor="toss-astrology-profile">{copy.profiles}</label><select style={{minHeight:44}} id="toss-astrology-profile" defaultValue="" disabled={loading} onChange={event=>void choose(event.target.value)}><option value="">{copy.selectProfile}</option>{profiles.map(profile=><option key={profile.id||profile.profileId} value={profile.id||profile.profileId}>{profile.name||copy.profiles}</option>)}</select></>:<strong>{copy.profiles}</strong>}<p role="status">{loading?copy.profilesLoading:message?copy[message as keyof typeof copy]:!profiles.length?copy.profilesEmpty:copy.profilesSelected} </p>{message&&<button type="button" style={{minHeight:44}} onClick={()=>void reload()}>{copy.profileRetry}</button>}</div>;
}
