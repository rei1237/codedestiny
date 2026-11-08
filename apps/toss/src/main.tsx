import React,{lazy,Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import ReviewReceipt from './ReviewReceipt';
import {resolveReviewEntry} from './review-scope.mjs';
import {TDSMobileAITProvider} from '@toss/tds-mobile-ait';
const App=lazy(()=>import('./AppEntry'));
const ServiceScreens=lazy(()=>import('../service/Screens.jsx'));
const originalScreen=/^\/(yeongnyangi\/(fortune|result|library)|love-secret-ai(?:\/result)?|relationship-boundary-test|pet-saju|life-book-ai(?:\/result)?|astrology-ai(?:\/result)?|vedic-ai|ziwei-ai|new-year-ai-consultation|karma-destiny-ai(?:\/result)?|sukuyo-compatibility-ai|fusion-fortune|fortune-tea-house|omikuji|saju-fpti(?:\/result)?|fpti(?:\/result)?|psychotest(?:\/[a-z0-9-]+)?|maya|neo-operation-room(?:\/(?:result|strategy-books))?|records|login|checkout)\/?$/.test(location.pathname);
const legacyPreview=import.meta.env.DEV && import.meta.env.MODE==='toss-offline' && import.meta.env.VITE_TOSS_LEGACY_PREVIEW==='1';
function reviewEntry(){
  const route=resolveReviewEntry(location.pathname,location.search,originalScreen);
  if(!legacyPreview&&route.redirect){location.replace(route.redirect);return null;}
  const verifiedReceipt=!legacyPreview&&route.receipt===true;
  const screen=originalScreen?<ServiceScreens reviewOnly={!legacyPreview} verifiedReceipt={verifiedReceipt}/>:<App reviewOnly={!legacyPreview} verifiedReceipt={verifiedReceipt}/>;
  return verifiedReceipt?<ReviewReceipt href={location.pathname+location.search}>{screen}</ReviewReceipt>:screen;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><TDSMobileAITProvider brandPrimaryColor="#7054B3" fontScaleAvailable><Suspense fallback={<p role="status">상담실을 불러오고 있어요.</p>}>{reviewEntry()}</Suspense></TDSMobileAITProvider></React.StrictMode>);
