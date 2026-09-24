"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import {authFetch} from '@/app/_lib/auth-client';
import {normalizeDestinyProfileCard,readDestinyProfileAccountId,readScopedDestinyProfileList,type DestinyProfileCard} from '@/app/_lib/profile-card-storage';

export const profileKey=(profile:DestinyProfileCard)=>String(profile.profileId||profile.id||'');
const storageKey=(scope:string)=>`yeongnyangi.profiles.v1::${scope}`;
type ProfileResponse={ok:boolean;profiles:DestinyProfileCard[];currentId?:string;message?:string};
function seed(scope:string){
 if(!scope)return {profiles:[] as DestinyProfileCard[],profileId:''};
 try{
  const stored=JSON.parse(sessionStorage.getItem(storageKey(scope))||'null');
  if(Array.isArray(stored?.profiles))return {profiles:stored.profiles.map(normalizeDestinyProfileCard).filter((p:DestinyProfileCard|null):p is DestinyProfileCard=>Boolean(p&&profileKey(p))),profileId:String(stored.profileId||'')};
 }catch{/* Storage can be unavailable; the authenticated request still works. */}
 return {profiles:readScopedDestinyProfileList(),profileId:''};
}
export function useProfiles(){
 const [profiles,setProfiles]=useState<DestinyProfileCard[]>([]),[profileId,setProfileId]=useState('');
 const [guest,setGuest]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const scope=useRef(''),revision=useRef(0),selection=useRef(''),selectedByUser=useRef(false),list=useRef<DestinyProfileCard[]>([]);
 const persist=useCallback(()=>{
  if(!scope.current)return;
  try{sessionStorage.setItem(storageKey(scope.current),JSON.stringify({profiles:list.current,profileId:selection.current}));}catch{/* Optional presentation cache. */}
 },[]);
 const select=useCallback((id:string)=>{
  selectedByUser.current=true;selection.current=id;setProfileId(id);setError('');persist();
 },[persist]);
 const refresh=useCallback(async(force=false,reset=false)=>{
  const requestScope=readDestinyProfileAccountId(),version=++revision.current;
  if(reset||requestScope!==scope.current){
   scope.current=requestScope;const initial=seed(requestScope);
   list.current=initial.profiles;selection.current=initial.profileId||profileKey(initial.profiles[0]||{});
   selectedByUser.current=Boolean(initial.profileId);setProfiles(initial.profiles);setProfileId(selection.current);setGuest(false);
  }
  setLoading(true);setError('');
  try{
   const response=await authFetch('/api/yeongnyangi/profiles',force?{headers:{'x-code-destiny-cache-refresh':'1'}}:{}, {forceFresh:force});
   if(version!==revision.current||requestScope!==readDestinyProfileAccountId())return;
   if(response.status===401){list.current=[];selection.current='';setProfiles([]);setProfileId('');setGuest(true);if(requestScope)sessionStorage.removeItem(storageKey(requestScope));return;}
   const data=await response.json() as ProfileResponse;
   if(version!==revision.current||requestScope!==readDestinyProfileAccountId())return;
   if(!response.ok||data.ok!==true||!Array.isArray(data.profiles))throw new Error(data.message||'프로필을 불러오지 못했어요. 다시 확인해 주세요.');
   const next=data.profiles.map(normalizeDestinyProfileCard).filter((p):p is DestinyProfileCard=>Boolean(p&&profileKey(p)));
   list.current=next;setProfiles(next);setGuest(false);
   if(selection.current&&!next.some(p=>profileKey(p)===selection.current)){
    selection.current='';selectedByUser.current=true;setError('선택한 프로필을 찾지 못했어요. 함께 읽을 프로필을 다시 골라 주세요.');
   }else if(!selectedByUser.current){
    selection.current=next.some(p=>profileKey(p)===data.currentId)?String(data.currentId):profileKey(next[0]||{});
   }
   setProfileId(selection.current);persist();
  }catch(reason){if(version===revision.current)setError(reason instanceof Error?reason.message:'프로필을 다시 확인해 주세요.');}
  finally{if(version===revision.current)setLoading(false);}
 },[persist]);
 const saved=useCallback((profile:DestinyProfileCard)=>{
  // An older list response must not remove a profile saved while it was in flight.
  revision.current++;const normalized=normalizeDestinyProfileCard(profile)||profile;
  list.current=[...list.current.filter(p=>profileKey(p)!==profileKey(normalized)),normalized];
  setProfiles(list.current);setLoading(false);setError('');select(profileKey(normalized));
 },[select]);
 useEffect(()=>{
  void refresh(false,true);
  // auth-client 는 refresh 가 실패한 뒤에야 logout 을 발행한다. 여기서 다시 조회하면 401→refresh→logout 이 끝없이 돈다.
  const auth=(event?:Event)=>{
   const detail=event instanceof CustomEvent?(event.detail as Record<string,unknown>|null):null;
   if(String(detail?.event||'').toLowerCase()==='logout'){
    revision.current++;list.current=[];selection.current='';setProfiles([]);setProfileId('');setGuest(true);setLoading(false);setError('');
    try{if(scope.current)sessionStorage.removeItem(storageKey(scope.current));}catch{/* Optional presentation cache. */}
    return;
   }
   void refresh(true,true);
  };
  const storage=(event:StorageEvent)=>{if(event.key===null||['fortune_auth_user','fortune_auth_token','cdToken'].includes(event.key))auth();};
  window.addEventListener('cd:auth-changed',auth);window.addEventListener('storage',storage);
  return()=>{revision.current++;window.removeEventListener('cd:auth-changed',auth);window.removeEventListener('storage',storage);};
 },[refresh]);
 return {profiles,profileId,select,saved,guest,loading,error,refresh};
}
