import {lazy,Suspense,useEffect,useMemo,useState} from 'react';
import {File as TossFile} from '@apps-in-toss/web-framework';
import MoonlitEntry from '@/app/moonlit-lotus/_ritual/MoonlitEntry';
import {SpacePlatformContext} from '@/app/moonlit-lotus/_lib/space-platform';
import {clearTossSpaceOwner} from '@/app/moonlit-lotus/_lib/private-store';
import {useAuthStore} from '@/app/_lib/auth-store';
import {api,getTossSessionRevision,hasTossSession} from '../src/platform';
import TossSessionScope from '../src/TossSessionScope';

const Story=lazy(()=>import('@/app/moonlit-lotus/story/page'));
const Review=lazy(()=>import('@/app/moonlit-lotus/model-review/ModelReview'));
function VerifiedSpace(){
 const activeUser=useAuthStore().user;
 const signedIn=hasTossSession();
 const owner=activeUser?.id||'';
 const revision=getTossSessionRevision();
 const [verified,setVerified]=useState(null),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  if(!signedIn)return;
  let live=true;setError(false);
  (async()=>{
   const result=await api('/canonical/moonlit-lotus/session');
   if((owner&&result.owner!==owner)||typeof result.owner!=='string'||!result.scope?.startsWith('toss.'+result.owner.toLowerCase()+'.'))throw Error('SESSION_CHECK_FAILED');
   if(!live||getTossSessionRevision()!==revision)return;
   await clearTossSpaceOwner(result.owner,result.scope);
   if(live)setVerified(result);
  })().catch(()=>{if(live)setError(true);});
  return ()=>{live=false;};
 },[signedIn,owner,attempt,revision]);
 const ownerScope=signedIn?(verified&&(!owner||verified.owner===owner)?verified.scope:''):'toss-guest';
 const tools=useMemo(()=>({ownerScope,async savePhoto(blob,fileName){
  if(!TossFile.saveBase64.isSupported())throw Error('FILE_SAVE_NOT_SUPPORTED');
  const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});
  if(getTossSessionRevision()!==revision||typeof data!=='string'||!data.startsWith('data:image/png;base64,'))throw Error('SESSION_CHANGED');
  await TossFile.saveBase64({data:data.slice(22),fileName,mimeType:'image/png'});
 }}),[ownerScope,revision]);
 useEffect(()=>{
  const back=event=>{
   const dialog=document.querySelector('dialog[open]');
   if(dialog){event.preventDefault();dialog.dispatchEvent(new Event('cancel',{cancelable:true}));return;}
   const close=document.querySelector('button[aria-label="활동 패널 닫기"]');
   if(close){event.preventDefault();close.click();}
  };
  window.addEventListener('code-destiny:toss-overlay-back',back);
  return ()=>window.removeEventListener('code-destiny:toss-overlay-back',back);
 },[]);
 if(!ownerScope)return error?<p role="alert">연화당 기록의 계정을 확인하지 못했어요. <button onClick={()=>setAttempt(n=>n+1)}>다시 확인하기</button></p>:<p role="status">연화당 기록의 계정을 확인하고 있어요.</p>;
 const path=location.pathname;
 return <SpacePlatformContext.Provider value={tools}><Suspense fallback={<p role="status">연화당을 열고 있어요.</p>}>
  {path.includes('/model-review')?<Review/>:path.includes('/story')?<Story/>:<MoonlitEntry/>}
 </Suspense></SpacePlatformContext.Provider>;
}
export default function TossMoonlitLotus(){return <TossSessionScope><VerifiedSpace/></TossSessionScope>;}
