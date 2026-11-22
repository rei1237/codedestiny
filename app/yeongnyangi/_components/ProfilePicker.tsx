"use client";
import {useEffect,useState} from 'react';
import {Check,Pencil,Plus,Search} from 'lucide-react';
import {authFetch} from '@/app/_lib/auth-client';
import {readDestinyProfileAccountId} from '@/app/_lib/profile-card-storage';
import {profileKey,type useProfiles} from '../_lib/use-profiles';
import {loginForCurrentPage} from '../_lib/api';
import ProfileForm,{profileEntryDraftScope} from './ProfileForm';
import {readFeatureSessionDraft} from '@/app/_lib/feature-session-draft';
import type {VoiceStyle} from '../_lib/voice-style-copy';
import {consultationInputCopy,profileLoadError} from '../_lib/consultation-input-copy';
import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
import styles from './profiles.module.css';
type ProfileState=ReturnType<typeof useProfiles>;
export default function ProfilePicker({state,locale,conversational=false,guided=false,onEditingChange,voice='banmal',premium=false,loadProfilePetArt,onLogin=loginForCurrentPage}:{state:ProfileState;locale?:ReadingLocale;conversational?:boolean;guided?:boolean;onEditingChange?:(editing:boolean)=>void;voice?:VoiceStyle;premium?:boolean;loadProfilePetArt?:()=>Promise<(speciesId:string)=>string>;onLogin?:()=>void}){
 const copy=consultationInputCopy(locale);
 const [query,setQuery]=useState(''),[open,setOpen]=useState(()=>guided&&Boolean(readFeatureSessionDraft(profileEntryDraftScope())));
 const [editId,setEditId]=useState('');
 const account=readDestinyProfileAccountId();
 useEffect(()=>{setOpen(guided&&Boolean(readFeatureSessionDraft(profileEntryDraftScope())));setQuery('');setEditId('');},[account,guided]);
 const selected=state.profiles.find(p=>profileKey(p)===state.profileId);
 const avatarId=premium&&loadProfilePetArt&&!state.guest&&!state.loading&&!state.error&&selected&&account?profileKey(selected):'';
 const [avatar,setAvatar]=useState<{account:string;id:string;url:string}|null>(null);
 useEffect(()=>{
  if(!avatarId||!loadProfilePetArt)return;
  const controller=new AbortController();
  const timer=window.setTimeout(async()=>{
   try{
    const petArtUrl=await loadProfilePetArt();
    if(controller.signal.aborted||readDestinyProfileAccountId()!==account)return;
    const response=await authFetch('/api/rpg/pet?profileId='+encodeURIComponent(avatarId),{signal:controller.signal,cache:'no-store'},{retryOn401:false});
    if(!response.ok)return;
    const data=await response.json();
    const url=data?.ok===true&&!data.degraded&&typeof data?.pet?.speciesId==='string'?petArtUrl(data.pet.speciesId):'';
    if(url&&!controller.signal.aborted&&readDestinyProfileAccountId()===account)setAvatar({account,id:avatarId,url});
   }catch{/* The initials are also the fallback when a pet cannot be loaded. */}
  },220);
  return ()=>{window.clearTimeout(timer);controller.abort();};
 },[account,avatarId,loadProfilePetArt]);
 const firstEntry=guided&&!state.loading&&!state.error&&!state.profiles.length;
 const editProfile=guided&&selected&&editId===profileKey(selected)?selected:undefined;
 const editing=open||firstEntry||Boolean(editProfile);
 useEffect(()=>{onEditingChange?.(guided&&editing&&!state.guest);return()=>onEditingChange?.(false);},[guided,editing,state.guest,onEditingChange]);
 const matches=state.profiles.filter(p=>(p.name||'').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 return <section className={premium?`${styles.picker} ${styles.premium}`:styles.picker} aria-label={copy.picker} lang={locale||'ko'}>
  <header className={styles.heading}><img src="/assets/yeongnyangi/profiles/welcome.webp" width={56} height={56} alt=""/><div><h3>{guided?'상담할 사람':copy.picker}</h3><p>{selected?copy.selected(selected.name||copy.selectedFallback):copy.pickerPrompt}</p></div></header>
  {state.guest?<div className={styles.message}><p>{copy.guest}</p><button type="button" onClick={onLogin}>{copy.login}</button></div>:<>
   {state.loading&&<p className={styles.status} role="status"><img src="/assets/yeongnyangi/profiles/serious.webp" width={28} height={28} alt=""/>{state.profiles.length?copy.loadingExisting:copy.loading}</p>}
   {state.profiles.length>4&&<label className={styles.search}><Search size={17} aria-hidden="true"/><span className={styles.srOnly}>{copy.search}</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={copy.searchPlaceholder}/></label>}
   <div className={styles.list} role="group" aria-label={copy.picker}>
    {matches.map((profile,index)=><button type="button" key={profileKey(profile)} aria-pressed={profileKey(profile)===state.profileId} onClick={()=>{setEditId('');state.select(profileKey(profile));}} className={styles.choice}>
     <span className={styles.initial} aria-hidden="true">{(profile.name||copy.guestName).slice(0,1)}{avatar&&avatar.account===account&&avatar.id===avatarId&&profileKey(profile)===avatarId&&<span className={styles.portrait}><img key={avatar.url} src={avatar.url} alt="" decoding="async" onError={event=>{event.currentTarget.hidden=true;}}/></span>}</span><span className={styles.identity}><strong>{profile.name||copy.profileNumber(index+1)}</strong><small>{profile.birthDate||copy.savedBirth}</small></span><span className={styles.check} aria-hidden="true">{profileKey(profile)===state.profileId&&<Check size={18}/>}</span>
    </button>)}
   </div>
   {!guided&&!state.loading&&!state.profiles.length&&!state.error&&<p className={styles.message}>{copy.empty}</p>}
   {query&&!matches.length&&<p className={styles.message}>{copy.noMatch}</p>}
   {state.error&&<div className={styles.error} role="alert"><p>{locale==='ko'?state.error:profileLoadError(locale)}</p><button type="button" onClick={()=>void state.refresh(true)}>{copy.retry}</button></div>}
   {guided&&selected&&!state.loading&&!state.error&&!open&&<button type="button" className={styles.add} aria-expanded={Boolean(editProfile)} onClick={()=>{if(editProfile){setEditId('');void state.refresh(true);}else setEditId(profileKey(selected));}}><Pencil size={17} aria-hidden="true"/>{editProfile?'수정 닫기':'선택한 프로필 수정'}</button>}
   {!firstEntry&&!editProfile&&<button type="button" className={styles.add} aria-expanded={open} onClick={()=>setOpen(!open)}><Plus size={17}/>{open?copy.close:guided?'다른 사람 출생정보 입력':copy.add}</button>}
   {editing&&<ProfileForm key={account+':'+(editProfile?editId:'create')} editProfile={editProfile} locale={locale} conversational={conversational} guided={guided} voice={voice} onLogin={onLogin} onSaved={profile=>{state.saved(profile);setOpen(false);setEditId('');}}/>}
  </>}
 </section>;
}
