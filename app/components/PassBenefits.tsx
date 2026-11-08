import Script from 'next/script';
import {renderPassBenefits} from '@/lib/marketing/pass-benefits.mjs';
import '@/styles/pass-benefits.css';

export default function PassBenefits({kind,id}:{kind:'honey';id:string}) {
  return <>
    <div dangerouslySetInnerHTML={{__html:renderPassBenefits(kind, id, { host: 'yeongnyangi' })}}/>
    <Script src="/js/core/pass-duet.js" type="module" strategy="afterInteractive"/>
  </>;
}
