"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import {readCurrentDestinyProfile,readDestinyProfileAccountId,isDestinyProfileStorageKey} from '@/app/_lib/profile-card-storage';
import {authFetch} from '@/app/_lib/auth-client';
import {petArtUrl} from '@/js/core/profile-pet.mjs';
import {petSpriteMarkup} from '@/js/core/profile-pet-card.mjs';
import {defaultCharacter,type Character} from './session-policy';
export type AvatarStyle={color:string;zoom:number;x:number;y:number;name:string};
export const DEFAULT_AVATAR:AvatarStyle={color:'#b998cf',zoom:1,x:50,y:35,name:'나의 친구'};
export function useSpaceProfile(){
 const [identity,setIdentity]=useState({scope:'guest|default',account:'',profileId:'',gender:''});
 const [character,setCharacter]=useState<Character|null>(null),[avatar,setAvatar]=useState<AvatarStyle>(DEFAULT_AVATAR);
 const [image,setImage]=useState(''),[portrait,setPortrait]=useState(''),[imageError,setImageError]=useState(''),[loading,setLoading]=useState(false),[loaded,setLoaded]=useState(false);
 const revision=useRef(0);
 const refresh=useCallback(()=>{
  revision.current++;
  const account=readDestinyProfileAccountId(),profile=readCurrentDestinyProfile(undefined,()=>true);
  const profileId=String(profile?.profileId||profile?.id||'default'),scope=(account||'guest')+'|'+profileId;
  setIdentity({scope,account,profileId,gender:profile?.gender||''});setImage('');setPortrait('');setImageError('');setLoaded(false);setLoading(false);
  try{
   const prefs=JSON.parse(localStorage.getItem('cd:moonlit:prefs:'+scope)||'{}');
   const manual=['yeoni','cat','custom'].includes(prefs.character)?prefs.character as Character:null;
   setCharacter(defaultCharacter(manual,profile?.gender||''));
   setAvatar({color:/^#[a-f0-9]{6}$/i.test(prefs.avatar?.color)?prefs.avatar.color:DEFAULT_AVATAR.color,zoom:Math.min(1.8,Math.max(.8,Number(prefs.avatar?.zoom)||1)),x:Math.min(100,Math.max(0,Number(prefs.avatar?.x)||50)),y:Math.min(100,Math.max(0,Number(prefs.avatar?.y)||35)),name:String(prefs.avatar?.name||'나의 친구').slice(0,20)});
  }catch{setCharacter(defaultCharacter(null,profile?.gender||''));setAvatar(DEFAULT_AVATAR);}
 },[]);
 useEffect(()=>{
  refresh();
  const storage=(event:StorageEvent)=>{if(!event.key||event.key==='fortune_auth_user'||isDestinyProfileStorageKey(event.key))refresh();};
  const auth=(event:Event)=>{const detail=(event as CustomEvent).detail;if(detail?.event==='subscription')return;refresh();};
  window.addEventListener('cd:auth-changed',auth);window.addEventListener('storage',storage);document.addEventListener('destinyProfileChanged',refresh);
  return()=>{revision.current++;window.removeEventListener('cd:auth-changed',auth);window.removeEventListener('storage',storage);document.removeEventListener('destinyProfileChanged',refresh);};
 },[refresh]);
 const loadImage=useCallback(async()=>{
  const token=++revision.current;setLoading(true);setImageError('');
  if(!identity.account||identity.profileId==='default'){setImageError('프로필에 저장된 친구가 필요해요. 마이페이지에서 프로필과 친구를 먼저 확인해 주세요.');setLoading(false);return;}
  try{
   // Same read-only saved companion used by the home/My profile card. Never hatch or mutate a pet here.
   const response=await authFetch('/api/rpg/pet?profileId='+encodeURIComponent(identity.profileId),{method:'GET',credentials:'include',cache:'no-store'});
   const data=await response.json();if(token!==revision.current)return;
   if(!response.ok||!data?.ok||data.degraded||!data.pet)throw Error('saved-pet-unavailable');
   const url=petArtUrl(data.pet.speciesId,'body');
   if(typeof url!=='string'||!url.startsWith('/assets/'))throw Error('invalid-pet-art');
   const pet=data.pet;
   if(!['natural','wood','fire','earth','metal','water'].includes(pet.coat)||!pet.traits||
    !['expression','pattern','accessory'].every(key=>Number.isInteger(pet.traits[key])&&pet.traits[key]>=0&&pet.traits[key]<=15))throw Error('invalid-pet');
   const decoded=new Image();decoded.src=url;await decoded.decode();
   if(token!==revision.current)return;
   setImage(url);setPortrait(petSpriteMarkup(pet));setLoaded(true);
  }catch{if(token===revision.current)setImageError('프로필의 친구 이미지를 불러오지 못했어요. 다시 시도하거나 연이·영냥이와 쉬어가세요.');}
  finally{if(token===revision.current)setLoading(false);}
 },[identity.account,identity.profileId]);
 const save=(next:Character,look=avatar)=>{
  setCharacter(next);setAvatar(look);
  try{localStorage.setItem('cd:moonlit:prefs:'+identity.scope,JSON.stringify({character:next,avatar:look}));}catch{setImageError('꾸민 모습은 현재 화면에 적용됐지만 저장하지 못했어요.');}
 };
 return{...identity,character,avatar,image,portrait,imageError,loading,loaded,loadImage,save,setAvatar};
}
