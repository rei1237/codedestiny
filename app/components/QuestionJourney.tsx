'use client';
import {useEffect,useRef,useState} from 'react';
import {trackEvent} from '@/lib/analytics';
import {getQuestionGuide,questionGuides,concernGuides,concernGroups,filterConcerns,anythingConsultationHref,questionScopeEntry,questionCheckoutHref,questionGuideHref,QUESTION_VERSION,freeQuestionMap,type QuestionGuide} from '@/lib/fortune/question-journey';
import {FOLLOWUP_LIMITS} from '@/worker/yeongnyangi/fortune/ask/question-policy';
import styles from './QuestionJourney.module.css';

function record(event:string,source:string,q?:QuestionGuide){trackEvent(event,{surface:source,topic_id:q?.topic||'general',question_id:q?.id||'all',item_id:q?questionScopeEntry(q).product.cdFeatureKey:undefined,content_type:'editorial',content_version:QUESTION_VERSION});}
function Exposure({event,source,q}:{event:string;source:string;q?:QuestionGuide}){
 const ref=useRef<HTMLSpanElement>(null);
 useEffect(()=>{const el=ref.current;if(!el||typeof IntersectionObserver==='undefined')return;const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){record(event,source,q);observer.disconnect();}},{threshold:0.5});observer.observe(el);return()=>observer.disconnect();},[event,source,q]);
 return <span ref={ref} aria-hidden="true" style={{display:'block',height:1}}/>;
}
export function QuestionOffer({q,source}:{q:QuestionGuide;source:string}){
 const {product,plan}=questionScopeEntry(q);
 return <section className={styles.offer} aria-label="선택한 질문의 상담 안내">
  <h3>{q.question}</h3><Exposure key={q.id} event="question_offer_view" source={source} q={q}/>
  <p className={styles.offerLead}>{q.next} 입력한 상황과 계산 근거를 바탕으로 질문의 답과 다음 행동을 정리해요.</p>
  <h4>이 질문에서 살펴볼 범위</h4><p>{plan.reason}</p>
  <p className={styles.price}><strong>{product.priceKRW.toLocaleString('ko-KR')}원</strong><span>{product.name} · 기본 상담 + 추가 질문 {FOLLOWUP_LIMITS[plan.fish]}회</span></p>
  <p className={styles.note}>질문의 대상과 살펴볼 기간을 바꾸면 범위와 가격도 달라질 수 있어요. 다음 화면에서 확인해 주세요.</p>
  <p className={styles.note}>로그인 후 이용권·월정석 적용 여부와 단건 결제 총액을 확인해요. 생성 중인 상담과 저장된 결과는 내 상담 기록에서 다시 확인할 수 있어요.</p>
  <a className={styles.primary} href={questionCheckoutHref(q)} onClick={()=>record('question_offer_click',source,q)}>이 질문으로 상담 준비하기</a>
  <a className={styles.library} href="/yeongnyangi/library/">이미 구매했다면 내 상담 기록 보기</a>
 </section>;
}
export default function QuestionJourney({source='home'}:{source?:string}){
 const [selected,setSelected]=useState<QuestionGuide>();
 const [search,setSearch]=useState(''),[group,setGroup]=useState('전체'),[limit,setLimit]=useState(12);
 const matches=filterConcerns(search,group);
 useEffect(()=>{const q=getQuestionGuide(new URLSearchParams(window.location.search).get('question'));if(q){setSelected(q);record('question_select',source,q);}},[source]);
 function choose(q:QuestionGuide){setSelected(q);record('question_select',source,q);}
 const buttons=(rows:QuestionGuide[])=>rows.map(q=><button type="button" key={q.id} aria-pressed={selected?.id===q.id} aria-controls="question-reading" onClick={()=>choose(q)}><small>{q.group}</small>{q.question}</button>);
 return <section id="questions" className={styles.journey} aria-label="고민으로 시작하기">
  <div className={styles.intro}><div><h2>지금 마음에 걸리는 질문은?</h2><p>가까운 질문을 고르거나 직접 적어주세요. 상담에서 다룰 범위와 가격을 먼저 확인해요.</p></div><img className={styles.mascot} src="/assets/yeongnyangi/original/hero-480.webp" srcSet="/assets/yeongnyangi/original/hero-480.webp 480w, /assets/yeongnyangi/original/hero-800.webp 800w" sizes="(max-width: 560px) 112px, 176px" width="800" height="800" alt="달빛 모자를 쓰고 상담을 기다리는 흰 고양이 영냥이" loading="lazy" decoding="async"/></div>
  <Exposure event="question_topics_view" source={source}/>
  <a className={styles.primary} href="/yeongnyangi/fortune/">내 고민 직접 적기</a>
  <div className={styles.choices}>{buttons(questionGuides)}</div>
  <details><summary>다른 고민 더 찾아보기 · {concernGuides.length}가지 질문</summary>
   <div className={styles.finder}>
    <label htmlFor="concern-search">어떤 고민이 마음에 남아 있나요?</label>
    <input id="concern-search" type="search" value={search} placeholder="이직, 연락, 가족처럼 떠오르는 말로 찾아보세요" onChange={e=>{setSearch(e.target.value);setLimit(12);}}/>
    <label htmlFor="concern-group">고민 분야</label>
    <select id="concern-group" value={group} onChange={e=>{setGroup(e.target.value);setLimit(12);}}>{['전체',...concernGroups].map(g=><option key={g}>{g}</option>)}</select>
    <p role="status">{matches.length}개의 고민{selected?` · 선택: ${selected.question}`:''}</p>
    {selected&&<a href="#question-reading">선택한 고민의 상담 구성 확인하기</a>}
    {matches.length?<div className={styles.results}>{buttons(matches.slice(0,limit))}</div>:<p>같은 표현의 고민이 아직 없어요. 검색어를 줄이거나 아래에서 직접 질문해 주세요.</p>}
    {matches.length>limit&&<button className={styles.more} type="button" onClick={()=>setLimit(limit+12)}>고민 12개 더 보기 ({Math.min(limit,matches.length)}/{matches.length})</button>}
    <a href={anythingConsultationHref}>영냥이에게 무엇이든 상담하기</a>
    <p>내 고민은 다음 화면에서 직접 적을 수 있어요. 상담 구성과 결제 조건도 먼저 확인해요.</p>
   </div>
  </details>
  <div id="question-reading" aria-live="polite">{selected&&<QuestionOffer key={selected.id} q={selected} source={source}/>}</div>
  <nav className={styles.explore} aria-label="다른 상담 탐색"><a href="/yeongnyangi/fortune/">내 고민 직접 적기</a><a href="/ggulggul/">꿀꿀운세 홈</a></nav>
 </section>;
}
export function FreeQuestionNext({category,source}:{category:string;source:string}){
 const q=getQuestionGuide(freeQuestionMap[category]);
 return <aside className={styles.journey} aria-label="무료 결과 다음 질문">{q?<><h2>읽고 나니, 이런 점도 궁금한가요?</h2><p>방금 본 결과의 분야에서 이어 생각해 볼 질문이에요. 아래 질문이 지금의 고민과 맞을 때 선택해 주세요.</p><a href={questionGuideHref(q.id)} onClick={()=>record('free_question_click',source,q)}>{q.question} — 무료 해설 읽기</a><Exposure event="free_question_view" source={source} q={q}/></>:<><h2>오늘 읽은 이야기, 내 하루에 남겨볼까요?</h2><p>기억하고 싶은 문장과 오늘 해볼 행동 하나를 정리해 보세요.</p><a href="/diary/">무료 운세 다이어리 열기</a></>}</aside>;
}
