import {useEffect,useState} from 'react';
import {useAuthStore} from '@/app/_lib/auth-store';
import {nativeSaleProducts} from '../src/platform';
import {useTossConsultationCopy} from '@/app/_lib/toss-consultation-copy';

export default function TossAstrologyPrice({featureKey='astrology-ai-consultation'}:{featureKey?:string}){
 const {copy}=useTossConsultationCopy();
 const auth=useAuthStore(),owner=String(auth.user?.id||auth.user?.userId||auth.user?._id||auth.user?.uid||'');
 const scope=owner+':'+featureKey;
 const [price,setPrice]=useState(''),[priceOwner,setPriceOwner]=useState(''),[message,setMessage]=useState(''),[status,setStatus]=useState<'loading'|'ready'|'unavailable'|'error'>('loading'),[retry,setRetry]=useState(0);
 useEffect(()=>{let alive=true;setPrice('');setMessage('');setStatus('loading');void nativeSaleProducts().then(items=>{if(!alive)return;const item=items.find(value=>value.featureKey===featureKey);setPrice(item?.displayAmount||'');setPriceOwner(scope);setStatus(item?.displayAmount?'ready':'unavailable');}).catch(error=>{if(alive){const failure=error&&typeof error==='object'?error as {status?:number;code?:string}:{};setPrice('');setPriceOwner(scope);setMessage(failure.status===403||failure.code==='ACCESS_DENIED'?'priceDenied':failure.status===401||['LOGIN_REQUIRED','SESSION_EXPIRED'].includes(failure.code||'')?'priceLogin':'priceFailed');setStatus('error');}});return()=>{alive=false;};},[scope,retry,featureKey]);
 if(priceOwner!==scope)return <span role="status">{copy.priceChecking}</span>;
 if(status==='ready')return <span>{copy.priceLabel} {price}</span>;
 if(status==='loading')return <span role="status">{copy.priceChecking}</span>;
 return <span role="status">{status==='error'?copy[message as keyof typeof copy]:copy.priceUnavailable} <button type="button" style={{minHeight:44}} onClick={()=>setRetry(value=>value+1)}>{copy.retry}</button></span>;
}
