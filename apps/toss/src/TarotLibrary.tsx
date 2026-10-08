import {useMemo,useState} from 'react';
import {Button,TextArea} from '@toss/tds-mobile';
import {TOSS_TAROT_LIBRARY_FLOWS} from '../../../lib/tarot/toss-library-flows.mjs';
import {TAROT_CARDS} from '../../../lib/tarot/tarot-cards.mjs';
import {completeSelfEsteemReadingPayload} from '../../../lib/tarot/self-esteem-local-reading.mjs';
import {api,purchaseTarotLibrary,type TarotLibraryProduct} from './platform';

type Flow={id:string;name:string;access:'iap'|'free-local';featureKeys:string[];cardCount:number;positions:[string,string][];resultKind:string;inputLabel:string;inputHint:string};
type Card={code:string;nameKo:string;nameEn:string;keywords?:string[]};
type DrawnCard=Card&{orientation:'upright'|'reversed';position:string;positionLabel:string};
type LocalResult={flowId:string;title:string;question:string;cards:DrawnCard[];opening:string;summary:string;advice:string};

const flows=TOSS_TAROT_LIBRARY_FLOWS as Flow[];
const deck=TAROT_CARDS as Card[];
const isFree=(flow:Flow)=>flow.access==='free-local';
const orientation=(index:number):'upright'|'reversed'=>index%3===1?'reversed':'upright';
const cardName=(card:DrawnCard)=>`${card.nameKo||card.nameEn}${card.orientation==='reversed'?' · 역방향':''}`;

function localResult(flow:Flow,question:string,picks:number[]):LocalResult{
  const cards=picks.map((slot,index)=>{
    const card=deck[slot];
    const [position,positionLabel]=flow.positions[index];
    return {...card,orientation:orientation(slot),position,positionLabel};
  });
  const first=cards[0];
  const last=cards[cards.length-1];
  const focus=question.trim()||'지금의 흐름';
  const opening=flow.resultKind==='self-esteem'
    ? '타인의 반응에 맞추느라 흐려진 마음의 선을, 다섯 장의 카드가 차례로 비춥니다. 결론을 서두르기보다 지금 드러난 감정을 내 편에서 읽어 보세요.'
    :flow.resultKind==='healing'
      ? '지금의 마음을 문제로 만들지 않고, 지친 자리와 회복의 단서를 차례로 살펴봅니다.'
      :'카드가 정답을 대신 결정하지는 않지만, 지금 놓치기 쉬운 조건과 선택의 기준을 한 장씩 비춥니다.';
  const selfEsteem=flow.resultKind==='self-esteem'?completeSelfEsteemReadingPayload({},cards):null;
  return {flowId:flow.id,title:flow.name,question:focus,cards,opening:selfEsteem?.opening||opening,
    summary:`${cardName(first)} 카드가 먼저 말하는 것은 “${focus}”에서 속도를 정하기 전에 현재의 감정과 조건을 구분해 보라는 신호입니다. ${last?`${cardName(last)} 카드는 오늘 할 수 있는 작은 선택을 남깁니다.`:''}`,
    advice:flow.resultKind==='self-esteem'
      ? (selfEsteem?.topSummary?.todayAction||'오늘 한 번은 설명을 길게 덧붙이기 전에, 내가 가능한 범위와 어려운 범위를 짧게 말해 보세요. 그 작은 선택이 내 기준을 다시 세우는 시작이 됩니다.')
      :flow.resultKind==='healing'
        ? '지금 바로 해결하려 하기보다, 오늘 나를 덜 소모시키는 행동 하나를 정하고 지켜 보세요. 회복은 작은 반복에서 더 오래 남습니다.'
        :'카드가 가리킨 조건을 메모하고, 이번 주 안에 확인할 수 있는 행동 하나로 바꿔 보세요. 불확실한 마음을 줄이는 데 도움이 됩니다.'};
}

function Result({result,onRestart}:{result:LocalResult;onRestart:()=>void}){
  const yearly=result.flowId==='tarot-year-fortune';
  return <section className={'tarot-result tarot-result--'+result.flowId}>
    <h1>{result.title}</h1><p className="intro">{result.opening}</p>
    <section className="paper tarot-summary"><h2>이번 리딩의 흐름</h2><p>{result.summary}</p></section>
    {yearly&&<p className="muted">월별 카드를 눌러 각 시기의 흐름을 차례로 읽어 보세요.</p>}
    <div className={yearly?'tarot-result-cards tarot-result-cards--year':'tarot-result-cards'}>
      {result.cards.map((card,index)=><article className="tarot-result-card" key={card.position}>
        <small>{yearly?`${index+1}월 · `:''}{card.positionLabel}</small><h2>{cardName(card)}</h2>
        <p>{(card.keywords||[]).slice(0,3).join(' · ')||'카드가 비춘 현재의 조건'}</p>
      </article>)}
    </div>
    <section className="paper"><h2>{result.flowId==='tarot-self-esteem'?'오늘 다시 세울 기준':'현실에서 참고할 행동'}</h2><p>{result.advice}</p></section>
    <Button variant="weak" display="block" onClick={onRestart}>다른 질문으로 다시 보기</Button>
  </section>;
}

