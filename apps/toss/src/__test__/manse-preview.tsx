// Development-only fixture. All requests are explicit mocks with no real API fallback.
import {createRoot} from 'react-dom/client';
import {TDSMobileAITProvider} from '@toss/tds-mobile-ait';
import ManseReading from '../ManseReading';
import type {ManseResult} from '../ManseReading';
import '../style.css';
import '../yehwa-motifs.generated.css';
import '../moonlight.css';
const sample:ManseResult={stored:false,engineVersion:'mock-preview',limitations:['화면 검수용 가상 데이터예요. 실제 사주 계산 결과가 아니에요.'],pillars:[{key:'year',ganji:'丁丑',tenGod:'정인'},{key:'month',ganji:'壬寅',tenGod:'편재'},{key:'day',ganji:'戊寅',tenGod:'비견'},{key:'hour',ganji:null,tenGod:null}],elements:{wood:2,fire:1,earth:3,metal:0,water:1},elementBasis:'surface',cycles:[]};
const request=async<T,>(path:string):Promise<T>=>{if(path==='/manse/calculate')return sample as T;throw Error('Undeclared fixture request');};
if(import.meta.env.DEV)createRoot(document.getElementById('root')!).render(<TDSMobileAITProvider brandPrimaryColor="#914663"><main className="page-manse adviser-ggulggul"><p className="preview-note">모의 화면 검수 · 실제 계산·로그인·보관 아님</p><ManseReading loggedIn request={request} onLogin={()=>{}} onError={error=>{throw error;}}/></main></TDSMobileAITProvider>);
