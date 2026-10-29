import React,{lazy,Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import {TDSMobileAITProvider} from '@toss/tds-mobile-ait';
const App=lazy(()=>import('./AppEntry'));
const ServiceScreens=lazy(()=>import('../service/Screens.jsx'));
const originalScreen=/^\/(yeongnyangi\/(fortune|result|library)|login|checkout)\/?$/.test(location.pathname);
createRoot(document.getElementById('root')!).render(<React.StrictMode><TDSMobileAITProvider brandPrimaryColor="#7054B3" fontScaleAvailable><Suspense fallback={<p role="status">상담실을 불러오고 있어요.</p>}>{originalScreen?<ServiceScreens/>:<App/>}</Suspense></TDSMobileAITProvider></React.StrictMode>);
