import {shuffleTarotDeck} from './tarot-deck';
import {TarotCover} from './Brand';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Button,TextArea} from '@toss/tds-mobile';
import {TOSS_TAROT_LIBRARY_FLOWS} from '../../../lib/tarot/toss-library-flows.mjs';
import {TAROT_CARDS} from '../../../lib/tarot/tarot-cards.mjs';
import {completeSelfEsteemReadingPayload} from '../../../lib/tarot/self-esteem-local-reading.mjs';
import {api,purchaseTarotLibrary,type TarotLibraryProduct} from './platform';
import TarotResultActions from './TarotResultActions';

type Flow={id:string;name:string;access:'iap'|'free-local';featureKeys:string[];cardCount:number;positions:[string,string][];resultKind:string;inputLabel:string;inputHint:string};
type Card={code:string;nameKo:string;nameEn:string;keywords?:string[]};
type DrawnCard=Card&{orientation:'upright'|'reversed';position:string;positionLabel:string};
type ReadingSection={title:string;body:string};
type LocalResult={flowId:string;title:string;question:string;cards:DrawnCard[];opening?:string;summary?:string;advice?:string;renderer?:string;presentation?:{opening:string;summary:string;sections:ReadingSection[];actions:string[]}};
type StoredReading={flowId?:string;state:string;result:LocalResult|null;canRetryNow:boolean};

const flows=TOSS_TAROT_LIBRARY_FLOWS as Flow[];
const deck=TAROT_CARDS as Card[];
const isFree=(flow:Flow)=>flow.access==='free-local';
const orientation=(index:number):'upright'|'reversed'=>index%3===1?'reversed':'upright';
const cardName=(card:DrawnCard)=>`${card.nameKo||card.nameEn}${card.orientation==='reversed'?' · 역방향':''}`;

