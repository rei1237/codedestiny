import {lazy,Suspense} from 'react';
import {detectTarotCategory} from '../../../app/tarot/prompt-maker/utils/classifyTarotQuestion';
import type {TarotSpreadCategory} from '../../../app/tarot/prompt-maker/types';
import {SPREAD_LIBRARY,CATEGORY_LABEL} from '../../../app/tarot/prompt-maker/data/tarotSpreadLibrary';
import {resolveOracleConsultationTier} from '../../../lib/tarot/oracle-consultation-pricing.mjs';
import {buildAttunedDeck,TOPIC_LABELS} from '../../../lib/tarot/numerology-tarot.mjs';
import {CRYSTAL_SOUL_GEMS} from '../../../lib/tarot/crystal-soul-reading.mjs';
import {isFreeFortuneFeatureKey} from '../../../lib/payment/free-fortune-policy.mjs';
import {shuffleTarotDeck} from './tarot-deck';
import {TarotCover,CharacterGuide} from './Brand';
import {useEffect,useLayoutEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import {TextArea} from '@toss/tds-mobile';
import {Button} from './Button';
import {TOSS_TAROT_LIBRARY_FLOWS} from '../../../lib/tarot/toss-library-flows.mjs';
import {TAROT_CARDS} from '../../../lib/tarot/tarot-cards.mjs';
const CoreTarot=lazy(()=>import('./CoreTarot'));
import {api,getTossSessionRevision,onTossSessionRevisionChanged,purchaseTarotLibrary,paymentRequiresReview,tarotLibraryProducts,type TarotLibraryProduct} from './platform';
import TarotResultActions from './TarotResultActions';

const Lenormand=lazy(()=>import('./Lenormand'));

type Flow={id:string;name:string;access:'iap'|'free-local';featureKeys:string[];cardCount:number;positions:[string,string][];resultKind:string;inputLabel:string;inputHint:string};
type Card={code:string;nameKo:string;nameEn:string;keywords?:string[]};
type DrawnCard=Card&{orientation:'upright'|'reversed';position:string;positionLabel:string};
type ReadingSection={title:string;body:string};
type LocalResult={source?:string;spreadId?:string;category?:string;flowId:string;title:string;question:string;cards:DrawnCard[];opening?:string;summary?:string;advice?:string;renderer?:string;presentation?:{opening:string;summary:string;sections:ReadingSection[];actions:string[]}};
type StoredReading={flowId?:string;featureKey?:string;state:string;result:LocalResult|null;canRetryNow:boolean};

const flows=TOSS_TAROT_LIBRARY_FLOWS as Flow[];
const deck=TAROT_CARDS as Card[];
const isFree=(flow:Flow)=>flow.access==='free-local'||flow.featureKeys.some(isFreeFortuneFeatureKey);
const cardName=(card:DrawnCard)=>`${card.nameKo||card.nameEn}${card.orientation==='reversed'?' · 역방향':''}`;

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
    oracle:{eyebrow:'질문에 맞춰 펼친 카드의 답',cards:'질문을 따라 펼친 카드',sections:'오라클의 답장'},
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
  const [prompt,setPrompt]=useState('');
  const selectedSpread=SPREAD_LIBRARY.find(spread=>spread.id===result.spreadId);
  async function openPrompt(){
    if(!selectedSpread)return;
    const {buildOraclePrompt}=await import('../../../app/tarot/prompt-maker/utils/buildOraclePrompt');
    const cards=result.cards.map((card,index)=>({slotIndex:index+1,positionLabel:selectedSpread.positions[index].label,
      positionDescription:selectedSpread.positions[index].description,cardCode:card.code,cardNameKo:card.nameKo,
      cardNameEn:card.nameEn,keywords:card.keywords||[],orientation:card.orientation,orientationLabel:card.orientation==='upright'?'정방향' as const:'역방향' as const,image:'',focus:''}));
    setPrompt(buildOraclePrompt(selectedSpread,result.question,cards,{questionCategory:result.category&&Object.hasOwn(CATEGORY_LABEL,result.category)?result.category as TarotSpreadCategory:selectedSpread.category,locale:'ko'}).prompt);
  }
  return <section className={'tarot-result tarot-result--'+result.flowId}>
    {(result.source==='llm'||result.flowId==='tarot-prompt-maker')&&<p role="note">AI가 작성한 상담 결과예요.</p>}
    <p className="tarot-result-eyebrow">{labels.eyebrow}</p><h1>{result.title}</h1><p className="intro">{content.opening}</p>
    {content.summary&&<section className="paper tarot-summary"><h2>이번 리딩의 흐름</h2><p>{content.summary}</p></section>}
    {yearly&&<p className="muted">월별 카드를 눌러 각 시기의 흐름을 차례로 읽어 보세요.</p>}
    <h2 className="tarot-result-heading">{labels.cards}</h2>
    <div className={yearly?'tarot-result-cards tarot-result-cards--year':'tarot-result-cards'}>
      {result.cards.map((card,index)=><article className="tarot-result-card" key={card.position}>
        <small>{yearly?`${index+1}월 · `:''}{card.positionLabel}</small><h2>{cardName(card)}</h2>
        <p>{(card.keywords||[]).slice(0,3).join(' · ')||'카드가 비춘 현재의 조건'}</p>
      </article>)}
    </div>
    {content.sections.length>0&&<section className="tarot-service-sections"><h2>{labels.sections}</h2>{content.sections.map((section,index)=><article className="paper" key={`${index}-${section.title}`}><h3>{section.title}</h3>{section.body.split(/\n\n+/).map((paragraph,i)=><p key={i}>{paragraph}</p>)}</article>)}</section>}
    {content.actions.length>0&&<section className="paper"><h2>{result.flowId==='tarot-self-esteem'?'오늘 다시 세울 기준':'현실에서 참고할 행동'}</h2><ol>{content.actions.filter(Boolean).map((action,index)=><li key={index}>{action}</li>)}</ol></section>}
    {selectedSpread&&<section className="paper"><h2>오라클 프롬프트</h2>{prompt?<textarea aria-label="오라클 프롬프트 원문" value={prompt} readOnly rows={8}/>:<Button onClick={()=>void openPrompt()}>배열과 질문으로 만든 프롬프트 보기</Button>}</section>}
    <TarotResultActions title={result.title} summary={content.summary||content.sections[0]?.body.split(/\n\n+/)[0]||content.opening}/>
    <Button variant="weak" display="block" onClick={onRestart}>다른 질문으로 다시 보기</Button>
  </section>;
}

