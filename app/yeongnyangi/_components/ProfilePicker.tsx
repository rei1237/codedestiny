"use client";
import {useEffect,useState} from 'react';
import {Check,Plus,Search} from 'lucide-react';
import {readDestinyProfileAccountId} from '@/app/_lib/profile-card-storage';
import {profileKey,type useProfiles} from '../_lib/use-profiles';
import {loginForCurrentPage} from '../_lib/api';
import ProfileForm from './ProfileForm';
import {consultationInputCopy,profileLoadError} from '../_lib/consultation-input-copy';
import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
import styles from './profiles.module.css';
type ProfileState=ReturnType<typeof useProfiles>;
export default function ProfilePicker({state,locale}:{state:ProfileState;locale?:ReadingLocale}){
 const copy=consultationInputCopy(locale);
 const [query,setQuery]=useState(''),[open,setOpen]=useState(false);
 const account=readDestinyProfileAccountId();
 useEffect(()=>{setOpen(false);setQuery('');},[account]);
 const selected=state.profiles.find(p=>profileKey(p)===state.profileId);
 const matches=state.profiles.filter(p=>(p.name||'').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 return <section className={styles.picker} aria-label={copy.picker} lang={locale||'ko'}>
  <header className={styles.heading}><img src="/assets/yeongnyangi/profiles/welcome.webp" width={56} height={56} alt=""/><div><h3>{copy.picker}</h3><p>{selected?copy.selected(selected.name||copy.selectedFallback):copy.pickerPrompt}</p></div></header>
  {state.guest?<div className={styles.message}><p>{copy.guest}</p><button type="button" onClick={loginForCurrentPage}>{copy.login}</button></div>:<>
   {state.loading&&<p className={styles.status} role="status"><img src="/assets/yeongnyangi/profiles/serious.webp" width={28} height={28} alt=""/>{state.profiles.length?copy.loadingExisting:copy.loading}</p>}
   {state.profiles.length>4&&<label className={styles.search}><Search size={17} aria-hidden="true"/><span className={styles.srOnly}>{copy.search}</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={copy.searchPlaceholder}/></label>}
   <div className={styles.list} role="group" aria-label={copy.picker}>
    {matches.map((profile,index)=><button type="button" key={profileKey(profile)} aria-pressed={profileKey(profile)===state.profileId} onClick={()=>state.select(profileKey(profile))} className={styles.choice}>
     <span className={styles.initial} aria-hidden="true">{(profile.name||copy.guestName).slice(0,1)}</span><span className={styles.identity}><strong>{profile.name||copy.profileNumber(index+1)}</strong><small>{profile.birthDate||copy.savedBirth}</small></span><span className={styles.check} aria-hidden="true">{profileKey(profile)===state.profileId&&<Check size={18}/>}</span>
    </button>)}
   </div>
   {!state.loading&&!state.profiles.length&&!state.error&&<p className={styles.message}>{copy.empty}</p>}
   {query&&!matches.length&&<p className={styles.message}>{copy.noMatch}</p>}
   {state.error&&<div className={styles.error} role="alert"><p>{locale==='ko'?state.error:profileLoadError(locale)}</p><button type="button" onClick={()=>void state.refresh(true)}>{copy.retry}</button></div>}
   <button type="button" className={styles.add} aria-expanded={open} onClick={()=>setOpen(!open)}><Plus size={17}/>{open?copy.close:copy.add}</button>
   <p className={styles.note}>{copy.family}</p>
   {open&&<ProfileForm key={account} locale={locale} onSaved={profile=>{state.saved(profile);setOpen(false);}}/>}
  </>}
 </section>;
}
