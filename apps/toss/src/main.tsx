import React,{lazy,Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import {TDSMobileAITProvider} from '@toss/tds-mobile-ait';
const App=lazy(()=>import('./AppEntry'));
const ServiceScreens=lazy(()=>import('../service/Screens.jsx'));
const originalScreen=/^\/(yeongnyangi\/(fortune|result|library)|love-secret-ai(?:\/result)?|relationship-boundary-test|life-book-ai(?:\/result)?|astrology-ai(?:\/result)?|vedic-ai|ziwei-ai|new-year-ai-consultation|karma-destiny-ai(?:\/result)?|sukuyo-compatibility-ai|fusion-fortune|fortune-tea-house|omikuji|saju-fpti(?:\/result)?|fpti(?:\/result)?|psychotest(?:\/[a-z0-9-]+)?|maya|neo-operation-room(?:\/(?:result|strategy-books))?|records|login|checkout)\/?$/.test(location.pathname);
createRoot(document.getElementById('root')!).render(<React.StrictMode><TDSMobileAITProvider brandPrimaryColor="#7054B3" fontScaleAvailable><Suspense fallback={<p role="status">상담실을 불러오고 있어요.</p>}>{originalScreen?<ServiceScreens/>:<App/>}</Suspense></TDSMobileAITProvider></React.StrictMode>);
