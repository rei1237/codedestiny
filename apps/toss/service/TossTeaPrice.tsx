import {useEffect,useState} from 'react';
import {useAuthStore} from '@/app/_lib/auth-store';
import {useTossConsultationCopy} from '@/app/_lib/toss-consultation-copy';
import {nativeSaleProducts} from '../src/platform';
import type {TossTeaPriceSelection} from '@/src/features/fortune-tea-house/lib/tossPriceSelection';

export default function TossTeaPrice({featureKey,onPrice,loginNext}:{featureKey:string;onPrice:(value:TossTeaPriceSelection|null)=>void;loginNext?:string}){
 const {copy}=useTossConsultationCopy(),auth=useAuthStore(),owner=String(auth.user?.id||auth.user?.userId||auth.user?._id||auth.user?.uid||'');
 const scope=JSON.stringify([auth.isAuthenticated,owner,featureKey]),[statusScope,setStatusScope]=useState('');
 const [status,setStatus]=useState<'loading'|'ready'|'unavailable'|'error'>('loading'),[price,setPrice]=useState(''),[message,setMessage]=useState<'priceDenied'|'priceLogin'|'priceFailed'>('priceFailed'),[sdkMessage,setSdkMessage]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{let live=true;setStatusScope(scope);setStatus('loading');setPrice('');setMessage('priceFailed');setSdkMessage('');onPrice(null);
  if(!auth.isAuthenticated||!owner){setStatus('error');setMessage('priceLogin');return()=>{live=false;};}
  void nativeSaleProducts().then(items=>{if(!live)return;const item=items.find(row=>row.featureKey===featureKey&&row.displayAmount&&row.sku&&Number.isSafeInteger(row.approvedPriceKRW)&&row.approvedPriceKRW>0);if(!item){setStatus('unavailable');return;}setPrice(item.displayAmount);setStatus('ready');onPrice({featureKey,sku:item.sku,displayAmount:item.displayAmount,owner});}).catch(error=>{if(!live)return;const issue=error&&typeof error==='object'?error as {status?:number;code?:string;message?:string}:{},statusCode=issue.status===401||issue.status===403?issue.status:issue.code==='ACCESS_DENIED'?403:['LOGIN_REQUIRED','SESSION_EXPIRED'].includes(issue.code||'')?401:0;setMessage(statusCode===403?'priceDenied':statusCode===401?'priceLogin':'priceFailed');setSdkMessage(!statusCode&&issue.code==='UNSUPPORTED_APP_VERSION'&&typeof issue.message==='string'&&issue.message.trim()&&issue.message!==issue.code?issue.message:'');setStatus('error');});
  return()=>{live=false;onPrice(null);};
 },[auth.isAuthenticated,owner,featureKey,onPrice,retry,scope]);
 const visibleStatus=statusScope===scope?status:'loading';
 if(visibleStatus==='ready')return <span>{price} <button type="button" style={{minHeight:44}} onClick={()=>{setStatus('loading');setPrice('');onPrice(null);setRetry(value=>value+1);}}>{copy.retry}</button></span>;
 const currentUrl=typeof window==='undefined'?null:new URL(window.location.href);
 if(currentUrl&&/^\/fortune-tea-house\/?$/.test(currentUrl.pathname))currentUrl.searchParams.set('restoreTeaDraft','1');
 const next=loginNext||(currentUrl?currentUrl.pathname+currentUrl.search:'/fortune-tea-house/');
 return <span role="status">{visibleStatus==='loading'?copy.priceChecking:visibleStatus==='error'?sdkMessage||copy[message]:copy.priceUnavailable}{visibleStatus==='error'&&message==='priceLogin'?<a href={'/login/?next='+encodeURIComponent(next)}>{copy.login}</a>:visibleStatus!=='loading'&&<button type="button" style={{minHeight:44}} onClick={()=>setRetry(value=>value+1)}>{copy.retry}</button>}</span>;
}
