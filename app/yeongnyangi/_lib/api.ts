import {authFetch} from '@/app/_lib/auth-client';
import type {Product} from '@/worker/yeongnyangi/payments/catalog';
import type {ChapterSpec,ChapterBody} from '@/worker/yeongnyangi/fortune/book-contracts';
import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
export type FortuneRecovery={requestId:string;savedChapters:number;totalChapters:number;providerNeeded:boolean;retryable:boolean;canRetryNow:boolean;nextAction:'reread'|'wait'|'retry'|'support'|'held';autoResume:boolean};
export type FortuneRecord={locale?:ReadingLocale;charts?:import('@/worker/yeongnyangi/fortune/reading-presentation').ReadingChart[];id:string;profileId:string;productId:string;state:string;paid:boolean;accessMethod?:'DIRECT_KRW'|'FAMILY';product:Product;manifest:ChapterSpec[];chapters:ChapterBody[];consultation?:Partial<import('@/worker/yeongnyangi/fortune/consultation').Consultation>;recovery?:FortuneRecovery;errorCode?:string;createdAt:string;completedAt?:string};
export type FortuneSummary=Pick<FortuneRecord,'id'|'product'|'state'|'paid'|'createdAt'|'locale'> & {completedChapters:number;totalChapters?:number;recovering?:boolean;consultationKind?:string;kindLabel?:string};
export type FortunePage={fortunes:FortuneSummary[];nextCursor:string|null};
export class FortuneApiError extends Error {
 constructor(public code:string,message:string,public status:number,public retryable=false,public retryAfterSeconds=0){super(message);}
}
export async function fortuneApi<T>(path:string,body?:object,options:{signal?:AbortSignal;timeoutMs?:number}={}):Promise<T> {
 const controller=new AbortController();
 const abort=()=>controller.abort(options.signal?.reason);
 if(options.signal?.aborted)abort();else options.signal?.addEventListener('abort',abort,{once:true});
 let expired=false;
 const timer=setTimeout(()=>{expired=true;controller.abort();},options.timeoutMs??(body?100000:25000));
 let rejectAbort:()=>void=()=>{};
 const cancelled=new Promise<never>((_,reject)=>{
  rejectAbort=()=>reject(expired?new FortuneApiError('REQUEST_TIMEOUT','응답이 늦어지고 있어요. 같은 상담에서 다시 확인해 주세요.',504,true):new DOMException('Request cancelled','AbortError'));
  controller.signal.addEventListener('abort',rejectAbort,{once:true});
  if(controller.signal.aborted)rejectAbort();
 });
 try{return await Promise.race([read(),cancelled]);}
 finally{clearTimeout(timer);options.signal?.removeEventListener('abort',abort);controller.signal.removeEventListener('abort',rejectAbort);}
 async function read():Promise<T>{
 const response=await authFetch(`/api/yeongnyangi/${path}`,{cache:'no-store',signal:controller.signal,...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
 const payload=await response.json();
 if(!response.ok){
  const code=payload.error?.code||payload.code||'REQUEST_FAILED';
  const message=['DATABASE_TEMPORARILY_UNAVAILABLE','DATABASE_CONFIG_INVALID','SERVICE_UNAVAILABLE'].includes(code)?'영냥이 서버에 잠시 연결하지 못했어요. 결제한 상담은 그대로 있어요. 잠시 후 다시 불러와 주세요.':payload.message||payload.error?.message||'상담을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.';
  throw new FortuneApiError(code,message,response.status,payload.retryable??[429,502,503,504].includes(response.status),Math.min(60,Math.max(0,Number(response.headers.get('Retry-After')||payload.retryAfterSeconds)||0)));
 }
 return payload;
 }
}
export function loginForCurrentPage(){
 const next=encodeURIComponent(window.location.pathname+window.location.search);
 window.location.assign(`/login/?next=${next}&returnTo=${next}`);
}
export function resultPath(id:string,locale?:ReadingLocale){return `/yeongnyangi/result/?id=${encodeURIComponent(id)}${locale?`&lang=${locale}`:''}`;}
export function checkoutPath(row:FortuneRecord){
 return `/checkout/?featureKey=${encodeURIComponent(row.product.cdFeatureKey)}&requestId=${row.id}${row.locale?`&lang=${row.locale}`:''}&returnTo=${encodeURIComponent(resultPath(row.id,row.locale))}`;
}
