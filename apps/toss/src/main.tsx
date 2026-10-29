import React from 'react';
import {createRoot} from 'react-dom/client';
import {TDSMobileAITProvider} from '@toss/tds-mobile-ait';
import App from './App';
import './style.css';
import './yehwa-motifs.generated.css';
import './moonlight.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><TDSMobileAITProvider brandPrimaryColor="#7054B3" fontScaleAvailable><App/></TDSMobileAITProvider></React.StrictMode>);
