// Development-only entry, never imported by the production bundle.
import React from 'react';
import {createRoot} from 'react-dom/client';
import ResultEvidence,{type ReadingChart} from '../ResultEvidence';
import '../style.css';
import '../yehwa-motifs.generated.css';
import '../moonlight.css';
const charts:ReadingChart[]=['saju','astrology','ziwei','vedic','sukuyo','tarot'].map(domain=>({
 domain,title:`${domain} · 모의 저장 데이터`,source:'실제 사용자 정보가 아닌 화면 검수용 데이터',limitations:['출생 시각이 없으면 일부 항목을 확인할 수 없어요.'],
 ...(domain==='astrology'?{cusps:[0,30,60,90,120,150,180,210,240,270,300,330]}:{}),
 groups:Array.from({length:domain==='ziwei'?12:4},(_,index)=>({id:`part-${index}`,label:`근거 ${index+1}`,items:[{label:'저장값',value:`검수용 항목 ${index+1}`},{label:'확인 범위',value:'원본에 없는 정보는 추정하지 않아요.'}],
 ...(domain==='astrology'?{longitude:index*80}:{}),...(domain==='ziwei'?{ziwei:{stars:[{name:'천기',hanja:'天機',kind:'main',grade:null}],notes:['저장된 명반 설명']}}:{})})),
}));
createRoot(document.getElementById('root')!).render(<main><h1>모의 결과 화면 검수</h1><ResultEvidence charts={charts}/></main>);
