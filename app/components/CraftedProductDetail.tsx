'use client';
import {memo, useEffect, useRef} from 'react';
import {trackEvent} from '@/lib/analytics';
import {observeConsultationSamples} from '@/js/consultation-sample-exposure.mjs';
import {renderCraftedDetail} from '@/js/feature-detail-panels.mjs';
import {masterProfiles, masterAvatars} from '@/components/fortune/master-profiles';
import type {MasterProfileData} from '@/components/fortune/MasterProfile';
import '@/styles/consultation-editorial.css';
import styles from './crafted-product-detail.module.css';

type Detail = Parameters<typeof renderCraftedDetail>[0];

/** Authored artwork and its full text share the same display-only manifest.
 *  Always mounted inside a closed <details>, so no panel may claim eager/high fetch priority. */
function CraftedProductDetail({detail}:{detail:Detail}) {
 const root = useRef<HTMLDivElement>(null);
 useEffect(() => observeConsultationSamples(root.current, trackEvent), [detail]);
 const resolved = detail.layout === 'editorial' ? {...detail, masters: (detail.masters || []).map(key => {
  if (typeof key !== 'string') return key;
  const profile: MasterProfileData = masterProfiles[key as keyof typeof masterProfiles];
  if (!profile) return key;
  const row = (label: string) => profile.dossier?.find(item => item.label === label)?.text;
  return {key, name:profile.name, role:detail.masterRoles?.[key] || profile.role, signature:detail.masterIntroductions?.[key] || profile.signature || profile.description,
   part:detail.masterRoles?.[key] || row('이 상담에서 맡는 부분') || profile.approach,
   basis:detail.masterBasis?.[key] || row('읽는 근거') || profile.approach,
   avatar:masterAvatars[key as keyof typeof masterAvatars]};
 })} : detail;
 return <div ref={root} className={styles.detail} onErrorCapture={event=>{
  if(event.target instanceof HTMLImageElement){
   const transcript=event.currentTarget.querySelector<HTMLDetailsElement>('.craftedDetailTranscript');
   if(transcript)transcript.open=true;
  }
 }} dangerouslySetInnerHTML={{__html:renderCraftedDetail(resolved,{eager:false})}}/>;
}

// Scrolling the intake updates its state; preserve the authored DOM and open transcript.
export default memo(CraftedProductDetail);
