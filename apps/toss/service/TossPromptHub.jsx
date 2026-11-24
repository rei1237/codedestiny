import {useCallback,useEffect,useRef,useState} from 'react';
import {Clipboard,Device} from '@apps-in-toss/web-framework';
import PromptHub from '@/app/fortune/prompt-hub/PromptHubClient';
import {refreshAuth,useAuthStore} from '@/app/_lib/auth-store';
import {clearTossPromptLibrary} from '../../../lib/fortune/toss-prompt-library.mjs';
import heroSrc from '../../../public/images/fortune-tea-house/말하는 꽃돼지 연이3-Photoroom.webp?url';
import {api,login} from '../src/platform';

export default function TossPromptHub(){
 const owner=useAuthStore().user?.id||'',verified=useRef(null),previous=useRef(owner),version=useRef(0);
 const [scope,setScope]=useState(null),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
 const verifyScope=useCallback(async()=>{
  const session=await api('/canonical/fortune/prompt-hub/session');
  if(!session?.owner||!session.scope?.startsWith('toss.'+session.owner.toLowerCase()+'.'))throw new Error('SESSION_CHECK_FAILED');
  try{clearTossPromptLibrary(localStorage,session.owner,Number(session.scope.split('.')[2]));}catch{/* Storage can be unavailable. */}
  verified.current=session;
  setScope(session);
  return session;
 },[]);
 useEffect(()=>{
  let active=true;
  if(!owner){verified.current=null;setScope(null);setFailed(false);}
  else if(verified.current?.owner!==owner){
   setFailed(false);void verifyScope().catch(()=>{if(active)setFailed(true);});
  }
  return ()=>{active=false;};
 },[owner,verifyScope,attempt]);
 // Discard the previous account's in-memory result while preserving the entered guest form on login.
 if(previous.current && previous.current!==owner)version.current++;
 previous.current=owner;
 if(owner&&scope?.owner!==owner)return failed?<div role="alert">보관함 계정을 확인하지 못했어요. <button onClick={()=>setAttempt(n=>n+1)}>다시 확인하기</button></div>:<p role="status">보관함 계정을 확인하고 있어요.</p>;
 return <PromptHub key={version.current} toss={{
  heroSrc,copy:text=>Clipboard.setText(text),openAI:url=>Device.openURL(url),
  libraryOwner:id=>id&&verified.current?.owner===id?verified.current.scope:'',
  async login(){
   await login();
   const session=await verifyScope();
   const user=await refreshAuth({force:true});
   if(user?.id!==session.owner)throw new Error('SESSION_CHECK_FAILED');
  },
 }}/>;
}
