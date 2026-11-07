import React from 'react';
export default function SavedRecordLink({source,id}){
 if(!id)return null;
 const target=source==='tea'?'/fortune-tea-house/?resultId='+encodeURIComponent(id):source==='neo'?'/neo-operation-room/result/?attemptId='+encodeURIComponent(id):'';
 if(!target)return null;
 const button='inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--cd-border)] px-5 py-2 text-sm text-[var(--cd-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4';
 return <nav aria-label="기록 보관함" className="my-6 flex flex-wrap justify-center gap-3"><a className={button} href={target}>결과 다시 보기</a><a className={button} href="/records/">기록 보관함</a></nav>;
}
