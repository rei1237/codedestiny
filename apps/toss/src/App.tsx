import UnifiedHome from './UnifiedHome';
import {AdviserChoices,AdviserPortrait,CharacterGuide,PaymentIdentity,FloralInputWelcome,advisers,type AdviserId} from './Brand';
import type {ReadingChart} from './ResultEvidence';
import TarotDraw,{type TarotSpreadView} from './TarotDraw';
import {yeongnyangiSpreads as canonicalTarotSpreads} from '../../../lib/tarot/yeongnyangi-spread-catalog.mjs';
import {TOSS_TAROT_LIBRARY_FLOWS} from '../../../lib/tarot/toss-library-flows.mjs';
import {Followup,type Conversation} from './Followup';
import {SERVICE_AVAILABLE} from './release';
import {BirthFields,emptyBirth,birthPayload} from './BirthFields';
import {QUESTION_POLICY_VERSION,questionTopics,recommendQuestion,type QuestionDecision} from '../../../worker/yeongnyangi/fortune/ask/question-policy';
import {lazy,Suspense,useEffect,useRef,useState,type FormEvent} from 'react';
import {TextField,TextArea} from '@toss/tds-mobile';
import {Button} from './Button';
import {SafeArea,Screen,graniteEvent} from '@apps-in-toss/web-framework';
import {api,ApiError,isToss,login,logout,restoreSession,saleProducts,tarotLibraryProducts,purchase,restorePurchases,clearSession,event,type SaleProduct,type TarotLibraryProduct} from './platform';
import {errors,questions,readings,birthSystems,consultationServices,selectionFor} from './content';

const ResultEvidence=lazy(()=>import('./ResultEvidence'));
const BiasReading=lazy(()=>import('./BiasReading'));
const FlowerReading=lazy(()=>import('./FlowerReading'));
const TarotLibrary=lazy(()=>import('./TarotLibrary'));
const ManseReading=lazy(()=>import('./ManseReading'));
const DailyReadings=lazy(()=>import('./DailyReadings'));
const yeongnyangiSpreads=canonicalTarotSpreads as {id:string;title:string;summary:string;cardCount:number;requiredInputs:string[];topic:string}[];
const tarotLibraryTitle=new Map((TOSS_TAROT_LIBRARY_FLOWS as readonly {id:string;name:string}[]).map(flow=>[flow.id,flow.name]));

type Page='manse'|'daily'|'draw'|'flower'|'bias'|'tarot-library'|'home'|'catalog'|'product'|'birth'|'login'|'purchase'|'result'|'library'|'recovery'|'settings'|'terms'|'support'|'withdraw'|'example';
type Chapter={title:string;summary:string;analysis:string[];advice?:string;example?:string;persona?:string;blocks?:{id:string;title:string;paragraphs:string[]}[];questionAnswers?:{answer:string;reason?:string;basis?:string;timing:string;action:string;review:string}[]};
type Result={charts?:ReadingChart[];serviceId?:string;conversation?:Conversation;id:string;state:string;chapters:Chapter[];manifest:{id:string;title:string}[];recovery:{savedChapters:number;totalChapters:number;canRetryNow:boolean;reviewRequired:boolean};errorCode?:string};
type Purchase={nativeService?:string;href?:string;serviceId:string;selectionId:string;orderId:string;sku:string;productId:string;requestId:string|null;status:string;state:string;completedSections:number;totalSections:number|null;createdAt:string};
const allowedPages=new Set<Page>(['manse','daily','draw','flower','bias','tarot-library','home','catalog','product','birth','login','purchase','result','library','recovery','settings','terms','support','withdraw','example']);
function currentPage():Page {
  const value=location.pathname.replace(/^\/|\/$/g,'');
  if(['privacy-policy','refund-policy'].includes(value))return 'terms';
  if(value==='contact')return 'support';
  return allowedPages.has(value as Page)?value as Page:'home';
}

