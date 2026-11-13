import {useEffect,useRef,useState} from 'react';
import {castTurtle} from 'virtual:toss-turtle-oracle';
import {Button} from './Button';

export default function TurtleOracle(){
  const [question,setQuestion]=useState('');
  const [result,setResult]=useState<ReturnType<typeof castTurtle>|null>(null);
  const [holding,setHolding]=useState(false);
  const [copied,setCopied]=useState('');
  const timer=useRef<number|null>(null);
  function cancel(){if(timer.current!==null)window.clearTimeout(timer.current);timer.current=null;setHolding(false);}
  function start(){
    if(timer.current!==null)return;
    setHolding(true);
    timer.current=window.setTimeout(()=>{
      timer.current=null;setHolding(false);setCopied('');
      setResult(castTurtle(question,(Date.now()^(Math.random()*0xFFFF))>>>0));
    },2200);
  }
  useEffect(()=>()=>{if(timer.current!==null)window.clearTimeout(timer.current);},[]);
  useEffect(()=>{
    if(!result)return;
    window.scrollTo(0,0);
    const back=(event:Event)=>{event.preventDefault();setResult(null);};
    window.addEventListener('code-destiny:toss-back',back);
    return ()=>window.removeEventListener('code-destiny:toss-back',back);
  },[result]);
  if(!result)return <section><h1>주역 거북점</h1><div className="form"><label>거북에게 묻고 싶은 질문<textarea value={question} onChange={event=>setQuestion(event.target.value)} placeholder="지금 나에게 필요한 선택은 무엇일까요?"/></label>
    <p>물음을 떠올리며 거북 등껍질을 2초 동안 길게 눌러주세요.</p>
    <button type="button" className="moon-button-primary" aria-label="거북 등껍질 길게 누르기" style={{minHeight:62,touchAction:'none',userSelect:'none'}}
      onPointerDown={event=>{event.currentTarget.setPointerCapture(event.pointerId);start();}} onPointerUp={cancel} onPointerCancel={cancel} onBlur={cancel}
      onKeyDown={event=>{if(event.key===' '||event.key==='Enter'){event.preventDefault();if(!event.repeat)start();}}} onKeyUp={event=>{if(event.key===' '||event.key==='Enter')cancel();}}>
      {holding?'열기가 전해지고 있어요':'거북 등껍질 길게 누르기'}</button>
  </div></section>;
  return <section><h1>{result.hexChar} {result.hexName}</h1><p>{question}</p>
    <article className="paper"><h2>질문의 메아리</h2><p>{result.echo}</p></article>
    <article className="paper"><h2>오늘의 대성괘</h2><p>상괘 {result.upper.sym} {result.upper.name} · {result.upper.nat}</p><p>하괘 {result.lower.sym} {result.lower.name} · {result.lower.nat}</p><p>{result.wisdom.summary}</p><p>{result.wisdom.advice}</p></article>
    {result.relation&&<article className="paper"><h2>체용의 형세</h2><h3>{result.relation.title}</h3><p>{result.relation.text}</p></article>}
    <article className="paper"><h2>집중된 통찰</h2><p>{result.strategy}</p><p>{result.change}</p></article>
    <article className="paper"><h2>분야별 통변</h2>{result.categories.map(row=><p key={row.label}><b>{row.label}</b><br/>겉 {row.up} · 속 {row.lo}</p>)}</article>
    <article className="paper"><h2>물음에 답하는 옛 지혜</h2><h3>{result.answer.title}</h3><p>{result.answer.advice}</p></article>
    <article className="paper"><h2>갈무리</h2><p>{result.ending}</p></article>
    <details className="paper"><summary>주역 전문가 프롬프트</summary><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{result.prompt}</p>
      <Button variant="weak" onClick={()=>{if(!navigator.clipboard){setCopied('위 내용을 길게 눌러 복사해 주세요.');return;}void navigator.clipboard.writeText(result.prompt).then(()=>setCopied('복사했어요.')).catch(()=>setCopied('위 내용을 길게 눌러 복사해 주세요.'));}}>프롬프트 복사</Button><p role="status">{copied}</p></details>
    <Button onClick={()=>setResult(null)}>다시 물어보기</Button>
  </section>;
}