function localResult(flow:Flow,question:string,picks:number[],shuffledDeck:Array<Card&{orientation:'upright'|'reversed'}>):LocalResult{
  const cards=picks.map((slot,index)=>{
    const card=shuffledDeck[slot];
    const [position,positionLabel]=flow.positions[index];
    return {...card,position,positionLabel};
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

const resultPresentation=(result:LocalResult)=>{
  const yearly=result.flowId==='tarot-year-fortune';
  const content=result.presentation||{opening:result.opening||'',summary:result.summary||'',sections:[],actions:result.advice?[result.advice]:[]};
  const labels:Record<string,{eyebrow:string;cards:string;sections:string}>= {
    celestial:{eyebrow:'열한 행성이 비춘 내면의 합주',cards:'행성의 자리마다 열린 카드',sections:'열한 행성이 건넨 조율의 말'},
    crystal:{eyebrow:'원석과 다섯 장이 그린 마음의 결',cards:'원석이 비춘 다섯 장',sections:'원석 소울 리딩'},
    career:{eyebrow:'현재 자리에서 다음 선택까지',cards:'이직의 갈림길을 읽는 카드',sections:'현실적인 이직 전략'},
    relationship:{eyebrow:'두 사람 사이의 속도와 거리',cards:'관계의 온도를 읽는 카드',sections:'관계의 다음 장면'},
    mindscan:{eyebrow:'말과 행동 사이의 빈칸',cards:'엇갈림을 읽는 카드',sections:'대화 전에 확인할 신호'},
    numerology:{eyebrow:'숫자의 리듬과 카드의 조언',cards:'반복되는 선택을 읽는 카드',sections:'숫자와 카드가 만난 자리'},
    oracle:{eyebrow:'질문에서 행동까지, 일곱 장의 답',cards:'질문을 따라 펼친 카드',sections:'오라클의 답장'},
    reunion:{eyebrow:'관계의 거리와 다시 닿을 신호',cards:'관계 회복을 비추는 카드',sections:'다시 닿기 전에 볼 것'},
    year:{eyebrow:'올해의 핵심과 열두 달의 흐름',cards:'월마다 펼친 카드',sections:'월별 흐름'},
    healing:{eyebrow:'지친 마음을 돌보는 네 장의 순서',cards:'회복을 비추는 카드',sections:'오늘의 회복 단서'},
    'self-esteem':{eyebrow:'내 기준을 다시 세우는 다섯 장',cards:'나를 지키는 카드',sections:'다시 세울 기준'},
    single:{eyebrow:'오늘의 선택을 비추는 한 장',cards:'오늘 펼친 카드',sections:'오늘의 메시지'},
  };
  const labelsForResult=labels[result.renderer||result.flowId.replace('tarot-','')]||{eyebrow:'카드가 비춘 지금의 흐름',cards:'내가 고른 카드',sections:'카드가 비춘 조건'};
  return {yearly,content,labels:labelsForResult};
};

function Result({result,onRestart}:{result:LocalResult;onRestart:()=>void}){
  const {yearly,content,labels}=resultPresentation(result);
  return <section className={'tarot-result tarot-result--'+result.flowId}>
    <p className="tarot-result-eyebrow">{labels.eyebrow}</p><h1>{result.title}</h1><p className="intro">{content.opening}</p>
    <section className="paper tarot-summary"><h2>이번 리딩의 흐름</h2><p>{content.summary}</p></section>
    {yearly&&<p className="muted">월별 카드를 눌러 각 시기의 흐름을 차례로 읽어 보세요.</p>}
    <h2 className="tarot-result-heading">{labels.cards}</h2>
    <div className={yearly?'tarot-result-cards tarot-result-cards--year':'tarot-result-cards'}>
      {result.cards.map((card,index)=><article className="tarot-result-card" key={card.position}>
        <small>{yearly?`${index+1}월 · `:''}{card.positionLabel}</small><h2>{cardName(card)}</h2>
        <p>{(card.keywords||[]).slice(0,3).join(' · ')||'카드가 비춘 현재의 조건'}</p>
      </article>)}
    </div>
    {content.sections.length>0&&<section className="tarot-service-sections"><h2>{labels.sections}</h2>{content.sections.map((section,index)=><article className="paper" key={`${index}-${section.title}`}><h3>{section.title}</h3><p>{section.body}</p></article>)}</section>}
    {content.actions.length>0&&<section className="paper"><h2>{result.flowId==='tarot-self-esteem'?'오늘 다시 세울 기준':'현실에서 참고할 행동'}</h2><ol>{content.actions.filter(Boolean).slice(0,4).map(action=><li key={action}>{action}</li>)}</ol></section>}
    <TarotResultActions title={result.title} summary={content.summary}/>
    <Button variant="weak" display="block" onClick={onRestart}>다른 질문으로 다시 보기</Button>
  </section>;
}

export default function TarotLibrary({products,loggedIn,onLogin,onError,onBack,initialOrderId='',onRereadClosed}:{products:TarotLibraryProduct[];loggedIn:boolean;onLogin:()=>void;onError:(error:unknown)=>void;onBack:()=>void;initialOrderId?:string;onRereadClosed?:()=>void}){
  const purchaseCleanup=useRef<(()=>void)|null>(null),alive=useRef(false),requestEpoch=useRef(0);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;requestEpoch.current++;purchaseCleanup.current?.();};},[]);
  const [shuffledDeck,setShuffledDeck]=useState(()=>shuffleTarotDeck(deck));
  const [flowId,setFlowId]=useState(''),[question,setQuestion]=useState(''),[birthDate,setBirthDate]=useState(''),[gem,setGem]=useState('amethyst'),[drawStarted,setDrawStarted]=useState(false),[picks,setPicks]=useState<number[]>([]),[paidReady,setPaidReady]=useState(false),[buying,setBuying]=useState(false),[result,setResult]=useState<LocalResult|null>(null),[retryOrderId,setRetryOrderId]=useState(''),[restoring,setRestoring]=useState(false);
  const flow=useMemo(()=>flows.find(item=>item.id===flowId)||null,[flowId]);
  const [recoveredOrderId,setRecoveredOrderId]=useState(''),[canResume,setCanResume]=useState(false);
  const reset=()=>{requestEpoch.current++;purchaseCleanup.current?.();purchaseCleanup.current=null;setBuying(false);setFlowId('');setQuestion('');setBirthDate('');setGem('amethyst');setDrawStarted(false);setPicks([]);setPaidReady(false);setResult(null);setRetryOrderId('');setRecoveredOrderId('');onRereadClosed?.();};
  const acceptStored=(stored:StoredReading,orderId:string)=>{
    if(stored.flowId)setFlowId(stored.flowId);
    if(stored.result){setResult(stored.result);return;}
    if(stored.state==='input_required'){setRecoveredOrderId(orderId);setRetryOrderId('');return;}
    setRetryOrderId(orderId);setCanResume(stored.canRetryNow);
  };
  const resumeReading=async(orderId:string,body?:unknown)=>{
    setBuying(true);
    try{acceptStored(await api<StoredReading>(`/tarot-library/results/${orderId}`,body),orderId);}
    catch(error){setRetryOrderId(orderId);setCanResume(false);onError(error);}
    finally{setBuying(false);}
  };
  useEffect(()=>{
    if(!initialOrderId||!loggedIn)return;
    let active=true;setRestoring(true);setResult(null);setRetryOrderId('');setRecoveredOrderId('');
    void api<StoredReading>(`/tarot-library/results/${initialOrderId}`).then(stored=>{
      if(!active)return;
      acceptStored(stored,initialOrderId);
    }).catch(error=>{if(active){setRetryOrderId(initialOrderId);setCanResume(false);onError(error);}}).finally(()=>{if(active)setRestoring(false);});
    return()=>{active=false;};
  },[initialOrderId,loggedIn]);
  if(restoring)return <section className="tarot-library"><p role="status">저장된 타로 리딩을 다시 열고 있어요.</p></section>;
  if(result)return <Result result={result} onRestart={reset}/>;
  if(retryOrderId)return <section className="tarot-library"><h1>{flow?.name||'타로 리딩'}</h1><p className="notice" role="status">{canResume?'구매한 리딩을 이어서 만들 수 있어요. 추가 결제는 필요하지 않아요.':'저장된 결과와 진행 상태를 다시 확인해 주세요. 새로 결제하지 않아도 돼요.'}</p><Button display="block" loading={buying} disabled={buying} onClick={()=>void resumeReading(retryOrderId,canResume?{}:undefined)}>{canResume?'추가 결제 없이 이어서 생성':'진행 상태 확인하기'}</Button><Button variant="weak" display="block" onClick={reset}>리딩 목록</Button></section>;
  if(!flow)return <section className="tarot-library"><TarotCover/><h1>카드에 담긴, 나의 이야기</h1><p className="intro">마음에 걸리는 질문을 고르고, 카드가 비추는 흐름과 현실적인 다음 행동을 살펴보세요.</p><div className="tarot-library-list">
    {flows.map(item=><button className="tarot-library-item" key={item.id} onClick={()=>{setShuffledDeck(shuffleTarotDeck(deck));setFlowId(item.id);setQuestion('');setDrawStarted(false);setPicks([]);setPaidReady(false);}}><img className="tarot-list-art" src={`/assets/${item.id}-320.webp`} alt="" width={88} height={72} loading="lazy" decoding="async"/><span><strong>{item.name}</strong><small>{item.cardCount}장 펼침 · {isFree(item)?'바로 펼치는 리딩':'단건 리딩'}</small></span><span aria-hidden>›</span></button>)}
  </div><Button variant="weak" display="block" onClick={onBack}>홈으로 돌아가기</Button></section>;
  if(paidReady){
    const product=products.find(item=>item.id===flow.id);
    const input={question,cards:picks.map((slot,index)=>({cardId:shuffledDeck[slot].code,orientation:shuffledDeck[slot].orientation,position:flow.positions[index][0]})),...(flow.id==='tarot-numerology'?{birthDate}:{}),...(flow.id==='tarot-crystal-soul'?{gem}:{})};
    if(recoveredOrderId)return <section className="tarot-library"><h1>{flow.name}</h1><p>이미 구매한 리딩에 질문과 카드를 연결할게요. 추가 결제는 필요하지 않아요.</p><Button display="block" loading={buying} disabled={buying} onClick={()=>void resumeReading(recoveredOrderId,{input})}>구매한 리딩 이어서 보기</Button></section>;
    return <section className="tarot-library"><h1>{flow.name}</h1><p className="intro">선택한 {flow.cardCount}장의 카드와 질문을 안전하게 확인했어요.</p><section className="paper"><h2>단건 리딩 준비 완료</h2><p>선택한 카드와 질문으로 리딩을 만들어요. 완성된 결과는 같은 토스 계정의 기록 보관함에서 다시 열 수 있어요.</p></section>{!product?<p className="notice">이 리딩의 승인된 토스 상품을 확인하고 있어요. 현재는 결제를 시작하지 않아요.</p>:!loggedIn?<Button display="block" onClick={onLogin}>토스 로그인하고 이어가기</Button>:<Button display="block" loading={buying} disabled={buying} onClick={()=>{setBuying(true);try{purchaseCleanup.current?.();purchaseCleanup.current=purchaseTarotLibrary(product,input,orderId=>{if(alive.current)void resumeReading(orderId,{});},error=>{if(alive.current){setBuying(false);onError(error);}});}catch(error){setBuying(false);onError(error);}}}>{product.displayAmount} 단건 리딩 시작</Button>}<Button variant="weak" display="block" onClick={reset}>다른 리딩 살펴보기</Button></section>;
  }
  if(!drawStarted)return <section className="tarot-library"><TarotCover flowId={flow.id}/><h1>{flow.name}</h1><p className="intro">{flow.inputHint||'질문을 적고 카드를 직접 펼쳐 보세요. 출생정보는 필요하지 않아요.'}</p><TextArea variant="box" label={flow.inputLabel} labelOption="sustain" value={question} onChange={event=>setQuestion(event.target.value)} maxLength={600}/>{flow.id==='tarot-numerology'&&<label className="tarot-input-label">생년월일<input type="date" value={birthDate} onChange={event=>setBirthDate(event.target.value)} required/></label>}{flow.id==='tarot-crystal-soul'&&<label className="tarot-input-label">오늘 가장 끌리는 원석<select value={gem} onChange={event=>setGem(event.target.value)}><option value="amethyst">자수정</option><option value="rose-quartz">로즈쿼츠</option><option value="citrine">시트린</option></select></label>}<Button display="block" disabled={question.trim().length<2||(flow.id==='tarot-numerology'&&!birthDate)} onClick={()=>setDrawStarted(true)}>카드 펼치기</Button><Button variant="weak" display="block" onClick={reset}>리딩 목록</Button></section>;
  return <section className="tarot-library"><h1>{flow.name}</h1><p className="intro">카드를 순서대로 열어 보세요.</p><TarotDeck flow={flow} picks={picks} onChange={setPicks} onComplete={()=>isFree(flow)?setResult(localResult(flow,question,picks,shuffledDeck)):setPaidReady(true)}/></section>;
}

function TarotDeck({flow,picks,onChange,onComplete}:{flow:Flow;picks:number[];onChange:(next:number[])=>void;onComplete:()=>void}){
  const ready=picks.length===flow.cardCount;
  return <><p role="status">{picks.length} / {flow.cardCount}장 선택{flow.positions[picks.length]?` · 다음 자리: ${flow.positions[picks.length][1]}`:''}</p><div className="tarot-deck" aria-label="뒤집힌 타로 카드">
    {Array.from({length:Math.min(deck.length,24)},(_,slot)=>{const index=picks.indexOf(slot);return <button type="button" key={slot} aria-label={`${slot+1}번째 카드${index>=0?` · ${index+1}번째로 선택됨`:''}`} aria-pressed={index>=0} disabled={index<0&&ready} onClick={()=>onChange(index>=0?picks.filter(value=>value!==slot):[...picks,slot])}><span aria-hidden>{index>=0?index+1:'✦'}</span></button>;})}
  </div><Button display="block" disabled={!ready} onClick={onComplete}>선택한 카드 열기</Button></>;
}
