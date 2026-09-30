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
 return <section className={styles.offer} aria-label="선택한 질문의 상담 안내">
  <h3>{q.question}</h3><Exposure key={q.id} event="question_offer_view" source={source} q={q}/>
  <p className={styles.offerLead}>{q.next} 영냥이는 {kind.partner?'두 사람의 프로필과 관계 흐름':product.domain==='tarot'?'입력한 질문과 카드의 상징':'선택한 프로필과 계산 근거'}을 바탕으로, {kind.description}을 챕터별로 정리해요.</p>
  <h4>상담에서 확인할 내용</h4>
  <ul>{chapters.slice(0,3).map(ch=><li key={ch.id}>{ch.title}</li>)}</ul>
  <p className={styles.price}><strong>{product.priceKRW.toLocaleString('ko-KR')}원 · {chapters.length}개 챕터</strong><span>{product.name} · {kind.label} · {product.fishName}</span></p>
  <p className={styles.note}>로그인 후 이용권·월정석 적용 여부와 단건 결제 총액을 확인해요. 생성 중인 상담과 저장된 결과는 내 상담 기록에서 다시 확인할 수 있어요.</p>
  <a className={styles.primary} href={questionCheckoutHref(q)} onClick={()=>record('question_offer_click',source,q)}>이 질문의 상담 구성 확인하기</a>
  <a className={styles.library} href="/yeongnyangi/library/">이미 구매했다면 내 상담 기록 보기</a>
 </section>;
}
export default function QuestionJourney({source='home'}:{source?:string}){
 const [selected,setSelected]=useState<QuestionGuide>();
 useEffect(()=>{const q=getQuestionGuide(new URLSearchParams(window.location.search).get('question'));if(q){setSelected(q);record('question_select',source,q);}},[source]);
 function choose(q:QuestionGuide){setSelected(q);record('question_select',source,q);}
 const buttons=(rows:QuestionGuide[])=>rows.map(q=><button type="button" key={q.id} aria-pressed={selected?.id===q.id} aria-controls="question-reading" onClick={()=>choose(q)}><small>{q.group}</small>{q.question}</button>);
 return <section id="questions" className={styles.journey} aria-label="고민으로 시작하기">
  <div className={styles.intro}><div><h2>지금 마음에 걸리는 질문은?</h2><p>질문을 고르면 영냥이가 어떤 방식으로 읽는지, 상담에서 확인할 내용과 결제 조건을 먼저 보여드려요.</p></div><img className={styles.mascot} src="/assets/yeongnyangi/original/hero-480.webp" srcSet="/assets/yeongnyangi/original/hero-480.webp 480w, /assets/yeongnyangi/original/hero-800.webp 800w" sizes="(max-width: 560px) 112px, 176px" width="800" height="800" alt="달빛 모자를 쓰고 상담을 기다리는 흰 고양이 영냥이" loading="lazy" decoding="async"/></div>
  <Exposure event="question_topics_view" source={source}/>
  <div className={styles.choices}>{buttons(questionGuides.slice(0,4))}</div>
  <details><summary>다른 고민 더 찾아보기</summary><div className={styles.choices}>{buttons(questionGuides.slice(4))}</div><a href="/ggulggul/">꿀꿀 운세에서 점술별로 둘러보기</a></details>
  <div id="question-reading" aria-live="polite">{selected&&<QuestionOffer key={selected.id} q={selected} source={source}/>}</div>
  <nav className={styles.explore} aria-label="다른 상담 탐색"><a href="/yeongnyangi/fortune/">영냥이의 모든 상담 보기</a><a href="/ggulggul/">꿀꿀 운세에서 깊이 탐색하기</a></nav>
 </section>;
}
export function FreeQuestionNext({category,source}:{category:string;source:string}){
 const q=getQuestionGuide(freeQuestionMap[category]);
 return <aside className={styles.journey} aria-label="무료 결과 다음 질문">{q?<><h2>읽고 나니, 이런 점도 궁금한가요?</h2><p>방금 본 결과의 분야에서 이어 생각해 볼 질문이에요. 아래 질문이 지금의 고민과 맞을 때 선택해 주세요.</p><a href={questionGuideHref(q.id)} onClick={()=>record('free_question_click',source,q)}>{q.question} — 무료 해설 읽기</a><Exposure event="free_question_view" source={source} q={q}/></>:<><h2>오늘 읽은 이야기, 내 하루에 남겨볼까요?</h2><p>기억하고 싶은 문장과 오늘 해볼 행동 하나를 정리해 보세요.</p><a href="/diary/">무료 운세 다이어리 열기</a></>}</aside>;
}
