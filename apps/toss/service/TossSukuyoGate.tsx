import {useAuthStore} from '@/app/_lib/auth-store';
import type {AiPrefillSeed} from '@/app/_lib/ai-prefill-seed';
import type {TossTeaPriceSelection} from '@/src/features/fortune-tea-house/lib/tossPriceSelection';
import SukuyoCompatibilityAiClient from '@/app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient';
import TossAstrologyProfilePicker from './TossAstrologyProfilePicker';
import TossTeaPrice from './TossTeaPrice';
import TossSukuyoRecovery from './TossSukuyoRecovery';

function Profile({onSelect,id}:{onSelect:(seed:AiPrefillSeed)=>void;id:string}){
 return <TossAstrologyProfilePicker onSelect={onSelect} calendarMode="native-lunar" inputId={id}/>;
}
function Price({onPrice}:{onPrice:(selection:TossTeaPriceSelection|null)=>void}){
 const next=typeof window==='undefined'?'/sukuyo-compatibility-ai/':(()=>{const url=new URL(window.location.href);url.searchParams.set('restoreSukuyoDraft','1');return url.pathname+url.search;})();
 return <TossTeaPrice featureKey="sukuyo-compatibility-ai" onPrice={onPrice} loginNext={next}/>;
}
export default function TossSukuyoGate(){
 const auth=useAuthStore(),owner=String(auth.user?.id||auth.user?.userId||auth.user?._id||auth.user?.uid||'');
 if(!auth.isAuthenticated||!owner){const next=typeof window==='undefined'?'/sukuyo-compatibility-ai/':window.location.pathname+window.location.search;return <section><h1>숙요점 궁합 전문가 상담</h1><p>토스로 로그인한 뒤 상담을 이어갈 수 있어요.</p><a href={'/login/?next='+encodeURIComponent(next)}>토스로 로그인하기</a></section>;}
 if(typeof window!=='undefined'&&new URLSearchParams(window.location.search).has('orderId'))return <TossSukuyoRecovery key={owner} owner={owner} orderId={new URLSearchParams(window.location.search).get('orderId')||''} renderInput={attach=><SukuyoCompatibilityAiClient key={owner} paymentSurface="toss" draftOwner={owner} ProfilePicker={Profile} recoverPurchase={attach}/>}/>;
 return <SukuyoCompatibilityAiClient key={owner} paymentSurface="toss" draftOwner={owner} ProfilePicker={Profile} TossPrice={Price}/>;
}