export default function TarotLibrary({products,loggedIn,onLogin,onError,onBack}:{products:TarotLibraryProduct[];loggedIn:boolean;onLogin:()=>void;onError:(error:unknown)=>void;onBack:()=>void}){
  const [flowId,setFlowId]=useState(''),[question,setQuestion]=useState(''),[drawStarted,setDrawStarted]=useState(false),[picks,setPicks]=useState<number[]>([]),[paidReady,setPaidReady]=useState(false),[buying,setBuying]=useState(false),[result,setResult]=useState<LocalResult|null>(null);
  const flow=useMemo(()=>flows.find(item=>item.id===flowId)||null,[flowId]);
  const reset=()=>{setFlowId('');setQuestion('');setDrawStarted(false);setPicks([]);setPaidReady(false);setResult(null);};
  if(result)return <Result result={result} onRestart={reset}/>;
  if(!flow)return <section className="tarot-library"><h1>타로 리딩</h1><p className="intro">마음에 걸리는 질문을 고르고, 카드가 비추는 흐름과 현실적인 다음 행동을 살펴보세요.</p><div className="tarot-library-list">
    {flows.map(item=><button className="tarot-library-item" key={item.id} onClick={()=>{setFlowId(item.id);setQuestion('');setDrawStarted(false);setPicks([]);setPaidReady(false);}}><span><strong>{item.name}</strong><small>{item.cardCount}장 펼침 · {isFree(item)?'무료 로컬 리딩':'단건 리딩'}</small></span><span aria-hidden>›</span></button>)}
  </div><Button variant="weak" display="block" onClick={onBack}>홈으로 돌아가기</Button></section>;
  if(paidReady){
    const product=products.find(item=>item.id===flow.id);
    const input={question,cards:picks.map((slot,index)=>({cardId:deck[slot].code,orientation:orientation(slot),position:flow.positions[index][0]}))};
    return <section className="tarot-library"><h1>{flow.name}</h1><p className="intro">선택한 {flow.cardCount}장의 카드와 질문을 안전하게 확인했어요.</p><section className="paper"><h2>단건 리딩 준비 완료</h2><p>카드와 질문은 주문 소유권에 묶여 서버의 저장형 생성기로 전달됩니다. 결과는 같은 토스 계정에서 다시 열 수 있어요.</p></section>{!product?<p className="notice">이 리딩의 승인된 토스 상품을 확인하고 있어요. 현재는 결제를 시작하지 않아요.</p>:!loggedIn?<Button display="block" onClick={onLogin}>토스 로그인하고 이어가기</Button>:<Button display="block" loading={buying} disabled={buying} onClick={()=>{setBuying(true);try{purchaseTarotLibrary(product,input,async orderId=>{try{const stored=await api<{result:LocalResult}>(`/tarot-library/results/${orderId}`);setResult(stored.result);}catch(error){onError(error);}finally{setBuying(false);}},error=>{setBuying(false);onError(error);});}catch(error){setBuying(false);onError(error);}}}>{product.displayAmount} 단건 리딩 시작</Button>}<Button variant="weak" display="block" onClick={()=>setFlowId('')}>다른 리딩 살펴보기</Button></section>;
  }
  if(!drawStarted)return <section className="tarot-library"><h1>{flow.name}</h1><p className="intro">{flow.inputHint||'질문을 적고 카드를 직접 펼쳐 보세요. 출생정보는 필요하지 않아요.'}</p><TextArea variant="box" label={flow.inputLabel} labelOption="sustain" value={question} onChange={event=>setQuestion(event.target.value)} maxLength={600}/><Button display="block" disabled={question.trim().length<2} onClick={()=>setDrawStarted(true)}>카드 펼치기</Button><Button variant="weak" display="block" onClick={()=>setFlowId('')}>리딩 목록</Button></section>;
  return <section className="tarot-library"><h1>{flow.name}</h1><p className="intro">카드를 순서대로 열어 보세요.</p><TarotDeck flow={flow} picks={picks} onChange={setPicks} onComplete={()=>isFree(flow)?setResult(localResult(flow,question,picks)):setPaidReady(true)}/></section>;
}

function TarotDeck({flow,picks,onChange,onComplete}:{flow:Flow;picks:number[];onChange:(next:number[])=>void;onComplete:()=>void}){
  const ready=picks.length===flow.cardCount;
  return <><p role="status">{picks.length} / {flow.cardCount}장 선택{flow.positions[picks.length]?` · 다음 자리: ${flow.positions[picks.length][1]}`:''}</p><div className="tarot-deck" aria-label="뒤집힌 타로 카드">
    {Array.from({length:Math.min(deck.length,24)},(_,slot)=>{const index=picks.indexOf(slot);return <button type="button" key={slot} aria-pressed={index>=0} disabled={index<0&&ready} onClick={()=>onChange(index>=0?picks.filter(value=>value!==slot):[...picks,slot])}><span aria-hidden>{index>=0?index+1:'✦'}</span></button>;})}
  </div><Button display="block" disabled={!ready} onClick={onComplete}>선택한 카드 열기</Button></>;
}