// One-time handoff for the guest who explicitly opens Toss Login from this draw.
let loginDraw:{oracleCategory:'auto'|TarotSpreadCategory;flowId:string;question:string;spreadId:string;picks:number[];deck:ReturnType<typeof shuffleTarotDeck<Card>>}|null=null;
export default function TarotLibrary({products,loggedIn,onLogin,onError,onBack,onRecovery,initialOrderId='',onRereadClosed}:{products:TarotLibraryProduct[];loggedIn:boolean;onLogin:()=>void;onError:(error:unknown)=>void;onBack:()=>void;onRecovery?:()=>void;initialOrderId?:string;onRereadClosed?:()=>void}){
  const sessionRevision=useSyncExternalStore(onTossSessionRevisionChanged,getTossSessionRevision,getTossSessionRevision),[acceptedRevision,setAcceptedRevision]=useState(sessionRevision);
  const purchaseCleanup=useRef<(()=>void)|null>(null),alive=useRef(false),requestEpoch=useRef(0),previousLogin=useRef(loggedIn),buyingRef=useRef(false);
  const stopPurchase=()=>{const cleanup=purchaseCleanup.current;purchaseCleanup.current=null;let failed=false;try{cleanup?.();}catch{failed=true;}return failed||paymentRequiresReview();};
  useLayoutEffect(()=>{alive.current=true;return()=>{alive.current=false;requestEpoch.current++;stopPurchase();};},[]);
  const [visibleProducts,setVisibleProducts]=useState(products),[priceMessage,setPriceMessage]=useState('');
  useEffect(()=>{setVisibleProducts(products);},[products]);
  useEffect(()=>{const leave=()=>{requestEpoch.current++;const needsReview=stopPurchase();setBuyingState(false);if(needsReview)setPaymentBlocked(true);};window.addEventListener('pagehide',leave);window.addEventListener('popstate',leave);return()=>{window.removeEventListener('pagehide',leave);window.removeEventListener('popstate',leave);};},[]);
  const [shuffledDeck,setShuffledDeck]=useState(()=>shuffleTarotDeck(deck));
  const [flowId,setFlowId]=useState(''),[question,setQuestion]=useState(''),[birthDate,setBirthDate]=useState(''),[gem,setGem]=useState('amethyst'),[drawStarted,setDrawStarted]=useState(false),[picks,setPicks]=useState<number[]>([]),[paidReady,setPaidReady]=useState(false),[buying,setBuying]=useState(false),[result,setResult]=useState<LocalResult|null>(null),[retryOrderId,setRetryOrderId]=useState(''),[restoring,setRestoring]=useState(false);
  const [numberTopic,setNumberTopic]=useState('general'),[numberName,setNumberName]=useState('');
  const setBuyingState=(value:boolean)=>{buyingRef.current=value;setBuying(value);};
  const [spreadId,setSpreadId]=useState(SPREAD_LIBRARY[0].id),[recoveredKey,setRecoveredKey]=useState('');
  const spread=SPREAD_LIBRARY.find(item=>item.id===spreadId)||SPREAD_LIBRARY[0];
  const [oracleCategory,setOracleCategory]=useState<'auto'|TarotSpreadCategory>('auto'),[allowReversed,setAllowReversed]=useState(true);
  const questionCategory=oracleCategory==='auto'?detectTarotCategory(question):oracleCategory;
  const tier=resolveOracleConsultationTier(spread.cardCount).featureKey;
  const flow=useMemo(()=>{
    const base=flows.find(item=>item.id===flowId);
    if(!base)return null;
    return base.resultKind==='oracle'?{...base,cardCount:spread.cardCount,positions:spread.positions.map((slot,index):[string,string]=>['slot_'+index,slot.label])}:base;
  },[flowId,spread]);
  const [recoveredOrderId,setRecoveredOrderId]=useState(''),[canResume,setCanResume]=useState(false),[paymentBlocked,setPaymentBlocked]=useState(()=>paymentRequiresReview());
  const loginForDraw=()=>{
    loginDraw={flowId,question,spreadId,oracleCategory,picks,deck:shuffledDeck};
    onLogin();
  };
  useLayoutEffect(()=>{
    const draft=loginDraw;loginDraw=null;
    if(!loggedIn||!draft||initialOrderId)return;
    setFlowId(draft.flowId);setQuestion(draft.question);setSpreadId(draft.spreadId);setOracleCategory(draft.oracleCategory);setPicks(draft.picks);
    setShuffledDeck(draft.deck);setDrawStarted(true);setPaidReady(true);
  },[]);
  const clearReading=()=>{setPriceMessage('');requestEpoch.current++;const cleanupFailed=stopPurchase();if(cleanupFailed)setPaymentBlocked(true);setBuyingState(false);setRestoring(false);setFlowId('');setRecoveredKey('');setOracleCategory('auto');setAllowReversed(true);setQuestion('');setNumberTopic('general');setNumberName('');setBirthDate('');setGem('amethyst');setDrawStarted(false);setPicks([]);setPaidReady(false);setResult(null);setRetryOrderId('');setRecoveredOrderId('');setCanResume(false);return cleanupFailed;};
  useLayoutEffect(()=>{if(acceptedRevision===sessionRevision)return;if(previousLogin.current){const cleanupFailed=clearReading();setVisibleProducts([]);setPaymentBlocked(cleanupFailed||paymentRequiresReview());}setAcceptedRevision(sessionRevision);},[acceptedRevision,sessionRevision]);
  const reset=()=>{if(buyingRef.current)return;clearReading();onRereadClosed?.();};
  const refreshProducts=async()=>{if(!loggedIn||buyingRef.current)return;const epoch=++requestEpoch.current,revision=sessionRevision;setBuyingState(true);setPriceMessage('');try{const latest=await tarotLibraryProducts();if(alive.current&&epoch===requestEpoch.current&&getTossSessionRevision()===revision){setVisibleProducts(latest);setPriceMessage('상품 정보를 다시 확인했어요.');}}catch(error){if(alive.current&&epoch===requestEpoch.current&&getTossSessionRevision()===revision){setPriceMessage('상품 정보를 확인하지 못했어요. 다시 시도해 주세요.');onError(error);}}finally{if(alive.current&&epoch===requestEpoch.current&&getTossSessionRevision()===revision)setBuyingState(false);}};
  const acceptStored=(stored:StoredReading,orderId:string)=>{
    if(stored.flowId)setFlowId(stored.flowId);
    if(stored.result){setResult(stored.result);return;}
    if(stored.state==='input_required'){
      if(stored.flowId==='tarot-prompt-maker'&&stored.featureKey){
        const first=SPREAD_LIBRARY.find(item=>resolveOracleConsultationTier(item.cardCount).featureKey===stored.featureKey);
        if(first){setSpreadId(first.id);setRecoveredKey(stored.featureKey);}
      }
      setRecoveredOrderId(orderId);setRetryOrderId('');return;}
    setRetryOrderId(orderId);setCanResume(stored.canRetryNow);
  };
  const resumeReading=async(orderId:string,body?:unknown,fromPurchase=false)=>{if(buyingRef.current&&!fromPurchase)return;
    const epoch=++requestEpoch.current;setBuyingState(true);
    try{const stored=await api<StoredReading>(`/tarot-library/results/${orderId}`,body);if(alive.current&&epoch===requestEpoch.current)acceptStored(stored,orderId);}
    catch(error){if(alive.current&&epoch===requestEpoch.current){setRetryOrderId(orderId);setCanResume(false);onError(error);}}
    finally{if(alive.current&&epoch===requestEpoch.current)setBuyingState(false);}
  };
  useEffect(()=>{
    if(!initialOrderId||!loggedIn)return;
    let active=true;setRestoring(true);setResult(null);setRetryOrderId('');setRecoveredOrderId('');
    void api<StoredReading>(`/tarot-library/results/${initialOrderId}`).then(stored=>{
      if(!active)return;
      acceptStored(stored,initialOrderId);
    }).catch(error=>{if(active){setRetryOrderId(initialOrderId);setCanResume(false);onError(error);}}).finally(()=>{if(active)setRestoring(false);});
    return()=>{active=false;};
  },[initialOrderId,loggedIn,sessionRevision]);
  const backState=useRef({flow,drawStarted,paidReady,result,retryOrderId,restoring,recoveredOrderId,reset});
  backState.current={flow,drawStarted,paidReady,result,retryOrderId,restoring,recoveredOrderId,reset};
  useEffect(()=>{const back=(event:Event)=>{if(event.defaultPrevented)return;if(buyingRef.current){event.preventDefault();return;}const state=backState.current;if(state.result||state.retryOrderId||state.restoring)return;if(state.paidReady){event.preventDefault();setPaidReady(false);return;}if(state.drawStarted){event.preventDefault();setDrawStarted(false);return;}if(state.flow&&!state.recoveredOrderId){event.preventDefault();state.reset();}};window.addEventListener('code-destiny:toss-back',back);return()=>window.removeEventListener('code-destiny:toss-back',back);},[]);
  const sessionLost=previousLogin.current&&!loggedIn;
  useEffect(()=>{if(previousLogin.current&&!loggedIn){const cleanupFailed=clearReading();setVisibleProducts([]);setPaymentBlocked(cleanupFailed||paymentRequiresReview());}previousLogin.current=loggedIn;},[loggedIn]);
  if(previousLogin.current&&acceptedRevision!==sessionRevision)return <section className="tarot-library"><p role="status">계정 상태를 다시 확인하고 있어요.</p></section>;
  if(sessionLost)return <section className="tarot-library"><p role="status">로그인 상태가 종료되어 이전 결과를 닫고 있어요.</p></section>;
  if(restoring)return <section className="tarot-library"><p role="status">저장된 타로 리딩을 다시 열고 있어요.</p></section>;
  if(result)return <Result result={result} onRestart={reset}/>;
  if(retryOrderId)return <section className="tarot-library"><h1>{flow?.name||'타로 리딩'}</h1><p className="notice" role="status">{canResume?'구매한 리딩을 이어서 만들 수 있어요. 추가 결제는 필요하지 않아요.':'저장된 결과와 진행 상태를 다시 확인해 주세요. 결제 내역과 접근 권한을 확인해 주세요.'}</p><Button display="block" loading={buying} disabled={buying} onClick={()=>void resumeReading(retryOrderId,canResume?{}:undefined)}>{canResume?'추가 결제 없이 이어서 생성':'진행 상태 확인하기'}</Button><Button variant="weak" display="block" disabled={buying} onClick={reset}>리딩 목록</Button></section>;
  if(flow?.access==='free-local'&&!recoveredOrderId)return <Suspense fallback={<p role="status">카드를 준비하고 있어요.</p>}><CoreTarot id={flow.id} onBack={reset}/></Suspense>;
  if(flowId==='lenormand')return <Suspense fallback={<p role="status">카드를 준비하고 있어요.</p>}><Lenormand onBack={reset}/></Suspense>;
  if(!flow)return <section className="tarot-library"><TarotCover/><h1>카드에 담긴, 나의 이야기</h1><p className="intro">마음에 걸리는 질문을 고르고, 카드가 비추는 흐름과 현실적인 다음 행동을 살펴보세요.</p><div className="tarot-library-list">
    {flows.map(item=><button className="tarot-library-item" key={item.id} onClick={()=>{setShuffledDeck(shuffleTarotDeck(deck));setFlowId(item.id);setQuestion('');setDrawStarted(false);setPicks([]);setPaidReady(false);}}><img className="tarot-list-art" src={`/assets/${item.id}-320.webp`} alt="" width={88} height={72} loading="lazy" decoding="async"/><span><strong>{item.name}</strong><small>{item.resultKind==='oracle'?'1~14':item.cardCount}장 펼침 · {isFree(item)?'바로 펼치는 리딩':'단건 리딩'}</small></span><span aria-hidden>›</span></button>)}
    <button className="tarot-library-item" onClick={()=>setFlowId('lenormand')}><img className="tarot-list-art" src="/assets/tarot-prompt-maker-320.webp" alt="" width={88} height={72}/><span><strong>레노먼드 6장 흐름</strong><small>36장의 상징 · 무료 프롬프트</small></span><span aria-hidden>›</span></button>
  </div><Button variant="weak" display="block" onClick={onBack}>홈으로 돌아가기</Button></section>;
  const readingInput=()=>['mindscan','relationship'].includes(flow.resultKind)?{question,picks}:{question,...(flow.resultKind==='oracle'?{spreadId:spread.id,spreadTitle:spread.title,category:questionCategory}:{}),cards:picks.map((slot,index)=>{
    const drawn=shuffledDeck[flow.id==='tarot-numerology'?index:slot];
    return {cardId:drawn.code,orientation:drawn.orientation,position:flow.positions[index][0],positionLabel:flow.positions[index][1],...(flow.resultKind==='oracle'?{positionDescription:spread.positions[index].description}:{})};
  }),...(flow.resultKind==='celestial'?{goldenCardId:shuffledDeck[11].code}:{}),...(flow.id==='tarot-numerology'?{birthDate,topic:numberTopic,name:numberName}:{}),...(flow.id==='tarot-crystal-soul'?{gem}:{})};
  const finishDraw=async()=>{
    if(recoveredOrderId||!isFree(flow)){setPaidReady(true);return;}
    if(buyingRef.current)return;
    const epoch=++requestEpoch.current;setBuyingState(true);
    try{const {buildPublicTarotReading}=await import('../../../lib/tarot/toss-public-readings.mjs');const reading=buildPublicTarotReading(flow.id,readingInput());if(alive.current&&epoch===requestEpoch.current)setResult(reading);}
    catch(error){if(alive.current&&epoch===requestEpoch.current)onError(error);}
    finally{if(alive.current&&epoch===requestEpoch.current)setBuyingState(false);}
  };
  if(paidReady){
    const product=visibleProducts.find(item=>item.id===flow.id&&item.sku&&(flow.resultKind==='oracle'?item.featureKey===tier:flow.featureKeys.includes(item.featureKey))&&item.displayAmount&&Number.isSafeInteger(item.approvedPriceKRW)&&item.approvedPriceKRW>0);
    const input=readingInput();
    if(recoveredOrderId)return <section className="tarot-library"><h1>{flow.name}</h1><p>이미 구매한 리딩에 질문과 카드를 연결할게요. 추가 결제는 필요하지 않아요.</p><Button display="block" loading={buying} disabled={buying} onClick={()=>void resumeReading(recoveredOrderId,{input})}>구매한 리딩 이어서 보기</Button></section>;
    return <section className="tarot-library"><h1>{flow.name}</h1><p className="intro">{flow.resultKind==='celestial'?'11개 행성과 황금 통합 카드의 배열을 준비했어요.':`선택한 ${flow.cardCount}장의 카드와 질문을 확인했어요.`}</p><section className="paper"><h2>단건 리딩 준비 완료</h2><p>선택한 카드와 질문으로 리딩을 만들어요. 완성된 결과는 같은 토스 계정의 기록 보관함에서 다시 열 수 있어요.</p></section>{paymentBlocked?<div role="status"><p>추가 결제 전에 구매 내역을 확인해 주세요.</p>{onRecovery&&<Button display="block" onClick={onRecovery}>구매 복구 열기</Button>}</div>:!product?<div className="notice"><p>이 리딩의 승인된 토스 상품을 확인하고 있어요. 현재는 결제를 시작하지 않아요.</p>{!loggedIn&&<Button display="block" onClick={loginForDraw}>토스 로그인하고 상품 확인하기</Button>}{loggedIn&&<Button display="block" loading={buying} disabled={buying} onClick={()=>void refreshProducts()}>상품 다시 확인하기</Button>}</div>:!loggedIn?<Button display="block" onClick={loginForDraw}>토스 로그인하고 이어가기</Button>:<Button display="block" loading={buying} disabled={buying} onClick={()=>{if(buyingRef.current)return;setBuyingState(true);setPriceMessage('');const epoch=++requestEpoch.current;void (async()=>{try{const latest=await tarotLibraryProducts();if(!alive.current||epoch!==requestEpoch.current)return;const selected=latest.find(item=>item.id===product.id&&item.featureKey===product.featureKey);if(!selected||!selected.sku||!selected.featureKey||!selected.displayAmount||!Number.isSafeInteger(selected.approvedPriceKRW)||selected.approvedPriceKRW<=0||selected.sku!==product.sku||selected.featureKey!==product.featureKey||selected.displayAmount!==product.displayAmount||selected.approvedPriceKRW!==product.approvedPriceKRW){setVisibleProducts(latest);setBuyingState(false);setPriceMessage('상품 정보가 바뀌었어요. 표시된 금액을 확인한 뒤 다시 선택해 주세요.');return;}if(stopPurchase()){setBuyingState(false);setPaymentBlocked(true);return;}purchaseCleanup.current=purchaseTarotLibrary(selected,input,orderId=>{if(alive.current&&epoch===requestEpoch.current)void resumeReading(orderId,{},true);},error=>{if(alive.current&&epoch===requestEpoch.current){setBuyingState(false);if(paymentRequiresReview())setPaymentBlocked(true);onError(error);}});}catch(error){if(alive.current&&epoch===requestEpoch.current){setBuyingState(false);if(typeof error==='object'&&error&&'code' in error&&['PAYMENT_STATUS_UNCERTAIN','RECOVERY_REQUIRED','RECOVERY_IN_PROGRESS','PAYMENT_IN_PROGRESS'].includes(String(error.code)))setPaymentBlocked(true);onError(error);}}})();}}>{product.displayAmount} 단건 리딩 시작</Button>}{priceMessage&&<p role="alert">{priceMessage}</p>}<Button variant="weak" display="block" disabled={buying} onClick={reset}>다른 리딩 살펴보기</Button></section>;
  }
  const startDraw=()=>{
    if(flow.resultKind==='celestial'){setShuffledDeck(shuffleTarotDeck(deck.filter(card=>/^M\d{2}$/.test(card.code))));setPicks(Array.from({length:11},(_,i)=>i));setPaidReady(true);return;}
    if(flow.resultKind==='oracle'){setPicks([]);setShuffledDeck(shuffleTarotDeck(deck).map(card=>({...card,orientation:allowReversed&&Math.random()<0.35?'reversed':'upright'})));}
    if(flow.id==='tarot-numerology'){
      const attuned=buildAttunedDeck({birthDate,topic:numberTopic,name:numberName,sessionSeed:crypto.randomUUID()});
      setShuffledDeck(attuned.order.map(({card,orientation})=>({...deck.find(item=>item.code==='M'+String(card.id).padStart(2,'0'))!,orientation:orientation==='reversed'?'reversed':'upright'})));
    }
    setDrawStarted(true);
  };
  if(!drawStarted)return <section className="tarot-library floral-form"><TarotCover flowId={flow.id}/><h1>{flow.name}</h1><p className="intro">{flow.inputHint||(flow.resultKind==='celestial'?'태양부터 카이론까지, 행성마다 놓인 카드에서 지금의 흐름을 읽어요.':'질문을 적고 카드를 직접 펼쳐 보세요. 출생정보는 필요하지 않아요.')}</p>{flow.resultKind==='celestial'?<CharacterGuide title="행성의 선율">메이저 아르카나에서 행성 11장과 배열 전체를 잇는 황금 통합 카드 한 장을 펼쳐요.</CharacterGuide>:<CharacterGuide title="마음에 남은 질문 하나부터">지금의 상황과 궁금한 점을 적어 주세요. 꽃돼지 연이가 카드 펼침을 안내할게요.</CharacterGuide>}{flow.resultKind==='oracle'&&<><label className="tarot-input-label">질문 분야<select value={oracleCategory} onChange={event=>setOracleCategory(event.target.value as 'auto'|TarotSpreadCategory)}><option value="auto">질문에서 찾기</option>{Object.entries(CATEGORY_LABEL).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><label className="tarot-input-label">질문에 맞는 카드 배열<select value={spreadId} onChange={event=>{setSpreadId(event.target.value);setPicks([]);}}>{SPREAD_LIBRARY.filter(item=>!recoveredKey||resolveOracleConsultationTier(item.cardCount).featureKey===recoveredKey).map(item=><option key={item.id} value={item.id}>{CATEGORY_LABEL[item.category]} · {item.title} · {item.cardCount}장</option>)}</select><small>{spread.purpose}</small></label><label><input type="checkbox" checked={allowReversed} onChange={event=>setAllowReversed(event.target.checked)}/> 역방향 카드 포함</label></>}{!isFree(flow)&&<p role="note">이 상담은 AI를 활용해 작성해요.</p>}{flow.resultKind!=='celestial'&&<TextArea variant="box" label={flow.inputLabel} aria-label={flow.inputLabel} labelOption="sustain" value={question} onChange={event=>setQuestion(event.target.value)} maxLength={600}/>}{flow.id==='tarot-numerology'&&<><label className="tarot-input-label">상담 주제<select value={numberTopic} onChange={event=>setNumberTopic(event.target.value)}>{Object.entries(TOPIC_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label className="tarot-input-label">이름 또는 별명 (선택)<input value={numberName} maxLength={60} onChange={event=>setNumberName(event.target.value)}/></label><label className="tarot-input-label">생년월일<input type="date" value={birthDate} onChange={event=>setBirthDate(event.target.value)} required/></label></>}{flow.id==='tarot-crystal-soul'&&<label className="tarot-input-label">오늘 가장 끌리는 원석<select value={gem} onChange={event=>setGem(event.target.value)}>{Object.entries(CRYSTAL_SOUL_GEMS).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>}<Button display="block" disabled={(flow.resultKind!=='celestial'&&question.trim().length<2)||(flow.id==='tarot-numerology'&&!birthDate)} onClick={startDraw}>카드 펼치기</Button><Button variant="weak" display="block" disabled={buying} onClick={reset}>리딩 목록</Button></section>;
  return <section className="tarot-library"><h1>{flow.name}</h1><p className="intro">카드를 순서대로 열어 보세요.</p><TarotDeck slots={shuffledDeck.length} loading={buying} flow={flow} picks={picks} onChange={setPicks} onComplete={()=>void finishDraw()}/></section>;
}

function TarotDeck({flow,picks,onChange,onComplete,slots,loading}:{slots:number;loading:boolean;flow:Flow;picks:number[];onChange:(next:number[])=>void;onComplete:()=>void}){
  const ready=picks.length===flow.cardCount;
  return <><p role="status">{picks.length} / {flow.cardCount}장 선택{flow.positions[picks.length]?` · 다음 자리: ${flow.positions[picks.length][1]}`:''}</p><div className="tarot-deck" aria-label="뒤집힌 타로 카드">
    {Array.from({length:['mindscan','relationship'].includes(flow.resultKind)?slots:Math.min(slots,24)},(_,slot)=>{const index=picks.indexOf(slot);return <button type="button" key={slot} aria-label={`${slot+1}번째 카드${index>=0?` · ${index+1}번째로 선택됨`:''}`} aria-pressed={index>=0} disabled={loading||(index<0&&ready)} onClick={()=>onChange(index>=0?picks.filter(value=>value!==slot):[...picks,slot])}><span aria-hidden>{index>=0?index+1:'✦'}</span></button>;})}
  </div><Button display="block" disabled={loading||!ready} loading={loading} onClick={onComplete}>선택한 카드 열기</Button></>;
}
