'use client';
import {renderCraftedDetail} from '@/js/feature-detail-panels.mjs';
import styles from './crafted-product-detail.module.css';

type Detail = Parameters<typeof renderCraftedDetail>[0];

/** Authored artwork and its full text share the same display-only manifest. */
export default function CraftedProductDetail({detail}:{detail:Detail}) {
 return <div className={styles.detail} onErrorCapture={event=>{
  if(event.target instanceof HTMLImageElement){
   const transcript=event.currentTarget.querySelector<HTMLDetailsElement>('.craftedDetailTranscript');
   if(transcript)transcript.open=true;
  }
 }} dangerouslySetInnerHTML={{__html:renderCraftedDetail(detail)}}/>;
}