export default function App(){
  const [page,setPage]=useState<Page>(currentPage),[selected,setSelected]=useState(()=>new URLSearchParams(location.search).get('product')||readings[0].id);
  const selectedReading=readings.find(r=>r.id===selected)||readings[0];
  const activeDomain=selectedReading.domain;
  const activeService=selectedReading.serviceId;
  const isTarot=activeDomain==='tarot';
  const [spreadId,setSpreadId]=useState(yeongnyangiSpreads[0].id);
  const [tarotOptions,setTarotOptions]=useState({a:'',b:'',period:'week',relationStatus:'dating'});
  const [question,setQuestion]=useState(''),[topic,setTopic]=useState<QuestionDecision['category']>('self'),[loggedIn,setLoggedIn]=useState(false);
  const [products,setProducts]=useState<SaleProduct[]>([]),[tarotProducts,setTarotProducts]=useState<TarotLibraryProduct[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const [purchasing,setPurchasing]=useState(false);
  const [birth,setBirth]=useState(emptyBirth);
  const [partner,setPartner]=useState(emptyBirth);
  const [scope,setScope]=useState({situation:'',options:'',period:'',constraints:'',relationshipType:''});
  const decision:QuestionDecision={version:QUESTION_POLICY_VERSION,category:topic,target:selected.endsWith('_flounder')?'pair':'self',horizon:selected.endsWith('_tuna')?'transition':'current',situation:scope.situation,options:scope.options,period:scope.period,constraints:scope.constraints,...(scope.relationshipType?{relationshipType:scope.relationshipType as QuestionDecision['relationshipType']}:{ }),confirmed:false};
  const plan=recommendQuestion(activeDomain,decision,question);
  const [draft,setDraft]=useState<{id:string;amountKRW:number;manifest:{title:string}[];state?:string;tarotSpread?:TarotSpreadView}|null>(null);
  const [resultId,setResultId]=useState(()=>new URLSearchParams(location.search).get('id')||''),[result,setResult]=useState<Result|null>(null);
  const [libraryState,setLibraryState]=useState<'loading'|'ready'|'error'>('loading');
  const [library,setLibrary]=useState<Purchase[]>([]),[restoredOrder,setRestoredOrder]=useState<Purchase|null>(null),[tarotLibraryOrderId,setTarotLibraryOrderId]=useState('');
  const [libraryCursor,setLibraryCursor]=useState<string|null>(null);
  const libraryEpoch=useRef(0);
  const [agreed,setAgreed]=useState(false),[returnAfterLogin,setReturnAfterLogin]=useState<Page>('library');
  const cleanPurchase=useRef<(()=>void)|null>(null),attempt=useRef(crypto.randomUUID()),titleRef=useRef<HTMLHeadingElement>(null),depth=useRef(0);
  const reading=readings.find(p=>p.id===selected)||readings[0],sale=products.find(p=>p.id===selected);
  function go(next:Page,query=''){if(!query&&['catalog','product','birth','login','draw','purchase'].includes(next))query='?product='+encodeURIComponent(selected);history.pushState({},'',`/${next==='home'?'':next}${query||(next==='result'&&resultId?'?id='+encodeURIComponent(resultId):'')}`);depth.current++;setPage(next);setMessage('');window.scrollTo(0,0);}
  function failure(error:unknown){
    const code=error instanceof ApiError?error.code:typeof error==='object'&&error&&'code' in error?String(error.code):'REQUEST_FAILED';
    setMessage((errors[code]||errors.REQUEST_FAILED)+(error instanceof ApiError&&error.errorId?` 오류번호: ${error.errorId}`:''));
    if(error instanceof ApiError&&error.status===401){setLoggedIn(false);setResult(null);setLibrary([]);setDraft(null);setQuestion('');setBirth(emptyBirth());setPartner(emptyBirth());setScope({situation:'',options:'',period:'',constraints:'',relationshipType:''});}
  }
  async function run(task:()=>Promise<void>){if(busy)return;setBusy(true);setMessage('');try{await task();}catch(error){failure(error);}finally{setBusy(false);}}
  function requireLogin(next:Page){if(loggedIn){go(next);return;}setReturnAfterLogin(next);go('login');}
  useEffect(()=>{
    function pop(){depth.current=Math.max(0,depth.current-1);setPage(currentPage());const params=new URLSearchParams(location.search);setResultId(params.get('id')||'');const product=params.get('product');if(readings.some(r=>r.id===product))setSelected(product!);}
    window.addEventListener('popstate',pop);
    let offBack=()=>{},offHome=()=>{},offArea=()=>{};
    if(isToss()){
      const area=(insets:{bottom:number})=>document.documentElement.style.setProperty('--safe-bottom',`${insets.bottom}px`);
      area(SafeArea.get());offArea=SafeArea.subscribe({onEvent:area});
      offBack=graniteEvent.addEventListener('backEvent',{onEvent:()=>{if(depth.current>0)history.back();else void Screen.close();}});
      offHome=graniteEvent.addEventListener('homeEvent',{onEvent:()=>go('home')});
      SERVICE_AVAILABLE&&void restoreSession().then(setLoggedIn).catch(failure);
      void saleProducts().then(setProducts).catch(failure);
      void tarotLibraryProducts().then(setTarotProducts).catch(failure);
    }
    event('home_view',{screen:'home'});
    return()=>{window.removeEventListener('popstate',pop);offBack();offHome();offArea();cleanPurchase.current?.();};
  },[]);
  useEffect(()=>{titleRef.current?.focus({preventScroll:true});},[page]);
  useEffect(()=>{
    if(page!=='library'||!loggedIn)return;
    let live=true;libraryEpoch.current++;setLibraryState('loading');setLibraryCursor(null);
    api<{purchases:Purchase[];nextCursor:string|null}>('/library').then(data=>{if(live){setLibrary(data.purchases);setLibraryCursor(data.nextCursor);setLibraryState('ready');}}).catch(error=>{if(live){setLibraryState('error');failure(error);}});
    return()=>{live=false;libraryEpoch.current++;};
  },[page,loggedIn]);
  useEffect(()=>{
    if(page!=='result'||!resultId||!loggedIn)return;
    let live=true,timer:ReturnType<typeof setTimeout>;
    async function read(){
      try{
        const data=await api<Result>(`/results/${resultId}`);if(!live)return;setResult(data);
        if(!['COMPLETED','REFUNDED'].includes(data.state)&&!data.recovery.reviewRequired)timer=setTimeout(()=>{if(!document.hidden)void read();},10000);
      }catch(error){if(live)failure(error);}
    }
    const visible=()=>{if(!document.hidden){clearTimeout(timer);void read();}};
    void read();document.addEventListener('visibilitychange',visible);
    return()=>{live=false;clearTimeout(timer);document.removeEventListener('visibilitychange',visible);};
  },[page,resultId,loggedIn]);
  function choose(id:string){setSelected(id);setDraft(null);setRestoredOrder(null);attempt.current=crypto.randomUUID();go('product',`?product=${id}`);event('product_view',{productId:id,screen:'product'});}
  async function prepare(){
    if(!sale)throw new ApiError('TOSS_RELEASE_PENDING');
    if(plan.unsupported||plan.missing.length||selected!==selectionFor(activeService,activeDomain,plan.fish))throw new ApiError('QUESTION_SCOPE_REQUIRED');
    const data=await api<{id:string;amountKRW:number;manifest:{title:string}[];state?:string;tarotSpread?:TarotSpreadView}>('/prepare',{sku:sale.sku,attemptId:attempt.current,
      question,questionDecision:{...decision,confirmed:true},...(isTarot?{tarotSpreadId:spreadId,tarotInputs:{options:{a:tarotOptions.a,b:tarotOptions.b},period:tarotOptions.period,relationStatus:tarotOptions.relationStatus}}:{birth:birthPayload(birth),...(decision.target==='pair'?{partnerBirth:birthPayload(partner)}:{})})});
    if(data.amountKRW!==sale.approvedPriceKRW)throw new ApiError('PRODUCT_PRICE_CHANGED');
    setDraft(data);go(data.state==='AWAITING_DRAW'?'draw':'purchase');
  }
  function submitBirth(e:FormEvent){e.preventDefault();event('birth_completed',{productId:selected});
    if(!loggedIn){setReturnAfterLogin('birth');go('login');}else void run(prepare);
  }
  const heading=(eyebrow:string,title:string,description?:string)=><><p className="eyebrow">{eyebrow}</p><h1 ref={titleRef} tabIndex={-1}>{title}</h1>{description&&<p className="intro">{description}</p>}</>;
  const support=<Button size="medium" variant="weak" onClick={()=>go('support')}>고객지원</Button>;
  const example=<Button variant="weak" display="block" onClick={()=>{go('example');event('example_view',{productId:selected});}}>결과 예시 보기</Button>;
  const items=<div className="reading-list">{readings.filter(p=>p.domain===activeDomain&&p.serviceId===activeService).map(p=><button className="reading" key={p.id} onClick={()=>choose(p.id)}><span><small>{p.tag}</small><strong>{p.name}</strong><span>{p.description}</span></span><span aria-hidden>›</span></button>)}</div>;
  const themePage=page==='login'?returnAfterLogin:page;
  const theme=['flower','bias','tarot-library','manse'].includes(themePage)?'ggulggul':themePage==='daily'||themePage==='home'?'yeongnyangi':page==='result'&&result?.serviceId?result.serviceId:activeService;
  return <main className={`page-${page} adviser-${theme}`}>
    {!SERVICE_AVAILABLE?<div className="preview-note">출시 전 화면 테스트 · 로그인·구매·상담 생성은 아직 제공하지 않아요</div>:!isToss()&&<div className="preview-note">브라우저 미리보기 · 로그인과 구매는 토스 앱에서 가능해요</div>}
    {message&&<div role="alert" className="notice">{message}<Button size="small" variant="weak" onClick={()=>setMessage('')}>닫기</Button></div>}
    {import.meta.env.DEV&&<a className="test-entry" href="/test/playground.html">직접 테스트하기 · 가능한 기능 확인</a>}
    {page==='manse'&&<Suspense fallback={<p role="status">만세력을 준비하고 있어요.</p>}><ManseReading loggedIn={loggedIn} onLogin={()=>requireLogin('manse')} onError={failure}/></Suspense>}
    {page==='daily'&&<Suspense fallback={<p role="status">오늘의 이야기를 준비하고 있어요.</p>}><DailyReadings loggedIn={loggedIn} onLogin={()=>requireLogin('daily')} onError={failure}/></Suspense>}
    {page==='bias'&&<Suspense fallback={<p role="status">최애운명 화면을 불러오고 있어요.</p>}><BiasReading/></Suspense>}
    {page==='flower'&&<Suspense fallback={<p role="status">운명의 꽃 화면을 불러오고 있어요.</p>}><FlowerReading loggedIn={loggedIn} onLogin={()=>requireLogin('flower')} onError={failure}/></Suspense>}
    {page==='tarot-library'&&<Suspense fallback={<p role="status">타로 리딩을 준비하고 있어요.</p>}><TarotLibrary products={tarotProducts} loggedIn={loggedIn} onLogin={()=>requireLogin('tarot-library')} onError={failure} onBack={()=>go('home')} initialOrderId={tarotLibraryOrderId} onRereadClosed={()=>setTarotLibraryOrderId('')}/></Suspense>}
    {page==='draw'&&(draft?.tarotSpread?<TarotDraw key={draft.id} spread={draft.tarotSpread} busy={busy} onConfirm={picks=>void run(async()=>{
      if(!sale)throw new ApiError('TOSS_PRODUCT_NOT_APPROVED');
      const drawn=await api<{id:string;state:string;tarotSpread:TarotSpreadView}>(`/prepared/${draft.id}/draw`,{sku:sale.sku,method:'manual',picks});
      if(drawn.id!==draft.id||drawn.state!=='CREATED'||!drawn.tarotSpread.drawn)throw new ApiError('TAROT_DRAW_NOT_AVAILABLE');
      setDraft({...draft,...drawn});go('purchase');
    })}/>:<><h1>상담을 먼저 준비해 주세요</h1><Button onClick={()=>go('catalog')}>상담 선택하기</Button></>)}
    {page==='home'&&<UnifiedHome onOpen={destination=>destination==='library'?requireLogin('library'):go(destination)} onConsult={(service,q)=>{if(service==='love-secret'){location.assign('/love-secret-ai/');return;}if(service==='life-book'){location.assign('/life-book-ai/');return;}if(service==='fusion'){location.assign('/fusion-fortune/');return;}if(service==='yeongnyangi'||service==='yeoni'||service==='neo'){location.assign(service==='yeoni'?'/fortune-tea-house/':service==='neo'?'/neo-operation-room/':'/yeongnyangi/fortune/');return;}const target=selectionFor(service,'saju','mackerel')!;setSelected(target);setDraft(null);setRestoredOrder(null);if(q){setQuestion(q.title);setTopic(q.topic as QuestionDecision['category']);}go('catalog','?product='+encodeURIComponent(target));}}/>}
    {page==='catalog'&&<>{heading('상담 선택','어디까지 살펴볼까요?',question||'궁금한 질문에 맞는 상담을 선택해 주세요.')}<details className="adviser-switch"><summary>상담가 · {advisers[activeService as AdviserId].name} — 변경하기</summary><p className="muted">상담가에 따라 말투와 조언의 관점이 달라요. 아래에서 분석 체계를 따로 선택할 수 있어요.</p><AdviserChoices selected={activeService} onChoose={id=>{setSelected(selectionFor(id,activeDomain,'mackerel')!);setDraft(null);setRestoredOrder(null);}}/></details><div className="adviser-message"><strong>{advisers[activeService as AdviserId].message}</strong><p>{consultationServices.find(service=>service.id===activeService)?.description}</p></div><label>분석 체계<select value={activeDomain} onChange={e=>{setSelected(selectionFor(activeService,e.target.value,'mackerel')!);setDraft(null);}}>{birthSystems.map(system=><option key={system.id} value={system.id}>{system.name}</option>)}</select></label>{items}<p className="muted">각 체계의 계산 근거로 질문을 살펴봐요. 선택한 상품의 제공 항목은 구매 전에 확인할 수 있어요.</p></>}
    {page==='product'&&<>{heading(reading.tag,reading.name,reading.description)}<p className="consultation-owner">{reading.serviceName}</p><AdviserPortrait id={activeService}/><section className="paper"><h2>이런 이야기를 살펴봐요</h2><p>질문에 대한 핵심 답변, {reading.systemName}에서 읽은 근거, 해당하는 시기의 흐름, 현실에서 확인할 일과 상세 해석을 담아요.</p><p>{isTarot?'정확한 제공 항목은 질문과 카드 펼침을 확인한 뒤 결제 전에 보여드려요.':'정확한 제공 항목은 질문과 출생정보를 확인한 뒤 결제 전에 보여드려요.'}</p><p>{isTarot?'타로는 출생정보 없이 질문과 선택한 카드의 상징을 살펴봐요.':activeDomain==='saju'?'두 사람의 관계·장기 흐름 상담은 출생 시각이 필요해요. 시각을 모르면 한 가지 고민·선택과 준비 상담을 선택해 주세요.':'이 체계는 정확한 출생 시각과 지역이 필요해요. 모르는 시각을 임의로 입력하지 마세요.'}</p></section>{example}<section className="facts"><h2>구매 전에 확인해 주세요</h2><p>단건 구매로 상담 생성 1회 권한을 제공해요. 이미 구매한 상담의 복구에는 추가 결제가 필요하지 않아요.</p><p>결과는 서버에 저장되어 같은 토스 계정으로 다시 열 수 있어요. 생성 시간은 입력과 처리 상황에 따라 달라요.</p><p>투자 종목 추천, 수익 보장, 의료 진단이나 상대방의 속마음 확정은 제공하지 않아요.</p><p>생성이 멈추면 기록 보관함의 복구를 이용해 주세요. 제공이 어려운 경우 주문번호로 고객지원에 문의할 수 있어요.</p>{support}</section><div className="action"><PaymentIdentity serviceId={activeService} fish={reading.fish}/><strong>{sale?`${sale.displayAmount} · 단건 구매`:'상품 등록 확인 중'}</strong><Button display="block" onClick={()=>go('birth')}>{isTarot?'질문과 카드 펼침 선택하기':'질문과 출생정보 입력하기'}</Button></div></>}
    {page==='birth'&&<>{heading('상담 준비',isTarot?'어떤 질문으로 카드를 펼칠까요?':'누구의 이야기를 볼까요?',isTarot?'현재 상황과 궁금한 질문을 알려 주세요. 출생정보는 필요하지 않아요.':'토스 계정의 생일과 별개로, 풀이할 대상의 정보를 입력해 주세요. 이름은 필요하지 않아요.')}<p className="consultation-owner">{reading.serviceName} · {reading.name}</p><form onSubmit={submitBirth} className="form floral-form"><FloralInputWelcome/>
      <TextArea variant="box" label="궁금한 질문" aria-label="궁금한 질문" labelOption="sustain" value={question} onChange={e=>setQuestion(e.target.value)} required minLength={5} maxLength={600}/>
      <label>상담 주제<select value={topic} onChange={e=>setTopic(e.target.value as QuestionDecision['category'])}>{questionTopics.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
      <TextArea variant="box" label="현재 상황" aria-label="현재 상황" labelOption="sustain" value={scope.situation} onChange={e=>setScope({...scope,situation:e.target.value})} required maxLength={600}/>
      {(plan.fish==='salmon'||plan.fish==='tuna')&&<TextField variant="box" label="목표 시기 또는 살펴볼 기간" aria-label="목표 시기 또는 살펴볼 기간" labelOption="sustain" value={scope.period} onChange={e=>setScope({...scope,period:e.target.value})} required maxLength={600}/>}
      {plan.fish==='salmon'&&<><TextArea variant="box" label="선택지 또는 준비 목표" aria-label="선택지 또는 준비 목표" labelOption="sustain" value={scope.options} onChange={e=>setScope({...scope,options:e.target.value})} required maxLength={600}/><TextArea variant="box" label="중요한 조건과 제약 (없다면 없음)" aria-label="중요한 조건과 제약 (없다면 없음)" labelOption="sustain" value={scope.constraints} onChange={e=>setScope({...scope,constraints:e.target.value})} required maxLength={600}/></>}
      {decision.target==='pair'&&<label>두 사람의 관계<select required value={scope.relationshipType} onChange={e=>setScope({...scope,relationshipType:e.target.value})}><option value="">관계 유형 선택</option><option value="romantic_adults">성인 두 사람의 연애 관계</option><option value="family">가족</option><option value="other">친구·동료 등</option></select></label>}
      <p className="muted">선택한 범위: {reading.description}</p>
      {question.trim().length>=5&&scope.situation.trim()&&selected!==selectionFor(activeService,activeDomain,plan.fish)&&<div className="notice"><p>입력한 질문은 {readings.find(r=>r.id===selectionFor(activeService,activeDomain,plan.fish))?.name} 범위에 해당해요. 범위와 상품을 확인해 주세요.</p><Button variant="weak" onClick={()=>{setSelected(selectionFor(activeService,activeDomain,plan.fish)!);setDraft(null);}}>질문에 맞는 상담으로 변경</Button></div>}
      {plan.unsupported&&<p role="alert">{plan.unsupported}</p>}
      {isTarot&&<><label>카드 펼침<select value={spreadId} onChange={e=>setSpreadId(e.target.value)}>{yeongnyangiSpreads.map(spread=><option key={spread.id} value={spread.id}>{spread.title} · {spread.cardCount}장</option>)}</select></label><p>{yeongnyangiSpreads.find(spread=>spread.id===spreadId)?.summary}</p>
        {yeongnyangiSpreads.find(spread=>spread.id===spreadId)?.requiredInputs.includes('options')&&<><TextField variant="box" label="선택지 A" value={tarotOptions.a} required maxLength={40} onChange={e=>setTarotOptions({...tarotOptions,a:e.target.value})}/><TextField variant="box" label="선택지 B" value={tarotOptions.b} required maxLength={40} onChange={e=>setTarotOptions({...tarotOptions,b:e.target.value})}/></>}
        <label>살펴볼 기간<select value={tarotOptions.period} onChange={e=>setTarotOptions({...tarotOptions,period:e.target.value})}><option value="week">앞으로 일주일</option><option value="month">앞으로 한 달</option></select></label>
        {yeongnyangiSpreads.find(spread=>spread.id===spreadId)?.topic==='love'&&<label>현재 관계<select value={tarotOptions.relationStatus} onChange={e=>setTarotOptions({...tarotOptions,relationStatus:e.target.value})}><option value="dating">연애 중</option><option value="getting_to_know">알아가는 중</option><option value="one_sided">혼자 좋아하는 중</option><option value="separated">헤어진 뒤</option><option value="no_contact">연락이 끊긴 상태</option><option value="contact_refused">상대가 연락을 원하지 않는다고 했음</option><option value="married">함께 사는 중</option></select></label>}
        <p>출생정보는 수집하지 않아요. 결제 전에 직접 카드를 선택하고 확정해요.</p></>}
      {!isTarot&&<BirthFields title="나의 출생정보" value={birth} onChange={setBirth}/>}
      {!isTarot&&decision.target==='pair'&&<><p>상대방이 정보 제공에 동의했는지 확인해 주세요. 이름은 입력하지 않아요. 구매한 결과의 재열람과 복구에 필요한 정보로 보관돼요.</p><BirthFields title="상대방의 출생정보" value={partner} onChange={setPartner}/><label className="check"><input type="checkbox" required/>상대방의 출생정보 제공 동의를 확인했어요.</label></>}
      {!isTarot&&<p className="muted">현재 입력 화면은 위 국내 도시만 지원해요. 다른 지역을 임의로 선택하지 마세요.</p>}
      <label className="check"><input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} required/>AI 해석 안내와 필수 개인정보 처리 안내를 확인했어요.</label><Button variant="weak" onClick={()=>go('terms')}>약관과 개인정보 안내 보기</Button>
      {plan.missing.length>0&&<ul className="muted">{plan.missing.map(text=><li key={text}>{text}</li>)}</ul>}
      <Button type="submit" display="block" loading={busy} disabled={!agreed||plan.missing.length>0||!!plan.unsupported||selected!==selectionFor(activeService,activeDomain,plan.fish)||!isTarot&&(birth.unknown||decision.target==='pair'&&partner.unknown)&&(activeDomain!=='saju'||selected.endsWith('_flounder')||selected.endsWith('_tuna'))}>{loggedIn?'제공 항목 확인하기':'토스 로그인하고 이어가기'}</Button>
    </form></>}
    {page==='login'&&<>{heading('토스 로그인','상담을 안전하게 보관해요','구매와 기록을 본인 계정에 연결하기 위해 토스 로그인이 필요해요.')}<CharacterGuide id="yeongnyangi" title="이야기를 다시 찾을 수 있도록">로그인하면 같은 토스 계정의 구매와 기록을 확인할 수 있어요.</CharacterGuide><p>이름과 이메일은 받지 않아요. 기존 CODE DESTINY 웹 계정과 기록은 자동으로 합쳐지지 않아요.</p><Button display="block" loading={busy} onClick={()=>void run(async()=>{event('login_start');await login();setLoggedIn(true);go(returnAfterLogin);event('login_completed');})}>토스로 로그인하기</Button><Button display="block" variant="weak" onClick={()=>{event('login_cancelled');go('home');}}>지금은 둘러보기</Button></>}
    {page==='purchase'&&<>{heading('최종 확인',restoredOrder?'복구한 상담을 이어갈게요':'이 내용으로 상담할까요?')}{draft&&sale?<><section className="paper"><h2>{reading.serviceName} · {reading.name}</h2><ol>{draft.manifest.map((item,i)=><li key={i}>{item.title}</li>)}</ol><p>상담 생성 1회 · 결과 보관과 재열람 포함</p><PaymentIdentity serviceId={activeService} fish={reading.fish}/><strong className="price">{restoredOrder?'이미 구매한 권한 사용':sale.displayAmount}</strong></section><p>생성 중 나가도 기록 보관함에서 이어볼 수 있어요. 실제 완료된 항목을 차례로 보여드려요.</p><Button display="block" loading={busy||purchasing} disabled={purchasing} onClick={()=>void run(async()=>{
      if(restoredOrder){await api('/orders/grant',{orderId:restoredOrder.orderId,sku:restoredOrder.sku,requestId:draft.id});setResultId(draft.id);go('result',`?id=${draft.id}`);return;}
      event('purchase_started',{productId:selected});cleanPurchase.current?.();setPurchasing(true);
      try{cleanPurchase.current=purchase(sale,draft.id,()=>{setPurchasing(false);setResultId(draft.id);setResult(null);go('result',`?id=${draft.id}`);},error=>{setPurchasing(false);failure(error);});}
      catch(error){setPurchasing(false);throw error;}
    })}>{restoredOrder?'추가 결제 없이 상담 시작':`${sale.displayAmount} 단건 구매하기`}</Button><p className="muted">결제창의 최종 금액을 확인해 주세요. 생성 실패 시 같은 주문으로 복구할 수 있어요.</p></>:<><p>질문과 출생정보를 먼저 확인해 주세요.</p><Button onClick={()=>go('birth')}>입력으로 돌아가기</Button></>}</>}
    {page==='result'&&<>{heading('나의 상담',result?.state==='COMPLETED'?(consultationServices.find(service=>service.id===result?.serviceId)?.name||'상담')+'의 이야기가 도착했어요':'상담을 이어서 확인해요')}{!loggedIn?<Button onClick={()=>requireLogin('result')}>로그인하고 결과 보기</Button>:result?<><p className="status" role="status">{result.recovery.savedChapters} / {result.recovery.totalChapters}개 항목 저장됨{result.recovery.reviewRequired?' · 지원 확인 필요':''}</p><p className="ai-note">AI가 계산 근거를 바탕으로 작성한 참고 해석이에요.</p>{!!result.charts?.length&&<Suspense fallback={<p role="status">저장된 계산 근거를 불러오고 있어요.</p>}><ResultEvidence charts={result.charts}/></Suspense>}{result.chapters.map((chapter,i)=><article className="chapter" key={i}><p className="eyebrow">{String(i+1).padStart(2,'0')}</p><h2>{result.manifest[i]?.title||chapter.title}</h2><p className="answer">{chapter.summary}</p>{chapter.questionAnswers?.map((a,j)=><section key={j}><h3>질문에 대한 답변</h3><p>{a.answer}</p>{[['근거',a.reason||a.basis],['시기의 흐름',a.timing],['참고할 행동',a.action],['점검할 일',a.review]].map(([label,text])=>text&&<div key={label}><h4>{label}</h4><p>{text}</p></div>)}</section>)}{chapter.blocks?.length?chapter.blocks.map((block,j)=><section key={block.id||j}><h3>{block.title}</h3>{block.paragraphs.map((p,k)=><p key={k}>{p}</p>)}</section>):chapter.analysis?.map((p,j)=><p key={j}>{p}</p>)}{chapter.advice&&<section><h3>현실에서 참고할 행동</h3><p>{chapter.advice}</p></section>}{chapter.example&&<p>{chapter.example}</p>}{chapter.persona&&<blockquote>{chapter.persona}</blockquote>}</article>)}{result.recovery.canRetryNow&&<Button loading={busy} onClick={()=>void run(async()=>{setResult(await api(`/results/${result.id}/resume`,{}));})}>추가 결제 없이 이어서 생성</Button>}<p className="muted">결과번호: {result.id}</p>{result.conversation&&<Followup key={result.id} id={result.id} conversation={result.conversation} onResult={setResult} onError={failure}/> }{support}<Button variant="weak" onClick={()=>go('library')}>기록 보관함</Button></>:<><p role="status">서버에 저장된 상태를 확인하고 있어요.</p><Button variant="weak" onClick={()=>go('recovery')}>구매 복구</Button></>}</>}
    {page==='library'&&<>{heading('기록 보관함','다시 읽고 싶은 이야기','검증된 구매는 생성 상태와 함께 보관돼요.')}<Button variant="weak" onClick={()=>go('recovery')}>누락된 구매 복구</Button>{!loggedIn?<Button onClick={()=>requireLogin('library')}>토스 로그인하고 기록 보기</Button>:libraryState==='loading'?<p role="status">저장된 구매 기록을 확인하고 있어요.</p>:libraryState==='error'?<p>기록을 불러오지 못했어요. 구매 복구 또는 고객지원으로 확인해 주세요.</p>:library.length?library.map(p=><button className="record" key={p.orderId} onClick={()=>{if(p.status==='REFUNDED'){setMessage(errors.ORDER_REFUNDED);return;}if(p.nativeService){if(p.href)location.assign(p.href);else setMessage('구매 복구에서 상담 상태를 다시 확인해 주세요.');return;}if(p.serviceId==='tarot-library'){setTarotLibraryOrderId(p.orderId);go('tarot-library');event('library_reread',{productId:p.productId});}else if(p.requestId){setResultId(p.requestId);setResult(null);go('result',`?id=${p.requestId}`);event('library_reread',{productId:p.productId});}else{setSelected(p.selectionId||p.productId);setRestoredOrder(p);go('birth');}}}><strong>{p.nativeService==='love-secret'?'연애 비책':p.nativeService==='life-book'?'인생의 책':p.nativeService==='fusion'?'초융합 운세':p.serviceId==='tarot-library'?(tarotLibraryTitle.get(p.selectionId)||'타로 리딩'):(consultationServices.find(service=>service.id===p.serviceId)?.name||'영냥이')+' · '+(readings.find(r=>r.id===(p.selectionId||p.productId))?.name||'구매한 상담')}</strong><span>{p.status==='REFUNDED'?'환불됨':p.state==='READ_FAILED'?'상태 확인이 지연돼요 · 눌러서 다시 확인':p.state==='UNASSIGNED'?'질문을 입력하고 상담 시작':`${p.completedSections} / ${p.totalSections}개 항목 저장`}</span><small>{new Date(p.createdAt).toLocaleDateString('ko-KR')} · 주문 {p.orderId}</small></button>):<div className="empty"><img src="/assets/yeongnyangi.webp" alt=""/><h2>구매한 상담이 아직 없어요</h2><p>마음에 걸리는 질문이 생기면 영냥이를 찾아주세요.</p><Button onClick={()=>go('catalog')}>상담 살펴보기</Button></div>}</>}
    {page==='library'&&loggedIn&&libraryState==='ready'&&libraryCursor&&<Button display="block" loading={busy} onClick={()=>void run(async()=>{const epoch=libraryEpoch.current;const data=await api<{purchases:Purchase[];nextCursor:string|null}>('/library?cursor='+encodeURIComponent(libraryCursor));if(epoch!==libraryEpoch.current)return;setLibrary(current=>[...current,...data.purchases.filter(item=>!current.some(previous=>previous.orderId===item.orderId))]);setLibraryCursor(data.nextCursor);})}>이전 구매 기록 더 보기</Button>}
    {page==='recovery'&&<>{heading('구매 복구','결제한 이야기를 찾아드릴게요','추가 결제 없이 토스의 미지급 주문과 서버에 저장된 권한을 확인해요.')}<CharacterGuide id="yeongnyangi" title="기록부터 함께 확인해요">결과가 보이지 않아도 새로 구매하지 말고, 기존 주문을 먼저 확인해 주세요.</CharacterGuide><ol className="steps"><li>구매한 토스 계정으로 로그인해 주세요.</li><li>복구를 누르면 미지급 주문을 확인해요.</li><li>기록 보관함에서 이어볼 상담을 선택해요.</li></ol><Button display="block" loading={busy} onClick={()=>{if(!loggedIn){requireLogin('recovery');return;}void run(async()=>{const counts=await restorePurchases();setMessage(`${counts.recovered}건 복구, ${counts.failed}건 확인 필요. 기록 보관함에서도 기존 구매를 확인해 주세요.`);});}}>구매 내역 복구하기</Button><Button display="block" variant="weak" onClick={()=>requireLogin('library')}>기록 보관함 열기</Button>{support}</>}
    {page==='settings'&&<>{heading('내 정보','필요한 설정을 모았어요')}<CharacterGuide title="다음 이야기도 편안하게">기록과 계정 설정, 도움이 필요한 곳을 여기서 찾을 수 있어요.</CharacterGuide><div className="menu">{[['library','기록 보관함'],['recovery','구매 복구'],['terms','약관과 개인정보 안내'],['support','고객지원'],['withdraw','연결 해제와 탈퇴']].map(([key,label])=><Button key={key} display="block" variant="weak" onClick={()=>go(key as Page)}>{label}</Button>)}<Button display="block" onClick={()=>loggedIn?void run(async()=>{await logout();setLoggedIn(false);setQuestion('');setBirth(emptyBirth());setPartner(emptyBirth());setScope({situation:'',options:'',period:'',constraints:'',relationshipType:''});setResult(null);setResultId('');setLibrary([]);setDraft(null);setRestoredOrder(null);setMessage('로그아웃했어요.');}):requireLogin('settings')}>{loggedIn?'로그아웃':'토스 로그인'}</Button></div></>}
    {page==='terms'&&<>{heading('이용 안내','약관과 개인정보')}<section className="paper"><h2>등록 준비 중인 안내</h2><p>토스 전용 동의 항목과 처리 지역을 확인 중이에요. 현재 구매와 상담 생성은 열려 있지 않아요.</p><h3>서비스 제공자</h3><p>코드 데스티니 (Code Destiny) · 고객지원 admin@code-destiny.com</p><h3>수집을 준비하는 정보</h3><p>토스의 앱별 사용자 식별자, 풀이 대상의 출생정보, 질문, 주문과 결과. 이름·이메일·전화번호·CI를 편의상 추가 수집하지 않아요.</p><h3>AI 이용 안내</h3><p>계산된 사주 정보와 질문을 바탕으로 AI가 해석해요. 미래의 결과를 보장하거나 전문적인 의료·법률·투자 판단을 대신하지 않아요.</p><h3>최종 고지 전 확인 항목</h3><p>수탁사별 처리 지역과 이전 항목, 보유기간과 철회 방법, 실제 플랫폼 환불 절차를 확인한 뒤 정식 약관을 등록해야 해요.</p></section></>}
    {page==='support'&&<>{heading('고객지원','어디에서 막혔나요?','결제 후 결과가 없거나 생성이 멈췄다면 새로 결제하지 마세요.')}<CharacterGuide title="막힌 자리부터 살펴볼게요">발생한 문제와 주문번호를 알려 주세요. 확인에 필요한 내용을 아래에 모았어요.</CharacterGuide><Button display="block" onClick={()=>go('recovery')}>먼저 구매 복구하기</Button><section className="paper"><h2>이메일 문의</h2><a href="mailto:admin@code-destiny.com">admin@code-destiny.com</a><p>주문번호 또는 오류번호, 발생한 문제를 알려 주세요. 출생정보나 상담 원문을 보내지 않아도 확인을 시작할 수 있어요.</p><h3>문제 결과 신고 · 환불 문의</h3><p>위 연락처로 결과번호와 문제 유형을 알려 주세요. 실제 주문과 제공 상태를 확인해 안내드려요.</p></section></>}
    {page==='withdraw'&&<>{heading('연결 해제와 탈퇴','계정 이용을 정리할 수 있어요')}<p>연결을 해제하면 이 기기의 세션이 정리되고 구매한 기록에 접근할 수 없어요. 기존 웹 계정에는 영향을 주지 않아요.</p><Button display="block" loading={busy} onClick={()=>{if(!loggedIn){requireLogin('withdraw');return;}void run(async()=>{const r=await api<{remoteUnlink:string}>('/unlink',{});await clearSession();setLoggedIn(false);setBirth(emptyBirth());setPartner(emptyBirth());setScope({situation:'',options:'',period:'',constraints:'',relationshipType:''});setQuestion('');setResult(null);setLibrary([]);setDraft(null);setMessage(r.remoteUnlink==='completed'?'토스 연결을 해제했어요.':'이 서비스의 접근을 차단했어요. 토스 연결 해제 확인은 고객지원으로 문의해 주세요.');});}}>토스 연결 해제</Button><p>개인정보 삭제를 포함한 탈퇴 처리는 정식 보유기간과 삭제 정책 확인 후 제공할 예정이에요. 현재 정식 서비스는 열려 있지 않아요.</p>{support}</>}
    {page==='example'&&<>{heading('개인정보 없는 구성 예시','답변은 이렇게 읽을 수 있어요','아래는 화면 구성을 설명하기 위해 작성한 예시예요. 실제 사주 분석이나 무료 상담 결과가 아니에요.')}<article className="chapter"><p className="eyebrow">질문 · 지금 이직해도 괜찮을까</p><h2>움직이기 전에, 선택의 기준부터</h2><p className="answer">지금의 답답함이 일 자체에서 오는지, 일하는 환경에서 오는지 나누어 살펴보세요.</p><h3>해석의 근거</h3><p>실제 상담에서는 입력한 출생정보로 계산한 사주와 질문을 연결해 설명해요. 제공되지 않은 출생 시각을 만들어내지 않아요.</p><h3>시기의 흐름</h3><p>계산 가능한 범위 안에서 변화를 설명하고, 확인하기 어려운 부분은 한계와 함께 안내해요.</p><h3>오늘 참고할 행동</h3><p>다음 직장에서 지키고 싶은 조건 세 가지를 적어보고, 현재의 불편함과 비교해 보세요.</p></article><Button display="block" onClick={()=>go('catalog')}>내 질문으로 상담 살펴보기</Button></>}
    {page!=='home'&&<footer><Button size="small" variant="weak" onClick={()=>go('home')}>홈에서 다시 살펴보기</Button></footer>}
  </main>;
}
