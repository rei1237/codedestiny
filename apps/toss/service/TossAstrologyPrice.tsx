import {useEffect,useState} from 'react';
import {useAuthStore} from '@/app/_lib/auth-store';
import {nativeSaleProducts} from '../src/platform';

export default function TossAstrologyPrice(){
 const auth=useAuthStore(),owner=String(auth.user?.id||auth.user?.userId||auth.user?._id||auth.user?.uid||'');
 const [price,setPrice]=useState(''),[priceOwner,setPriceOwner]=useState(''),[message,setMessage]=useState(''),[status,setStatus]=useState<'loading'|'ready'|'unavailable'|'error'>('loading'),[retry,setRetry]=useState(0);
 useEffect(()=>{let alive=true;setPrice('');setMessage('');setStatus('loading');void nativeSaleProducts().then(items=>{if(!alive)return;const item=items.find(value=>value.featureKey==='astrology-ai-consultation');setPrice(item?.displayAmount||'');setPriceOwner(owner);setStatus(item?.displayAmount?'ready':'unavailable');}).catch(error=>{if(alive){const failure=error&&typeof error==='object'?error as {status?:number;code?:string}:{};setPrice('');setPriceOwner(owner);setMessage(failure.status===403||failure.code==='ACCESS_DENIED'?'상품에 접근할 권한을 확인할 수 없어요.':failure.status===401||['LOGIN_REQUIRED','SESSION_EXPIRED'].includes(failure.code||'')?'상품을 확인하려면 토스 로그인이 필요해요.':'상품 가격을 확인하지 못했어요.');setStatus('error');}});return()=>{alive=false;};},[owner,retry]);
 if(priceOwner!==owner)return <span role="status">상품 가격을 확인하고 있어요.</span>;
 if(status==='ready')return <span>단건 결제 {price}</span>;
 if(status==='loading')return <span role="status">상품 가격을 확인하고 있어요.</span>;
 return <span role="status">{status==='error'?message:'등록된 상품을 확인하지 못했어요.'} <button type="button" onClick={()=>setRetry(value=>value+1)}>다시 확인하기</button></span>;
}
