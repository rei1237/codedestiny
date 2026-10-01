'use client';

import Image from 'next/image';
import type {ReactNode} from 'react';
import HoneyPassArtwork from '@/components/yeon/HoneyPassArtwork';
import type {LoadingLocale} from '@/constants/loadingMessages';
import type {OwnedServicePack} from './service-pack-client';
import {packText,servicePackCopy} from './service-pack-copy';
import {APPLIED_STAMP_IMAGES,SERVICE_PACK_IMAGES} from './service-pack-images';

// 🔴 표시 전용. 꽃돼지 달빛 이용권과 영냥이 전용 이용권은 따로 보유·적용되며, 상담 한 건의 차감 수단 판정은 서버(funding claim)가 한다.
const tile='moon-plan-card relative flex min-w-0 items-center gap-3 rounded-[20px] p-4';
const appliedLine='mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold text-[color:var(--moon-teal)]';
const dot=<span className="h-2 w-2 rounded-full bg-[color:var(--moon-teal)] shadow-[0_0_12px_rgba(94,234,212,0.76)]" aria-hidden="true"/>;
const date=(value:string,locale:LoadingLocale)=>new Intl.DateTimeFormat(locale,{dateStyle:'medium'}).format(new Date(value));

export type PackWalletView=OwnedServicePack[]|'loading'|'error';
export const usablePacks=(packs:PackWalletView)=>(Array.isArray(packs)?packs:[]).filter(pack=>pack.available&&pack.remainingUses>0);

function Stamped({src,stamp,children}:{src?:string;stamp:string;children?:ReactNode}){
 return <div className="relative h-16 w-16 flex-shrink-0">
  {children||(src&&<Image src={src} alt="" width={240} height={240} sizes="64px" className="h-full w-full object-contain"/>)}
  <Image src={stamp} alt="" width={120} height={120} sizes="40px" data-applied-stamp className="absolute -bottom-2 -right-2 h-10 w-10 object-contain drop-shadow-[0_3px_6px_rgba(3,4,18,0.45)]"/>
 </div>;
}

export function OwnedPassesSummary({locale,flower,packs}:{locale:LoadingLocale;flower:{active:boolean;tier:string;tierLabel:string;expiresAt?:string|null};packs:PackWalletView}){
 const copy=servicePackCopy(locale),usable=usablePacks(packs);
 const first=[...usable].sort((a,b)=>Date.parse(a.expiresAt)-Date.parse(b.expiresAt))[0];
 return <section className="moon-card rounded-[24px] p-5 sm:p-6" aria-labelledby="owned-passes-title" data-owned-passes>
  <h2 id="owned-passes-title" className="text-lg font-black text-white">{copy.passesTitle}</h2>
  <div className="mt-3 grid gap-3 sm:grid-cols-2">
   <div className={tile} data-owned-pass="flower" data-applied={flower.active?'true':'false'}>
    {flower.active?<Stamped stamp={APPLIED_STAMP_IMAGES.flower}><HoneyPassArtwork tier={flower.tier} className="h-16 w-16" sizes="64px"/></Stamped>:<HoneyPassArtwork tier="standard" className="h-16 w-16 opacity-45 grayscale" sizes="64px"/>}
    <div className="min-w-0">
     <p className="text-xs font-black text-[color:var(--moon-mist)]">{copy.flowerPass}</p>
     {flower.active?<>
      <h3 className="mt-0.5 text-base font-black leading-snug text-white">{flower.tierLabel}</h3>
      <p className={appliedLine}>{dot}<span>{copy.applied}</span>{flower.expiresAt&&Number.isFinite(Date.parse(flower.expiresAt))&&<span className="text-[color:var(--moon-mist)]">{packText(copy.expires,{date:date(flower.expiresAt,locale)})}</span>}</p>
     </>:<>
      <p className="mt-0.5 text-sm font-bold text-[color:var(--moon-silver)]">{copy.flowerNone}</p>
      <a href="#moonlight-plans" className="mt-1 inline-flex min-h-11 items-center text-sm font-black text-[color:var(--moon-glow)]">{copy.flowerBrowse} →</a>
     </>}
    </div>
   </div>
   <div className={tile} data-owned-pass="yeongnyangi" data-applied={first?'true':'false'}>
    {first?<Stamped src={SERVICE_PACK_IMAGES[first.fishId]} stamp={APPLIED_STAMP_IMAGES.yeongnyangi}/>:<Image src={SERVICE_PACK_IMAGES.mackerel} alt="" width={240} height={240} sizes="64px" className="h-16 w-16 flex-shrink-0 object-contain opacity-45 grayscale"/>}
    <div className="min-w-0">
     <p className="text-xs font-black text-[color:var(--moon-mist)]">{copy.packPass}</p>
     {first?<>
      <h3 className="mt-0.5 text-base font-black leading-snug text-white">{first.label}</h3>
      <p className={appliedLine}>{dot}<span>{copy.applied}</span></p>
      <p className="mt-0.5 text-xs font-bold text-[color:var(--moon-mist)] [word-break:keep-all]"><span className="whitespace-nowrap text-[color:var(--moon-teal)]">{packText(copy.remaining,{total:first.totalUses,remaining:first.remainingUses})}</span> · <span className="whitespace-nowrap">{packText(copy.expires,{date:date(first.expiresAt,locale)})}</span>{usable.length>1&&<> · <span className="whitespace-nowrap">{packText(copy.packOthers,{count:usable.length-1})}</span></>}</p>
     </>:packs==='loading'?<p role="status" className="mt-0.5 text-sm text-[color:var(--moon-mist)]">{copy.loading}</p>:packs==='error'?<>
      <p className="mt-0.5 text-sm font-bold text-[color:var(--moon-silver)]">{copy.unavailable}</p>
      <a href="#fish-packs" className="mt-1 inline-flex min-h-11 items-center text-sm font-black text-[color:var(--moon-glow)]">{copy.packBrowse} →</a>
     </>:<>
      <p className="mt-0.5 text-sm font-bold text-[color:var(--moon-silver)]">{copy.packNone}</p>
      <a href="#fish-packs" className="mt-1 inline-flex min-h-11 items-center text-sm font-black text-[color:var(--moon-glow)]">{copy.packBrowse} →</a>
     </>}
    </div>
   </div>
  </div>
  {flower.active&&first&&<p className="mt-3 text-[13px] font-bold leading-relaxed text-[color:var(--moon-silver)] [word-break:keep-all]" data-owned-passes-both>{copy.bothApplied}</p>}
 </section>;
}
