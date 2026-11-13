import {useEffect,useState} from 'react';
import {LENORMAND_CARD_POOL as cards,LENORMAND_SPREAD as spread} from '../../../app/tarot/prompt-maker/data/lenormand';
import {buildLenormandPrompt} from '../../../app/tarot/prompt-maker/utils/buildOraclePrompt';
import {shuffleTarotDeck} from './tarot-deck';
import {Button} from './Button';

export default function Lenormand({onBack}:{onBack:()=>void}){
  const [question,setQuestion]=useState(''),[stage,setStage]=useState<'input'|'draw'|'result'>('input');
  const [deck,setDeck]=useState(()=>shuffleTarotDeck(cards)),[picks,setPicks]=useState<number[]>([]);
  const back=()=>stage==='input'?onBack():setStage(stage==='draw'?'input':'draw');
  useEffect(()=>{
    const handler=(event:Event)=>{if(!event.defaultPrevented){event.preventDefault();back();}};
    window.addEventListener('code-destiny:toss-back',handler,true);
    return()=>window.removeEventListener('code-destiny:toss-back',handler,true);
  },[stage,onBack]);
  const drawn=picks.map((slot,index)=>({...deck[slot],orientation:'upright' as const,orientationLabel:'정방향' as const,slotIndex:index+1,
    positionLabel:spread.positions[index].label,positionDescription:spread.positions[index].description}));
  const report=stage==='result'?buildLenormandPrompt(spread,question,drawn,'ko'):null;
  return <section className="tarot-library floral-form"><h1>{spread.title}</h1>
    {stage==='input'?<><p className="intro">{spread.purpose}</p><label className="tarot-input-label">레노먼드에 묻고 싶은 질문<textarea value={question} onChange={e=>setQuestion(e.target.value)} maxLength={600}/></label>
      <Button display="block" disabled={!question.trim()} onClick={()=>{setPicks([]);setDeck(shuffleTarotDeck(cards));setStage('draw');}}>카드 펼치기</Button></>
    :stage==='draw'?<><p role="status">{picks.length} / 6장 · {spread.positions[picks.length]?.label||'배열 완성'}</p><div className="tarot-deck">{deck.map((_,slot)=><button key={slot} type="button" aria-label={(slot+1)+'번째 레노먼드 카드'} aria-pressed={picks.includes(slot)} disabled={!picks.includes(slot)&&picks.length===6} onClick={()=>setPicks(picks.includes(slot)?picks.filter(item=>item!==slot):[...picks,slot])}>{picks.includes(slot)?picks.indexOf(slot)+1:'✦'}</button>)}</div><Button display="block" disabled={picks.length!==6} onClick={()=>setStage('result')}>프롬프트 만들기</Button></>
    :report&&<><p>{report.summary}</p><div className="tarot-result-cards">{drawn.map(card=><article key={card.cardCode} className="tarot-result-card"><img src={card.image} width="80" height="120" alt={card.cardNameKo}/><h2>{card.positionLabel}</h2><p>{card.cardNameKo} · {card.keywords.join(' · ')}</p></article>)}</div><label className="tarot-input-label">레노먼드 프롬프트 원문<textarea value={report.prompt} readOnly rows={10}/></label><Button onClick={()=>setStage('input')}>다른 질문으로 다시 보기</Button></>}
    <Button variant="weak" onClick={back}>{stage==='input'?'리딩 목록':'이전 단계'}</Button></section>;
}
