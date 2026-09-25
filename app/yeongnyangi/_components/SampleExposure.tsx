'use client';

import {useEffect} from 'react';
import {trackEvent} from '@/lib/analytics';

/** Observe the sample heading, not the tall section: it must work at 360px too.
 * page_view already measures the landing; do not create a second landing event.
 * Never read URL parameters, consultation input or account data here.
 */
export default function SampleExposure({targetId,itemId}:{targetId:string;itemId:string}){
 useEffect(()=>{
  const target=document.getElementById(targetId)?.querySelector('h2');
  if(!target||!('IntersectionObserver' in window))return;
  let sent=false;
  const observer=new IntersectionObserver(entries=>{
   if(sent||!entries.some(entry=>entry.isIntersecting))return;
   sent=true;
   trackEvent('sample_view',{service:'yeongnyangi',item_id:itemId,sample_type:'editorial',content_id:'mackerel-question-v1',locale:'ko'});
   observer.disconnect();
  });
  observer.observe(target);
  return ()=>observer.disconnect();
 },[targetId,itemId]);
 return null;
}
