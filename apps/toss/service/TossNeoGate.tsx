import {useId,useCallback} from 'react';
import {useAuthStore} from '@/app/_lib/auth-store';
import type {AiPrefillSeed} from '@/app/_lib/ai-prefill-seed';
import type {TossTeaPriceSelection} from '@/src/features/fortune-tea-house/lib/tossPriceSelection';
import NeoOperationRoomPage from '@/src/features/neo-war-room/NeoOperationRoomPage';
import TossAstrologyProfilePicker from './TossAstrologyProfilePicker';
import TossTeaPrice from './TossTeaPrice';
import {readNeoQuestionDraft,saveNeoQuestionDraft} from './neo-question-draft.mjs';
function Price({featureKey,onPrice}:{featureKey:string;onPrice:(selection:TossTeaPriceSelection|null)=>void}){
 return <TossTeaPrice featureKey={featureKey} onPrice={onPrice} loginNext="/neo-operation-room/"/>;
}
function Profile({onSelect,calendarMode,label}:{onSelect:(seed:AiPrefillSeed)=>void;calendarMode?:'lunar';label?:string}){
 const id=useId();return <div>{label&&<p>{label}</p>}<TossAstrologyProfilePicker onSelect={onSelect} calendarMode={calendarMode} inputId={id}/></div>;
}
export default function TossNeoGate(){
 const auth=useAuthStore(),owner=String(auth.user?.id||auth.user?.userId||auth.user?._id||auth.user?.uid||'');
 const onQuestionChange=useCallback((question:string)=>{try{saveNeoQuestionDraft(localStorage,owner,question);}catch{}},[owner]);
 let initialQuestion='';try{initialQuestion=readNeoQuestionDraft(localStorage,owner);}catch{}
 if(!auth.isAuthenticated||!owner){const next=typeof window==='undefined'?'/neo-operation-room/':window.location.pathname+window.location.search;return <section><h1>네오의 팩폭 전략실</h1><p>토스로 로그인한 뒤 상담을 이어갈 수 있어요.</p><a href={'/login/?next='+encodeURIComponent(next)}>토스로 로그인하기</a></section>;}
 return <NeoOperationRoomPage key={owner} paymentSurface="toss" draftOwner={owner} initialQuestion={initialQuestion} onQuestionChange={onQuestionChange} TossPrice={Price} TossProfile={Profile}/>;
}
