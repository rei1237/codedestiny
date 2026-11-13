import {useEffect,useState} from 'react';
import {cards,readKemet} from 'virtual:toss-kemet';
import {Button} from './Button';

const positions=['과거','현재','미래'];
function shuffledDeck(){
  const values=Array.from({length:cards},(_,i)=>i);
  for(let i=values.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[values[i],values[j]]=[values[j],values[i]];}
  return values;
}
export default function KemetOracle(){
  const [question,setQuestion]=useState(''),[deck,setDeck]=useState<number[]>([]);
  const [picks,setPicks]=useState<number[]>([]),[result,setResult]=useState<ReturnType<typeof readKemet>|null>(null);
  const [copyStatus,setCopyStatus]=useState('');
  function reset(){setDeck([]);setPicks([]);setResult(null);setCopyStatus('');}
  useEffect(()=>{
    if(!deck.length)return;
    const back=(event:Event)=>{event.preventDefault();reset();};
    window.addEventListener('code-destiny:toss-back',back);
    return ()=>window.removeEventListener('code-destiny:toss-back',back);
  },[deck]);
  if(result)return <section><h1>케멧의 신탁</h1><p>{question}</p>
    {result.gods.map((god,i)=><article className="paper" key={god.name}><h2>{positions[i]} · {god.icon} {god.name}</h2><p>{god.role}</p><p>{god.oracle}</p><p>{god.position}</p></article>)}
    <article className="paper"><h2>세 신이 그린 지도</h2><p>{result.synthesis}</p></article>
    <article className="paper"><h2>{result.catLabel} · {result.catSymbol}</h2>{result.gods.map(god=><p key={god.name}><b>{god.name}</b><br/>{god.topic}</p>)}</article>
    <article className="paper"><h2>오늘의 영적 처방</h2>{result.gods.map(god=><p key={god.name}><b>{god.name}의 헤카</b><br/>{god.heka}</p>)}</article>
    <article className="paper"><h2>파피루스에 새겨진 한 줄</h2><p>{result.papyrus}</p></article>
    <details className="paper"><summary>케멧 전문가 프롬프트</summary><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{result.prompt}</p><Button onClick={async()=>{try{await navigator.clipboard.writeText(result.prompt);setCopyStatus('복사했어요.');}catch{setCopyStatus('위 내용을 길게 눌러 복사해 주세요.');}}}>프롬프트 복사</Button><p role="status">{copyStatus}</p></details>
    <Button onClick={reset}>다시 물어보기</Button></section>;
  if(deck.length)return <section><h1>세 장의 신탁 카드</h1><p>고른 순서대로 과거, 현재, 미래를 나타내요. 다시 누르면 선택이 풀려요.</p>
    <div role="group" aria-label="열두 신탁 카드" style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:8}}>
      {deck.map((id,slot)=><button key={id} type="button" aria-pressed={picks.includes(id)} aria-label={slot+1+'번 카드'} disabled={picks.length===3&&!picks.includes(id)}
        style={{minHeight:58,border:'1px solid #bda66c',borderRadius:8,background:picks.includes(id)?'#4a3a23':'#faefd9',color:picks.includes(id)?'white':'#412e1c'}}
        onClick={()=>setPicks(prev=>prev.includes(id)?prev.filter(n=>n!==id):[...prev,id])}>{picks.includes(id)?positions[picks.indexOf(id)]:'𓂀 '+(slot+1)}</button>)}
    </div><p aria-live="polite">{picks.length} / 3장</p><Button disabled={picks.length!==3} onClick={()=>{setResult(readKemet(question,picks));window.scrollTo(0,0);}}>세 신의 신탁 열기</Button></section>;
  return <section><h1>이집트 신탁</h1><p>아문라의 제단에 질문을 올리고, 열두 신의 카드 중 세 장을 골라요.</p>
    <form className="form" onSubmit={event=>{event.preventDefault();if(question.trim().length>=2)setDeck(shuffledDeck());}}>
      <label>제단에 올릴 질문<textarea value={question} onChange={event=>setQuestion(event.target.value)} required minLength={2}/></label><Button type="submit" disabled={question.trim().length<2}>신탁 카드 섞기</Button>
    </form></section>;
}
