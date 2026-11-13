import React,{lazy,Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import ReviewReceipt from './ReviewReceipt';
import {consultationInputNotice} from '../../../lib/fortune/toss-consultation-safety.mjs';
import {requiresOwnedReceipt} from './review-scope.mjs';
import {TDSMobileAITProvider} from '@toss/tds-mobile-ait';
const App=lazy(()=>import('./AppEntry'));
const ServiceScreens=lazy(()=>import('../service/Screens.jsx'));
const originalScreen=(/^\/heukwol\/?$/.test(location.pathname)&&['consult','result'].some(key=>new URLSearchParams(location.search).has(key)))||/^\/(animal\/physio|past-life-face|master-love-codex(?:\/result)?|naming-ai(?:\/result)?|animal-totem(?:\/totem-(?:basic|deep))?|geomancy|dream\/psycho|saju\/(?:career-style|destiny-meeting-place|sibyl|compatibility|love-simulation)|yeongnyangi\/(fortune|result|library)|love-secret-ai(?:\/result)?|relationship-boundary-test|pet-saju|life-book-ai(?:\/result)?|astrology-ai(?:\/result)?|vedic-ai|ziwei-ai|new-year-ai-consultation|karma-destiny-ai(?:\/result)?|sukuyo-compatibility-ai|fusion-fortune|fortune-tea-house|omikuji|saju-fpti(?:\/result)?|fpti(?:\/result)?|psychotest(?:\/[a-z0-9-]+)?|maya|neo-operation-room(?:\/(?:result|strategy-books))?|records|login|checkout)\/?$/.test(location.pathname);
function serviceEntry(){
  const verifiedReceipt=requiresOwnedReceipt(location.pathname,location.search);
  const screen=originalScreen
    ? <ServiceScreens inputNotice={consultationInputNotice} verifiedReceipt={verifiedReceipt}/>
    : <App reviewOnly={false} verifiedReceipt={verifiedReceipt}/>;
  return verifiedReceipt?<ReviewReceipt href={location.pathname+location.search}>{screen}</ReviewReceipt>:screen;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><TDSMobileAITProvider brandPrimaryColor="#7054B3" fontScaleAvailable><Suspense fallback={<p role="status">상담실을 불러오고 있어요.</p>}>{serviceEntry()}</Suspense></TDSMobileAITProvider></React.StrictMode>);
