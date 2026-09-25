"use client";
import {consultationKinds,consultationDomain,supportsKind,consultationManifest} from '@/worker/yeongnyangi/fortune/consultation-kinds';
import {consultationTitle,fusionDescription} from '../_lib/consultation-copy';
import ReadingIdentity,{readingFeatures} from './ReadingIdentity';
import CurrentLocationButton,{type CurrentLocation} from '@/app/components/CurrentLocationButton';
import {useEffect,useRef,useState} from 'react';
import {authFetch} from '@/app/_lib/auth-client';
import {ArrowRight,Moon,Sparkles} from 'lucide-react';
import {products,systemNames,type Product} from '@/worker/yeongnyangi/payments/catalog';
import {depthDescriptions,policyForReading} from '@/worker/yeongnyangi/fortune/reading-policy';
import {topicCatalog} from '@/worker/yeongnyangi/fortune/topics';
import {fortuneApi,FortuneApiError,loginForCurrentPage,resultPath,checkoutPath,type FortuneRecord} from '../_lib/api';
import ProfilePicker from './ProfilePicker';
import {profileKey,useProfiles} from '../_lib/use-profiles';
import styles from '../yeongnyangi.module.css';
import predictionRecords from '@/lib/brand/prediction-records.json';
import {predictionTimeline} from '@/lib/brand/prediction-timeline';
import {trackEvent} from '@/lib/analytics';
const explanation:Record<string,string>={saju:'사주팔자와 오행, 십성으로 기질과 삶의 흐름을 읽어요.',ziwei:'자미두수 명반의 궁과 별, 운의 흐름을 함께 살펴봐요.',sukuyo:'본명숙과 관계의 거리를 숙요점의 관점에서 살펴봐요.',vedic:'라그나와 달, 나크샤트라와 다샤를 인도 점성술로 읽어요.',astrology:'태양·달·상승점과 행성 관계를 출생 차트로 살펴봐요. 실시간 트랜짓은 포함하지 않아요.',tarot:'출생정보 없이 질문과 카드의 상징으로 상황과 선택을 읽어요.',fusion:'서로 다른 운세 체계의 공통점과 차이점을 구분해 깊이 읽어요.'};
const loginDraftKey='yeongnyangi:consultation-login-draft';
const predictionProofRecords=predictionRecords.map(record=>{
 const entry=predictionTimeline[record.url];
 if(!entry) throw new Error(`prediction-timeline missing ${record.url}`);
 return {...record,...entry};
});
export default function Consultation(){
 const [kindId,setKindId]=useState('personal');
 const [domain,setDomain]=useState('saju'),[productId,setProductId]=useState('saju_mackerel');
 const [available,setAvailable]=useState<Product[]>([]),[catalogError,setCatalogError]=useState('');
 const profileState=useProfiles(),{profiles,profileId,guest}=profileState;
 const [partnerId,setPartnerId]=useState(''),[timeUnknown,setTimeUnknown]=useState(false);
 const [topicId,setTopicId]=useState('general'),[question,setQuestion]=useState(''),[error,setError]=useState('');
 const [busy,setBusy]=useState(false),[ready,setReady]=useState(false);
 const [currentLocation,setCurrentLocation]=useState<CurrentLocation|null>(null);
 const [extraTime,setExtraTime]=useState(''),[extraPlace,setExtraPlace]=useState('');
 const partnerProfile=profiles.find(p=>profileKey(p)===partnerId);
 const selectedProfile=profiles.find(p=>(p.profileId||p.id)===profileId);
 const lock=useRef(false);
 const consultationAttemptId=useRef('');
 const viewedProduct=useRef('');
 const restoredDraft=useRef<{profileId?:string;partnerId?:string;extraTime?:string;extraPlace?:string;timeUnknown?:boolean}|null>(null);
 const product=products.find(p=>p.id===productId)!;
 useEffect(()=>{
  if(!ready||viewedProduct.current===product.id)return;
  viewedProduct.current=product.id;
  trackEvent('view_item',{currency:product.currency,value:product.priceKRW,items:[{item_id:product.cdFeatureKey,item_name:product.name,price:product.priceKRW}],service:'yeongnyangi'});
 },[ready,product]);
 const kind=consultationKinds[domain].find(k=>k.id===kindId)||consultationKinds[domain][0];
 const preview=consultationManifest(product,kind,topicId);
 const choices=products.filter(p=>domain==='fusion'?p.readingKind!=='single':p.readingKind==='single'&&p.domain===domain).filter(p=>supportsKind(p,kind));
 const tarotOnly=product.domain==='tarot'&&product.readingKind==='single';
 const premium=['flounder','tuna'].includes(product.fishId);
 const needsTime=premium||product.systems.some(id=>!['saju','tarot'].includes(id));
 const needsPlace=premium||product.systems.some(id=>['vedic','astrology','sukuyo'].includes(id));
 const missing=!tarotOnly&&!guest?[
  ...(kind.partner&&partnerProfile&&premium&&(partnerProfile.birth?.timeUnknown||!partnerProfile.location?.label||!partnerProfile.gender)?['이 등급의 궁합에는 상대의 출생시간·지역·성별도 필요해요. 상대 프로필을 보완하거나 다른 등급을 골라 주세요.']:[]),
  ...(kind.partner&&!partnerId?['궁합을 함께 볼 상대 프로필을 골라 주세요.']:[]),
  ...(!selectedProfile?['함께 읽을 프로필을 골라 주세요.']:[]),
  ...(selectedProfile&&needsTime&&(timeUnknown||(selectedProfile.birth?.timeUnknown&&!extraTime))?['선택한 상담에는 출생시간이 필요해요. 시간을 보완하거나 다른 상담을 골라 주세요.']:[]),
  ...(selectedProfile&&needsPlace&&!selectedProfile.location?.label&&!extraPlace.trim()&&!currentLocation?['선택한 상담에는 출생지역이 필요해요. 도시와 국가를 입력해 주세요.']:[]),
 ]:[];
 if(kind.question&&!question.trim()&&!guest)missing.push('궁금한 이야기를 남겨 주세요.');
 useEffect(()=>{if(restoredDraft.current)return;setExtraTime('');setExtraPlace('');setCurrentLocation(null);setTimeUnknown(false);setError('');},[profileId]);
 useEffect(()=>{if(!profileState.loading&&partnerId&&(partnerId===profileId||!profiles.some(p=>profileKey(p)===partnerId)))setPartnerId('');},[profileId,profiles,partnerId,profileState.loading]);
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search),requested=params.get('domain')||'saju';
  const selected=products.find(p=>p.id===params.get('product'))||(requested==='fusion'?products.find(p=>p.readingKind==='pair'):undefined)||products.find(p=>p.domain===requested&&p.fishId===params.get('fish')&&p.readingKind==='single')||products.find(p=>p.domain===requested&&p.readingKind==='single')||products[0];
  setProductId(selected.id);setDomain(selected.readingKind==='single'?selected.domain:'fusion');
  const nextDomain=consultationDomain(selected);
  const requestedKind=consultationKinds[nextDomain].find(k=>k.id===params.get('consultationKind'))||(params.get('topic')?consultationKinds[nextDomain].find(k=>k.id==='ask'):undefined)||consultationKinds[nextDomain][0];
  setKindId(requestedKind.id);
  if(!supportsKind(selected,requestedKind))setProductId(products.find(p=>consultationDomain(p)===nextDomain&&supportsKind(p,requestedKind))!.id);
  const requestedTopic=params.get('topic');
  if(requestedTopic && Object.hasOwn(topicCatalog,requestedTopic))setTopicId(requestedTopic);
  try{
   const draft=JSON.parse(sessionStorage.getItem(loginDraftKey)||'null');
   if(draft&&draft.path===window.location.pathname+window.location.search&&Date.now()-draft.savedAt<3600000){
    const savedProduct=products.find(p=>p.id===draft.productId);
    if(savedProduct){const d=consultationDomain(savedProduct),k=consultationKinds[d].find(k=>k.id===draft.consultationKind)||consultationKinds[d][0];setKindId(k.id);setProductId(supportsKind(savedProduct,k)?savedProduct.id:products.find(p=>consultationDomain(p)===d&&supportsKind(p,k))!.id);setDomain(d);}
    restoredDraft.current=draft;
    if(typeof draft.extraTime==='string')setExtraTime(draft.extraTime);
    if(typeof draft.extraPlace==='string')setExtraPlace(draft.extraPlace);
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
 useEffect(()=>{
  const draft=restoredDraft.current;if(!draft||profileState.loading)return;
  if(draft.profileId&&profiles.some(p=>profileKey(p)===draft.profileId)&&profileId!==draft.profileId){profileState.select(draft.profileId);return;}
  if(draft.partnerId&&profiles.some(p=>profileKey(p)===draft.partnerId))setPartnerId(draft.partnerId);
  setExtraTime(draft.extraTime||'');setExtraPlace(draft.extraPlace||'');setTimeUnknown(draft.timeUnknown===true);restoredDraft.current=null;
 },[profileId,profiles,profileState.loading,profileState.select]);
 function loginWithDraft(){
  try{sessionStorage.setItem(loginDraftKey,JSON.stringify({path:window.location.pathname+window.location.search,productId,consultationKind:kind.id,profileId,topicId,question,partnerId,extraTime,extraPlace,timeUnknown,savedAt:Date.now()}));}catch{/* Optional pre-login draft only; paid input is stored on the server. */}
  loginForCurrentPage();
 }
 async function prepare(){
  if(lock.current)return;
  trackEvent('purchase_attempt',{item_id:product.cdFeatureKey,value:product.priceKRW,currency:product.currency,login_required:guest,service:'yeongnyangi'});
  if(guest){loginWithDraft();return;}
  if(missing.length){setError(missing.join(' '));return;}
  lock.current=true;setBusy(true);setError('');
  try{
   let birthPlace=currentLocation?{name:currentLocation.name,latitude:currentLocation.latitude,longitude:currentLocation.longitude,timezone:currentLocation.timezone}:undefined;
   if(!currentLocation&&extraPlace.trim()&&!selectedProfile?.location?.label){
    const response=await authFetch(`/api/geocode?place=${encodeURIComponent(extraPlace)}`);
    const found=await response.json();
    if(!response.ok||found.fallback)throw new Error('출생지역을 찾지 못했어요. 도시와 국가를 함께 입력해 주세요.');
    birthPlace={name:found.name,latitude:found.lat,longitude:found.lng,timezone:found.timezone};
   }
   if(!consultationAttemptId.current)consultationAttemptId.current=crypto.randomUUID();
   const data=await fortuneApi<{fortune:FortuneRecord}>('requests',{consultationAttemptId:consultationAttemptId.current,birthDetails:{birthTime:extraTime,birthPlace},productId,consultationKind:kind.id,profileId,topicId:kind.id==='ask'?topicId:kind.topic,question:kind.question?question:'',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul',timeUnknown,...(kind.partner&&partnerId?{partnerProfileId:partnerId}:{})});
   try{sessionStorage.removeItem(loginDraftKey);}catch{/* The server snapshot now owns the consultation input. */}
   trackEvent('consultation_start',{item_id:product.cdFeatureKey,service:'yeongnyangi'});
   consultationAttemptId.current='';
   window.location.assign(data.fortune.paid?resultPath(data.fortune.id):checkoutPath(data.fortune));
  }catch(e){if(e instanceof FortuneApiError&&e.status===401)loginWithDraft();else setError(e instanceof Error?e.message:'상담을 준비하지 못했어요.');}
  finally{lock.current=false;setBusy(false);}
 }
 function chooseDomain(next:string){setKindId(consultationKinds[next][0].id);setTopicId('general');setQuestion('');setDomain(next);setProductId(products.find(p=>next==='fusion'?p.readingKind!=='single':p.domain===next&&p.readingKind==='single')!.id);setPartnerId('');setError('');}
 function chooseKind(id:string){const next=consultationKinds[domain].find(k=>k.id===id)!;setKindId(id);setPartnerId('');setError('');if(!supportsKind(product,next))setProductId(products.find(p=>consultationDomain(p)===domain&&supportsKind(p,next))!.id);}
 return <section className={`${styles.consultation} ${styles.consultationRoom}`}>
  <picture className={styles.consultationScenery}><source media="(max-width: 767px)" srcSet="/assets/yeongnyangi/original/room-780.webp"/><img src="/assets/yeongnyangi/original/room-1440.webp" width={1440} height={810} alt=""/></picture>
  <header className={styles.consultationHeader}><div><h1>무엇부터 읽어볼까?</h1><p>말이 조금 엉켜도 괜찮아.<br/>궁금한 운세를 고르고, 네 이야기를 들려줘.</p></div><Moon size={36} strokeWidth={1} aria-hidden="true"/></header>
  <a className={styles.spiritEntry} href="/yeongnyangi/fortune/?mode=spirit"><img src="/assets/yeongnyangi/spirit/eastern-oracle.webp" width={64} height={68} alt=""/><span><strong>영냥 신점</strong><br/>질문이 떠오른 순간의 기운과 선택 살펴보기</span></a>
  <div className={styles.tabs} role="group" aria-label="운세 종류">{[...Object.entries(systemNames),['fusion','복합 운세']].map(([id,label])=><button key={id} aria-pressed={domain===id} onClick={()=>chooseDomain(id)}>{label}</button>)}</div>
  <div className={styles.kindChoices} role="group" aria-label="상담 종류">{consultationKinds[domain].map(item=><button key={item.id} aria-pressed={kind.id===item.id} onClick={()=>chooseKind(item.id)}><strong>{item.label}</strong><span>{item.description}</span></button>)}</div>
  <ReadingIdentity product={product} compact/>
  <p className={styles.systemDescription}>{fusionDescription(product)||explanation[domain]}</p>
  {domain==='fusion'&&<p className={styles.systemDescription}>각 체계는 고유한 기준으로 계산해. 같은 흐름과 다른 해석을 나란히 읽고, 네가 선택할 수 있는 행동으로 정리해줄게. 결제 후 창을 닫아도 내 상담 기록에서 이어 읽을 수 있어.</p>}
  <div className={styles.consultationDesk}>
   <aside className={styles.consultationGuide} aria-label="선택한 상담 요약">
    <img className={styles.guideCat} src="/assets/yeongnyangi/profiles/welcome.webp" width={168} height={171} alt="반갑게 맞이하는 영냥이"/>
    <h2>네 이야기에,<br/>작은 달빛 하나.</h2><p>한 번에 답을 찾으려 하지 않아도 돼.<br/>함께 살펴볼 흐름부터 골라보자.</p>
    <dl className={styles.consultationSummary}><div><dt>오늘의 상담</dt><dd>{kind.label} · {product.fishName}</dd></div><div><dt>함께 읽을 이야기</dt><dd>{tarotOnly?'질문과 카드의 상징':selectedProfile?.name||'프로필을 골라줘'}</dd></div><div><dt>상담 구성</dt><dd>{product.chapterCount}개 챕터</dd></div><div><dt>전용 구성</dt><dd>{readingFeatures[domain]}</dd></div><div><dt>이용 방식</dt><dd>Family 이용권 또는 단건 결제 · {product.priceKRW.toLocaleString('ko-KR')}원</dd></div></dl>
    <p className={styles.guideNote}><Sparkles size={16} aria-hidden="true"/>계산은 운세 체계가,<br/>해설은 영냥이가 함께해.</p>
    <details className={styles.predictionRecords}><summary><span className={styles.predictionRecordsSeal} aria-hidden="true">原</span><span><strong>두 대통령 적중 기록</strong><small>게시일과 원문으로 직접 확인하기</small></span></summary><div className={styles.predictionRecordsBody}><figure className={styles.predictionRecordsArt}><img src="/assets/yeongnyangi/original/records-scroll-2d-480.webp" width={480} height={320} alt="" loading="lazy" decoding="async"/></figure><p>2022년과 2024년에 공개된 블로그 원문을 기준으로, 당시 문장과 이후 확인된 사건을 분리해 보여드려요. 개인 상담 결과를 보장하는 문구는 아니며, 원문 링크에서 직접 확인할 수 있어요.</p><ol>{predictionProofRecords.map(record=><li key={record.url}><a href={record.url} target="_blank" rel="noopener noreferrer" aria-label={`원문 보기: ${record.title} (새 창)`}><time dateTime={record.date}>{record.date.replaceAll('-','.')}</time><strong>{record.title}</strong><span>{record.after}</span><em>원문 보기</em></a></li>)}</ol></div></details>
   </aside>
   <div className={`${styles.form} ${styles.consultationForm}`}>
   {tarotOnly?<section className={styles.questionIntro}><h2>카드에 물어볼 이야기</h2><p>타로 상담에는 출생정보가 필요하지 않아. 질문과 카드의 상징으로 함께 읽어볼게.</p>{guest&&<p>상담을 이어가려면 먼저 로그인해 주세요.</p>}</section>:<>
    <ProfilePicker state={profileState}/>
    {!guest&&selectedProfile&&<div className={styles.birthDetails}>
    <label><input type="checkbox" checked={timeUnknown} onChange={e=>setTimeUnknown(e.target.checked)}/> 이번 상담에서 출생시간을 미상으로 보기</label>
    {selectedProfile?.birth?.timeUnknown&&<label>출생시간 보완 (선택)<input type="time" value={extraTime} onChange={e=>setExtraTime(e.target.value)}/></label>}
    {selectedProfile&&!selectedProfile.location?.label&&<><CurrentLocationButton key={profileId} disabled={busy} onLocation={value=>{setCurrentLocation(value);setExtraPlace(value.name);}}/>{currentLocation&&<p role="status">확인한 현재 위치를 이 상담의 출생 장소로 사용할게요. {currentLocation.timezone}</p>}<label>이 상담에 필요한 출생지역<input value={extraPlace} onChange={e=>{setExtraPlace(e.target.value);setCurrentLocation(null);}} placeholder="도시와 국가" maxLength={120}/></label></>}
    {(selectedProfile?.birth?.timeUnknown||!selectedProfile.location?.label)&&<p>보완한 정보는 이번 상담 기록에 함께 저장해요.</p>}
    {kind.partner&&<label>궁합 상대 (필수)<select value={partnerId} onChange={e=>setPartnerId(e.target.value)}><option value="">상대 프로필 선택</option>{profiles.filter(p=>(p.profileId||p.id)!==profileId).map(p=><option key={p.profileId||p.id} value={p.profileId||p.id}>{p.name}</option>)}</select></label>}
    </div>}
   </>}
   {kind.question&&<section className={styles.questionSection} aria-label="상담 주제와 질문"><h2>{tarotOnly?'카드에 물어볼 이야기':'궁금한 이야기를 들려줘.'}</h2><p>길게 쓰지 않아도 괜찮아. 지금 마음에 걸리는 것부터 남겨줘.</p>
   {kind.id==='ask'&&<><label htmlFor="consultation-topic">상담 주제</label><select id="consultation-topic" value={topicId} onChange={e=>setTopicId(e.target.value)}><option value="general">전체 흐름</option>{Object.entries(topicCatalog).map(([id,topic])=><option value={id} key={id}>{topic.label}</option>)}</select></>}
   <label htmlFor="consultation-question">영냥이에게 궁금한 이야기</label><textarea id="consultation-question" rows={4} maxLength={1000} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="지금 가장 궁금한 고민을 들려줘."/>
   </section>}
  <div className={`${styles.fishes} ${domain==='fusion'?styles.fusionChoices:''}`} role="group" aria-label="생선 상품">{choices.map(item=><button key={item.id} onClick={()=>setProductId(item.id)} aria-pressed={productId===item.id}>
   <img src={item.image} alt="" width={240} height={108}/><strong>{domain==='fusion'?consultationTitle(item):item.fishName}</strong><span>{item.priceKRW.toLocaleString('ko-KR')}원 · {item.chapterCount}개 챕터</span>{domain!=='fusion'&&<small>{policyForReading(item.fishId,item.manifestVersion).target.map(n=>n.toLocaleString('ko-KR')).join('~')}자 목표 · 본문 기준</small>}<small>{fusionDescription(item)||depthDescriptions[item.fishId]}</small>
  </button>)}</div>
   <details className={styles.manifestPreview}><summary>{kind.label} · {preview.length}개 챕터 목차</summary><ol>{preview.map(chapter=><li key={chapter.id}>{chapter.title}</li>)}</ol></details>
   <div className={styles.checkoutSection}><div className={styles.checkoutTotal}><span>{product.fishName} · Family 이용권 또는 단건 결제</span><strong>{product.priceKRW.toLocaleString('ko-KR')}<small>원</small></strong></div>
   <p>선택한 운세의 계산 결과를 바탕으로 AI가 해설해요. 선택을 돕는 참고 자료이며 미래를 확정하지 않아요.</p>
   {missing.length>0&&<ul className={styles.inputHints}>{missing.map(message=><li key={message}>{message}</li>)}</ul>}
   <button className={styles.checkoutButton} disabled={busy||(!guest&&(!ready||missing.length>0||!available.some(p=>p.id===productId)))} onClick={()=>void prepare()}>{busy?'상담 준비 중':guest?'로그인하고 상담 이어가기':'결제 내용 확인하기'}<ArrowRight size={18} aria-hidden="true"/></button>
   {!ready&&<p role="status">상담 상품을 확인하고 있어요. 프로필과 질문은 먼저 고를 수 있어요.</p>}
   {catalogError&&<p role="alert">{catalogError}</p>}
   {ready&&!catalogError&&!available.some(p=>p.id===productId)&&<p>지금은 상담 연결을 확인하고 있어. 결제는 진행되지 않아. 잠시 후 다시 확인해줘.</p>}
   {error&&<p role="alert">{error}</p>}
   </div>
   </div>
  </div>
 </section>;
}
