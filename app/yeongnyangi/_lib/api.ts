import {authFetch} from '@/app/_lib/auth-client';
import type {Product} from '@/worker/yeongnyangi/payments/catalog';
import type {ChapterSpec,ChapterBody} from '@/worker/yeongnyangi/fortune/book-contracts';
export type FortuneRecord={charts?:import('@/worker/yeongnyangi/fortune/reading-presentation').ReadingChart[];id:string;profileId:string;productId:string;state:string;paid:boolean;product:Product;manifest:ChapterSpec[];chapters:ChapterBody[];consultation?:Partial<import('@/worker/yeongnyangi/fortune/consultation').Consultation>;errorCode?:string;createdAt:string;completedAt?:string};
export class FortuneApiError extends Error {
 constructor(public code:string,message:string,public status:number){super(message);}
}
export async function fortuneApi<T>(path:string,body?:object):Promise<T> {
 const response=await authFetch(`/api/yeongnyangi/${path}`,{cache:'no-store',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})},{forceFresh:true});
 const payload=await response.json();
 if(!response.ok)throw new FortuneApiError(payload.code||payload.error?.code||'REQUEST_FAILED',payload.message||payload.error?.message||'상담을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',response.status);
 return payload;
}
export function loginForCurrentPage(){
 const next=encodeURIComponent(window.location.pathname+window.location.search);
 window.location.assign(`/login/?next=${next}&returnTo=${next}`);
}
export function resultPath(id:string){return `/yeongnyangi/result/?id=${encodeURIComponent(id)}`;}
export function checkoutPath(row:FortuneRecord){
 return `/checkout/?featureKey=${encodeURIComponent(row.product.cdFeatureKey)}&requestId=${row.id}&returnTo=${encodeURIComponent(resultPath(row.id))}`;
}
