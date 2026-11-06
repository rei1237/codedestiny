import {useAuthStore} from '@/app/_lib/auth-store';
import type {AiPrefillSeed} from '@/app/_lib/ai-prefill-seed';
import type {TossTeaPriceSelection} from '@/src/features/fortune-tea-house/lib/tossPriceSelection';
import SukuyoCompatibilityAiClient from '@/app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient';
import TossAstrologyProfilePicker from './TossAstrologyProfilePicker';
import TossTeaPrice from './TossTeaPrice';

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
 if(typeof window!=='undefined'&&new URLSearchParams(window.location.search).has('orderId'))return <section><h1>결제한 상담 확인</h1><p>추가로 결제하지 말고 기록 보관함에서 주문과 상담을 확인해 주세요. 확인이 어렵다면 고객지원에 문의해 주세요.</p><a href="/records/">기록 보관함 열기</a></section>;
 return <SukuyoCompatibilityAiClient key={owner} paymentSurface="toss" draftOwner={owner} ProfilePicker={Profile} TossPrice={Price}/>;
}
