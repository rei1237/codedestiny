import {useCallback,useEffect,useRef,useState} from 'react';
import {authFetch} from '@/app/_lib/auth-client';
import {selectedBirthProfileSeed,type AiPrefillSeed} from '@/app/_lib/ai-prefill-seed';
import {normalizeDestinyProfileCard,type DestinyProfileCard} from '@/app/_lib/profile-card-storage';
import {usePaidDeliveryScope} from '@/app/hooks/usePaidDeliveryScope';

// Profile choices are always read from the current Toss identity, never web cache.
export default function TossAstrologyProfilePicker({onSelect}:{onSelect:(seed:AiPrefillSeed)=>void}){
 const [profiles,setProfiles]=useState<DestinyProfileCard[]>([]),[loading,setLoading]=useState(true),[message,setMessage]=useState(''),[epoch,setEpoch]=useState(0);
 const revision=useRef(0);
 const captureOwner=usePaidDeliveryScope(()=>{revision.current++;setProfiles([]);setMessage('');setLoading(false);setEpoch(value=>value+1);});
 const reload=useCallback(async()=>{const owner=captureOwner(),request=++revision.current,same=()=>owner()&&request===revision.current;setProfiles([]);setLoading(true);setMessage('');try{
  const response=await authFetch('/api/profile',{cache:'no-store'},{retryOn401:false,forceFresh:true});const payload=await response.json().catch(()=>({}));if(!same())return;
  if(response.status===401)throw Object.assign(new Error('LOGIN_REQUIRED'),{status:401});if(response.status===403)throw Object.assign(new Error('ACCESS_DENIED'),{status:403});
  if(!response.ok||!Array.isArray(payload.profiles))throw new Error('PROFILE_UNAVAILABLE');
  setProfiles(payload.profiles.map(normalizeDestinyProfileCard).filter((p:DestinyProfileCard|null):p is DestinyProfileCard=>Boolean(p&&(p.id||p.profileId))));
 }catch(error){if(!same())return;setProfiles([]);const failure=error&&typeof error==='object'?error as {status?:number;code?:string}:{};setMessage(failure.status===401||['LOGIN_REQUIRED','SESSION_EXPIRED'].includes(failure.code||'')?'프로필을 확인하려면 토스 로그인이 필요해요.':failure.status===403||failure.code==='ACCESS_DENIED'?'프로필에 접근할 권한을 확인할 수 없어요.':'프로필을 불러오지 못했어요. 다시 확인하거나 직접 입력해 주세요.');}finally{if(same())setLoading(false);}},[captureOwner]);
 useEffect(()=>{void reload();},[reload,epoch]);
 const choose=async(id:string)=>{const owner=captureOwner(),request=++revision.current,same=()=>owner()&&request===revision.current;const profile=profiles.find(p=>String(p.id||p.profileId)===id);if(!profile)return;let seed=selectedBirthProfileSeed(profile);try{if(seed.calendarType==='lunar'){
  const {lunarToSolar}=await import('@/lib/korean-calendar');const [year,month,day]=(seed.birthDate||'').split('-').map(Number);const date=lunarToSolar(year,month,day,Boolean(seed.isLeapMonth));if(!date)throw new Error('INVALID_LUNAR_DATE');
  seed={...seed,birthDate:[date.year,String(date.month).padStart(2,'0'),String(date.day).padStart(2,'0')].join('-'),calendarType:'solar',isLeapMonth:false};
 }if(same())onSelect(seed);}catch{if(same())setMessage('생년월일을 확인하지 못했어요. 아래 입력을 확인해 주세요.');}};
 return <div>{profiles.length>0?<><label htmlFor="toss-astrology-profile">저장된 프로필</label><select id="toss-astrology-profile" defaultValue="" disabled={loading} onChange={event=>void choose(event.target.value)}><option value="">프로필 선택하기</option>{profiles.map(profile=><option key={profile.id||profile.profileId} value={profile.id||profile.profileId}>{profile.name||'저장된 프로필'}</option>)}</select></>:<strong>저장된 프로필</strong>}<p role="status">{loading?'프로필 확인 중':message||(!profiles.length?'저장된 프로필이 없어요. 직접 입력해 주세요.':'선택한 정보는 이번 상담에 사용해요.')}</p>{message&&<button type="button" onClick={()=>void reload()}>프로필 다시 확인하기</button>}</div>;
}
