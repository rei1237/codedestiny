"use client";
import Image from 'next/image';
import {useEffect,useState} from 'react';
import {getCurrentLoadingLocale} from '@/constants/loadingMessages';
import {SERVICE_PACK_IMAGES} from '@/app/components/service-packs/service-pack-images';
import {servicePackCopy,packText} from '@/app/components/service-packs/service-pack-copy';
import type {OwnedServicePack} from '@/app/components/service-packs/service-pack-client';
import type {GiftView,GiftPackProduct} from './gift-client';

export function isServicePackGift(gift:GiftView|undefined):gift is GiftView&{product:GiftPackProduct}{return gift?.product.productType==='service_pack';}
export function usePackGiftCopy(){
 const [locale,setLocale]=useState(()=>getCurrentLoadingLocale());
 useEffect(()=>{const refresh=()=>setLocale(getCurrentLoadingLocale());window.addEventListener('cd:locale-ready',refresh);return()=>window.removeEventListener('cd:locale-ready',refresh);},[]);
 return {locale,copy:servicePackCopy(locale)};
}
export default function ServicePackGiftDetails({gift,owned}:{gift:GiftView;owned?:OwnedServicePack}){
 const {locale,copy}=usePackGiftCopy();if(!isServicePackGift(gift))return null;
 const product=gift.product,src=SERVICE_PACK_IMAGES[product.fishId];
 return <div className="service-pack-gift-detail">{src&&<Image src={src} width={240} height={240} sizes="240px" alt="" loading="lazy" style={{display:'block',width:'min(100%, 240px)',height:'auto',margin:'0 auto'}}/>}
 <p>{packText(copy.giftTotal,{total:product.totalUses})}</p>
 {owned?<><p>{packText(copy.remaining,{total:owned.totalUses,remaining:owned.remainingUses})}</p><p>{packText(copy.expires,{date:new Intl.DateTimeFormat(locale,{dateStyle:'medium'}).format(new Date(owned.expiresAt))})}</p></>:<p>{packText(copy.giftUsagePeriod,{days:product.validityDays})}</p>}
 </div>;
}
