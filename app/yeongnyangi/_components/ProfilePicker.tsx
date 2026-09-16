"use client";
import {useEffect,useState} from 'react';
import {Check,Plus,Search} from 'lucide-react';
import {readDestinyProfileAccountId} from '@/app/_lib/profile-card-storage';
import {profileKey,type useProfiles} from '../_lib/use-profiles';
import {loginForCurrentPage} from '../_lib/api';
import ProfileForm from './ProfileForm';
import styles from './profiles.module.css';
type ProfileState=ReturnType<typeof useProfiles>;
export default function ProfilePicker({state}:{state:ProfileState}){
 const [query,setQuery]=useState(''),[open,setOpen]=useState(false);
 const account=readDestinyProfileAccountId();
 useEffect(()=>{setOpen(false);setQuery('');},[account]);
 const selected=state.profiles.find(p=>profileKey(p)===state.profileId);
 const matches=state.profiles.filter(p=>(p.name||'').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 return <section className={styles.picker} aria-label="함께 읽을 프로필">
  <header className={styles.heading}><img src="/assets/yeongnyangi/profiles/welcome.webp" width={56} height={56} alt=""/><div><h3>함께 읽을 프로필</h3><p>{selected?`${selected.name||'선택한 프로필'}의 이야기를 읽을게.`:'오늘은 누구의 이야기를 읽어볼까?'}</p></div></header>
  {state.guest?<div className={styles.message}><p>로그인하면 저장한 프로필을 함께 사용할 수 있어.</p><button type="button" onClick={loginForCurrentPage}>로그인하고 프로필 보기</button></div>:<>
   {state.loading&&<p className={styles.status} role="status"><img src="/assets/yeongnyangi/profiles/serious.webp" width={28} height={28} alt=""/>{state.profiles.length?'저장한 프로필부터 골라도 돼. 최신 목록을 확인하고 있어.':'저장한 프로필을 가져오고 있어.'}</p>}
   {state.profiles.length>4&&<label className={styles.search}><Search size={17} aria-hidden="true"/><span className={styles.srOnly}>프로필 이름 검색</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="이름으로 찾기"/></label>}
   <div className={styles.list} role="group" aria-label="저장한 프로필">
    {matches.map((profile,index)=><button type="button" key={profileKey(profile)} aria-pressed={profileKey(profile)===state.profileId} onClick={()=>state.select(profileKey(profile))} className={styles.choice}>
     <span className={styles.initial} aria-hidden="true">{(profile.name||'손님').slice(0,1)}</span><span className={styles.identity}><strong>{profile.name||`${index+1}번째 프로필`}</strong><small>{profile.birthDate||'출생정보 저장됨'}</small></span><span className={styles.check} aria-hidden="true">{profileKey(profile)===state.profileId&&<Check size={18}/>}</span>
    </button>)}
   </div>
   {!state.loading&&!state.profiles.length&&!state.error&&<p className={styles.message}>아직 저장한 프로필이 없어. 첫 이야기를 남겨줘.</p>}
   {query&&!matches.length&&<p className={styles.message}>이 이름으로 저장한 프로필이 없어. 검색어를 바꿔줘.</p>}
   {state.error&&<div className={styles.error} role="alert"><p>{state.error}</p><button type="button" onClick={()=>void state.refresh(true)}>프로필 다시 확인하기</button></div>}
   <button type="button" className={styles.add} aria-expanded={open} onClick={()=>setOpen(!open)}><Plus size={17}/>{open?'프로필 입력 접기':'새 프로필 만들기'}</button>
   <p className={styles.note}>영냥이에서는 프로필 개수 제한 없이 등록할 수 있어.</p>
   {open&&<ProfileForm key={account} onSaved={profile=>{state.saved(profile);setOpen(false);}}/>}
  </>}
 </section>;
}
