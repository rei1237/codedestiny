// Development-only visual fixture. No real account, API, LLM or purchase is used.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {TDSMobileAITProvider} from '@toss/tds-mobile-ait';
import DailyReadings from '../DailyReadings';
import {Button} from '../Button';
import '../style.css';
import '../yehwa-motifs.generated.css';
import '../moonlight.css';
const stored={category:'basic',day:'2026-10-29',title:'오늘의 기본 운세',kind:'calculated',summary:'익숙한 능력을 차분히 정리하고, 오늘 마칠 수 있는 일 하나에 집중해 보세요.',paragraphs:['이 내용은 화면 구성을 점검하기 위한 모의 원문이에요. 실제 계산 결과나 상담이 아니에요.','생각이 여러 방향으로 뻗어갈 때는 해야 할 일을 작은 순서로 나누어 보세요. 선택의 기준이 분명해지면 마음의 여유를 찾는 데 도움이 됩니다.'],basis:[{label:'오늘의 확인 기준',value:'모의 근거 · 실제 명식 아님'}],limitations:['화면 검수용 가상 데이터이며 저장하거나 결제하지 않습니다.']};
let scenario='locked';
const request=async<T,>(path:string):Promise<T>=>{
  if(path==='/daily/status')return {day:'2026-10-29',balance:4,unlockCost:3,attended:false,unlocked:scenario!=='locked'} as T;
  if(path==='/daily/attendance')return {day:'2026-10-29',balance:5,unlockCost:3,attended:true,unlocked:false} as T;
  if(path==='/daily/unlock'){scenario='form';return {day:'2026-10-29',balance:2,unlockCost:3,attended:true,unlocked:true} as T;}
  if(path.startsWith('/daily/reading?'))return {result:scenario==='result'?stored:null} as T;
  if(path==='/daily/reading')return stored as T;
  throw new Error('Fixture request not declared');
};
function Preview(){const [mode,setMode]=useState('locked');scenario=mode;return <main className="page-daily adviser-yeongnyangi"><p className="preview-note">모의 화면 검수 · 실제 로그인·결제·상담 아님</p><nav className="menu" aria-label="모의 상태 선택">{[['locked','출석 화면'],['form','입력 화면'],['result','저장 결과']].map(([id,label])=><Button key={id} variant="weak" onClick={()=>setMode(id)}>{label}</Button>)}</nav><DailyReadings key={mode} loggedIn request={request} onLogin={()=>{}} onError={error=>{throw error;}}/></main>;}
if(import.meta.env.DEV)createRoot(document.getElementById('root')!).render(<TDSMobileAITProvider brandPrimaryColor="#7054B3"><Preview/></TDSMobileAITProvider>);
