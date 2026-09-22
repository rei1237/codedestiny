"use client";
import {useEffect,useRef,useState} from 'react';
import {authFetch} from '@/app/_lib/auth-client';
import {ArrowRight,Moon,Sparkles} from 'lucide-react';
import {products,systemNames,type Product} from '@/worker/yeongnyangi/payments/catalog';
import {depthDescriptions} from '@/worker/yeongnyangi/fortune/reading-policy';
import {topicCatalog} from '@/worker/yeongnyangi/fortune/topics';
import {fortuneApi,FortuneApiError,loginForCurrentPage,resultPath,checkoutPath,type FortuneRecord} from '../_lib/api';
import ProfilePicker from './ProfilePicker';
import {profileKey,useProfiles} from '../_lib/use-profiles';
import styles from '../yeongnyangi.module.css';
import predictionRecords from '@/lib/brand/prediction-records.json';
import {trackEvent} from '@/lib/analytics';
const explanation:Record<string,string>={saju:'사주팔자와 오행, 십성으로 기질과 삶의 흐름을 읽어요.',ziwei:'자미두수 명반의 궁과 별, 운의 흐름을 함께 살펴봐요.',sukuyo:'본명숙과 관계의 거리를 숙요점의 관점에서 살펴봐요.',vedic:'라그나와 달, 나크샤트라와 다샤를 인도 점성술로 읽어요.',astrology:'태양·달·상승점과 행성 관계를 출생 차트로 살펴봐요. 실시간 트랜짓은 포함하지 않아요.',tarot:'출생정보 없이 질문과 카드의 상징으로 상황과 선택을 읽어요.',fusion:'서로 다른 운세 체계의 공통점과 차이점을 구분해 깊이 읽어요.'};
const loginDraftKey='yeongnyangi:consultation-login-draft';
export default function Consultation(){
 const [domain,setDomain]=useState('saju'),[productId,setProductId]=useState('saju_mackerel');
 const [available,setAvailable]=useState<Product[]>([]),[catalogError,setCatalogError]=useState('');
 const profileState=useProfiles(),{profiles,profileId,guest}=profileState;
 const [partnerId,setPartnerId]=useState(''),[timeUnknown,setTimeUnknown]=useState(false);
 const [topicId,setTopicId]=useState('general'),[question,setQuestion]=useState(''),[error,setError]=useState('');
 const [busy,setBusy]=useState(false),[ready,setReady]=useState(false);
 const [extraTime,setExtraTime]=useState(''),[extraPlace,setExtraPlace]=useState('');
 const selectedProfile=profiles.find(p=>(p.profileId||p.id)===profileId);
 const lock=useRef(false);
 const viewedProduct=useRef('');
 const product=products.find(p=>p.id===productId)!;
 useEffect(()=>{
  if(!ready||viewedProduct.current===product.id)return;
  viewedProduct.current=product.id;
  trackEvent('view_item',{currency:product.currency,value:product.priceKRW,items:[{item_id:product.cdFeatureKey,item_name:product.name,price:product.priceKRW}],service:'yeongnyangi'});
 },[ready,product]);
 const choices=products.filter(p=>domain==='fusion'?p.readingKind!=='single':p.readingKind==='single'&&p.domain===domain);
 const tarotOnly=product.domain==='tarot'&&product.readingKind==='single';
 const premium=['flounder','tuna'].includes(product.fishId);
 const needsTime=premium||product.systems.some(id=>!['saju','tarot'].includes(id));
 const needsPlace=premium||product.systems.some(id=>['vedic','astrology','sukuyo'].includes(id));
 const missing=!tarotOnly&&!guest?[
  ...(!selectedProfile?['함께 읽을 프로필을 골라 주세요.']:[]),
  ...(selectedProfile&&needsTime&&(timeUnknown||(selectedProfile.birth?.timeUnknown&&!extraTime))?['선택한 상담에는 출생시간이 필요해요. 시간을 보완하거나 다른 상담을 골라 주세요.']:[]),
  ...(selectedProfile&&needsPlace&&!selectedProfile.location?.label&&!extraPlace.trim()?['선택한 상담에는 출생지역이 필요해요. 도시와 국가를 입력해 주세요.']:[]),
 ]:[];
 useEffect(()=>{setExtraTime('');setExtraPlace('');setTimeUnknown(false);setError('');},[profileId]);
 useEffect(()=>{if(partnerId&&(partnerId===profileId||!profiles.some(p=>profileKey(p)===partnerId)))setPartnerId('');},[profileId,profiles,partnerId]);
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search),requested=params.get('domain')||'saju';
  const selected=products.find(p=>p.id===params.get('product'))||products.find(p=>p.domain===requested&&p.fishId===params.get('fish')&&p.readingKind==='single')||products.find(p=>p.domain===requested&&p.readingKind==='single')||products[0];
  setProductId(selected.id);setDomain(selected.readingKind==='single'?selected.domain:'fusion');
  const requestedTopic=params.get('topic');
  if(requestedTopic && Object.hasOwn(topicCatalog,requestedTopic))setTopicId(requestedTopic);
  try{
   const draft=JSON.parse(sessionStorage.getItem(loginDraftKey)||'null');
   if(draft&&draft.path===window.location.pathname+window.location.search&&Date.now()-draft.savedAt<3600000){
    const savedProduct=products.find(p=>p.id===draft.productId);
    if(savedProduct){setProductId(savedProduct.id);setDomain(savedProduct.readingKind==='single'?savedProduct.domain:'fusion');}
    if(draft.topicId==='general'||Object.hasOwn(topicCatalog,draft.topicId))setTopicId(draft.topicId);
    if(typeof draft.question==='string')setQuestion(draft.question.slice(0,1000));
   }
  }catch{/* Login still works when browser storage is unavailable. */}
  let cancelled=false;
  fortuneApi<{products:(Product&{available:boolean})[]}>('products').then(catalog=>{
   if(cancelled)return;
   setAvailable(catalog.products.filter(p=>p.available));
  }).catch(e=>{if(!cancelled)setCatalogError(e.message);}).finally(()=>{if(!cancelled)setReady(true);});
  return ()=>{cancelled=true;};
 },[]);
 function loginWithDraft(){
  try{sessionStorage.setItem(loginDraftKey,JSON.stringify({path:window.location.pathname+window.location.search,productId,topicId,question,savedAt:Date.now()}));}catch{/* Optional pre-login draft only; paid input is stored on the server. */}
  loginForCurrentPage();
 }
 async function prepare(){
  if(lock.current)return;
  trackEvent('purchase_attempt',{item_id:product.cdFeatureKey,value:product.priceKRW,currency:product.currency,login_required:guest,service:'yeongnyangi'});
  if(guest){loginWithDraft();return;}
  if(missing.length){setError(missing.join(' '));return;}
  lock.current=true;setBusy(true);setError('');
  try{
   let birthPlace;
   if(extraPlace.trim()&&!selectedProfile?.location?.label){
    const response=await authFetch(`/api/geocode?place=${encodeURIComponent(extraPlace)}`);
    const found=await response.json();
    if(!response.ok||found.fallback)throw new Error('출생지역을 찾지 못했어요. 도시와 국가를 함께 입력해 주세요.');
    birthPlace={name:found.name,latitude:found.lat,longitude:found.lng,timezone:found.timezone};
   }
   const data=await fortuneApi<{fortune:FortuneRecord}>('requests',{birthDetails:{birthTime:extraTime,birthPlace},productId,profileId,topicId,question,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul',timeUnknown,...(partnerId?{partnerProfileId:partnerId}:{})});
   try{sessionStorage.removeItem(loginDraftKey);}catch{/* The server snapshot now owns the consultation input. */}
   trackEvent('consultation_start',{item_id:product.cdFeatureKey,service:'yeongnyangi'});
   window.location.assign(data.fortune.paid?resultPath(data.fortune.id):checkoutPath(data.fortune));
  }catch(e){if(e instanceof FortuneApiError&&e.status===401)loginWithDraft();else setError(e instanceof Error?e.message:'상담을 준비하지 못했어요.');}
  finally{lock.current=false;setBusy(false);}
 }
 function chooseDomain(next:string){setDomain(next);setProductId(products.find(p=>next==='fusion'?p.readingKind!=='single':p.domain===next&&p.readingKind==='single')!.id);setPartnerId('');setError('');}
 return <section className={`${styles.consultation} ${styles.consultationRoom}`}>
  <picture className={styles.consultationScenery}><source media="(max-width: 767px)" srcSet="/assets/yeongnyangi/original/room-780.webp"/><img src="/assets/yeongnyangi/original/room-1440.webp" width={1440} height={810} alt=""/></picture>
  <header className={styles.consultationHeader}><div><h1>무엇부터 읽어볼까?</h1><p>말이 조금 엉켜도 괜찮아.<br/>궁금한 운세를 고르고, 네 이야기를 들려줘.</p></div><Moon size={36} strokeWidth={1} aria-hidden="true"/></header>
  <a className={styles.spiritEntry} href="/yeongnyangi/fortune/?mode=spirit"><img src="/assets/yeongnyangi/spirit/eastern-oracle.webp" width={64} height={68} alt=""/><span><strong>영냥 신점</strong><br/>질문이 떠오른 순간의 기운과 선택 살펴보기</span></a>
  <div className={styles.tabs} role="group" aria-label="운세 종류">{[...Object.entries(systemNames),['fusion','복합 운세']].map(([id,label])=><button key={id} aria-pressed={domain===id} onClick={()=>chooseDomain(id)}>{label}</button>)}</div>
  <p className={styles.systemDescription}>{explanation[domain]}</p>
  <div className={styles.fishes} role="group" aria-label="생선 상품">{choices.map(item=><button key={item.id} onClick={()=>setProductId(item.id)} aria-pressed={productId===item.id}>
   <img src={item.image} alt="" width={240} height={108}/><strong>{domain==='fusion'?item.name:item.fishName}</strong><span>{item.priceKRW.toLocaleString('ko-KR')}원 · {item.chapterCount}개 챕터</span><small>{depthDescriptions[item.fishId]}</small>
  </button>)}</div>
  <div className={styles.consultationDesk}>
   <aside className={styles.consultationGuide} aria-label="선택한 상담 요약">
    <img className={styles.guideCat} src="/assets/yeongnyangi/profiles/welcome.webp" width={168} height={171} alt="반갑게 맞이하는 영냥이"/>
    <h2>네 이야기에,<br/>작은 달빛 하나.</h2><p>한 번에 답을 찾으려 하지 않아도 돼.<br/>함께 살펴볼 흐름부터 골라보자.</p>
    <dl className={styles.consultationSummary}><div><dt>오늘의 상담</dt><dd>{product.name} · {product.fishName}</dd></div><div><dt>함께 읽을 이야기</dt><dd>{tarotOnly?'질문과 카드의 상징':selectedProfile?.name||'프로필을 골라줘'}</dd></div><div><dt>상담 구성</dt><dd>{product.chapterCount}개 챕터</dd></div><div><dt>단건 결제</dt><dd>{product.priceKRW.toLocaleString('ko-KR')}원</dd></div></dl>
    <p className={styles.guideNote}><Sparkles size={16} aria-hidden="true"/>계산은 운세 체계가,<br/>해설은 영냥이가 함께해.</p>
    <details className={styles.predictionRecords}><summary>두 대통령 적중 기록 원문 보기</summary><p>10년 경력 명리학자가 남긴 공개 해석 기록. 블로그 게시일과 원문을 직접 살펴보세요.</p><ul>{predictionRecords.map(record=><li key={record.url}><a href={record.url} target="_blank" rel="noopener noreferrer">{record.date} · {record.title}</a></li>)}</ul></details>
   </aside>
   <div className={`${styles.form} ${styles.consultationForm}`}>
   {tarotOnly?<section className={styles.questionIntro}><h2>카드에 물어볼 이야기</h2><p>타로 상담에는 출생정보가 필요하지 않아. 질문과 카드의 상징으로 함께 읽어볼게.</p>{guest&&<p>상담을 이어가려면 먼저 로그인해 주세요.</p>}</section>:<>
    <ProfilePicker state={profileState}/>
    {!guest&&selectedProfile&&<div className={styles.birthDetails}>
    <label><input type="checkbox" checked={timeUnknown} onChange={e=>setTimeUnknown(e.target.checked)}/> 이번 상담에서 출생시간을 미상으로 보기</label>
    {selectedProfile?.birth?.timeUnknown&&<label>출생시간 보완 (선택)<input type="time" value={extraTime} onChange={e=>setExtraTime(e.target.value)}/></label>}
    {selectedProfile&&!selectedProfile.location?.label&&<label>이 상담에 필요한 출생지역<input value={extraPlace} onChange={e=>setExtraPlace(e.target.value)} placeholder="도시와 국가" maxLength={120}/></label>}
    {(selectedProfile?.birth?.timeUnknown||!selectedProfile.location?.label)&&<p>보완한 정보는 이번 상담 기록에 함께 저장해요.</p>}
    {domain==='sukuyo'&&<label>궁합 상대 (선택)<select value={partnerId} onChange={e=>setPartnerId(e.target.value)}><option value="">내 본명숙만 보기</option>{profiles.filter(p=>(p.profileId||p.id)!==profileId).map(p=><option key={p.profileId||p.id} value={p.profileId||p.id}>{p.name}</option>)}</select></label>}
    </div>}
   </>}
   <section className={styles.questionSection} aria-label="상담 주제와 질문"><h2>궁금한 이야기를 들려줘.</h2><p>길게 쓰지 않아도 괜찮아. 지금 마음에 걸리는 것부터 남겨줘.</p>
   <label htmlFor="consultation-topic">상담 주제</label><select id="consultation-topic" value={topicId} onChange={e=>setTopicId(e.target.value)}><option value="general">전체 흐름</option>{Object.entries(topicCatalog).map(([id,topic])=><option value={id} key={id}>{topic.label}</option>)}</select>
   <label htmlFor="consultation-question">영냥이에게 궁금한 이야기</label><textarea id="consultation-question" rows={4} maxLength={1000} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="지금 가장 궁금한 고민을 들려줘. 떠오르는 질문이 없으면 전체 흐름부터 볼게."/>
   </section>
   <div className={styles.checkoutSection}><div className={styles.checkoutTotal}><span>{product.fishName} · 단건 결제</span><strong>{product.priceKRW.toLocaleString('ko-KR')}<small>원</small></strong></div>
   <p>선택한 운세의 계산 결과를 바탕으로 AI가 해설해요. 선택을 돕는 참고 자료이며 미래를 확정하지 않아요.</p>
   {missing.length>0&&<ul className={styles.inputHints}>{missing.map(message=><li key={message}>{message}</li>)}</ul>}
   <button className={styles.checkoutButton} disabled={busy||(!guest&&(!ready||missing.length>0||!available.some(p=>p.id===productId)))} onClick={()=>void prepare()}>{busy?'상담 준비 중':guest?'로그인하고 상담 이어가기':'결제 내용 확인하기'}<ArrowRight size={18} aria-hidden="true"/></button>
   {!ready&&<p role="status">상담 상품을 확인하고 있어요. 프로필과 질문은 먼저 고를 수 있어요.</p>}
   {catalogError&&<p role="alert">{catalogError}</p>}
   {ready&&!catalogError&&!available.some(p=>p.id===productId)&&<p>지금은 상담을 준비하고 있어요. 결제는 진행되지 않아요.</p>}
   {error&&<p role="alert">{error}</p>}
   </div>
   </div>
  </div>
 </section>;
}
