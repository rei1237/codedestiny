'use client';
import {useEffect,useRef,useState} from 'react';
import Image from 'next/image';
import MoonlightTutorial from './MoonlightTutorial';
import {guides,choices,directory,examples,matchQuestion,alternative} from '../../lib/fortune/consultation-match.mjs';
import {saveGuideQuestion} from '../../lib/fortune/guide-handoff';
import s from './home-question-guide.module.css';

export default function HomeQuestionGuide(){
  const [step,setStep]=useState('write'),[question,setQuestion]=useState(''),[answers,setAnswers]=useState([]),[direct,setDirect]=useState(false),[draft,setDraft]=useState(''),[id,setId]=useState('');
  const [notice,setNotice]=useState(''),[failed,setFailed]=useState(false);
  const input=useRef(null),heading=useRef(null),started=useRef(false);
  const [ready,setReady]=useState(false);
  useEffect(()=>setReady(true),[]);
  const alt=alternative(id,question);
  const options=answers.length ? [['yeoni','마음을 편지로 읽기'],['neo','다음 행동 하나 정하기'],['cat','내 선택 습관 돌아보기']] : choices;
  const [fallback,setFallback]=useState(false);
  const guide=guides[id],canPass=guide?.person && question.length<=guide.limit && !failed;
  useEffect(()=>{if(started.current)heading.current?.focus();},[step,answers.length]);
  // Only the step number enters browser history. Answers live in this component.
  const trail=useRef([]),position=useRef(0),journey=useRef('');
  useEffect(()=>{
    function restore(event){
      const state=event.state?.homeGuide;
      if(!state||state.journey!==journey.current)return;
      const saved=trail.current[state.index];if(!saved)return;
      position.current=state.index;
      setStep(saved.step);setQuestion(saved.question);setAnswers(saved.answers);setDraft(saved.draft);
      setDirect(saved.direct);setId(saved.id);setFallback(saved.fallback);setNotice('');setFailed(false);
    }
    window.addEventListener('popstate',restore);return ()=>window.removeEventListener('popstate',restore);
  },[]);
  useEffect(()=>{trail.current[position.current]={step,question,answers,draft,direct,id,fallback};},
    [step,question,answers,draft,direct,id,fallback]);
  function move(next){
    if(!journey.current){
      journey.current=crypto.randomUUID();
      history.replaceState({...history.state,homeGuide:{journey:journey.current,index:0}},'');
    }
    trail.current.length=position.current+1;
    position.current+=1;
    history.pushState({...history.state,homeGuide:{journey:journey.current,index:position.current}},'');
    started.current=true;setNotice('');setFailed(false);setStep(next);
  }
  function submit(e){
    e.preventDefault(); if(!question.trim()){setNotice('궁금한 내용을 한 줄 적어 주세요.');input.current?.focus();return;}
    setAnswers([]);setDraft('');setDirect(false);setFallback(false);
    const next=matchQuestion(question);setId(next||'');move(next?'result':'ask');
  }
  function answer(text,key){
    if(!text.trim()){setNotice('원하는 도움을 적어 주세요.');return;}
    const next=key||matchQuestion([question,...answers].join(' '),text);
    setAnswers([...answers,text]);setDraft('');setDirect(false);setFallback(!next && answers.length>0);
    if(next){setId(next);move('result');}else if(answers.length){setId('yeoni');move('result');}else move('ask');
  }
  function back(){
    history.back();
  }
  function launch(e){
    if(canPass&&!saveGuideQuestion(id,question)){
      e.preventDefault();setFailed(true);setNotice('이 탭에서는 질문을 전달할 수 없어요. 질문을 복사한 뒤 상담을 열어 주세요.');
    }
  }
  async function copy(){
    try {await navigator.clipboard.writeText(question);setNotice('질문을 복사했어요.');}
    catch {setNotice('위의 질문을 길게 눌러 복사해 주세요.');}
  }
  return <section className={s.guide} aria-labelledby="homeCardTitle">
    <h2 ref={heading} tabIndex={-1} id="homeCardTitle">{step==='write'?'지금 가장 궁금한 걸 물어보세요.':step==='ask'?(answers.length?'가장 먼저 해 보고 싶은 건 무엇인가요?':'지금은 어떤 도움이 더 필요하세요?'):'내 질문에 어울리는 상담'}</h2>
    {step==='write'?<><form onSubmit={submit}><label htmlFor="home-question">나의 질문</label>
      <textarea ref={input} id="home-question" rows={3} value={question} onChange={e=>{setQuestion(e.target.value);setNotice('');}} placeholder="먼저 연락하고 싶은데, 답장이 없으면 더 힘들어질까 봐 망설여져요."/>
      <button disabled={!ready} className={s.primary}>내 질문에 맞는 상담 찾기</button></form>
      <MoonlightTutorial questionInput={input} />
      <div className={s.examples}><p>이런 질문으로 시작해 보세요</p>{examples.map(v=><button key={v} onClick={()=>{setQuestion(v);setNotice('');input.current.focus();}}>{v}</button>)}</div>
      <details><summary>운세 종류로 찾기</summary><nav>{directory.map(v=><a key={v.key} href={v.href}>{v.title}</a>)}</nav></details></>:
    <><div className={s.quote}><span>내가 한 질문</span><p>{question}</p></div>
    {step==='ask'?<><div className={s.options}>{options.map(([key,label])=><button key={key} onClick={()=>answer(label,key)}>{label}</button>)}
      <button aria-expanded={direct} onClick={()=>setDirect(!direct)}>직접 답하기</button></div>{direct&&<form onSubmit={e=>{e.preventDefault();answer(draft);}}><label htmlFor="home-answer">원하는 도움</label><textarea id="home-answer" autoFocus rows={2} value={draft} onChange={e=>setDraft(e.target.value)}/><button className={s.primary}>답변 반영하기</button></form>}</>:
    <><header className={s.identity}><Image src={guide.image} alt="" width={68} height={68}/><div><span>추천 상담</span><h2>{guide.title}</h2></div></header>
      <p>{fallback&&id==='yeoni'?'아직 원하는 도움을 한 가지로 좁히기 어렵다면, 마음에 남은 이야기부터 꺼낼 수 있는 찻집에서 시작해 보세요.':guide.reason}</p>
      <div><strong>이 상담에서 받는 것</strong><p>{guide.format}</p></div>
      <a className={s.primary} href={guide.href} onClick={launch}>{canPass?'이 질문으로 '+guide.person+'와 상담하기':guide.action}</a>
      {!canPass&&<button onClick={copy}>질문 복사하기</button>}
      {alt&&<details key={id}><summary>다른 방식으로 보기</summary><p>{alt.text}</p><button onClick={()=>{setId(alt.id);setNotice('');setFailed(false);heading.current?.focus();}}>{guides[alt.id].title} 보기</button></details>}</>}
      <button onClick={back}>{answers.length?'이전 답변 수정하기':'질문 수정하기'}</button>
      {answers.length>0&&<button onClick={()=>history.go(-position.current)}>처음 질문 수정하기</button>}</>}
    {notice&&<p role="status">{notice}</p>}
  </section>;
}
