'use client';

import {useId,useRef,useState,type KeyboardEvent} from 'react';
import YeongnyangiExampleToon from './YeongnyangiExampleToon';
import SampleExposure from './SampleExposure';
import type {ExampleReading} from './yeongnyangi-examples';
import styles from './yeongnyangi-sample-menu.module.css';

function FishSeal(){
 return <svg aria-hidden="true" width="24" height="18" viewBox="0 0 28 20" fill="none">
  <path d="M2 10c5.2-6.7 13.2-7.7 19.5-1.1L26 5.5v9l-4.5-3.4C15.2 17.6 7.2 16.7 2 10Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
  <circle cx="8.1" cy="9.7" r="1" fill="currentColor"/><path d="M13 7c1.2 1.1 1.5 2.1 0 3.1M15.5 9c1.2 1.1 1.5 2.1 0 3.1" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
 </svg>;
}
export default function YeongnyangiSampleMenu({samples,tarotFeature}:{samples:ExampleReading[];tarotFeature:string}){
 const uid=useId(),[active,setActive]=useState(0),tabs=useRef<(HTMLButtonElement|null)[]>([]);
 const id=(which:'tab'|'panel',n:number)=>uid+'-'+which+'-'+n;
 function handleKey(event:KeyboardEvent<HTMLButtonElement>,current:number){
  const last=samples.length-1;
  const step=event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0;
  const next=event.key==='Home'?0:event.key==='End'?last:step?(current+step+samples.length)%samples.length:null;
  if(next===null)return;
  event.preventDefault(); setActive(next); tabs.current[next]?.focus();
 }
 return <div className={styles.market}>
  <div className={styles.counter}>
   <p><FishSeal/> 영냥이의 달빛 견본 진열대</p>
   <p>어떤 체계로 읽는지 골라 봐요. 생선 등급이나 구매를 고르는 곳은 아니에요.</p>
  </div>
  <div className={styles.tabs} role="tablist" aria-label="상담 예시 체계">
   {samples.map((sample,i)=><button key={sample.key} type="button" role="tab" ref={el=>{tabs.current[i]=el;}}
    id={id('tab',i)} aria-controls={id('panel',i)} aria-selected={i===active} tabIndex={i===active?0:-1}
    onClick={()=>setActive(i)} onKeyDown={event=>handleKey(event,i)}>
    <FishSeal/><span><strong>{sample.label}</strong><small>{sample.theme}</small></span><span aria-hidden="true" className={styles.index}>{String(i+1).padStart(2,'0')}</span>
   </button>)}
  </div>
  {samples.map((sample,i)=><div key={sample.key} id={id('panel',i)} role="tabpanel" aria-labelledby={id('tab',i)} hidden={i!==active} tabIndex={0} className={styles.panel}>
    <header className={styles.edition}>
     <span>{sample.kind==='result'?'공개 결과 발췌':'상담 구성 예시'}</span>
     <h3 data-sample-exposure="">{sample.label} 상담 미리 보기</h3>
     <p>{sample.key==='tarot'?'가상 프로필로 생성한 타로·연어 샘플(전체 약 3.5만 자)의 일부예요. 실제 고객 후기나 보장 분량이 아니에요.'
      :sample.kind==='result'?'공개된 상담 결과의 일부예요. 삽화는 풀이의 분위기를 보여주며, 실제 고객 후기가 아니에요.'
      :'실제 결과 발췌가 아니라, 이런 질문을 어떤 순서로 살펴보는지 보여주는 예시예요.'}</p>
    </header>
   {i===active&&<>
    {sample.key==='tarot'&&sample.kind==='result'?<YeongnyangiExampleToon {...sample}/>:
     <div className={styles.reading}>
      <p className={styles.ask}><small>이런 질문을 남겼어요</small>“{sample.question}”</p>
      <img src={sample.visual} width={960} height={640} alt={sample.visualAlt} loading="lazy" decoding="async"/>
      <p className={styles.receives}>{sample.receives}</p>
      {sample.kind==='result'?<ol className={styles.facts}>{sample.excerpts.map((excerpt,n)=><li key={excerpt}><h4>{n===0?'영냥이의 첫 해석':'이어서 읽는 해석'}</h4><p>{excerpt}</p></li>)}</ol>
      :<><ol className={styles.facts}>{sample.outline.map(part=><li key={part.title}><h4>{part.title}</h4><p>{part.text}</p></li>)}</ol><aside className={styles.editorial}><h4>{sample.example.title}</h4><p>{sample.example.text}</p></aside></>}
     </div>}
    <div className={styles.foot}><a href={sample.href}>{sample.label} 상담 시작하기 <span aria-hidden="true">→</span></a><a href="/consultation-samples/">전체 상담 예시 보기</a></div>
   </>}
  </div>)}
  <SampleExposure targetId={id('panel',0)} itemId={tarotFeature} contentId="tarot-salmon-question-v1"/>
 </div>;
}
