'use client';
import {useEffect,useRef,useState} from 'react';
import {trackEvent} from '@/lib/analytics';
import {getQuestionGuide,questionGuides,questionOffer,questionCheckoutHref,questionGuideHref,QUESTION_VERSION,freeQuestionMap,type QuestionGuide} from '@/lib/fortune/question-journey';
import styles from './QuestionJourney.module.css';

function record(event:string,source:string,q?:QuestionGuide){trackEvent(event,{surface:source,topic_id:q?.topic||'general',question_id:q?.id||'all',item_id:q?questionOffer(q).product.cdFeatureKey:undefined,content_type:'editorial',content_version:QUESTION_VERSION});}
function Exposure({event,source,q}:{event:string;source:string;q?:QuestionGuide}){
 const ref=useRef<HTMLSpanElement>(null);
 useEffect(()=>{const el=ref.current;if(!el||typeof IntersectionObserver==='undefined')return;const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){record(event,source,q);observer.disconnect();}},{threshold:0.5});observer.observe(el);return()=>observer.disconnect();},[event,source,q]);
 return <span ref={ref} aria-hidden="true" style={{display:'block',height:1}}/>;
}
export function QuestionOffer({q,source}:{q:QuestionGuide;source:string}){
 const {product,kind,chapters}=questionOffer(q);
 return <section className={styles.reading} aria-label="관련 상담 안내">
  <h3>{q.next}</h3><Exposure key={q.id} event="question_offer_view" source={source} q={q}/>
  <p>무료 해설은 질문을 정리하는 출발점이에요. 유료 상담에서는 {kind.partner?'두 사람의 프로필':product.domain==='tarot'?'입력한 질문과 카드의 상징':'나의 출생정보와 계산 근거'}을 바탕으로 다음 분석을 제공해요: {kind.description}.</p>
  <ul>{chapters.slice(0,3).map(ch=><li key={ch.id}>{ch.title}</li>)}</ul>
  <p><strong>{product.priceKRW.toLocaleString('ko-KR')}원 · {chapters.length}개 챕터</strong><br/>{product.name} · {kind.label} · {product.fishName}</p>
  <p className={styles.label}>로그인 후 Family 이용권 적용 여부 또는 단건 결제를 확인해요. 생성 시간은 상담 분량과 대기 상태에 따라 달라지며, 진행 상황과 저장된 결과는 내 상담 기록에서 확인해요.</p>
  <a className={styles.primary} href={questionCheckoutHref(q)} onClick={()=>record('question_offer_click',source,q)}>이 질문의 상담 구성 확인하기</a>
  <a href="/yeongnyangi/library/">이미 구매했다면 내 상담 기록 보기</a>
 </section>;
}
export default function QuestionJourney({source='home'}:{source?:string}){
 const [selected,setSelected]=useState<QuestionGuide>();
 useEffect(()=>{const q=getQuestionGuide(new URLSearchParams(window.location.search).get('question'));if(q){setSelected(q);record('free_guide_start',source,q);}},[source]);
 function choose(q:QuestionGuide){setSelected(q);record('question_select',source,q);record('free_guide_start',source,q);}
 const buttons=(rows:QuestionGuide[])=>rows.map(q=><button type="button" key={q.id} aria-pressed={selected?.id===q.id} aria-controls="question-reading" onClick={()=>choose(q)}><small>{q.group}</small>{q.question}</button>);
 return <section id="questions" className={styles.journey} aria-label="고민으로 시작하기">
  <h2>지금 마음에 걸리는 질문은?</h2><p>점술을 몰라도 괜찮아요. 먼저 질문을 골라 생각을 정리해 보세요.</p>
  <Exposure event="question_topics_view" source={source}/>
  <div className={styles.choices}>{buttons(questionGuides.slice(0,4))}</div>
  <details><summary>다른 고민 더 찾아보기</summary><div className={styles.choices}>{buttons(questionGuides.slice(4))}</div><a href="/ggulggul/">꿀꿀 운세에서 점술별로 둘러보기</a></details>
  <div id="question-reading" aria-live="polite">{selected&&<article className={styles.reading} key={selected.id}>
   <p className={styles.label}>로그인 없이 읽는 무료 해설 · 개인 운세를 계산한 결과는 아니에요.</p><h3>{selected.question}</h3>
   <p>{selected.answer}</p><p>{selected.basis}</p><h3>살릴 점과 살펴볼 점</h3><p>{selected.strength}</p><p>{selected.caution}</p><h3>오늘 해볼 한 가지</h3><p>{selected.action}</p>
   <Exposure event="free_guide_result_view" source={source} q={selected}/>
   <a href={selected.freeHref}>{selected.freeLabel}</a><QuestionOffer q={selected} source={source}/>
  </article>}</div>
  <nav aria-label="서비스 선택"><a href="/yeongnyangi/fortune/">영냥이에게 내 질문으로 상담하기</a><a href="/ggulggul/">꿀꿀 운세에서 깊이 탐색하기</a></nav>
 </section>;
}
export function FreeQuestionNext({category,source}:{category:string;source:string}){
 const q=getQuestionGuide(freeQuestionMap[category]);
 return <aside className={styles.journey} aria-label="무료 결과 다음 질문">{q?<><h2>읽고 나니, 이런 점도 궁금한가요?</h2><p>방금 본 결과의 분야에서 이어 생각해 볼 질문이에요. 아래 질문이 지금의 고민과 맞을 때 선택해 주세요.</p><a href={questionGuideHref(q.id)} onClick={()=>record('free_question_click',source,q)}>{q.question} — 무료 해설 읽기</a><Exposure event="free_question_view" source={source} q={q}/></>:<><h2>오늘 읽은 이야기, 내 하루에 남겨볼까요?</h2><p>기억하고 싶은 문장과 오늘 해볼 행동 하나를 정리해 보세요.</p><a href="/diary/">무료 운세 다이어리 열기</a></>}</aside>;
}
