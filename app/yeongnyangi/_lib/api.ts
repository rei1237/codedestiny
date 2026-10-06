import {trackEvent} from '@/lib/analytics';
import {authFetch} from '@/app/_lib/auth-client';
import {AI_LOCALE_HEADER} from '@/lib/i18n/ai-locale';
import type {Product} from '@/worker/yeongnyangi/payments/catalog';
import type {ChapterSpec,ChapterBody} from '@/worker/yeongnyangi/fortune/book-contracts';
import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
export type FortuneRecovery={refundPending?:boolean;requestId:string;savedChapters:number;totalChapters:number;providerNeeded:boolean;retryable:boolean;canRetryNow:boolean;nextAction:'reread'|'draw'|'wait'|'retry'|'support'|'held';autoResume:boolean};
export type FortuneFollowup={status:'available'|'submitted'|'unavailable'|string;used:boolean;suggestions:string[]};
export type FortuneRecord={conversation?:ReturnType<typeof import("@/worker/yeongnyangi/fortune/ask/conversation").conversationView>;correction?:{reason:string;appliedAt?:string};locale?:ReadingLocale;charts?:import('@/worker/yeongnyangi/fortune/reading-presentation').ReadingChart[];id:string;profileId:string;productId:string;state:string;paid:boolean;accessMethod?:'DIRECT_KRW'|'FAMILY';product:Product;manifest:ChapterSpec[];chapters:ChapterBody[];consultation?:Partial<import('@/worker/yeongnyangi/fortune/consultation').Consultation>;followup?:FortuneFollowup;recovery?:FortuneRecovery;errorCode?:string;createdAt:string;completedAt?:string;tarotSpread?:PublicTarotSpread};
export type TarotSpreadSlot={id:string;desktop:{col:number;row:number};mobile:{col:number;row:number};cross?:boolean;span?:number};
export type PublicTarotSpread={id:string;version:number;title:string;purpose:string;summary:string;cardCount:number;
 positions:{id:string;label:string;question:string;drawOrder:number;readOrder:number}[];
 layout:{kind:string;slots:TarotSpreadSlot[]};links:{ids:string[];relation:string;note:string}[];source?:string;deckSize:number;
 symmetry?:{a:string[];b:string[]};drawn:boolean;drawMethod?:'manual'|'auto';picks?:number[];inputs?:{period?:'week'|'month';options?:{a:string;b:string}}};
export type FortuneSummary=Pick<FortuneRecord,'id'|'state'|'paid'|'createdAt'|'locale'> & {product:Product|null;completedChapters:number;totalChapters?:number;recovering?:boolean;canRetry?:boolean;consultationKind?:string;kindLabel?:string;participants?:{self:string;partner:string}};
export type FortunePage={fortunes:FortuneSummary[];nextCursor:string|null};
export class FortuneApiError extends Error {
 constructor(public code:string,message:string,public status:number,public retryable=false,public retryAfterSeconds=0){super(message);}
}
export async function fortuneApi<T>(path:string,body?:object,options:{signal?:AbortSignal;timeoutMs?:number}={}):Promise<T> {
 const startedAt=Date.now();
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
 // authFetch aligns legacy body.locale with this header. The selected reading
 // language must explicitly override its default (the surrounding UI language).
 const outputLocale=path==='requests'&&body&&'locale' in body&&typeof body.locale==='string'?body.locale:null;
 const response=await authFetch(`/api/yeongnyangi/${path}`,{cache:'no-store',signal:controller.signal,...(body?{method:'POST',headers:{'Content-Type':'application/json',...(outputLocale?{[AI_LOCALE_HEADER]:outputLocale}:{})},body:JSON.stringify(path==='requests'?{...body,growthAttribution:typeof window!=='undefined'?window.cdReadGrowthAttribution?.():null}:body)}:{})});
 const payload=await response.json();
 const operation=path==='requests'?'prepare':/^requests\/[a-f0-9]{64}$/.test(path)?'read':/^requests\/[a-f0-9]{64}\/activate$/.test(path)?'activate':'';
 if(operation)trackEvent('fortune_response_time',{operation,duration_ms:Math.max(0,Date.now()-startedAt),http_status:response.status,observation:'browser_transport'});
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
// URL lang controls the surrounding UI; the persisted row locale controls the reading itself.
export function checkoutPath(row:FortuneRecord,siteLocale:ReadingLocale|undefined=row.locale){
 return `/checkout/?featureKey=${encodeURIComponent(row.product.cdFeatureKey)}&requestId=${row.id}${siteLocale?`&lang=${siteLocale}`:''}&returnTo=${encodeURIComponent(resultPath(row.id,siteLocale))}`;
}
